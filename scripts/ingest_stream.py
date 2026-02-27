#!/usr/bin/env python
"""Ingest data from configured astronomy sources into the local data lake."""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any

import yaml

from dotenv import load_dotenv

# Ensure project root is on sys.path when running as a script
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.data_ingestion import (
    BaseIngestor,
    create_mast_ingestor,
    create_tess_ingestor,
    create_ztf_ingestor,
)

load_dotenv()

logging.basicConfig(level=os.getenv("INGEST_LOG_LEVEL", "INFO"))
logger = logging.getLogger("ingest_stream")

INGESTOR_FACTORY = {
    "ztf": create_ztf_ingestor,
    "tess": create_tess_ingestor,
    "mast": create_mast_ingestor,
}

SOURCE_CHOICES = tuple(INGESTOR_FACTORY.keys())
ALL_SOURCES_TOKEN = "all"

README_TEMPLATES = {
    "ztf": """# ZTF Raw Data Drop\n\nThis folder stores transient alert packets fetched from the Zwicky Transient Facility.\n\n## Contents\n- `record_*.json` – Individual alert payloads emitted by the ingestion pipeline.\n- `metadata/` (optional) – Any auxiliary files or catalog joins.\n\n## Schema Highlights\n- `object_id` *(str)* – Unique identifier for the transient candidate.\n- `ra`, `dec` *(float)* – Right ascension and declination in degrees.\n- `mjd` *(float)* – Observation timestamp (Modified Julian Date).\n- `mag_psf` *(float)* – PSF-fit magnitude.\n- `filter` *(str)* – Photometric filter (e.g., `g`, `r`).\n\n## Handling Guidelines\n- Keep only small development batches under version control via DVC.\n- Never commit raw alert dumps to git; use DVC (`dvc add data/raw/ztf`) once ready.\n- Scrub or redact personally identifiable metadata if present.\n""",
    "tess": """# TESS Raw Data Drop\n\nThis directory contains light-curve segments downloaded from the TESS archives via the ingestion pipeline.\n\n## Contents\n- `record_*.json` – Light-curve metadata and flux arrays exported by the ingestion pipeline.\n- `fits/` (optional) – FITS products or cutouts retrieved separately.\n\n## Schema Highlights\n- `tic_id` *(str)* – Target identifier from the TESS Input Catalog.\n- `sector` *(int)* – Observing sector number.\n- `cadence` *(str)* – Cadence mode (`short` or `long`).\n- `time` *(list[float])* – Relative timestamps for the segment.\n- `flux` *(list[float])* – Calibrated flux values aligned with `time`.\n\n## Handling Guidelines\n- Store only downsampled or truncated arrays for development purposes.\n- Use DVC to track provenance and avoid committing raw FITS data directly to git.\n- Validate data integrity with provided schema validators before downstream usage.\n""",
    "mast": """# MAST Raw Data Drop\n\nUse this directory to capture metadata responses from the Mikulski Archive for Space Telescopes.\n\n## Contents\n- `record_*.json` – Catalog entries returned by the ingestion pipeline.\n- `aux/` (optional) – Supplemental tables or cross-matched catalog exports.\n\n## Schema Highlights\n- `observation_id` *(str)* – Unique observation identifier.\n- `instrument` *(str)* – Instrument used for the observation.\n- `target` *(str)* – Target object name.\n- `exposure_time` *(float)* – Exposure duration in seconds.\n- `spectral_range` *(list[float])* – Approximate wavelength coverage `[min, max]` in Ångströms.\n\n## Handling Guidelines\n- Keep only representative subsets for experimentation; full archives should remain in external storage.\n- All raw metadata should be versioned through DVC, not git.\n- Document ingestion runs and dataset hashes in `docs/progress_log.md`.\n""",
}


def load_config(path: Path) -> dict[str, Any]:
    with path.open() as f:
        return yaml.safe_load(f)


