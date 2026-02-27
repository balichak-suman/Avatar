"""MAST metadata ingestion connector scaffolding."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Iterable

from .base import BaseIngestor
from .schemas import MASTRecord

try:
    from astroquery.mast import Observations
except ImportError:
    Observations = None
    logging.getLogger("mast_ingestor").warning("astroquery not installed. MAST ingestion disabled.")

logger = logging.getLogger(__name__)


class MASTIngestor(BaseIngestor):
    """Ingests metadata entries from the MAST archive via Astroquery."""

    record_model = MASTRecord

    def fetch(self, limit: int = 20, **_: Any) -> Iterable[dict[str, Any]]:
        logger.debug("Fetching MAST records with limit=%d via astroquery.mast", limit)
        
        # Use astroquery.mast instead of the broken CAOM API
        try:
            # Query for observations with filters
            # Default to HST collection, images
            obs_table = Observations.query_criteria(
                obs_collection=["HST"],
                dataproduct_type=["image"],
                intentType="science"
            )
            
            if obs_table is None or len(obs_table) == 0:
                logger.warning("No MAST observations found")
                return []
            
            # Limit results
            obs_table = obs_table[:limit]
            logger.info("Fetched %d MAST observations via astroquery", len(obs_table))
            
            records = []
            for row in obs_table:
                record = self._normalise_astroquery_record(row)
                if record:
                    records.append(record)
            
            return records
            
        except Exception as exc:
            logger.error("astroquery.mast fetch failed: %s", exc)
            return []

    def _normalise_astroquery_record(self, row: Any) -> dict[str, Any] | None:
        try:
            # Map Astroquery table columns to MASTRecord schema
            # Common columns: obs_id, instrument_name, target_name, t_exptime, wavelength_region
            
            return {
                "observation_id": str(row.get("obs_id", "unknown")),
                "instrument": str(row.get("instrument_name", "unknown")),
                "target": str(row.get("target_name", "unknown")),
                "exposure_time": float(row.get("t_exptime", 0.0)),
                "spectral_range": self._parse_wavelength_region(row.get("wavelength_region")),
            }
        except Exception as e:
            logger.warning("Failed to parse MAST observation: %s", e)
            return None

    def _parse_wavelength_region(self, region: Any) -> list[float]:
        """Parse wavelength region string or use defaults."""
        if not region:
            return []
        
        # Wavelength region is typically a string like "Optical" or "Infrared"
        # MAST doesn't provide specific ranges in the general query, so we return empty
        # Advanced queries could use t_min/t_max wavelength columns if available
        return []


def create_mast_ingestor(output_dir: Path, config: dict[str, Any]) -> MASTIngestor:
    return MASTIngestor(source_name="mast", output_dir=output_dir, config=config)
