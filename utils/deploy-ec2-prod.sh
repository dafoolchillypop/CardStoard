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

echo "--- Deploy complete ---"
