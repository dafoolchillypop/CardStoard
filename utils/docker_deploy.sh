#!/bin/bash
# CardStoard Production Deployment Script (v0.8)
# Full rebuild + startup + health validation

set -e

echo ""
echo "🚀 Deploying CardStoard (production mode)..."
echo "==========================================="

# --- 1️⃣ Clean up old environment ---
./utils/docker_cleanup.sh

# --- 2️⃣ Rebuild containers from scratch ---
echo ""
echo "🏗️  Building containers (no cache)..."
docker-compose -f docker-compose.prod.yml build --no-cache

# --- 3️⃣ Start containers in detached mode ---
echo ""
echo "🔼 Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

# --- 4️⃣ Display container status ---
echo ""
echo "🐳 Current Docker containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# --- 5️⃣ Wait a bit for services to come online ---
echo ""
echo "⏳ Waiting for services to initialize (10 seconds)..."
sleep 10

# --- 6️⃣ Validate backend API health ---
echo ""
echo "🔍 Checking backend health..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/cards/count || echo "000")

if [[ "$BACKEND_STATUS" == "200" ]]; then
  echo "✅ Backend API responding correctly (HTTP 200)."
else
  echo "❌ Backend API health check failed (HTTP $BACKEND_STATUS)"
  docker-compose -f docker-compose.prod.yml logs stoarback | tail -20
  exit 1
fi

# --- 7️⃣ Validate Nginx reverse proxy ---
echo ""
echo "🌐 Checking Nginx routing..."
NGINX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://cardstoard.com || echo "000")

if [[ "$NGINX_STATUS" == "200" || "$NGINX_STATUS" == "301" || "$NGINX_STATUS" == "302" ]]; then
  echo "✅ Nginx / frontend responding correctly (HTTP $NGINX_STATUS)."
else
  echo "❌ Nginx or frontend check failed (HTTP $NGINX_STATUS)"
  docker-compose -f docker-compose.prod.yml logs nginx | tail -20
  exit 1
fi

# --- 8️⃣ Optional: summary of resources ---
echo ""
echo "📊 Deployment Summary"
echo "-------------------------------------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo ""
echo "🎉 Deployment complete and validated!"
echo "CardStoard v0.8 is live at: https://cardstoard.com"
