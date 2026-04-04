DELETE FROM dictionary_entries
WHERE lower(last_name) LIKE '%leaders%'
   OR lower(last_name) LIKE '%checklist%'
   OR lower(last_name) LIKE '%all-star%'
   OR lower(last_name) LIKE '% team'
   OR lower(last_name) IN ('team', 'teamcl');
