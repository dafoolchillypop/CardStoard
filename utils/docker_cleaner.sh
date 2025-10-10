#!/bin/bash
echo "[$(date)] Starting Docker cleanup..." >> /var/log/docker_cleanup.log

#Remove stopped/orphaned containers
docker container prune -f >> /var/log/docker_cleanup.log 2>&1

#Remove orphaned images
docker image prune -f >> /var/log/docker_cleanup.log 2>&1

#Remove orphaned volumes
docker volume prune -f >> /var/log/docker_cleanup.log 2>&1

#Removed orphaned networks
docker network prune -f >> /var/log/docker_cleanup.log 2>&1

#Record current disk state
df -h / >> /var/log/docker_cleanup.log

echo "[$(date)] Cleanup complete." >> /var/log/docker_cleanup.log
