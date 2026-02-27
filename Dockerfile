# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container at /app
# Create data directory for persistent storage
RUN mkdir -p /app/data

# Copy everything into the container
COPY . .

# Install dependencies from requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Expose port (Render will override this, but good for documentation)
EXPOSE 8000

# Set PYTHONPATH to the current working directory (/app)
ENV PYTHONPATH=/app

# Use shell form of CMD to allow ${PORT} expansion automatically
CMD uvicorn src.serving.api:app --host 0.0.0.0 --port ${PORT:-8000}
