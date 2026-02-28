#!/usr/bin/env bash
# CardStoard — Local Dev Deploy
# Runs locally, rebuilds dev containers with hot-reload volumes.
#
# Usage:
#   ./utils/deploy-local-dev.sh           # full rebuild + smoke test
#   ./utils/deploy-local-dev.sh --deploy  # rebuild only, skip smoke test
#   ./utils/deploy-local-dev.sh --check   # validate only, no rebuild

set -e

# Source local env vars if available
if [[ -f ~/.cardstoard.env ]]; then
  source ~/.cardstoard.env
fi

FLAG="${1:-}"

case "$FLAG" in
  --check)
    echo "--- Validating local dev environment ---"
    ./utils/docker_deploy.sh --check --env test
    ;;
  --deploy)
    echo "--- Rebuilding local dev containers ---"
    ./utils/docker_deploy.sh --deploy --env test
    ;;
  "")
    echo "--- Rebuilding local dev containers ---"
    ./utils/docker_deploy.sh --env test

    echo "--- Running local smoke test ---"
    ./utils/smoke_test.sh --local
    ;;
  *)
    echo "Usage: $0 [--deploy | --check]"
    exit 1
    ;;
esac

echo "--- Local dev deploy complete ---"
