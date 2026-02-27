"""
Builds feature vectors from raw MAST metadata.
"""

import argparse
import json
import logging
from pathlib import Path
from typing import Any

import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_raw_records(input_dir: Path) -> list[dict[str, Any]]:
    """Loads all JSON records from the input directory."""
    records = []
    for file_path in input_dir.glob("record_*.json"):
        try:
            with open(file_path, "r") as f:
                records.append(json.load(f))
        except Exception as exc:
            logger.warning("Failed to load %s: %s", file_path, exc)
    return records


def extract_features(record: dict[str, Any]) -> dict[str, Any]:
    """Extracts features from a MAST metadata record."""
    features = {
        "observation_id": record.get("observation_id"),
        "instrument": record.get("instrument"),
        "target": record.get("target"),
        "exposure_time": float(record.get("exposure_time", 0.0)),
    }

    spectral_range = record.get("spectral_range", [])
    if spectral_range and len(spectral_range) >= 2:
        features["wavelength_min"] = float(spectral_range[0])
        features["wavelength_max"] = float(spectral_range[1])
        features["wavelength_span"] = float(spectral_range[1] - spectral_range[0])
    else:
        features["wavelength_min"] = None
        features["wavelength_max"] = None
        features["wavelength_span"] = None

    return features


def build_features(input_dir: Path, output_dir: Path) -> None:
    """Main feature building pipeline."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info("Loading raw MAST records from %s...", input_dir)
    records = load_raw_records(input_dir)
    logger.info("Loaded %d records.", len(records))

    if not records:
        logger.warning("No records found. Creating empty feature file.")
        pd.DataFrame().to_parquet(output_dir / "features.parquet")
        return

    logger.info("Extracting features...")
    feature_list = [extract_features(r) for r in records]
    df = pd.DataFrame(feature_list)

    output_file = output_dir / "features.parquet"
    logger.info("Saving features to %s...", output_file)
    df.to_parquet(output_file)
    logger.info("Feature generation complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build MAST features")
    parser.add_argument("input_dir", type=Path, help="Input directory containing raw JSON records")
    parser.add_argument("--output-dir", type=Path, required=True, help="Output directory for features")
    args = parser.parse_args()

    build_features(args.input_dir, args.output_dir)
