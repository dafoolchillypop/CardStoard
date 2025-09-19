# backend/Dockerfile

# Use official Python slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /code

# Install system dependencies for dockerize and other tools
RUN apt-get update && apt-get install && apt-get install wget -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install dockerize
ENV DOCKERIZE_VERSION v0.7.0
RUN wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && tar -C /usr/local/bin -xzvf dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && rm dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz

# Copy Python dependencies
COPY requirements.txt .

# Install Python dependencies, including python-multipart
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create photo upload dir 
RUN mkdir -p /code/app/static/cards

# Default command: wait for DB, then start Uvicorn
CMD ["sh", "-c", "dockerize -wait tcp://stoardb:5432 -timeout 60s uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]