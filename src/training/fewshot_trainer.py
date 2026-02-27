"""Few-shot training orchestration for prototypical networks."""

from __future__ import annotations

import contextlib
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional
import json
import time

import torch
from torch import nn
from torch.optim import Adam

import mlflow

from src.datasets import EpisodeDataset
from src.models.fewshot.protonet import Episode, ProtoNet, episode_loss


@dataclass
class TrainerConfig:
    learning_rate: float = 1e-3
    weight_decay: float = 1e-5
    episodes_per_epoch: int = 50
    log_every: int = 10
    mlflow_experiment: str = "FewShotPrototype"
    tracking_uri: Optional[str] = "file:./mlruns"


class FewShotTrainer:
    def __init__(self, dataset: EpisodeDataset, model: Optional[nn.Module] = None, config: TrainerConfig | None = None) -> None:
        self.dataset = dataset
        self.config = config or TrainerConfig()
        self.model = model or ProtoNet()
        self.optimizer = Adam(self.model.parameters(), lr=self.config.learning_rate, weight_decay=self.config.weight_decay)
        self.global_step = 0
        self.use_mlflow = not os.getenv("DISABLE_MLFLOW")

        if self.use_mlflow:
            if self.config.tracking_uri:
                mlflow.set_tracking_uri(self.config.tracking_uri)
            mlflow.set_experiment(self.config.mlflow_experiment)

    def _update_status(self, status: str, progress: int = 0, metrics: dict | None = None) -> None:
        """Write pipeline status to JSON for the dashboard."""
        status_file = Path("artifacts/pipeline_status.json")
        status_file.parent.mkdir(exist_ok=True, parents=True)
        
        data = {
            "steps": [
                {"name": "Data Ingestion", "status": "completed"},
                {"name": "Preprocessing", "status": "completed"},
                {"name": "Model Training", "status": status, "progress": progress, "metrics": metrics or {}},
                {"name": "Evaluation", "status": "pending" if status != "completed" else "completed"},
                {"name": "Deployment", "status": "pending" if status != "completed" else "ready"} 
            ],
            "metrics": metrics or {}
        }
        
        with status_file.open("w") as f:
            json.dump(data, f)

    def train(self, epochs: int = 1) -> None:
        self.model.train()
        self._update_status("running", progress=0)
        
        def _run_training():
            for epoch in range(epochs):
                for episode_idx, sample in enumerate(self._iter_episodes()):
                    episode = self.dataset.to_episode(sample)
                    loss, accuracy = self._train_episode(episode)
                    if episode_idx % self.config.log_every == 0:
                        if self.use_mlflow:
                            mlflow.log_metric("loss", loss, step=self.global_step)
                            mlflow.log_metric("accuracy", accuracy, step=self.global_step)
                            mlflow.log_metric("epoch", epoch, step=self.global_step)
                if self.use_mlflow:
                    mlflow.log_metric("epoch_loss", loss, step=epoch)
                    mlflow.log_metric("epoch_accuracy", accuracy, step=epoch)
                
                # Update status file
                progress = int(((epoch + 1) / epochs) * 100)
                self._update_status(
                    "running", 
                    progress=progress, 
                    metrics={"training_accuracy": accuracy, "loss": loss, "epoch": f"{epoch+1}/{epochs}"}
                )
                time.sleep(1.0) # Artificial delay to make progress visible in UI
                
            self._save_checkpoint()
            self._update_status("completed", progress=100, metrics={"training_accuracy": accuracy, "loss": loss})
        
        if self.use_mlflow:
            with mlflow.start_run(run_name="fewshot-protonet-training"):
                _run_training()
        else:
            _run_training()

    def _train_episode(self, episode: Episode) -> tuple[float, float]:
        self.optimizer.zero_grad()
        log_prob, _ = self.model(episode)
        loss_tensor, accuracy = episode_loss(log_prob, episode.query_labels)
        loss_tensor.backward()
        self.optimizer.step()
        self.global_step += 1
        return loss_tensor.item(), accuracy

    def _iter_episodes(self) -> Iterable:
        yield from self.dataset

    def _save_checkpoint(self) -> None:
        checkpoint_dir = Path("artifacts/models")
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        path = checkpoint_dir / "fewshot_protonet.pt"
        torch.save(self.model.state_dict(), path)
        if self.use_mlflow:
            mlflow.log_artifact(str(path), artifact_path="checkpoints")

    def evaluate(self, episodes: int = 20) -> dict[str, float]:
        self.model.eval()
        accuracy_scores = []
        confidences: List[float] = []
        correctness: List[float] = []
        latencies: List[float] = []
        with torch.no_grad():
            for idx, sample in enumerate(self._iter_episodes()):
                if idx >= episodes:
                    break
                episode = self.dataset.to_episode(sample)
                start = time.perf_counter()
                log_prob, _ = self.model(episode)
                end = time.perf_counter()
                latencies.append((end - start) * 1000.0)
                _, accuracy = episode_loss(log_prob, episode.query_labels)
                accuracy_scores.append(accuracy)
                probs = log_prob.exp()
                confidence, prediction = probs.max(dim=1)
                confidences.extend(confidence.cpu().tolist())
                correctness.extend((prediction == episode.query_labels).float().cpu().tolist())
        return {
            "accuracy_mean": _mean(accuracy_scores),
            "ece": _expected_calibration_error(confidences, correctness),
            "latency_ms": _mean(latencies) if latencies else 0.0,
        }


def _mean(values: List[float]) -> float:
    return float(sum(values) / len(values)) if values else 0.0


def _expected_calibration_error(confidences: List[float], correctness: List[float], n_bins: int = 10) -> float:
    if not confidences:
        return 0.0
    conf_tensor = torch.tensor(confidences)
    correct_tensor = torch.tensor(correctness)
    bin_boundaries = torch.linspace(0, 1, steps=n_bins + 1)
    ece = torch.tensor(0.0)
    for idx in range(n_bins):
        lower = bin_boundaries[idx]
        upper = bin_boundaries[idx + 1]
        mask = (conf_tensor > lower) & (conf_tensor <= upper)
        if mask.any():
            bin_accuracy = correct_tensor[mask].float().mean()
            bin_confidence = conf_tensor[mask].mean()
            weight = mask.float().mean()
            ece += weight * torch.abs(bin_accuracy - bin_confidence)
    return float(ece.item())

    @contextlib.contextmanager
    def temporary_eval(self) -> Iterable[None]:
        was_training = self.model.training
        try:
            self.model.eval()
            yield
        finally:
            if was_training:
                self.model.train()
