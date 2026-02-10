# duckdb_fdw -- Analytics OLAP in PostgreSQL via DuckDB

## Indice
1. [Teoria fondamentale: OLTP vs OLAP](#1-teoria-fondamentale-oltp-vs-olap)
2. [Cos'e' DuckDB e perche' esiste](#2-cose-duckdb-e-perche-esiste)
3. [Foreign Data Wrappers (FDW)](#3-foreign-data-wrappers-fdw)
4. [Formato Parquet](#4-formato-parquet)
5. [Sintassi e configurazione duckdb_fdw](#5-sintassi-e-configurazione-duckdb_fdw)
6. [Esercizi pratici isolati](#6-esercizi-pratici-isolati)
7. [Contesto nel progetto Parcheggio + SUMO](#7-contesto-nel-progetto-parcheggio--sumo)
8. [Errori comuni e debugging](#8-errori-comuni-e-debugging)
9. [Domande di autovalutazione](#9-domande-di-autovalutazione)

---

## 1. Teoria fondamentale: OLTP vs OLAP

### Due mondi diversi

I database servono due tipi di carichi di lavoro fondamentalmente diversi:

**OLTP (Online Transaction Processing)**:
- Tante piccole operazioni: INSERT, UPDATE, DELETE, SELECT di singole righe
- Esempio: "inserisci una nuova prenotazione", "aggiorna lo stato di un posto"
- Ottimizzato per: latenza bassa, concorrenza alta, integrita' transazionale
- **PostgreSQL e' un database OLTP**

**OLAP (Online Analytical Processing)**:
- Poche query ma ENORMI: aggregazioni su milioni di righe, GROUP BY, window functions
- Esempio: "occupazione media per ora per parcheggio negli ultimi 6 mesi"
- Ottimizzato per: throughput (byte/secondo), compressione, scansioni sequenziali
- **DuckDB e' un database OLAP**

### Perche' non basta PostgreSQL per tutto?

La differenza sta in come i dati sono organizzati su disco:

**Row-oriented (PostgreSQL)**:
```
Riga 1: | id=1 | nome="Staz" | tariffa=3.5 | capacita=200 | occupazione=0.8 |
Riga 2: | id=2 | nome="Aero" | tariffa=9.0 | capacita=500 | occupazione=0.5 |
Riga 3: | id=3 | nome="Cent" | tariffa=5.0 | capacita=300 | occupazione=0.7 |
```
Per leggere TUTTE le tariffe, devi leggere TUTTE le righe intere (anche nome, capacita, ecc.).

**Column-oriented (DuckDB)**:
```
Colonna id:          | 1 | 2 | 3 |
Colonna nome:        | "Staz" | "Aero" | "Cent" |
Colonna tariffa:     | 3.5 | 9.0 | 5.0 |
Colonna capacita:    | 200 | 500 | 300 |
Colonna occupazione: | 0.8 | 0.5 | 0.7 |
```
Per leggere TUTTE le tariffe, leggi SOLO la colonna tariffa. Meno I/O = piu' veloce.

### Numeri concreti

| Query | PostgreSQL | DuckDB | Speedup |
|-------|-----------|--------|---------|
| SELECT AVG(tariffa) FROM 10M righe | ~5 secondi | ~0.1 secondi | 50x |
| GROUP BY con 5 colonne su 50M righe | ~30 secondi | ~0.5 secondi | 60x |
| Scan sequenziale di 1 colonna su 100M righe | ~60 secondi | ~0.8 secondi | 75x |

I numeri variano molto per hardware e dati, ma l'ordine di grandezza e' questo.

### Vantaggi del colonnare

1. **Compressione superiore**: valori nella stessa colonna sono dello stesso tipo e spesso simili, si comprimono meglio (es: 1M di timestamp consecutivi si comprimono quasi a zero)
2. **Cache-friendly**: la CPU carica blocchi contigui dello stesso tipo, ottimizzando la cache L1/L2
3. **Vectorized execution**: DuckDB processa colonne intere con operazioni SIMD (una singola istruzione CPU opera su 8-16 valori simultaneamente)
4. **Skip inutile**: se la query chiede solo 2 colonne su 20, le altre 18 non vengono mai lette

---

## 2. Cos'e' DuckDB e perche' esiste

### DuckDB in breve

DuckDB e' un database analitico **embedded** (gira dentro il tuo processo, come SQLite) ma colonnare e ottimizzato per OLAP.

**Caratteristiche chiave**:
- **Zero dipendenze**: un singolo binario/libreria
- **In-process**: nessun server separato, gira dentro Python/PostgreSQL
- **SQL completo**: supporta tutto SQL standard + estensioni analitiche
- **Legge Parquet nativamente**: carica file Parquet senza importazione
- **Multi-threaded**: parallelizza le query automaticamente

### DuckDB vs altri

| | PostgreSQL | DuckDB | SQLite | ClickHouse |
|--|-----------|--------|--------|------------|
| Tipo | OLTP server | OLAP embedded | OLTP embedded | OLAP server |
| Storage | Row-oriented | Column-oriented | Row-oriented | Column-oriented |
| Concorrenza | Eccellente | Limitata | Limitata | Eccellente |
| Analitiche | Adeguato | Eccellente | Scarso | Eccellente |
| Setup | Server | Zero | Zero | Server |

### Quando usare DuckDB nel tuo progetto

- I dati OLTP (prenotazioni attive, sessioni, utenti) restano in PostgreSQL
- I dati analitici (storico prenotazioni, telemetria SUMO, log) vanno in DuckDB
- duckdb_fdw li collega: puoi fare JOIN tra dati "vivi" in PostgreSQL e storici in DuckDB

---

## 3. Foreign Data Wrappers (FDW)

### Cos'e' un FDW

Un Foreign Data Wrapper e' un meccanismo standard di PostgreSQL (SQL/MED standard ISO) che permette di accedere a **dati esterni** come se fossero tabelle locali.

```
PostgreSQL
    |
    +-- Tabelle locali (parcheggi, utenti, prenotazioni)
    |
    +-- Foreign tables (via FDW)
         |
         +-- duckdb_fdw --> File DuckDB / Parquet
         +-- postgres_fdw --> Altro server PostgreSQL
         +-- file_fdw --> File CSV
         +-- oracle_fdw --> Database Oracle
         +-- mongo_fdw --> MongoDB
```

### Architettura FDW

```
Client SQL --> PostgreSQL Query Planner
                    |
                    +-- Tabella locale? --> Storage engine PostgreSQL
                    |
                    +-- Foreign table? --> FDW Extension
                                              |
                                              +-- Traduce la query
                                              +-- La invia al sistema esterno
                                              +-- Riceve i risultati
                                              +-- Li restituisce a PostgreSQL
```

### Gerarchia degli oggetti FDW

```sql
-- 1. EXTENSION: il codice del wrapper
CREATE EXTENSION duckdb_fdw;

-- 2. SERVER: dove si trova la sorgente dati esterna
CREATE SERVER duckdb_server
    FOREIGN DATA WRAPPER duckdb_fdw
    OPTIONS (database '/data/analytics.duckdb');

-- 3. USER MAPPING: credenziali per connettersi (non sempre necessario)
CREATE USER MAPPING FOR current_user
    SERVER duckdb_server;

-- 4. FOREIGN TABLE: la tabella visibile in PostgreSQL
CREATE FOREIGN TABLE ft_reservations (
    id INTEGER,
    parcheggio_id UUID,
    data_inizio TIMESTAMP,
    occupazione FLOAT
) SERVER duckdb_server
OPTIONS (table 'historical_reservations');

-- Oppure: importa tutte le tabelle automaticamente
IMPORT FOREIGN SCHEMA public FROM SERVER duckdb_server INTO analytics;
```

### Pushdown

Un concetto fondamentale: il **pushdown** e' la capacita' del FDW di "spingere" filtri e aggregazioni verso il sistema esterno, invece di caricare tutti i dati e filtrarli in PostgreSQL.

```sql
-- Se il FDW supporta pushdown:
SELECT AVG(occupazione) FROM ft_reservations WHERE data_inizio > '2025-01-01';
-- DuckDB esegue il filtro E l'aggregazione -> restituisce UN SOLO numero

-- Se il FDW NON supporta pushdown:
-- PostgreSQL carica TUTTE le righe da DuckDB, poi filtra e aggrega localmente
-- Molto piu' lento!
```

duckdb_fdw supporta pushdown per WHERE, ORDER BY, LIMIT, e aggregazioni di base.

---

## 4. Formato Parquet

### Cos'e' Parquet

Apache Parquet e' un formato file **colonnare** e **compresso** progettato per big data. E' lo standard de facto per data lake.

### Struttura di un file Parquet

```
File Parquet
    |
    +-- Row Group 1 (es: prime 100.000 righe)
    |    +-- Column Chunk: id        [compresso]
    |    +-- Column Chunk: nome      [compresso]
    |    +-- Column Chunk: tariffa   [compresso]
    |    +-- Column Chunk: timestamp [compresso]
    |
    +-- Row Group 2 (prossime 100.000 righe)
    |    +-- Column Chunk: id        [compresso]
    |    +-- ...
    |
    +-- Footer (metadata: schema, statistiche per colonna, offset)
```

### Perche' Parquet e' importante per il tuo progetto

1. **SUMO produce output enormi**: migliaia di veicoli per migliaia di timestep. Parquet comprime questi dati 5-10x rispetto a CSV.
2. **Query selettive**: se chiedi solo la colonna "occupazione", DuckDB legge solo quella colonna dal Parquet. Con CSV leggerebbe tutto.
3. **Statistiche nel footer**: il footer contiene min/max per ogni colonna per ogni row group. Se cerchi `tariffa > 10` e il max di un row group e' 8, quell'intero row group viene saltato senza leggerlo.

### Come creare file Parquet

**Da Python** (il modo piu' comune nel tuo progetto):
```python
import pandas as pd

# Da DataFrame
df = pd.DataFrame({
    'parcheggio_id': [1, 1, 2, 2],
    'ora': [8, 9, 8, 9],
    'occupazione': [0.3, 0.7, 0.5, 0.8]
})
df.to_parquet('/data/occupazione.parquet')
```

**Da DuckDB**:
```sql
COPY (SELECT * FROM tabella) TO '/data/output.parquet' (FORMAT PARQUET);
```

---

## 5. Sintassi e configurazione duckdb_fdw

### Setup completo

```sql
-- 1. Crea l'estensione
CREATE EXTENSION duckdb_fdw;

-- 2. Crea il server (puntando a un file DuckDB)
CREATE SERVER duckdb_server
    FOREIGN DATA WRAPPER duckdb_fdw
    OPTIONS (database '/data/analytics.duckdb');

-- 3. User mapping
CREATE USER MAPPING FOR current_user SERVER duckdb_server;

-- 4. Crea uno schema dedicato (buona pratica: non mischiare con public)
CREATE SCHEMA IF NOT EXISTS analytics;

-- 5a. Importa tutte le tabelle
IMPORT FOREIGN SCHEMA public FROM SERVER duckdb_server INTO analytics;

-- 5b. Oppure crea foreign table manualmente
CREATE FOREIGN TABLE analytics.storico_prenotazioni (
    id BIGINT,
    parcheggio_id TEXT,
    data_ora_inizio TIMESTAMP,
    data_ora_fine TIMESTAMP,
    occupazione_percentuale FLOAT
) SERVER duckdb_server
OPTIONS (table 'storico_prenotazioni');
```

### Query su foreign tables

```sql
-- Le foreign table si usano ESATTAMENTE come tabelle normali
SELECT * FROM analytics.storico_prenotazioni LIMIT 10;

-- JOIN tra tabella locale e foreign table
SELECT p.nome, AVG(s.occupazione_percentuale) AS occ_media
FROM parcheggi p
JOIN analytics.storico_prenotazioni s
    ON p.id::text = s.parcheggio_id
GROUP BY p.nome
ORDER BY occ_media DESC;

-- Aggregazioni (vengono pushate a DuckDB se supportato)
SELECT DATE_TRUNC('hour', data_ora_inizio) AS fascia,
       COUNT(*) AS prenotazioni,
       AVG(occupazione_percentuale) AS occ_media
FROM analytics.storico_prenotazioni
GROUP BY fascia
ORDER BY fascia;
```

### Leggere Parquet direttamente

DuckDB puo' leggere file Parquet. Quindi dentro DuckDB puoi creare una vista:

```sql
-- Dentro DuckDB (non PostgreSQL):
CREATE VIEW storico_prenotazioni AS
SELECT * FROM read_parquet('/data/prenotazioni_*.parquet');

-- Ora questa vista e' accessibile da PostgreSQL via duckdb_fdw
```

---

## 6. Esercizi pratici isolati

### Esercizio 1: Capire la differenza OLTP vs OLAP

**Obiettivo**: toccare con mano la differenza di performance.

```sql
-- In PostgreSQL, crea una tabella con molti dati
CREATE TABLE sensor_data (
    id SERIAL PRIMARY KEY,
    sensor_id INTEGER,
    timestamp TIMESTAMPTZ,
    valore FLOAT,
    tipo TEXT
);

-- Inserisci 1 milione di righe di dati sintetici
INSERT INTO sensor_data (sensor_id, timestamp, valore, tipo)
SELECT
    (random() * 100)::int,
    NOW() - (random() * INTERVAL '365 days'),
    random() * 100,
    CASE WHEN random() > 0.5 THEN 'temperatura' ELSE 'umidita' END
FROM generate_series(1, 1000000);

-- Ora esegui una query analitica e misura il tempo
EXPLAIN ANALYZE
SELECT
    sensor_id,
    DATE_TRUNC('day', timestamp) AS giorno,
    tipo,
    AVG(valore) AS media,
    MAX(valore) AS massimo,
    MIN(valore) AS minimo,
    COUNT(*) AS letture
FROM sensor_data
GROUP BY sensor_id, giorno, tipo
ORDER BY sensor_id, giorno;
```

**Compiti**:
1. Quanto tempo impiega la query?
2. Nota il piano di esecuzione: vedi "Seq Scan" o "Index Scan"?
3. Aggiungi un indice: `CREATE INDEX ON sensor_data (sensor_id, timestamp);`
4. Riesegui. Migliora? (Spoiler: per aggregazioni su tanti dati, gli indici aiutano poco.)

**Domanda**: questa e' una query OLTP o OLAP? Perche'?

---

### Esercizio 2: FDW con file CSV (senza DuckDB)

**Obiettivo**: capire il concetto di FDW con un esempio semplice.

```sql
-- PostgreSQL ha un FDW nativo per file CSV
CREATE EXTENSION IF NOT EXISTS file_fdw;
CREATE SERVER csv_server FOREIGN DATA WRAPPER file_fdw;

-- Crea un file CSV (fallo dal terminale o Python)
-- File: /tmp/parcheggi_esterni.csv
-- contenuto:
-- id,nome,citta,posti
-- 1,Parcheggio Sole,Roma,150
-- 2,Parcheggio Luna,Milano,200
-- 3,Parcheggio Stella,Napoli,80

CREATE FOREIGN TABLE ft_parcheggi_csv (
    id INTEGER,
    nome TEXT,
    citta TEXT,
    posti INTEGER
) SERVER csv_server
OPTIONS (filename '/tmp/parcheggi_esterni.csv', format 'csv', header 'true');

-- Ora puoi interrogare il CSV come una tabella!
SELECT * FROM ft_parcheggi_csv;
SELECT citta, SUM(posti) FROM ft_parcheggi_csv GROUP BY citta;
```

**Domanda**: cosa succede se modifichi il file CSV mentre PostgreSQL e' in esecuzione? La foreign table vede i cambiamenti? (Risposta: si', perche' legge il file ad ogni query.)

---

### Esercizio 3: DuckDB standalone (senza PostgreSQL)

**Obiettivo**: familiarizzare con DuckDB prima di usarlo via FDW.

Prima installa DuckDB: `pip install duckdb` (Python) oppure scarica il CLI.

```python
# In Python
import duckdb

# DuckDB lavora in-memory o su file
con = duckdb.connect('/tmp/test_analytics.duckdb')

# Crea una tabella
con.execute("""
    CREATE TABLE occupazione AS
    SELECT
        (random() * 10)::INTEGER AS parcheggio_id,
        '2025-01-01'::DATE + INTERVAL (i || ' hours') AS timestamp,
        random() AS occupazione
    FROM generate_series(1, 100000) AS t(i)
""")

# Query analitica
result = con.execute("""
    SELECT
        parcheggio_id,
        DATE_TRUNC('day', timestamp) AS giorno,
        AVG(occupazione) AS occ_media,
        MAX(occupazione) AS occ_max
    FROM occupazione
    GROUP BY parcheggio_id, giorno
    ORDER BY parcheggio_id, giorno
""").fetchdf()  # Ritorna un DataFrame pandas!

print(result.head(20))

# Esporta in Parquet
con.execute("COPY occupazione TO '/tmp/occupazione.parquet' (FORMAT PARQUET)")

# Leggi Parquet direttamente (senza importare!)
result2 = con.execute("""
    SELECT COUNT(*), AVG(occupazione)
    FROM read_parquet('/tmp/occupazione.parquet')
    WHERE parcheggio_id = 5
""").fetchone()
print(f"Parcheggio 5: {result2[0]} record, media {result2[1]:.2f}")

con.close()
```

**Compiti**:
1. Esegui lo script e nota la velocita'
2. Prova a fare la stessa query in PostgreSQL sulla tabella `sensor_data` dell'esercizio 1
3. Confronta i tempi

---

### Esercizio 4: Collegare DuckDB a PostgreSQL via duckdb_fdw

**Obiettivo**: setup completo FDW.

```sql
-- Prerequisito: hai creato /tmp/test_analytics.duckdb nell'esercizio 3

-- In PostgreSQL:
CREATE EXTENSION duckdb_fdw;

CREATE SERVER analytics_server
    FOREIGN DATA WRAPPER duckdb_fdw
    OPTIONS (database '/tmp/test_analytics.duckdb');

CREATE USER MAPPING FOR current_user SERVER analytics_server;

CREATE SCHEMA analytics;
IMPORT FOREIGN SCHEMA public FROM SERVER analytics_server INTO analytics;

-- Verifica
SELECT * FROM analytics.occupazione LIMIT 10;

-- Query analitica via FDW
EXPLAIN ANALYZE
SELECT parcheggio_id, AVG(occupazione)
FROM analytics.occupazione
GROUP BY parcheggio_id
ORDER BY parcheggio_id;
```

**Compiti**:
1. La query funziona? Quanto ci mette?
2. Guarda l'EXPLAIN: vedi "Foreign Scan"? Significa che PostgreSQL delega a DuckDB.
3. Prova un JOIN con una tabella locale di PostgreSQL.

---

### Esercizio 5: Parquet come data lake

**Obiettivo**: costruire un mini data lake.

```python
import duckdb
import pandas as pd
from datetime import datetime, timedelta
import random

# Simula 7 giorni di dati da sensori parcheggio
for day_offset in range(7):
    date = datetime(2025, 1, 1) + timedelta(days=day_offset)
    date_str = date.strftime('%Y-%m-%d')

    records = []
    for hour in range(24):
        for park_id in range(1, 6):
            records.append({
                'parcheggio_id': park_id,
                'timestamp': datetime(date.year, date.month, date.day, hour),
                'occupazione': min(1.0, max(0.0,
                    0.3 + 0.5 * (hour >= 8 and hour <= 18) + random.gauss(0, 0.1)
                )),
                'ingressi': random.randint(0, 50),
                'uscite': random.randint(0, 50)
            })

    df = pd.DataFrame(records)
    # Un file Parquet per giorno (partitioned by date)
    df.to_parquet(f'/tmp/parking_data_{date_str}.parquet')

print("7 file Parquet creati!")

# Ora DuckDB li legge tutti con glob pattern
con = duckdb.connect('/tmp/test_analytics.duckdb')
con.execute("""
    CREATE OR REPLACE VIEW parking_telemetry AS
    SELECT * FROM read_parquet('/tmp/parking_data_*.parquet')
""")
con.close()
```

Ora da PostgreSQL:
```sql
-- La vista DuckDB e' accessibile via FDW
SELECT * FROM analytics.parking_telemetry LIMIT 5;

-- Heatmap: occupazione media per ora per parcheggio
SELECT
    parcheggio_id,
    EXTRACT(HOUR FROM timestamp) AS ora,
    ROUND(AVG(occupazione)::numeric, 2) AS occ_media
FROM analytics.parking_telemetry
GROUP BY parcheggio_id, ora
ORDER BY parcheggio_id, ora;
```

**Domanda**: cosa succede se aggiungi un ottavo file Parquet (`parking_data_2025-01-08.parquet`)? Devi aggiornare qualcosa in DuckDB o PostgreSQL? (Risposta: no! Il glob `*` lo cattura automaticamente.)

---

## 7. Contesto nel progetto Parcheggio + SUMO

### L'architettura dati a due livelli

```
Dati "caldi" (OLTP - PostgreSQL):
    - Prenotazioni ATTIVE
    - Sessioni utente
    - Stato corrente dei posti
    - Ultimi 7 giorni di dati

Dati "freddi" (OLAP - DuckDB/Parquet):
    - Storico prenotazioni completate/scadute
    - Telemetria SUMO (posizioni veicoli, occupazione nel tempo)
    - Log di accesso
    - Dati aggregati per report
```

### Flusso dati con SUMO

```
SUMO TraCI (Python)
    |
    | Ogni timestep: posizione veicoli, stato parcheggi
    v
Python raccoglie in DataFrame
    |
    | Fine simulazione (o ogni N minuti)
    v
Salva come Parquet: /data/sumo/sim_YYYYMMDD_HHMMSS.parquet
    |
    | DuckDB legge automaticamente (glob pattern)
    v
PostgreSQL interroga via duckdb_fdw
    |
    v
Dashboard / Report / Predizioni
```

### Migrazione dati caldi -> freddi

Con pg_cron puoi automatizzare lo spostamento:

```sql
-- Ogni notte: sposta prenotazioni completate/scadute da PostgreSQL a DuckDB
-- Fase 1 (Python): esporta da PostgreSQL a Parquet
-- Fase 2 (SQL): elimina da PostgreSQL le prenotazioni migrate

-- pg_cron innesca lo script Python:
SELECT cron.schedule('archive_old_reservations', '0 2 * * *', $$
    INSERT INTO cron_commands (command) VALUES ('archive_to_parquet')
$$);
-- Il servizio Python polling legge cron_commands e agisce
```

### Configurazione Docker

Nel docker-compose, DuckDB non ha bisogno di un container separato -- gira dentro PostgreSQL (via duckdb_fdw) e/o dentro il container Python.

Serve un **volume condiviso** per i file Parquet/DuckDB:

```yaml
volumes:
  analytics_data:

services:
  database:
    volumes:
      - analytics_data:/data/analytics  # PostgreSQL legge DuckDB/Parquet

  python-backend:
    volumes:
      - analytics_data:/data/analytics  # Python scrive Parquet da SUMO
```

---

## 8. Errori comuni e debugging

### "foreign-data wrapper duckdb_fdw does not exist"
**Causa**: l'estensione non e' installata nel sistema.
**Verifica**: `SELECT * FROM pg_available_extensions WHERE name = 'duckdb_fdw';`

### "could not open DuckDB database"
**Causa**: il path nel `CREATE SERVER` non e' corretto o i permessi file sono sbagliati.
**Verifica**: l'utente `postgres` nel container ha permessi di lettura sul file?

### JOIN lento tra tabella locale e foreign table
**Causa**: PostgreSQL scarica TUTTE le righe dalla foreign table, poi fa il JOIN localmente.
**Soluzione**: filtra il piu' possibile nella subquery sulla foreign table:

```sql
-- LENTO: PostgreSQL scarica tutto e poi filtra
SELECT p.nome, ft.occ
FROM parcheggi p
JOIN analytics.telemetria ft ON p.id::text = ft.park_id
WHERE ft.timestamp > '2025-06-01';

-- MEGLIO: filtra prima in una subquery (pushdown piu' probabile)
SELECT p.nome, sub.occ
FROM parcheggi p
JOIN (
    SELECT park_id, AVG(occupazione) AS occ
    FROM analytics.telemetria
    WHERE timestamp > '2025-06-01'
    GROUP BY park_id
) sub ON p.id::text = sub.park_id;
```

### DuckDB file locked
**Causa**: DuckDB permette un solo writer alla volta. Se Python sta scrivendo, PostgreSQL non puo' leggere.
**Soluzione**: usa `access_mode = 'read_only'` nelle opzioni del server FDW, oppure usa file Parquet separati (non un singolo .duckdb).

---

## 9. Domande di autovalutazione

1. **Concettuale**: Spiega con un disegno (anche ASCII) la differenza tra storage row-oriented e column-oriented. Perche' il colonnare e' migliore per `SELECT AVG(colonna) FROM 10M_righe`?

2. **Architettura**: Nel progetto Parcheggio, quali dati metteresti in PostgreSQL e quali in DuckDB/Parquet? Giustifica ogni scelta.

3. **FDW**: Cos'e' il "pushdown" e perche' e' critico per le performance? Come verifichi se una query viene pushata?

4. **Pratica**: Hai un file Parquet da 2GB con telemetria SUMO. Come lo rendi interrogabile da PostgreSQL senza importare i dati?

5. **SUMO**: La simulazione produce 86.400 timestep (24h * 3600 secondi) con 1000 veicoli. Ogni record ha: vehicle_id, x, y, speed, route_id, parking_id. Quanti record sono? Come li organizzeresti in file Parquet? (Per giorno? Per veicolo? Per parcheggio?)

6. **Avanzata**: Un utente della dashboard vuole vedere l'occupazione degli ultimi 30 minuti (dati "caldi") E la media storica (dati "freddi") nella stessa tabella. Scrivi la query che combina dati PostgreSQL e DuckDB.

---

> **Prossimo passo**: una volta completati gli esercizi, passa a `04-pgml-teoria-pratica.md`.
