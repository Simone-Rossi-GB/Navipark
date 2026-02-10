# 📚 LAMP Stack per Docenti - Documentazione Completa

## 🎯 Introduzione

Questo progetto fornisce un ambiente LAMP (Linux, Apache, MySQL, PHP) completo utilizzando Docker, ideale per l'insegnamento dello sviluppo web e la gestione di database. Lo stack è pre-configurato e pronto all'uso per studenti e docenti.

## 🏗️ Architettura dello Stack

### Componenti Installati

| Componente | Versione | Descrizione | Porta |
|------------|----------|-------------|-------|
| **Apache** | 2.4.62 | Web server con SSL abilitato | 9080 (HTTP), 9443 (HTTPS) |
| **PHP** | 8.2.28 | Linguaggio di programmazione server-side | - |
| **MariaDB** | 10.11.13 | Database server (compatibile MySQL) | 3306 |
| **phpMyAdmin** | Latest | Interfaccia web per gestione database | 8080 |

### 🐳 Struttura Docker

```
docker-for-school/
├── docker-compose.yml          # Orchestrazione dei servizi
├── apache-php/
│   ├── Dockerfile             # Immagine personalizzata Apache+PHP
│   └── php.ini               # Configurazione PHP
├── apache-config/
│   ├── 000-default.conf      # Configurazione Apache (HTTP/HTTPS)
│   └── ssl-default.conf      # Template SSL (di riferimento)
├── db-init/
│   └── 01-init.sql           # Script inizializzazione database
└── www/
    ├── index.php             # Pagina di test dello stack
    └── welcome.html          # Pagina HTML di benvenuto
```

## 🚀 Come Avviare lo Stack

### Prerequisiti
- Docker Desktop installato
- PowerShell o terminale Windows

### Comandi Base

```powershell
# Avvio di tutti i servizi
docker compose up 

# Controllo stato servizi
docker compose ps

# Visualizzazione log
docker compose logs web
docker compose logs database

# Arresto servizi
docker compose down

# Ricostruzione immagine (dopo modifiche)
docker build -t docker-for-school-web ./apache-php
docker compose up -d --force-recreate
```

## NOTE PER IL PRIMO AVVIO

- Potrebbe capitare che al primo avvio su Windows si apra una finestra di richiesta di condivisione di una cartella del progetto in docker, rispondere affermativamente. Successivamente il comando docker fallisce, tuttavia basta ridare docker compose up per riavviare tutto con `docker compose up`. Potrebbe succedere due o tre volte, ma basta riavviare il processo e una volta avviato lo lo stack non verrà più fatta la domanda

- E' necessario impostare il proxy per git usando i comandi 

```
# Per proxy HTTP
git config --global http.proxy http://proxy-host:proxy-port

# Per proxy HTTPS  
git config --global https.proxy https://proxy-host:proxy-port
```

- IMPORTANTE: Solo una sessione di docker desktop deve essere attiva, altrimenti si ottengono errori

## 🌐 Accessi Web

| Servizio | URL | Credenziali | Descrizione |
|----------|-----|-------------|-------------|
| **Sito Web HTTP** | http://localhost:9080 | - | Pagine web degli studenti |
| **Sito Web HTTPS** | https://localhost:9443 | - | Versione sicura (certificato self-signed) |
| **phpMyAdmin** | http://localhost:8080 | `root` / `rootpassword` | Gestione database |

## 📁 Dove Inserire le Pagine Web

### Directory Principale: `www/`

Tutti i file web (HTML, PHP, CSS, JS, immagini) vanno inseriti nella cartella **`www/`**:

```
www/
├── index.php              # Pagina principale (già presente)
├── welcome.html           # Template HTML
├── studenti/              # Cartella per progetti studenti
│   ├── mario/
│   │   ├── index.html
│   │   └── style.css
│   └── luigi/
│       ├── progetto1.php
│       └── assets/
├── esercizi/              # Esercitazioni guidate
│   ├── php-base/
│   ├── database/
│   └── javascript/
└── risorse/              # File condivisi (CSS, JS, immagini)
    ├── css/
    ├── js/
    └── images/
```

### Struttura Consigliata per i Progetti

```
www/
├── index.php                    # Landing page dello stack
├── classe-5a/                   # Organizzazione per classi
│   ├── studente1/
│   │   ├── index.html
│   │   ├── portfolio/
│   │   └── esercizi/
│   └── studente2/
├── progetti-comuni/             # Progetti collaborativi
├── template/                    # Template per nuovi progetti
└── esempi-docente/             # Esempi e soluzioni
```

## 🗄️ Gestione Database

### Database Pre-configurato
- **Nome Database**: `school_db`
- **Utente**: `root`
- **Password**: `rootpassword`
- **Porta**: `3306`

### Tabelle di Esempio
Il database include una tabella `users` con dati di test:

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Connessione PHP al Database

