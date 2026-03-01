#!/usr/bin/env bash
# CardStoard Post-Deploy Smoke Test
#
# Usage:
#   ./utils/smoke_test.sh           # prod (https://cardstoard.com)
#   ./utils/smoke_test.sh --local   # local dev (http://localhost:8000)
#
# Credentials: set CARDSTOARD_EMAIL / CARDSTOARD_PASSWORD env vars,
#              or add them to ~/.cardstoard.env (sourced automatically).

set -uo pipefail

# --- Flags ---
LOCAL=false
for arg in "$@"; do [[ "$arg" == "--local" ]] && LOCAL=true; done

# --- Targets ---
if [[ "$LOCAL" == "true" ]]; then
  API="http://localhost:8000"
  FRONTEND_URL="http://localhost:3000"
  CURL="curl -s"
else
  API="https://cardstoard.com/api"
  FRONTEND_URL="https://cardstoard.com"
  CURL="curl -sk"
fi

# --- Colors ---
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
CYAN="\033[1;36m"
BOLD="\033[1m"
NC="\033[0m"

PASS=0
FAIL=0
COOKIE_JAR=$(mktemp)
CSV_TMP=$(mktemp /tmp/smoke_XXXXXX.csv)
trap "rm -f $COOKIE_JAR $CSV_TMP" EXIT

ok()   { echo -e "${GREEN}✅ $1${NC}"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}❌ $1${NC}";   FAIL=$((FAIL + 1)); }

# --- Load credentials ---
[[ -f ~/.cardstoard.env ]] && source ~/.cardstoard.env
EMAIL="${CARDSTOARD_EMAIL:-}"
PASSWORD="${CARDSTOARD_PASSWORD:-}"

echo ""
echo -e "${BOLD}CardStoard Smoke Test — $(date)${NC}"
echo -e "Target: ${CYAN}$API${NC}"
[[ -z "$EMAIL" ]] && echo -e "${YELLOW}⚠  No credentials — authenticated checks will be skipped${NC}"
echo ""

# ─────────────────────────────────────────────
# Unauthenticated checks
# ─────────────────────────────────────────────

# 1. Backend health
BODY=$($CURL -o - -w "" "$API/health" 2>/dev/null || echo "")
STATUS=$($CURL -o /dev/null -w "%{http_code}" "$API/health" 2>/dev/null || echo "000")
if [[ "$STATUS" == "200" && "$BODY" == *"ok"* ]]; then
  ok "Health check ($STATUS)"
else
  fail "Health check — HTTP $STATUS, body: $BODY"
fi

# 2. Frontend
STATUS=$($CURL -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
if [[ "$STATUS" =~ ^(200|301|302)$ ]]; then
  ok "Frontend serving ($STATUS)"
else
  fail "Frontend — HTTP $STATUS"
fi

# 3–5. Auth gating (no credentials)
for endpoint in "cards/" "settings/"; do
  STATUS=$($CURL -o /dev/null -w "%{http_code}" "$API/$endpoint" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "401" ]]; then
    ok "Auth gating /$endpoint (401)"
  else
    fail "Auth gating /$endpoint — expected 401, got $STATUS"
  fi
done
STATUS=$($CURL -o /dev/null -w "%{http_code}" -X POST "$API/chat/" \
  -H "Content-Type: application/json" -d '{"message":"hi"}' 2>/dev/null || echo "000")
if [[ "$STATUS" == "401" ]]; then
  ok "Auth gating /chat/ (401)"
else
  fail "Auth gating /chat/ — expected 401, got $STATUS"
fi

# ─────────────────────────────────────────────
# DB checks — local only
# ─────────────────────────────────────────────
if [[ "$LOCAL" == "true" ]]; then
  MIG_COUNT=$(docker exec stoardb psql -U postgres -d cardstoardb -t \
    -c "SELECT COUNT(*) FROM schema_migrations;" 2>/dev/null | tr -d ' \n' || echo "0")
  if [[ "${MIG_COUNT:-0}" -ge 3 ]]; then
    ok "Schema migrations: $MIG_COUNT applied"
  else
    fail "Schema migrations: only ${MIG_COUNT:-0} applied (expected ≥3)"
  fi
fi

