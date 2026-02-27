# Week 1 Scope & Architecture Snapshot

## Purpose
Establish the foundational understanding needed to execute the "Adaptive MLOps–Driven Few‑Shot Learning Framework for Rare Cosmic Event Detection" project. This Week 1 snapshot drives alignment on requirements, success criteria, and technical architecture before implementation begins.

## Core Objectives
- Detect rare cosmic events (supernovae, gamma-ray bursts, kilonovae, exoplanet anomalies) using few-shot learning techniques that tolerate limited labeled data.
- Deliver near real-time inference (<100 ms target latency) across multimodal inputs: calibrated images, light curves, and contextual metadata.
- Operate with a fully automated MLOps backbone that handles ingestion, retraining, deployment, monitoring, and drift-based adaptation.
- Provide user-facing surfaces (Dashboards, APIs, AI assistant, 3D explorer) that expose insights and enable scientific workflows.

## Functional Requirements
- **Data ingestion**: Stream and batch connectors for ZTF, TESS, and MAST archives with validation and metadata enrichment.
- **Preprocessing**: Image calibration (bias, dark, flat field), cosmic ray removal, light curve detrending, feature extraction, and normalization pipelines.
- **Few-shot learning engine**: Prototypical network core with episodic N-way K-shot training, augmentation, contrastive pretraining, and zero-shot prototype generation.
- **Model lifecycle management**: MLflow experiment tracking, model registry, artifact versioning via DVC, and automated CI/CD deployment to Kubernetes.
- **Inference services**: FastAPI microservice providing REST endpoints, batching support, calibrated confidence scores, and GPU-aware scheduling.
- **Monitoring & drift detection**: Prometheus metrics, Grafana dashboards, data/prediction drift alarms, and automated retraining triggers.
- **User experience**: React dashboard with AI assistant, support set builder, 3D event explorer (Three.js), and authenticated public API.

## Non-Functional Requirements
- **Scalability**: Horizontal scaling via Kubernetes and message queues; architecture must support >1,000 inference requests per second.
- **Reliability**: Automated health checks, blue/green rollouts, and rollback orchestration.
- **Observability**: Centralized logging (OpenTelemetry), structured metrics, and alerting budgets.
- **Reproducibility**: Deterministic pipelines with DVC-tracked datasets, environment pinning (conda/poetry), and IaC for infrastructure.
- **Security & Compliance**: Authenticated APIs (OAuth2 + API keys), RBAC in cluster, encrypted data at rest/in transit.

## System Architecture Overview
1. **Acquisition Layer**: Queue-backed connectors ingest FITS files, light curves, and metadata. Data stored in object storage (e.g., S3/GCS) with DVC pointers.
2. **Processing Layer**: Containerized preprocessing workers normalize imagery, clean time-series, and generate features; outputs logged to data lake and feature store.
3. **Modeling Layer**: Few-shot engine trains episodic tasks leveraging prototype repositories and semantic embeddings for zero-shot extension.
4. **Serving Layer**: FastAPI inference microservice accesses latest model from MLflow registry, deploys via Kubernetes with GPU nodes.
5. **MLOps & Governance**: GitHub Actions orchestrate CI/CD, MLflow + DVC manage artifacts, monitoring stack tracks drift and triggers retraining workflows.
6. **Experience Layer**: React dashboard, AI avatar assistant, and public API gateway provide visualization, conversational insights, and programmatic access.

```
[Ingestion] -> [Preprocessing] -> [Feature Store] -> [Few-shot Training & Registry]
                                           |                         |
                                           v                         v
                                   [Realtime Inference] ---> [Monitoring & Drift]
                                           |
                                           v
                                 [UI / API / 3D Explorer]
```

## Week 1 Deliverables
- Validated requirements and architecture summary (this document + living design references).
- Repository scaffolding for data, code, notebooks, infrastructure, and documentation.
- DVC initialization with placeholder remotes and data governance checklist.
- Baseline preprocessing notebook capturing exploratory QC steps for images and light curves.

## Key Assumptions & Decisions
- Cloud deployment targets Kubernetes with access to GPU nodes (e.g., GKE/AKS/EKS); local dev uses Docker + Kind or Minikube.
- Python (3.10+) as the primary language for data and backend services; TypeScript/React for frontend.
- ML experimentation tracked with MLflow; feature store candidate is Feast (to be validated in Week 2).
- Message broker preference: Kafka (streaming) plus RabbitMQ fallback for low-latency tasks.
- Security posture follows zero-trust principles; secrets handled via HashiCorp Vault or cloud-native secret manager.

## Next Steps Checklist
- Align stakeholders on architecture decisions and iterate as needed.
- Implement repository scaffold and CI guardrails.
- Draft dataset acquisition SOPs and begin collecting sample subsets for development.
- Prototype preprocessing transformations in notebooks to validate feasibility.
