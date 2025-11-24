# backend/Dockerfile

# Use official Python slim image (multi-arch, works on ARM and x86)
FROM python:3.11-slim

# Set working directory
WORKDIR /code

# Install system dependencies: build tools, wget/curl, and OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    curl \
    build-essential \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# --- REMOVED dockerize (amd64-only, breaks on ARM) ---
# ENV DOCKERIZE_VERSION v0.7.0
# RUN wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
#     && tar -C /usr/local/bin -xzvf dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
#     && rm dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz

# Copy Python dependencies
COPY requirements.txt .

# Install Python dependencies (includes python-multipart for uploads)
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Ensure upload dir exists
RUN mkdir -p /code/app/static/cards

# Start Uvicorn in dev mode with reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
