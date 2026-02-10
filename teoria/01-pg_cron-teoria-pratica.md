# pg_cron -- Job Scheduling dentro PostgreSQL

## Indice
1. [Teoria fondamentale](#1-teoria-fondamentale)
2. [Prerequisiti concettuali](#2-prerequisiti-concettuali)
3. [Come funziona internamente](#3-come-funziona-internamente)
4. [Sintassi e API completa](#4-sintassi-e-api-completa)
5. [Esercizi pratici isolati](#5-esercizi-pratici-isolati)
6. [Contesto nel progetto Parcheggio](#6-contesto-nel-progetto-parcheggio)
7. [Errori comuni e debugging](#7-errori-comuni-e-debugging)
8. [Domande di autovalutazione](#8-domande-di-autovalutazione)

---

## 1. Teoria fondamentale

### Cos'e' un Job Scheduler?

Un job scheduler e' un componente software che esegue operazioni automaticamente a intervalli predefiniti. Il concetto nasce da **cron** di Unix (1975), che legge una tabella di istruzioni (crontab) e lancia comandi al momento giusto.

**Problema che risolve**: molte operazioni nei database devono avvenire periodicamente senza intervento umano:
- Pulizia di dati scaduti
- Aggregazione di statistiche
- Manutenzione (VACUUM, ANALYZE, REINDEX)
- Refresh di viste materializzate
- Invio di notifiche basate su condizioni dei dati

**Senza pg_cron** dovresti:
- Usare il cron di sistema operativo + script che si connettono al DB dall'esterno
- Scrivere un servizio applicativo (Python, PHP) che fa polling periodico
- Usare un task queue esterno (Celery, RabbitMQ)

Tutti questi approcci introducono: dipendenze esterne, latenza di rete, gestione credenziali, punti di fallimento aggiuntivi.

**Con pg_cron**: il job gira **dentro il processo PostgreSQL stesso**. Zero latenza di rete, zero credenziali esterne, zero dipendenze.

### Il modello cron di Unix

La sintassi cron usa 5 campi separati da spazio:

```
*     *     *     *     *
|     |     |     |     |
|     |     |     |     +--- giorno della settimana (0-7, 0 e 7 = domenica)
|     |     |     +--------- mese (1-12)
|     |     +--------------- giorno del mese (1-31)
|     +--------------------- ora (0-23)
+--------------------------- minuto (0-59)
```

**Esempi di pattern**:

| Pattern | Significato |
|---------|-------------|
| `* * * * *` | Ogni minuto |
| `*/5 * * * *` | Ogni 5 minuti |
| `0 * * * *` | Ogni ora (al minuto 0) |
| `0 3 * * *` | Ogni giorno alle 3:00 |
| `0 0 * * 0` | Ogni domenica a mezzanotte |
| `0 0 1 * *` | Il primo di ogni mese a mezzanotte |
| `30 8-17 * * 1-5` | Alle X:30, dalle 8 alle 17, lun-ven |

**Regola mnemonica**: leggi da sinistra a destra come "al minuto X, dell'ora Y, del giorno Z..."

---

## 2. Prerequisiti concettuali

### Shared Preload Libraries

PostgreSQL ha un meccanismo per caricare estensioni **all'avvio del server** (non a runtime). Alcune estensioni necessitano di allocare memoria condivisa o registrare background workers prima che il server accetti connessioni.

pg_cron e' una di queste: registra un **background worker** che si sveglia ogni minuto per controllare se ci sono job da eseguire.

```ini
# postgresql.conf
shared_preload_libraries = 'pg_cron'
```

**IMPORTANTE**: modificare `shared_preload_libraries` richiede un **restart** di PostgreSQL (non basta un reload).

### Background Workers

Da PostgreSQL 9.3, le estensioni possono registrare **processi figli** del server PostgreSQL (background workers). pg_cron ne usa uno che:

1. Si sveglia ogni 60 secondi
2. Legge la tabella `cron.job` nel database configurato
3. Per ogni job il cui schedule corrisponde al timestamp corrente, lancia l'esecuzione
4. Registra il risultato nella tabella `cron.job_run_details`

### Il concetto di "database di cron"

pg_cron gira in **un solo database** (di default quello specificato in `cron.database_name`). Per schedulare job su altri database del cluster, si usa la variante `cron.schedule_in_database()`.

---

## 3. Come funziona internamente

### Architettura

```
PostgreSQL Server Process
    |
    +-- Backend (connessione utente 1)
    +-- Backend (connessione utente 2)
    +-- ...
    +-- pg_cron Background Worker    <-- processo dedicato
         |
         +-- Ogni 60s: legge cron.job
         +-- Se match temporale: apre connessione interna
         +-- Esegue il comando SQL del job
         +-- Scrive risultato in cron.job_run_details
```

### Tabelle di sistema

```sql
-- Tabella dei job schedulati
SELECT * FROM cron.job;
/*
 jobid | schedule      | command                    | nodename  | nodeport | database | username | active
-------+---------------+----------------------------+-----------+----------+----------+----------+--------
     1 | */5 * * * *   | UPDATE prenotazioni SET... | localhost |     5432 | parcheg  | root     | t
*/

-- Storico delle esecuzioni
SELECT * FROM cron.job_run_details ORDER BY start_time DESC;
/*
 jobid | runid | job_pid | database | username | command | status    | return_message | start_time | end_time
-------+-------+---------+----------+----------+---------+-----------+----------------+------------+---------
     1 |   42  |  12345  | parcheg  | root     | UPDATE..| succeeded | UPDATE 3       | 2025-01-..  | 2025-01..
*/
```

### Ciclo di vita di un job

```
schedule() --> job inserito in cron.job --> background worker lo legge
    --> al momento giusto: esecuzione --> risultato in cron.job_run_details
    --> unschedule() per rimuoverlo
```

---

## 4. Sintassi e API completa

### Creare un job

```sql
-- Sintassi base
SELECT cron.schedule(
    'nome_job',           -- identificativo univoco
    '*/5 * * * *',        -- schedule cron
    'COMANDO SQL'         -- il comando da eseguire
);

-- Sintassi con database specifico
SELECT cron.schedule_in_database(
    'nome_job',
    '*/5 * * * *',
    'COMANDO SQL',
    'nome_database'
);
```

### Rimuovere un job

```sql
-- Per nome
SELECT cron.unschedule('nome_job');

-- Per ID
SELECT cron.unschedule(42);
```

### Modificare un job

Non esiste ALTER. Devi rimuovere e ricreare:

```sql
SELECT cron.unschedule('nome_job');
SELECT cron.schedule('nome_job', '0 * * * *', 'NUOVO COMANDO');
```

### Disabilitare temporaneamente

```sql
UPDATE cron.job SET active = false WHERE jobname = 'nome_job';
-- Per riabilitare:
UPDATE cron.job SET active = true WHERE jobname = 'nome_job';
```

### Monitorare lo storico

```sql
-- Ultimi 10 esecuzioni di un job
SELECT jobid, status, return_message, start_time, end_time,
       (end_time - start_time) AS durata
FROM cron.job_run_details
WHERE jobid = 1
ORDER BY start_time DESC
LIMIT 10;

-- Job falliti nelle ultime 24 ore
SELECT * FROM cron.job_run_details
WHERE status = 'failed'
  AND start_time > NOW() - INTERVAL '24 hours';
```

### Pulizia dello storico

Lo storico cresce all'infinito se non lo pulisci:

```sql
-- Pulisci esecuzioni piu' vecchie di 7 giorni
SELECT cron.schedule('cleanup_job_history', '0 0 * * *', $$
    DELETE FROM cron.job_run_details
    WHERE end_time < NOW() - INTERVAL '7 days'
$$);
```

### Dollar quoting ($$)

Nota la sintassi `$$...$$`. E' il **dollar quoting** di PostgreSQL: un modo per scrivere stringhe che contengono apici singoli senza doverli escape. Tutto tra `$$` e `$$` e' una stringa letterale.

```sql
-- Queste due sono equivalenti:
SELECT 'l''utente ha detto "ciao"';      -- escape con doppio apice
SELECT $$l'utente ha detto "ciao"$$;      -- dollar quoting, nessun escape
```

---

## 5. Esercizi pratici isolati

> Questi esercizi si fanno su un PostgreSQL qualsiasi con pg_cron installato.
> Non richiedono il progetto Parcheggio.

### Esercizio 1: Setup iniziale

**Obiettivo**: installare pg_cron e verificare che funzioni.

1. Aggiungi pg_cron a `shared_preload_libraries` nel `postgresql.conf`
2. Riavvia PostgreSQL
3. Connettiti e crea l'estensione:
   ```sql
   CREATE EXTENSION pg_cron;
   ```
4. Verifica che le tabelle di sistema esistano:
   ```sql
   SELECT * FROM cron.job;
   SELECT * FROM cron.job_run_details;
   ```

**Domanda**: perche' `CREATE EXTENSION pg_cron` da solo non basta? Cosa succede se non aggiungi la riga in `shared_preload_libraries`?

---

### Esercizio 2: Il tuo primo job

**Obiettivo**: creare un job che scrive un timestamp in una tabella ogni minuto.

```sql
-- Crea una tabella di log
CREATE TABLE cron_test_log (
    id SERIAL PRIMARY KEY,
    messaggio TEXT,
    timestamp_esecuzione TIMESTAMPTZ DEFAULT NOW()
);

-- Schedula un job che inserisce un record ogni minuto
SELECT cron.schedule('test_log_writer', '* * * * *', $$
    INSERT INTO cron_test_log (messaggio) VALUES ('ping dal cron')
$$);
```

1. Aspetta 3 minuti
2. Verifica: `SELECT * FROM cron_test_log;`
3. Verifica lo storico: `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'test_log_writer');`
4. Rimuovi il job: `SELECT cron.unschedule('test_log_writer');`

**Domanda**: quanti record ti aspetti dopo 3 minuti? E se ne trovi di meno, cosa potrebbe essere successo?

---

### Esercizio 3: Job condizionale

**Obiettivo**: creare un job che agisce solo se una condizione e' vera.

```sql
-- Crea una tabella di prodotti con scadenza
CREATE TABLE prodotti (
    id SERIAL PRIMARY KEY,
    nome TEXT,
    scadenza DATE,
    attivo BOOLEAN DEFAULT true
);

-- Inserisci dati di test
INSERT INTO prodotti (nome, scadenza) VALUES
    ('Latte', CURRENT_DATE - INTERVAL '1 day'),
    ('Pane', CURRENT_DATE + INTERVAL '2 days'),
    ('Yogurt', CURRENT_DATE - INTERVAL '3 days'),
    ('Mela', CURRENT_DATE + INTERVAL '5 days');

-- Job: disattiva prodotti scaduti ogni 5 minuti
SELECT cron.schedule('disattiva_scaduti', '*/5 * * * *', $$
    UPDATE prodotti SET attivo = false
    WHERE scadenza < CURRENT_DATE AND attivo = true
$$);
```

1. Verifica: `SELECT * FROM prodotti;`
2. Aspetta che il job esegua
3. Verifica di nuovo: i prodotti scaduti dovrebbero avere `attivo = false`
4. Controlla il `return_message` in `cron.job_run_details`: cosa dice?

**Domanda**: il `return_message` dice "UPDATE 2" o "UPDATE 0" la seconda volta che gira. Perche'? Cosa significa?

---

### Esercizio 4: Manutenzione automatica

**Obiettivo**: schedulare VACUUM ANALYZE e capire perche' e' importante.

```sql
-- VACUUM recupera spazio da righe cancellate (dead tuples)
-- ANALYZE aggiorna le statistiche per l'ottimizzatore di query

-- Job: VACUUM ANALYZE ogni notte alle 3
SELECT cron.schedule('manutenzione_notturna', '0 3 * * *',
    'VACUUM ANALYZE prodotti');
```

**Teoria**: PostgreSQL usa MVCC (Multi-Version Concurrency Control). Quando fai UPDATE o DELETE, la vecchia versione della riga non viene fisicamente cancellata subito -- resta come "dead tuple". VACUUM la rimuove e rende lo spazio riutilizzabile.

**Domanda**: perche' e' meglio fare VACUUM di notte? Cosa succede se non fai mai VACUUM su una tabella con molti UPDATE?

---

### Esercizio 5: Materialized View Refresh

**Obiettivo**: capire le viste materializzate e il loro refresh automatico.

```sql
-- Una vista materializzata e' una query pre-calcolata salvata su disco
CREATE MATERIALIZED VIEW mv_statistiche_prodotti AS
SELECT
    attivo,
    COUNT(*) AS totale,
    MIN(scadenza) AS scadenza_piu_vicina
FROM prodotti
GROUP BY attivo;

-- La vista non si aggiorna automaticamente!
-- Prova: inserisci un nuovo prodotto
INSERT INTO prodotti (nome, scadenza) VALUES ('Biscotti', CURRENT_DATE + INTERVAL '10 days');

-- Questa query mostra dati VECCHI:
SELECT * FROM mv_statistiche_prodotti;

-- Per aggiornarla manualmente:
REFRESH MATERIALIZED VIEW mv_statistiche_prodotti;

-- Con pg_cron, automatizza il refresh ogni 30 minuti:
SELECT cron.schedule('refresh_stats', '*/30 * * * *', $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_statistiche_prodotti
$$);
```

**ATTENZIONE**: `REFRESH MATERIALIZED VIEW CONCURRENTLY` richiede un UNIQUE INDEX sulla vista. Senza `CONCURRENTLY`, il refresh blocca le letture.

```sql
-- Aggiungi l'indice unico (necessario per CONCURRENTLY)
CREATE UNIQUE INDEX ON mv_statistiche_prodotti (attivo);
```

**Domanda**: qual e' la differenza tra una VIEW normale e una MATERIALIZED VIEW? Quando conviene l'una e quando l'altra?

---

## 6. Contesto nel progetto Parcheggio

### Job che servono al tuo progetto

| Job | Schedule | Descrizione |
|-----|----------|-------------|
| `expire_reservations` | `*/5 * * * *` | Marca prenotazioni scadute |
| `cleanup_sessions` | `0 * * * *` | Elimina sessioni expired |
| `aggregate_occupancy` | `*/30 * * * *` | Refresh vista occupazione |
| `vacuum_high_churn` | `0 3 * * *` | VACUUM su prenotazioni e sessioni |
| `cleanup_cron_history` | `0 4 * * *` | Pulisci storico cron.job_run_details |
| `prepare_simulation_data` | `0 2 * * *` | Prepara dati input per SUMO |

### Come configurarlo in Docker

Nel tuo Dockerfile del database, devi:

1. Installare pg_cron
2. Aggiungere la configurazione a `shared_preload_libraries`
3. Specificare il database in cui gira

```dockerfile
# Nel Dockerfile del tuo database
# Dopo l'installazione di pg_cron, aggiungi la configurazione:
RUN echo "shared_preload_libraries = 'pg_cron'" >> /usr/share/postgresql/postgresql.conf.sample
RUN echo "cron.database_name = 'parcheggio'" >> /usr/share/postgresql/postgresql.conf.sample
```

Oppure puoi passare i parametri via `command` nel docker-compose:

```yaml
services:
  database:
    image: postgres:16
    command: >
      postgres
      -c shared_preload_libraries=pg_cron
      -c cron.database_name=parcheggio
```

### Script di init per creare i job

Nel tuo `db-init/`, puoi aggiungere uno script SQL che viene eseguito al primo avvio:

```sql
-- file: db-init/02-cron-jobs.sql

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Pulizia prenotazioni scadute
SELECT cron.schedule('expire_reservations', '*/5 * * * *', $$
    UPDATE prenotazioni SET stato = 'scaduta'
    WHERE stato = 'attiva' AND data_ora_fine < CURRENT_TIMESTAMP
$$);

-- Pulizia sessioni
SELECT cron.schedule('cleanup_sessions', '0 * * * *', $$
    DELETE FROM sessioni WHERE expires_at < CURRENT_TIMESTAMP
$$);

-- Manutenzione notturna
SELECT cron.schedule('vacuum_tables', '0 3 * * *', $$
    VACUUM ANALYZE prenotazioni;
    VACUUM ANALYZE sessioni;
$$);
```

**Nota**: il file si chiama `02-` perche' Docker esegue gli script init in ordine alfabetico. Il tuo `01-init.sql` crea le tabelle, `02-cron-jobs.sql` crea i job che operano su quelle tabelle.

---

## 7. Errori comuni e debugging

### "pg_cron can only be loaded via shared_preload_libraries"
**Causa**: non hai aggiunto `pg_cron` a `shared_preload_libraries` prima di `CREATE EXTENSION`.
**Soluzione**: modifica postgresql.conf e riavvia il server.

### Job schedulato ma non esegue
**Verifica**:
```sql
-- Il job e' attivo?
SELECT jobname, active FROM cron.job;

-- Ci sono errori nelle esecuzioni?
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC LIMIT 5;
```
**Causa comune**: il database specificato in `cron.database_name` non e' quello in cui hai creato il job.

### "permission denied for schema cron"
**Causa**: l'utente che crea il job non ha i permessi. pg_cron di default funziona solo per il superuser.
**Soluzione**: per dare accesso ad altri utenti:
```sql
GRANT USAGE ON SCHEMA cron TO nome_utente;
GRANT SELECT, INSERT, DELETE ON cron.job TO nome_utente;
```

### Job sovrapposti (overlap)
Se un job dura piu' del suo intervallo (es. un job ogni 5 min che impiega 7 min), pg_cron **non lancia una seconda istanza** -- salta l'esecuzione. Lo trovi nei log come "skipping".

---

## 8. Domande di autovalutazione

Rispondi senza guardare la documentazione:

1. **Concettuale**: Perche' pg_cron richiede `shared_preload_libraries` mentre altre estensioni (come pgcrypto) no?

2. **Pratica**: Scrivi il pattern cron per "ogni lunedi' e mercoledi' alle 14:30".

3. **Debug**: Un job e' schedulato ma `cron.job_run_details` e' vuota. Elenca almeno 3 possibili cause.

4. **Architettura**: Nel progetto Parcheggio, il servizio Python potrebbe fare la stessa pulizia delle prenotazioni scadute con un loop `asyncio.sleep(300)`. Quali sono vantaggi e svantaggi di pg_cron rispetto a questa soluzione?

5. **Docker**: Perche' la configurazione pg_cron va nel Dockerfile o nel `command` del docker-compose, e non in uno script `db-init/`?

6. **Avanzata**: Hai un job che fa `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stats`. Un utente lancia una query sulla stessa vista nello stesso istante. Cosa succede? La query si blocca?

---

> **Prossimo passo**: una volta che hai completato gli esercizi e risposto alle domande, passa al file `02-pgvector-teoria-pratica.md`.
