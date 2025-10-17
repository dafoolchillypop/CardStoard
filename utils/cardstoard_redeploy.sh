#!/bin/bash
set -euo pipefail

# --------- config ---------
APP_DIR="/home/ubuntu/CardStoard"
COMPOSE_FILE="${APP_DIR}/docker-compose.prod.yml"
LOG="/var/log/cardstoard_redeploy.log"
# --------------------------

{
  echo "[$(date -u)] === Nightly redeploy start ==="
  cd "$APP_DIR"

  # Ensure repo is clean before pulling (avoid clobbering local work)
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Repo has local changes; skipping git pull. (Commit or stash to enable nightly pulls.)"
  else
    echo "Fetching latest from origin..."
    git fetch --all --prune
    echo "Pulling with rebase/autostash..."
    git pull --rebase --autostash
  fi

  echo "Pulling base images (if newer)..."
  docker-compose -f "$COMPOSE_FILE" pull || true

  echo "Building images (may be no-op if unchanged)..."
  docker-compose -f "$COMPOSE_FILE" build --pull

  echo "Recreating containers..."
  docker-compose -f "$COMPOSE_FILE" up -d

  echo "Pruning dangling images..."
  docker image prune -f

  echo "Disk space after deploy:"
  df -h /

  echo "[$(date -u)] === Nightly redeploy complete ==="
} >> "$LOG" 2>&1
