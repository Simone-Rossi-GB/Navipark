-- ============================================================
-- PARCHEGGI REALI — dati ufficiali BresciaMobilità Open Data
-- Fonte: https://github.com/BresciaMobilita/Open-Data
-- CSV: Parcheggio in struttura - Brescia.csv
--
-- Tutti i parcheggi sono di tipo 'coperto' (in struttura).
-- indirizzo e tariffa_oraria sono stime/placeholder:
-- aggiornali con i dati reali se disponibili.
-- posti_liberi è inizializzato = capacita_totale.
-- ============================================================

INSERT INTO parcheggi (id, nome, indirizzo, capacita_totale, posti_liberi, tariffa_oraria, lat, lng, tipo, servizi, image)
VALUES
  ('bsm_00000000000000001', 'Randaccio',               'Via Triumplina, Brescia',             153,  153,  1.50, 45.5445747, 10.2133312, 'coperto',  '["videosorveglianza"]',                            ''),
  ('bsm_00000000000000002', 'Sant''Eufemia',            'Via Sant''Eufemia, Brescia',           394,  394,  1.50, 45.5119048, 10.2802211, 'coperto',  '["videosorveglianza"]',                            ''),
  ('bsm_00000000000000003', 'Fossa Bagni',              'Via Fossa Bagni, Brescia',             516,  516,  2.00, 45.5442314, 10.2242909, 'coperto',  '["videosorveglianza","disabili"]',                  ''),
  ('bsm_00000000000000004', 'Palagiustizia',            'Via Gambara, Brescia',                 538,  538,  2.00, 45.5307846, 10.2231216, 'coperto',  '["videosorveglianza","disabili"]',                  ''),
  ('bsm_00000000000000005', 'Ospedale Sud',             'Viale Europa, Brescia',                471,  471,  1.50, 45.5544395, 10.2304392, 'coperto',  '["videosorveglianza","disabili"]',                  ''),
  ('bsm_00000000000000006', 'Casazza',                  'Via Casazza, Brescia',                 157,  157,  1.50, 45.5757790, 10.2285080, 'coperto',  '["videosorveglianza"]',                            ''),
  ('bsm_00000000000000007', 'Crystal',                  'Via Triumplina, Brescia',              359,  359,  2.00, 45.5243721, 10.2145357, 'coperto',  '["videosorveglianza","disabili","elettrico"]',      ''),
  ('bsm_00000000000000008', 'Ospedale Nord Esterno',    'Piazzale Spedali Civili, Brescia',     146,  146,  1.50, 45.5602341, 10.2326059, 'scoperto', '["videosorveglianza","disabili"]',                  ''),
  ('bsm_00000000000000009', 'Ospedale Nord Interrato',  'Piazzale Spedali Civili, Brescia',    1244, 1244,  1.50, 45.5597534, 10.2315970, 'coperto',  '["videosorveglianza","disabili","h24"]',             ''),
  ('bsm_00000000000000010', 'Crystal Terrazzo',         'Via Triumplina, Brescia',               60,   60,  1.00, 45.5243721, 10.2145348, 'scoperto', '[]',                                               ''),
  ('bsm_00000000000000011', 'Camper',                   'Lungofiume Naviglio, Brescia',          10,   10,  0.00, 45.5168038, 10.2348618, 'scoperto', '[]',                                               ''),
  ('bsm_00000000000000012', 'Stazione',                 'Viale della Stazione, Brescia',        958,  958,  2.50, 45.5323334, 10.2149086, 'coperto',  '["videosorveglianza","disabili","h24","elettrico"]', ''),
  ('bsm_00000000000000013', 'Vittoria',                 'Piazza della Vittoria, Brescia',       460,  460,  2.50, 45.5378151, 10.2189369, 'coperto',  '["videosorveglianza","disabili"]',                  ''),
  ('bsm_00000000000000014', 'Arnaldo',                  'Piazza Arnaldo, Brescia',              263,  263,  2.00, 45.5364227, 10.2316399, 'coperto',  '["videosorveglianza","disabili"]',                  ''),
  ('bsm_00000000000000015', 'Autosilo 1',               'Via Solferino, Brescia',               317,  317,  2.00, 45.5333856, 10.2221413, 'coperto',  '["videosorveglianza","disabili"]',                  ''),
  ('bsm_00000000000000016', 'Freccia Rossa',            'Via Carlo Cattaneo, Brescia',         2218, 2218,  1.50, 45.5359047, 10.2098133, 'coperto',  '["videosorveglianza","disabili","elettrico","h24"]', ''),
  ('bsm_00000000000000017', 'Piazza Mercato',           'Piazza del Mercato, Brescia',          190,  190,  2.00, 45.5375463, 10.2179714, 'coperto',  '["videosorveglianza","disabili"]',                  ''),
  ('bsm_00000000000000018', 'Benedetto Croce',          'Via Benedetto Croce, Brescia',          72,   72,  1.50, 45.5345573, 10.2196636, 'coperto',  '["videosorveglianza"]',                            ''),
  ('bsm_00000000000000019', 'San Domenico',             'Via San Domenico, Brescia',             72,   72,  1.50, 45.5353203, 10.2191916, 'coperto',  '["videosorveglianza"]',                            ''),
  ('bsm_00000000000000020', 'Prealpino',                'Via Prealpino, Brescia',               878,  878,  1.50, 45.5804428, 10.2278537, 'coperto',  '["videosorveglianza","disabili"]',                  '')
ON CONFLICT (id) DO NOTHING;
