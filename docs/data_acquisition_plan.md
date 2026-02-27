# Dataset Acquisition & Governance Plan

## Data Sources
| Source | Modalities | Access Pattern | Storage Target |
| ------ | ---------- | -------------- | -------------- |
| ZTF (Zwicky Transient Facility) | Alert streams, calibrated FITS imagery, photometry metadata | API + nightly bulk exports | `dvc remote cosmic-storage` (S3 bucket) under `ztf/` prefix |
| TESS (Transiting Exoplanet Survey Satellite) | Time-series light curves, sector metadata | MAST bulk download + lightkurve client | `dvc remote cosmic-storage` under `tess/` prefix |
| MAST Archive | Spectra, host galaxy metadata | REST API + TAP queries | `dvc remote cosmic-storage` under `mast/` prefix |

## Acquisition Workflow
1. **Authenticate** against each provider using API tokens (stored in Vault or cloud secret manager).
2. **Stage raw files** locally under `data/raw/<source>/` using CLI utilities (scripts to be added in Week 2).
3. **Register artifacts with DVC**:
   ```bash
   dvc add data/raw/ztf
   dvc add data/raw/tess
   dvc add data/raw/mast
   ```
4. **Push to remote** to persist raw datasets:
   ```bash
   dvc push
   ```
5. **Track metadata** (schema, provenance, license) in `docs/datasets/<source>.md` (to be created as data arrives).

## Governance Checklist
- ✅ DVC initialized with default remote `cosmic-storage` (placeholder `s3://placeholder-cosmic-events`).
- ☐ Configure actual S3/GCS/Azure endpoint and credentials.
- ☐ Set up data retention and lifecycle policies.
- ☐ Automate nightly sync via GitHub Actions/Prefect (Week 2 deliverable).

## Access Controls
- Read/write permissions restricted to data engineering service account.
- Downstream services consume processed datasets via signed URLs or internal APIs.
- Public sharing requires dataset anonymization and licensing review.

## Next Steps
- Verify S3 bucket provisioning with infra team and update remote URL.
- Implement ingestion scripts in `src/data_ingestion/` and schedule via workflow engine.
- Define dataset schemas (JSON schema) and validation tests.
