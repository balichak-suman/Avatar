# Testing Guide

This guide outlines how to test the various components of the Astronomy Few-Shot Learning project.

## 1. End-to-End Pipeline Test (Data -> Model)

The entire data processing and training pipeline is managed by DVC. To verify that the system can ingest data, generate features, and train the model from scratch:

```bash
# Run the full pipeline
dvc repro
```

**What this does:**
1.  **Ingests** data from ZTF, TESS, and MAST (limit 25 records each).
2.  **Builds features** for all datasets.
3.  **Trains** the Prototypical Network model.
4.  **Saves** the model to `artifacts/models/final_model.pt`.

## 2. API Testing (Local)

To test the model serving API locally without Docker:

1.  **Start the API server:**
    ```bash
    ./.venv/bin/uvicorn src.serving.api:app --reload
    ```

2.  **Send a test request:**
    You can use `curl` or a Python script.

    **Using curl:**
    ```bash
    curl -X POST http://localhost:8000/predict \
         -H "Content-Type: application/json" \
         -d '{"features": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]}'
    ```

    **Using Python:**
    Create a file `test_request.py`:
    ```python
    import requests
    
    response = requests.post(
        "http://localhost:8000/predict",
        json={"features": [0.1] * 10}
    )
    print(response.json())
    ```

## 3. Docker Testing

To test the containerized application:

1.  **Build and Run:**
    ```bash
    docker-compose up --build
    ```

2.  **Test the Endpoint:**
    The API will be available at `http://localhost:8000`. Use the same `curl` or Python commands as above.

## 4. Unit Tests

(If you add unit tests in the future, run them using pytest)
```bash
./.venv/bin/pytest
```
