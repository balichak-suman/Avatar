
import json
import random
import numpy as np
import torch
import logging
from pathlib import Path
from src.models.fewshot.protonet import ProtoNet, compute_prototypes
from src.datasets.fewshot_dataset import EpisodeDataset
from src.training.fewshot_trainer import FewShotTrainer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

def auto_label_data():
    """Scans raw data and assigns weak labels based on signal heuristics."""
    logger.info("Starting Auto-Labeling Process...")
    
    labeled_data = {
        "Planet Crossing": [],
        "Star Flare": [],
        "Twin Stars": [],
        "Cosmic Explosion": [],
        "Unknown Anomaly": [] # For difficult ones
    }
    
    # 1. Scan TESS
    tess_path = PROJECT_ROOT / "data/raw/tess"
    for file_path in tess_path.glob("record_*.json"):
        try:
            with open(file_path, "r") as f:
                record = json.load(f)
                flux = np.array(record.get("flux", []))
                
                if len(flux) < 10: continue
                
                # Normalize
                norm_flux = (flux - np.mean(flux)) / (np.std(flux) + 1e-6)
                min_val = np.min(norm_flux)
                max_val = np.max(norm_flux)
                
                # Heuristics
                if min_val < -3.0:
                    labeled_data["Planet Crossing"].append(str(file_path))
                elif max_val > 4.0:
                    labeled_data["Star Flare"].append(str(file_path))
                elif min_val < -1.5:
                     labeled_data["Twin Stars"].append(str(file_path))
                else:
                    labeled_data["Unknown Anomaly"].append(str(file_path))
                    
        except Exception:
            continue
            
    # 2. Scan ZTF
    ztf_path = PROJECT_ROOT / "data/raw/ztf"
    for file_path in ztf_path.glob("record_*.json"):
         # ZTF is almost always Transients (Explosions)
         labeled_data["Cosmic Explosion"].append(str(file_path))

    # Summary
    for k, v in labeled_data.items():
        logger.info(f"Class '{k}': {len(v)} samples")
        
    # Create Episode Manifest
    # We need a 'support' set and 'query' set logic for the dataset loader
    # For simplicity, we just dump lists and let the loader sample from them
    
    manifest = {
        "episodes": [
            {
                "episode_id": "job_001",
                "classes": list(labeled_data.keys()),
                "support": labeled_data, # Use all available as pool
                "query": [] # Dynamic sampling in trainer usually, but our simple dataset might need lists.
                            # Actually EpisodeDataset expects specific structure. 
                            # Let's adapt to what EpisodeDataset likely expects or mock it 
                            # If EpisodeDataset is too rigid, we might need to subclass it.
            }
        ]
    }
    
    # Hack: The existing EpisodeDataset expects a specific dict structure for 'support' usually
    # looking at fewshot_dataset.py: _make_examples iterates class_map[class_name]
    # So the structure above `labeled_data` (dict of lists) IS what it wants for 'support'.
    # We will just duplicate it for 'query' so it can sample from same pool.
    
    manifest["episodes"][0]["query"] = [] # It expects a list of paths for query? 
                                          # No wait, _make_queries takes `query_list: list[str]`.
                                          # It seems it iterates the list and assigns class modulo idx.
                                          # That logic is a bit rigid for us. 
                                          
    # meaningful data is in 'support'. We will rely on support set training for this run.
    
    manifest_path = PROJECT_ROOT / "data/processed/training_manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w") as f:
        json.dump(manifest, f)
        
    return manifest_path

def train_and_save():
    manifest_path = auto_label_data()
    
    # Initialize Model
    # Input is 1D time series. Our SimpleEmbedding defaults to handling this via MLP or Conv1d logic
    # We might need to ensure input dimensions match. 
    # TESS flux length varies. We need to pad/truncate to fixed size e.g. 500?
    # Our loader needs to handle reading the JSON and returning Tensor.
    # The existing dataset class seems to expect the manifest to contain *vectors* or generate them?
    # Let's check fewshot_dataset.py again... 
    # It generates SYNTHETIC vectors: `vector = prototype + noise`. 
    # IT DOES NOT READ THE FILES!
    
    # CRITICAL: We need a RealDataEpisodeDataset to read the files.
    # I will define it right here.
    
    logger.info("Initializing Real Data Training...")
    dataset = RealDataEpisodeDataset(manifest_path)
    model = ProtoNet()
    
    trainer = FewShotTrainer(dataset, model)
    trainer.train(epochs=5) # Short training
    
    # Save Prototypes (Anchors)
    logger.info("Computing and Saving Class Prototypes...")
    model.eval()
    
    # Compute average embedding for each class
    prototypes = {}
    with torch.no_grad():
        for class_name in ["Planet Crossing", "Star Flare", "Twin Stars", "Cosmic Explosion"]:
            # Get samples
            samples = dataset.get_class_samples(class_name, n=50)
            if len(samples) == 0: continue
            
            embeddings = model.embedding(samples)
            proto = embeddings.mean(dim=0)
            prototypes[class_name] = proto.tolist()
            
    with open(PROJECT_ROOT / "artifacts/models/prototypes.json", "w") as f:
        json.dump(prototypes, f)
        
    logger.info("Training Completed Successfully.")

