#!/usr/bin/env python
"""
Generate and save class prototypes from the trained Few-Shot model.
This allows the API to perform fast inference by comparing new data against these stored prototypes.
"""
import json
import logging
from pathlib import Path
import sys
import torch
import numpy as np

# Ensure src/ is importable
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.datasets.parquet_dataset import ParquetEpisodeDataset
from src.models.fewshot.protonet import ProtoNet, SimpleEmbedding

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("generate_prototypes")

def main():
    # 1. Load Data (Support Set for Prototypes)
    feature_paths = [PROJECT_ROOT / "data/processed/ztf/features.parquet"]
    dataset = ParquetEpisodeDataset(
        feature_paths=feature_paths,
        n_way=5, 
        k_shot=5,
        q_query=5,
        episodes=10 # Minimal episodes just to load classes
    )
    
    # 2. Load Model
    input_dim = dataset.features.shape[1]
    embedding = SimpleEmbedding(feature_dim=64)
    model = ProtoNet(embedding=embedding)
    
    model_path = PROJECT_ROOT / "artifacts/models/final_model.pt"
    if model_path.exists():
        state_dict = torch.load(model_path, map_location="cpu")
        model.load_state_dict(state_dict)
        model.eval()
        logger.info(f"Loaded model from {model_path}")
    else:
        logger.error("Model not found. Train first.")
        return

    # 3. Compute Prototypes
    prototypes = {}
    
    # Iterate over unique class INDICES
    unique_indices = torch.unique(dataset.classes)
    
    with torch.no_grad():
        for idx in unique_indices:
            cls_name = dataset.label_map[idx.item()]
            
            # Get all samples for this class index
            mask = (dataset.classes == idx)
            
            # Get feature vectors
            vectors = dataset.features[mask] # tensor [n_samples, dim]
            
            # Pass through embedding network
            embeddings = model.embedding(vectors)
            
            # Calculate Mean (Prototype)
            proto = embeddings.mean(dim=0)
            
            prototypes[str(cls_name)] = proto.tolist()
            logger.info(f"Computed prototype for '{cls_name}' from {len(vectors)} samples.")

    # 4. Save
    output_path = PROJECT_ROOT / "artifacts/models/prototypes.json"
    with open(output_path, "w") as f:
        json.dump(prototypes, f, indent=2)
    
    logger.info(f"Saved {len(prototypes)} prototypes to {output_path}")

if __name__ == "__main__":
    main()
