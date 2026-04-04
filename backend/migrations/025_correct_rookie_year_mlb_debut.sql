-- Migration 025: Correct rookie_year entries where first MLB season was stored
-- instead of first major-brand card year (Topps/Bowman).
-- These were not caught by migration 024's propagation because the wrong value
-- was consistently applied across all entries for the player.

-- Ted Williams — first Bowman: 1948 (MLB debut 1939 is wrong)
UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Ted'     AND last_name = 'Williams';

-- Pee Wee Reese — first Bowman: 1948 (MLB debut 1940 is wrong)
UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Pee Wee' AND last_name = 'Reese';

-- Nellie Fox — first Bowman: 1951 (MLB debut 1947 is wrong)
UPDATE dictionary_entries SET rookie_year = 1951 WHERE first_name = 'Nellie'  AND last_name = 'Fox';

-- Rich Gossage (Goose) — first Topps: 1975 (MLB debut 1972 is wrong;
-- migration 024 incorrectly set 1972 for null entries — this corrects it)
UPDATE dictionary_entries SET rookie_year = 1975 WHERE first_name = 'Rich'    AND last_name = 'Gossage';

-- Carlton Fisk — first Topps: 1972 (MLB debut 1969 is wrong)
UPDATE dictionary_entries SET rookie_year = 1972 WHERE first_name = 'Carlton' AND last_name = 'Fisk';

-- Mike Schmidt — first Topps RC: 1973 (#615, per MEMORY.md)
-- player_dictionary.py incorrectly stored 1972 (MLB debut year)
UPDATE dictionary_entries SET rookie_year = 1973 WHERE first_name = 'Mike'    AND last_name = 'Schmidt';
