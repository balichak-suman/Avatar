# Developer Notes

## 🔍 Implementation Details

### Why We Disabled MLflow in Docker
**Problem**: MLflow uses filesystem-based tracking by default, which causes locking issues when running inside Docker containers with mounted volumes.

**Error**: `OSError: [Errno 35] Resource deadlock avoided`

**Solution**: Added `DISABLE_MLFLOW=1` environment variable in `docker-compose.yaml` for the trainer service. The `FewShotTrainer` class now checks this variable and skips MLflow operations when set.

**Code Location**: `src/training/fewshot_trainer.py:38-42`

---

### Why We Removed DVC Output for Models
**Problem**: DVC tried to manage `artifacts/models` as an output directory, causing permission conflicts in Docker.

**Error**: `[Errno 13] Permission denied: '/app/artifacts/models'`

**Solution**: Removed `artifacts/models` from the `outs` section in `dvc.yaml`. The training script now directly saves models without DVC tracking.

**Trade-off**: We lose DVC's model versioning, but gain Docker compatibility. For production, consider using a proper model registry (MLflow Model Registry, DVC with remote storage).

---

### Why We Changed Python Path in DVC
**Problem**: `dvc.yaml` hardcoded `./.venv/bin/python`, which doesn't exist in Docker containers.

**Solution**: Changed all commands to use `python` (which resolves to the system Python in Docker).

**Impact**: This means DVC pipeline works both locally (if you activate venv first) and in Docker.

---

### Real-Time Earth Rotation Implementation
**Approach**: 
1. Calculate Julian Date from current time
2. Convert to Greenwich Mean Sidereal Time (GMST)
3. Apply rotation to Earth mesh based on GMST

**Files**:
- `solar_sys/js/time.js`: Added `getJulianDate()` function
- `solar_sys/js/orbit.js`: Modified `updateOrbitAndRotation()` to use real-time for Earth

**Formula**:
```javascript
JD = 2440587.5 + (Date.now() / 86400000)
GMST = (280.46061837 + 360.98564736629 * (JD - 2451545.0)) % 360
rotation = (GMST * Math.PI / 180) + initialOffset
```

---

### Astronaut Animation System
**Architecture**: State machine with 5 states
- `idle`: Default floating animation
- `typing-username`: Head looks at username field
- `typing-password`: Hands cover visor
- `login-failed`: Sad expression + head shake
- `login-success`: Redirects to dashboard

**Implementation**: Uses GSAP (via CDN) for smooth transitions between states.

**File**: `login.html:150-250`

---

## 🐛 Known Issues

### 1. MLflow Filesystem Warnings
**Issue**: When running locally, MLflow shows deprecation warning about filesystem backend.

**Warning**: 
```
FutureWarning: Filesystem tracking backend (e.g., './mlruns') is deprecated.
```

**Impact**: None currently, but MLflow will eventually require a database backend.

**Fix**: For production, switch to SQLite:
```python
mlflow.set_tracking_uri("sqlite:///mlflow.db")
```

---

### 2. Docker Compose Version Warning
**Issue**: `docker-compose.yaml` includes deprecated `version` attribute.

**Warning**:
```
WARN[0000] the attribute `version` is obsolete
```

**Impact**: None, Docker Compose still works.

**Fix**: Remove the `version: "3.8"` line from `docker-compose.yaml`.

---

### 3. Port Conflicts
**Issue**: If port 8081 is already in use, `start.sh` will fail to start the dashboard server.

**Solution**: 
```bash
# Kill existing process
lsof -ti:8081 | xargs kill -9

# Or change port in start.sh
python3 -m http.server 8082
```

---

### 4. CORS Issues
**Issue**: Loading Three.js textures from `file://` protocol causes CORS errors.

**Solution**: Always use HTTP server (port 8081), never open `dashboard.html` directly in browser.

---

## 💡 Design Decisions

### Why Prototypical Networks?
**Reason**: Few-shot learning is ideal for astronomical data where:
- New object types are discovered frequently
- Labeled data is scarce
- We need to classify with minimal examples

**Alternative Considered**: Transfer learning with ResNet, but requires more labeled data.

---

