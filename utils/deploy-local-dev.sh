#!/usr/bin/env bash
# CardStoard — Local Dev Deploy
# Rebuilds dev containers while PRESERVING the local database.
#
# Usage:
#   ./utils/deploy-local-dev.sh              # full rebuild + smoke test
#   ./utils/deploy-local-dev.sh --deploy     # rebuild only, skip smoke test
#   ./utils/deploy-local-dev.sh --check      # validate only, no rebuild
#   ./utils/deploy-local-dev.sh --functional # rebuild + smoke test + functional test

set -e

COMPOSE_FILE="docker-compose.yml"
LOG_DIR="./utils/logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/deploy_local_${TIMESTAMP}.log"
exec > >(tee -a "$LOG_FILE") 2>&1

# Source local env vars if available
if [[ -f ~/.cardstoard.env ]]; then
  source ~/.cardstoard.env
fi

FLAG="${1:-}"

run_smoke_test() {
  echo ""
  echo "--- Running local smoke test ---"
  ./utils/smoke_test.sh --local
}

run_functional_test() {
  echo ""
  echo "--- Running local functional test ---"
  python3 utils/functional_test.py --local
}

check_backend() {
  echo "⏳ Waiting for backend..."
  for i in {1..15}; do
    STATUS=$(docker exec stoarback curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
    if [[ "$STATUS" == "200" ]]; then
      echo "✅ Backend ready."
      return 0
    fi
    echo "   Attempt $i/15 (HTTP $STATUS)..."
    sleep 3
  done
  echo "❌ Backend failed to start."
  docker compose -f "$COMPOSE_FILE" logs backend | tail -20
  exit 1
}

check_frontend_build() {
  echo ""
  echo "--- Checking frontend build (ESLint + compile) ---"
  if ! command -v npm &>/dev/null; then
    echo "⚠️  npm not found locally — skipping frontend build check."
    echo "   Install Node.js locally to enable pre-deploy ESLint validation."
    return 0
  fi
  if ! (cd frontend && npm run build 2>&1); then
    echo "❌ Frontend build failed. Fix errors before deploying."
    exit 1
  fi
  echo "✅ Frontend build OK."
  rm -rf frontend/build
}

rebuild() {
  echo ""
  echo "🚀 CardStoard Local Dev Deploy"
  echo "   Compose: $COMPOSE_FILE"
  echo "   DB:      preserved (volumes not wiped)"
  echo ""

  check_frontend_build

  echo "--- Stopping containers (keeping volumes) ---"
  docker compose -f "$COMPOSE_FILE" down --rmi all 2>/dev/null || true

  echo "--- Pruning build cache ---"
  docker builder prune -af >/dev/null

  echo "--- Building containers ---"
  docker compose -f "$COMPOSE_FILE" build --no-cache

  echo "--- Starting containers ---"
  docker compose -f "$COMPOSE_FILE" up -d

  echo ""
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

  check_backend

  echo "--- Running migrations ---"
  docker exec stoarback python migrate.py
  echo "✅ Migrations complete."
}

case "$FLAG" in
  --check)
    echo "--- Validating local dev environment ---"
    ./utils/docker_deploy.sh --check --env test
    ;;
  --deploy)
    rebuild
    echo ""
    echo "✅ Local dev deploy complete (smoke test skipped)."
    echo "📄 Log: $LOG_FILE"
    ;;
  "")
    rebuild
    run_smoke_test
    echo ""
    echo "✅ Local dev deploy complete."
    echo "📄 Log: $LOG_FILE"
    ;;
  --functional)
    rebuild
    run_smoke_test
    run_functional_test
    echo ""
    echo "✅ Local dev deploy complete (smoke + functional tests)."
    echo "📄 Log: $LOG_FILE"
    ;;
  *)
    echo "Usage: $0 [--deploy | --check | --functional]"
    exit 1
    ;;
esac
