-- ============================================================
-- SEED DATA — dati di prova equivalenti ai mock del frontend
-- Esegui con:
--   docker exec -i lamp_pg_db psql -U root -d postgres < ~/parcheggio/docker_lamp/db-init/02-seed.sql
-- ============================================================

-- ============================================================
-- PARCHEGGI
-- ============================================================
INSERT INTO parcheggi (id, nome, indirizzo, capacita_totale, tariffa_oraria, lat, lng, tipo, servizi, image, posti_liberi)
VALUES
  ('prk_00000000000000001', 'Parcheggio Centro',   'Piazza della Loggia, Brescia', 100, 2.50, 45.5397000, 10.2205000, 'coperto',  '["videosorveglianza","disabili","elettrico"]',                    'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400&h=250&fit=crop', 25),
  ('prk_00000000000000002', 'Parcheggio Stazione', 'Viale Venezia, Brescia',        80, 3.00, 45.5342000, 10.2136000, 'scoperto', '["videosorveglianza","h24"]',                                     'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400&h=250&fit=crop', 10),
  ('prk_00000000000000003', 'Parcheggio Ospedale', 'Via Filippo Turati, Brescia',   50, 1.50, 45.5412000, 10.2241000, 'coperto',  '["disabili","custodito"]',                                        'https://images.unsplash.com/photo-1560179406-67650a0d0de4?w=400&h=250&fit=crop', 15),
  ('prk_00000000000000004', 'Parcheggio Castello', 'Via del Castello, Brescia',    120, 2.00, 45.5447000, 10.2156000, 'scoperto', '["videosorveglianza","moto"]',                                    'https://images.unsplash.com/photo-1564586895204-f37f73d78d3a?w=400&h=250&fit=crop', 45),
  ('prk_00000000000000005', 'Parcheggio Arnaldo',  'Piazza Arnaldo, Brescia',       60, 2.80, 45.5385000, 10.2265000, 'coperto',  '["videosorveglianza","disabili","elettrico","custodito"]',        'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400&h=250&fit=crop',  5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- UTENTI
-- mario.rossi@email.it  →  password: Test1234!
-- admin@navipark.it     →  password: Admin1234!
-- ON CONFLICT DO NOTHING (senza target) ignora sia conflitti su id che su email
-- ============================================================
INSERT INTO utenti (id, email, password_hash, nome, cognome, ruolo, telefono)
VALUES ('usr_00000000000000001', 'mario.rossi@email.it', crypt('Test1234!', gen_salt('bf', 10)), 'Mario', 'Rossi', 'User', '+39 333 1234567')
ON CONFLICT DO NOTHING;

INSERT INTO utenti (id, email, password_hash, nome, cognome, ruolo, telefono)
VALUES ('usr_00000000000000000', 'admin@navipark.it', crypt('Admin1234!', gen_salt('bf', 10)), 'Admin', 'Admin', 'Admin', '+39 000 0000000')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PRENOTAZIONI (tutte legate a Mario Rossi)
-- Le date sono relative a NOW() per essere sempre attuali
-- ============================================================
INSERT INTO prenotazioni (id, codice_prenotazione, utente_id, parcheggio_id, parcheggio_nome, targa, data_ora_inizio, data_ora_fine, stato, created_at)
VALUES
  -- 3 attive (1 tra 1h, 1 tra 2 giorni, 1 tra 5 giorni)
  ('bkn_00000000000000001', 'A7B2C9D1', 'usr_00000000000000001', 'prk_00000000000000001', 'Parcheggio Centro',   'AB123CD', NOW() + INTERVAL '1 hour',   NOW() + INTERVAL '3 hours',              'attiva',    NOW()),
  ('bkn_00000000000000002', 'E3F6G8H4', 'usr_00000000000000001', 'prk_00000000000000002', 'Parcheggio Stazione', 'XY987ZW', NOW() + INTERVAL '2 days',   NOW() + INTERVAL '2 days 4 hours',       'attiva',    NOW() - INTERVAL '1 day'),
  ('bkn_00000000000000007', 'B8C2D5E3', 'usr_00000000000000001', 'prk_00000000000000002', 'Parcheggio Stazione', 'ST678UV', NOW() + INTERVAL '5 days',   NOW() + INTERVAL '5 days 2 hours',       'attiva',    NOW()),

  -- 2 completate (nel passato)
  ('bkn_00000000000000003', 'K1L5M0N7', 'usr_00000000000000001', 'prk_00000000000000003', 'Parcheggio Ospedale', 'CD456EF', NOW() - INTERVAL '3 days',   NOW() - INTERVAL '3 days' + INTERVAL '2 hours', 'completata', NOW() - INTERVAL '4 days'),
  ('bkn_00000000000000005', 'T5U0V3W9', 'usr_00000000000000001', 'prk_00000000000000004', 'Parcheggio Castello', 'KL012MN', NOW() - INTERVAL '14 days',  NOW() - INTERVAL '14 days' + INTERVAL '2 hours', 'completata', NOW() - INTERVAL '15 days'),

  -- 1 annullata
  ('bkn_00000000000000004', 'P2Q4R6S8', 'usr_00000000000000001', 'prk_00000000000000001', 'Parcheggio Centro',   'GH789IJ', NOW() - INTERVAL '7 days',   NOW() - INTERVAL '7 days' + INTERVAL '3 hours', 'annullata', NOW() - INTERVAL '8 days'),

  -- 1 scaduta
  ('bkn_00000000000000006', 'X7Y1Z4A0', 'usr_00000000000000001', 'prk_00000000000000005', 'Parcheggio Arnaldo',  'OP345QR', NOW() - INTERVAL '21 days',  NOW() - INTERVAL '21 days' + INTERVAL '90 minutes', 'scaduta', NOW() - INTERVAL '22 days')

ON CONFLICT (id) DO NOTHING;
