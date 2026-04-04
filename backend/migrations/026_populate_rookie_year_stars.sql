-- Migration 026: Populate and correct rookie_year for HOF, stars, and semi-stars
--
-- Section 1: Correct existing wrong values (unconditional overwrite)
--   Eckersley: player_dictionary.py stored 1975 (wrong); first Topps card is 1976
--   Drysdale: player_dictionary.py stored 1956 (MLB debut); first Topps card is 1957
--   Gibson: conflicting values (1959/1961/1968); first Topps card is 1959
--   Santo: conflicting values (1960/1961); first Topps card is 1961

UPDATE dictionary_entries SET rookie_year = 1976 WHERE first_name = 'Dennis' AND last_name = 'Eckersley';
UPDATE dictionary_entries SET rookie_year = 1957 WHERE first_name = 'Don'    AND last_name = 'Drysdale';
UPDATE dictionary_entries SET rookie_year = 1959 WHERE first_name = 'Bob'    AND last_name = 'Gibson';
UPDATE dictionary_entries SET rookie_year = 1961 WHERE first_name = 'Ron'    AND last_name = 'Santo';

-- Section 2: HOF / vintage players (Bowman era, pre-1960)

UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Johnny' AND last_name = 'Mize'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Enos'   AND last_name = 'Slaughter' AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Sherm'  AND last_name = 'Lollar'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Bill'   AND last_name = 'Rigney'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Sid'    AND last_name = 'Gordon'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Jim'    AND last_name = 'Hegan'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1948 WHERE first_name = 'Eddie'  AND last_name = 'Joost'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1950 WHERE first_name = 'Frankie' AND last_name = 'Frisch'   AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1950 WHERE first_name = 'Leo'    AND last_name = 'Durocher'  AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1950 WHERE first_name = 'Casey'  AND last_name = 'Stengel'   AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1959 WHERE first_name = 'Ron'    AND last_name = 'Fairly'    AND rookie_year IS NULL;

-- Section 3: 1960s players

UPDATE dictionary_entries SET rookie_year = 1960 WHERE first_name = 'Frank'  AND last_name = 'Howard'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1961 WHERE first_name = 'Jim'    AND last_name = 'Kaat'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1961 WHERE first_name = 'Juan'   AND last_name = 'Marichal'  AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1961 WHERE first_name = 'Matty'  AND last_name = 'Alou'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1962 WHERE first_name = 'Bill'   AND last_name = 'Freehan'   AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1963 WHERE first_name = 'Cookie' AND last_name = 'Rojas'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1963 WHERE first_name = 'Manny'  AND last_name = 'Mota'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1964 WHERE first_name = 'Ed'     AND last_name = 'Kranepool' AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1964 WHERE first_name = 'Tommy'  AND last_name = 'John'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1964 WHERE first_name = 'Lou'    AND last_name = 'Piniella'  AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1965 WHERE first_name = 'Jim'    AND last_name = 'Hunter'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1965 WHERE first_name = 'Tug'    AND last_name = 'McGraw'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1965 WHERE first_name = 'Rick'   AND last_name = 'Wise'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1968 WHERE first_name = 'Jerry'  AND last_name = 'Koosman'   AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1968 WHERE first_name = 'Rick'   AND last_name = 'Monday'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1968 WHERE first_name = 'Reggie' AND last_name = 'Smith'     AND rookie_year IS NULL;

-- Section 4: 1970s players

UPDATE dictionary_entries SET rookie_year = 1970 WHERE first_name = 'Vida'   AND last_name = 'Blue'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1970 WHERE first_name = 'Graig'  AND last_name = 'Nettles'   AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1970 WHERE first_name = 'Al'     AND last_name = 'Oliver'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1970 WHERE first_name = 'Larry'  AND last_name = 'Bowa'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1970 WHERE first_name = 'Jerry'  AND last_name = 'Reuss'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1971 WHERE first_name = 'George' AND last_name = 'Foster'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1971 WHERE first_name = 'Don'    AND last_name = 'Baylor'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1971 WHERE first_name = 'Darrell' AND last_name = 'Evans'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1971 WHERE first_name = 'Gene'   AND last_name = 'Tenace'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1972 WHERE first_name = 'Rick'   AND last_name = 'Dempsey'   AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1972 WHERE first_name = 'Cesar'  AND last_name = 'Cedeno'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1973 WHERE first_name = 'Dwight' AND last_name = 'Evans'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1973 WHERE first_name = 'Bob'    AND last_name = 'Boone'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1974 WHERE first_name = 'Dave'   AND last_name = 'Lopes'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1974 WHERE first_name = 'Charlie' AND last_name = 'Hough'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1975 WHERE first_name = 'Jack'   AND last_name = 'Clark'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1975 WHERE first_name = 'Bill'   AND last_name = 'Madlock'   AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1975 WHERE first_name = 'Frank'  AND last_name = 'White'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1976 WHERE first_name = 'Fred'   AND last_name = 'Lynn'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1976 WHERE first_name = 'Keith'  AND last_name = 'Hernandez' AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1976 WHERE first_name = 'Doug'   AND last_name = 'DeCinces'  AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1976 WHERE first_name = 'Phil'   AND last_name = 'Garner'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1977 WHERE first_name = 'Ron'    AND last_name = 'Guidry'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1977 WHERE first_name = 'Willie' AND last_name = 'Randolph'  AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1978 WHERE first_name = 'Jack'   AND last_name = 'Morris'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1978 WHERE first_name = 'Lou'    AND last_name = 'Whitaker'  AND rookie_year IS NULL;

-- Section 5: 1980s players

UPDATE dictionary_entries SET rookie_year = 1979 WHERE first_name = 'Bob'    AND last_name = 'Welch'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1980 WHERE first_name = 'Pedro'  AND last_name = 'Guerrero'  AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1981 WHERE first_name = 'Dan'    AND last_name = 'Quisenberry' AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1981 WHERE first_name = 'Damaso' AND last_name = 'Garcia'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1981 WHERE first_name = 'Lloyd'  AND last_name = 'Moseby'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1981 WHERE first_name = 'Tom'    AND last_name = 'Herr'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1982 WHERE first_name = 'Mike'   AND last_name = 'Scott'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1982 WHERE first_name = 'Tony'   AND last_name = 'Pena'      AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1982 WHERE first_name = 'Steve'  AND last_name = 'Sax'       AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1982 WHERE first_name = 'Mookie' AND last_name = 'Wilson'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1982 WHERE first_name = 'Jesse'  AND last_name = 'Barfield'  AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1982 WHERE first_name = 'Tom'    AND last_name = 'Brunansky' AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1982 WHERE first_name = 'Brett'  AND last_name = 'Butler'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1983 WHERE first_name = 'Frank'  AND last_name = 'Viola'     AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1983 WHERE first_name = 'Steve'  AND last_name = 'Bedrosian' AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1983 WHERE first_name = 'Jesse'  AND last_name = 'Orosco'    AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1983 WHERE first_name = 'Steve'  AND last_name = 'Balboni'   AND rookie_year IS NULL;
UPDATE dictionary_entries SET rookie_year = 1983 WHERE first_name = 'Julio'  AND last_name = 'Franco'    AND rookie_year IS NULL;
