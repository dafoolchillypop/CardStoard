-- Migration 024: Propagate and repair rookie_year values
--
-- Step 1: For players with exactly one distinct non-null rookie_year across all their
-- entries, propagate that value to all their null entries.
-- This fixes ~1,200 players / 8,400+ entries where:
--   a) player_dictionary.py seeded some entries with rookie_year set
--   b) the Bowman/Fleer/Topps CSV re-seeding added more entries without it
-- Safe: only touches players with a single unambiguous rookie_year value.
UPDATE dictionary_entries d
SET rookie_year = sub.rookie_year
FROM (
    SELECT first_name, last_name, MAX(rookie_year) AS rookie_year
    FROM dictionary_entries
    WHERE rookie_year IS NOT NULL
    GROUP BY first_name, last_name
    HAVING COUNT(DISTINCT rookie_year) = 1
) sub
WHERE d.first_name = sub.first_name
  AND d.last_name  = sub.last_name
  AND d.rookie_year IS NULL;

-- Step 2: Correct conflicting HOF entries where "first MLB season" was stored
-- instead of "first major-brand card year". These players have two different
-- non-null values; the earlier one is the MLB debut year (wrong convention).
-- Set all entries for each player to their first Bowman/Topps card year.

-- Stan Musial — first Bowman: 1948 (MLB debut 1941 is wrong)
UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Stan' AND last_name = 'Musial';

-- Warren Spahn — first Bowman: 1948 (MLB debut 1942 is wrong)
UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Warren' AND last_name = 'Spahn';

-- Jackie Robinson — first Bowman: 1949 (MLB debut 1947 is wrong)
UPDATE dictionary_entries SET rookie_year = 1949 WHERE first_name = 'Jackie' AND last_name = 'Robinson';

-- Duke Snider — first Bowman: 1949 (MLB debut 1947 is wrong)
UPDATE dictionary_entries SET rookie_year = 1949 WHERE first_name = 'Duke' AND last_name = 'Snider';

-- Larry Doby — first Bowman: 1949 (MLB debut 1947 is wrong)
UPDATE dictionary_entries SET rookie_year = 1949 WHERE first_name = 'Larry' AND last_name = 'Doby';

-- Whitey Ford — first Bowman: 1951 (1950 entry is wrong)
UPDATE dictionary_entries SET rookie_year = 1951 WHERE first_name = 'Whitey' AND last_name = 'Ford';

-- Robin Roberts — first Bowman: 1949
UPDATE dictionary_entries SET rookie_year = 1949 WHERE first_name = 'Robin' AND last_name = 'Roberts';

-- Step 3: Fill in remaining HOF/star players who still have no rookie_year at all
-- after steps 1-2. These players are only in the Topps/Bowman CSV without a
-- Rookie flag, and were not in player_dictionary.py.

-- AL/NL Hall of Famers — Topps rookie card year
UPDATE dictionary_entries SET rookie_year = 1954 WHERE first_name = 'Al'      AND last_name = 'Kaline'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1955 WHERE first_name = 'Sandy'   AND last_name = 'Koufax'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1955 WHERE first_name = 'Harmon'  AND last_name = 'Killebrew'   AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1957 WHERE first_name = 'Brooks'  AND last_name = 'Robinson'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1957 WHERE first_name = 'Frank'   AND last_name = 'Robinson'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1960 WHERE first_name = 'Willie'  AND last_name = 'McCovey'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1960 WHERE first_name = 'Carl'    AND last_name = 'Yastrzemski' AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1961 WHERE first_name = 'Billy'   AND last_name = 'Williams'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1963 WHERE first_name = 'Willie'  AND last_name = 'Stargell'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1965 WHERE first_name = 'Joe'     AND last_name = 'Morgan'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1966 WHERE first_name = 'Jim'     AND last_name = 'Palmer'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1967 WHERE first_name = 'Tom'     AND last_name = 'Seaver'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1968 WHERE first_name = 'Nolan'   AND last_name = 'Ryan'        AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1969 WHERE first_name = 'Rollie'  AND last_name = 'Fingers'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1969 WHERE first_name = 'Reggie'  AND last_name = 'Jackson'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1973 WHERE first_name = 'Rich'    AND last_name = 'Gossage'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1974 WHERE first_name = 'Dave'    AND last_name = 'Winfield'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1975 WHERE first_name = 'Robin'   AND last_name = 'Yount'       AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1977 WHERE first_name = 'Bruce'   AND last_name = 'Sutter'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1978 WHERE first_name = 'Paul'    AND last_name = 'Molitor'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1978 WHERE first_name = 'Eddie'   AND last_name = 'Murray'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1980 WHERE first_name = 'Rickey'  AND last_name = 'Henderson'   AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1982 WHERE first_name = 'Cal'     AND last_name = 'Ripken'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1983 WHERE first_name = 'Tony'    AND last_name = 'Gwynn'       AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1983 WHERE first_name = 'Ryne'    AND last_name = 'Sandberg'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1985 WHERE first_name = 'Kirby'   AND last_name = 'Puckett'     AND rookie_year IS NULL;

-- Notable players whose first Bowman predates Topps 1952
UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Bob'     AND last_name = 'Feller'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Gil'     AND last_name = 'Hodges'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Pee Wee' AND last_name = 'Reese'       AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1950 WHERE first_name = 'Ralph'   AND last_name = 'Kiner'       AND rookie_year IS NULL;
