# Estensioni PostgreSQL, SUMO e Replicazione per il Progetto Parcheggio

---

## PARTE 1: SUMO e il tuo progetto

SUMO (Simulation of Urban MObility) e' un simulatore di traffico microscopico open-source del DLR tedesco. Modella singoli veicoli, pedoni e mezzi pubblici su reti stradali realistiche (importabili da OpenStreetMap).

**Perche' ti interessa**: SUMO ha un sottosistema nativo per il **parcheggio** -- definisci aree di sosta con capacita', tipi di posti, e i veicoli cercano parcheggio con rerouting automatico quando un'area e' piena. Tutto controllabile da Python via **TraCI** (Traffic Control Interface).

Il flusso dati diventa:

```
SUMO (simulazione traffico + parcheggio)
    | TraCI (Python)
PostgreSQL (storage + intelligence)
    | SQL
PHP API / Python FastAPI -> React Client
```

---

## PARTE 2: A cosa serve ogni estensione

### 1. pg_cron -- Automazione interna al database

La piu' immediata. Hai gia' nel `taskforce.txt` la pulizia delle prenotazioni scadute come task del servizio Python. Con pg_cron lo fai direttamente in PostgreSQL:

```sql
-- Ogni 5 minuti: marca le prenotazioni scadute
SELECT cron.schedule('expire_reservations', '*/5 * * * *', $$
    UPDATE prenotazioni SET stato = 'scaduta'
    WHERE stato = 'attiva' AND data_ora_fine < CURRENT_TIMESTAMP
$$);

-- Ogni ora: pulisci sessioni scadute
SELECT cron.schedule('cleanup_sessions', '0 * * * *', $$
    DELETE FROM sessioni WHERE expires_at < CURRENT_TIMESTAMP
$$);

-- Ogni notte alle 3: manutenzione tabelle ad alto churn
SELECT cron.schedule('vacuum_nightly', '0 3 * * *',
    'VACUUM ANALYZE prenotazioni');

-- Ogni 30 min: prepara statistiche occupazione per dashboard
SELECT cron.schedule('aggregate_stats', '*/30 * * * *', $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_occupancy_stats
$$);
```

**Domanda per te**: nel tuo schema attuale, cosa succede se un utente ha una prenotazione `attiva` ma `data_ora_fine` e' nel passato? Chi si occupa di cambiare lo stato? Con pg_cron elimini la dipendenza dal servizio Python per questa logica.

**Requisito tecnico**: pg_cron va aggiunto a `shared_preload_libraries` nel `postgresql.conf`. Nel tuo Dockerfile del DB dovresti aggiungere questa configurazione.

---

### 2. pgvector -- Ricerca per similarita' (raccomandazioni parcheggio)

Quando SUMO genera dati di simulazione, ogni parcheggio accumula un profilo multidimensionale: posizione geografica, tariffa, capacita', distribuzione temporale di occupazione, tipi di posti disponibili. Questi diventano **vettori**.

**Caso d'uso concreto**: un utente cerca parcheggio vicino alla stazione. Invece di un semplice `ORDER BY distanza`, puoi codificare le preferenze dell'utente (prezzo, tipo posto, storico prenotazioni) come vettore e trovare il parcheggio piu' "simile" con:

```sql
-- Operatore <=> = distanza coseno tra vettori
SELECT nome, indirizzo, tariffa_oraria,
       embedding <=> query_vector AS distanza
FROM parcheggi
ORDER BY distanza
LIMIT 5;
```

**Altro uso con SUMO**: i pattern di traffico simulati (flusso veicoli per fascia oraria per zona) diventano vettori. Puoi confrontare il pattern attuale con quelli storici per capire se il traffico e' anomalo.

**Domanda per te**: nella tua tabella `parcheggi`, hai `indirizzo` ma non `lat`/`lon`. Come pensi di geocodificare i parcheggi per usarli come componenti del vettore?

---

### 3. duckdb_fdw -- Analytics OLAP sui dati di simulazione

PostgreSQL e' ottimizzato per OLTP (tante piccole letture/scritture). Ma SUMO genera **enormi volumi di dati**: telemetria veicoli (posizione, velocita' ogni secondo), occupazione parcheggi nel tempo, eventi di arrivo/partenza.

Query come "occupazione media per ora per parcheggio negli ultimi 6 mesi di simulazione" su milioni di righe sono lente in PostgreSQL row-oriented. DuckDB e' **colonnare** e ottimizzato per queste query analitiche.

