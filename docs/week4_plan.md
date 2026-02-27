# Week 4 Plan – MLOps Integration & Real Data Ingestion

## Objectives
1. Connect ingestion pipelines to real ZTF, TESS, and MAST data sources with secure credentials and scheduling.
2. Stand up the MLOps backbone: MLflow registry policies, DVC automation, CI/CD pipelines, and infrastructure scaffolding.
3. Enable automated retraining and deployment workflows in preparation for production environments.

## Deliverables
- **Data ingestion**: configured connectors with environment-based credentials, data validation hooks, and DVC pipelines generating processed datasets.
- **MLOps stack**: MLflow registry settings, Terraform or Helm manifests for infrastructure, GitHub Actions (or equivalent) CI/CD workflows.
- **Automation**: scripts or orchestration configs (Prefect/Airflow) that trigger dataset refresh, model retraining, and deployment when drift alarms fire.
- **Documentation**: runbooks detailing secrets management, pipeline execution, and operational guardrails.

## Milestones
### Milestone 1 – Real Data Integration
- Parameterize ingestion connectors for real endpoints and credentials via environment variables or secrets managers.
- Create scripts to fetch sample batches and populate `data/raw/` with real observations (avoid committing raw data).
- Register DVC pipelines (e.g., `dvc.yaml`) for ingestion + preprocessing stages.

### Milestone 2 – MLOps Backbone
- Configure MLflow tracking/registry server (local or remote), define model versioning policies.
- Author Terraform/Kubernetes manifests under `infra/` for MLflow, model serving, and monitoring services.
- Build CI/CD workflow: lint/tests, DVC checks, container build, deployment to staging cluster.

### Milestone 3 – Automation & Deployment
- Implement retraining scripts that consume latest DVC datasets and register new models.
- Add deployment automation (FastAPI container build, Helm chart updates, rollout strategy).
- Schedule pipelines using GitHub Actions cron or external orchestrator (e.g., Prefect) for nightly retraining.

### Milestone 4 – Documentation & Runbooks
- Update `README.md` with setup instructions for data ingestion, MLOps stack, and automation flows.
- Extend `docs/` with runbooks: secret management, troubleshooting, rollback procedures.
- Record progress in `docs/progress_log.md` and prepare Week 5 goals (monitoring + observability).

## Risks & Mitigations
- **Credentials handling**: Use environment variables and secret managers; avoid storing secrets in repo.
- **Infrastructure complexity**: Start with local/dockerized MLflow, gradually migrate to managed services.
- **Data volume**: Begin with small subsets; validate storage and throughput before full-scale ingestion.

## Success Criteria
- DVC pipeline runs produce processed datasets sourced from real data within controlled storage.
- CI/CD workflow executes successfully, building and registering model artifacts.
- Infrastructure manifests deploy MLflow + FastAPI services on a staging cluster.
- Documentation enables another engineer to reproduce ingestion, training, and deployment steps end-to-end.
