"""
Builds feature vectors from raw TESS light curves.
"""

import argparse
import json
import logging
from pathlib import Path
from typing import Any

import numpy as np
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
    """Extracts statistical features from a TESS light curve record."""
    features = {
        "tic_id": record.get("tic_id"),
        "sector": record.get("sector"),
        "cadence": record.get("cadence"),
    }

    flux = np.array(record.get("flux", []), dtype=float)
    time = np.array(record.get("time", []), dtype=float)

    if len(flux) == 0:
        features.update({
            "mean_flux": np.nan,
            "std_flux": np.nan,
            "min_flux": np.nan,
            "max_flux": np.nan,
            "flux_span": np.nan,
            "n_points": 0,
        })
        return features

    features.update({
        "mean_flux": float(np.mean(flux)),
        "std_flux": float(np.std(flux)),
        "min_flux": float(np.min(flux)),
        "max_flux": float(np.max(flux)),
        "flux_span": float(np.max(flux) - np.min(flux)),
        "n_points": len(flux),
    })

    # Simple variability metric (std / mean)
    if features["mean_flux"] != 0:
        features["cv"] = features["std_flux"] / abs(features["mean_flux"])
    else:
        features["cv"] = np.nan

    return features


def build_features(input_dir: Path, output_dir: Path) -> None:
    """Main feature building pipeline."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info("Loading raw TESS records from %s...", input_dir)
    records = load_raw_records(input_dir)
    logger.info("Loaded %d records.", len(records))

    if not records:
        logger.warning("No records found. Creating empty feature file.")
        pd.DataFrame().to_parquet(output_dir / "features.parquet")
        return

    logger.info("Extracting features...")
    feature_list = []
    
    # Validation imports
    from src.preprocessing.auto_labeler import AutoLabeler, EventType
    
    for r in records:
        f = extract_features(r)
        
        # --- Auto-Labeling ---
        try:
             # TESS records contain "time" and "flux" as lists
             t = r.get("time", [])
             y = r.get("flux", [])
             if isinstance(t, list) and isinstance(y, list) and len(t) > 0:
                 f["label"] = AutoLabeler.classify(t, y).label.value
             else:
                 f["label"] = EventType.UNKNOWN_ANOMALY.value
        except Exception:
             f["label"] = EventType.UNKNOWN_ANOMALY.value
             
        feature_list.append(f)
        
    df = pd.DataFrame(feature_list)

    output_file = output_dir / "features.parquet"
    logger.info("Saving features to %s...", output_file)
    df.to_parquet(output_file)
    logger.info("Feature generation complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build TESS features")
    parser.add_argument("input_dir", type=Path, help="Input directory containing raw JSON records")
    parser.add_argument("--output-dir", type=Path, required=True, help="Output directory for features")
    args = parser.parse_args()

    build_features(args.input_dir, args.output_dir)
