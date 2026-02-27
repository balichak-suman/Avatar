"""Pydantic models describing expected payloads from supported data sources."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ZTFRecord(BaseModel):
    object_id: str
    ra: float
    dec: float
    mjd: float
    mag_psf: float | None = Field(default=None, description="PSF-fit magnitude")
    filter: str

    model_config = ConfigDict(extra="allow")


class TESSRecord(BaseModel):
    tic_id: str
    sector: int
    cadence: str
    time: List[float] = Field(default_factory=list)
    flux: List[float] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")

    @model_validator(mode="after")
    def validate_time_flux_alignment(self) -> "TESSRecord":
        if self.time and self.flux and len(self.time) != len(self.flux):
            raise ValueError("time and flux arrays must be the same length")
        return self


class MASTRecord(BaseModel):
    observation_id: str
    instrument: str
    target: str
    exposure_time: float
    spectral_range: List[float] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")

    @model_validator(mode="after")
    def validate_spectral_range(self) -> "MASTRecord":
        if self.spectral_range and len(self.spectral_range) != 2:
            raise ValueError("spectral_range must contain [min, max] values")
        return self
