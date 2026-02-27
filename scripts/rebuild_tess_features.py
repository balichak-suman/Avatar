"""
Rebuild TESS features to match ZTF's 5-feature format for unified training.
"""
import sys
from pathlib import Path
import pandas as pd
import numpy as np
import logging

# Setup paths
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.preprocessing.auto_labeler import AutoLabeler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def rebuild_tess_features():
    """Rebuild TESS features to match ZTF format (5 features)."""
    
    tess_raw = PROJECT_ROOT / "data/raw/tess"
    output_path = PROJECT_ROOT / "data/processed/tess/features.parquet"
    
    if not tess_raw.exists():
        logger.warning("No TESS raw data found")
        return
    
    feature_records = []
    
    # Process each TESS JSON file
    for tess_file in sorted(tess_raw.glob("record_*.json")):
        try:
            import json
            with open(tess_file, 'r') as f:
                data = json.load(f)
            
            # Extract time series data
            times = data.get('time', [])
            fluxes = data.get('flux', [])
            
            if not times or not fluxes:
                continue
            
            # Convert flux to magnitude (astronomy: mag = -2.5 * log10(flux))
            fluxes_arr = np.array(fluxes)
            fluxes_arr = np.where(fluxes_arr > 0, fluxes_arr, np.median(fluxes_arr[fluxes_arr > 0]))
            mags = -2.5 * np.log10(fluxes_arr)
            
            # Create 5-feature representation (matching ZTF)
            features = {
                'object_id': data.get('object_id', tess_file.stem),
                'detections': float(len(mags)),
                'mean_mag': float(np.mean(mags)),
                'std_mag': float(np.std(mags)),
                'min_mag': float(np.min(mags)),
                'max_mag': float(np.max(mags)),
                'filters': 'TESS'
            }
            
            # Auto-label using magnitude
            label_result = AutoLabeler.classify(
                times,
                mags.tolist(),
                metadata={'mag_psf': features['mean_mag'], 'filter': 'TESS'}
            )
            
            features['label'] = label_result.label.value
            feature_records.append(features)
            
        except Exception as e:
            logger.warning(f"Failed to process {tess_file}: {e}")
            continue
    
    if feature_records:
        df = pd.DataFrame(feature_records)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(output_path, index=False)
        logger.info(f"✅ Rebuilt {len(df)} TESS samples → {output_path}")
        logger.info(f"Label distribution: {df['label'].value_counts().to_dict()}")
    else:
        logger.warning("No TESS features generated")

if __name__ == "__main__":
    rebuild_tess_features()
