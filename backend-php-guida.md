# Guida implementazione backend PHP — ParcheggioBrescia

Questo file descrive il codice completo di ogni file PHP del backend.
Tutto è allineato al frontend esistente (`api.js`, `AuthContext.jsx`, `AdminDashboard.jsx`, ecc.)
e allo schema SQL in `docker_lamp/db-init/01-init.sql`.

---

## PRIMA DI TUTTO — correzioni al file `01-init.sql`

Il file SQL attuale ha ancora questi errori da correggere prima di avviare i container:

### 1. `parcheggi` mancano 6 colonne (CRITICO)

Aggiungi queste righe alla `CREATE TABLE parcheggi`, prima di `created_at`:

```sql
lat             DECIMAL(10, 7)  NOT NULL DEFAULT 45.5397,
lng             DECIMAL(10, 7)  NOT NULL DEFAULT 10.2205,
tipo            VARCHAR(50)     NOT NULL DEFAULT 'scoperto',
servizi         TEXT            NOT NULL DEFAULT '[]',
image           TEXT            NOT NULL DEFAULT '',
posti_liberi    INT             NOT NULL DEFAULT 0,
```

`servizi` è una stringa JSON (es. `'["videosorveglianza","disabili"]'`).
`posti_liberi` parte da 0 e viene aggiornato ad ogni prenotazione/annullamento.

### 2. `prenotazioni.parcheggio_nome` — tipo sbagliato e FK invalida (CRITICO)

La riga attuale:
```sql
parcheggio_nome CHAR(21) NOT NULL REFERENCES parcheggi(nome),
```
ha due errori: `CHAR(21)` è per gli ID (non per un nome), e non puoi fare FK su `parcheggi.nome` perché non è UNIQUE né PRIMARY KEY — PostgreSQL ti darà errore al CREATE TABLE.

Cambiala in:
```sql
parcheggio_nome VARCHAR(255) NOT NULL DEFAULT '',
```
Nessuna FK: è un campo denormalizzato (salvi il nome del parcheggio al momento della prenotazione).

### 3. Index `idx_posti_parcheggio` — tabella `posti` non esiste più (CRITICO)

Rimuovi questa riga dagli index:
```sql
CREATE INDEX idx_posti_parcheggio ON posti(parcheggio_id);  -- DA ELIMINARE
```

### Schema corretto finale

Dopo le correzioni, `parcheggi` e `prenotazioni` devono essere:

```sql
CREATE TABLE parcheggi (
    id               CHAR(21)        PRIMARY KEY,
    nome             VARCHAR(255)    NOT NULL,
    indirizzo        VARCHAR(255)    NOT NULL,
    capacita_totale  INT             NOT NULL,
    tariffa_oraria   DECIMAL(10, 2),
    lat              DECIMAL(10, 7)  NOT NULL DEFAULT 45.5397,
    lng              DECIMAL(10, 7)  NOT NULL DEFAULT 10.2205,
    tipo             VARCHAR(50)     NOT NULL DEFAULT 'scoperto',
    servizi          TEXT            NOT NULL DEFAULT '[]',
    image            TEXT            NOT NULL DEFAULT '',
    posti_liberi     INT             NOT NULL DEFAULT 0,
    created_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prenotazioni (
    id                   CHAR(21)            PRIMARY KEY,
    codice_prenotazione  CHAR(21)            UNIQUE,
    utente_id            CHAR(21)            NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    parcheggio_id        CHAR(21)            NOT NULL REFERENCES parcheggi(id) ON DELETE CASCADE,
    parcheggio_nome      VARCHAR(255)        NOT NULL DEFAULT '',
    targa                CHAR(7)             NOT NULL,
    data_ora_inizio      TIMESTAMP           NOT NULL,
    data_ora_fine        TIMESTAMP           NOT NULL,
    stato                stato_prenotazione  DEFAULT 'attiva',
    created_at           TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP,
    CONSTRAINT check_date_order CHECK (data_ora_fine > data_ora_inizio)
);
```

---

## Formato risposta JSON (uguale ai mock)

```json
{ "success": true,  "code": "A010", "message": "Login effettuato", "data": { ... } }
{ "success": false, "code": "A004", "message": "Email o password errati", "data": null }
```

Il frontend controlla sempre `res.success` e legge `res.data` o `res.message`.

---

## Struttura cartelle

```
php_back-end_sviluppo/
├── public/
│   ├── index.php
│   └── .htaccess
├── conf/
│   ├── config.example.php
│   ├── config.php          ← gitignored, copia di config.example con valori reali
│   ├── container.php
│   ├── middleware.php
│   └── routes.php
├── Controller/
│   ├── AuthController.php
│   ├── UtenteController.php
│   ├── ParcheggioController.php
│   └── PrenotazioneController.php
├── Model/
│   ├── UtenteRepository.php
│   ├── SessioneRepository.php
│   ├── ParcheggioRepository.php
│   └── PrenotazioneRepository.php
├── Util/
│   ├── Connection.php
│   ├── StatusCode.php
│   ├── JsonResponse.php
│   ├── Validator.php
│   ├── JwtHelper.php
│   └── NanoID.php
├── Middleware/
│   ├── AuthMiddleware.php
│   ├── CorsMiddleware.php
│   ├── JsonBodyParserMiddleware.php
│   ├── ErrorHandlerMiddleware.php
│   └── RateLimitMiddleware.php
└── composer.json
```

---

## 1. `composer.json`

```json
{
  "require": {
    "slim/slim": "^4.0",
    "slim/psr7": "^1.0",
    "php-di/slim-bridge": "^3.0",
    "firebase/php-jwt": "^6.0"
  },
  "autoload": {
    "psr-4": {
      "Controller\\": "Controller/",
      "Model\\": "Model/",
      "Util\\": "Util/",
      "Middleware\\": "Middleware/"
    }
  }
}
```

Nota: puoi tenere `"ramsey/uuid": "^4.7"` se lo usi altrove, non dà problemi.

Dopo aver scritto il file, installa le dipendenze:
```bash
docker exec -it lamp_web bash
cd /var/www/html
composer install
```

---

