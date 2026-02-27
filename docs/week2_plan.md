# Week 2 Plan – Data Ingestion & Feature Pipelines

## Objectives
1. **Implement ingestion connectors** for ZTF (imagery + alerts), TESS (light curves), and MAST (metadata) with streaming and batch pathways.
2. **Build preprocessing modules** to normalize raw inputs: image calibration, cosmic ray handling, light-curve detrending, feature calculation.
3. **Automate data validation** to catch schema drift, corrupted files, and missing metadata before downstream processing.
4. **Track pipeline runs** with configuration-driven orchestration to support future automation (Prefect/Airflow targets).

## Deliverables
- `src/data_ingestion/ztf_ingestor.py`, `tess_ingestor.py`, `mast_ingestor.py` with abstract base class and configuration hooks.
- `src/preprocessing/image_pipeline.py` and `lightcurve_pipeline.py` encapsulating calibration and feature extraction routines.
- Validation suite under `tests/data/` covering schema checks, basic QC thresholds, and integration smoke tests.
- Updated documentation (`README.md`, `docs/progress_log.md`) summarizing new components and usage patterns.

## Milestone Breakdown
### Milestone 1 – Ingestion Scaffold
- Define `BaseIngestor` for shared logic (retry, logging, metadata tracking).
- Implement placeholder connectors referencing config entries in `configs/base.yaml`.
- Provide stubbed methods for pulling sample batches (to be wired to real APIs later).

### Milestone 2 – Preprocessing Modules
- Create image calibration utilities (bias/dark/flat combination) using `astropy` + `numpy`.
- Implement cosmic ray detection placeholder (sigma clipping / median filter).
- Build light-curve cleaning with detrending, normalization, and feature extraction (rise/decay rates, variance, skew).

### Milestone 3 – Validation & Tests
- Add schema definitions (`pydantic` models or custom validators).
- Write unit tests ensuring ingest/preprocess modules enforce expected formats and raise informative errors.
- Integrate with `pytest` target: `pytest tests/data`.

### Milestone 4 – Documentation & Tracking
- Update `docs/progress_log.md` with Week 2 achievements.
- Extend `README.md` sections for data pipeline setup.
- Prepare handoff notes for Week 3 (model experimentation).

## Dependencies & Risks
- API credentials for ZTF/TESS/MAST still required—use mocked data in Week 2.
- Large FITS files may demand optimized IO; initial implementation focuses on correctness over performance.
- Validation coverage should be expandable as real datasets arrive.

## Success Criteria
- Running the ingestion scripts produces sample outputs written to `data/interim/` with metadata logs.
- Preprocessing modules transform sample inputs into feature-ready artifacts without errors.
- Tests pass locally via `pytest`, ensuring schemas and QC checks hold.