### Why DVC for Pipeline?
**Reason**: 
- Reproducibility: Tracks data versions and pipeline stages
- Caching: Skips unchanged stages
- Collaboration: Easy to share pipelines

**Alternative Considered**: Airflow, but too heavyweight for this use case.

---

### Why FastAPI over Flask?
**Reason**:
- Automatic OpenAPI documentation
- Type hints and validation
- Async support for future scaling
- Better performance

---

### Why Three.js over Babylon.js?
**Reason**:
- Lighter weight
- Better documentation
- Easier to customize shaders
- Larger community

---

## 🔐 Security Considerations

### API Tokens in .env
**Current**: Stored in plaintext `.env` file (gitignored)

**Production**: Use secrets management:
- AWS Secrets Manager
- HashiCorp Vault
- Kubernetes Secrets

---

### No Authentication on API
**Current**: API endpoints are open

**Production**: Add:
- JWT authentication
- API key validation
- Rate limiting

---

## 🚀 Performance Optimizations

### Dataset Loading
**Current**: Loads entire dataset into memory

**Optimization**: For large datasets, implement:
- Lazy loading with generators
- Batch processing
- Parquet partitioning

---

### Model Inference
**Current**: CPU-only inference

**Optimization**: 
- Use MPS backend on Apple Silicon
- Use CUDA on NVIDIA GPUs
- Implement model quantization for faster inference

---

### Dashboard Rendering
**Current**: Renders all planets every frame

**Optimization**:
- Implement frustum culling
- Use LOD (Level of Detail) for distant objects
- Reduce texture resolution for mobile

---

## 📊 Testing Strategy

### Current State
- No automated tests
- Manual verification via `verify_ingestion.py`

### Recommended Tests
1. **Unit Tests**: Test individual ingestors, feature builders
2. **Integration Tests**: Test full DVC pipeline
3. **API Tests**: Test FastAPI endpoints
4. **E2E Tests**: Test full workflow (ingest → train → predict)

### Test Framework Recommendations
- **pytest**: For Python tests
- **pytest-cov**: For coverage reports
- **httpx**: For API testing
- **Playwright**: For frontend E2E tests

---

## 🔄 Migration Path to Production

### Phase 1: Stability
- [ ] Add comprehensive tests
- [ ] Set up CI/CD pipeline
- [ ] Implement proper logging
- [ ] Add monitoring and alerting

### Phase 2: Scalability
- [ ] Move to database-backed MLflow
- [ ] Implement distributed training
- [ ] Add model serving with TorchServe
- [ ] Set up load balancing

### Phase 3: Features
- [ ] Real-time prediction dashboard
- [ ] Multi-model ensemble
- [ ] Active learning pipeline
- [ ] Automated retraining

---

## 📝 Code Style Guidelines

### Python
- Follow PEP 8
- Use type hints
- Docstrings for all public functions
- Maximum line length: 120 characters

### JavaScript
- Use ES6+ features
- Consistent indentation (2 spaces)
- Descriptive variable names
- Comments for complex logic

### File Naming
- Python: `snake_case.py`
- JavaScript: `camelCase.js`
- HTML/CSS: `kebab-case.html`

---

## 🤝 Contributing Guidelines

### Before Making Changes
1. Create a new branch: `git checkout -b feature/your-feature`
2. Update documentation if needed
3. Test locally before committing
4. Run `dvc repro` to ensure pipeline works

### Commit Message Format
```
<type>: <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Example**:
```
feat: add GPU support for training

- Modified train_model.py to detect and use MPS/CUDA
- Updated requirements.txt with torch GPU dependencies
- Added configuration for device selection

Closes #123
```

---

## 📞 Support

### Common Questions

**Q: How do I add a new data source?**
A: 
1. Create new ingestor in `src/data_ingestion/`
2. Add configuration to `configs/base.yaml`
3. Create feature builder script in `scripts/`
4. Add stages to `dvc.yaml`

**Q: How do I change the model architecture?**
A: Modify `src/models/fewshot/protonet.py` and update `train_model.py` accordingly.

**Q: How do I deploy to production?**
A: See "Migration Path to Production" section above.

---

**Last Updated**: 2025-11-22  
**Maintained By**: Avatar Project Team
