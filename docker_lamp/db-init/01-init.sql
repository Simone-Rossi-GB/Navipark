-- Script di inizializzazione per PostgreSQL
-- Questo script viene eseguito automaticamente al primo avvio

-- Abilita l'estensione per funzioni crittografiche
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crea i tipi ENUM
CREATE TYPE tipo_posto AS ENUM ('standard', 'disabili', 'elettrico', 'moto');
CREATE TYPE stato_prenotazione AS ENUM ('attiva', 'annullata', 'scaduta', 'completata');

-- Tabella utenti
CREATE TABLE utenti (
    id CHAR(21) UNIQUE PRIMARY KEY,
    email VARCHAR(320) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    ultimo_accesso TIMESTAMP
);

-- Tabella parcheggi
CREATE TABLE parcheggi (
    id CHAR(21) UNIQUE PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    indirizzo VARCHAR(255) NOT NULL,
    capacita_totale INT NOT NULL,
    tariffa_oraria DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella posti
CREATE TABLE posti (
    id CHAR(21) UNIQUE PRIMARY KEY,
    parcheggio_id CHAR(21) NOT NULL REFERENCES parcheggi(id) ON DELETE CASCADE,
    codice_posto VARCHAR(10) NOT NULL,
    settore CHAR(1) NOT NULL,
    numero INT NOT NULL,
    tipo tipo_posto DEFAULT 'standard',
    piano INT NOT NULL,
    attivo BOOL DEFAULT TRUE,
    UNIQUE(parcheggio_id, codice_posto)
);

-- Tabella prenotazioni
CREATE TABLE prenotazioni (
    id CHAR(21) UNIQUE PRIMARY KEY,
    codice_prenotazione CHAR(21),
    utente_id CHAR(21) NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    parcheggio_id CHAR(21) NOT NULL REFERENCES parcheggi(id) ON DELETE CASCADE,
    posto_id CHAR(21) NOT NULL REFERENCES posti(id) ON DELETE CASCADE,
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
    id CHAR(21) UNIQUE PRIMARY KEY,
    utente_id CHAR(21) NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_expiry CHECK (expires_at > created_at)
);

-- Indici per performance
CREATE INDEX idx_utenti_email ON utenti(email);
CREATE INDEX idx_prenotazioni_utente ON prenotazioni(utente_id);
CREATE INDEX idx_prenotazioni_parcheggio ON prenotazioni(parcheggio_id);
CREATE INDEX idx_prenotazioni_prenotazione ON prenotazioni(codice_prenotazione);
CREATE INDEX idx_prenotazioni_stato ON prenotazioni(stato);
CREATE INDEX idx_prenotazioni_date ON prenotazioni(data_ora_inizio, data_ora_fine);
CREATE INDEX idx_sessioni_token ON sessioni(token);
CREATE INDEX idx_sessioni_utente ON sessioni(utente_id);
CREATE INDEX idx_posti_parcheggio ON posti(parcheggio_id);

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