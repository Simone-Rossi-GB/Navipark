INSERT INTO prenotazioni (id, codice_prenotazione, utente_id, parcheggio_id, parcheggio_nome, targa, data_ora_inizio, data_ora_fine, stato, created_at)
VALUES
    ('bkn_mock000000000001', 'pPEngZs58JiyyeFJt8GBH', 'usr_00000000000000001', 'prk_00000000000000001', 'Parcheggio Centro',   'AB123CD', NOW() + INTERVAL '1 hour',  NOW() + INTERVAL '3 hours', 'attiva',    NOW()),
    ('bkn_mock000000000002', 'tEy-k0lldBiBNjMGpwqL1', 'usr_00000000000000001', 'prk_00000000000000002', 'Parcheggio Stazione', 'XY987ZW', NOW() + INTERVAL '2 days',  NOW() + INTERVAL '2 days 2 hours', 'attiva', NOW()),
    ('bkn_mock000000000003', '2HHUPUp99t280IvNCGclg', 'usr_00000000000000001', 'prk_00000000000000003', 'Parcheggio Ospedale', 'CD456EF', NOW() - INTERVAL '1 day',   NOW() - INTERVAL '22 hours', 'completata', NOW() - INTERVAL '2 days')
    ON CONFLICT (id) DO NOTHING;