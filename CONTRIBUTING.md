# Contributing Guide

Welcome! This document summarizes the recommended development workflow and guardrails for the Adaptive MLOps Few-Shot project.

## Prerequisites
- Python **3.11.x** (see `.python-version` for the exact patch level).
- `make` for the helper targets (preinstalled on macOS/Linux; Windows users can use WSL or run the commands manually).
- Optional: `pyenv`/`direnv` to auto-activate the pinned interpreter and virtual environment.

## Environment Setup
1. Clone the repository and create/activate a virtual environment (`python -m venv .venv && source .venv/bin/activate`).
2. Install the lightweight dependency set used by CI:
   ```bash
   make install-min
   ```
3. (Optional) Install Poetry if you plan to work with the full dependency stack once GPU packages (e.g., PyTorch) publish wheels for the project Python version.
4. Copy secrets template and add API tokens when working with real data:
   ```bash
   cp .env.example .env
   # Populate ZTF_API_TOKEN, TESS_API_TOKEN, MAST_API_TOKEN
   ```

## Development Workflow
- **Coding style**: Follow existing project patterns and keep edits scoped. Formatting is governed by the existing tooling (`black`, `ruff`) but the lightweight CI currently focuses on functionality tests.
- **Tests**: Run the smoke suite locally before opening a PR:
  ```bash
  make test
  ```
- **Data ingestion**: Use `scripts/ingest_stream.py --source <name> --dry-run` for validation. The ZTF connector supports IRSA-specific overrides (`--irsa-ra`, `--irsa-dec`, etc.).
- **Feature generation**: Execute `scripts/build_ztf_features.py data/raw/ztf` after fetching alerts to update processed feature tables.
- **DVC pipelines**: Use `dvc repro` to rebuild tracked artifacts; ensure new `.dvc` files are committed when datasets change.

## Git/GitHub Workflow
1. Create a topic branch off `main`.
2. Make incremental commits with informative messages.
3. Run `make test` (and any relevant integration checks) before pushing.
4. Open a pull request. The GitHub Actions workflow (`.github/workflows/ci.yml`) runs the same pytest suite on pushes, pull requests, and nightly to catch regressions.
5. Address review feedback and ensure the CI badge is green before merge.

## Reporting Issues
- Use GitHub Issues and provide reproduction steps, environment details (OS, Python version), and relevant log snippets.
- Tag the issue category (`ingestion`, `preprocessing`, `modeling`, `infra`) to streamline triage.

Thanks for contributing! Feel free to extend this guide as new tooling or processes are introduced.
