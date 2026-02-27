# Week 3 Evaluation Protocol – Few-Shot Modeling

## Goals
- Validate few-shot modeling scaffold using synthetic episodes until real datasets arrive.
- Report accuracy, expected calibration error (ECE), and latency per episode.
- Ensure reproducibility via deterministic synthetic episode generation and MLflow logging.

## Metrics
| Metric | Description | Tooling |
| ------ | ----------- | ------- |
| Accuracy | Mean classification accuracy across episodic queries. | `FewShotTrainer.evaluate` |
| Expected Calibration Error (ECE) | Measures confidence calibration across 10 bins. | `_expected_calibration_error` helper |
| Latency (ms) | Mean inference latency per episode (CPU). | `FewShotTrainer.evaluate` |

## Procedure
1. **Train** the prototypical network scaffold:
   ```bash
   ./.venv/bin/python - <<'PY'
   from pathlib import Path
   from src.datasets import EpisodeDataset
   from src.training.fewshot_trainer import FewShotTrainer

   dataset = EpisodeDataset(Path("data/processed/fewshot/synthetic_episodes.json"), feature_dim=32)
   trainer = FewShotTrainer(dataset)
   trainer.train(epochs=1)
   PY
   ```
2. **Evaluate** using the scripted entrypoint:
   ```bash
   ./.venv/bin/python scripts/evaluate_fewshot.py --episodes 20 --feature-dim 32
   ```
3. **Review MLflow Run**: metrics and checkpoints logged under `mlruns/` (default file backend). Adjust tracking URI in `TrainerConfig` for remote stores.

## Notes
- Synthetic episodes are defined in `data/processed/fewshot/synthetic_episodes.json` and versioned with DVC.
- Update `EpisodeDataset` once real preprocessed data is available (Week 4–5).
- Extend metrics with confusion matrices / ROC curves when multi-label signals are introduced.