Con duckdb_fdw interroghi DuckDB direttamente da PostgreSQL:

```sql
CREATE EXTENSION duckdb_fdw;
CREATE SERVER duckdb_server FOREIGN DATA WRAPPER duckdb_fdw
    OPTIONS (database '/data/parking_analytics.duckdb');

-- Importa le tabelle DuckDB come "foreign tables"
IMPORT FOREIGN SCHEMA public FROM SERVER duckdb_server INTO analytics;

-- Ora puoi fare JOIN tra tabelle PostgreSQL e DuckDB
SELECT p.nome, a.avg_occupancy, a.peak_hour
FROM parcheggi p
JOIN analytics.occupancy_summary a ON p.id = a.parcheggio_id;
```

**Il flusso**: Python raccoglie dati da SUMO via TraCI -> li scrive in file Parquet o in DuckDB -> PostgreSQL li interroga via duckdb_fdw per report e dashboard.

**Domanda per te**: quanti timestep pensi di simulare con SUMO? Se simuli 24 ore con step di 1 secondo e 1000 veicoli, sono potenzialmente 86.400.000 record di telemetria. Capisci perche' PostgreSQL da solo non basta per l'analisi?

---

### 4. pgml -- Machine Learning nel database

pgml porta XGBoost, LightGBM e modelli Hugging Face dentro PostgreSQL. Per il tuo progetto:

