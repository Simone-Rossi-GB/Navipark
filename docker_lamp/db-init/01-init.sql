-- Script di inizializzazione per PostgreSQL
-- Questo script viene eseguito automaticamente al primo avvio

-- Abilita l'estensione per funzioni crittografiche
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crea i tipi ENUM
CREATE TYPE tipo_posto AS ENUM ('standard', 'disabili', 'elettrico', 'moto');
CREATE TYPE stato_prenotazione AS ENUM ('attiva', 'annullata', 'scaduta', 'completata');

-- Tabella utenti
CREATE TABLE utenti (
    id CHAR(21) PRIMARY KEY,
    email VARCHAR(320) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    ruolo VARCHAR(20) NOT NULL DEFAULT 'User',
    telefono VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    ultimo_accesso TIMESTAMP
);

-- Tabella parcheggi
CREATE TABLE parcheggi (
    id CHAR(21) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    indirizzo VARCHAR(255) NOT NULL,
    capacita_totale INT NOT NULL,
    posti_liberi INT NOT NULL DEFAULT 0,
    tariffa_oraria DECIMAL(10, 2),
    lat DECIMAL(10, 7) NOT NULL DEFAULT 45.5397,
    lng DECIMAL(10, 7) NOT NULL DEFAULT 10.2205,
    tipo VARCHAR(50) NOT NULL DEFAULT 'scoperto',
    servizi TEXT NOT NULL DEFAULT '[]',
    image TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella prenotazioni
CREATE TABLE prenotazioni (
    id CHAR(21) PRIMARY KEY,
    codice_prenotazione CHAR(21) UNIQUE,
    utente_id CHAR(21) NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    parcheggio_id CHAR(21) NOT NULL REFERENCES parcheggi(id) ON DELETE CASCADE,
    parcheggio_nome VARCHAR(255) NOT NULL DEFAULT '',
    targa CHAR(7) NOT NULL,
    data_ora_inizio TIMESTAMP NOT NULL,
    data_ora_fine TIMESTAMP NOT NULL,
    stato stato_prenotazione DEFAULT 'attiva',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT check_date_order CHECK (data_ora_fine > data_ora_inizio)
);

-- Tabella sessioni
CREATE TABLE sessioni (
    id CHAR(21) PRIMARY KEY,
    utente_id CHAR(21) NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL, -- sub+iat+exp+iss oltre i 255 caratteri
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_expiry CHECK (expires_at > created_at)
);

-- Indici per performance
CREATE INDEX idx_prenotazioni_utente ON prenotazioni(utente_id);
CREATE INDEX idx_prenotazioni_parcheggio ON prenotazioni(parcheggio_id);
CREATE INDEX idx_prenotazioni_prenotazione ON prenotazioni(codice_prenotazione);
CREATE INDEX idx_prenotazioni_stato ON prenotazioni(stato);
CREATE INDEX idx_prenotazioni_date ON prenotazioni(data_ora_inizio, data_ora_fine);
CREATE INDEX idx_sessioni_utente ON sessioni(utente_id);
CREATE INDEX idx_sessioni_expires_at ON sessioni(expires_at);
CREATE INDEX idx_parcheggi_tipo ON parcheggi(tipo);

-- Funzione per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per utenti
CREATE TRIGGER trigger_utenti_updated_at
    BEFORE UPDATE ON utenti
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger per prenotazioni
CREATE TRIGGER trigger_prenotazioni_updated_at
    BEFORE UPDATE ON prenotazioni
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();