## 2. `public/.htaccess`

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.php [QSA,L]
```

---

## 3. `conf/config.example.php`

Versiona questo. Copialo in `conf/config.php` con i valori reali (gitignored).

```php
<?php
return [
    'DB_DSN'     => 'pgsql:host=lamp_pg_db;port=5432;dbname=postgres',
    'DB_USER'    => 'root',
    'DB_PASS'    => 'password',
    'BASEPATH'   => '/v1',
    'JWT_SECRET' => 'cambia-questa-stringa-con-almeno-32-caratteri-casuali',
    'JWT_TTL'    => 86400, // secondi — 86400 = 24 ore
];
```

---

## 4. `public/index.php`

```php
<?php
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$config    = require __DIR__ . '/../conf/config.php';
$container = require __DIR__ . '/../conf/container.php';
$container->set('config', $config);

AppFactory::setContainer($container);
$app = AppFactory::create();
$app->setBasePath($config['BASEPATH']);

(require __DIR__ . '/../conf/middleware.php')($app);
(require __DIR__ . '/../conf/routes.php')($app, $container);

$app->run();
```

---

## 5. `conf/container.php`

```php
<?php
use DI\ContainerBuilder;
use Util\Connection;
use Model\UtenteRepository;
use Model\ParcheggioRepository;
use Model\PrenotazioneRepository;
use Model\SessioneRepository;
use Controller\AuthController;
use Controller\UtenteController;
use Controller\ParcheggioController;
use Controller\PrenotazioneController;

$builder = new ContainerBuilder();
$builder->addDefinitions([

    Connection::class => function ($c) {
        $cfg = $c->get('config');
        return Connection::getInstance($cfg['DB_DSN'], $cfg['DB_USER'], $cfg['DB_PASS']);
    },

    UtenteRepository::class      => fn($c) => new UtenteRepository($c->get(Connection::class)),
    ParcheggioRepository::class  => fn($c) => new ParcheggioRepository($c->get(Connection::class)),
    PrenotazioneRepository::class => fn($c) => new PrenotazioneRepository($c->get(Connection::class)),
    SessioneRepository::class    => fn($c) => new SessioneRepository($c->get(Connection::class)),

    AuthController::class => fn($c) => new AuthController(
        $c->get(UtenteRepository::class),
        $c->get(SessioneRepository::class),
        $c->get('config')
    ),
    UtenteController::class => fn($c) => new UtenteController(
        $c->get(UtenteRepository::class)
    ),
    ParcheggioController::class => fn($c) => new ParcheggioController(
        $c->get(ParcheggioRepository::class)
    ),
    PrenotazioneController::class => fn($c) => new PrenotazioneController(
        $c->get(PrenotazioneRepository::class),
        $c->get(ParcheggioRepository::class)
    ),

]);
return $builder->build();
```

---

## 6. `conf/middleware.php`

```php
<?php
use Middleware\ErrorHandlerMiddleware;
use Middleware\CorsMiddleware;
use Middleware\JsonBodyParserMiddleware;

return function ($app) {
    $app->add(new CorsMiddleware());
    $app->add(new JsonBodyParserMiddleware());
    $app->add(new ErrorHandlerMiddleware());
    $app->addRoutingMiddleware();
};
```

---

## 7. `conf/routes.php`

Le route corrispondono **esattamente** ai path usati da `api.js` (base `/v1`).

```php
<?php
use Controller\AuthController;
use Controller\UtenteController;
use Controller\ParcheggioController;
use Controller\PrenotazioneController;
use Middleware\AuthMiddleware;
use Middleware\RateLimitMiddleware;

return function ($app, $container) {

    // Costruisce AuthMiddleware con le dipendenze necessarie
    $auth = new AuthMiddleware(
        $container->get(\Model\SessioneRepository::class),
        $container->get('config')['JWT_SECRET']
    );

    // ── AUTH ──────────────────────────────────────────────────────────────────
    $app->group('/auth', function ($group) use ($auth) {
        $group->post('/register', [AuthController::class, 'register']);
        $group->post('/login',    [AuthController::class, 'login']);
        $group->get('/me',        [AuthController::class, 'me'])->add($auth);
        $group->post('/logout',   [AuthController::class, 'logout'])->add($auth);
    })->add(new RateLimitMiddleware());

    // ── PARCHEGGI ─────────────────────────────────────────────────────────────
    // Percorsi identici a quelli in api.js: /parcheggio, /parcheggio/id/{id}
    $app->get('/parcheggio',             [ParcheggioController::class, 'getAll']);
    $app->get('/parcheggio/id/{id}',     [ParcheggioController::class, 'getById']);
    $app->post('/parcheggio',            [ParcheggioController::class, 'create'])->add($auth);
    $app->put('/parcheggio/id/{id}',     [ParcheggioController::class, 'update'])->add($auth);
    $app->delete('/parcheggio/id/{id}',  [ParcheggioController::class, 'delete'])->add($auth);

    // ── UTENTI ────────────────────────────────────────────────────────────────
    $app->put('/utente/id/{id}', [UtenteController::class, 'update'])->add($auth);

    // ── PRENOTAZIONI ──────────────────────────────────────────────────────────
    $app->get('/prenotazione',                     [PrenotazioneController::class, 'getAll'])->add($auth);
    $app->post('/prenotazione',                    [PrenotazioneController::class, 'create'])->add($auth);
    $app->get('/prenotazione/id/{id}',             [PrenotazioneController::class, 'getById'])->add($auth);
    $app->get('/prenotazione/codice/{codice}',     [PrenotazioneController::class, 'getByCodice'])->add($auth);
    $app->get('/prenotazione/utente/{userId}',     [PrenotazioneController::class, 'getByUtente'])->add($auth);
    $app->get('/prenotazione/parcheggio/{id}',     [PrenotazioneController::class, 'getByParcheggio'])->add($auth);
    $app->put('/prenotazione/id/{id}',             [PrenotazioneController::class, 'update'])->add($auth);
    $app->patch('/prenotazione/id/{id}/annulla',   [PrenotazioneController::class, 'cancel'])->add($auth);

    // ── ADMIN STATS ───────────────────────────────────────────────────────────
    $app->get('/admin/stats', [PrenotazioneController::class, 'getAdminStats'])->add($auth);

    // Preflight CORS
    $app->options('/{routes:.+}', function ($req, $res) { return $res; });
};
```

---

## 8. `Util/Connection.php`

```php
<?php
namespace Util;

