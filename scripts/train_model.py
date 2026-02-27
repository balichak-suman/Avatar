"""
Train a Prototypical Network on ZTF, TESS, and MAST features.
"""

import argparse
import logging
from pathlib import Path

import torch

# Ensure src/ is importable when executed as a script
import sys
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.datasets.parquet_dataset import ParquetEpisodeDataset
from src.models.fewshot.protonet import ProtoNet, SimpleEmbedding
from src.training.fewshot_trainer import FewShotTrainer, TrainerConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("train_model")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Few-Shot Model")
    parser.add_argument(
        "--feature-dirs", 
        nargs="+", 
        type=Path, 
        default=[
            Path("data/processed/ztf"),
            Path("data/processed/tess"),
            Path("data/processed/mast")
        ],
        help="Directories containing features.parquet files"
    )
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--episodes", type=int, default=100, help="Episodes per epoch")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    parser.add_argument("--output-dir", type=Path, default=Path("artifacts/models"), help="Directory to save model")
    args = parser.parse_args()

    # 1. Prepare Dataset
    feature_paths = [d / "features.parquet" for d in args.feature_dirs]
    logger.info("Loading features from: %s", feature_paths)
    
    dataset = ParquetEpisodeDataset(
        feature_paths=feature_paths,
        n_way=5,  # Increased for Event Types (Flare, SN, Transit, etc.)

        k_shot=5,
        q_query=5,
        episodes=args.episodes
    )
    
    # 2. Initialize Model
    # Determine feature dimension from dataset
    if not hasattr(dataset, "features") or len(dataset.features) == 0:
        logger.error("Dataset is empty! Cannot train.")
        return

    input_dim = dataset.features.shape[1]
    logger.info("Input feature dimension: %d", input_dim)
    
    # Use SimpleEmbedding with MLP for vector inputs
    embedding = SimpleEmbedding(feature_dim=64)
    # Note: SimpleEmbedding uses LazyLinear, so it will adapt to input_dim on first forward pass
    
    model = ProtoNet(embedding=embedding)
    
    # 3. Configure Trainer
    config = TrainerConfig(
        learning_rate=args.lr,
        episodes_per_epoch=args.episodes,
        mlflow_experiment="AstronomyFewShot",
        tracking_uri="file:./mlruns"
    )
    
    trainer = FewShotTrainer(dataset=dataset, model=model, config=config)
    
    # 4. Train
    logger.info("Starting training for %d epochs...", args.epochs)
    trainer.train(epochs=args.epochs)
    logger.info("Training complete.")
    
    # 5. Save final model explicitly (Trainer also saves checkpoints)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), args.output_dir / "final_model.pt")
    logger.info("Saved final model to %s", args.output_dir / "final_model.pt")


if __name__ == "__main__":
    main()
