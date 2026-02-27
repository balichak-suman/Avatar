from alerce.core import Alerce
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("alerce_test")

try:
    logger.info("Initializing ALeRCE client...")
    client = Alerce()
    
    logger.info("Querying latest objects...")
    # Try a very simple query first
    objects = client.query_objects(classifier="lc_classifier", limit=5)
    
    if objects is None or objects.empty:
        logger.error("❌ API returned None or empty dataframe")
    else:
        logger.info(f"✅ Success! Found {len(objects)} objects")
        print(objects.head())
        
except Exception as e:
    logger.error(f"❌ API Call Failed: {e}")
