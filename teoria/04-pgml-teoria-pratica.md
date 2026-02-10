# pgml (PostgresML) -- Machine Learning dentro PostgreSQL

## Indice
1. [Teoria fondamentale: ML per chi viene dai database](#1-teoria-fondamentale-ml-per-chi-viene-dai-database)
2. [Tipi di problemi ML](#2-tipi-di-problemi-ml)
3. [Algoritmi disponibili in pgml](#3-algoritmi-disponibili-in-pgml)
4. [Il ciclo di vita di un modello](#4-il-ciclo-di-vita-di-un-modello)
5. [Sintassi e API pgml](#5-sintassi-e-api-pgml)
6. [Esercizi pratici isolati](#6-esercizi-pratici-isolati)
7. [Contesto nel progetto Parcheggio + SUMO](#7-contesto-nel-progetto-parcheggio--sumo)
8. [Errori comuni e debugging](#8-errori-comuni-e-debugging)
9. [Domande di autovalutazione](#9-domande-di-autovalutazione)

---

## 1. Teoria fondamentale: ML per chi viene dai database

### Cos'e' il Machine Learning (in parole semplici)

Il Machine Learning e' un modo per fare **previsioni basate su dati storici** senza scrivere regole esplicite.

**Approccio tradizionale** (regole scritte a mano):
```
SE giorno = lunedi E ora = 8 E parcheggio = "Stazione":
    occupazione_prevista = "alta"
SE giorno = domenica E ora = 15 E parcheggio = "Stazione":
    occupazione_prevista = "bassa"
-- ... centinaia di regole IF/ELSE ...
```

**Approccio ML** (impara dai dati):
```
Dati storici:
  lunedi,  8:00, Stazione, occupazione=0.92
  lunedi,  9:00, Stazione, occupazione=0.95
  domenica,15:00, Stazione, occupazione=0.15
  ...10.000 record...

Modello ML: "ho trovato i pattern, ora dimmi giorno/ora/parcheggio e ti dico l'occupazione"
```

### Il problema del "data movement"

Tradizionalmente, per fare ML sui dati di un database:

```
PostgreSQL --> Esporta dati (CSV/dump)
    --> Carica in Python (pandas)
    --> Preprocessa (pulizia, normalizzazione)
    --> Allena modello (scikit-learn, XGBoost)
    --> Salva modello (.pkl)
    --> Carica modello nel servizio API
    --> Per ogni predizione: query al DB + inferenza in Python
```

Questo flusso ha problemi:
- **Dati duplicati**: i dati esistono nel DB E in Python
- **Dati stale**: se il DB si aggiorna, il modello usa dati vecchi
- **Latenza**: ogni predizione richiede una query al DB + una chiamata Python
- **Complessita'**: tanti pezzi da orchestrare

### La proposta di pgml

pgml porta TUTTO dentro PostgreSQL:

```
PostgreSQL + pgml
    --> pgml.train() allena il modello direttamente sui dati nel DB
    --> pgml.predict() fa predizioni in SQL, zero data movement
    --> Il modello e i dati vivono nello stesso posto
```

---

## 2. Tipi di problemi ML

### Regressione

**Obiettivo**: predire un **numero continuo**.

Esempio nel tuo progetto:
- **Input**: giorno della settimana, ora, parcheggio_id, meteo, evento_speciale
- **Output**: occupazione_percentuale (0.0 - 1.0)

```
Input:  [lunedi, 8, stazione, soleggiato, nessun_evento]
Output: 0.87  (87% occupazione prevista)
```

### Classificazione

**Obiettivo**: predire una **categoria**.

Esempio nel tuo progetto:
- **Input**: stesse features di prima
- **Output**: "bassa" / "media" / "alta" / "piena"

```
Input:  [lunedi, 8, stazione, soleggiato, nessun_evento]
Output: "alta"
```

### Clustering

**Obiettivo**: raggruppare dati simili **senza etichette predefinite**.

Esempio nel tuo progetto:
- **Input**: pattern di occupazione oraria di tutti i parcheggi
- **Output**: 3 cluster -> "parcheggi da pendolari", "parcheggi da shopping", "parcheggi da eventi"

### Quale usare quando?

| Problema | Tipo | Algoritmo tipico |
|----------|------|-----------------|
| Quanti posti liberi alle 9? | Regressione | XGBoost, LightGBM |
| Sara' pieno o no? | Classificazione binaria | XGBoost, Random Forest |
| Che tipo di traffico c'e'? | Classificazione multi-classe | XGBoost, LightGBM |
| Raggruppa parcheggi simili | Clustering | K-Means |
| Questa prenotazione e' sospetta? | Anomaly detection | Isolation Forest |

---

## 3. Algoritmi disponibili in pgml

### XGBoost (eXtreme Gradient Boosting)

**Cos'e'**: un insieme (ensemble) di alberi decisionali, dove ogni albero corregge gli errori del precedente.

**Intuizione**: immagina 100 studenti che rispondono alla stessa domanda. Ogni studente impara dagli errori di chi ha risposto prima. La risposta finale e' una media pesata di tutti.

**Quando usarlo**: dati tabulari (tabelle SQL). E' quasi sempre la scelta migliore per dati strutturati.

```sql
SELECT * FROM pgml.train('modello', task => 'regression', algorithm => 'xgboost', ...);
```

### LightGBM (Light Gradient Boosting Machine)

**Cos'e'**: simile a XGBoost ma con un approccio diverso alla crescita degli alberi (leaf-wise vs level-wise). Piu' veloce su dataset grandi.

**Quando usarlo**: dataset molto grandi (>100.000 righe) o quando XGBoost e' troppo lento.

```sql
SELECT * FROM pgml.train('modello', task => 'regression', algorithm => 'lightgbm', ...);
```

### Linear Regression / Logistic Regression

**Cos'e'**: il modello piu' semplice. Trova una linea (o iperpiano) che meglio approssima i dati.

**Quando usarlo**: come baseline. Se una regressione lineare gia' funziona bene, non hai bisogno di XGBoost.

```sql
SELECT * FROM pgml.train('modello', task => 'regression', algorithm => 'linear', ...);
```

### Random Forest

**Cos'e'**: tanti alberi decisionali indipendenti. Ogni albero vede un sottoinsieme casuale dei dati. La predizione finale e' la media (regressione) o il voto di maggioranza (classificazione).

**Quando usarlo**: robusto contro l'overfitting, buono come secondo modello da confrontare con XGBoost.

### Confronto rapido

| Algoritmo | Velocita' training | Accuratezza tipica | Interpretabilita' |
|-----------|-------------------|-------------------|-------------------|
| Linear | Velocissimo | Bassa-Media | Alta |
| Random Forest | Medio | Media-Alta | Media |
| XGBoost | Medio-Lento | Alta | Bassa |
| LightGBM | Veloce | Alta | Bassa |

---

## 4. Il ciclo di vita di un modello

### 1. Preparazione dei dati (Feature Engineering)

I modelli ML non capiscono "lunedi'" o "Stazione Centrale". Devi trasformare tutto in numeri.

```sql
-- Vista che prepara i dati per il training
CREATE VIEW training_data AS
SELECT
    EXTRACT(DOW FROM data_ora_inizio) AS giorno_settimana,  -- 0-6
    EXTRACT(HOUR FROM data_ora_inizio) AS ora,              -- 0-23
    p.capacita_totale,
    p.tariffa_oraria,
    -- Occupazione calcolata (variabile target)
    COUNT(*) FILTER (WHERE pr.stato = 'attiva')::FLOAT
        / NULLIF(p.capacita_totale, 0) AS occupazione_rate
FROM prenotazioni pr
JOIN parcheggi p ON pr.parcheggio_id = p.id
GROUP BY
    DATE_TRUNC('hour', data_ora_inizio),
    EXTRACT(DOW FROM data_ora_inizio),
    EXTRACT(HOUR FROM data_ora_inizio),
    p.capacita_totale,
    p.tariffa_oraria;
```

**Features** (input del modello): giorno_settimana, ora, capacita_totale, tariffa_oraria
**Target** (output da predire): occupazione_rate

### 2. Training (Allenamento)

```sql
SELECT * FROM pgml.train(
    'parking_occupancy',           -- nome del progetto
    task => 'regression',          -- tipo di problema
    relation_name => 'training_data',  -- vista/tabella con i dati
    y_column_name => 'occupazione_rate',  -- colonna target
    algorithm => 'xgboost',        -- algoritmo
    test_size => 0.2               -- 20% dati per test, 80% per training
);
```

**Cosa fa internamente pgml.train()**:
1. Legge tutti i dati dalla vista `training_data`
2. Divide in 80% training + 20% test (random)
3. Allena il modello XGBoost sui dati di training
4. Valuta sul test set e calcola le metriche
5. Salva il modello serializzato in una tabella interna
6. Restituisce le metriche

### 3. Valutazione

Dopo il training, pgml mostra metriche:

| Metrica | Significato | Valore ideale |
|---------|------------|---------------|
| r2 | Quanto il modello spiega la varianza | 1.0 (perfetto) |
| mean_absolute_error | Errore medio assoluto | 0.0 (perfetto) |
| mean_squared_error | Errore quadratico medio | 0.0 (perfetto) |

```sql
-- Vedi i modelli allenati e le loro metriche
SELECT * FROM pgml.overview;

-- Dettagli del modello migliore
SELECT * FROM pgml.deployed_models;
```

### 4. Predizione (Inferenza)

```sql
-- Predici l'occupazione per: lunedi' (1), ore 9, capacita' 200, tariffa 3.50
SELECT pgml.predict(
    'parking_occupancy',
    ARRAY[1, 9, 200, 3.50]
) AS occupazione_prevista;
```

**IMPORTANTE**: l'ordine dei valori nell'ARRAY deve corrispondere all'ordine delle colonne nella vista di training (esclusa la colonna target).

### 5. Deployment automatico

pgml tiene traccia di tutti i modelli allenati per un progetto. Quando alleni un nuovo modello, se ha metriche migliori del precedente, diventa automaticamente il modello "deployed" (usato da predict).

```sql
-- Allena un secondo modello con LightGBM
SELECT * FROM pgml.train(
    'parking_occupancy',
    task => 'regression',
    relation_name => 'training_data',
    y_column_name => 'occupazione_rate',
    algorithm => 'lightgbm'
);

-- pgml.predict() usa automaticamente il modello migliore tra i due
```

### 6. Retraining

I dati cambiano nel tempo (nuovi parcheggi, nuovi utenti, stagionalita'). Il modello va riallenato periodicamente.

```sql
-- Con pg_cron: riallena ogni settimana
SELECT cron.schedule('retrain_model', '0 4 * * 0', $$
    SELECT * FROM pgml.train(
        'parking_occupancy',
        task => 'regression',
        relation_name => 'training_data',
        y_column_name => 'occupazione_rate',
        algorithm => 'xgboost'
    )
$$);
```

---

## 5. Sintassi e API pgml

### Setup

```sql
CREATE EXTENSION pgml;
```

### pgml.train() -- Allena un modello

```sql
SELECT * FROM pgml.train(
    project_name => 'nome_progetto',
    task => 'regression',              -- o 'classification'
    relation_name => 'nome_vista',     -- tabella o vista con i dati
    y_column_name => 'colonna_target', -- cosa predire
    algorithm => 'xgboost',           -- algoritmo
    test_size => 0.25,                -- percentuale test set
    test_sampling => 'random'         -- come dividere train/test
);
```

**Algoritmi disponibili per regressione**:
`linear`, `lasso`, `elastic_net`, `ridge`, `svm`, `random_forest`, `xgboost`, `lightgbm`, `ada_boost`, `bagging`, `extra_trees`, `gradient_boosting`, `nu_svm`

**Algoritmi disponibili per classificazione**:
Stessi di sopra piu' `logistic_regression`

### pgml.predict() -- Fai una predizione

```sql
-- Singola predizione
SELECT pgml.predict('nome_progetto', ARRAY[val1, val2, val3, ...]);

-- Predizione su un set di righe
SELECT id,
       pgml.predict('nome_progetto', ARRAY[col1, col2, col3]) AS previsione
FROM tabella_input;
```

### pgml.embed() -- Genera embedding di testo

```sql
-- Genera un embedding da testo
SELECT pgml.embed('intfloat/e5-small', 'testo da embeddare');

-- Risultato: un array di float a 384 dimensioni
-- Puoi castarlo a vector per usarlo con pgvector:
SELECT pgml.embed('intfloat/e5-small', 'testo')::vector(384);
```

**Modelli di embedding disponibili** (scaricati da Hugging Face):
- `intfloat/e5-small` (384 dim, veloce)
- `intfloat/e5-base` (768 dim, bilanciato)
- `intfloat/e5-large` (1024 dim, preciso)
- `sentence-transformers/all-MiniLM-L6-v2` (384 dim, molto popolare)

### pgml.transform() -- Inference con modelli Hugging Face

```sql
-- Sentiment analysis
SELECT pgml.transform(
    task => '{"task": "text-classification"}'::JSONB,
    inputs => ARRAY['Il parcheggio e'' ottimo, molto comodo!']
);
-- Risultato: [{"label": "POSITIVE", "score": 0.98}]

-- Text generation
SELECT pgml.transform(
    task => '{"task": "text-generation"}'::JSONB,
    inputs => ARRAY['Il parcheggio ideale dovrebbe']
);
```

### pgml.overview -- Stato dei modelli

```sql
-- Tutti i progetti e il modello attualmente deployed
SELECT * FROM pgml.overview;

-- Tutti i modelli allenati per un progetto
SELECT
    models.id,
    models.algorithm,
    models.metrics
FROM pgml.models
JOIN pgml.projects ON models.project_id = projects.id
WHERE projects.name = 'parking_occupancy'
ORDER BY models.created_at DESC;
```

---

## 6. Esercizi pratici isolati

### Esercizio 1: Regressione lineare a mano (senza pgml)

**Obiettivo**: capire cosa fa un modello ML prima di usare pgml.

```sql
-- Dati: ore di studio vs voto esame
CREATE TABLE studio_voto (
    ore_studio FLOAT,
    voto FLOAT
);

INSERT INTO studio_voto VALUES
    (1, 4), (2, 5), (3, 6), (4, 6.5), (5, 7),
    (6, 7.5), (7, 8), (8, 8.5), (9, 9), (10, 9.5);

-- Regressione lineare "a mano" con SQL puro
-- Formula: voto = a * ore_studio + b
-- a = (n * SUM(x*y) - SUM(x) * SUM(y)) / (n * SUM(x^2) - SUM(x)^2)
-- b = (SUM(y) - a * SUM(x)) / n

WITH stats AS (
    SELECT
        COUNT(*) AS n,
        SUM(ore_studio) AS sum_x,
        SUM(voto) AS sum_y,
        SUM(ore_studio * voto) AS sum_xy,
        SUM(ore_studio * ore_studio) AS sum_xx
    FROM studio_voto
)
SELECT
    (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x) AS coefficiente_a,
    (sum_y - ((n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x)) * sum_x) / n AS intercetta_b
FROM stats;
```

**Compiti**:
1. Calcola a e b. Dovresti ottenere circa a=0.59, b=3.58
2. Predici: se studio 12 ore, che voto prendo? (voto = 0.59 * 12 + 3.58 = ~10.66 -- impossibile!)
3. Il modello "straborda" fuori dal range dei dati. Questo si chiama **estrapolazione** ed e' pericoloso.

**Domanda**: perche' un modello lineare non puo' catturare il fatto che il voto massimo e' 10? Quale tipo di modello servirebbe?

---

### Esercizio 2: Il tuo primo modello pgml

**Obiettivo**: allenare e usare un modello con pgml.

```sql
-- Crea dati di training: simulazione di occupazione parcheggio
CREATE TABLE occupazione_storica (
    giorno_settimana INT,    -- 0=dom, 1=lun, ..., 6=sab
    ora INT,                 -- 0-23
    capacita INT,            -- capacita' parcheggio
    tariffa FLOAT,           -- euro/ora
    occupazione_rate FLOAT   -- 0.0 - 1.0 (target)
);

-- Inserisci dati sintetici (simula 4 settimane)
INSERT INTO occupazione_storica
SELECT
    dow,
    hour,
    capacita,
    tariffa,
    -- Formula: occupazione dipende da giorno, ora e prezzo
    LEAST(1.0, GREATEST(0.0,
        0.3                                    -- base
        + 0.4 * (dow BETWEEN 1 AND 5)::int     -- feriale = +0.4
        + 0.3 * (hour BETWEEN 8 AND 18)::int   -- orario lavoro = +0.3
        - 0.1 * tariffa                        -- piu' caro = meno pieno
        + (random() - 0.5) * 0.2               -- rumore casuale
    ))
FROM
    generate_series(0, 6) AS dow,
    generate_series(0, 23) AS hour,
    (VALUES (200, 3.0), (500, 5.0), (100, 2.0)) AS p(capacita, tariffa),
    generate_series(1, 4) AS week;  -- 4 settimane

-- Verifica
SELECT COUNT(*) FROM occupazione_storica;  -- Dovrebbe essere 6 * 24 * 3 * 4 = 2016
SELECT * FROM occupazione_storica LIMIT 10;

-- Allena il modello!
SELECT * FROM pgml.train(
    'occupazione_parcheggio',
    task => 'regression',
    relation_name => 'occupazione_storica',
    y_column_name => 'occupazione_rate',
    algorithm => 'xgboost',
    test_size => 0.2
);

-- Fai una predizione: lunedi (1), ore 9, capacita 200, tariffa 3.0
SELECT pgml.predict(
    'occupazione_parcheggio',
    ARRAY[1, 9, 200, 3.0]
) AS previsione;
-- Dovrebbe essere circa 0.8-0.9 (feriale + orario lavoro + economico)

-- Confronta: domenica (0), ore 22, capacita 200, tariffa 3.0
SELECT pgml.predict(
    'occupazione_parcheggio',
    ARRAY[0, 22, 200, 3.0]
) AS previsione;
-- Dovrebbe essere circa 0.1-0.3 (festivo + notte)
```

**Compiti**:
1. Le predizioni hanno senso? Confronta con la formula usata per generare i dati.
2. Allena lo stesso modello con `algorithm => 'linear'`. Le metriche migliorano o peggiorano?
3. Allena con `algorithm => 'lightgbm'`. Chi vince tra i tre?
4. Controlla: `SELECT * FROM pgml.overview;`

---

### Esercizio 3: Classificazione

**Obiettivo**: predire una categoria invece di un numero.

```sql
-- Aggiungi una colonna categorica
CREATE VIEW occupazione_classificata AS
SELECT
    giorno_settimana, ora, capacita, tariffa,
    CASE
        WHEN occupazione_rate < 0.3 THEN 'bassa'
        WHEN occupazione_rate < 0.7 THEN 'media'
        ELSE 'alta'
    END AS livello_occupazione
FROM occupazione_storica;

-- Allena un classificatore
SELECT * FROM pgml.train(
    'livello_occupazione',
    task => 'classification',
    relation_name => 'occupazione_classificata',
    y_column_name => 'livello_occupazione',
    algorithm => 'xgboost'
);

-- Predici
SELECT pgml.predict(
    'livello_occupazione',
    ARRAY[1, 9, 200, 3.0]
) AS livello;
-- Dovrebbe predire 'alta'
```

**Domanda**: il risultato di `pgml.predict()` per classificazione e' un numero (indice della classe) o una stringa? Come mappi il numero alla classe?

---

### Esercizio 4: Feature engineering

**Obiettivo**: capire come le features influenzano la qualita' del modello.

```sql
-- Vista con features MINIME
CREATE VIEW features_minime AS
SELECT ora, occupazione_rate FROM occupazione_storica;

-- Vista con features RICCHE
CREATE VIEW features_ricche AS
SELECT
    giorno_settimana,
    ora,
    capacita,
    tariffa,
    -- Feature derivate:
    (giorno_settimana BETWEEN 1 AND 5)::int AS e_feriale,
    (ora BETWEEN 7 AND 9)::int AS e_rush_mattina,
    (ora BETWEEN 17 AND 19)::int AS e_rush_sera,
    (ora BETWEEN 8 AND 18)::int AS e_orario_lavoro,
    ABS(ora - 13) AS distanza_da_mezzogiorno,
    occupazione_rate
FROM occupazione_storica;

-- Allena su features minime
SELECT * FROM pgml.train(
    'test_features_minime',
    task => 'regression',
    relation_name => 'features_minime',
    y_column_name => 'occupazione_rate',
    algorithm => 'xgboost'
);

-- Allena su features ricche
SELECT * FROM pgml.train(
    'test_features_ricche',
    task => 'regression',
    relation_name => 'features_ricche',
    y_column_name => 'occupazione_rate',
    algorithm => 'xgboost'
);
```

**Compiti**:
1. Confronta le metriche (r2, MAE). Le features ricche dovrebbero essere nettamente migliori.
2. Perche' `e_feriale` come feature esplicita aiuta, anche se `giorno_settimana` gia' contiene la stessa informazione? (Suggerimento: l'albero decisionale puo' fare split su `e_feriale=0 vs 1` con un solo split, ma per ottenere lo stesso effetto da `giorno_settimana` ne servono multipli.)

---

### Esercizio 5: Embedding con pgml + pgvector

**Obiettivo**: collegare pgml e pgvector per raccomandazioni.

```sql
-- Prerequisito: CREATE EXTENSION vector; CREATE EXTENSION pgml;

-- Genera embedding per descrizioni di parcheggi
CREATE TABLE park_descriptions (
    id SERIAL PRIMARY KEY,
    nome TEXT,
    descrizione TEXT,
    embedding vector(384)
);

INSERT INTO park_descriptions (nome, descrizione) VALUES
    ('Stazione', 'Parcheggio economico vicino alla stazione ferroviaria, ideale per pendolari'),
    ('Centro', 'Parcheggio in centro citta, comodo per shopping e ristoranti'),
    ('Ospedale', 'Parcheggio adiacente all ospedale, tariffe agevolate per pazienti'),
    ('Stadio', 'Grande parcheggio vicino allo stadio, aperto nei giorni di partita'),
    ('Aeroporto', 'Parcheggio lunga sosta aeroporto, navetta gratuita per il terminal');

-- Genera e salva gli embedding
UPDATE park_descriptions
SET embedding = pgml.embed('intfloat/e5-small', descrizione)::vector(384);

-- Cerca: "devo parcheggiare per prendere il treno"
SELECT nome, descrizione,
       embedding <=> pgml.embed('intfloat/e5-small', 'devo parcheggiare per prendere il treno')::vector(384) AS distanza
FROM park_descriptions
ORDER BY distanza
LIMIT 3;
```

**Domanda**: il risultato ha senso? "Stazione" dovrebbe essere il piu' vicino perche' semanticamente correlato a "treno". Cosa succede se cerchi "partita di calcio"?

---

## 7. Contesto nel progetto Parcheggio + SUMO

### I 3 modelli da allenare

**Modello 1: Previsione occupazione** (gia' nel taskforce.txt)
```
Input: giorno, ora, parcheggio, meteo, eventi
Output: percentuale occupazione prevista
Task: regression
Algoritmo: xgboost
Retraining: settimanale
```

**Modello 2: Durata prenotazione**
```
Input: utente (storico), parcheggio, giorno, ora di arrivo
Output: durata prevista in minuti
Task: regression
Algoritmo: xgboost
Uso: ottimizzare turnover, rilevare no-show probabili
```

**Modello 3: Classificazione traffico** (dai dati SUMO)
```
Input: flusso veicoli/minuto, occupazione attuale, ora, giorno
Output: "fluido" / "moderato" / "congestionato" / "bloccato"
Task: classification
Algoritmo: xgboost
Uso: avvisare l'utente prima che prenoti ("traffico alto nella zona")
```

### Flusso dati training con SUMO

```
SUMO simula scenari
    |
    v
Python raccoglie dati (TraCI)
    |
    v
Scrive in PostgreSQL / DuckDB
    |
    v
pgml.train() su dati simulati (pre-lancio, quando non hai dati reali)
    |
    v
Quando hai dati reali: pgml.train() su dati reali + simulati
    |
    v
pg_cron riallena settimanalmente
```

### L'integrazione con le altre estensioni

```
pgml.embed() --> genera embedding --> pgvector memorizza e cerca
pgml.train() --> usa dati da PostgreSQL + duckdb_fdw (storici)
pgml.predict() --> chiamato da PHP API per rispondere all'utente
pg_cron --> schedula retraining periodico
```

### Vista di training con dati SUMO

```sql
CREATE VIEW training_with_sumo AS
SELECT
    EXTRACT(DOW FROM pr.data_ora_inizio) AS giorno,
    EXTRACT(HOUR FROM pr.data_ora_inizio) AS ora,
    p.capacita_totale,
    p.tariffa_oraria,
    -- Dati simulati da SUMO (via duckdb_fdw)
    COALESCE(sim.traffic_flow, 0) AS flusso_traffico,
    COALESCE(sim.avg_search_time, 0) AS tempo_medio_ricerca,
    -- Target
    COUNT(*) FILTER (WHERE pr.stato = 'attiva')::FLOAT
        / NULLIF(p.capacita_totale, 0) AS occupazione_rate
FROM prenotazioni pr
JOIN parcheggi p ON pr.parcheggio_id = p.id
LEFT JOIN analytics.sumo_simulation_data sim
    ON sim.parcheggio_id = p.id::text
    AND sim.hour = EXTRACT(HOUR FROM pr.data_ora_inizio)
GROUP BY 1, 2, 3, 4, 5, 6;
```

---

## 8. Errori comuni e debugging

### "relation pgml.train does not exist"
**Causa**: `CREATE EXTENSION pgml;` non eseguito.
**Nota**: pgml potrebbe richiedere anche `shared_preload_libraries`.

### "column count mismatch in predict"
**Causa**: il numero di valori nell'ARRAY di predict() non corrisponde al numero di features nel training.
**Soluzione**: controlla quante colonne ha la vista di training (esclusa la colonna target).

### Modello con r2 negativo
**Significato**: il modello e' PEGGIO della media. Predire sempre la media dei dati sarebbe piu' accurato.
**Cause comuni**:
- Troppo pochi dati di training
- Features irrilevanti
- Bug nella vista di training (es: colonna target leak -- il target e' calcolato da una feature inclusa nel training)

### Training lento su tabelle grandi
**Soluzione**: crea una vista materializzata o una tabella di campionamento:
```sql
CREATE TABLE training_sample AS
SELECT * FROM training_data_view
ORDER BY RANDOM()
LIMIT 100000;  -- Campione di 100k righe
```

### Il modello predice sempre lo stesso valore
**Causa**: le features non contengono informazione discriminante.
**Verifica**: le features variano? `SELECT DISTINCT giorno FROM training_data;` -- se c'e' un solo valore, quella feature e' inutile.

---

## 9. Domande di autovalutazione

1. **Concettuale**: Spiega la differenza tra overfitting e underfitting. Se il modello ha r2=0.99 sul training ma r2=0.3 sul test, quale dei due e'?

2. **Pratica**: Hai 500 record di prenotazioni. Sono abbastanza per allenare un modello XGBoost con 10 features? Quali rischi corri?

3. **Feature Engineering**: Per predire l'occupazione di un parcheggio, elenca 10 features che useresti. Per ognuna, spiega perche' potrebbe essere utile.

4. **Architettura**: Perche' pgml allena il modello dentro PostgreSQL invece di in Python? In quale caso sarebbe meglio usare Python (scikit-learn)?

5. **SUMO**: La simulazione produce dati sintetici. Come li usi per il training quando non hai ancora dati reali? E quando avrai sia dati reali che simulati, come li combini?

6. **Avanzata**: Hai allenato un modello a gennaio. A giugno le performance calano. Cos'e' successo? (Suggerimento: si chiama "concept drift".) Come lo rilevi e lo risolvi?

---

> **Prossimo passo**: una volta completati gli esercizi, passa a `05-replicazione-postgresql-teoria-pratica.md`.