# ─────────────────────────────────────────────
# Authenticated checks
# ─────────────────────────────────────────────
if [[ -n "$EMAIL" && -n "$PASSWORD" ]]; then

  # 6. Login
  STATUS=$($CURL -c "$COOKIE_JAR" -o /dev/null -w "%{http_code}" \
    -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>/dev/null || echo "000")
  BODY=$($CURL -c "$COOKIE_JAR" -s \
    -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>/dev/null || echo "")
  if [[ "$STATUS" == "200" ]]; then
    USERNAME=$(echo "$BODY" | python3 -c \
      "import sys,json; d=json.load(sys.stdin); u=d.get('user',d); print(u.get('username') or u.get('email','?'))" 2>/dev/null || echo "?")
    ok "Login ($STATUS) — user: $USERNAME"
  else
    fail "Login — HTTP $STATUS"
  fi

  # 7. Auth/me
  STATUS=$($CURL -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" "$API/auth/me" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "200" ]]; then
    ok "Auth/me ($STATUS)"
  else
    fail "Auth/me — HTTP $STATUS"
  fi

  # 8. Settings — confirm row_color_rookie present
  BODY=$($CURL -b "$COOKIE_JAR" "$API/settings/" 2>/dev/null || echo "")
  STATUS=$($CURL -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" "$API/settings/" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "200" && "$BODY" == *"row_color_rookie"* ]]; then
    ok "Settings — row_color_rookie present ($STATUS)"
  elif [[ "$STATUS" == "200" ]]; then
    fail "Settings — row_color_rookie missing from response"
  else
    fail "Settings — HTTP $STATUS"
  fi

  # 9. Card count
  BODY=$($CURL -b "$COOKIE_JAR" "$API/cards/count" 2>/dev/null || echo "")
  STATUS=$($CURL -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" "$API/cards/count" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "200" ]]; then
    COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('count','?'))" 2>/dev/null || echo "?")
    ok "Card count: $COUNT ($STATUS)"
  else
    fail "Card count — HTTP $STATUS"
  fi

  # 10. Dictionary entries
  STATUS=$($CURL -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" \
    "$API/dictionary/entries?limit=1" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "200" ]]; then
    ok "Dictionary entries ($STATUS)"
  else
    fail "Dictionary entries — HTTP $STATUS"
  fi

  # 11. Validate-csv with a minimal valid CSV
  cat > "$CSV_TMP" <<'CSVEOF'
First,Last,Year,Brand,Rookie,Card Number,BookHi,BookHiMid,BookMid,BookLowMid,BookLow,Grade
Smoke,Test,1980,Topps,FALSE,1,10,8,6,4,2,1.0
CSVEOF
  BODY=$($CURL -b "$COOKIE_JAR" -X POST "$API/cards/validate-csv" \
    -F "file=@$CSV_TMP" 2>/dev/null || echo "")
  STATUS=$($CURL -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" -X POST "$API/cards/validate-csv" \
    -F "file=@$CSV_TMP" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "200" ]] && (echo "$BODY" | python3 -c "import sys,json; assert json.load(sys.stdin).get('valid')" 2>/dev/null); then
    ok "Validate-csv ($STATUS, valid)"
  else
    fail "Validate-csv — HTTP $STATUS, body: $BODY"
  fi

else
  echo -e "${YELLOW}   Skipping authenticated checks (no credentials)${NC}"
fi

# ─────────────────────────────────────────────
# DB checks — EC2 only (skipped with --local)
# ─────────────────────────────────────────────
if [[ "$LOCAL" == "false" ]]; then

  # 11. Schema migrations
  MIG_COUNT=$(docker exec stoardb psql -U postgres -d cardstoardb -t \
    -c "SELECT COUNT(*) FROM schema_migrations;" 2>/dev/null | tr -d ' \n' || echo "0")
  MIG_NAMES=$(docker exec stoardb psql -U postgres -d cardstoardb -t \
    -c "SELECT string_agg(filename, ', ' ORDER BY filename) FROM schema_migrations;" \
    2>/dev/null | xargs || echo "")
  if [[ "${MIG_COUNT:-0}" -ge 3 ]]; then
    ok "Schema migrations: $MIG_COUNT applied ($MIG_NAMES)"
  else
    fail "Schema migrations: only ${MIG_COUNT:-0} applied (expected ≥3)"
  fi

  # 12. row_color_* columns
  COL_COUNT=$(docker exec stoardb psql -U postgres -d cardstoardb -t \
    -c "SELECT COUNT(*) FROM information_schema.columns \
        WHERE table_name='global_settings' AND column_name LIKE 'row_color_%';" \
    2>/dev/null | tr -d ' \n' || echo "0")
  if [[ "${COL_COUNT:-0}" == "3" ]]; then
    ok "DB columns: row_color_rookie, row_color_grade3, row_color_rookie_grade3 present"
  else
    fail "DB columns: expected 3 row_color_* columns, found ${COL_COUNT:-0}"
  fi

fi

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────
echo ""
TOTAL=$((PASS + FAIL))
if [[ $FAIL -eq 0 ]]; then
  echo -e "${BOLD}${GREEN}Results: $PASS/$TOTAL passed ✅${NC}"
else
  echo -e "${BOLD}${RED}Results: $PASS passed / $FAIL failed out of $TOTAL ❌${NC}"
fi
echo ""

[[ $FAIL -eq 0 ]]
