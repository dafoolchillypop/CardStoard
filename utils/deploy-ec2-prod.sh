#!/usr/bin/env bash
# CardStoard — Local Production Deploy
# Runs from this machine, SSHs into EC2, pulls latest, and deploys.
#
# Usage:
#   ./utils/deploy-prod.sh           # full rebuild + validation
#   ./utils/deploy-prod.sh --deploy  # rebuild only, skip validation
#   ./utils/deploy-prod.sh --check   # validate only, no rebuild

ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ubuntu@3.221.77.22 "
  set -e
  cd /home/ubuntu/CardStoard
  echo '--- Pulling latest from main ---'
  git pull origin main
  echo '--- Running deploy ---'
  ./utils/docker_deploy.sh $@
"
