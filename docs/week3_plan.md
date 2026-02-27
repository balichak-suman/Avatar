# Week 3 Plan – Few-Shot Modeling & Experimentation

## Objectives
1. Prepare curated, versioned subsets from ZTF/TESS/MAST streams as support/query sets for few-shot experiments.
2. Implement a prototypical network training scaffold with episodic dataloaders, augmentation hooks, and MLflow tracking.
3. Establish evaluation routines: N-way K-shot benchmarks, calibration metrics, and ablation logging.
4. Document methodology decisions, experiment configs, and reproducibility steps.

## Deliverables
- DVC-tracked sample datasets under `data/processed/fewshot/*` with metadata manifests.
- `src/models/fewshot/protonet.py` implementing embedding backbone, prototype computation, and forward pass.
- `src/training/fewshot_trainer.py` orchestrating episodic training, logging, and checkpointing.
- Evaluation scripts (`scripts/evaluate_fewshot.py`) measuring accuracy, ECE, and latency on mock data.
- Updated documentation: Week 3 summary, README modeling section, and progress log entries.

## Milestones
### Milestone 1 – Data Curation
- Convert stub ingestion outputs into structured episodes (support/query splits).
- Store metadata (`.json`) describing class balance and preprocessing steps.
- Update DVC (`dvc add data/processed/fewshot`) to track sample datasets.

### Milestone 2 – Model Scaffold
- Define embedding network stub (ResNet12/1D CNN placeholders).
- Implement prototype generation and distance-based classification.
- Integrate with PyTorch Lightning-style hooks (manual for now) and MLflow logging.

### Milestone 3 – Evaluation & Metrics
- Write benchmarking routine for 5-way 1-shot and 5-way 5-shot scenarios.
- Calculate calibration metrics (ECE) and record confusion matrices (if applicable).
- Capture latency measurements through dummy inference loops.

### Milestone 4 – Documentation & Tracking
- Record findings in `docs/progress_log.md` and new modeling documentation.
- Update README with instructions for running training/evaluation scripts.
- Outline Week 4 focus areas (MLOps backbone) as next steps.

## Risks & Mitigations
- Real datasets not yet available → use synthetic/mock data while keeping interfaces consistent.
- Training speed limited without GPUs → emphasize CPU-friendly configuration for early experiments.
- Metric reliability on synthetic data → document assumptions and revisit once real data arrives.

## Success Criteria
- Running the trainer on mock data should produce an MLflow run with metrics and saved checkpoints.
- Evaluation script outputs accuracy/ECE numbers aligned with our synthetic expectations.
- All artifacts and instructions are captured in version control and DVC state.
