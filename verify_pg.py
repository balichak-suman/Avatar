import sys
from pathlib import Path
import os
from datetime import datetime

# Ensure src/ is importable
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Manually load .env
env_path = PROJECT_ROOT / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                parts = line.strip().split("=", 1)
                if len(parts) == 2:
                    os.environ[parts[0]] = parts[1]

from src.serving.database import SessionLocal, User, engine

def verify_connection():
    print(f"--- DATABASE VERIFICATION ---")
    print(f"Target: {engine.url}")
    
    db = SessionLocal()
    try:
        # 1. Create a unique verification user
        test_username = f"verify_{datetime.now().strftime('%M%S')}"
        print(f"Attempting to insert test user: {test_username}")
        
        new_user = User(
            username=test_username,
            email=f"{test_username}@example.com",
            hashed_password="not_a_real_password",
            role="Verification Bot"
        )
        db.add(new_user)
        db.commit()
        print("✅ Insert successful!")
        
        # 2. Query it back
        queried_user = db.query(User).filter(User.username == test_username).first()
        if queried_user:
            print(f"✅ Query successful! Found user: {queried_user.username}")
            print(f"✅ ID: {queried_user.id}")
            print(f"✅ Created At: {queried_user.created_at}")
        else:
            print("❌ Query failed: User not found after insert.")
            
    except Exception as e:
        print(f"❌ DATABASE ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_connection()
