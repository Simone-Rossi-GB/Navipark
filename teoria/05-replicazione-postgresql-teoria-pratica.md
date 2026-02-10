# Replicazione PostgreSQL -- Teoria e Pratica con Docker

## Indice
1. [Teoria fondamentale: perche' replicare](#1-teoria-fondamentale-perche-replicare)
2. [WAL: il cuore della replicazione](#2-wal-il-cuore-della-replicazione)
3. [Tipi di replicazione](#3-tipi-di-replicazione)
4. [Architettura Primary-Replica](#4-architettura-primary-replica)
5. [Configurazione passo per passo](#5-configurazione-passo-per-passo)
6. [Esercizi pratici isolati](#6-esercizi-pratici-isolati)
7. [Contesto nel progetto Parcheggio + Docker](#7-contesto-nel-progetto-parcheggio--docker)
8. [Failover e alta disponibilita'](#8-failover-e-alta-disponibilita)
9. [Errori comuni e debugging](#9-errori-comuni-e-debugging)
10. [Domande di autovalutazione](#10-domande-di-autovalutazione)

---

## 1. Teoria fondamentale: perche' replicare

### Il problema del singolo server

Un database su un solo server ha tre problemi fondamentali:

**1. Single Point of Failure (SPOF)**
Se il server muore (hardware, crash, corruzione disco), il database e' perso.

**2. Collo di bottiglia in lettura**
Se 1000 utenti fanno query contemporaneamente, un solo server puo' non bastare. Le query analitiche pesanti (report, aggregazioni) rallentano le query operative (prenotazioni).

**3. Backup a freddo**
Per fare un backup consistente devi fermare le scritture o usare snapshot, che comunque impattano le performance.

### La replicazione risolve tutti e tre

```
                     Scritture (INSERT, UPDATE, DELETE)
                              |
                              v
                     +------------------+
                     | PRIMARY (master) |
                     +------------------+
                        |          |
           WAL stream   |          |   WAL stream
                        v          v
               +-----------+  +-----------+
               | REPLICA 1 |  | REPLICA 2 |
               | (read-only)|  | (read-only)|
               +-----------+  +-----------+
                  ^               ^
                  |               |
              Letture          Letture
           (query utente)   (report/analytics)
```

**Alta disponibilita'**: se il primary muore, una replica viene promossa a primary.
**Read scaling**: le letture vengono distribuite su piu' server.
**Backup continuo**: la replica e' un backup aggiornato in tempo reale.

---

## 2. WAL: il cuore della replicazione

### Cos'e' il WAL (Write-Ahead Log)

Il WAL e' un log sequenziale dove PostgreSQL scrive **ogni modifica** prima di applicarla alle tabelle. E' il principio del "write-ahead": scrivi nel log prima, poi nel dato.

**Perche'?** Se il server crasha dopo aver scritto nel WAL ma prima di aggiornare la tabella, al riavvio PostgreSQL "riproduce" il WAL e recupera le modifiche. Nessun dato perso.

### Come funziona

```
1. Utente: INSERT INTO prenotazioni VALUES (...)
2. PostgreSQL scrive nel WAL: "Record WAL: INSERT tabella=prenotazioni, riga=..."
3. PostgreSQL conferma la transazione al client (COMMIT)
4. (Asincrono) PostgreSQL applica la modifica ai file della tabella su disco

Se crash tra 3 e 4:
    - Il WAL ha il record
    - Al riavvio, PostgreSQL re-applica dal WAL
    - Nessun dato perso
```

### WAL e replicazione

L'idea geniale: se il WAL contiene **tutte le modifiche**, basta inviarlo a un altro server che lo "riproduce" per ottenere una copia identica del database.

```
Primary:
    [WAL Record 1: INSERT prenotazione X]
    [WAL Record 2: UPDATE posto Y]
    [WAL Record 3: DELETE sessione Z]
         |
         | streaming continuo
         v
Replica:
    Riceve Record 1 --> applica INSERT --> ha prenotazione X
    Riceve Record 2 --> applica UPDATE --> posto Y aggiornato
    Riceve Record 3 --> applica DELETE --> sessione Z eliminata
```

### Livelli di WAL (wal_level)

PostgreSQL puo' scrivere diversi livelli di dettaglio nel WAL:

| Livello | Dettaglio | Uso |
|---------|-----------|-----|
| `minimal` | Solo per crash recovery | Default, nessuna replicazione |
| `replica` | Abbastanza per replicazione streaming | **Quello che ci serve** |
| `logical` | Include informazioni logiche (tabella, colonne) | Per replicazione logica (selettiva) |

```ini
# postgresql.conf
wal_level = replica
```

### Segmenti WAL

Il WAL non e' un unico file infinito. E' diviso in **segmenti** da 16MB ciascuno (default). PostgreSQL ruota i segmenti: quando uno e' pieno, ne crea uno nuovo. I vecchi vengono riciclati o archiviati.

```
pg_wal/
    000000010000000000000001   (16MB)
    000000010000000000000002   (16MB)
    000000010000000000000003   (16MB)  <-- attualmente in scrittura
```

---

## 3. Tipi di replicazione

### Replicazione Fisica (Streaming Replication)

**Come funziona**: la replica riceve i record WAL grezzi dal primary e li applica bit per bit. La replica e' una copia **identica** dell'intero cluster PostgreSQL.

```
Primary WAL bytes --> rete --> Replica applica bytes identici
```

**Caratteristiche**:
- Replica TUTTO: tutte le tabelle, tutti i database, tutti gli schemi
- La replica e' read-only (Hot Standby)
- Semplicita' di setup
- **Questo e' quello che useremo nel progetto**

### Replicazione Logica

**Come funziona**: il primary decodifica il WAL in operazioni logiche (INSERT, UPDATE, DELETE su specifiche tabelle) e le invia alla replica.

```
Primary: "INSERT INTO prenotazioni (id, stato) VALUES (1, 'attiva')"
    --> Decodifica logica
    --> Invia operazione SQL
Replica: esegue l'INSERT
```

**Caratteristiche**:
- Puo' replicare solo specifiche tabelle
- La replica puo' avere tabelle aggiuntive (non identica al primary)
- La replica puo' essere writable
- Setup piu' complesso
- Utile per: migrazione tra versioni, replicazione parziale

### Sincrona vs Asincrona

**Asincrona** (default):
```
Primary: COMMIT --> rispondi al client --> invia WAL alla replica (dopo)
```
- Piu' veloce (il client non aspetta la replica)
- Rischio: se il primary crasha DOPO il commit ma PRIMA di inviare alla replica, quel commit e' perso sulla replica

**Sincrona**:
```
Primary: COMMIT --> invia WAL alla replica --> replica conferma --> rispondi al client
```
- Piu' lento (il client aspetta la replica)
- Garanzia: ogni commit confermato esiste anche sulla replica
- Zero data loss

### Quale scegliere per il progetto?

| Requisito | Scelta |
|-----------|--------|
| Progetto scolastico, semplicita' | Fisica asincrona |
| Produzione, dati critici | Fisica sincrona |
| Replicazione selettiva | Logica |

**Per il tuo progetto: replicazione fisica asincrona.** E' la piu' semplice e ti insegna tutti i concetti fondamentali.

---

## 4. Architettura Primary-Replica

### Componenti

```
PRIMARY SERVER
    |
    +-- postgresql.conf
    |     wal_level = replica
    |     max_wal_senders = 3
    |     max_replication_slots = 3
    |
    +-- pg_hba.conf
    |     host replication replicator 0.0.0.0/0 md5
    |
    +-- Ruolo 'replicator' con REPLICATION privilege
    |
    +-- Replication Slot: "replica1_slot"
    |     (tiene traccia di quanto WAL la replica ha consumato)
    |
    +-- WAL Sender process (uno per replica connessa)

REPLICA SERVER
    |
    +-- standby.signal  (file vuoto che dice "sono una replica")
    |
    +-- postgresql.auto.conf
    |     primary_conninfo = 'host=primary port=5432 user=replicator password=...'
    |     primary_slot_name = 'replica1_slot'
    |
    +-- WAL Receiver process (uno, connesso al primary)
    |
    +-- hot_standby = on  (permette query read-only)
```

### Replication Slots

Un **replication slot** e' un meccanismo del primary per ricordare "fino a dove la replica ha letto il WAL". Senza slot:

```
PROBLEMA SENZA SLOT:
1. Primary scrive WAL segment 1, 2, 3, 4
2. Replica ha letto fino al segment 2
3. Primary pensa "nessuno ha bisogno del segment 1" e lo cancella
4. Replica si disconnette e si riconnette
5. Replica chiede il segment 1... che non esiste piu'!
6. ERRORE: replicazione rotta
```

Con lo slot:
```
CON SLOT:
1. Primary scrive WAL segment 1, 2, 3, 4
2. Lo slot dice "la replica e' al segment 2"
3. Primary sa che segment 1 e 2 NON possono essere cancellati
4. Replica si riconnette, riceve segment 3 e 4
5. Tutto funziona
```

**Attenzione**: se la replica e' offline a lungo, i WAL si accumulano e il disco del primary si riempie! Monitora sempre `pg_replication_slots`.

### pg_basebackup

Per creare una replica, non puoi semplicemente copiare i file del database (sarebbero inconsistenti se il primary sta scrivendo). `pg_basebackup` e' il tool ufficiale:

1. Si connette al primary con il protocollo di replicazione
2. Chiede al primary un "checkpoint" (punto di consistenza)
3. Copia tutti i file dei dati
4. Copia il WAL generato durante la copia (per renderla consistente)
5. Con il flag `-R`: crea `standby.signal` e scrive `primary_conninfo`

```bash
pg_basebackup \
    --pgdata=/var/lib/postgresql/data \
    -R \                        # Crea standby.signal + primary_conninfo
    --slot=replica1_slot \      # Usa questo replication slot
    --host=primary_host \
    --port=5432 \
    --username=replicator
```

---

## 5. Configurazione passo per passo

### Step 1: Configurare il Primary

**postgresql.conf**:
```ini
# Livello WAL sufficiente per replicazione
wal_level = replica

# Quante connessioni di replicazione accettare
max_wal_senders = 3

# Quanti slot di replicazione mantenere
max_replication_slots = 3

# Permetti query read-only sulle repliche
hot_standby = on

# Accetta connessioni da qualsiasi IP
listen_addresses = '*'
```

**pg_hba.conf** (autenticazione):
```
# Permetti all'utente 'replicator' di connettersi per replicazione
# da qualsiasi IP, con password
host    replication    replicator    0.0.0.0/0    md5
```

### Step 2: Creare l'utente di replicazione

```sql
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replicator_password';
```

**REPLICATION** e' un privilegio speciale che permette di usare il protocollo di replicazione WAL. Non e' un superuser.

### Step 3: Creare il Replication Slot

```sql
SELECT pg_create_physical_replication_slot('replica1_slot');
```

### Step 4: Inizializzare la Replica

```bash
# La directory dati della replica deve essere VUOTA
rm -rf /var/lib/postgresql/data/*

# Clona dal primary
PGPASSWORD=replicator_password pg_basebackup \
    --pgdata=/var/lib/postgresql/data \
    -R \
    --slot=replica1_slot \
    --host=primary_host \
    --port=5432 \
    --username=replicator

# pg_basebackup ha creato:
# - Copia completa dei dati
# - standby.signal (file vuoto)
# - postgresql.auto.conf con primary_conninfo e primary_slot_name
```

### Step 5: Avviare la Replica

```bash
pg_ctl start -D /var/lib/postgresql/data
# Oppure in Docker: il container si avvia e PostgreSQL vede standby.signal
```

### Step 6: Verificare

Sul primary:
```sql
-- Vedi le repliche connesse
SELECT client_addr, state, sent_lsn, replay_lsn,
       (sent_lsn - replay_lsn) AS replication_lag
FROM pg_stat_replication;
```

Sulla replica:
```sql
-- Verifica che sono in recovery (replica mode)
SELECT pg_is_in_recovery();  -- Deve essere TRUE

-- Verifica il ritardo
SELECT NOW() - pg_last_xact_replay_timestamp() AS replication_delay;
```

---

## 6. Esercizi pratici isolati

### Esercizio 1: Capire il WAL

**Obiettivo**: vedere il WAL in azione.

```sql
-- Sul primary, attiva pg_stat_statements se disponibile
-- Altrimenti usa questa query per vedere l'attivita' WAL:

-- Posizione attuale nel WAL
SELECT pg_current_wal_lsn();

-- Fai un INSERT
INSERT INTO prenotazioni (utente_id, parcheggio_id, posto_id, targa, data_ora_inizio, data_ora_fine)
VALUES (...);

-- Posizione dopo l'INSERT
SELECT pg_current_wal_lsn();
-- Nota: l'LSN e' avanzato! L'INSERT ha generato record WAL.
```

**LSN** = Log Sequence Number. E' un indirizzo nel WAL (formato: `0/16B7488`). Piu' operazioni fai, piu' avanza.

**Compiti**:
1. Confronta l'LSN prima e dopo un INSERT singolo
2. Confronta prima e dopo un INSERT di 10.000 righe
3. Quale genera piu' WAL? Perche'?

---

### Esercizio 2: Setup replicazione con Docker Compose (locale)

**Obiettivo**: creare un setup primary-replica funzionante.

Crea questa struttura di file:

```
replication-lab/
    docker-compose.yml
    primary-init/
        01-setup-replication.sh
    replica-entrypoint.sh
```

**docker-compose.yml**:
```yaml
services:
  primary:
    image: postgres:16
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin_password
      POSTGRES_DB: testdb
    ports:
      - "5432:5432"
    volumes:
      - primary_data:/var/lib/postgresql/data
      - ./primary-init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - repl_network

  replica:
    image: postgres:16
    depends_on:
      primary:
        condition: service_healthy
    ports:
      - "5433:5432"
    volumes:
      - replica_data:/var/lib/postgresql/data
      - ./replica-entrypoint.sh:/entrypoint.sh:ro
    entrypoint: ["/bin/bash", "/entrypoint.sh"]
    environment:
      PGPASSWORD: replicator_password
    networks:
      - repl_network

volumes:
  primary_data:
  replica_data:

networks:
  repl_network:
    driver: bridge
```

**primary-init/01-setup-replication.sh**:
```bash
#!/bin/bash
set -e

# Crea utente replicazione
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replicator_password';
    SELECT pg_create_physical_replication_slot('replica1_slot');
EOSQL

# Configura PostgreSQL per replicazione
cat >> /var/lib/postgresql/data/postgresql.conf <<EOF
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
hot_standby = on
EOF

# Permetti connessioni di replicazione
echo "host replication replicator 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf

# Ricarica configurazione
pg_ctl reload -D /var/lib/postgresql/data
```

**replica-entrypoint.sh**:
```bash
#!/bin/bash
set -e

# Pulisci la directory dati
rm -rf /var/lib/postgresql/data/*

echo "Aspetto il primary..."
until pg_basebackup \
    --pgdata=/var/lib/postgresql/data \
    -R \
    --slot=replica1_slot \
    --host=primary \
    --port=5432 \
    --username=replicator
do
    echo "Primary non pronto, riprovo tra 3 secondi..."
    sleep 3
done

echo "Base backup completato!"

# Correggi permessi (PostgreSQL e' pignolo)
chmod 0700 /var/lib/postgresql/data
chown -R postgres:postgres /var/lib/postgresql/data

# Avvia PostgreSQL come utente postgres
exec gosu postgres postgres
```

**Compiti**:
1. Crea i file e lancia: `docker compose up`
2. Verifica i log: il primary si avvia, la replica fa pg_basebackup, poi si connette
3. Connettiti al primary (porta 5432) e crea una tabella:
   ```sql
   CREATE TABLE test_repl (id SERIAL, msg TEXT);
   INSERT INTO test_repl (msg) VALUES ('ciao dalla primary!');
   ```
4. Connettiti alla replica (porta 5433) e verifica:
   ```sql
   SELECT * FROM test_repl;  -- Deve mostrare 'ciao dalla primary!'
   ```
5. Prova a scrivere sulla replica:
   ```sql
   INSERT INTO test_repl (msg) VALUES ('ciao dalla replica!');
   -- ERRORE: cannot execute INSERT in a read-only transaction
   ```

---

### Esercizio 3: Monitorare la replicazione

**Obiettivo**: capire come verificare che la replicazione funziona.

```sql
-- SUL PRIMARY:

-- 1. Repliche connesse
SELECT
    application_name,
    client_addr,
    state,               -- 'streaming' = sta funzionando
    sent_lsn,            -- Fino a dove ho inviato
    write_lsn,           -- Fino a dove la replica ha scritto
    flush_lsn,           -- Fino a dove la replica ha flushato su disco
    replay_lsn,          -- Fino a dove la replica ha applicato
    (sent_lsn - replay_lsn) AS bytes_lag  -- Ritardo in bytes
FROM pg_stat_replication;

-- 2. Stato degli slot
SELECT
    slot_name,
    active,                              -- La replica e' connessa?
    pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS retained_bytes
FROM pg_replication_slots;

-- SULLA REPLICA:

-- 3. Sono in recovery?
SELECT pg_is_in_recovery();  -- TRUE = sono una replica

-- 4. Quanto ritardo ho?
SELECT
    NOW() - pg_last_xact_replay_timestamp() AS delay,
    pg_last_wal_receive_lsn() AS last_received,
    pg_last_wal_replay_lsn() AS last_replayed;
```

**Compiti**:
1. Esegui queste query mentre fai INSERT massicci sul primary
2. Osserva come `bytes_lag` cresce e poi torna a zero
3. Osserva il `delay` sulla replica: con pochi dati dovrebbe essere < 1 secondo

---

### Esercizio 4: Replication Slot e rischi

**Obiettivo**: capire il pericolo dei replication slot.

```sql
-- Sul primary: verifica lo spazio WAL usato
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS retained_wal_bytes
FROM pg_replication_slots WHERE slot_name = 'replica1_slot';
```

**Compiti**:
1. Ferma la replica: `docker compose stop replica`
2. Sul primary, inserisci molti dati:
   ```sql
   INSERT INTO test_repl (msg) SELECT 'dato ' || i FROM generate_series(1, 1000000) AS i;
   ```
3. Verifica di nuovo `retained_wal_bytes`: e' cresciuto enormemente!
4. Riavvia la replica: `docker compose start replica`
5. Osserva: la replica deve recuperare tutto il WAL accumulato

**Domanda**: cosa succede se la replica resta offline per una settimana e il disco del primary si riempie di WAL? Come prevenirlo?

---

### Esercizio 5: Promuovere una replica a primary

**Obiettivo**: simulare un failover.

```sql
-- Sulla replica, verifica lo stato
SELECT pg_is_in_recovery();  -- TRUE

-- Promuovi la replica a primary (dalla riga di comando nel container)
-- pg_ctl promote -D /var/lib/postgresql/data

-- Oppure da SQL:
SELECT pg_promote();

-- Verifica
SELECT pg_is_in_recovery();  -- FALSE! Ora sono un primary!

-- Ora puoi scrivere!
INSERT INTO test_repl (msg) VALUES ('scritto sulla ex-replica!');
```

**ATTENZIONE**: dopo la promozione, il vecchio primary e la nuova primary hanno "storie divergenti" dal punto della promozione. Non puoi semplicemente riconnettere il vecchio primary come replica. Serve `pg_rewind` o un nuovo `pg_basebackup`.

**Domanda**: in un sistema di produzione, chi decide quando promuovere una replica? Manualmente? Automaticamente? (Suggerimento: strumenti come Patroni, Stolon, repmgr.)

---

## 7. Contesto nel progetto Parcheggio + Docker

### Perche' la replicazione nel tuo progetto

1. **Read Scaling**: il servizio Python fa query analitiche pesanti. Se le fa sulla replica, non rallenta il PHP che serve gli utenti.
2. **Backup continuo**: la replica e' un backup live. Se il primary crasha, promuovi la replica.
3. **Zero-downtime maintenance**: puoi fare VACUUM FULL sulla replica (che blocca la tabella) senza impattare il primary.

### Architettura con replicazione

```
                 PHP API (scritture + letture veloci)
                      |
                      v
              +------------------+
              |    PRIMARY       |
              | (porta 5433)     |
              | Tutte le         |
              | estensioni:      |
              | pgvector, pgml,  |
              | pg_cron, duckdb  |
              +------------------+
                      |
                WAL streaming
                      |
                      v
              +------------------+
              |    REPLICA       |
              | (porta 5434)     |
              | Read-only        |
              | Stesse estensioni|
              +------------------+
                      ^
                      |
              Python FastAPI
              (analytics, report,
               query SUMO pesanti)
```

### Modifiche al docker-compose.yml

Il tuo docker-compose attuale ha un servizio `database`. Dovresti:

1. Rinominarlo in `postgres_primary`
2. Aggiungere `postgres_replica`
3. Configurare il primary per la replicazione
4. Aggiungere il replication entrypoint per la replica

### Configurazione delle estensioni sulla replica

Le estensioni installate sul primary sono automaticamente disponibili sulla replica (la replica e' una copia fisica identica). Ma:

- **pg_cron**: gira SOLO sul primary (il background worker non si attiva sulla replica)
- **pgml**: `pgml.train()` SOLO sul primary. `pgml.predict()` funziona sulla replica (read-only)
- **pgvector**: funziona ovunque (e' solo un tipo di dato + operatori)
- **duckdb_fdw**: funziona sulla replica SE il file DuckDB/Parquet e' accessibile (volume condiviso)

---

## 8. Failover e alta disponibilita'

### Failover manuale

```
1. Primary muore
2. Operatore verifica che la replica sia aggiornata
3. Operatore promuove la replica: pg_promote()
4. Operatore aggiorna le connessioni dei client (PHP, Python) al nuovo primary
5. Quando il vecchio primary torna, lo riconfigura come replica
```

### Failover automatico (cenni)

Strumenti come **Patroni** (di Zalando) automatizzano il failover:
- Monitorano primary e repliche via health check
- Se il primary non risponde per N secondi, promuovono la replica
- Aggiornano automaticamente le connessioni (tramite un HAProxy/pgBouncer)

Per il tuo progetto scolastico il failover manuale e' sufficiente. Ma sappi che esiste.

### Connection Pooling con PgBouncer (cenni)

In produzione non colleghi PHP/Python direttamente a PostgreSQL. Usi un **connection pooler** che:
- Mantiene un pool di connessioni aperte
- Assegna connessioni al client on-demand
- Ruota automaticamente tra primary e replica
- Riduce il numero di connessioni al DB

---

## 9. Errori comuni e debugging

### "FATAL: no pg_hba.conf entry for replication"
**Causa**: manca la riga `host replication ...` in pg_hba.conf del primary.
**Verifica**: `cat /var/lib/postgresql/data/pg_hba.conf | grep replication`

### "FATAL: replication slot replica1_slot does not exist"
**Causa**: lo slot non e' stato creato sul primary.
**Soluzione**: `SELECT pg_create_physical_replication_slot('replica1_slot');`

### pg_basebackup si blocca
**Causa comune**: il primary non ha terminato il checkpoint.
**Soluzione**: aspetta o forza: `SELECT pg_switch_wal();` sul primary.

### "requested WAL segment has already been removed"
**Causa**: la replica e' stata offline troppo a lungo e il WAL necessario e' stato cancellato.
**Soluzione**: se usi replication slot questo non dovrebbe succedere. Se succede, devi rifare pg_basebackup.

### Replica in ritardo costante
**Verifiche**:
```sql
-- Sul primary: quanto WAL genera al secondo?
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) FROM pg_stat_replication;
```
**Cause**: rete lenta tra i container, disco della replica lento, replica sovraccarica di query.

### "cannot execute INSERT in a read-only transaction"
**Non e' un errore!** E' il comportamento corretto della replica. Le repliche fisiche sono read-only.

---

## 10. Domande di autovalutazione

1. **Concettuale**: Spiega cos'e' il WAL e perche' si chiama "write-AHEAD" log. Cosa succederebbe se PostgreSQL scrivesse prima nella tabella e poi nel log?

2. **Pratica**: Disegna un diagramma che mostra il flusso di un INSERT dal client, attraverso il primary, fino alla replica. Indica ogni passaggio (WAL write, WAL send, WAL receive, WAL replay).

3. **Docker**: Perche' la replica usa `entrypoint` custom invece del normale entrypoint di postgres? Cosa fa `pg_basebackup` che il normale init non fa?

4. **Monitoraggio**: Hai una replica con `delay = 30 secondi`. E' un problema? Dipende dal caso d'uso? (Suggerimento: per un dashboard aggiornato ogni minuto, 30s di ritardo e' accettabile. Per un'applicazione finanziaria, no.)

5. **Architettura**: Nel progetto Parcheggio, quale servizio si connette al primary e quale alla replica? Giustifica.

6. **Avanzata**: Cosa succede se il primary e la replica hanno orologi non sincronizzati (NTP non configurato)? Come influisce sul calcolo del replication lag?

7. **Replication Slot**: Spiega il trade-off dei replication slot: proteggono la replica ma possono riempire il disco del primary. Come monitoreresti questo rischio?

---

> **Prossimo passo**: una volta completati gli esercizi, passa a `06-sumo-traci-teoria-pratica.md`.