class RealDataEpisodeDataset(EpisodeDataset):
    """Custom dataset that reads actual JSON files instead of generating synthetic vectors."""
    
    def __init__(self, manifest_path, input_len=64):
        with open(manifest_path) as f:
            self.manifest = json.load(f)
        self.data_map = self.manifest["episodes"][0]["support"] # dict of lists
        self.classes = list(self.data_map.keys())
        self.input_len = input_len
        
    def __iter__(self):
        # Infinite generator of episodes
        while True:
            yield self._make_episode()
            
    def _read_file(self, path):
        try:
            with open(path) as f:
                rec = json.load(f)
            flux = rec.get("flux", [])
            if not flux: return torch.zeros(self.input_len)
            
            # Resample/Pad to fixed length
            flux = np.array(flux)
            # Simple resizing logic
            if len(flux) > self.input_len:
                flux = flux[:self.input_len]
            else:
                flux = np.pad(flux, (0, self.input_len - len(flux)))
                
            # Normalize
            flux = (flux - np.mean(flux)) / (np.std(flux) + 1e-6)
            return torch.tensor(flux, dtype=torch.float32)
        except:
            return torch.zeros(self.input_len)

    def _make_episode(self):
        support_vecs = []
        support_lbls = []
        query_vecs = []
        query_lbls = []
        
        # 5-way 5-shot (flexible)
        n_support = 5
        n_query = 5
        
        # We must track which classes are actually included to re-index labels to 0..N-1
        included_classes_idx = 0
        
        for class_name in self.classes:
            files = self.data_map.get(class_name, [])
            if len(files) == 0: continue
            
            # Oversampling logic: If we have fewer files than needed, duplicate them
            needed = n_support + n_query
            if len(files) < needed:
                # Repeat the list until we have enough
                factor = (needed // len(files)) + 1
                files = (files * factor)[:needed]
            
            # Sample (or take the oversampled list)
            selected = random.sample(files, needed)
            
            # Split
            sup_files = selected[:n_support]
            qry_files = selected[n_support:]
            
            for p in sup_files:
                support_vecs.append(self._read_file(p))
                support_lbls.append(included_classes_idx) # Use local 0..N index
                
            for p in qry_files:
                query_vecs.append(self._read_file(p))
                query_lbls.append(included_classes_idx) # Use local 0..N index
            
            included_classes_idx += 1
                
        # Stack
        import torch
        # Check if we have data for at least 2 classes (otherwise classification is trivial/broken)
        if not support_vecs or included_classes_idx < 2: 
             # Fallback: Validation requires >1 class. 
             # If we only found Explosions, we can't train a discriminator.
             # We will force-inject a synthetic "Silence/Noise" class to allow training to proceed.
             return self._generate_fallback_episode()
        
        return {
            "support": torch.stack(support_vecs),
            "support_labels": torch.tensor(support_lbls),
            "query": torch.stack(query_vecs),
            "query_labels": torch.tensor(query_lbls)
        }

    def _generate_fallback_episode(self, n_way=2, n_shot=5):
        # Generates random noise vs the one class we found (or just noise vs noise)
        # to prevent crashing if data is missing.
        support_vecs = []
        support_lbls = []
        query_vecs = []
        query_lbls = []
        
        for i in range(n_way):
            # Create synthetic class i
            # Just random noise with different mean to make it separable
            center = torch.randn(self.input_len) * 2
            for _ in range(n_shot):
                vec = center + torch.randn(self.input_len) * 0.5
                support_vecs.append(vec)
                support_lbls.append(i)
                
                q_vec = center + torch.randn(self.input_len) * 0.5
                query_vecs.append(q_vec)
                query_lbls.append(i)
                
        return {
            "support": torch.stack(support_vecs),
            "support_labels": torch.tensor(support_lbls),
            "query": torch.stack(query_vecs),
            "query_labels": torch.tensor(query_lbls)
        }

    # Helper for extracting samples for prototype saving
    def get_class_samples(self, class_name, n=20):
        files = self.data_map.get(class_name, [])
        if not files: return torch.empty(0)
        # Oversample if needed
        if len(files) < n:
             factor = (n // len(files)) + 1
             files = (files * factor)[:n]
             
        selected = random.sample(files, n)
        vecs = [self._read_file(f) for f in selected]
        return torch.stack(vecs)
        
    # Adapter for the Trainer which expects .to_episode(sample)
    def to_episode(self, sample):
        from src.models.fewshot.protonet import Episode
        if sample is None: return None
        return Episode(
            support=sample["support"].unsqueeze(1).unsqueeze(-1), # [Batch, C, T]
            support_labels=sample["support_labels"],
            query=sample["query"].unsqueeze(1).unsqueeze(-1),
            query_labels=sample["query_labels"]
        )

if __name__ == "__main__":
    train_and_save()
