"""TESS light-curve ingestion connector using the MAST CAOM invoke API."""

from __future__ import annotations

import logging
import math
import json
from io import BytesIO
from pathlib import Path
from typing import Any, Iterable, Sequence

import numpy as np
try:
    from astropy.io import fits
    from astropy.table import Table
except ImportError:
    fits = None
    Table = None
    logger = logging.getLogger(__name__)
    logger.warning("astropy not installed. TESS ingestion disabled.")

from .base import BaseIngestor
from .schemas import TESSRecord

logger = logging.getLogger(__name__)


class TESSIngestor(BaseIngestor):
    """Ingests light-curve segments from TESS archives."""

    record_model = TESSRecord

    def fetch(self, limit: int = 5, **_: Any) -> Iterable[dict[str, Any]]:
        logger.debug("Fetching TESS records via TESScut with limit=%d", limit)
        records = self._fetch_from_tesscut(limit)
        if records:
            logger.info("Fetched %d TESS light curves via TESScut", len(records))
            return records

        logger.warning("No TESS records found via TESScut.")
        return []

    # ------------------------------------------------------------------
    # Internal helpers (TESScut)
    # ------------------------------------------------------------------

    def _fetch_from_tesscut(self, limit: int) -> list[dict[str, Any]]:
        # Use astroquery to find many TESS observations if possible, or fallback to expanded hardcoded list
        records: list[dict[str, Any]] = []
        
        try:
            from astroquery.mast import Observations
            
            # 1. Search for TESS Time Series
            logger.info(f"Querying MAST for TESS timeseries (limit={limit})...")
            # Query for TESS project, Sector 1 (good starting point), or just random large query
            obs_table = Observations.query_criteria(
                obs_collection="TESS",
                dataproduct_type="timeseries",
                target_name="*", # Wildcard? Or just don't specify target
                sequence_number=1 # Sector 1 to start
            )
            
            # That might be huge, let's limit in python or use a smaller criteria if possible
            # Observations.query_criteria doesn't support 'limit' natively in all versions?
            # We can slice the result.
            
            target_names = []
            if len(obs_table) > 0:
                # Get unique target names from the results
                # Column might be 'target_name'
                target_names = list(set(obs_table['target_name']))[:limit]
            
            logger.info(f"Found {len(obs_table)} observations, selecting {len(target_names)} targets")
            
            # Fallback if astroquery returns empty or fails
            if not target_names:
                target_names = [
                    "Tic 25155310", "Tic 261136679", "Tic 441462736", "Tic 233087856",
                    "Tic 251630511", "Tic 100100827", "Tic 38846515", "Tic 470710327",
                    "Tic 307210830", "Tic 150428135", "Tic 149603524", "Tic 277539431"
                ]

            headers = self.get_auth_header()
            tesscut_url = self.config.get("tesscut_url", "https://mast.stsci.edu/tesscut/api/v0.1")

            for target in target_names[:limit]:
                 try:
                    # Resolve to coordinates using MAST resolve (or just try sector search by name)
                    # Use provided coordinate resolver or name lookup
                    
                    # For simplicity in mass ingestion, we will try to get the sector for the object name directly
                    sector_url = f"{tesscut_url}/sector"
                    params = {"obj_id": target}
                    
                    resp = self.session.get(sector_url, params=params, headers=headers, timeout=20)
                    if resp.status_code != 200:
                         continue
                         
                    results = resp.json().get("results", [])
                    if not results:
                        continue
                        
                    sector_info = results[0]
                    sector_num = sector_info.get("sector")
                    ra = float(sector_info.get("ra", 0)) # string from JSON?
                    dec = float(sector_info.get("dec", 0))
                    
                    # Request Cutout (Astrocut)
                    cutout_url = f"{tesscut_url}/astrocut"
                    cutout_params = {
                        "ra": ra,
                        "dec": dec,
                        "y": 5, "x": 5, # Minimize size for speed
                        "units": "px",
                        "sector": sector_num
                    }
                    
                    # Remove auth header if empty/stubbed to avoid 401s if API is public
                    req_headers = {k:v for k,v in headers.items() if v}
                    
                    logger.info("Downloading cutout for %s (Sector %s)...", target, sector_num)
                    try:
                        cutout_resp = self.session.get(cutout_url, params=cutout_params, headers=req_headers, timeout=30)
                        
                        if cutout_resp.status_code == 200:
                             record = self._process_zip_response(cutout_resp.content, str(target), sector_num)
                             if record:
                                 records.append(record)
                                 logger.info(f"✅ Downloaded TESS record for {target}")
                        else:
                            logger.warning(f"Failed to download cutout for {target}: {cutout_resp.status_code} {cutout_resp.text[:100]}")
                    except Exception as e:
                        logger.warning(f"Request failed for {target}: {e}")
                             
                 except Exception as e:
                     logger.warning(f"Error processing {target}: {e}")
                     continue

        except ImportError:
             logger.error("astroquery not installed")
        except Exception as e:
             logger.error(f"MAST query failed: {e}")

        return records

    def _process_zip_response(self, content: bytes, target: str, sector: Any) -> dict[str, Any] | None:
        import zipfile
        
        try:
            with zipfile.ZipFile(BytesIO(content)) as z:
                # There should be one or more FITS files. Pick the first one.
                fits_files = [f for f in z.namelist() if f.endswith(".fits")]
                if not fits_files:
                    return None
                
                with z.open(fits_files[0]) as f:
                    return self._extract_lightcurve_from_fits(f.read(), target, sector)
        except Exception as e:
            logger.error("Failed to process ZIP: %s", e)
            return None

    def _extract_lightcurve_from_fits(self, fits_data: bytes, target: str, sector: Any) -> dict[str, Any] | None:
        try:
            with fits.open(BytesIO(fits_data), memmap=False) as hdulist:
                # TESS cutouts usually have the data in extension 1
                if len(hdulist) < 2:
                    return None
                
                data = hdulist[1].data
                
                # Fields: TIME, FLUX (3D array), FLUX_ERR, etc.
                # Verify columns
                if "TIME" not in data.columns.names or "FLUX" not in data.columns.names:
                    return None
                    
                time_arr = data["TIME"]
                flux_cube = data["FLUX"] # Shape: (Time, Y, X)
                
                # Aperture Photometry: Sum all pixels in the cutout for each time step
                # Handle NaNs in flux
                flux_cube_filled = np.nan_to_num(flux_cube, nan=0.0)
                flux_arr = np.sum(flux_cube_filled, axis=(1, 2))
                
                # Clean up bad quality points (optional, but good for visualization)
                valid_mask = (np.isfinite(time_arr)) & (flux_arr > 0)
                
                final_time = time_arr[valid_mask]
                final_flux = flux_arr[valid_mask]

                # Downsample if too large
                max_points = 500
                if len(final_time) > max_points:
                    step = len(final_time) // max_points
                    final_time = final_time[::step]
                    final_flux = final_flux[::step]

                return {
                    "tic_id": target,
                    "sector": int(sector) if sector else 0,
                    "cadence": "custom_cutout",
                    "time": final_time.astype(float).tolist(),
                    "flux": final_flux.astype(float).tolist(),
                    "mast_data_uri": "tesscut_api"
                }

        except Exception as e:
            logger.error("Failed to extract lightcurve from FITS: %s", e)
            return None


