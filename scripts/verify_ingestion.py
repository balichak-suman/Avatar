
import sys
import os
import yaml
import logging
from pathlib import Path

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.data_ingestion.ztf_ingestor import create_ztf_ingestor
from src.data_ingestion.tess_ingestor import create_tess_ingestor
from src.data_ingestion.mast_ingestor import create_mast_ingestor

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("VerifyIngestion")

def load_env():
    env_path = Path(".env")
    if env_path.exists():
        logger.info(f"Loading environment from {env_path}")
        with open(env_path) as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
    else:
        logger.warning(".env file not found!")

def load_config(config_path):
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

def verify_ztf(config):
    logger.info("--- Verifying ZTF Ingestion ---")
    try:
        ingestor = create_ztf_ingestor(Path("data/raw/ztf"), config['data_sources']['ztf'])
        records = ingestor.fetch(limit=1)
        if records:
            logger.info(f"✅ ZTF Success! Fetched {len(records)} records.")
            logger.info(f"Sample Record: {records[0]}")
            if "ZTF_SYNTH" in str(records[0].get('object_id')):
                 logger.warning("⚠️  ZTF returned SYNTHETIC data (Fallback active). Real-time API might be down or empty.")
            else:
                 logger.info("🌍 ZTF returned REAL data from IRSA.")
        else:
            logger.error("❌ ZTF Failed: No records returned.")
    except Exception as e:
        logger.error(f"❌ ZTF Exception: {e}")

def verify_tess(config):
    logger.info("--- Verifying TESS Ingestion ---")
    try:
        ingestor = create_tess_ingestor(Path("data/raw/tess"), config['data_sources']['tess'])
        records = ingestor.fetch(limit=1)
        if records:
            logger.info(f"✅ TESS Success! Fetched {len(records)} records.")
            # Check if it's the sample payload
            if records[0].get('tic_id') == "TIC123456789":
                logger.warning("⚠️  TESS returned SAMPLE data. Real-time API might be failing.")
            else:
                logger.info("🌍 TESS returned REAL data from MAST.")
        else:
            logger.error("❌ TESS Failed: No records returned.")
    except Exception as e:
        logger.error(f"❌ TESS Exception: {e}")

def verify_mast(config):
    logger.info("--- Verifying MAST Ingestion ---")
    try:
        ingestor = create_mast_ingestor(Path("data/raw/mast"), config['data_sources']['mast'])
        records = ingestor.fetch(limit=1)
        if records:
            logger.info(f"✅ MAST Success! Fetched {len(records)} records.")
            logger.info(f"Sample Record: {records[0]}")
            logger.info("🌍 MAST returned REAL data.")
        else:
            logger.warning("⚠️  MAST returned no records. This might be due to empty search results or API issues.")
    except Exception as e:
        logger.error(f"❌ MAST Exception: {e}")

if __name__ == "__main__":
    load_env()
    config = load_config("configs/base.yaml")
    
    verify_ztf(config)
    print("\n")
    verify_tess(config)
    print("\n")
    verify_mast(config)
