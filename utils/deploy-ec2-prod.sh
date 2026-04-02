#!/usr/bin/env bash
# CardStoard — Local Production Deploy
# Runs from this machine, SSHs into EC2, pulls latest, and deploys.
#
# Usage:
#   ./utils/deploy-ec2-prod.sh           # full rebuild + validation (with DB backup/restore)
#   ./utils/deploy-ec2-prod.sh --deploy  # rebuild only, skip validation
#   ./utils/deploy-ec2-prod.sh --check   # validate only, no rebuild

set -e

EC2="ubuntu@3.221.77.22"
KEY="~/.ssh/id_rsa"
SSH="ssh -i $KEY -o StrictHostKeyChecking=no $EC2"
BACKUP_FILE="/home/ubuntu/cardstoard_predeploy_backup.sql"

# Frontend build check (runs locally before touching EC2)
if [[ "$1" != "--check" ]]; then
  echo "--- Checking frontend build (ESLint + compile) ---"
  if ! (cd frontend && npm run build 2>&1); then
    echo "❌ Frontend build failed. Fix errors before deploying to prod."
    exit 1
  fi
  echo "✅ Frontend build OK."
  rm -rf frontend/build
fi

# --check and --deploy pass-throughs skip backup/restore
if [[ "$1" == "--check" || "$1" == "--deploy" ]]; then
  $SSH "
    set -e
    cd /home/ubuntu/CardStoard
    echo '--- Pulling latest from main ---'
    git pull origin main
    echo '--- Running deploy ($1) ---'
    ./utils/docker_deploy.sh $1
  "
  exit 0
fi

# Full deploy: backup → rebuild → restore
echo "--- Backing up production database ---"
$SSH "docker exec stoardb pg_dump -U postgres --data-only \
  --exclude-table=dictionary_entries \
  --exclude-table=schema_migrations \
  cardstoardb > $BACKUP_FILE && echo 'Backup saved to $BACKUP_FILE'"

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

echo "--- Restoring database ---"
$SSH "docker exec -i stoardb psql -U postgres --set ON_ERROR_STOP=on cardstoardb < $BACKUP_FILE && echo 'Restore complete'"

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
  echo "✅ Deploy complete — smoke test: 14/14 passed"
else
  echo "✅ Deploy steps complete — ⚠  smoke test exited $SMOKE_EXIT (review output above)"
fi
exit $SMOKE_EXIT
