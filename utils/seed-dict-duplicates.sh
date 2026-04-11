#!/usr/bin/env bash
# utils/seed-dict-duplicates.sh
# ---------------------------------------------------------------------------
# DEV ONLY — inserts synthetic duplicate dictionary_entries for testing the
# dedup feature (Admin -> Player Dictionary -> Check Duplicates / Remove).
#
# Creates three flavours of duplicates, 100 groups each (2 rows per group):
#   Batch A — loser has older timestamp; winner has NOW()      -> keep newer
#   Batch B — loser has NULL values/timestamp; winner has both -> keep valued
#   Batch C — same timestamp on both; winner has higher id     -> keep higher id
#
# Each batch uses a UNION ALL on the same source CTE so both rows in every
# pair share the same base key — guaranteed 100 duplicates per batch = 300 total.
#
# Usage:
#   ./utils/seed-dict-duplicates.sh          # insert duplicates
#   ./utils/seed-dict-duplicates.sh --clean  # remove all DUPTEST rows
# ---------------------------------------------------------------------------
set -euo pipefail

CONTAINER="stoardb"
DB_USER="postgres"
DB_NAME="cardstoardb"

run_sql() {
  docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
}

if [[ "${1:-}" == "--clean" ]]; then
  echo "Removing synthetic duplicate rows..."
  echo "DELETE FROM dictionary_entries WHERE card_number LIKE '%-DUPTEST%';" | run_sql
  echo "Done."
  exit 0
fi

echo "Inserting synthetic duplicates into $DB_NAME..."

# ---------------------------------------------------------------------------
# Batch A: older-timestamp loser + newer-timestamp winner
# Loser:  book * 0.8, timestamp = NOW() - 60 days  <- should be REMOVED
# Winner: book * 1.0, timestamp = NOW()             <- should be KEPT
# Both rows share the same card_number key via a single CTE.
# ---------------------------------------------------------------------------
cat <<'BATCH_A' | run_sql
WITH src AS (
    SELECT first_name, last_name, rookie_year, brand, year, card_number,
           book_high, book_high_mid, book_mid, book_low_mid, book_low
    FROM dictionary_entries
    WHERE book_high IS NOT NULL
      AND card_number NOT LIKE '%-DUPTEST%'
    ORDER BY id
    LIMIT 100
)
INSERT INTO dictionary_entries
    (first_name, last_name, rookie_year, brand, year, card_number,
     book_high, book_high_mid, book_mid, book_low_mid, book_low,
     book_values_imported_at)
SELECT first_name, last_name, rookie_year, brand, year,
       card_number || '-DUPTEST-A',
       book_high * 0.8, book_high_mid * 0.8, book_mid * 0.8,
       book_low_mid * 0.8, book_low * 0.8,
       NOW() - interval '60 days'   -- LOSER: older
FROM src
UNION ALL
SELECT first_name, last_name, rookie_year, brand, year,
       card_number || '-DUPTEST-A',
       book_high, book_high_mid, book_mid, book_low_mid, book_low,
       NOW()                         -- WINNER: newer timestamp
FROM src;
BATCH_A

# ---------------------------------------------------------------------------
# Batch B: null-values loser + valued winner
# Loser:  all NULLs, no timestamp   <- should be REMOVED
# Winner: full book values, NOW()   <- should be KEPT
# ---------------------------------------------------------------------------
cat <<'BATCH_B' | run_sql
WITH src AS (
    SELECT first_name, last_name, rookie_year, brand, year, card_number,
           book_high, book_high_mid, book_mid, book_low_mid, book_low
    FROM dictionary_entries
    WHERE book_high IS NOT NULL
      AND card_number NOT LIKE '%-DUPTEST%'
    ORDER BY id
    LIMIT 100
)
INSERT INTO dictionary_entries
    (first_name, last_name, rookie_year, brand, year, card_number,
     book_high, book_high_mid, book_mid, book_low_mid, book_low,
     book_values_imported_at)
SELECT first_name, last_name, rookie_year, brand, year,
       card_number || '-DUPTEST-B',
       NULL, NULL, NULL, NULL, NULL, NULL   -- LOSER: no values, no timestamp
FROM src
UNION ALL
SELECT first_name, last_name, rookie_year, brand, year,
       card_number || '-DUPTEST-B',
       book_high, book_high_mid, book_mid, book_low_mid, book_low,
       NOW()                                -- WINNER: full values
FROM src;
BATCH_B

# ---------------------------------------------------------------------------
# Batch C: identical timestamps, tiebreak by id (higher id wins)
# Both rows: timestamp = '2026-01-01 12:00:00'
# Loser:  inserted first = lower id, book * 0.5   <- should be REMOVED
# Winner: inserted second = higher id, book * 1.0 <- should be KEPT
# ---------------------------------------------------------------------------
cat <<'BATCH_C' | run_sql
WITH src AS (
    SELECT first_name, last_name, rookie_year, brand, year, card_number,
           book_high, book_high_mid, book_mid, book_low_mid, book_low
    FROM dictionary_entries
    WHERE book_high IS NOT NULL
      AND card_number NOT LIKE '%-DUPTEST%'
    ORDER BY id
    LIMIT 100
)
INSERT INTO dictionary_entries
    (first_name, last_name, rookie_year, brand, year, card_number,
     book_high, book_high_mid, book_mid, book_low_mid, book_low,
     book_values_imported_at)
SELECT first_name, last_name, rookie_year, brand, year,
       card_number || '-DUPTEST-C',
       book_high * 0.5, book_high_mid * 0.5, book_mid * 0.5,
       book_low_mid * 0.5, book_low * 0.5,
       TIMESTAMP '2026-01-01 12:00:00'    -- LOSER: lower id (inserted first)
FROM src
UNION ALL
SELECT first_name, last_name, rookie_year, brand, year,
       card_number || '-DUPTEST-C',
       book_high, book_high_mid, book_mid, book_low_mid, book_low,
       TIMESTAMP '2026-01-01 12:00:00'    -- WINNER: higher id (inserted second)
FROM src;
BATCH_C

echo ""
echo "── Rows inserted per batch ─────────────────────────────────────────"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
    CASE
        WHEN card_number LIKE '%-DUPTEST-A' THEN 'Batch A (older dup vs newer orig)'
        WHEN card_number LIKE '%-DUPTEST-B' THEN 'Batch B (null values vs has values)'
        WHEN card_number LIKE '%-DUPTEST-C' THEN 'Batch C (same ts, id tiebreak)'
    END AS batch,
    COUNT(*) AS rows_inserted
FROM dictionary_entries
WHERE card_number LIKE '%-DUPTEST%'
GROUP BY 1 ORDER BY 1;"

echo ""
echo "── Duplicate stats (what GET /dictionary/duplicate-stats returns) ───"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
    COUNT(*)     AS duplicate_groups,
    SUM(cnt - 1) AS entries_to_remove
FROM (
    SELECT COUNT(*) AS cnt
    FROM dictionary_entries
    GROUP BY LOWER(first_name), LOWER(last_name), LOWER(brand), year, LOWER(card_number)
    HAVING COUNT(*) > 1
) sub;"

echo ""
echo "Done. Open Admin -> Player Dictionary -> Check Duplicates to test."
echo "Cleanup: ./utils/seed-dict-duplicates.sh --clean"
