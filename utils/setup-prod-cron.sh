#!/usr/bin/env bash
# CardStoard — Install Automated Backup Cron on EC2
# Run this once from your local machine to activate scheduled backups.
#
# Usage:
#   ./utils/setup-prod-cron.sh           # daily at 2am (default)
#   ./utils/setup-prod-cron.sh daily     # daily at 2am
#   ./utils/setup-prod-cron.sh hourly    # every hour

EC2="ubuntu@3.221.77.22"
KEY="~/.ssh/id_rsa"
MODE=${1:-daily}

if [[ "$MODE" == "hourly" ]]; then
  CRON_SCHEDULE="0 * * * *"
else
  CRON_SCHEDULE="0 2 * * *"
fi

echo "Installing $MODE backup cron on $EC2..."

ssh -i "$KEY" -o StrictHostKeyChecking=no "$EC2" "
  chmod +x /home/ubuntu/CardStoard/utils/backup-prod.sh
  (crontab -l 2>/dev/null | grep -v 'CardStoard.*backup-prod'; \
   echo '$CRON_SCHEDULE /home/ubuntu/CardStoard/utils/backup-prod.sh >> /home/ubuntu/backups/backup.log 2>&1') | crontab -
  echo 'Cron installed ($MODE): $CRON_SCHEDULE'
  echo 'Active CardStoard cron entries:'
  crontab -l | grep CardStoard
"
