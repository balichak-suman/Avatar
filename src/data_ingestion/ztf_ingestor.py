"""ZTF ingestion connector scaffolding."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Iterable

import pandas as pd
try:
    from alerce.core import Alerce
except ImportError:
    Alerce = None
    logging.getLogger("ztf_ingestor").warning("alerce not installed. ZTF live fetching disabled.")

from .base import BaseIngestor
from .schemas import ZTFRecord

logger = logging.getLogger(__name__)


class ZTFIngestor(BaseIngestor):
    """Ingests alert packets and imagery metadata from ZTF via ALeRCE."""

    record_model = ZTFRecord

    def __init__(self, source_name: str, output_dir: Path, config: dict[str, Any]) -> None:
        super().__init__(source_name, output_dir, config)
        self.client = Alerce()

    def fetch(
        self,
        limit: int = 10,
        filters: list[str] | None = None,
        **_: Any,
    ) -> Iterable[dict[str, Any]]:
        logger.debug("Fetching ZTF records via ALeRCE client")
        
        # ALeRCE allows querying by classifier, probability, etc.
        # For general stream ingestion, we can just query latest objects
        # or a specific class like 'Periodic-Other' or 'Variable'. 
        # Limits apply to objects, not rows.
        
        try:
            # Step 1: Query Objects from multiple classes for diversity
            classes_of_interest = ["SN", "AGN", "Variable", "Asteroid", "Periodic-Other"]
            records = []
            
            # Distribute limit across classes
            per_class_limit = max(10, limit // len(classes_of_interest))
            
            for cls in classes_of_interest:
                logger.info(f"Querying ZTF objects for class: {cls} (limit={per_class_limit})")
                try:
                    # Note: class_name parameter might vary by classifier version, using generic query if possible
                    # or iterating common ALeRCE taxonomy classes
                    objects = self.client.query_objects(
                        classifier="lc_classifier", 
                        class_name=cls, 
                        limit=per_class_limit
                    )
                    
                    if objects is not None and not objects.empty:
                        logger.info(f"Found {len(objects)} objects for class {cls}")
                        
                        # Step 2: For each object, get lightcurve
                        for _, obj_row in objects.iterrows():
                            oid = obj_row["oid"]
                            try:
                                lc = self.client.query_lightcurve(oid)
                                detections = lc.get("detections", [])
                                
                                if detections:
                                    for det in detections:
                                        record = self._parse_alerce_detection(obj_row, det)
                                        if record:
                                            # Inject the ALeRCE class label into the record for training usage maybe?
                                            # The current schema might not support it, but we can rely on AutoLabeler later
                                            # or just trust the diversity of input features.
                                            records.append(record)
                            except Exception as e:
                                continue
                except Exception as e:
                    logger.warning(f"Failed to query class {cls}: {e}")
                    continue
            
            logger.info(f"Fetched {len(records)} ZTF detection records via ALeRCE")
            return records

        except Exception as e:
            logger.error(f"ALeRCE API failed: {e}")
            return []

    def _parse_alerce_detection(self, obj_row: pd.Series, det: dict[str, Any]) -> dict[str, Any] | None:
        """Convert ALeRCE detection dict + object metadata to ZTFRecord."""
        try:
            # Basic validation
            if not det.get("magpsf"):
                return None
                
            return {
                "object_id": str(obj_row["oid"]),
                "candidate_id": str(det.get("candid", "")),
                "ra": float(obj_row["meanra"]),
                "dec": float(obj_row["meandec"]),
                "filter": "g" if det.get("fid") == 1 else "r", # 1=g, 2=r roughly
                "mag_psf": float(det["magpsf"]),
                "mag_err": float(det.get("sigmapsf", 0.0)),
                "mjd": float(det["mjd"]),
                "raw_payload": det # Store full payload if needed
            }
        except Exception as e:
            logger.debug(f"Error parsing detection: {e}")
            return None

def create_ztf_ingestor(output_dir: Path, config: dict[str, Any]) -> ZTFIngestor:
    return ZTFIngestor(source_name="ztf", output_dir=output_dir, config=config)
