#!/usr/bin/env bash
# CardStoard Environment-Aware Deployment Script (v0.9.1)
# Modes:
#   (default)  Full rebuild + validation
#   --deploy   Rebuild only (skip validation)
#   --check    Validate only (skip rebuild/start)
# Environments:
#   --env test | prod   (default: prod)

set -e
START_TIME=$(date +%s)

# --- ANSI colors ---
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[1;34m"
CYAN="\033[1;36m"
BOLD="\033[1m"
NC="\033[0m" # No Color

# --- Defaults ---
DRY_RUN=false
DEPLOY_ONLY=false
ENVIRONMENT="prod"
COMPOSE_FILE="docker-compose.prod.yml"
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="https://cardstoard.com"

# --- Parse flags ---
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --check|-c) DRY_RUN=true ;;
    --deploy|-d) DEPLOY_ONLY=true ;;
    --env)
      shift
      ENVIRONMENT="$1"
      ;;
    *)
      echo -e "${YELLOW}⚠️  Unknown option: $1${NC}"
      ;;
  esac
  shift
done

# --- Apply environment-specific settings ---
if [[ "$ENVIRONMENT" == "test" ]]; then
  COMPOSE_FILE="docker-compose.yml"
  BACKEND_URL="http://localhost:8000"
  FRONTEND_URL="http://localhost:3000"
elif [[ "$ENVIRONMENT" == "prod" ]]; then
  COMPOSE_FILE="docker-compose.prod.yml"
  BACKEND_URL="http://localhost:8000"
  FRONTEND_URL="https://cardstoard.com"
else
  echo -e "${RED}❌ Invalid environment specified. Use 'test' or 'prod'.${NC}"
  exit 1
fi

# --- Logging setup ---
LOG_DIR="./utils/logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/deploy_${ENVIRONMENT}_${TIMESTAMP}.log"
exec > >(tee -a "$LOG_FILE") 2>&1

# --- Header ---
echo ""
echo -e "${BOLD}${BLUE}🚀 CardStoard Deployment (${ENVIRONMENT^^} Environment)${NC}"
echo -e "${BLUE}===========================================${NC}"
echo -e "🕒 Started at: $(date)"
echo -e "📄 Log file: ${YELLOW}$LOG_FILE${NC}\n"

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}🔍 Running in DRY-RUN validation mode — no rebuild or restart will occur.${NC}\n"
elif [ "$DEPLOY_ONLY" = true ]; then
  echo -e "${YELLOW}⚙️  Running in DEPLOY-ONLY mode — rebuild/restart without validation.${NC}\n"
else
  echo -e "${BLUE}🌍 Targeting environment: ${BOLD}${ENVIRONMENT^^}${NC}"
  echo -e "🧾 Compose file: ${YELLOW}${COMPOSE_FILE}${NC}"
  echo -e "🧠 Backend URL: ${YELLOW}${BACKEND_URL}${NC}"
  echo -e "🌐 Frontend URL: ${YELLOW}${FRONTEND_URL}${NC}\n"
fi

# --- Helper: DB check ---
check_database() {
  echo -e "\n${BLUE}🧠 Checking PostgreSQL health...${NC}"
  DB_CONTAINER="stoardb"
  if docker exec "$DB_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is ready and accepting connections.${NC}"
  else
    echo -e "${RED}❌ PostgreSQL health check failed!${NC}"
    docker logs "$DB_CONTAINER" | tail -20
    docker logs "$DB_CONTAINER" > "${LOG_DIR}/db_error_${TIMESTAMP}.log" 2>&1
    exit 1
  fi
}

# --- Helper: Backend check (internal container health) ---
check_backend() {
  echo -e "\n${BLUE}🔍 Checking backend API health (inside container)...${NC}"
  for i in {1..10}; do
    STATUS=$(docker exec stoarback curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health || echo "000")
    if [[ "$STATUS" == "200" ]]; then
      echo -e "${GREEN}✅ Backend API responding correctly inside container (HTTP 200).${NC}"
      return 0
    fi
    echo "⏳ Attempt $i/10: Backend not ready (HTTP $STATUS)"
    sleep 3
  done
  echo -e "${RED}❌ Backend API failed to start after multiple checks.${NC}"
  docker compose -f "$COMPOSE_FILE" logs stoarback | tail -20
  exit 1
}

# --- Helper: Frontend check ---
check_frontend() {
  echo -e "\n${BLUE}🌐 Checking frontend / Nginx routing...${NC}"
  FRONT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
  if [[ "$FRONT_STATUS" =~ ^(200|301|302)$ ]]; then
    echo -e "${GREEN}✅ Frontend responding correctly (HTTP $FRONT_STATUS).${NC}"
  else
    echo -e "${RED}❌ Frontend check failed (HTTP $FRONT_STATUS)${NC}"
    docker compose -f "$COMPOSE_FILE" logs nginx | tail -20
    exit 1
  fi
}

# --- DRY-RUN MODE ---
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}🏁 Performing validation checks only...${NC}"
  check_database
  check_backend
  check_frontend
  echo ""
  echo -e "${GREEN}✅ All systems operational. (Dry run complete)${NC}"
  echo -e "🕒 Completed at: $(date)"
  echo -e "📄 Log saved to: ${YELLOW}$LOG_FILE${NC}\n"
  exit 0
fi

# --- 1️⃣ Cleanup ---
echo -e "\n${BLUE}🧹 Cleaning Docker environment...${NC}"
./utils/docker_cleanup.sh

# --- 2️⃣ Rebuild ---
echo -e "\n${BLUE}🏗️  Building containers using ${COMPOSE_FILE}...${NC}"
docker compose -f "$COMPOSE_FILE" build --no-cache

# --- 3️⃣ Start containers ---
echo -e "\n${BLUE}🔼 Starting containers...${NC}"
docker compose -f "$COMPOSE_FILE" up -d --build

# --- 4️⃣ Show container summary ---
echo -e "\n${BLUE}🐳 Current Docker containers:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# --- 5️⃣ Wait for startup ---
echo -e "\n${YELLOW}⏳ Waiting for services to initialize (10 seconds)...${NC}"
sleep 10

# --- 5b️⃣ Run DB migrations ---
echo -e "\n${BLUE}🗄️  Running database migrations...${NC}"
docker exec stoarback python migrate.py
echo -e "${GREEN}✅ Migrations complete.${NC}"

# --- DEPLOY-ONLY MODE ---
if [ "$DEPLOY_ONLY" = true ]; then
  echo -e "\n${GREEN}✅ Deploy-only mode complete — skipping validation checks.${NC}"
  echo -e "🕒 Completed at: $(date)"
  echo -e "📄 Log saved to: ${YELLOW}$LOG_FILE${NC}\n"
  exit 0
fi

# --- 6️⃣ Validation ---
check_database
check_backend
check_frontend

# ===============================
# ✅ FINAL SUMMARY (End Banner)
# ===============================
echo -e "\n"
END_TIME=$(date +%s)
RUNTIME=$((END_TIME - START_TIME))
MINUTES=$((RUNTIME / 60))
SECONDS=$((RUNTIME % 60))
VERSION=$(git describe --tags --always 2>/dev/null || echo "unknown")

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ CardStoard ${CYAN}${VERSION}${NC} deployed successfully!"
echo -e "${CYAN}🔍 Validated:${NC} Backend, Frontend, Database"
echo -e "${CYAN}🕒 Total runtime:${NC} ${MINUTES}m ${SECONDS}s"
echo -e "${CYAN}📦 Environment:${NC} ${ENVIRONMENT^^}"
echo -e "${CYAN}📄 Log file:${NC} ${LOG_FILE}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