use PDO;
use PDOException;
use RuntimeException;

class Connection
{
    private static ?PDO $instance = null;

    private function __construct() {}

    public static function getInstance(string $dsn = '', string $user = '', string $pass = ''): PDO
    {
        if (self::$instance === null) {
            try {
                self::$instance = new PDO($dsn, $user, $pass);
                self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$instance->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            } catch (PDOException $e) {
                throw new RuntimeException('Database non raggiungibile: ' . $e->getMessage());
            }
        }
        return self::$instance;
    }
}
```

---

## 9. `Util/StatusCode.php`

Ogni costante è un array `[httpStatus, code, message]`.

```php
<?php
namespace Util;

class StatusCode
{
    const AUTH_TOKEN_MANCANTE      = [401, 'A001', 'Token di sessione mancante'];
    const AUTH_TOKEN_NON_VALIDO    = [401, 'A002', 'Token di sessione non valido'];
    const AUTH_SESSIONE_SCADUTA    = [401, 'A003', 'Sessione scaduta, effettua di nuovo il login'];
    const AUTH_CREDENZIALI_ERRATE  = [401, 'A004', 'Email o password non corretti'];
    const AUTH_ACCESSO_NEGATO      = [403, 'A005', 'Non hai i permessi per questa operazione'];
    const AUTH_LOGIN_OK            = [200, 'A010', 'Login effettuato con successo'];
    const AUTH_LOGOUT_OK           = [200, 'A011', 'Logout effettuato con successo'];
    const AUTH_REGISTRAZIONE_OK    = [201, 'A012', 'Registrazione completata con successo'];

    const UTENTE_NON_TROVATO       = [404, 'U001', 'Utente non trovato'];
    const UTENTE_EMAIL_ESISTENTE   = [409, 'U002', 'Esiste già un account con questa email'];
    const UTENTE_AGGIORNATO        = [200, 'U010', 'Profilo aggiornato con successo'];

    const PARCHEGGIO_NON_TROVATO   = [404, 'P001', 'Parcheggio non trovato'];
    const PARCHEGGIO_CREATO        = [201, 'P010', 'Parcheggio creato con successo'];
    const PARCHEGGIO_AGGIORNATO    = [200, 'P011', 'Parcheggio aggiornato con successo'];
    const PARCHEGGIO_ELIMINATO     = [200, 'P012', 'Parcheggio eliminato con successo'];

    const PRENOTAZIONE_NON_TROVATA    = [404, 'R001', 'Prenotazione non trovata'];
    const PRENOTAZIONE_GIA_ANNULLATA  = [409, 'R002', 'La prenotazione è già stata annullata'];
    const PARCHEGGIO_PIENO            = [409, 'R003', 'Parcheggio pieno in questo intervallo orario'];
    const PRENOTAZIONE_CREATA         = [201, 'R010', 'Prenotazione creata con successo'];
    const PRENOTAZIONE_AGGIORNATA     = [200, 'R011', 'Prenotazione aggiornata con successo'];
    const PRENOTAZIONE_ANNULLATA      = [200, 'R012', 'Prenotazione annullata con successo'];

    const VALIDAZIONE_CAMPI_MANCANTI  = [400, 'V001', 'Campi obbligatori mancanti'];
    const VALIDAZIONE_EMAIL_NON_VALIDA = [400, 'V002', 'Formato email non valido'];
    const VALIDAZIONE_TARGA_NON_VALIDA = [400, 'V003', 'Formato targa non valido (es: AB123CD)'];
    const VALIDAZIONE_DATE_NON_VALIDE  = [400, 'V004', 'Date non valide'];
    const VALIDAZIONE_PASSWORD_DEBOLE  = [400, 'V005', 'La password deve avere almeno 8 caratteri'];

    const SERVER_ERRORE_INTERNO       = [500, 'S001', 'Errore interno del server'];
    const SERVER_TROPPE_RICHIESTE     = [429, 'S006', 'Troppe richieste, riprova tra poco'];

    // Usato come "200 OK generico" per i GET senza un codice specifico
    const OK                          = [200, 'OK', 'Successo'];
}
```

---

## 10. `Util/JsonResponse.php`

```php
<?php
namespace Util;

use Psr\Http\Message\ResponseInterface as Response;

class JsonResponse
{
    public static function success(Response $response, array $status, mixed $data = null): Response
    {
        $body = [
            'success' => true,
            'code'    => $status[1],
            'message' => $status[2],
            'data'    => $data,
        ];
        $response->getBody()->write(json_encode($body));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status[0]);
    }

    public static function error(Response $response, array $status, ?array $details = null): Response
    {
        $body = [
            'success' => false,
            'code'    => $status[1],
            'message' => $status[2],
            'data'    => null,
        ];
        if ($details !== null) {
            $body['details'] = $details;
        }
        $response->getBody()->write(json_encode($body));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status[0]);
    }
}
```

---

## 11. `Util/Validator.php`

```php
<?php
namespace Util;

class Validator
{
    // Ritorna array con i nomi dei campi mancanti (vuoto = tutto ok)
    public static function required(array $data, array $fields): array
    {
        return array_filter($fields, fn($f) => !isset($data[$f]) || $data[$f] === '' || $data[$f] === null);
    }

    public static function email(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    // Targa italiana: AB123CD
    public static function targa(string $targa): bool
    {
        return (bool) preg_match('/^[A-Z]{2}[0-9]{3}[A-Z]{2}$/', strtoupper($targa));
    }

    public static function password(string $pw): bool
    {
        return strlen($pw) >= 8;
    }

    public static function dateRange(string $inizio, string $fine): bool
    {
        $a = strtotime($inizio);
        $b = strtotime($fine);
        return $a !== false && $b !== false && $b > $a;
    }
}
```

---

## 12. `Util/JwtHelper.php`

```php
<?php
namespace Util;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;

class JwtHelper
{
    public static function generate(string $utenteId, string $secret, int $ttl): string
    {
        $payload = [
            'iss' => 'parcheggio-brescia',
            'sub' => $utenteId,
            'iat' => time(),
            'exp' => time() + $ttl,
        ];
        return JWT::encode($payload, $secret, 'HS256');
    }

