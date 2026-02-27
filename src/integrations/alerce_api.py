"""
ALeRCE API Integration for Real Astronomical Event Classifications
"""
from typing import List, Dict, Optional
import logging
import pandas as pd
try:
    from alerce.core import Alerce
except ImportError:
    Alerce = None

logger = logging.getLogger(__name__)

# Map ALeRCE classes to our event types
# ALeRCE Taxonomy: https://alerce.readthedocs.io/en/latest/taxonomy.html
CLASS_MAPPING = {
    "SN": "Supernova",
    "SNIa": "Supernova Ia",
    "SNIbc": "Supernova Ibc", 
    "SNII": "Supernova II",
    "SLSN": "Super-Luminous Supernova",
    "AGN": "Active Galactic Nucleus",
    "Blazar": "Blazar Activity",
    "CV/Nova": "Nova",
    "Asteroid": "Asteroid Flyby",
    "QSO": "Quasar",
    "YSO": "Young Stellar Object",
    "EB": "Eclipsing Binary",
    "RRL": "RR Lyrae",
    "Ceph": "Cepheid Variable",
    "LPV": "Long Period Variable",
    "Periodic-Other": "Periodic Variable"
}


def fetch_alerce_predictions(limit: int = 10) -> List[Dict]:
    """
    Fetch real astronomical event predictions from ALeRCE API using official client.
    """
    if Alerce is None:
        logger.error("ALeRCE client not installed")
        return []

    predictions = []
    client = Alerce()
    
    try:
        # Query objects capable of being classified
        # limit applies to page size
        logger.info(f"Querying ALeRCE for {limit} objects...")
        objects = client.query_objects(
            classifier="lc_classifier", 
            limit=limit,
            format="pandas"
        )
        
        if objects is not None and not objects.empty:
            # We need probabilities for these objects to be sure
            # But query_objects usually returns metadata.
            # To be efficient, we'll assume the top class if provided, or fetch probabilities.
            # For this demo, let's fetch probabilities for the first few.
            
            # Note: query_probabilities can accept list of OIDs in some versions, or we loop.
            # Looping is safer for small limit.
            
            for _, row in objects.iterrows():
                try:
                    oid = row["oid"]
                    # Try to get best class from probability query
                    probs = client.query_probabilities(oid, format="pandas")
                    
                    if probs is not None and not probs.empty:
                        # Filter by classifier 'lc_classifier'
                        # Structure: classifier_name, class_name, probability, ranking
                        lc_probs = probs[probs["classifier_name"] == "lc_classifier"]
                        if not lc_probs.empty:
                            best_row = lc_probs.loc[lc_probs["probability"].idxmax()]
                            best_class = best_row["class_name"]
                            best_prob = best_row["probability"]
                            
                            event_type = CLASS_MAPPING.get(best_class, f"Unknown ({best_class})")
                            confidence = min(99.0, max(50.0, float(best_prob) * 100))
                            
                            # Only add high confidence or specific classes
                            if confidence > 40:
                                predictions.append({
                                    "event": event_type,
                                    "confidence": round(confidence, 1),
                                    "timestamp": row.get("lastmjd", 0),
                                    "type": "critical" if confidence > 80 else "info",
                                    "details": f"ALeRCE API | ID: {str(oid)[:12]}",
                                    "source": "ALeRCE API"
                                })
                except Exception as inner_e:
                    continue
        
        logger.info(f"Fetched {len(predictions)} verified predictions from ALeRCE")
        
    except Exception as e:
        logger.error(f"ALeRCE client integration error: {e}")
    
    return predictions

def get_diverse_predictions(limit: int = 10) -> List[Dict]:
    return fetch_alerce_predictions(limit)
