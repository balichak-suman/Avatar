# Project Demo Script

Use this script to demonstrate your **Adaptive MLOps–Driven Few-Shot Learning Framework**.

## 1. The "Wow" Factor: Visual Dashboard
**Goal:** Impress the audience immediately with the cinematic interface.

**Action:**
1.  Open [http://localhost:8081/login.html](http://localhost:8081/login.html).
2.  Show the **Interactive 3D Astronaut**:
    *   Type a username -> Astronaut looks at the box.
    *   Type a password -> Astronaut covers eyes.
    *   Enter `admin` and login.
3.  On the Dashboard, show the **Solar System Visualization**:
    *   Point out the realistic textures and lighting.
    *   Click **🚀 Explore Solar System**.
    *   Fly to Earth and show the **Real-Time Day/Night Cycle** (synchronized with actual time).

**Talking Point:**
"We start with a fully immersive, 3D interface. This isn't just a static dashboard; it's a real-time window into our solar system, synchronized with live astronomical data."

## 2. The "Hook": Real-Time Data Ingestion
**Goal:** Show that you are fetching *real* astronomical data, not just using a static CSV.

**Action:**
Run the verification script to prove live data connection.
```bash
python3 scripts/verify_ingestion.py
```
**Talking Point:**
"Under the hood, my system connects to three major astronomical data centers: ZTF, TESS, and MAST. As you can see, we are fetching the latest observations in real-time right now."

## 3. The "Brain": Model Training
**Goal:** Show that the model is actually learning.

**Action:**
Show the training logs (output of `dvc repro` or MLflow if configured).
**Talking Point:**
"The system automatically processes this raw data into features and trains a Prototypical Network—a state-of-the-art Few-Shot Learning model designed to classify rare celestial events with very little data."

## 4. The "Product": Live Inference API
**Goal:** Show that this is a deployable product, not just a notebook.

**Action:**
1.  Ensure Docker is running: `docker-compose up -d`
2.  Open your browser to: **[http://localhost:8000/docs](http://localhost:8000/docs)**
3.  Click **POST /predict** -> **Try it out**.
4.  Enter some dummy data (or use the default) and click **Execute**.

**Talking Point:**
"Finally, the model is containerized and served via a high-performance API. Here you can see it accepting feature vectors and returning 64-dimensional embeddings in milliseconds, ready for downstream classification."

## 5. The Architecture (Optional)
**Goal:** Show off your engineering skills.

**Action:**
Show the `dvc.yaml` file or the `docker-compose.yaml` file.
**Talking Point:**
"The entire pipeline is reproducible and version-controlled using DVC and Docker, ensuring that anyone can deploy this system with a single command."
