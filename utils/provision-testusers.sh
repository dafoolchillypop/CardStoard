#!/usr/bin/env bash
# CardStoard — Provision test users
#
# Creates 5 named test users with realistic card data and valuation history
# for UI/QA testing.
#
# Usage:
#   ./utils/provision-testusers.sh [--prod] [--reset]
#
#   --prod    Target production (EC2) instead of local dev containers
#   --reset   Hard-delete matching test users before seeding (clean re-run)
#
# Local dev seeds @cardstoard.dev users (default).
# Prod seeds @cardstoard.prd users.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY_SRC="${SCRIPT_DIR}/provision-testusers.py"

BACKEND_CONTAINER="stoarback"
REMOTE_SCRIPT="/tmp/provision_testusers.py"

EC2_HOST="ubuntu@3.221.77.22"
EC2_KEY="$HOME/.ssh/id_rsa"

# ---------------------------------------------------------------------------
# Parse args — collect --prod and --reset, pass the rest to Python script
# ---------------------------------------------------------------------------
PROD=false
RESET=false
PY_ARGS=()

for arg in "$@"; do
    case "$arg" in
        --prod)  PROD=true  ;;
        --reset) RESET=true ;;
        *)       PY_ARGS+=("$arg") ;;
    esac
done

if $PROD; then
    PY_ARGS+=("--prod")
fi
if $RESET; then
    PY_ARGS+=("--reset")
fi

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
if $PROD; then
    echo "--- Provisioning test users on PRODUCTION (EC2) ---"
    echo "Target: $EC2_HOST — @cardstoard.prd users"

    echo "Copying script to EC2 ..."
    scp -i "$EC2_KEY" -q "$PY_SRC" "${EC2_HOST}:${REMOTE_SCRIPT}"

    echo "Running inside backend container ..."
    # shellcheck disable=SC2029
    ssh -i "$EC2_KEY" "$EC2_HOST" \
        "docker exec ${BACKEND_CONTAINER} python3 ${REMOTE_SCRIPT} ${PY_ARGS[*]+"${PY_ARGS[*]}"}"

else
    echo "--- Provisioning test users on LOCAL DEV ---"
    echo "Target: ${BACKEND_CONTAINER} container — @cardstoard.dev users"

    echo "Copying script into container ..."
    docker cp "$PY_SRC" "${BACKEND_CONTAINER}:${REMOTE_SCRIPT}"

    echo "Running ..."
    docker exec "${BACKEND_CONTAINER}" python3 "${REMOTE_SCRIPT}" ${PY_ARGS[@]+"${PY_ARGS[@]}"}
fi