    // Ritorna l'utente_id (sub) se il token è valido, null altrimenti
    public static function verify(string $token, string $secret): ?string
    {
        try {
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            return $decoded->sub;
        } catch (\Exception $e) {
            return null;
        }
    }
}
```

---

## 13. `Util/NanoID.php`

Genera ID univoci da 21 caratteri (compatibili con `CHAR(21)` del DB).

```php
<?php
namespace Util;

class NanoID
{
    public static function generate(): string
    {
        $chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        $bytes  = random_bytes(21);
        $result = '';
        for ($i = 0; $i < 21; $i++) {
            $result .= $chars[ord($bytes[$i]) % 62];
        }
        return $result;
    }
}
```

---

## 14. `Model/UtenteRepository.php`

```php
<?php
namespace Model;

use PDO;

class UtenteRepository
{
    public function __construct(private PDO $pdo) {}

    // Non ritorna mai password_hash
    public function findById(string $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, email, nome, cognome, telefono, ruolo, created_at, ultimo_accesso
             FROM utenti WHERE id = :id'
        );
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    // Ritorna ANCHE password_hash (serve solo per il login)
    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM utenti WHERE email = :email');
        $stmt->execute(['email' => $email]);
        return $stmt->fetch() ?: null;
    }

    public function create(array $data): bool
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO utenti (id, email, password_hash, nome, cognome, telefono)
             VALUES (:id, :email, :password_hash, :nome, :cognome, :telefono)'
        );
        return $stmt->execute([
            'id'            => $data['id'],
            'email'         => $data['email'],
            'password_hash' => $data['password_hash'],
            'nome'          => $data['nome'],
            'cognome'       => $data['cognome'] ?? '',
            'telefono'      => $data['telefono'] ?? '',
        ]);
    }

    public function update(string $id, array $data): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE utenti SET nome = :nome, cognome = :cognome, telefono = :telefono
             WHERE id = :id'
        );
        return $stmt->execute([
            'nome'     => $data['nome'],
            'cognome'  => $data['cognome'],
            'telefono' => $data['telefono'],
            'id'       => $id,
        ]);
    }

    public function updateUltimoAccesso(string $id): bool
    {
        $stmt = $this->pdo->prepare('UPDATE utenti SET ultimo_accesso = NOW() WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }
}
```

---

## 15. `Model/SessioneRepository.php`

```php
<?php
namespace Model;

use PDO;

class SessioneRepository
{
    public function __construct(private PDO $pdo) {}

    // Cerca sessione valida per token + join con utente
    // AuthMiddleware usa questa per verificare che la sessione non sia stata revocata
    public function findByToken(string $token): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT s.*, u.id AS utente_id, u.email, u.nome, u.cognome, u.ruolo
             FROM sessioni s
             JOIN utenti u ON s.utente_id = u.id
             WHERE s.token = :token AND s.expires_at > NOW()'
        );
        $stmt->execute(['token' => $token]);
        return $stmt->fetch() ?: null;
    }

    public function create(string $id, string $utenteId, string $token, int $ttl): bool
    {
        // INTERVAL non accetta parametri PDO in PostgreSQL: usiamo cast intero diretto
        $sql  = "INSERT INTO sessioni (id, utente_id, token, expires_at)
                 VALUES (:id, :utente_id, :token, NOW() + INTERVAL '" . (int)$ttl . " seconds')";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute(['id' => $id, 'utente_id' => $utenteId, 'token' => $token]);
    }

    public function deleteByToken(string $token): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM sessioni WHERE token = :token');
        return $stmt->execute(['token' => $token]);
    }

    public function deleteExpired(): void
    {
        $this->pdo->exec('DELETE FROM sessioni WHERE expires_at < NOW()');
    }
}
```

---

## 16. `Model/ParcheggioRepository.php`

```php
<?php
namespace Model;

use PDO;

class ParcheggioRepository
{
    public function __construct(private PDO $pdo) {}

    public function findAll(): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM parcheggi ORDER BY nome');
        $stmt->execute();
        return array_map([$this, 'decode'], $stmt->fetchAll());
    }

    public function findById(string $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM parcheggi WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? $this->decode($row) : null;
    }

    public function create(array $data): bool
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO parcheggi
             (id, nome, indirizzo, capacita_totale, tariffa_oraria, lat, lng, tipo, servizi, image, posti_liberi)
             VALUES
             (:id, :nome, :indirizzo, :capacita_totale, :tariffa_oraria, :lat, :lng, :tipo, :servizi, :image, :posti_liberi)'
        );
        return $stmt->execute([
            'id'             => $data['id'],
            'nome'           => $data['nome'],
            'indirizzo'      => $data['indirizzo'],
            'capacita_totale'=> (int) $data['capacita_totale'],
            'tariffa_oraria' => (float) $data['tariffa_oraria'],
            'lat'            => (float) $data['lat'],
            'lng'            => (float) $data['lng'],
            'tipo'           => $data['tipo'] ?? 'scoperto',
            'servizi'        => json_encode($data['servizi'] ?? []),
            'image'          => $data['image'] ?? '',
            'posti_liberi'   => (int) $data['capacita_totale'], // inizia = capacità totale
        ]);
    }

    public function update(string $id, array $data): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE parcheggi
             SET nome = :nome, indirizzo = :indirizzo, tariffa_oraria = :tariffa_oraria,
                 lat = :lat, lng = :lng, tipo = :tipo, servizi = :servizi, image = :image,
                 capacita_totale = :capacita_totale
             WHERE id = :id'
        );
        return $stmt->execute([
            'nome'           => $data['nome'],
            'indirizzo'      => $data['indirizzo'],
            'tariffa_oraria' => (float) $data['tariffa_oraria'],
            'lat'            => (float) $data['lat'],
            'lng'            => (float) $data['lng'],
            'tipo'           => $data['tipo'],
            'servizi'        => json_encode($data['servizi'] ?? []),
            'image'          => $data['image'] ?? '',
            'capacita_totale'=> (int) $data['capacita_totale'],
            'id'             => $id,
        ]);
    }

    public function delete(string $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM parcheggi WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    // Chiamato quando si crea una prenotazione
    public function decrementaPostiLiberi(string $id): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE parcheggi SET posti_liberi = GREATEST(posti_liberi - 1, 0) WHERE id = :id'
        );
        return $stmt->execute(['id' => $id]);
    }

    // Chiamato quando si annulla una prenotazione
    public function incrementaPostiLiberi(string $id): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE parcheggi SET posti_liberi = LEAST(posti_liberi + 1, capacita_totale) WHERE id = :id'
        );
        return $stmt->execute(['id' => $id]);
    }

    // `servizi` è salvata come JSON string: '["videosorveglianza","disabili"]'
    // Qui la decodifichiamo in array PHP così il frontend riceve un array JS
    private function decode(array $row): array
    {
        $row['servizi'] = json_decode($row['servizi'] ?? '[]', true) ?? [];
        return $row;
    }
}
```

---

## 17. `Model/PrenotazioneRepository.php`

```php
<?php
namespace Model;

