"""Image preprocessing utilities for Week 2 pipeline scaffolding."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterable

import numpy as np
from astropy.io import fits

logger = logging.getLogger(__name__)


def load_bias_frames(paths: Iterable[Path]) -> np.ndarray:
    frames = [fits.getdata(path).astype(np.float32) for path in paths]
    if not frames:
        raise ValueError("No bias frames provided.")
    return np.median(frames, axis=0)


def calibrate_image(raw_path: Path, bias: np.ndarray, dark: np.ndarray | None = None, flat: np.ndarray | None = None) -> np.ndarray:
    logger.debug("Calibrating image %s", raw_path)
    image = fits.getdata(raw_path).astype(np.float32)
    calibrated = image - bias
    if dark is not None:
        calibrated -= dark
    if flat is not None:
        flat_safe = np.where(flat == 0, 1.0, flat)
        calibrated /= flat_safe
    return calibrated


def sigma_clip_cosmic_rays(image: np.ndarray, sigma: float = 5.0) -> np.ndarray:
    median = np.median(image)
    std = np.std(image)
    mask = np.abs(image - median) > sigma * std
    cleaned = image.copy()
    cleaned[mask] = median
    return cleaned


def save_calibrated_image(data: np.ndarray, output_path: Path) -> None:
    logger.debug("Saving calibrated image to %s", output_path)
    hdu = fits.PrimaryHDU(data)
    hdu.writeto(output_path, overwrite=True)