**Predizione occupazione** (gia' nel tuo `taskforce.txt` come "Predizioni disponibilita"):

```sql
-- Allena un modello su dati storici di prenotazioni
SELECT * FROM pgml.train(
    'parking_occupancy_model',
    task => 'regression',
    relation_name => 'training_data_view',
    y_column_name => 'occupancy_rate',
    algorithm => 'xgboost'
);

-- Predici: quanti posti liberi martedi' alle 9?
SELECT pgml.predict(
    'parking_occupancy_model',
    ARRAY[2, 9, 150, 3.50, 0.72]
    -- [giorno_settimana, ora, capacita, tariffa, media_storica]
) AS predicted_occupancy;
```

**Con SUMO**: la simulazione genera dati sintetici di addestramento. Simuli diversi scenari (giorno feriale, weekend, evento speciale) e usi quei dati per allenare il modello predittivo. Il modello poi serve l'API PHP per dare previsioni agli utenti in tempo reale.

**Generazione embeddings** (si collega a pgvector):

```sql
-- pgml genera l'embedding, pgvector lo memorizza e lo cerca
SELECT pgml.embed('intfloat/e5-small',
    'parcheggio economico zona stazione con colonnina elettrica'
)::vector;
```

---

## PARTE 3: L'architettura integrata

```
+-----------------------------------------------------+
|                    Docker Stack                      |
|                                                      |
|  +----------+    +--------------+    +-----------+   |
|  |  React   |<---|  PHP API     |<-->|           |   |
|  |  Client  |    |  (CRUD,Auth) |    |           |   |
|  +----------+    +--------------+    |           |   |
|                                      | PostgreSQL|   |
|  +----------------------------+      |           |   |
|  |  Python FastAPI            |<-->  | pgvector  |   |
|  |  +--------------------+   |      | pgml      |   |
|  |  | SUMO (TraCI)       |---+----->| pg_cron   |   |
|  |  | Simulazione        |   |      | duckdb_fdw|   |
|  |  +--------------------+   |      |           |   |
|  |  Analytics, Report PDF    |<---->| +-------+ |   |
|  +----------------------------+      | |DuckDB | |   |
|                                      | |(files)| |   |
|                                      | +-------+ |   |
|                                      +-----------+   |
+-----------------------------------------------------+
```

**Flusso tipico**:

1. SUMO simula traffico e parcheggio -> Python (TraCI) raccoglie telemetria
2. Dati bulk -> DuckDB (Parquet). Dati operativi -> PostgreSQL
3. pg_cron aggrega statistiche, pulisce prenotazioni, refresha viste
4. pgml allena modelli predittivi sui dati storici (SUMO + reali)
5. pgvector memorizza embeddings per raccomandazioni smart
6. PHP serve l'utente: "trova parcheggio" -> pgvector + pgml.predict()
7. Python genera report analitici -> duckdb_fdw per query OLAP

---

## PARTE 4: Replicazione PostgreSQL in Docker

Per la replicazione streaming (primary -> replica read-only), servono tre componenti:

### Concetti chiave

**WAL (Write-Ahead Log)**: ogni modifica al DB viene scritta prima nel WAL. La replica "streamma" questi record dal primary e li applica. E' cosi' che resta sincronizzata.

**Replication Slot**: un "segnalibro" sul primary che tiene traccia di quanto WAL la replica ha consumato. Impedisce al primary di cancellare WAL che la replica non ha ancora ricevuto.

### Configurazione Primary (postgresql.conf)

```ini
wal_level = replica          # Scrive abbastanza info nel WAL per replicazione
max_wal_senders = 3          # Max connessioni replica simultanee
max_replication_slots = 3    # Max slot di replicazione
hot_standby = on             # Permette query read-only sulla replica
listen_addresses = '*'       # Accetta connessioni da qualsiasi IP
```

### Autenticazione (pg_hba.conf del primary)

```
host    replication    replicator    0.0.0.0/0    md5
```

### Script init del primary (`/docker-entrypoint-initdb.d/`)

```bash
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replicator_password';
    SELECT pg_create_physical_replication_slot('replication_slot');
EOSQL

cat >> /var/lib/postgresql/data/postgresql.conf <<EOF
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
hot_standby = on
EOF

echo "host replication replicator 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf
```

### Entrypoint della replica

```bash
#!/bin/bash
set -e

# Pulisci la directory dati (pg_basebackup la vuole vuota)
rm -rf /var/lib/postgresql/data/*

# Clona dal primary. Il flag -R crea standby.signal
# e scrive primary_conninfo in postgresql.auto.conf
until pg_basebackup \
    --pgdata=/var/lib/postgresql/data \
    -R \
    --slot=replication_slot \
    --host=postgres_primary \
    --port=5432 \
    --username=replicator
do
    echo 'In attesa del primary...'
    sleep 2
done

chmod 0700 /var/lib/postgresql/data
exec postgres
```

### Docker Compose (struttura)

```yaml
services:
  postgres_primary:
    image: postgres:16
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: password
      POSTGRES_DB: parcheggio
    volumes:
      - pg_primary_data:/var/lib/postgresql/data
      - ./db-init/:/docker-entrypoint-initdb.d/
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U root"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - lamp_network

  postgres_replica:
    image: postgres:16
    depends_on:
      postgres_primary:
        condition: service_healthy
    volumes:
      - pg_replica_data:/var/lib/postgresql/data
      - ./replica-entrypoint.sh:/entrypoint.sh
    entrypoint: /entrypoint.sh
    environment:
      PGPASSWORD: replicator_password
    networks:
      - lamp_network

volumes:
  pg_primary_data:
  pg_replica_data:

networks:
  lamp_network:
    driver: bridge
```

### Punti critici da ricordare

1. **`pg_basebackup` vuole una directory vuota** -- la replica deve pulire `/var/lib/postgresql/data` prima del clone
2. **Il flag `-R`** e' fondamentale: crea `standby.signal` (dice a PostgreSQL "sono una replica") e scrive `primary_conninfo` automaticamente
3. **Da PostgreSQL 12+ non esiste piu' `recovery.conf`** -- tutto va in `postgresql.conf` / `postgresql.auto.conf`
4. **I replication slot trattengono WAL** -- se la replica va offline, il WAL si accumula sul primary. Monitora `pg_replication_slots`
5. **Volumi separati** -- mai condividere un volume tra primary e replica

---

## PARTE 5: Domande per te

Ora che hai il quadro completo, rifletti su queste:

1. Nel tuo `docker-compose.yml` attuale usi `postgres:18` (arm64 per Raspberry Pi). Il Dockerfile che hai scaricato usa `postgres:16` con binari `amd64`. **Su quale architettura intendi sviluppare e deployare?** Questo influenza tutto.

2. Per la replicazione: **a cosa ti serve la replica?** Read scaling (distribuire le query di lettura)? Alta disponibilita' (failover se il primary muore)? Backup continuo? La risposta cambia la configurazione.

3. SUMO va nel container Python o in un container dedicato? Considera che SUMO ha dipendenze pesanti (librerie grafiche, binari C++).

4. Hai gia' una rete stradale (mappa) su cui simulare? SUMO puo' importare da OpenStreetMap con `netconvert`.
