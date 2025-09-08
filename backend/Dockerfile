# backend/Dockerfile

# Use official Python slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /code

# Install system dependencies for dockerize and other tools
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install dockerize
RUN curl -L https://github.com/jwilder/dockerize/releases/download/v0.9.2/dockerize-linux-amd64-v0.9.2.tar.gz \
    | tar -C /usr/local/bin -xz

# Copy Python dependencies
COPY requirements.txt .

# Install Python dependencies, including python-multipart
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Default command: wait for DB, then start Uvicorn
CMD ["sh", "-c", "dockerize -wait tcp://db:5432 -timeout 60s uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]