def create_tess_ingestor(output_dir: Path, config: dict[str, Any]) -> TESSIngestor:
    return TESSIngestor(source_name="tess", output_dir=output_dir, config=config)


def _build_filter_list(filters_cfg: dict[str, Any]) -> list[dict[str, Any]]:
    filters: list[dict[str, Any]] = []
    for name, values in filters_cfg.items():
        if values is None:
            continue
        value_list = values if isinstance(values, list) else [values]
        filters.append(
            {
                "paramName": name,
                "values": value_list,
            }
        )
    return filters


def _extract_column(table: Any, column: str) -> np.ndarray | None:
    if hasattr(table, "columns") and column in table.columns.names:
        data = table[column]
        return np.asarray(data, dtype=float)
    if hasattr(table, "names") and column in table.names:  # type: ignore[attr-defined]
        return np.asarray(table[column], dtype=float)
    return None


def _select_flux_column(table: Any, candidates: Sequence[str]) -> np.ndarray | None:
    for column in candidates:
        values = _extract_column(table, column)
        if values is not None:
            return values
    return None


def _derive_metadata(observation: dict[str, Any], product: dict[str, Any]) -> tuple[str | None, int | None, str | None]:
    tic_id = _get_first(observation, "target_name", "targetName", "tic_id", "ticId")
    filename = _get_first(product, "productFilename", "product_name", "filename")
    sector = _try_parse_sector(filename) or _coerce_int(_get_first(observation, "sequence_number", "sequenceNumber"))
    cadence = _infer_cadence(filename)
    if tic_id is None and filename:
        tic_id = _extract_tic_from_filename(filename)
    if tic_id is not None:
        tic_str = str(tic_id).replace(" ", "").upper()
        if tic_str.startswith("TIC"):
            tic_id = "TIC" + tic_str[3:]
        else:
            tic_id = f"TIC{tic_str}"
    return tic_id, sector, cadence


def _try_parse_sector(filename: str | None) -> int | None:
    if not filename:
        return None
    parts = filename.split("-")
    for part in parts:
        if part.startswith("s") and len(part) == 5 and part[1:].isdigit():
            try:
                return int(part[1:])
            except ValueError:  # pragma: no cover - defensive
                continue
    return None


def _infer_cadence(filename: str | None) -> str | None:
    if not filename:
        return None
    if "_lc" in filename:
        if "-s_lc" in filename:
            return "short"
        if "-l_lc" in filename:
            return "long"
        return "lightcurve"
    if "fast" in filename.lower():
        return "fast"
    return None


def _extract_tic_from_filename(filename: str | None) -> str | None:
    if not filename:
        return None
    parts = filename.split("-")
    for part in parts:
        if part.isdigit() and len(part) >= 7:
            return f"TIC{int(part)}"
    return None


def _coerce_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _get_first(entry: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in entry and entry[key] not in (None, ""):
            return entry[key]
        lowered = key.lower()
        for candidate_key in entry.keys():
            if candidate_key.lower() == lowered and entry[candidate_key] not in (None, ""):
                return entry[candidate_key]
    return None


def _build_invoke_payload(service: str, params: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "service": service,
        "format": "json",
        "params": params,
    }
    return payload
