# pgvector -- Ricerca Vettoriale in PostgreSQL

## Indice
1. [Teoria fondamentale: cosa sono i vettori](#1-teoria-fondamentale-cosa-sono-i-vettori)
2. [Perche' servono i vettori nei database](#2-perche-servono-i-vettori-nei-database)
3. [Metriche di distanza](#3-metriche-di-distanza)
4. [Indici per ricerca approssimata](#4-indici-per-ricerca-approssimata)
5. [Sintassi e operazioni pgvector](#5-sintassi-e-operazioni-pgvector)
6. [Esercizi pratici isolati](#6-esercizi-pratici-isolati)
7. [Contesto nel progetto Parcheggio + SUMO](#7-contesto-nel-progetto-parcheggio--sumo)
8. [Errori comuni e debugging](#8-errori-comuni-e-debugging)
9. [Domande di autovalutazione](#9-domande-di-autovalutazione)

---

## 1. Teoria fondamentale: cosa sono i vettori

### Definizione matematica

Un **vettore** e' una lista ordinata di numeri (componenti) che rappresenta un punto nello spazio n-dimensionale.

```
Vettore 2D:  [3.0, 4.0]           --> un punto nel piano
Vettore 3D:  [1.0, 2.0, 3.0]     --> un punto nello spazio
Vettore nD:  [0.1, 0.8, ..., 0.3] --> un punto in spazio n-dimensionale
```

### Intuizione geometrica

Pensa a un parcheggio descritto da 3 caratteristiche:
- Prezzo (0-10)
- Distanza dal centro (0-10)
- Disponibilita' (0-10)

Il parcheggio A [2, 3, 8] = economico, vicino al centro, molti posti liberi.
Il parcheggio B [2, 4, 7] = simile ad A!
Il parcheggio C [9, 8, 1] = costoso, lontano, pieno = molto diverso.

**La distanza geometrica tra i vettori corrisponde alla "diversita'" concettuale.** Parcheggi con vettori vicini sono simili. Questa e' l'idea fondamentale.

### Dagli attributi ai vettori

Ogni entita' (parcheggio, utente, pattern di traffico) puo' essere rappresentata come un vettore se riesci a quantificarne le caratteristiche:

```
Parcheggio "Stazione Nord":
  - tariffa_oraria: 3.50     --> normalizzata a 0.35
  - capacita_totale: 200     --> normalizzata a 0.67
  - lat: 45.064              --> componente geografica
  - lon: 7.678               --> componente geografica
  - occupazione_media: 0.72  --> gia' in [0,1]
  - posti_elettrici: 10%     --> 0.10
  - posti_disabili: 5%       --> 0.05

Vettore: [0.35, 0.67, 45.064, 7.678, 0.72, 0.10, 0.05]
```

### Embeddings (vettori da modelli ML)

I vettori piu' potenti sono gli **embeddings**: vettori generati da modelli di machine learning (come quelli di Hugging Face) che catturano il **significato semantico** del dato.

Esempio: un modello text-embedding trasforma:
- "parcheggio economico vicino alla stazione" --> [0.12, 0.84, ..., 0.31] (384 dimensioni)
- "posto auto a basso costo area ferroviaria" --> [0.11, 0.82, ..., 0.33] (vettore SIMILE!)
- "ristorante di lusso in collina"            --> [0.91, 0.05, ..., 0.77] (vettore DIVERSO)

**Concetto chiave**: testi con significato simile producono vettori geometricamente vicini, anche se usano parole diverse.

---

## 2. Perche' servono i vettori nei database

### I limiti delle query tradizionali

```sql
-- Query tradizionale: filtri esatti
SELECT * FROM parcheggi
WHERE tariffa_oraria < 5
  AND capacita_totale > 100
  AND tipo_posti_disponibili = 'elettrico';
```

**Problema 1**: cosa se nessun parcheggio soddisfa TUTTI i criteri? Risultato vuoto.
**Problema 2**: non c'e' concetto di "quanto e' simile" -- o matcha o no.
**Problema 3**: non puoi esprimere "simile a quello che mi e' piaciuto l'ultima volta".

### La soluzione vettoriale

```sql
-- Query vettoriale: similarita' graduata
SELECT nome, embedding <=> preferenze_utente AS distanza
FROM parcheggi
ORDER BY distanza
LIMIT 5;
```

**Vantaggio 1**: ritorna SEMPRE risultati, ordinati per similarita'.
**Vantaggio 2**: cattura relazioni complesse tra attributi.
**Vantaggio 3**: puo' combinare testo, numeri, e pattern temporali in un unico vettore.

---

## 3. Metriche di distanza

### Distanza Euclidea (L2)

La distanza "in linea d'aria" tra due punti nello spazio.

```
d(A, B) = sqrt( (a1-b1)^2 + (a2-b2)^2 + ... + (an-bn)^2 )

Esempio 2D:
A = [3, 4], B = [6, 8]
d = sqrt( (3-6)^2 + (4-8)^2 ) = sqrt(9 + 16) = sqrt(25) = 5

Operatore pgvector: <->
```

**Quando usarla**: quando la magnitudine (grandezza) dei vettori e' significativa. Es: coordinate geografiche, valori assoluti.

### Distanza Coseno

Misura l'angolo tra due vettori, ignorando la lunghezza. Due vettori che "puntano nella stessa direzione" hanno distanza coseno 0, anche se uno e' 10 volte piu' lungo.

```
cosine_similarity = (A . B) / (|A| * |B|)
cosine_distance = 1 - cosine_similarity

Esempio:
A = [1, 0], B = [5, 0]     --> stessa direzione, distanza = 0
A = [1, 0], B = [0, 1]     --> perpendicolari, distanza = 1
A = [1, 0], B = [-1, 0]    --> opposti, distanza = 2

Operatore pgvector: <=>
```

**Quando usarla**: per embeddings testuali e profili utente. Non ti interessa "quanto" ma "in che direzione".

### Prodotto Interno (Inner Product)

```
ip(A, B) = a1*b1 + a2*b2 + ... + an*bn

Operatore pgvector: <#>  (ritorna il negativo, per ORDER BY ASC)
```

**Quando usarla**: quando i vettori sono gia' normalizzati (lunghezza 1). E' piu' veloce della coseno perche' salta la divisione per le norme.

### Riepilogo operatori pgvector

| Operatore | Metrica | Uso tipico |
|-----------|---------|------------|
| `<->` | Euclidea (L2) | Coordinate, valori assoluti |
| `<=>` | Coseno | Embeddings testuali, profili |
| `<#>` | Prodotto interno negato | Vettori normalizzati |

---

## 4. Indici per ricerca approssimata

### Il problema della scalabilita'

Senza indice, pgvector confronta il vettore query con TUTTI i vettori nella tabella (scan sequenziale). Con 1 milione di vettori a 384 dimensioni, ogni query richiede ~384 milioni di operazioni floating point. Troppo lento.

### IVFFlat (Inverted File with Flat Compression)

**Come funziona**:
1. Al momento della creazione, divide i vettori in `lists` cluster (usando k-means)
2. Per ogni query, cerca solo nei `probes` cluster piu' vicini al vettore query
3. Dentro quei cluster, fa ricerca esatta (flat)

```sql
-- Crea indice IVFFlat
CREATE INDEX ON parcheggi
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Quanti cluster cercare per query (default 1, aumenta per piu' precisione)
SET ivfflat.probes = 10;
```

**Trade-off**:
- Piu' `lists` = cluster piu' piccoli = ricerca piu' veloce ma indice piu' lento da costruire
- Piu' `probes` = piu' preciso ma piu' lento
- Regola empirica: `lists` = sqrt(n_righe), `probes` = sqrt(lists)

**Svantaggio**: richiede che i dati esistano gia' al momento della creazione dell'indice (non ottimale per tabelle che crescono velocemente).

### HNSW (Hierarchical Navigable Small World)

**Come funziona** (semplificato):
1. Costruisce un grafo multi-livello
2. Livello alto: pochi nodi, connessioni lunghe (per navigare velocemente)
3. Livello basso: tutti i nodi, connessioni corte (per precisione)
4. La ricerca parte dall'alto e "scende" verso il risultato

Pensa a come cerchi un posto su una mappa: prima guardi il continente, poi la nazione, poi la citta', poi la via.

```sql
-- Crea indice HNSW
CREATE INDEX ON parcheggi
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Precisione di ricerca (default 40, aumenta per piu' precisione)
SET hnsw.ef_search = 100;
```

**Parametri**:
- `m`: numero di connessioni per nodo (piu' alto = piu' preciso ma piu' memoria)
- `ef_construction`: quanti candidati considerare durante la costruzione (piu' alto = indice migliore ma costruzione piu' lenta)
- `ef_search`: quanti candidati considerare durante la ricerca

**Trade-off**: HNSW e' piu' veloce di IVFFlat in lettura, ma usa piu' memoria e la costruzione e' piu' lenta. Supporta inserimenti incrementali.

### Quando usare quale

| Situazione | Indice consigliato |
|------------|-------------------|
| Dati statici, poca memoria | IVFFlat |
| Dati dinamici, inserimenti frequenti | HNSW |
| < 10.000 righe | Nessun indice (scan sequenziale e' OK) |
| Serve massima precisione | Nessun indice o HNSW con ef_search alto |

---

## 5. Sintassi e operazioni pgvector

### Setup

```sql
CREATE EXTENSION vector;
```

### Creare una colonna vettore

```sql
-- Vettore a 3 dimensioni
ALTER TABLE parcheggi ADD COLUMN embedding vector(3);

-- Inserire un vettore
UPDATE parcheggi SET embedding = '[0.1, 0.5, 0.9]' WHERE id = 1;

-- Inserire con INSERT
INSERT INTO parcheggi (nome, embedding) VALUES ('Test', '[0.2, 0.3, 0.8]');
```

### Query di similarita'

```sql
-- I 5 parcheggi piu' simili al vettore dato (distanza coseno)
SELECT nome, embedding <=> '[0.1, 0.5, 0.9]' AS distanza
FROM parcheggi
ORDER BY distanza
LIMIT 5;

-- Con filtro ibrido: simile E con tariffa bassa
SELECT nome, tariffa_oraria,
       embedding <=> '[0.1, 0.5, 0.9]' AS distanza
FROM parcheggi
WHERE tariffa_oraria < 5.0
ORDER BY distanza
LIMIT 5;
```

### Operazioni sui vettori

```sql
-- Distanza euclidea
SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector;

-- Distanza coseno
SELECT '[1,2,3]'::vector <=> '[4,5,6]'::vector;

-- Somma di vettori
SELECT '[1,2,3]'::vector + '[4,5,6]'::vector;   -- [5,7,9]

-- Media di vettori (utile per centroidi di cluster)
SELECT AVG(embedding) FROM parcheggi;

-- Norma L2 (lunghezza del vettore)
SELECT vector_norm('[3,4]'::vector);  -- 5.0
```

### Casting e dimensioni

```sql
-- Il numero di dimensioni e' fisso per colonna
-- Questo FALLISCE se la colonna e' vector(3):
UPDATE parcheggi SET embedding = '[0.1, 0.2]' WHERE id = 1;
-- ERROR: expected 3 dimensions, not 2

-- Cast da array a vector
SELECT ARRAY[0.1, 0.5, 0.9]::vector;
```

---

## 6. Esercizi pratici isolati

### Esercizio 1: Primi passi con i vettori

**Obiettivo**: capire intuitivamente la similarita' vettoriale.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE citta (
    nome TEXT PRIMARY KEY,
    caratteristiche vector(4)
    -- [popolazione_norm, latitudine_norm, costo_vita_norm, turismo_norm]
);

INSERT INTO citta VALUES
    ('Roma',     '[0.8, 0.5, 0.7, 0.95]'),
    ('Milano',   '[0.7, 0.6, 0.9, 0.70]'),
    ('Napoli',   '[0.6, 0.4, 0.4, 0.80]'),
    ('Torino',   '[0.5, 0.6, 0.6, 0.50]'),
    ('Firenze',  '[0.3, 0.5, 0.7, 0.90]'),
    ('Palermo',  '[0.4, 0.3, 0.3, 0.60]'),
    ('Bologna',  '[0.3, 0.6, 0.7, 0.55]');
```

**Compiti**:
1. Trova le 3 citta' piu' simili a Roma (distanza coseno):
   ```sql
   SELECT nome, caratteristiche <=> (SELECT caratteristiche FROM citta WHERE nome = 'Roma') AS dist
   FROM citta WHERE nome != 'Roma'
   ORDER BY dist LIMIT 3;
   ```
2. Qual e' il risultato? Ti sembra intuitivo? Roma e Firenze dovrebbero essere simili (entrambe turistiche, costo medio-alto).
3. Ripeti con la distanza euclidea (`<->`). Il ranking cambia? Perche'?

**Domanda**: perche' e' importante **normalizzare** i valori prima di creare i vettori? Cosa succederebbe se la popolazione fosse in valori assoluti (2.800.000 per Roma) mentre il turismo resta in scala 0-1?

---

### Esercizio 2: Embedding manuale per parcheggi

**Obiettivo**: costruire manualmente vettori per parcheggi e cercare per similarita'.

```sql
CREATE TABLE park_test (
    id SERIAL PRIMARY KEY,
    nome TEXT,
    -- [prezzo_norm, distanza_centro_norm, capacita_norm, posti_elettrici_norm, occupazione_norm]
    profilo vector(5)
);

INSERT INTO park_test (nome, profilo) VALUES
    ('Stazione Centrale',  '[0.3, 0.1, 0.8, 0.2, 0.9]'),   -- economico, centralissimo, grande, pochi EV, molto pieno
    ('Centro Commerciale', '[0.5, 0.3, 0.9, 0.5, 0.7]'),   -- medio prezzo, vicino, enorme, meta' EV, pieno
    ('Aeroporto',          '[0.9, 0.9, 1.0, 0.3, 0.5]'),   -- caro, lontano, enorme, pochi EV, meta' pieno
    ('Zona Residenziale',  '[0.1, 0.5, 0.2, 0.0, 0.3]'),   -- economicissimo, medio, piccolo, no EV, vuoto
    ('Ospedale',           '[0.4, 0.4, 0.4, 0.1, 0.8]'),   -- medio, medio, medio, pochi EV, pieno
    ('Stadio',             '[0.6, 0.6, 0.7, 0.1, 0.2]');   -- caro, lontano, grande, pochi EV, vuoto (no partita)

-- Un utente cerca: "parcheggio economico, centrale, non mi interessa la dimensione,
-- voglio colonnina elettrica, non troppo pieno"
-- Profilo utente: [0.2, 0.1, 0.5, 0.8, 0.3]

SELECT nome, profilo <=> '[0.2, 0.1, 0.5, 0.8, 0.3]' AS distanza
FROM park_test
ORDER BY distanza
LIMIT 3;
```

**Compiti**:
1. Esegui la query. Quale parcheggio esce primo? Ha senso?
2. Cambia le preferenze utente in `[0.8, 0.8, 0.9, 0.1, 0.5]` (caro, lontano, grande, no EV). Chi esce?
3. Aggiungi un indice HNSW: `CREATE INDEX ON park_test USING hnsw (profilo vector_cosine_ops);`
4. Riesegui le query. I risultati sono gli stessi? (Con poche righe, si'.)

**Domanda**: con soli 6 parcheggi, l'indice e' utile? Da quante righe inizia a fare differenza?

---

### Esercizio 3: Combinare ricerca vettoriale e filtri SQL

**Obiettivo**: query ibride (vettori + WHERE tradizionale).

```sql
-- Aggiungi una colonna tipo
ALTER TABLE park_test ADD COLUMN tipo TEXT;
UPDATE park_test SET tipo = 'pubblico' WHERE nome IN ('Stazione Centrale', 'Ospedale', 'Zona Residenziale');
UPDATE park_test SET tipo = 'privato' WHERE nome IN ('Centro Commerciale', 'Aeroporto', 'Stadio');

-- Cerca il parcheggio PUBBLICO piu' simile alle preferenze
SELECT nome, tipo, profilo <=> '[0.2, 0.1, 0.5, 0.8, 0.3]' AS distanza
FROM park_test
WHERE tipo = 'pubblico'
ORDER BY distanza
LIMIT 3;
```

**Domanda**: il filtro WHERE viene applicato PRIMA o DOPO la ricerca vettoriale? Che implicazioni ha per le performance? (Suggerimento: pensa a come funzionano gli indici.)

---

### Esercizio 4: Vettori per pattern temporali

**Obiettivo**: rappresentare pattern di occupazione come vettori.

```sql
-- Ogni parcheggio ha un pattern di occupazione per fascia oraria (6 fasce da 4 ore)
-- [00-04, 04-08, 08-12, 12-16, 16-20, 20-24]
CREATE TABLE pattern_occupazione (
    parcheggio_id INTEGER,
    giorno_tipo TEXT,  -- 'feriale' o 'festivo'
    pattern vector(6)
);

INSERT INTO pattern_occupazione VALUES
    (1, 'feriale', '[0.1, 0.3, 0.9, 0.8, 0.7, 0.2]'),  -- Stazione: pieno di giorno
    (1, 'festivo', '[0.1, 0.1, 0.3, 0.4, 0.3, 0.1]'),  -- Stazione: vuoto nel weekend
    (2, 'feriale', '[0.1, 0.2, 0.7, 0.9, 0.8, 0.3]'),  -- Centro Comm: pieno pomeriggio
    (2, 'festivo', '[0.1, 0.1, 0.5, 0.9, 0.9, 0.4]'),  -- Centro Comm: ancora piu' pieno weekend!
    (3, 'feriale', '[0.2, 0.6, 0.5, 0.4, 0.5, 0.3]'),  -- Aeroporto: costante
    (3, 'festivo', '[0.3, 0.7, 0.6, 0.5, 0.6, 0.4]');  -- Aeroporto: leggermente piu' pieno

-- Cerca: quale parcheggio ha un pattern FERIALE simile a "pieno la mattina, vuoto la sera"?
SELECT parcheggio_id, giorno_tipo,
       pattern <=> '[0.1, 0.4, 0.9, 0.7, 0.4, 0.1]' AS distanza
FROM pattern_occupazione
WHERE giorno_tipo = 'feriale'
ORDER BY distanza
LIMIT 3;
```

**Questo e' esattamente il tipo di dato che SUMO genera!** La simulazione produce occupazione per fascia oraria per ogni parcheggio.

**Domanda**: se volessi trovare un giorno ANOMALO (traffico molto diverso dal solito), come useresti la distanza vettoriale? (Suggerimento: confronta il pattern di oggi con la media storica.)

---

### Esercizio 5: Aggiornamento incrementale degli embedding

**Obiettivo**: capire come mantenere i vettori aggiornati.

```sql
-- Media mobile: aggiorna il profilo di un parcheggio combinando
-- il vecchio profilo con nuovi dati (peso 0.9 vecchio, 0.1 nuovo)
-- Questo simula un "running average" dell'embedding

-- Vecchio profilo Stazione Centrale: [0.3, 0.1, 0.8, 0.2, 0.9]
-- Nuova osservazione (meno pieno oggi): [0.3, 0.1, 0.8, 0.2, 0.5]

-- PostgreSQL non ha operazioni scalare*vettore nativamente,
-- ma puoi usare una funzione:
UPDATE park_test
SET profilo = (
    SELECT (0.9 * profilo[1] + 0.1 * 0.3)::float || ',' ||
           (0.9 * profilo[2] + 0.1 * 0.1)::float || ',' ||
           (0.9 * profilo[3] + 0.1 * 0.8)::float || ',' ||
           (0.9 * profilo[4] + 0.1 * 0.2)::float || ',' ||
           (0.9 * profilo[5] + 0.1 * 0.5)::float
    -- Nota: questo e' verboso. In pratica lo faresti in Python/PHP
)::vector
WHERE nome = 'Stazione Centrale';
```

**Domanda**: perche' il calcolo vettoriale complesso (media mobile, normalizzazione) si fa meglio in Python che in SQL? Qual e' il confine tra "logica nel DB" e "logica nell'applicazione"?

---

## 7. Contesto nel progetto Parcheggio + SUMO

### Dove si inserisce pgvector nell'architettura

```
SUMO (simula traffico)
    |
    v
Python (calcola embeddings da dati simulati)
    |
    v
PostgreSQL + pgvector (memorizza e cerca embeddings)
    |
    v
PHP API (query di similarita' per l'utente)
    |
    v
React (mostra raccomandazioni)
```

### Cosa devi aggiungere al tuo schema

1. **Colonna embedding nella tabella `parcheggi`**:
   ```sql
   ALTER TABLE parcheggi ADD COLUMN embedding vector(384);
   -- 384 = dimensioni di un modello come "all-MiniLM-L6-v2"
   ```

2. **Tabella pattern di traffico** (dati da SUMO):
   ```sql
   CREATE TABLE traffic_patterns (
       id SERIAL PRIMARY KEY,
       parcheggio_id UUID REFERENCES parcheggi(id),
       data DATE,
       giorno_tipo TEXT,
       pattern_orario vector(24),  -- occupazione per ogni ora
       created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Tabella profili utente** (calcolati da storico prenotazioni):
   ```sql
   CREATE TABLE user_profiles (
       utente_id UUID REFERENCES utenti(id),
       preference_vector vector(384),
       updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

### Flusso dati con SUMO

1. SUMO simula 24h di traffico con TraCI
2. Python raccoglie: per ogni parcheggio, occupazione oraria
3. Python crea vettori `vector(24)` e li inserisce in `traffic_patterns`
4. Per le raccomandazioni: Python genera embedding delle preferenze utente (testo -> vettore con un modello)
5. PHP/Python query: `SELECT * FROM parcheggi ORDER BY embedding <=> user_embedding LIMIT 5`

### Aggiunta al Dockerfile

L'estensione pgvector nel tuo Dockerfile scaricato viene installata con `pig ext install pgvector`. Nel tuo `01-init.sql` aggiungeresti:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 8. Errori comuni e debugging

### "type vector does not exist"
**Causa**: non hai eseguito `CREATE EXTENSION vector;`
**Nota**: l'estensione si chiama `vector`, non `pgvector`!

### "expected N dimensions, not M"
**Causa**: stai inserendo un vettore con un numero di dimensioni diverso da quello dichiarato nella colonna.
**Soluzione**: verifica la definizione della colonna con `\d nome_tabella`.

### Query lenta anche con indice
**Verifiche**:
```sql
-- L'indice viene usato?
EXPLAIN ANALYZE SELECT ... ORDER BY embedding <=> '[...]' LIMIT 5;
-- Cerca "Index Scan using ..." nel piano. Se vedi "Seq Scan", l'indice non e' usato.
```
**Causa comune**: il `LIMIT` e' troppo alto, o manca `ORDER BY`, o il tipo di distanza dell'indice non corrisponde all'operatore nella query.

### Indice HNSW usa troppa memoria
**Causa**: `m` troppo alto o troppe dimensioni.
**Soluzione**: riduci `m` (default 16 va bene per la maggior parte dei casi) o usa dimensioni inferiori per gli embedding.

---

## 9. Domande di autovalutazione

1. **Concettuale**: Spiega con parole tue perche' due testi con significato simile ma parole diverse producono embedding vicini.

2. **Matematica**: Dati A=[1,0,1] e B=[0,1,0], calcola a mano la distanza euclidea e ragiona sulla distanza coseno (sono perpendicolari?).

3. **Pratica**: Hai 500.000 parcheggi con embedding a 384 dimensioni. Quale indice sceglieresti (IVFFlat o HNSW)? Perche'? Con quali parametri?

4. **Architettura**: Nel progetto Parcheggio, chi genera gli embedding? PostgreSQL (con pgml.embed)? Python (con sentence-transformers)? Quali sono i pro/contro di ciascun approccio?

5. **SUMO**: La simulazione produce per ogni veicolo: posizione(x,y), velocita', parcheggio scelto, tempo di ricerca. Come rappresenteresti un "pattern di traffico di un'ora" come vettore?

6. **Avanzata**: Un utente cerca sempre parcheggio alle 8 di mattina vicino alla stazione. Un giorno cerca alle 22 vicino allo stadio. Come modificheresti il suo vettore di preferenze senza perdere il profilo storico? (Suggerimento: media mobile pesata, o vettori multipli per contesto.)

---

> **Prossimo passo**: una volta completati gli esercizi, passa a `03-duckdb_fdw-teoria-pratica.md`.
