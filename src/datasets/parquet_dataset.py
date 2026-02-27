"""
Few-shot dataset loader backed by Parquet feature files.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterator, List, Optional

import numpy as np
import pandas as pd
import torch
from torch import Tensor
from torch.utils.data import IterableDataset

from src.models.fewshot.protonet import Episode

logger = logging.getLogger(__name__)


class ParquetEpisodeDataset(IterableDataset):
    """
    Loads features from multiple Parquet files and samples few-shot episodes.
    
    Since we don't have ground truth labels yet, we use the 'source' (ZTF/TESS/MAST)
    as the class label for this proof-of-concept.
    """

    def __init__(
        self,
        feature_paths: List[Path],
        n_way: int = 3,
        k_shot: int = 5,
        q_query: int = 5,
        episodes: int = 100,
        seed: int = 42,
    ) -> None:
        self.feature_paths = feature_paths
        self.n_way = n_way
        self.k_shot = k_shot
        self.q_query = q_query
        self.episodes = episodes
        self.seed = seed
        self.generator = torch.Generator().manual_seed(seed)
        
        self._load_data()

    def _load_data(self) -> None:
        """Loads data from parquet files and normalizes features."""
        dfs = []
        for path in self.feature_paths:
            if not path.exists():
                logger.warning("Feature file not found: %s", path)
                continue
            
            df = pd.read_parquet(path)
            # Ensure label column exists (backward compatibility)
            if "label" not in df.columns:
                 # Fallback to source-based labeling if auto-labeler wasn't run
                 logger.warning("File %s has no 'label' column. Falling back to source name.", path)
                 df["label"] = path.parent.name
            
            dfs.append(df)
        
        if not dfs:
            raise ValueError("No feature files loaded!")

        # Concatenate all dataframes
        full_df = pd.concat(dfs, ignore_index=True)
        
        # Identify numeric feature columns (exclude ID columns and source_label)
        exclude_cols = {
            "object_id", "tic_id", "observation_id", "target_name", "target", 
            "instrument", "filter", "filters", "source_label", "cadence", "sector", "sequence_number",
            "label", "irsa_payload"
        }
        feature_cols = [c for c in full_df.columns if c not in exclude_cols and pd.api.types.is_numeric_dtype(full_df[c])]
        
        logger.info("Feature columns: %s", feature_cols)
        
        # Fill NaNs with 0 (padding for missing features across sources)
        self.features = torch.tensor(full_df[feature_cols].fillna(0.0).values, dtype=torch.float32)
        
        # Encode LABELS (Event Types) instead of sources
        self.labels = full_df["label"].astype("category").cat.codes
        self.label_map = dict(enumerate(full_df["label"].astype("category").cat.categories))
        self.classes = torch.tensor(self.labels.values, dtype=torch.long)
        self.unique_classes = torch.unique(self.classes)
        
        logger.info("Loaded %d samples from %d classes: %s", len(self.features), len(self.unique_classes), self.label_map)

    def __iter__(self) -> Iterator[Episode]:
        for _ in range(self.episodes):
            yield self._sample_episode()

    def _sample_episode(self) -> Episode:
        # 1. Sample N classes (ways)
        # If we have fewer classes than n_way, we can't do N-way classification properly
        # For this PoC, if unique_classes < n_way, we just take all available classes
        available_classes = self.unique_classes
        if len(available_classes) < self.n_way:
            selected_classes = available_classes
        else:
            perm = torch.randperm(len(available_classes), generator=self.generator)
            selected_classes = available_classes[perm[:self.n_way]]
            
        support_set = []
        support_labels = []
        query_set = []
        query_labels = []
        
        for i, class_idx in enumerate(selected_classes):
            # Get indices for this class
            class_mask = (self.classes == class_idx)
            class_indices = torch.nonzero(class_mask).squeeze(1)
            
            # Sample K support + Q query examples
            n_needed = self.k_shot + self.q_query
            
            # If not enough samples, sample with replacement
            if len(class_indices) < n_needed:
                indices = torch.randint(0, len(class_indices), (n_needed,), generator=self.generator)
                selected_indices = class_indices[indices]
            else:
                perm = torch.randperm(len(class_indices), generator=self.generator)
                selected_indices = class_indices[perm[:n_needed]]
            
            # Split into support and query
            support_indices = selected_indices[:self.k_shot]
            query_indices = selected_indices[self.k_shot:]
            
            support_set.append(self.features[support_indices])
            support_labels.append(torch.full((len(support_indices),), i, dtype=torch.long))
            
            query_set.append(self.features[query_indices])
            query_labels.append(torch.full((len(query_indices),), i, dtype=torch.long))
            
        # Stack
        support = torch.cat(support_set)
        support_y = torch.cat(support_labels)
        query = torch.cat(query_set)
        query_y = torch.cat(query_labels)
        
        # Shuffle query set (optional but good practice)
        perm = torch.randperm(len(query), generator=self.generator)
        query = query[perm]
        query_y = query_y[perm]
        
        # Reshape for ProtoNet (it expects [batch, channels] or [batch, channels, T])
        # Our features are [batch, feature_dim].
        # SimpleEmbedding handles 2D input via MLP.
        
        return Episode(
            support=support,
            support_labels=support_y,
            query=query,
            query_labels=query_y,
        )

    def to_episode(self, episode: Episode) -> Episode:
        # Interface compatibility with FewShotTrainer
        return episode
