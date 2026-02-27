# Quick Reference Guide

## 🎯 Most Common Commands

### Start Everything
```bash
./start.sh
```

### Train Model
```bash
./train.sh
```

### Stop Everything
```bash
docker-compose down
pkill -f "python.*http.server.*8081"
```

---

## 🔧 Development Commands

### Local Development

#### Activate Virtual Environment
```bash
source .venv/bin/activate  # Mac/Linux
.venv\Scripts\activate     # Windows
```

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Run Single Data Source Ingestion
```bash
python scripts/ingest_stream.py --source ztf --limit 10
python scripts/ingest_stream.py --source tess --limit 10
python scripts/ingest_stream.py --source mast --limit 10
```

#### Build Features
```bash
python scripts/build_ztf_features.py data/raw/ztf --output-dir data/processed/ztf
python scripts/build_tess_features.py data/raw/tess --output-dir data/processed/tess
python scripts/build_mast_features.py data/raw/mast --output-dir data/processed/mast
```

#### Train Model Locally
```bash
python scripts/train_model.py --epochs 10
```

#### Start API Server
```bash
uvicorn src.serving.api:app --reload --port 8000
```

#### Start Dashboard Server
```bash
python -m http.server 8081
```

---

## 🐳 Docker Commands

### Build Images
```bash
docker-compose build
```

### Start Services
```bash
docker-compose up -d api        # Start API in background
docker-compose up api           # Start API with logs
```

### Run Training
```bash
docker-compose run --rm trainer
```

### View Logs
```bash
docker-compose logs -f api
docker-compose logs -f trainer
```

### Stop Services
```bash
docker-compose down
```

### Clean Up
```bash
docker-compose down -v          # Remove volumes
docker system prune -a          # Remove all unused images
```

### Shell into Container
```bash
docker-compose run --rm trainer bash
```

---

## 📊 DVC Commands

### Run Full Pipeline
```bash
dvc repro
```

### Run Specific Stage
```bash
dvc repro ingest_ztf
dvc repro build_ztf_features
dvc repro train_model
```

### Force Re-run (Ignore Cache)
```bash
dvc repro --force
```

### Check Pipeline Status
```bash
dvc status
```

### View Pipeline DAG
```bash
dvc dag
```

### Clean DVC Cache
```bash
dvc gc -w
```

---

## 🧪 Testing & Verification

### Verify Data Ingestion
```bash
python scripts/verify_ingestion.py
```

### Check Model File
```bash
ls -lh artifacts/models/
```

### Test API Endpoint
```bash
curl http://localhost:8000/health
curl http://localhost:8000/predict -X POST -H "Content-Type: application/json" -d '{"features": [1,2,3,4,5,6,7,8,9,10]}'
```

### View API Documentation
```bash
open http://localhost:8000/docs
```

---

## 🗂️ File Management

### Clean Data Directories
```bash
rm -rf data/raw/*
rm -rf data/processed/*
```

### Clean Models
```bash
rm -rf artifacts/models/*
```

### Clean MLflow Runs
```bash
rm -rf mlruns/
```

### Clean DVC Cache
```bash
rm -rf .dvc/cache
rm -f dvc.lock
rm -f .dvc/tmp/lock
```

---

## 🔍 Debugging

### Check Python Version
```bash
python --version
```

### Check Installed Packages
```bash
pip list
```

### Check Docker Status
```bash
docker ps
docker images
```

### Check Port Usage
```bash
lsof -i :8000  # API port
lsof -i :8081  # Dashboard port
```

### Kill Process on Port
```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:8081 | xargs kill -9
```

### View Environment Variables
```bash
cat .env
printenv | grep -E "ZTF|TESS|MAST"
```

---

## 📝 Git Commands

### Check Status
```bash
git status
```

### Add Changes
```bash
git add .
git add dvc.lock  # After DVC pipeline
```

### Commit
```bash
git commit -m "feat: your message here"
```

### View History
```bash
git log --oneline
```

### Create Branch
```bash
git checkout -b feature/your-feature
```

---

## 🎨 Frontend Development

### Reload Dashboard
Just refresh browser (no build step needed)

### Check Browser Console
F12 → Console tab

### Test CORS
```bash
# Must use HTTP server, not file://
python -m http.server 8081
```

### View Network Requests
F12 → Network tab

---

## 📦 Package Management

### Update Requirements
```bash
pip freeze > requirements.txt
```

### Install New Package
```bash
pip install package-name
pip freeze > requirements.txt
```

### Upgrade Package
```bash
pip install --upgrade package-name
pip freeze > requirements.txt
```

---

## 🔐 Environment Setup

### Create .env File
```bash
cat > .env << EOF
ZTF_API_TOKEN=your_token
TESS_API_TOKEN=your_token
MAST_API_TOKEN=your_token
EOF
```

### Load Environment Variables
```bash
source .env  # In bash
export $(cat .env | xargs)  # Alternative
```

---

## 📊 Monitoring

### Watch Logs in Real-Time
```bash
tail -f dashboard.log
docker-compose logs -f api
```

### Check Disk Usage
```bash
du -sh data/
du -sh artifacts/
du -sh .dvc/cache/
```

### Monitor Training Progress
```bash
# In another terminal while training
watch -n 1 'ls -lh artifacts/models/'
```

---

## 🚀 Deployment

### Build for Production
```bash
docker-compose -f docker-compose.prod.yaml build
```

### Run in Production Mode
```bash
docker-compose -f docker-compose.prod.yaml up -d
```

---

## 💡 Tips & Tricks

### Quick Reset
```bash
# Reset everything to clean state
docker-compose down -v
rm -rf data/raw/* data/processed/* artifacts/models/*
rm -f dvc.lock .dvc/tmp/lock
```

### Quick Test
```bash
# Test with minimal data
python scripts/ingest_stream.py --source ztf --limit 5
python scripts/build_ztf_features.py data/raw/ztf --output-dir data/processed/ztf
python scripts/train_model.py --epochs 1
```

### Backup Model
```bash
cp artifacts/models/final_model.pt artifacts/models/final_model_backup_$(date +%Y%m%d).pt
```

### View File Sizes
```bash
find . -type f -size +10M -exec ls -lh {} \;
```

---

**Last Updated**: 2025-11-22
