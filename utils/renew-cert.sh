#!/usr/bin/env bash
# CardStoard — Let's Encrypt Certificate Renewal
#
# Stops the frontend container (frees port 80 for standalone challenge),
# renews the cert, then restarts the frontend.
#
# Run manually:  ./utils/renew-cert.sh
# Cron:          0 3 * * * /home/ubuntu/CardStoard/utils/renew-cert.sh >> /var/log/cardstoard-cert-renew.log 2>&1

set -euo pipefail

COMPOSE="/usr/bin/docker compose -f /home/ubuntu/CardStoard/docker-compose.prod.yml"
CERTBOT="/usr/bin/certbot"
LOG_TAG="[cardstoard-cert-renew]"

echo "$LOG_TAG $(date) — starting renewal check"

echo "$LOG_TAG stopping frontend container"
$COMPOSE stop frontend

echo "$LOG_TAG running certbot renew"
$CERTBOT renew --standalone --non-interactive

echo "$LOG_TAG starting frontend container"
$COMPOSE start frontend

echo "$LOG_TAG done"
