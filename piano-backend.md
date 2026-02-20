# Mega Struttura Backend PHP — Parcheggio

## Context

Il backend PHP è attualmente vuoto. Lo schema PostgreSQL è completo (5 tabelle: `utenti`, `parcheggi`, `posti`, `prenotazioni`, `sessioni`). I container Docker funzionano. Serve implementare l'intero backend PHP con **Slim 4**, seguendo il pattern **MVC con Repository** + catalogo errori centralizzato (`StatusCode`).

---

## 1. Albero completo del progetto

```
docker_lamp/www/
│
├── public/
│   ├── index.php                        ← Entry point (bootstrap Slim 4)
│   └── .htaccess                        ← Rewrite rules Apache
│
├── composer.json                        ← Dipendenze (Slim, PHP-DI, PSR-7)
│
├── conf/
│   ├── config.example.php               ← Template configurazione (versionato)
│   ├── config.php                       ← Config reale (GITIGNORED)
│   ├── container.php                    ← Dependency Injection (PHP-DI)
│   ├── routes.php                       ← Tutte le route API
│   └── middleware.php                   ← Stack middleware globale
│
├── Controller/
│   ├── AuthController.php               ← Login, registrazione, logout, "chi sono"
│   ├── UtenteController.php             ← CRUD profilo utente
│   ├── ParcheggioController.php         ← CRUD parcheggi
│   ├── PostoController.php              ← CRUD posti + disponibilità
│   └── PrenotazioneController.php       ← CRUD prenotazioni
│
├── Model/
│   ├── UtenteRepository.php             ← Query SQL utenti
│   ├── ParcheggioRepository.php         ← Query SQL parcheggi
│   ├── PostoRepository.php              ← Query SQL posti
│   ├── PrenotazioneRepository.php       ← Query SQL prenotazioni
│   └── SessioneRepository.php           ← Query SQL sessioni (token auth)
│
├── Util/
│   ├── Connection.php                   ← Singleton PDO PostgreSQL
│   ├── StatusCode.php                   ← ★ Catalogo errori/successi centralizzato
│   ├── JsonResponse.php                 ← Helper risposte JSON (usa StatusCode)
│   ├── NanoID.php                       ← Generatore ID CHAR(21)
│   ├── Validator.php                    ← Validazione input (email, targa, date)
│   └── PythonClient.php                ← Client HTTP per chiamare FastAPI
│
└── Middleware/
    ├── CorsMiddleware.php               ← Headers CORS per React
    ├── AuthMiddleware.php               ← Verifica token sessione
    ├── JsonBodyParserMiddleware.php     ← Parsing body JSON
    ├── RateLimitMiddleware.php          ← Anti brute-force (solo auth)
    └── ErrorHandlerMiddleware.php       ← Cattura errori → risposta JSON
```

---

## 2. MEGA TABELLA — Ogni file, cosa contiene, cosa fa

### 2.1 `public/` — Entry Point

| File | Cosa contiene | Cosa fa |
|------|--------------|---------|
| **index.php** | `require autoload.php`, carica config, crea container PHP-DI, crea App Slim, registra middleware e routes, `$app->run()` | Unico punto d'ingresso: tutte le richieste HTTP passano da qui |
| **.htaccess** | `RewriteEngine On`, `RewriteCond %{REQUEST_FILENAME} !-f`, `RewriteRule ^ index.php [QSA,L]` | Redirige tutto a `index.php` (front controller pattern) |

### 2.2 `conf/` — Configurazione

