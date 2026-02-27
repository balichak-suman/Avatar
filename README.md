# Adaptive MLOps and Few-Shot Learning Framework for Rare Cosmic Event Detection

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Development Workflow](#development-workflow)
5. [Project Structure](#project-structure)
6. [Key Features](#key-features)
7. [Configuration](#configuration)
8. [Troubleshooting](#troubleshooting)
9. [Next Steps](#next-steps)

---

## 🎯 Project Overview

**Cosmic Oracle** is an Adaptive MLOps Framework designed for the real-time detection of rare cosmic events. It combines immediate data ingestion with few-shot learning to identify anomalies in astronomical streams.

### Core Philosophy: Hybrid Real-Time Architecture
This framework solves the "Real-Time Training vs. Inference" dilemma using a **Sliding Window** strategy:
1.  **Ingestion (The Mailbox)**: ZTF alerts are ingested in real-time (Seconds latency). TESS/MAST data are treated as static "Deep Space" anchors.
2.  **Training (The Reader)**: The model is retrained in batches (e.g., daily) on the latest snapshot of data. It does *not* train continuously.
3.  **Inference (The Action)**: The pre-trained model runs live inference on incoming ZTF alerts, providing instant classification.

### Core Technologies
- **Backend**: Python 3.10, FastAPI, PyTorch
- **Frontend**: Three.js, HTML/CSS/JavaScript
- **MLOps**: DVC, MLflow
- **Deployment**: Docker, Docker Compose
- **Data Sources**: ZTF (Real-Time), TESS (Periodic), MAST (Archival)

---

## 🏗️ Architecture

### Data Pipeline
```
┌─────────────────────────────────────────────────────────────┐
│  Real-Time Ingestion Layer                                  │
├─────────────────────────────────────────────────────────────┤
│  ZTF Stream  ---> BUFFER (data/raw/ztf) ---> Live Inference │
│  TESS/MAST   ---> STORAGE (data/raw/...)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓ (Periodic Retraining Trigger)
┌─────────────────────────────────────────────────────────────┐
│  Training Layer (Sliding Window)                            │
├─────────────────────────────────────────────────────────────┤
│  1. Load Snapshot (ZTF + TESS + MAST)                       │
│  2. Build Features (Parquet)                                │
│  3. Train Prototypical Network (10 Epochs)                  │
│  4. Save Model -> artifacts/models/final_model.pt           │
└─────────────────────────────────────────────────────────────┘
                            ↓ (Model Update)
┌─────────────────────────────────────────────────────────────┐
│  Serving Layer (FastAPI)                                    │
├─────────────────────────────────────────────────────────────┤
│  /predict endpoint <--- New ZTF Alert                       │
│  Output: "Supernova" (98%)                                  │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Components
- **Login Page** (`login.html`): Interactive 3D astronaut with animations
- **Dashboard** (`dashboard.html`): Solar system visualization, NASA APOD widget
- **Solar System Explorer** (`solar_sys/index.html`): High-fidelity 3D simulation with real-time Earth rotation

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed
- Git installed
- API tokens (optional, for real data ingestion)

### 1. Clone and Setup
```bash
cd /path/to/avatar
```

### 2. Configure API Tokens (Optional)
Create a `.env` file:
```bash
ZTF_API_TOKEN=your_ztf_token
TESS_API_TOKEN=your_tess_token
MAST_API_TOKEN=your_mast_token
```

### 3. Start the Application
```bash
./start.sh
```
Access:
- **API Docs**: http://localhost:8000/docs
- **Dashboard**: http://localhost:8081/dashboard.html
- **Login**: http://localhost:8081/login.html

### 4. Train the Model
```bash
./train.sh
```
This will:
1. Download datasets (25 records per source by default)
2. Train the model for 10 epochs
3. Save to `artifacts/models/final_model.pt`
4. **Delete datasets** to save space

---

## 💻 Development Workflow

### Local Development (Without Docker)

#### 1. Create Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

#### 2. Run Data Ingestion
```bash
# Ingest from specific source
python scripts/ingest_stream.py --source ztf --limit 25

# Or run full DVC pipeline
dvc repro
```

#### 3. Train Model
```bash
python scripts/train_model.py --epochs 10
```

#### 4. Start API Server
```bash
uvicorn src.serving.api:app --reload
```

#### 5. Start Dashboard Server
```bash
python -m http.server 8081
```

### Docker Development

#### Build and Run
```bash
docker-compose up -d api
```

#### Run Training in Docker
```bash
docker-compose run --rm trainer
```

#### View Logs
```bash
docker-compose logs -f api
```

#### Stop Services
```bash
docker-compose down
```

---

## 📁 Project Structure

```
avatar/
├── .env                          # API tokens (not in git)
├── .gitignore                    # Git ignore rules
├── Dockerfile                    # Docker image definition
├── docker-compose.yaml           # Multi-service orchestration
├── dvc.yaml                      # DVC pipeline definition
├── requirements.txt              # Python dependencies
├── start.sh                      # Start application script
├── train.sh                      # Training automation script
├── HOW_TO_TRAIN_ANYWHERE.md     # Platform independence guide
│
├── configs/
│   └── base.yaml                 # Data source configurations
│
├── scripts/
│   ├── ingest_stream.py          # Data ingestion CLI
│   ├── build_ztf_features.py     # ZTF feature extraction
│   ├── build_tess_features.py    # TESS feature extraction
│   ├── build_mast_features.py    # MAST feature extraction
│   ├── train_model.py            # Model training script
│   └── verify_ingestion.py       # Ingestion verification
│
├── src/
│   ├── data_ingestion/
│   │   ├── base.py               # Base ingestor class
│   │   ├── ztf_ingestor.py       # ZTF data fetcher
│   │   ├── tess_ingestor.py      # TESS data fetcher
│   │   └── mast_ingestor.py      # MAST data fetcher
│   │
│   ├── datasets/
│   │   └── parquet_dataset.py    # Dataset loader for training
│   │
│   ├── models/
│   │   └── fewshot/
│   │       └── protonet.py       # Prototypical Network
│   │
│   ├── training/
│   │   └── fewshot_trainer.py    # Training orchestration
│   │
│   └── serving/
│       └── api.py                # FastAPI endpoints
│
├── data/
│   ├── raw/                      # Raw ingested data
│   │   ├── ztf/
│   │   ├── tess/
│   │   └── mast/
│   └── processed/                # Feature-engineered data
│       ├── ztf/
│       ├── tess/
│       └── mast/
│
├── artifacts/
│   └── models/                   # Trained models
│       ├── fewshot_protonet.pt
│       └── final_model.pt
│
├── dashboard.html                # Main dashboard
├── login.html                    # 3D login page
├── run_dashboard.sh              # Dashboard server script
│
└── solar_sys/                    # Solar system visualization
    ├── index.html
    └── js/
        ├── main.js
        ├── orbit.js
        ├── time.js
        └── data.js
```

---

## ✨ Key Features

### 1. Interactive 3D Login Page
- Procedurally generated astronaut character
- **Animations**:
  - Idle: Floating motion
  - Username input: Looks at field
  - Password input: Covers eyes
  - Login failure: Sad shake
  - Login success: Redirects to dashboard

### 2. Real-Time Earth Rotation
- Uses Julian Date calculations
- Accurate day/night cycle based on current time
- GMST (Greenwich Mean Sidereal Time) implementation

### 3. Platform-Independent Training
- Fully Dockerized workflow
- No local Python installation required
- Works on Windows, Mac, Linux
- Automatic dataset cleanup after training

### 4. Real-Time Data Ingestion
- **ZTF**: IRSA API integration
- **TESS**: MAST API for light curves
- **MAST**: CAOM API for observations
- No sample data fallbacks (enforced real API usage)

### 5. Few-Shot Learning
- Prototypical Networks architecture
- Episode-based training
- Support for 3-way classification (ZTF, TESS, MAST)
- MLflow tracking (disabled in Docker to avoid conflicts)

---

## ⚙️ Configuration

### Data Limits
Edit `dvc.yaml` to change ingestion limits:
```yaml
ingest_ztf:
  cmd: python scripts/ingest_stream.py --source ztf --limit 25  # Change this
```

### Training Epochs
Edit `docker-compose.yaml`:
```yaml
trainer:
  command: python scripts/train_model.py --epochs 10  # Change this
```

### API Tokens
Add to `.env`:
```bash
ZTF_API_TOKEN=your_token_here
TESS_API_TOKEN=your_token_here
MAST_API_TOKEN=your_token_here
```

### MLflow Tracking
- **Local**: Enabled by default, logs to `./mlruns`
- **Docker**: Disabled via `DISABLE_MLFLOW=1` to avoid filesystem conflicts

---

## 🔧 Troubleshooting

### Issue: "Permission denied" when training
**Solution**: Ensure artifacts directory has correct permissions
```bash
chmod -R 777 artifacts/models
```

### Issue: "Resource deadlock avoided" in Docker
**Solution**: Clean DVC locks before running
```bash
rm -f .dvc/tmp/lock dvc.lock
```

### Issue: CORS errors on dashboard
**Solution**: Use the provided HTTP server on port 8081
```bash
python -m http.server 8081
```

### Issue: API tokens not working
**Solution**: Verify `.env` file exists and is loaded
```bash
cat .env  # Check file exists
# Ensure no extra spaces around = sign
```

### Issue: Docker build fails
**Solution**: Ensure Docker Desktop is running and has enough resources
```bash
docker system prune -a  # Clean up old images
docker-compose build --no-cache
```

### Issue: Training fails with MLflow errors
**Solution**: MLflow is disabled in Docker. For local training:
```bash
# Remove old MLflow data
rm -rf mlruns/
# Run training
python scripts/train_model.py --epochs 10
```

---

## 🎯 Next Steps

### Immediate Improvements
1. **Increase Dataset Size**: Remove `--limit 25` from `dvc.yaml` for full dataset
2. **Add GPU Support**: Modify `train_model.py` to use MPS (Apple Silicon) or CUDA
3. **Backend Authentication**: Integrate `login.html` with FastAPI backend
4. **Model Evaluation**: Add evaluation metrics to training script

### Future Enhancements
1. **Real-Time Predictions**: Connect dashboard to `/predict` endpoint
2. **Model Versioning**: Implement proper model registry with MLflow
3. **CI/CD Pipeline**: Add GitHub Actions for automated testing
4. **Database Backend**: Replace MLflow filesystem with SQLite/PostgreSQL
5. **Monitoring**: Add Prometheus/Grafana for production monitoring
6. **Multi-Model Support**: Train separate models for each data source

### Production Deployment
1. Use managed MLflow (e.g., Databricks, AWS SageMaker)
2. Deploy API to cloud (AWS ECS, GCP Cloud Run, Azure Container Instances)
3. Set up CDN for static assets (CloudFront, Cloudflare)
4. Implement proper authentication and authorization
5. Add rate limiting and caching

---

## 📝 Important Notes

### Data Cleanup
- `train.sh` **automatically deletes** raw and processed data after successful training
- Only the trained model (`artifacts/models/final_model.pt`) is preserved
- This is intentional to save disk space during transient training workflows

### Docker vs Local
- **Docker**: Recommended for training on different machines
- **Local**: Better for development and debugging with MLflow tracking

### API Tokens
- Required for real-time data ingestion
- Without tokens, ingestion will fail (no fallback data)
- Obtain from respective data providers (IRSA, MAST)

### Model Files
- `fewshot_protonet.pt`: Checkpoint during training
- `final_model.pt`: Final trained model (used by API)

---

## 📚 Additional Resources

- **DVC Documentation**: https://dvc.org/doc
- **MLflow Documentation**: https://mlflow.org/docs/latest/index.html
- **Three.js Documentation**: https://threejs.org/docs/
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **ZTF API**: https://irsa.ipac.caltech.edu/docs/program_interface/ztf_api.html
- **MAST API**: https://mast.stsci.edu/api/v0/

---

**Last Updated**: 2025-11-22  
**Version**: 1.0  
**Maintainer**: Avatar Project Team
