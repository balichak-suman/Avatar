
import sys
from pathlib import Path
import logging

# Ensure src/ is importable
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.datasets import EpisodeDataset
from src.training.fewshot_trainer import FewShotTrainer, TrainerConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

def main():
    logger.info("Starting training pipeline...")
    
    # Load dataset
    manifest_path = PROJECT_ROOT / "data/episodes/manifest.json"
    if not manifest_path.exists():
        logger.error(f"Manifest not found at {manifest_path}")
        return

    logger.info("Initializing dataset...")
    dataset = EpisodeDataset(manifest_path, feature_dim=64)
    
    # Initialize trainer
    config = TrainerConfig(episodes_per_epoch=5, learning_rate=1e-3)
    trainer = FewShotTrainer(dataset, config=config)
    
    logger.info("Starting training run...")
    # Run for 50 epochs
    trainer.train(epochs=50)
    logger.info("Training completed.")

if __name__ == "__main__":
    main()