| File | Cosa contiene | Cosa fa |
|------|--------------|---------|
| **config.example.php** | Array con `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `BASEPATH`, `PYTHON_URL`, `SESSION_TTL` | Template da copiare in `config.php`. Viene versionato su Git come riferimento |
| **config.php** | Stessa struttura di `config.example.php` ma con i valori reali | File con le credenziali vere. **Mai committare su Git** |
| **container.php** | Definizioni PHP-DI: `Connection`, ogni Repository, ogni Controller con le dipendenze iniettate | Dice a Slim *"quando qualcuno chiede un AuthController, crealo con UtenteRepository e SessioneRepository"* |
| **routes.php** | Gruppi di `$app->get()`, `$app->post()`, `$app->put()`, `$app->delete()` con prefisso `/api` | Mappa URL → Controller. Applica `AuthMiddleware` alle route protette |
| **middleware.php** | Catena di `$app->add(...)` nell'ordine giusto | Registra i middleware globali (Error → CORS → JSON Parser → Routing) |

### 2.3 `Controller/` — Ricevono richieste, delegano ai Repository, rispondono JSON

#### AuthController.php

| Metodo | Cosa fa | Dipendenze |
|--------|---------|------------|
| `register($req, $res)` | Valida email+password → hash password → salva utente → crea sessione → ritorna token | `UtenteRepository`, `SessioneRepository`, `NanoID`, `Validator` |
| `login($req, $res)` | Cerca utente per email → `password_verify()` → crea sessione → aggiorna `ultimo_accesso` → ritorna token | |
| `logout($req, $res)` | Legge token dall'header → elimina sessione dal DB | |
| `me($req, $res)` | Legge `$request->getAttribute('utente')` (messo da `AuthMiddleware`) → ritorna dati utente | |

#### UtenteController.php

| Metodo | Cosa fa | Dipendenze |
|--------|---------|------------|
| `getById($req, $res, $args)` | Cerca utente per ID → ritorna dati (SENZA `password_hash`) | `UtenteRepository` |
| `update($req, $res, $args)` | Valida input → aggiorna nome/cognome/telefono/email | |
| `delete($req, $res, $args)` | Elimina utente (CASCADE elimina sessioni + prenotazioni) | |

#### ParcheggioController.php

| Metodo | Cosa fa | Dipendenze |
|--------|---------|------------|
| `getAll($req, $res)` | Lista tutti i parcheggi | `ParcheggioRepository`, `NanoID` |
| `create($req, $res)` | Valida → genera NanoID → INSERT parcheggio | |
| `getById($req, $res, $args)` | Singolo parcheggio + conteggio posti liberi | |
| `update($req, $res, $args)` | Aggiorna nome/indirizzo/capacità/tariffa | |
| `delete($req, $res, $args)` | Elimina parcheggio (CASCADE elimina posti e prenotazioni) | |

#### PostoController.php

| Metodo | Cosa fa | Dipendenze |
|--------|---------|------------|
| `getByParcheggio($req, $res, $args)` | Lista posti di un parcheggio (filtrabili per tipo/piano) | `PostoRepository`, `PrenotazioneRepository`, `NanoID` |
| `create($req, $res)` | Genera `codice_posto` automatico (es: `"A-01"`) → INSERT | |
| `getById($req, $res, $args)` | Singolo posto + stato occupazione attuale | |
| `update($req, $res, $args)` | Aggiorna tipo/piano/attivo | |
| `delete($req, $res, $args)` | Soft delete: `attivo = false` (non cancella dal DB) | |
| `getDisponibili($req, $res, $args)` | Posti liberi in un intervallo di tempo (LEFT JOIN su prenotazioni) | |

#### PrenotazioneController.php

| Metodo | Cosa fa | Dipendenze |
|--------|---------|------------|
| `getAll($req, $res)` | Lista prenotazioni (filtri: stato, data, parcheggio) | `PrenotazioneRepository`, `PostoRepository`, `NanoID` |
| `create($req, $res)` | Verifica posto libero → genera `codice_prenotazione` → INSERT | |
| `getById($req, $res, $args)` | Singola prenotazione con dati JOIN utente/parcheggio/posto | |
| `update($req, $res, $args)` | Modifica date/targa (solo se stato = `'attiva'`) | |
| `cancel($req, $res, $args)` | `SET stato = 'annullata'` (soft delete, non cancella) | |
| `getByUtente($req, $res, $args)` | Storico prenotazioni di un utente | |

> **Regola d'oro dei Controller:** MAI scrivere query SQL. MAI toccare il database. Solo chiamare i Repository.

---

### 2.4 `Model/` — Repository: parlano col database

#### UtenteRepository.php

| Metodo | Query SQL principale |
|--------|---------------------|
| `findById(string $id): ?array` | `SELECT id, email, nome, cognome, telefono, created_at, ultimo_accesso FROM utenti WHERE id = :id` |
| `findByEmail(string $email): ?array` | `SELECT * FROM utenti WHERE email = :email` (include `password_hash` per il login) |
| `create(array $data): bool` | `INSERT INTO utenti (id, email, password_hash, nome, cognome, telefono) VALUES (...)` |
| `update(string $id, array $data): bool` | `UPDATE utenti SET nome=:nome, ... WHERE id = :id` (campi dinamici) |
| `delete(string $id): bool` | `DELETE FROM utenti WHERE id = :id` |
| `updateUltimoAccesso(string $id): bool` | `UPDATE utenti SET ultimo_accesso = NOW() WHERE id = :id` |

#### ParcheggioRepository.php

| Metodo | Query SQL principale |
|--------|---------------------|
| `findAll(): array` | `SELECT * FROM parcheggi ORDER BY nome` |
| `findById(string $id): ?array` | `SELECT * FROM parcheggi WHERE id = :id` |
| `create(array $data): bool` | `INSERT INTO parcheggi (id, nome, indirizzo, capacita_totale, tariffa_oraria) VALUES (...)` |
| `update(string $id, array $data): bool` | `UPDATE parcheggi SET ... WHERE id = :id` |
| `delete(string $id): bool` | `DELETE FROM parcheggi WHERE id = :id` |
| `countPostiLiberi(string $id): int` | `SELECT COUNT(*) FROM posti p WHERE p.parcheggio_id = :id AND p.attivo = true AND p.id NOT IN (SELECT posto_id FROM prenotazioni WHERE stato = 'attiva' AND ...)` |

#### PostoRepository.php

| Metodo | Query SQL principale |
|--------|---------------------|
| `findByParcheggio(string $parcheggioId, array $filtri): array` | `SELECT * FROM posti WHERE parcheggio_id = :id` + `AND tipo = :tipo` + `AND piano = :piano` |
| `findById(string $id): ?array` | `SELECT * FROM posti WHERE id = :id` |
| `create(array $data): bool` | `INSERT INTO posti (id, parcheggio_id, codice_posto, settore, numero, tipo, piano) VALUES (...)` |
| `update(string $id, array $data): bool` | `UPDATE posti SET ... WHERE id = :id` |
| `delete(string $id): bool` | `UPDATE posti SET attivo = false WHERE id = :id` (soft delete!) |
| `findDisponibili(string $parcheggioId, string $inizio, string $fine): array` | `SELECT * FROM posti WHERE parcheggio_id = :id AND attivo = true AND id NOT IN (SELECT posto_id FROM prenotazioni WHERE stato = 'attiva' AND data_ora_inizio < :fine AND data_ora_fine > :inizio)` |
| `isOccupato(string $postoId, string $inizio, string $fine): bool` | `SELECT COUNT(*) FROM prenotazioni WHERE posto_id = :id AND stato = 'attiva' AND data_ora_inizio < :fine AND data_ora_fine > :inizio` |

#### PrenotazioneRepository.php

| Metodo | Query SQL principale |
|--------|---------------------|
| `findAll(array $filtri): array` | `SELECT p.*, u.nome, u.cognome, pa.nome AS parcheggio, po.codice_posto FROM prenotazioni p JOIN utenti u ON ... JOIN parcheggi pa ON ... JOIN posti po ON ...` |
| `findById(string $id): ?array` | Come sopra ma con `WHERE p.id = :id` |
| `findByUtente(string $utenteId): array` | `WHERE p.utente_id = :id ORDER BY p.data_ora_inizio DESC` |
| `findByCodice(string $codice): ?array` | `WHERE p.codice_prenotazione = :codice` |
| `create(array $data): bool` | `INSERT INTO prenotazioni (id, codice_prenotazione, utente_id, parcheggio_id, posto_id, targa, data_ora_inizio, data_ora_fine) VALUES (...)` |
| `update(string $id, array $data): bool` | `UPDATE prenotazioni SET ... WHERE id = :id AND stato = 'attiva'` |
| `cancel(string $id): bool` | `UPDATE prenotazioni SET stato = 'annullata' WHERE id = :id` |

#### SessioneRepository.php

| Metodo | Query SQL principale |
|--------|---------------------|
| `findByToken(string $token): ?array` | `SELECT s.*, u.id AS utente_id, u.email, u.nome, u.cognome FROM sessioni s JOIN utenti u ON s.utente_id = u.id WHERE s.token = :token AND s.expires_at > NOW()` |
| `create(string $utenteId, string $token, int $ttl): bool` | `INSERT INTO sessioni (id, utente_id, token, expires_at) VALUES (:id, :uid, :token, NOW() + INTERVAL ':ttl seconds')` |
| `deleteByToken(string $token): bool` | `DELETE FROM sessioni WHERE token = :token` |
| `deleteExpired(): int` | `DELETE FROM sessioni WHERE expires_at < NOW()` |
| `deleteByUtente(string $utenteId): bool` | `DELETE FROM sessioni WHERE utente_id = :id` (logout da tutti i dispositivi) |

> **Regola d'oro dei Repository:** Solo query SQL + PDO prepared statements. MAI logica di business. MAI rispondere in JSON.

---

### 2.5 `Util/` — Strumenti condivisi da tutti i layer

| File | Cosa contiene | Metodi / Costanti | Chi lo usa |
|------|--------------|-------------------|-----------|
| **Connection.php** | Singleton PDO PostgreSQL | `getInstance(): PDO` — crea la connessione una sola volta e la riusa | Tutti i Repository |
| **StatusCode.php** | Catalogo centralizzato errori e successi | Vedi [tabella dedicata sotto](#3-statuscodephp--dettaglio-completo-del-catalogo) | `JsonResponse`, tutti i Controller, tutti i Middleware |
| **JsonResponse.php** | Helper per risposte JSON uniformi che usa StatusCode | `success($response, array $status, ?array $data): Response` | Tutti i Controller |
| | | `error($response, array $status, ?array $details): Response` | Tutti i Middleware |
| **NanoID.php** | Generatore ID CHAR(21) compatibile con lo schema DB | `generate(): string` — ritorna stringa di 21 caratteri (base62 + random_bytes) | Controller quando creano entita |
| **Validator.php** | Validazione input centralizzata | `validateRequired(array $data, array $fields): array` — ritorna campi mancanti | Controller prima di salvare |
| | | `validateEmail(string $email): bool` | |
| | | `validateTarga(string $targa): bool` — regex targhe italiane 7 char | |
| | | `validateDateRange(string $inizio, string $fine): bool` — fine > inizio | |
| | | `validatePassword(string $pw): bool` — almeno 8 caratteri | |
| **PythonClient.php** | Client HTTP per chiamare il servizio FastAPI | `get(string $endpoint): array` | Controller quando servono analytics/report |
| | | `post(string $endpoint, array $data): array` | |

---

## 3. StatusCode.php — Dettaglio completo del catalogo

### Convenzione codici: `{Lettera}{Numero}`

| Prefisso | Categoria | Numeri 001-009 = errori | Numeri 010+ = successi |
|----------|-----------|------------------------|----------------------|
| **A** | Auth / Sessioni | Problemi di autenticazione | Login/logout riusciti |
| **U** | Utenti | Utente non trovato, email duplicata | Utente creato/aggiornato |
| **P** | Parcheggi / Posti | Non trovato, non disponibile | Creato con successo |
| **R** | Prenotazioni (Reservation) | Non trovata, sovrapposta, scaduta | Creata/annullata |
| **V** | Validazione | Campi mancanti, formato errato | — |
| **S** | Sistema / Server | Errore interno, DB giu, Python giu | — |

### Tutte le costanti previste

#### Auth (A)

| Costante PHP | HTTP | Codice | Messaggio | Quando si usa |
|-------------|------|--------|-----------|---------------|
| `AUTH_TOKEN_MANCANTE` | 401 | A001 | Token di sessione mancante | `AuthMiddleware`: header Authorization assente |
| `AUTH_TOKEN_NON_VALIDO` | 401 | A002 | Token di sessione non valido | `AuthMiddleware`: token non trovato nel DB |
| `AUTH_SESSIONE_SCADUTA` | 401 | A003 | Sessione scaduta, effettua di nuovo il login | `AuthMiddleware`: `expires_at < NOW()` |
| `AUTH_CREDENZIALI_ERRATE` | 401 | A004 | Email o password non corretti | `AuthController::login()` — `password_verify()` fallisce |
| `AUTH_ACCESSO_NEGATO` | 403 | A005 | Non hai i permessi per questa operazione | Controller: utente prova a modificare dati di un altro |
| `AUTH_LOGIN_OK` | 200 | A010 | Login effettuato con successo | `AuthController::login()` — successo |
| `AUTH_LOGOUT_OK` | 200 | A011 | Logout effettuato con successo | `AuthController::logout()` |
| `AUTH_REGISTRAZIONE_OK` | 201 | A012 | Registrazione completata con successo | `AuthController::register()` |

#### Utenti (U)

| Costante PHP | HTTP | Codice | Messaggio | Quando si usa |
|-------------|------|--------|-----------|---------------|
| `UTENTE_NON_TROVATO` | 404 | U001 | Utente non trovato | `UtenteController`: ID non esiste nel DB |
| `UTENTE_EMAIL_ESISTENTE` | 409 | U002 | Esiste gia un account con questa email | `AuthController::register()` — email duplicata |
| `UTENTE_AGGIORNATO` | 200 | U010 | Profilo aggiornato con successo | `UtenteController::update()` |
| `UTENTE_ELIMINATO` | 200 | U011 | Account eliminato con successo | `UtenteController::delete()` |

#### Parcheggi / Posti (P)

| Costante PHP | HTTP | Codice | Messaggio | Quando si usa |
|-------------|------|--------|-----------|---------------|
| `PARCHEGGIO_NON_TROVATO` | 404 | P001 | Parcheggio non trovato | `ParcheggioController`: ID non esiste |
| `POSTO_NON_TROVATO` | 404 | P002 | Posto non trovato | `PostoController`: ID non esiste |
| `POSTO_NON_DISPONIBILE` | 409 | P003 | Il posto selezionato non e disponibile | `PrenotazioneController::create()` — posto occupato |
| `PARCHEGGIO_CREATO` | 201 | P010 | Parcheggio creato con successo | `ParcheggioController::create()` |
| `PARCHEGGIO_AGGIORNATO` | 200 | P011 | Parcheggio aggiornato con successo | `ParcheggioController::update()` |
| `PARCHEGGIO_ELIMINATO` | 200 | P012 | Parcheggio eliminato con successo | `ParcheggioController::delete()` |
| `POSTO_CREATO` | 201 | P013 | Posto creato con successo | `PostoController::create()` |
| `POSTO_AGGIORNATO` | 200 | P014 | Posto aggiornato con successo | `PostoController::update()` |
| `POSTO_DISATTIVATO` | 200 | P015 | Posto disattivato con successo | `PostoController::delete()` (soft delete) |

#### Prenotazioni (R)

| Costante PHP | HTTP | Codice | Messaggio | Quando si usa |
|-------------|------|--------|-----------|---------------|
| `PRENOTAZIONE_NON_TROVATA` | 404 | R001 | Prenotazione non trovata | `PrenotazioneController`: ID non esiste |
| `PRENOTAZIONE_GIA_ANNULLATA` | 409 | R002 | La prenotazione e gia stata annullata | `PrenotazioneController::cancel()` — stato != `'attiva'` |
| `PRENOTAZIONE_SCADUTA` | 409 | R003 | La prenotazione e scaduta | `PrenotazioneController::update()` — stato = `'scaduta'` |
| `PRENOTAZIONE_SOVRAPPOSIZIONE` | 409 | R004 | Esiste gia una prenotazione in questo intervallo orario | `PrenotazioneController::create()` — conflitto date |
| `PRENOTAZIONE_CREATA` | 201 | R010 | Prenotazione creata con successo | `PrenotazioneController::create()` |
| `PRENOTAZIONE_AGGIORNATA` | 200 | R011 | Prenotazione aggiornata con successo | `PrenotazioneController::update()` |
| `PRENOTAZIONE_ANNULLATA` | 200 | R012 | Prenotazione annullata con successo | `PrenotazioneController::cancel()` |

#### Validazione (V)

| Costante PHP | HTTP | Codice | Messaggio | Quando si usa |
|-------------|------|--------|-----------|---------------|
| `VALIDAZIONE_CAMPI_MANCANTI` | 400 | V001 | Campi obbligatori mancanti | `Validator::validateRequired()` fallisce |
| `VALIDAZIONE_EMAIL_NON_VALIDA` | 400 | V002 | Formato email non valido | `Validator::validateEmail()` fallisce |
| `VALIDAZIONE_TARGA_NON_VALIDA` | 400 | V003 | Formato targa non valido | `Validator::validateTarga()` fallisce |
| `VALIDAZIONE_DATA_NON_VALIDA` | 400 | V004 | Formato data/ora non valido | `Validator::validateDateRange()` fallisce |
| `VALIDAZIONE_PASSWORD_DEBOLE` | 400 | V005 | La password deve avere almeno 8 caratteri | `Validator::validatePassword()` fallisce |

#### Sistema (S)

| Costante PHP | HTTP | Codice | Messaggio | Quando si usa |
|-------------|------|--------|-----------|---------------|
| `SERVER_ERRORE_INTERNO` | 500 | S001 | Errore interno del server | `ErrorHandlerMiddleware`: eccezione non gestita |
| `SERVER_DB_NON_RAGGIUNGIBILE` | 503 | S002 | Database non raggiungibile | `Connection::getInstance()` — `PDOException` |
| `SERVER_PYTHON_NON_RAGGIUNGIBILE` | 503 | S003 | Servizio Python non raggiungibile | `PythonClient`: connessione fallita |
| `SERVER_METODO_NON_CONSENTITO` | 405 | S004 | Metodo HTTP non consentito | Slim: `MethodNotAllowedException` |
| `SERVER_ROTTA_NON_TROVATA` | 404 | S005 | Endpoint non trovato | Slim: `NotFoundException` |
| `SERVER_TROPPE_RICHIESTE` | 429 | S006 | Troppe richieste, riprova tra poco | `RateLimitMiddleware`: limite superato |

---

## 4. Formato JSON in uscita (cosa vede React)

### Successo

```json
{
    "success": true,
    "code": "R010",
    "message": "Prenotazione creata con successo",
    "data": {
        "id": "V1StGXR8_Z5jdHi6B-myT",
        "codice_prenotazione": "X9kLmN3pQ7rS2tU4vW6xY",
        "targa": "AB123CD",
        "data_ora_inizio": "2026-03-01 08:00:00",
        "data_ora_fine": "2026-03-01 12:00:00"
    }
}
```

### Errore

```json
{
    "success": false,
    "code": "V001",
    "message": "Campi obbligatori mancanti",
    "details": {
        "campi": ["targa", "data_ora_fine"]
    }
}
```

---

## 5. `Middleware/` — Filtri automatici prima/dopo ogni richiesta

| File | Dove si applica | Cosa fa | StatusCode usati |
|------|----------------|---------|------------------|
| **ErrorHandlerMiddleware.php** | Globale (primo nella catena) | Wrappa tutto in `try/catch`. Se esplode qualcosa → risponde JSON pulito invece di mostrare stack trace PHP | `SERVER_ERRORE_INTERNO` |
| **CorsMiddleware.php** | Globale | Aggiunge a OGNI risposta: `Access-Control-Allow-Origin`, `Allow-Methods`, `Allow-Headers`. Gestisce preflight `OPTIONS` → ritorna 200 immediato | Nessuno |
| **JsonBodyParserMiddleware.php** | Globale | Se `Content-Type = application/json` → fa `json_decode()` del body → lo attacca con `$request->withParsedBody()` | Nessuno |
| **RateLimitMiddleware.php** | Solo su `/api/auth/*` | Conta richieste per IP. Se supera 10/minuto → blocca | `SERVER_TROPPE_RICHIESTE` |
| **AuthMiddleware.php** | Solo sulle route protette | Legge `Authorization: Bearer {token}` → cerca in tabella `sessioni` → se valido carica utente in `$request->withAttribute('utente', ...)` → se non valido blocca | `AUTH_TOKEN_MANCANTE`, `AUTH_TOKEN_NON_VALIDO`, `AUTH_SESSIONE_SCADUTA` |

---

## 6. Route API complete

| Metodo | Route | Controller::metodo | Auth? | Descrizione |
|--------|-------|--------------------|-------|-------------|
| POST | `/api/auth/register` | `Auth::register()` | No | Registra nuovo utente |
| POST | `/api/auth/login` | `Auth::login()` | No | Login, ritorna token |
| POST | `/api/auth/logout` | `Auth::logout()` | Si | Invalida il token |
| GET | `/api/auth/me` | `Auth::me()` | Si | Dati utente corrente |
| GET | `/api/utenti/{id}` | `Utente::getById()` | Si | Profilo utente |
| PUT | `/api/utenti/{id}` | `Utente::update()` | Si | Modifica profilo |
| DELETE | `/api/utenti/{id}` | `Utente::delete()` | Si | Elimina account |
| GET | `/api/parcheggi` | `Parcheggio::getAll()` | No | Lista parcheggi |
| POST | `/api/parcheggi` | `Parcheggio::create()` | Si | Crea parcheggio |
| GET | `/api/parcheggi/{id}` | `Parcheggio::getById()` | No | Dettaglio parcheggio |
| PUT | `/api/parcheggi/{id}` | `Parcheggio::update()` | Si | Modifica parcheggio |
| DELETE | `/api/parcheggi/{id}` | `Parcheggio::delete()` | Si | Elimina parcheggio |
| GET | `/api/parcheggi/{id}/posti` | `Posto::getByParcheggio()` | No | Lista posti |
| POST | `/api/parcheggi/{id}/posti` | `Posto::create()` | Si | Crea posto |
| GET | `/api/posti/{id}` | `Posto::getById()` | No | Dettaglio posto |
| PUT | `/api/posti/{id}` | `Posto::update()` | Si | Modifica posto |
| DELETE | `/api/posti/{id}` | `Posto::delete()` | Si | Disattiva posto |
| GET | `/api/parcheggi/{id}/disponibili` | `Posto::getDisponibili()` | No | Posti liberi in un intervallo |
| GET | `/api/prenotazioni` | `Prenotazione::getAll()` | Si | Lista prenotazioni |
| POST | `/api/prenotazioni` | `Prenotazione::create()` | Si | Crea prenotazione |
| GET | `/api/prenotazioni/{id}` | `Prenotazione::getById()` | Si | Dettaglio prenotazione |
| PUT | `/api/prenotazioni/{id}` | `Prenotazione::update()` | Si | Modifica prenotazione |
| DELETE | `/api/prenotazioni/{id}` | `Prenotazione::cancel()` | Si | Annulla prenotazione |
| GET | `/api/utenti/{id}/prenotazioni` | `Prenotazione::getByUtente()` | Si | Storico utente |

---

## 7. Flusso di una richiesta — esempio completo

```
POST /api/prenotazioni
Header: Authorization: Bearer abc123def456
Body: {"posto_id": "xxx", "targa": "AB123CD", "data_ora_inizio": "...", "data_ora_fine": "..."}

   │
   ▼
ErrorHandlerMiddleware
   → try { prossimo } catch { → StatusCode::SERVER_ERRORE_INTERNO }
   │
   ▼
CorsMiddleware
   → aggiunge header CORS alla risposta
   │
   ▼
JsonBodyParserMiddleware
   → json_decode(body) → withParsedBody()
   │
   ▼
Slim RoutingMiddleware
   → trova: POST /api/prenotazioni → PrenotazioneController::create
   │
   ▼
AuthMiddleware
   → legge "Bearer abc123def456"
   → SessioneRepository::findByToken("abc123def456")
   → trovato e non scaduto? → withAttribute('utente', $utente)
   → non trovato? → JsonResponse::error(StatusCode::AUTH_TOKEN_NON_VALIDO) → STOP
   │
   ▼
PrenotazioneController::create()
   │
   ├── $body = $request->getParsedBody()
   ├── Validator::validateRequired($body, ['posto_id','targa','data_ora_inizio','data_ora_fine'])
   │     → manca qualcosa? → JsonResponse::error(StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => [...]])
   ├── Validator::validateTarga($body['targa'])
   │     → non valida? → JsonResponse::error(StatusCode::VALIDAZIONE_TARGA_NON_VALIDA)
   ├── PostoRepository::isOccupato($postoId, $inizio, $fine)
   │     → occupato? → JsonResponse::error(StatusCode::POSTO_NON_DISPONIBILE)
   ├── NanoID::generate() → $id, $codicePrenotazione
   ├── PrenotazioneRepository::create([...])
   │
   ▼
JsonResponse::success($response, StatusCode::PRENOTAZIONE_CREATA, ['id' => $id, ...])
   │
   ▼
← 201 {"success":true, "code":"R010", "message":"Prenotazione creata con successo", "data":{...}}
```

---

## 8. Riepilogo numerico

| Cartella | File | Totale |
|----------|------|--------|
| `public/` | `index.php`, `.htaccess` | 2 |
| `conf/` | `config.example.php`, `config.php`, `container.php`, `routes.php`, `middleware.php` | 5 |
| `Controller/` | Auth, Utente, Parcheggio, Posto, Prenotazione | 5 |
| `Model/` | Utente, Parcheggio, Posto, Prenotazione, Sessione (Repository) | 5 |
| `Util/` | Connection, StatusCode, JsonResponse, NanoID, Validator, PythonClient | 6 |
| `Middleware/` | ErrorHandler, Cors, JsonBodyParser, RateLimit, Auth | 5 |
| **TOTALE** | | **28 file** |

---

## 9. Verifica

Per testare il tutto dopo l'implementazione:

1. **Avviare i container:**
   ```bash
   docker-compose up -d
   ```

2. **Installare dipendenze PHP:**
   ```bash
   docker exec -it lamp_web bash
   cd /var/www/html && composer install
   ```

3. **Testare registrazione:**
   ```bash
   curl -X POST http://localhost:10080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"12345678","nome":"Mario","cognome":"Rossi"}'
   ```

4. **Verificare risposta di successo:**
   ```json
   {
     "success": true,
     "code": "A012",
     "message": "Registrazione completata con successo",
     "data": { ... }
   }
   ```

5. **Testare un errore:**
   ```bash
   curl http://localhost:10080/api/auth/me
   ```
   Deve tornare:
   ```json
   {
     "success": false,
     "code": "A001",
     "message": "Token di sessione mancante"
   }
   ```
