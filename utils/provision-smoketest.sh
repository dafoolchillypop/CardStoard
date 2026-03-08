#!/usr/bin/env bash
# CardStoard — Provision smoke test user
#
# Ensures the smoke test user exists in the DB with known credentials
# and writes canonical credentials to ~/.cardstoard.env.
#
# Run on EC2 after every DB restore. Also callable standalone.
#
# Usage:
#   ./utils/provision-smoketest.sh

set -euo pipefail

SMOKE_EMAIL="smoketest@cardstoard.dev"
SMOKE_USER="smoketest"
SMOKE_PASS="SmokeTest999"

BACKEND_CONTAINER="stoarback"
PY_SCRIPT="/tmp/provision_smoke.py"
ENV_FILE="$HOME/.cardstoard.env"

echo "--- Provisioning smoke test user ---"

# Write Python script using single-quoted heredoc (prevents $ expansion in source)
cat > "$PY_SCRIPT" << 'PYEOF'
import bcrypt, os, psycopg2

email    = os.environ["SMOKE_EMAIL"]
username = os.environ["SMOKE_USER"]
password = os.environ["SMOKE_PASS"]

pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur  = conn.cursor()
cur.execute("""
    INSERT INTO users (email, username, password_hash, is_verified, is_active, created_at)
    VALUES (%s, %s, %s, true, true, NOW())
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          is_verified   = true,
          is_active     = true
""", (email, username, pw_hash))
conn.commit()
print(f"Smoke test user ready: {email} ({cur.rowcount} row affected)")
cur.close()
conn.close()
PYEOF

# Copy into backend container (avoids shell $ expansion when passing values)
docker cp "$PY_SCRIPT" "${BACKEND_CONTAINER}:${PY_SCRIPT}"

# Run inside container where DATABASE_URL is already in env
docker exec \
  -e SMOKE_EMAIL="$SMOKE_EMAIL" \
  -e SMOKE_USER="$SMOKE_USER"   \
  -e SMOKE_PASS="$SMOKE_PASS"   \
  "$BACKEND_CONTAINER" python3 "$PY_SCRIPT"

# Write canonical credentials to env file (plain strings — no $ in values)
cat > "$ENV_FILE" <<ENVEOF
CARDSTOARD_EMAIL=$SMOKE_EMAIL
CARDSTOARD_PASSWORD=$SMOKE_PASS
ENVEOF

echo "Credentials written to $ENV_FILE"
