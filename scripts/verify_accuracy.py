#!/usr/bin/env python3
"""
Verify the ProtoNet model's accuracy on real data sources.
"""
import sys
import logging
from pathlib import Path
import torch

# Ensure src/ is importable
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Import project modules
try:
    from src.datasets.parquet_dataset import ParquetEpisodeDataset
    from src.models.fewshot.protonet import ProtoNet, SimpleEmbedding
    from src.training.fewshot_trainer import FewShotTrainer
except ImportError as e:
    print(f"Error importing project modules: {e}")
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify_accuracy")

def main():
    # 1. Define Paths
    feature_dirs = [
        PROJECT_ROOT / "data/processed/ztf",
        PROJECT_ROOT / "data/processed/tess",
        PROJECT_ROOT / "data/processed/mast"
    ]
    feature_paths = [d / "features.parquet" for d in feature_dirs]
    checkpoint_path = PROJECT_ROOT / "artifacts/models/final_model.pt"

    # 2. Check for data
    existing_paths = [p for p in feature_paths if p.exists()]
    if not existing_paths:
        logger.error("No feature files found in data/processed/. Please run ingestion first.")
        sys.exit(1)

    # 3. Load Dataset
    logger.info(f"Loading features from {len(existing_paths)} sources...")
    dataset = ParquetEpisodeDataset(
        feature_paths=existing_paths,
        n_way=len(existing_paths),
        k_shot=5,
        q_query=5,
        episodes=50
    )

    # 4. Initialize Model
    # Determine feature dimension from dataset to ensure compatibility
    if not hasattr(dataset, "features") or len(dataset.features) == 0:
        logger.error("Dataset is empty!")
        sys.exit(1)

    input_dim = dataset.features.shape[1]
    logger.info(f"Input feature dimension: {input_dim}")
    
    # Matching the embedding architecture used in train_model.py
    embedding = SimpleEmbedding(feature_dim=64)
    model = ProtoNet(embedding=embedding)

    # 5. Load Weights
    if checkpoint_path.exists():
        logger.info(f"Loading trained weights from {checkpoint_path}")
        state_dict = torch.load(checkpoint_path, map_location="cpu")
        model.load_state_dict(state_dict)
        model.eval()
    else:
        logger.warning(f"Checkpoint {checkpoint_path} not found. Running on initial random weights.")

    # 6. Evaluate
    logger.info("Starting evaluation (50 episodes)...")
    trainer = FewShotTrainer(dataset=dataset, model=model)
    metrics = trainer.evaluate(episodes=50)

    # 7. Report
    print("\n" + "="*40)
    print("   COSMIC ORACLE: BRAIN ACCURACY REPORT")
    print("="*40)
    print(f"Model File:  {checkpoint_path.name if checkpoint_path.exists() else 'RANDOM_WEIGHTS'}")
    print(f"Data Sources: {', '.join([p.parent.name for p in existing_paths])}")
    print(f"Evaluation:  50 episodes ({len(existing_paths)}-way, 5-shot)")
    print("-" * 40)
    print(f"MEAN ACCURACY:     {metrics['accuracy_mean']:.2%}")
    print(f"CALIBRATION ERROR: {metrics.get('ece', 0.0):.4f}")
    print(f"INFERENCE LATENCY: {metrics.get('latency_ms', 0.0):.2f} ms")
    print("="*40)
    
    if metrics['accuracy_mean'] > (1.0 / len(existing_paths)):
        print("\n✅ VERDICT: GENUINE")
        print("The model is performing significantly better than random chance.")
    else:
        print("\n❌ VERDICT: CALIBRATION REQUIRED")
        print("The model is performing near random chance. Further training or more diverse data is needed.")
    print("="*40 + "\n")

if __name__ == "__main__":
    main()
