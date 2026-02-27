"""Prototypical network components for few-shot learning."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

import torch
from torch import Tensor, nn
import torch.nn.functional as F


@dataclass
class Episode:
    support: Tensor
    support_labels: Tensor
    query: Tensor
    query_labels: Tensor


class SimpleEmbedding(nn.Module):
    """Placeholder embedding network configurable for 1D or 2D inputs."""

    def __init__(self, input_dim: int = 5, input_channels: int = 1, feature_dim: int = 64) -> None:
        super().__init__()
        self.feature_dim = feature_dim
        self.conv = nn.Sequential(
            nn.Conv2d(input_channels, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d(1),
        )
        self.conv_projection = nn.Linear(64, feature_dim)
        self.mlp = nn.Sequential(
            nn.Flatten(),
            nn.Linear(input_dim, 128),  # Fixed input dimension instead of LazyLinear
            nn.ReLU(inplace=True),
            nn.Linear(128, feature_dim),
        )

    def forward(self, x: Tensor) -> Tensor:  # type: ignore[override]
        batch, channels = x.shape[:2]
        if x.dim() == 3:  # e.g., light curves shaped [B, C, T]
            x = x.unsqueeze(-1)
        if x.dim() == 4 and x.shape[2] > 2 and x.shape[3] > 2:
            embedding = self.conv(x).view(batch, -1)
            return self.conv_projection(embedding)
        return self.mlp(x)


class ProtoNet(nn.Module):
    """Prototypical network with Euclidean distance metric."""

    def __init__(self, embedding: nn.Module | None = None) -> None:
        super().__init__()
        self.embedding = embedding or SimpleEmbedding()

    def forward(self, episode: Episode) -> Tuple[Tensor, Tensor]:  # type: ignore[override]
        support_embeddings = self.embedding(episode.support)
        query_embeddings = self.embedding(episode.query)
        prototypes = compute_prototypes(support_embeddings, episode.support_labels)
        distances = pairwise_distances(query_embeddings, prototypes)
        log_prob = F.log_softmax(-distances, dim=1)
        return log_prob, distances


def compute_prototypes(embeddings: Tensor, labels: Tensor) -> Tensor:
    unique_labels = torch.unique(labels)
    prototypes = []
    for label in unique_labels:
        mask = labels == label
        class_mean = embeddings[mask].mean(dim=0)
        prototypes.append(class_mean)
    return torch.stack(prototypes)


def pairwise_distances(x: Tensor, y: Tensor) -> Tensor:
    n = x.size(0)
    m = y.size(0)
    x = x.unsqueeze(1).expand(n, m, -1)
    y = y.unsqueeze(0).expand(n, m, -1)
    return torch.pow(x - y, 2).sum(dim=2)


def episode_loss(log_prob: Tensor, target_labels: Tensor) -> Tuple[Tensor, float]:
    loss = F.nll_loss(log_prob, target_labels)
    pred = log_prob.argmax(dim=1)
    accuracy = (pred == target_labels).float().mean().item()
    return loss, accuracy
