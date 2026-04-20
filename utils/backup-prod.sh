#!/usr/bin/env bash
# CardStoard — Automated Production Backup
# Designed to run on EC2 via cron. Backs up DB, rotates old files.
#
# Cron install (via setup-prod-cron.sh):
#   Daily at 2am:   0 2 * * * /home/ubuntu/CardStoard/utils/backup-prod.sh >> /home/ubuntu/backups/backup.log 2>&1
#   Hourly:         0 * * * * /home/ubuntu/CardStoard/utils/backup-prod.sh >> /home/ubuntu/backups/backup.log 2>&1

set -e

KEEP=7
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/cardstoard_auto_${TIMESTAMP}.sql"
LATEST_LINK="$BACKUP_DIR/latest.sql"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] backup-prod:"

mkdir -p "$BACKUP_DIR"

if ! docker ps --filter name=stoardb --filter status=running -q | grep -q .; then
  echo "$LOG_PREFIX ERROR: stoardb not running — skipped"
  exit 1
fi

docker exec stoardb pg_dump -U postgres --data-only --clean \
  --exclude-table=schema_migrations \
  cardstoardb > "$BACKUP_FILE"

BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || echo 0)
if [ "$BACKUP_SIZE" -lt 10000 ]; then
  rm -f "$BACKUP_FILE"
  echo "$LOG_PREFIX ERROR: too small (${BACKUP_SIZE}B) — removed"
  exit 1
fi

ln -sf "$BACKUP_FILE" "$LATEST_LINK"
ls -t "$BACKUP_DIR"/cardstoard_auto_*.sql 2>/dev/null | tail -n +$((KEEP + 1)) | xargs rm -f 2>/dev/null || true
echo "$LOG_PREFIX OK: ${BACKUP_FILE} (${BACKUP_SIZE}B), kept last ${KEEP}"
