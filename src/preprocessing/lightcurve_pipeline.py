"""Light curve preprocessing utilities for Week 2 pipeline scaffolding."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np
import pandas as pd


@dataclass
class LightCurveFeatures:
    tic_id: str
    flux_mean: float
    flux_std: float
    flux_skew: float
    amplitude: float
    variability_index: float


def detrend_light_curve(time: Iterable[float], flux: Iterable[float], window: int = 11) -> pd.DataFrame:
    df = pd.DataFrame({"time": time, "flux": flux})
    df.sort_values("time", inplace=True)
    df["flux_smooth"] = df["flux"].rolling(window=window, center=True, min_periods=1).median()
    df["flux_detrended"] = df["flux"] - df["flux_smooth"]
    return df


def compute_features(tic_id: str, df: pd.DataFrame) -> LightCurveFeatures:
    flux = df["flux_detrended"].to_numpy()
    flux_mean = float(np.mean(flux))
    flux_std = float(np.std(flux))
    flux_skew = float(pd.Series(flux).skew())
    amplitude = float(np.max(flux) - np.min(flux))
    variability_index = float(np.mean(np.abs(flux)) / (np.std(flux) + 1e-6))
    return LightCurveFeatures(tic_id, flux_mean, flux_std, flux_skew, amplitude, variability_index)
