#!/usr/bin/env python
"""Evaluation entrypoint for few-shot prototypical network."""

from __future__ import annotations

import argparse
from pathlib import Path

import sys

import torch

ROOT = Path(__file__).resolve().parents[1]
if ROOT.as_posix() not in sys.path:
    sys.path.insert(0, ROOT.as_posix())

from src.datasets import EpisodeDataset
from src.training.fewshot_trainer import FewShotTrainer


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate few-shot prototypical network on synthetic episodes.")
    parser.add_argument("--manifest", type=Path, default=Path("data/processed/fewshot/synthetic_episodes.json"), help="Path to episode manifest JSON")
    parser.add_argument("--episodes", type=int, default=20, help="Number of evaluation episodes")
    parser.add_argument("--feature-dim", type=int, default=32, help="Feature dimensionality for synthetic dataset")
    parser.add_argument("--checkpoint", type=Path, default=Path("artifacts/models/fewshot_protonet.pt"), help="Model checkpoint path")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    dataset = EpisodeDataset(args.manifest, feature_dim=args.feature_dim)
    trainer = FewShotTrainer(dataset)
    if args.checkpoint.exists():
        state_dict = torch.load(args.checkpoint, map_location="cpu")
        trainer.model.load_state_dict(state_dict)
    metrics = trainer.evaluate(episodes=args.episodes)
    for key, value in metrics.items():
        print(f"{key}: {value:.4f}")


if __name__ == "__main__":
    main()
