# How to Train Anywhere (Windows, Mac, Linux)

This guide explains how to move this project to another machine (like a Windows laptop), train the model, and bring the results back.

## Prerequisites

1.  **Install Docker Desktop**:
    *   **Windows**: [Download here](https://docs.docker.com/desktop/install/windows-install/)
    *   **Mac**: [Download here](https://docs.docker.com/desktop/install/mac-install/)
2.  **Copy the Project**:
    *   Copy the entire `avatar` folder to your new machine.

## Step 1: Build the Environment

Open a terminal (Command Prompt or PowerShell on Windows) inside the `avatar` folder and run:

```bash
docker-compose build
```

This will create a virtual computer (container) with all the necessary Python libraries installed. You don't need to install Python or PyTorch on your host machine!

## Step 2: Run Training

To start the training process inside the container, run:

```bash
docker-compose run --rm trainer
```

**What happens:**
1.  Docker starts the container.
2.  It mounts your local folder so it can read your data and write the model.
3.  It runs the training script.
4.  It saves the trained model to `artifacts/models/final_model.pt`.

## Step 3: Bring the Model Back

Once the command finishes, you will see a new file:
`artifacts/models/final_model.pt`

You can now copy this file (or the whole folder) back to your original machine.

## Advanced: Running the Full Pipeline (Ingestion + Training)

If you want to run the full DVC pipeline (downloading new data and training) inside Docker, run:

```bash
docker-compose run --rm trainer dvc repro
```

*Note: Ensure you have your `.env` file with API tokens if you plan to ingest new data.*
