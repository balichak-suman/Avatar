"""Baseline preprocessing scaffolding for Week 1 exploration.

This module collects exploratory utilities for:
1. FITS imagery quality control (bias/dark/flat corrections, cosmic ray masking).
2. Light curve time-series cleaning and feature extraction.

It is meant to be executed in interactive notebooks or as a standalone script during early
prototyping. Downstream production code will live under `src/preprocessing/`.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
from astropy.io import fits


DATA_ROOT = Path("data")
RAW_IMAGE_DIR = DATA_ROOT / "raw" / "ztf"
RAW_TIMESERIES_DIR = DATA_ROOT / "raw" / "tess"


@dataclass
class ImageQCMetrics:
    file_path: Path
    mean: float
    std: float
    saturation_fraction: float
    dead_pixel_fraction: float


def load_fits_image(path: Path) -> np.ndarray:
    """Load a FITS image as a numpy array, handling the absence of astropy during scaffolding."""
    with fits.open(path) as hdul:
        return hdul[0].data.astype(np.float32)


def compute_image_qc_metrics(image: np.ndarray) -> ImageQCMetrics:
    """Compute simple QC metrics used to flag problematic exposures."""
    flattened = image.ravel()
    mean = float(flattened.mean())
    std = float(flattened.std())
    saturation_fraction = float(np.mean(flattened >= np.percentile(flattened, 99.9)))
    dead_pixel_fraction = float(np.mean(flattened <= np.percentile(flattened, 0.1)))
    return ImageQCMetrics(Path("unknown"), mean, std, saturation_fraction, dead_pixel_fraction)


def iterate_image_qc(paths: Iterable[Path]) -> list[ImageQCMetrics]:
    metrics: list[ImageQCMetrics] = []
    for path in paths:
        image = load_fits_image(path)
        metric = compute_image_qc_metrics(image)
        metrics.append(metric)
    return metrics


def summarize_light_curve(df: pd.DataFrame, flux_column: str = "flux") -> dict[str, float]:
    """Return basic light curve statistics for downstream feature engineering."""
    stats = {
        "count": int(df[flux_column].count()),
        "flux_mean": float(df[flux_column].mean()),
        "flux_std": float(df[flux_column].std()),
        "flux_mad": float(df[flux_column].mad()),
        "flux_skew": float(df[flux_column].skew()),
    }
    return stats


def detrend_light_curve(df: pd.DataFrame, flux_column: str = "flux") -> pd.DataFrame:
    """Apply a simple rolling median detrend as a baseline placeholder."""
    detrended = df.copy()
    detrended["flux_detrended"] = detrended[flux_column] - detrended[flux_column].rolling(window=5, center=True).median()
    detrended["flux_detrended"].fillna(method="bfill", inplace=True)
    detrended["flux_detrended"].fillna(method="ffill", inplace=True)
    return detrended


def main() -> None:
    print("Baseline preprocessing scaffolding ready. Populate RAW_IMAGE_DIR and RAW_TIMESERIES_DIR with sample data to exercise functions.")


if __name__ == "__main__":
    main()
