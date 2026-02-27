"""Few-shot episode dataset utilities."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

import torch
from torch import Tensor

from src.models.fewshot.protonet import Episode


@dataclass
class EpisodeSample:
    episode_id: str
    support: Tensor
    support_labels: Tensor
    query: Tensor
    query_labels: Tensor


def load_episode_manifest(path: Path) -> dict:
    with path.open() as f:
        return json.load(f)


class EpisodeDataset:
    """Synthetic episode dataset backed by a manifest file."""

    def __init__(self, manifest_path: Path, feature_dim: int = 64, seed: int = 1234) -> None:
        self.manifest_path = manifest_path
        self.manifest = load_episode_manifest(manifest_path)
        self.feature_dim = feature_dim
        self.generator = torch.Generator().manual_seed(seed)

    def __iter__(self) -> Iterator[EpisodeSample]:
        for episode_spec in self.manifest.get("episodes", []):
            episode_sample = self._materialize_episode(episode_spec)
            yield episode_sample

    def _materialize_episode(self, spec: dict) -> EpisodeSample:
        classes: list[str] = spec["classes"]
        support_vectors, support_labels = self._make_examples(spec["support"], classes)
        query_vectors, query_labels = self._make_queries(spec["query"], classes)
        return EpisodeSample(
            episode_id=spec["episode_id"],
            support=support_vectors,
            support_labels=support_labels,
            query=query_vectors,
            query_labels=query_labels,
        )

    def _make_examples(self, class_map: dict, classes: list[str]) -> tuple[Tensor, Tensor]:
        vectors = []
        labels = []
        for idx, class_name in enumerate(classes):
            for _ in class_map.get(class_name, []):
                prototype = self._class_prototype(class_name)
                vector = prototype + 0.05 * torch.randn(self.feature_dim, generator=self.generator)
                vectors.append(vector)
                labels.append(idx)
        return torch.stack(vectors), torch.tensor(labels, dtype=torch.long)

    def _make_queries(self, query_list: list[str], classes: list[str]) -> tuple[Tensor, Tensor]:
        vectors = []
        labels = []
        for sample_idx, path in enumerate(query_list):
            class_idx = sample_idx % len(classes)
            class_name = classes[class_idx]
            prototype = self._class_prototype(class_name)
            vector = prototype + 0.1 * torch.randn(self.feature_dim, generator=self.generator)
            vectors.append(vector)
            labels.append(class_idx)
        return torch.stack(vectors), torch.tensor(labels, dtype=torch.long)

    def _class_prototype(self, class_name: str) -> Tensor:
        seed = abs(hash(class_name)) % (2**31)
        generator = torch.Generator().manual_seed(seed)
        return torch.randn(self.feature_dim, generator=generator)

    def to_episode(self, sample: EpisodeSample) -> Episode:
        return Episode(
            support=sample.support.unsqueeze(1).unsqueeze(-1),
            support_labels=sample.support_labels,
            query=sample.query.unsqueeze(1).unsqueeze(-1),
            query_labels=sample.query_labels,
        )
