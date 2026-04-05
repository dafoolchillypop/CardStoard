#!/bin/bash
# CardStoard Full Docker Cleanup Script
# Completely resets Docker environment: containers, images, volumes, networks, cache

if [ -t 0 ]; then
  echo ""
  echo "⚠️  WARNING: This will remove ALL Docker containers, images, volumes, and networks!"
  echo "    Your database and all stored data will be erased."
  echo ""
  read -p "Press ENTER to continue or Ctrl+C to cancel..."
fi

echo ""
echo "🔻 Stopping all running containers..."
docker stop $(docker ps -aq) 2>/dev/null || true

echo "🗑️  Removing all containers..."
docker rm -f $(docker ps -aq) 2>/dev/null || true

echo "🧩 Removing all images..."
docker rmi -f $(docker images -q) 2>/dev/null || true

echo "📦 Removing volumes (preserving cards data)..."
VOLUMES_TO_REMOVE=$(docker volume ls -q | grep -v 'cards')
if [ -n "$VOLUMES_TO_REMOVE" ]; then
  docker volume rm $VOLUMES_TO_REMOVE 2>/dev/null || true
fi

echo "🌐 Removing unused networks..."
docker network prune -f >/dev/null

echo "🧱 Pruning build cache..."
docker builder prune -af >/dev/null

echo ""
echo "✅ Docker environment fully reset!"
echo "Next steps:"
echo "   1️⃣ docker-compose build --no-cache"
echo "   2️⃣ docker-compose up -d"
echo ""