def build_ingestor(source: str, output: Path, config: dict[str, Any]) -> BaseIngestor:
    if source not in INGESTOR_FACTORY:
        raise ValueError(f"Unsupported source '{source}'. Expected one of {list(INGESTOR_FACTORY)}")
    source_cfg = config.get("data_sources", {}).get(source, {})
    output.mkdir(parents=True, exist_ok=True)
    return INGESTOR_FACTORY[source](output, source_cfg)


def resolve_sources(selected: str) -> list[str]:
    if selected == ALL_SOURCES_TOKEN:
        return list(SOURCE_CHOICES)
    return [selected]


def build_fetch_kwargs(source: str, args: argparse.Namespace) -> dict[str, Any]:
    fetch_kwargs: dict[str, Any] = {"limit": args.limit}
    if source == "ztf":
        if args.irsa_ra is not None:
            fetch_kwargs["ra"] = args.irsa_ra
        if args.irsa_dec is not None:
            fetch_kwargs["dec"] = args.irsa_dec
        if args.irsa_radius is not None:
            fetch_kwargs["radius"] = args.irsa_radius
        if args.irsa_filters:
            fetch_kwargs["filters"] = args.irsa_filters
        if args.irsa_mjd_range:
            fetch_kwargs["mjd_range"] = tuple(args.irsa_mjd_range)
    return fetch_kwargs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run astronomy data ingestors")
    parser.add_argument("--source", required=True, choices=list(SOURCE_CHOICES) + [ALL_SOURCES_TOKEN])
    parser.add_argument("--config", type=Path, default=Path("configs/base.yaml"))
    parser.add_argument("--limit", type=int, default=10, help="Maximum number of records to fetch")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/raw"),
        help="Directory where fetched records will be written",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print fetched records without persisting")
    parser.add_argument("--irsa-ra", type=float, help="Override cone-search right ascension (degrees)")
    parser.add_argument("--irsa-dec", type=float, help="Override cone-search declination (degrees)")
    parser.add_argument("--irsa-radius", type=float, help="Override cone-search radius (degrees)")
    parser.add_argument(
        "--irsa-filter",
        action="append",
        dest="irsa_filters",
        help="Limit IRSA results to a specific filter/band (repeatable)",
    )
    parser.add_argument(
        "--irsa-mjd-range",
        type=float,
        nargs=2,
        metavar=("START", "END"),
        help="Override IRSA time window (Modified Julian Date)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    sources = resolve_sources(args.source)

    if args.dry_run:
        logger.info("Dry run enabled; fetching records without persisting")
        summaries: dict[str, Any] = {}
        total_records = 0
        for source in sources:
            output_dir = args.output / source
            ingestor = build_ingestor(source, output_dir, config)
            fetch_kwargs = build_fetch_kwargs(source, args)
            records = [ingestor.validate_record(record) for record in ingestor.fetch(**fetch_kwargs)]
            summaries[source] = {
                "records": len(records),
                "sample": records[0] if records else None,
            }
            total_records += len(records)

        if len(sources) == 1:
            source = sources[0]
            summary = {"source": source, **summaries[source]}
        else:
            summary = {"sources": summaries, "total_records": total_records}
        print(json.dumps(summary, indent=2))
        return

    total_records = 0
    for source in sources:
        output_dir = args.output / source
        ingestor = build_ingestor(source, output_dir, config)
        fetch_kwargs = build_fetch_kwargs(source, args)
        result = ingestor.run(**fetch_kwargs)
        readme = README_TEMPLATES.get(source)
        if readme:
            (output_dir / "README.md").write_text(readme)
        logger.info(
            "Ingestion completed for %s: records=%d, output_dir=%s",
            result.source,
            result.records_fetched,
            output_dir,
        )
        total_records += result.records_fetched

    if len(sources) > 1:
        logger.info(
            "Completed ingestion for %d sources; total records=%d",
            len(sources),
            total_records,
        )


if __name__ == "__main__":
    main()