use PDO;

class PrenotazioneRepository
{
    public function __construct(private PDO $pdo) {}

    public function findAll(): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM prenotazioni ORDER BY created_at DESC');
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function findById(string $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM prenotazioni WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findByCodice(string $codice): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM prenotazioni WHERE LOWER(codice_prenotazione) = LOWER(:codice)'
        );
        $stmt->execute(['codice' => $codice]);
        return $stmt->fetch() ?: null;
    }

    public function findByUtente(string $utenteId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM prenotazioni WHERE utente_id = :id ORDER BY created_at DESC'
        );
        $stmt->execute(['id' => $utenteId]);
        return $stmt->fetchAll();
    }

    public function findByParcheggio(string $parcheggioId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM prenotazioni WHERE parcheggio_id = :id ORDER BY created_at DESC'
        );
        $stmt->execute(['id' => $parcheggioId]);
        return $stmt->fetchAll();
    }

    public function create(array $data): bool
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO prenotazioni
             (id, codice_prenotazione, utente_id, parcheggio_id, parcheggio_nome, targa, data_ora_inizio, data_ora_fine)
             VALUES
             (:id, :codice, :utente_id, :parcheggio_id, :parcheggio_nome, :targa, :inizio, :fine)'
        );
        return $stmt->execute([
            'id'             => $data['id'],
            'codice'         => $data['codice_prenotazione'],
            'utente_id'      => $data['utente_id'],
            'parcheggio_id'  => $data['parcheggio_id'],
            'parcheggio_nome'=> $data['parcheggio_nome'],
            'targa'          => strtoupper($data['targa']),
            'inizio'         => $data['data_ora_inizio'],
            'fine'           => $data['data_ora_fine'],
        ]);
    }

    public function update(string $id, array $data): bool
    {
        $stmt = $this->pdo->prepare(
            "UPDATE prenotazioni
             SET targa = :targa, data_ora_inizio = :inizio, data_ora_fine = :fine
             WHERE id = :id AND stato = 'attiva'"
        );
        return $stmt->execute([
            'targa'  => strtoupper($data['targa']),
            'inizio' => $data['data_ora_inizio'],
            'fine'   => $data['data_ora_fine'],
            'id'     => $id,
        ]);
    }

    // Ritorna true se l'annullamento è andato a buon fine (la prenotazione era attiva)
    public function cancel(string $id): bool
    {
        $stmt = $this->pdo->prepare(
            "UPDATE prenotazioni SET stato = 'annullata' WHERE id = :id AND stato = 'attiva'"
        );
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // Statistiche per l'admin dashboard
    // Corrisponde esattamente a adminStats in mockData.js:
    // { totalBookings, activeBookings, totalRevenue, co2Saved, mostUsedParkings }
    public function getStats(): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT
               COUNT(*) AS total,
               SUM(CASE WHEN stato = 'attiva' THEN 1 ELSE 0 END) AS attive
             FROM prenotazioni"
        );
        $stmt->execute();
        $counts = $stmt->fetch();

        // Calcola il ricavo totale: per ogni prenotazione ore * tariffa del parcheggio
        $stmt2 = $this->pdo->prepare(
            "SELECT SUM(
                EXTRACT(EPOCH FROM (pr.data_ora_fine - pr.data_ora_inizio)) / 3600.0
                * pa.tariffa_oraria
             ) AS revenue
             FROM prenotazioni pr
             JOIN parcheggi pa ON pa.id = pr.parcheggio_id"
        );
        $stmt2->execute();
        $rev = $stmt2->fetch();

        // Top 3 parcheggi per numero di prenotazioni
        $stmt3 = $this->pdo->prepare(
            "SELECT parcheggio_nome AS nome, COUNT(*) AS prenotazioni
             FROM prenotazioni
             GROUP BY parcheggio_nome
             ORDER BY prenotazioni DESC
             LIMIT 3"
        );
        $stmt3->execute();

        $revenue = round((float)($rev['revenue'] ?? 0), 2);

        return [
            'totalBookings'    => (int) $counts['total'],
            'activeBookings'   => (int) $counts['attive'],
            'totalRevenue'     => $revenue,
            'co2Saved'         => round($revenue * 0.026, 1), // stima kg CO2
            'mostUsedParkings' => $stmt3->fetchAll(),
        ];
    }
}
```

---

## 18. `Controller/AuthController.php`

```php
<?php
namespace Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Model\UtenteRepository;
use Model\SessioneRepository;
use Util\StatusCode;
use Util\JsonResponse;
use Util\Validator;
use Util\NanoID;
use Util\JwtHelper;

class AuthController
{
    public function __construct(
        private UtenteRepository   $utenti,
        private SessioneRepository $sessioni,
        private array              $config
    ) {}

