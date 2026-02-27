# Real Data Ingestion Guide

This guide walks through the steps required to pull live observations from the ZTF, TESS, and MAST catalogues using the ingestion pipeline created in Week 4.

## 1. Prerequisites
- Python environment initialized with Poetry or the project virtualenv (`.venv`).
- DVC remote configured for storing large datasets (see `docs/data_acquisition_plan.md`).
- Network access to the astronomy APIs listed below.

## 2. Obtain Credentials
### Zwicky Transient Facility (ZTF)
1. Request API access at [https://ztf.uw.edu/alerts/public](https://ztf.uw.edu/alerts/public) if you need the authenticated alert stream. For public cut-outs and light curves, the IRSA endpoints can be queried without credentials.
2. When a token is issued, store it in the `.env` file under `ZTF_API_TOKEN`. The ingestor will automatically fall back to token-free IRSA lookups if the environment variable is absent.

### Transiting Exoplanet Survey Satellite (TESS)
1. Create a MAST account at [https://mast.stsci.edu](https://mast.stsci.edu).
2. Navigate to **My Account → Auth Tokens** and generate a new token.
3. Set `TESS_API_TOKEN` in `.env` (MAST tokens cover TESS data access).
4. The ingestion pipeline calls the MAST `invoke` API with the `Mast.Caom.Filtered` service to retrieve observations, then `Mast.Caom.Products` to locate the corresponding light-curve FITS files. Adjust `data_sources.tess.query.filters` in `configs/base.yaml` to refine the target (e.g., `target_name`, `ra`/`dec`, `t_min`/`t_max`).
5. Light-curve parsing depends on `astropy` and `numpy`; both are installed automatically via `make install-min`.

### Mikulski Archive for Space Telescopes (MAST)
1. Reuse the MAST auth token created above.
2. Populate `MAST_API_TOKEN` in `.env` (same value as the TESS token).

> **Security**: Never commit populated `.env` files to git. Use your secrets manager or CI/CD environment to inject the same values when running pipelines remotely.

## 3. Configure Environment
1. Copy the template and fill in the tokens:
   ```bash
   cp .env.example .env
   # edit .env and paste the real tokens
   ```
2. The ingestion CLI auto-loads `.env` on startup; no additional export is required when running locally. In CI/CD, export the variables or use the platform's secrets feature.

## 4. Run Live Ingestion
### Single Source Dry-Run
Validate credentials and payload schema without persisting files:
```bash
./.venv/bin/python scripts/ingest_stream.py --source ztf --dry-run --limit 5
```

### Persist Raw Records
```bash
./.venv/bin/python scripts/ingest_stream.py --source ztf --limit 200 --output data/raw
```
Outputs are written to `data/raw/<source>/record_*.json`. A README is generated automatically with schema notes.

### Fine-Tune ZTF IRSA Cone Searches
The ZTF ingestor issues cone searches against `https://irsa.ipac.caltech.edu/cgi-bin/ZTF/nph_light_curves`. You can control the target field either via configuration (`configs/base.yaml`) or directly through CLI overrides. Example configuration block:

```yaml
data_sources:
   ztf:
      irsa:
         base_url: "https://irsa.ipac.caltech.edu/cgi-bin/ZTF/nph_light_curves"
         filters: ["zg", "zr"]
         cone_search:
            ra: 210.8023
            dec: 54.3489
            radius: 0.05
         mjd_range: [59800, 59850]
```

Override the same values ad hoc by passing command-line options:

```bash
./.venv/bin/python scripts/ingest_stream.py \
   --source ztf \
   --irsa-ra 210.8023 \
   --irsa-dec 54.3489 \
   --irsa-radius 0.05 \
   --irsa-filter zr \
   --irsa-filter zg \
   --irsa-mjd-range 59800 59820 \
   --limit 20
```

> **Tip:** Leave filters unset to request all available bands. The ingestor normalises the response and deduplicates repeated observations by `(object_id, mjd)` before persistence.

### Bulk Retrieval for All Sources
Kick off every configured ingestor sequentially (ZTF, TESS, and MAST) with a single command:
```bash
./.venv/bin/python scripts/ingest_stream.py --source all --limit 50
```
Each connector writes its outputs to `data/raw/<source>/`. IRSA overrides provided on the command line (e.g., `--irsa-ra`) are applied exclusively to the ZTF fetch; the other sources honour their respective configuration blocks. Combine `--source all` with `--dry-run` to produce a consolidated JSON summary without writing files.

### TESS Light-Curve Downloads
With a valid token in place, the command below retrieves live TESS light curves, converts the FITS payloads into JSON (time/flux arrays), and persists them under `data/raw/tess/record_*.json`:

```bash
./.venv/bin/python scripts/ingest_stream.py --source tess --limit 5
```

Customize the target region or cadence by editing the `query.filters` and `lightcurve` sections of `configs/base.yaml` (for example, set `target_name`, `ra`/`dec`, or raise `max_points` to keep more samples per light curve). The `query.filters` list is translated directly into the MAST `invoke` payload, so you can add any supported CAOM filter keys.

## 5. Build Processed Datasets with DVC
Once raw alerts are stored, reproduce the DVC pipeline to generate aggregated features:
```bash
./.venv/bin/dvc repro
```
This runs:
- `ingest_ztf` with live data
- `build_ztf_features` to produce `data/processed/ztf/features.csv`

Commit the updated `dvc.lock`, `data/raw/ztf/.dvc`, and `data/processed/ztf/.dvc` files, then push artifacts:
```bash
./.venv/bin/dvc push
```

## 6. Verifying Ingestion Success
- Inspect the logs for "Fetched" messages rather than "falling back to sample payload" warnings.
- Check that the records contain diverse `object_id`, `mjd`, and `filter` values.
- Run `pytest` to ensure schema validations continue to pass.

## 7. Next Steps
- Extend the pipeline to TESS and MAST by adding analogous stages in `dvc.yaml`.
- Schedule periodic ingestions using GitHub Actions or Prefect.
- Capture dataset hashes and run metadata in `docs/progress_log.md` for auditability.
