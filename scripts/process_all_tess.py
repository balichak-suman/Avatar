"""
Process ALL TESS data for maximum training set size.
"""
import sys
from pathlib import Path
import pandas as pd
import numpy as np
import json
import logging

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.preprocessing.auto_labeler import AutoLabeler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def process_all_tess():
    """Process ALL TESS JSON files."""
    
    tess_raw = PROJECT_ROOT / "data/raw/tess"
    output_path = PROJECT_ROOT / "data/processed/tess/features.parquet"
    
    if not tess_raw.exists():
        logger.error("No TESS data directory found")
        return
    
    all_files = list(tess_raw.glob("*.json"))
    logger.info(f"Found {len(all_files)} TESS files to process")
    
    feature_records = []
    processed = 0
    failed = 0
    
    for idx, tess_file in enumerate(all_files):
        if idx % 100 == 0:
            logger.info(f"Processing {idx}/{len(all_files)}...")
        
        try:
            with open(tess_file, 'r') as f:
                data = json.load(f)
            
            times = data.get('time', [])
            fluxes = data.get('flux', [])
            
            if not times or not fluxes or len(times) < 10:
                failed += 1
                continue
            
            # Convert to magnitude
            fluxes_arr = np.array(fluxes)
            valid_flux = fluxes_arr > 0
            if np.sum(valid_flux) < 10:
                failed += 1
                continue
                
            fluxes_arr = np.where(valid_flux, fluxes_arr, np.median(fluxes_arr[valid_flux]))
            mags = -2.5 * np.log10(fluxes_arr)
            
            # 5-feature representation
            features = {
                'object_id': data.get('objectid', tess_file.stem),
                'detections': float(len(mags)),
                'mean_mag': float(np.mean(mags)),
                'std_mag': float(np.std(mags)),
                'min_mag': float(np.min(mags)),
                'max_mag': float(np.max(mags)),
                'filters': 'TESS'
            }
            
            # Auto-label
            label_result = AutoLabeler.classify(
                times,
                mags.tolist(),
                metadata={'mag_psf': features['mean_mag'], 'filter': 'TESS'}
            )
            
            features['label'] = label_result.label.value
            feature_records.append(features)
            processed += 1
            
        except Exception as e:
            failed += 1
            continue
    
    logger.info(f"✅ Processed {processed} TESS samples, {failed} failed")
    
    if feature_records:
        df = pd.DataFrame(feature_records)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(output_path, index=False)
        logger.info(f"💾 Saved {len(df)} samples → {output_path}")
        logger.info(f"📊 Label distribution:\n{df['label'].value_counts()}")
    else:
        logger.warning("No features generated")

if __name__ == "__main__":
    process_all_tess()
