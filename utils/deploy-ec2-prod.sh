#!/usr/bin/env bash
# CardStoard — Production Deploy Script
# Runs from local machine, SSHs into EC2, pulls latest, and deploys.
#
# Usage:
#   ./utils/deploy-ec2-prod.sh           # full rebuild + validation (with DB backup/restore)
#   ./utils/deploy-ec2-prod.sh --check   # validate only, no rebuild

set -e

EC2="ubuntu@3.221.77.22"
KEY="~/.ssh/id_rsa"
SSH="ssh -i $KEY -o StrictHostKeyChecking=no $EC2"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
BACKUP_FILE="$BACKUP_DIR/cardstoard_${TIMESTAMP}.sql"
LATEST_LINK="$BACKUP_DIR/latest.sql"

# --- Branch gate (runs first, before any SSH) ---
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" == "main" ]]; then
  echo "❌ BLOCKED: Cannot deploy directly from main branch."
  echo "   Workflow: create feature branch → develop → merge to main → deploy."
  exit 1
fi

# --- Block --deploy mode (too dangerous on prod — skips backup) ---
if [[ "$1" == "--deploy" ]]; then
  echo "❌ --deploy is not allowed in the prod deploy script (skips backup — no data protection)."
  echo "   Use the full deploy (no flags) or --check for validation only."
  exit 1
fi

# --- check pass-through (no backup/restore needed) ---
if [[ "$1" == "--check" ]]; then
  $SSH "
    set -e
    cd /home/ubuntu/CardStoard
    echo '--- Pulling latest from main ---'
    git pull origin main
    echo '--- Running validation (--check) ---'
    ./utils/docker_deploy.sh --check
  "
  exit 0
fi

# --- Frontend build check (runs locally before touching EC2) ---
echo "--- Checking frontend build (ESLint + compile) ---"
if ! command -v npm &>/dev/null; then
  echo "⚠️  npm not found locally — skipping frontend build check."
  echo "   Install Node.js locally to enable pre-deploy ESLint validation."
elif ! (cd frontend && npm run build 2>&1); then
  echo "❌ Frontend build failed. Fix errors before deploying to prod."
  exit 1
else
  echo "✅ Frontend build OK."
  rm -rf frontend/build
fi

# --- Verify DB container is running before attempting backup ---
echo "--- Checking DB container is running before backup ---"
if ! $SSH "docker ps --filter name=stoardb --filter status=running -q | grep -q ."; then
  echo "❌ DB container 'stoardb' is not running — cannot take safe backup. Aborting."
  echo "   A running database is required before any production deployment."
  exit 1
fi

# --- Full deploy: backup → rebuild → restore ---
echo "--- Backing up production database ---"
$SSH "
  set -e
  mkdir -p $BACKUP_DIR

  docker exec stoardb pg_dump -U postgres --data-only \
    --exclude-table=schema_migrations \
    cardstoardb > $BACKUP_FILE

  BACKUP_SIZE=\$(stat -c%s $BACKUP_FILE 2>/dev/null || echo 0)
  if [ \$BACKUP_SIZE -lt 10000 ]; then
    rm -f $BACKUP_FILE
    echo 'ERROR: Backup too small ('\$BACKUP_SIZE' bytes) — likely empty or corrupt'
    exit 1
  fi

  ln -sf $BACKUP_FILE $LATEST_LINK
  ls -t $BACKUP_DIR/cardstoard_*.sql 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
  echo \"✅ Backup saved: $BACKUP_FILE (\${BACKUP_SIZE} bytes)\"
"

echo "--- Pulling latest from main ---"
$SSH "cd /home/ubuntu/CardStoard && git pull origin main"

echo "--- Running full deploy ---"
$SSH "cd /home/ubuntu/CardStoard && ./utils/docker_deploy.sh"

echo "--- Waiting for database to be ready ---"
$SSH "
  for i in \$(seq 1 20); do
    docker exec stoardb pg_isready -U postgres > /dev/null 2>&1 && echo 'DB ready' && break
    echo \"Waiting... (\$i/20)\"
    sleep 3
  done
"

echo "--- Clearing all tables before restore (ensures clean slate) ---"
$SSH "docker exec stoardb psql -U postgres cardstoardb -c \
  'TRUNCATE users CASCADE; TRUNCATE dictionary_entries RESTART IDENTITY; TRUNCATE sets CASCADE;'"

echo "--- Restoring database ---"
$SSH "docker exec -i stoardb psql -U postgres --set ON_ERROR_STOP=on cardstoardb < $BACKUP_FILE && echo 'Restore complete'"

echo "--- Seeding reference data (sets) ---"
$SSH "docker exec stoarback python seed_sets.py"

echo "--- Verifying restore ---"
CARD_COUNT=$($SSH "docker exec stoardb psql -U postgres cardstoardb -t -c 'SELECT COUNT(*) FROM cards;' | tr -d ' \n'")
echo "Card count after restore: $CARD_COUNT"

echo "--- Provisioning smoke test user ---"
$SSH "cd /home/ubuntu/CardStoard && ./utils/provision-smoketest.sh"

echo "--- Running smoke test ---"
SMOKE_EXIT=0
$SSH "cd /home/ubuntu/CardStoard && source ~/.cardstoard.env && ./utils/smoke_test.sh" \
  || SMOKE_EXIT=$?

echo ""
echo "--- Deploy summary ---"
if [[ $SMOKE_EXIT -eq 0 ]]; then
  echo "✅ Deploy complete — smoke test passed"
else
  echo "❌ Deploy steps complete — smoke test FAILED (exit $SMOKE_EXIT — review output above)"
fi
exit $SMOKE_EXIT