```php
<?php
$servername = "database";  // Nome del servizio Docker
$username = "root";
$password = "rootpassword";
$dbname = "school_db";

try {
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connessione riuscita!";
} catch(PDOException $e) {
    echo "Errore: " . $e->getMessage();
}
?>
```

## 🔧 Configurazioni Avanzate

### Modificare la Configurazione PHP

Editare il file `apache-php/php.ini`:
```ini
; Memoria massima per script
memory_limit = 128M

; Dimensione massima upload
upload_max_filesize = 64M
post_max_size = 64M

; Visualizzazione errori (solo sviluppo)
display_errors = On
error_reporting = E_ALL
```

### Aggiungere Estensioni PHP

Modificare `apache-php/Dockerfile`:
```dockerfile
# Installare nuove estensioni
RUN docker-php-ext-install gd zip

# Abilitare estensioni PECL
RUN pecl install redis && docker-php-ext-enable redis
```

### Configurazione SSL Personalizzata

Per certificati SSL personalizzati, modificare `apache-config/000-default.conf`:
```apache
SSLCertificateFile /etc/ssl/certs/your-cert.pem
SSLCertificateKeyFile /etc/ssl/private/your-key.key
```

## 📚 Esempi Didattici

### 1. Primo Script PHP
Creare `www/hello.php`:
```php
<?php
echo "<h1>Ciao dalla classe!</h1>";
echo "<p>Oggi è: " . date('d/m/Y H:i') . "</p>";
?>
```

### 2. Form con Database
Creare `www/registro.php`:
```php
<?php
if ($_POST['nome']) {
    // Connessione al database
    $pdo = new PDO("mysql:host=database;dbname=school_db", "root", "rootpassword");
    
    // Inserimento dati
    $stmt = $pdo->prepare("INSERT INTO users (name, email) VALUES (?, ?)");
    $stmt->execute([$_POST['nome'], $_POST['email']]);
    
    echo "<p>Utente registrato con successo!</p>";
}
?>

<form method="post">
    Nome: <input type="text" name="nome" required><br>
    Email: <input type="email" name="email" required><br>
    <button type="submit">Registra</button>
</form>
```

### 3. API JSON
Creare `www/api/studenti.php`:
```php
<?php
header('Content-Type: application/json');

$pdo = new PDO("mysql:host=database;dbname=school_db", "root", "rootpassword");
$stmt = $pdo->query("SELECT * FROM users");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($users);
?>
```

## 🔒 Sicurezza e Best Practices

### Per Produzione (NON per sviluppo)
- Cambiare password database predefinite
- Disabilitare `display_errors` in PHP
- Usare certificati SSL validi
- Configurare firewall appropriato

### Per l'Aula
- Mantenere le password semplici per facilità d'uso
- Utilizzare il certificato self-signed fornito
- Monitorare l'uso delle risorse

## 🎓 Attività Didattiche Suggerite

### Livello Base
1. **HTML/CSS**: Creare pagine statiche nella cartella `www/`
2. **PHP Base**: Echo, variabili, include
3. **Form Processing**: Gestione POST/GET

### Livello Intermedio
1. **Database**: CRUD operations con phpMyAdmin
2. **Sessions**: Login/logout
3. **File Upload**: Gestione immagini

### Livello Avanzato
1. **API Development**: REST API con JSON
2. **AJAX**: Comunicazione asincrona
3. **Security**: Validazione input, prepared statements

## 🛠️ Troubleshooting

### Problemi Comuni

**Errore: "Port already in use"**
```powershell
# Verificare processi in uso
netstat -ano | findstr :9080
# Cambiare porta in docker-compose.yml
```

**Database non raggiungibile**
```powershell
# Verificare che il servizio database sia in esecuzione
docker-compose ps
# Riavviare se necessario
docker-compose restart database
```

**Modifiche PHP non visibili**
```powershell
# Ricostruire l'immagine
docker build -t docker-for-school-web ./apache-php
docker-compose up -d --force-recreate
```

### Log Utili
```powershell
# Log Apache
docker-compose logs web

# Log Database  
docker-compose logs database

# Log in tempo reale
docker-compose logs -f web
```

## 📞 Supporto

Per problemi o domande:
1. Controllare i log con i comandi sopra
2. Verificare che Docker Desktop sia in esecuzione
3. Consultare la documentazione Docker ufficiale

## 🔄 Aggiornamenti e Backup

### Backup Database
```powershell
# Esportare database
docker exec lamp_db mysqldump -u root -prootpassword school_db > backup.sql

# Importare database
docker exec -i lamp_db mysql -u root -prootpassword school_db < backup.sql
```

### Backup Progetti
I file nella cartella `www/` sono automaticamente persistenti e possono essere copiati normalmente.

---

**Buon insegnamento! 🎓**

*Documentazione creata per l'ambiente LAMP Docker - Giugno 2025*