    public function register(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody() ?? [];

        $mancanti = Validator::required($body, ['nome', 'email', 'password']);
        if (!empty($mancanti)) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => array_values($mancanti)]);
        }
        if (!Validator::email($body['email'])) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_EMAIL_NON_VALIDA);
        }
        if (!Validator::password($body['password'])) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_PASSWORD_DEBOLE);
        }
        if ($this->utenti->findByEmail($body['email'])) {
            return JsonResponse::error($response, StatusCode::UTENTE_EMAIL_ESISTENTE);
        }

        $id = NanoID::generate();
        $this->utenti->create([
            'id'            => $id,
            'email'         => $body['email'],
            'password_hash' => password_hash($body['password'], PASSWORD_BCRYPT),
            'nome'          => $body['nome'],
            'cognome'       => $body['cognome'] ?? '',
            'telefono'      => $body['telefono'] ?? '',
        ]);

        $token = JwtHelper::generate($id, $this->config['JWT_SECRET'], $this->config['JWT_TTL']);
        $this->sessioni->create(NanoID::generate(), $id, $token, $this->config['JWT_TTL']);

        return JsonResponse::success($response, StatusCode::AUTH_REGISTRAZIONE_OK, [
            'token' => $token,
            'user'  => $this->utenti->findById($id),
        ]);
    }

    public function login(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody() ?? [];

        $mancanti = Validator::required($body, ['email', 'password']);
        if (!empty($mancanti)) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => array_values($mancanti)]);
        }

        $utente = $this->utenti->findByEmail($body['email']);
        if (!$utente || !password_verify($body['password'], $utente['password_hash'])) {
            return JsonResponse::error($response, StatusCode::AUTH_CREDENZIALI_ERRATE);
        }

        $token = JwtHelper::generate($utente['id'], $this->config['JWT_SECRET'], $this->config['JWT_TTL']);
        $this->sessioni->create(NanoID::generate(), $utente['id'], $token, $this->config['JWT_TTL']);
        $this->utenti->updateUltimoAccesso($utente['id']);

        unset($utente['password_hash']);

        return JsonResponse::success($response, StatusCode::AUTH_LOGIN_OK, [
            'token' => $token,
            'user'  => $utente,
        ]);
    }

    public function logout(Request $request, Response $response): Response
    {
        $token = preg_replace('/^Bearer\s+/', '', $request->getHeaderLine('Authorization'));
        $this->sessioni->deleteByToken($token);
        return JsonResponse::success($response, StatusCode::AUTH_LOGOUT_OK);
    }

    public function me(Request $request, Response $response): Response
    {
        // AuthMiddleware ha già verificato il token e caricato l'utente nell'attributo
        $utente = $request->getAttribute('utente');
        return JsonResponse::success($response, StatusCode::OK, ['user' => $utente]);
    }
}
```

---

## 19. `Controller/UtenteController.php`

```php
<?php
namespace Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Model\UtenteRepository;
use Util\StatusCode;
use Util\JsonResponse;
use Util\Validator;

class UtenteController
{
    public function __construct(private UtenteRepository $utenti) {}

    public function update(Request $request, Response $response, array $args): Response
    {
        $me = $request->getAttribute('utente');

        // Un utente può modificare solo se stesso (admin può modificare chiunque)
        if ($args['id'] !== $me['utente_id'] && $me['ruolo'] !== 'Admin') {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }

        $body     = $request->getParsedBody() ?? [];
        $mancanti = Validator::required($body, ['nome', 'cognome', 'telefono']);
        if (!empty($mancanti)) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => array_values($mancanti)]);
        }

        $this->utenti->update($args['id'], $body);
        return JsonResponse::success($response, StatusCode::UTENTE_AGGIORNATO, $this->utenti->findById($args['id']));
    }
}
```

---

## 20. `Controller/ParcheggioController.php`

```php
<?php
namespace Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Model\ParcheggioRepository;
use Util\StatusCode;
use Util\JsonResponse;
use Util\Validator;
use Util\NanoID;

class ParcheggioController
{
    public function __construct(private ParcheggioRepository $parcheggi) {}

    public function getAll(Request $request, Response $response): Response
    {
        return JsonResponse::success($response, StatusCode::OK, $this->parcheggi->findAll());
    }

    public function getById(Request $request, Response $response, array $args): Response
    {
        $p = $this->parcheggi->findById($args['id']);
        if (!$p) return JsonResponse::error($response, StatusCode::PARCHEGGIO_NON_TROVATO);
        return JsonResponse::success($response, StatusCode::OK, $p);
    }

    public function create(Request $request, Response $response): Response
    {
        if ($request->getAttribute('utente')['ruolo'] !== 'Admin') {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }

        $body     = $request->getParsedBody() ?? [];
        $mancanti = Validator::required($body, ['nome', 'indirizzo', 'capacita_totale', 'tariffa_oraria', 'lat', 'lng']);
        if (!empty($mancanti)) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => array_values($mancanti)]);
        }

        $id = NanoID::generate();
        $this->parcheggi->create(array_merge($body, ['id' => $id]));
        return JsonResponse::success($response, StatusCode::PARCHEGGIO_CREATO, $this->parcheggi->findById($id));
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        if ($request->getAttribute('utente')['ruolo'] !== 'Admin') {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        if (!$this->parcheggi->findById($args['id'])) {
            return JsonResponse::error($response, StatusCode::PARCHEGGIO_NON_TROVATO);
        }

        $this->parcheggi->update($args['id'], $request->getParsedBody() ?? []);
        return JsonResponse::success($response, StatusCode::PARCHEGGIO_AGGIORNATO, $this->parcheggi->findById($args['id']));
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        if ($request->getAttribute('utente')['ruolo'] !== 'Admin') {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        if (!$this->parcheggi->findById($args['id'])) {
            return JsonResponse::error($response, StatusCode::PARCHEGGIO_NON_TROVATO);
        }

        $this->parcheggi->delete($args['id']);
        return JsonResponse::success($response, StatusCode::PARCHEGGIO_ELIMINATO);
    }
}
```

---

## 21. `Controller/PrenotazioneController.php`

```php
<?php
namespace Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Model\PrenotazioneRepository;
use Model\ParcheggioRepository;
use Util\StatusCode;
use Util\JsonResponse;
use Util\Validator;
use Util\NanoID;

