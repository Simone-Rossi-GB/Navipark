# Configurazione Proxy per Docker LAMP Stack

## Panoramica

Se ti trovi in un ambiente aziendale o dietro un proxy, i comandi `apt-get update` e `apt-get install` nel Dockerfile potrebbero fallire. Questa configurazione ti permette di impostare opzionalmente un proxy.

## Come configurare il proxy

### 1. Modifica il file docker-compose.yml

Nel servizio `web`, sotto la sezione `build.args`, decommentare e configurare le righe del proxy:

```yaml
web:
  build:
    context: ./apache-php
    dockerfile: Dockerfile
    args:
      # Configurazione proxy opzionale
      PROXY_HOST: "host.docker.internal"  # o l'IP della macchina host
      PROXY_PORT: "8080"                  # porta del proxy
```

### 2. Configurazioni comuni

#### Proxy sulla macchina host (Windows/Mac)
```yaml
args:
  PROXY_HOST: "host.docker.internal"
  PROXY_PORT: "8080"  # sostituire con la porta effettiva
```

#### Proxy su IP specifico
```yaml
args:
  PROXY_HOST: "192.168.1.100"  # IP del server proxy
  PROXY_PORT: "3128"           # porta del proxy
```

#### Proxy aziendale con autenticazione
Se il proxy richiede autenticazione, contattare l'amministratore di sistema per le credenziali e utilizzare:
```yaml
args:
  PROXY_HOST: "proxy.azienda.com"
  PROXY_PORT: "8080"
```

### 3. Ricostruzione del container

Dopo aver modificato la configurazione del proxy, ricostruire il container:

```bash
# Fermare i container esistenti
docker-compose down

# Ricostruire con la nuova configurazione proxy
docker-compose build --no-cache web

# Avviare i servizi
docker-compose up -d
```

## Test della configurazione

Per verificare che il proxy funzioni correttamente:

1. Controllare i log durante la costruzione:
   ```bash
   docker-compose build web
   ```

2. Se il proxy è configurato correttamente, dovresti vedere nei log che i comandi `apt-get` completano senza errori.

## Risoluzione problemi

### Errore "Could not resolve host"
- Verificare che `PROXY_HOST` sia raggiungibile dal container
- Su Windows/Mac, `host.docker.internal` dovrebbe funzionare per servizi sulla macchina host

### Errore "Connection refused"
- Verificare che la `PROXY_PORT` sia corretta
- Assicurarsi che il proxy sia in esecuzione

### Proxy con autenticazione
Se il proxy richiede username/password, modificare il Dockerfile per includere le credenziali nel formato:
```
http://username:password@proxy_host:proxy_port
```

## Disabilitazione del proxy

Per disabilitare il proxy, commentare o rimuovere le righe `PROXY_HOST` e `PROXY_PORT` dal docker-compose.yml e ricostruire il container.