class PrenotazioneController
{
    public function __construct(
        private PrenotazioneRepository $prenotazioni,
        private ParcheggioRepository   $parcheggi
    ) {}

    public function getAll(Request $request, Response $response): Response
    {
        if ($request->getAttribute('utente')['ruolo'] !== 'Admin') {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        return JsonResponse::success($response, StatusCode::OK, $this->prenotazioni->findAll());
    }

    public function getById(Request $request, Response $response, array $args): Response
    {
        $me   = $request->getAttribute('utente');
        $pren = $this->prenotazioni->findById($args['id']);
        if (!$pren) return JsonResponse::error($response, StatusCode::PRENOTAZIONE_NON_TROVATA);
        if ($me['ruolo'] !== 'Admin' && $pren['utente_id'] !== $me['utente_id']) {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        return JsonResponse::success($response, StatusCode::OK, $pren);
    }

    public function getByCodice(Request $request, Response $response, array $args): Response
    {
        $pren = $this->prenotazioni->findByCodice($args['codice']);
        if (!$pren) return JsonResponse::error($response, StatusCode::PRENOTAZIONE_NON_TROVATA);
        return JsonResponse::success($response, StatusCode::OK, $pren);
    }

    public function getByUtente(Request $request, Response $response, array $args): Response
    {
        $me = $request->getAttribute('utente');
        if ($me['ruolo'] !== 'Admin' && $args['userId'] !== $me['utente_id']) {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        return JsonResponse::success($response, StatusCode::OK, $this->prenotazioni->findByUtente($args['userId']));
    }

    public function getByParcheggio(Request $request, Response $response, array $args): Response
    {
        return JsonResponse::success($response, StatusCode::OK, $this->prenotazioni->findByParcheggio($args['id']));
    }

    public function create(Request $request, Response $response): Response
    {
        $me   = $request->getAttribute('utente');
        $body = $request->getParsedBody() ?? [];

        $mancanti = Validator::required($body, ['parcheggio_id', 'targa', 'data_ora_inizio', 'data_ora_fine']);
        if (!empty($mancanti)) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => array_values($mancanti)]);
        }
        if (!Validator::targa($body['targa'])) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_TARGA_NON_VALIDA);
        }
        if (!Validator::dateRange($body['data_ora_inizio'], $body['data_ora_fine'])) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_DATE_NON_VALIDE);
        }

        $parcheggio = $this->parcheggi->findById($body['parcheggio_id']);
        if (!$parcheggio) return JsonResponse::error($response, StatusCode::PARCHEGGIO_NON_TROVATO);
        if ($parcheggio['posti_liberi'] <= 0) {
            return JsonResponse::error($response, StatusCode::PARCHEGGIO_PIENO);
        }

        $id = NanoID::generate();
        $this->prenotazioni->create([
            'id'                 => $id,
            'codice_prenotazione'=> NanoID::generate(), // generato lato server, mai dal client
            'utente_id'          => $me['utente_id'],   // dal token JWT, mai dal body
            'parcheggio_id'      => $body['parcheggio_id'],
            'parcheggio_nome'    => $parcheggio['nome'], // dal DB, mai dal body
            'targa'              => $body['targa'],
            'data_ora_inizio'    => $body['data_ora_inizio'],
            'data_ora_fine'      => $body['data_ora_fine'],
        ]);
        $this->parcheggi->decrementaPostiLiberi($body['parcheggio_id']);

        return JsonResponse::success($response, StatusCode::PRENOTAZIONE_CREATA, $this->prenotazioni->findById($id));
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $me   = $request->getAttribute('utente');
        $pren = $this->prenotazioni->findById($args['id']);
        if (!$pren) return JsonResponse::error($response, StatusCode::PRENOTAZIONE_NON_TROVATA);
        if ($me['ruolo'] !== 'Admin' && $pren['utente_id'] !== $me['utente_id']) {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        if ($pren['stato'] !== 'attiva') {
            return JsonResponse::error($response, StatusCode::PRENOTAZIONE_GIA_ANNULLATA);
        }

        $body     = $request->getParsedBody() ?? [];
        $mancanti = Validator::required($body, ['targa', 'data_ora_inizio', 'data_ora_fine']);
        if (!empty($mancanti)) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => array_values($mancanti)]);
        }

        $this->prenotazioni->update($args['id'], $body);
        return JsonResponse::success($response, StatusCode::PRENOTAZIONE_AGGIORNATA, $this->prenotazioni->findById($args['id']));
    }

    public function cancel(Request $request, Response $response, array $args): Response
    {
        $me   = $request->getAttribute('utente');
        $pren = $this->prenotazioni->findById($args['id']);
        if (!$pren) return JsonResponse::error($response, StatusCode::PRENOTAZIONE_NON_TROVATA);
        if ($me['ruolo'] !== 'Admin' && $pren['utente_id'] !== $me['utente_id']) {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        if ($pren['stato'] !== 'attiva') {
            return JsonResponse::error($response, StatusCode::PRENOTAZIONE_GIA_ANNULLATA);
        }

        $this->prenotazioni->cancel($args['id']);
        $this->parcheggi->incrementaPostiLiberi($pren['parcheggio_id']);
        return JsonResponse::success($response, StatusCode::PRENOTAZIONE_ANNULLATA, $this->prenotazioni->findById($args['id']));
    }

    public function getAdminStats(Request $request, Response $response): Response
    {
        if ($request->getAttribute('utente')['ruolo'] !== 'Admin') {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        return JsonResponse::success($response, StatusCode::OK, $this->prenotazioni->getStats());
    }
}
```

---

## 22. `Middleware/AuthMiddleware.php`

```php
<?php
namespace Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Model\SessioneRepository;
use Util\StatusCode;
use Util\JsonResponse;
use Util\JwtHelper;
use Slim\Psr7\Response as SlimResponse;

class AuthMiddleware
{
    public function __construct(
        private SessioneRepository $sessioni,
        private string             $jwtSecret
    ) {}

    public function __invoke(Request $request, Handler $handler): Response
    {
        $authHeader = $request->getHeaderLine('Authorization');

        if (empty($authHeader)) {
            return JsonResponse::error(new SlimResponse(), StatusCode::AUTH_TOKEN_MANCANTE);
        }
        if (!preg_match('/^Bearer\s+(\S+)$/', $authHeader, $matches)) {
            return JsonResponse::error(new SlimResponse(), StatusCode::AUTH_TOKEN_NON_VALIDO);
        }

        $token    = $matches[1];
        $utenteId = JwtHelper::verify($token, $this->jwtSecret);

        if ($utenteId === null) {
            return JsonResponse::error(new SlimResponse(), StatusCode::AUTH_SESSIONE_SCADUTA);
        }

        // Controlla che la sessione esista ancora nel DB (permette logout reale)
        $sessione = $this->sessioni->findByToken($token);
        if (!$sessione) {
            return JsonResponse::error(new SlimResponse(), StatusCode::AUTH_TOKEN_NON_VALIDO);
        }

        // I controller leggono l'utente con: $request->getAttribute('utente')
        // Contiene: utente_id, email, nome, cognome, ruolo
        return $handler->handle($request->withAttribute('utente', $sessione));
    }
}
```

---

## 23. `Middleware/CorsMiddleware.php`

```php
<?php
namespace Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Response as SlimResponse;

class CorsMiddleware
{
    public function __invoke(Request $request, Handler $handler): Response
    {
        if ($request->getMethod() === 'OPTIONS') {
            return $this->addHeaders(new SlimResponse());
        }
        return $this->addHeaders($handler->handle($request));
    }

    private function addHeaders(Response $response): Response
    {
        return $response
            ->withHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            ->withHeader('Access-Control-Allow-Credentials', 'true');
    }
}
```

---

## 24. `Middleware/JsonBodyParserMiddleware.php`

```php
<?php
namespace Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as Handler;

class JsonBodyParserMiddleware
{
    public function __invoke(Request $request, Handler $handler): Response
    {
        if (str_contains($request->getHeaderLine('Content-Type'), 'application/json')) {
            $body = (string) $request->getBody();
            if (!empty($body)) {
                $decoded = json_decode($body, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $request = $request->withParsedBody($decoded);
                }
            }
        }
        return $handler->handle($request);
    }
}
```

---

## 25. `Middleware/ErrorHandlerMiddleware.php`

```php
<?php
namespace Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Util\StatusCode;
use Util\JsonResponse;
use Slim\Psr7\Response as SlimResponse;

class ErrorHandlerMiddleware
{
    public function __invoke(Request $request, Handler $handler): Response
    {
        try {
            return $handler->handle($request);
        } catch (\Throwable $e) {
            error_log('[ErrorHandler] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            return JsonResponse::error(new SlimResponse(), StatusCode::SERVER_ERRORE_INTERNO);
        }
    }
}
```

---

## 26. `Middleware/RateLimitMiddleware.php`

```php
<?php
namespace Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Util\StatusCode;
use Util\JsonResponse;
use Slim\Psr7\Response as SlimResponse;

class RateLimitMiddleware
{
    public function __construct(
        private int $max = 10,     // max richieste nella finestra
        private int $window = 60   // finestra in secondi
    ) {}

    public function __invoke(Request $request, Handler $handler): Response
    {
        $ip  = $request->getServerParams()['REMOTE_ADDR'] ?? '0.0.0.0';
        $key = sys_get_temp_dir() . '/rl_' . md5($ip);

        $data = file_exists($key) ? json_decode(file_get_contents($key), true) : ['n' => 0, 't' => time()];
        if (time() - $data['t'] > $this->window) {
            $data = ['n' => 0, 't' => time()];
        }

        $data['n']++;
        file_put_contents($key, json_encode($data));

        if ($data['n'] > $this->max) {
            return JsonResponse::error(new SlimResponse(), StatusCode::SERVER_TROPPE_RICHIESTE);
        }

        return $handler->handle($request);
    }
}
```

---

## Modifiche al frontend quando si attiva il backend reale

### `AuthContext.jsx` — aggiungere il token

La versione attuale non salva il token. Quando colleghi il backend:

```jsx
export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  function login(userData, jwtToken) {
    localStorage.setItem('token', jwtToken)
    setToken(jwtToken)
    setUser({
      id:     userData.id,
      nome:   userData.nome || userData.name || '',
      name:   userData.nome || userData.name || '',
      email:  userData.email || '',
      telefono: userData.telefono || '',
      ruolo:  userData.ruolo || 'User',
    })
  }

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  function isAdmin() {
    return user?.ruolo === 'Admin'
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### `Login.jsx` — usare l'API reale

Sostituisci `handleSubmit` con:

```js
async function handleSubmit(e) {
  e.preventDefault()
  setError('')
  const res = await api.login(email, password)
  if (res.success) {
    login(res.data.user, res.data.token)  // salva user + token nel context
    navigate('/')
  } else {
    setError(res.message || 'Errore durante il login')
  }
}
```

Rimuovi il checkbox "Accedi come amministratore" — il ruolo viene dal server.

### Tutte le chiamate API autenticate

Le funzioni in `api.js` ricevono già `token` come parametro. I componenti devono
prenderlo da `useAuth()` e passarlo:

```js
const { token } = useAuth()
api.createPrenotazione(data, token)
api.cancelPrenotazione(id, token)
api.getAllPrenotazioni(token)
// ecc.
```

### `Home.jsx` — rimuovere campi generati lato client

Nel body di `createPrenotazione` rimuovi:
- `utente_id: user.id` → il backend lo legge dal token JWT
- `codice_prenotazione: codice` → il backend lo genera con NanoID
- `parcheggio_nome: selectedParking.nome` → il backend lo legge dal DB

E rimuovi la riga `const codice = uuidv4().slice(0, 8).toUpperCase()`.

### Aggiungere pagina `/register`

Non esiste ancora. Crea `src/pages/Register.jsx` con i campi `nome`, `cognome`, `email`, `password`
che chiama `api.register(...)` (da aggiungere anche in `api.js`):

```js
export async function register(data) {
  if (USE_MOCK) return mock.mockLogin(data.email, data.password)
  return request('POST', '/auth/register', data)
}
```
