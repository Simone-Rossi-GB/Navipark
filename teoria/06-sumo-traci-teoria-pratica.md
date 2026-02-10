# SUMO + TraCI -- Simulazione Traffico e Parcheggio con Python

## Indice
1. [Teoria fondamentale: cos'e' SUMO](#1-teoria-fondamentale-cose-sumo)
2. [Architettura e file di SUMO](#2-architettura-e-file-di-sumo)
3. [Il sistema di parcheggio in SUMO](#3-il-sistema-di-parcheggio-in-sumo)
4. [TraCI: controllare SUMO da Python](#4-traci-controllare-sumo-da-python)
5. [Importare mappe da OpenStreetMap](#5-importare-mappe-da-openstreetmap)
6. [Esercizi pratici isolati](#6-esercizi-pratici-isolati)
7. [Contesto nel progetto Parcheggio + Docker](#7-contesto-nel-progetto-parcheggio--docker)
8. [Collegare SUMO a PostgreSQL](#8-collegare-sumo-a-postgresql)
9. [Errori comuni e debugging](#9-errori-comuni-e-debugging)
10. [Domande di autovalutazione](#10-domande-di-autovalutazione)

---

## 1. Teoria fondamentale: cos'e' SUMO

### SUMO in breve

**SUMO** (Simulation of Urban MObility) e' un simulatore di traffico **microscopico** open-source sviluppato dal DLR (Centro Aerospaziale Tedesco). "Microscopico" significa che simula **ogni singolo veicolo** individualmente, con la sua velocita', accelerazione, scelte di percorso e comportamento di guida.

### Microscopico vs Macroscopico

**Simulazione macroscopica** (es: flusso di acqua):
- Il traffico e' un "fluido" con densita' e velocita' media
- Non sai cosa fa il singolo veicolo
- Utile per pianificazione a larga scala

**Simulazione microscopica** (es: SUMO):
- Ogni veicolo e' un agente con posizione, velocita', destinazione
- I veicoli reagiscono tra loro (frenano, sorpassano, cercano parcheggio)
- Utile per analisi dettagliate e scenari realistici

### Cosa simula SUMO

- **Veicoli**: auto, camion, moto, biciclette, autobus
- **Pedoni**: attraversamenti, marciapiedi, interazioni con veicoli
- **Trasporto pubblico**: linee bus/tram con fermate e orari
- **Semafori**: cicli fissi, attuati (sensori), adattivi
- **Parcheggio**: aree di sosta con capacita', rerouting quando pieno
- **Emissioni**: CO2, NOx, PM basati su modelli HBEFA
- **Incidenti**: veicoli fermi che bloccano corsie

### Modello di car-following

Ogni veicolo segue un modello matematico per decidere come accelerare/frenare rispetto al veicolo davanti. Il modello default e' **Krauss**:

```
v_safe = v_leader + (gap - v_leader * tau) / (tau + v / (2 * decel))

dove:
  v_leader = velocita' del veicolo davanti
  gap = distanza dal veicolo davanti
  tau = tempo di reazione del conducente
  decel = decelerazione massima
```

Non devi implementare questo modello -- SUMO lo gestisce internamente. Ma e' importante capire che il comportamento dei veicoli non e' casuale: segue regole fisiche realistiche.

---

## 2. Architettura e file di SUMO

### I file di una simulazione

Una simulazione SUMO e' composta da piu' file XML:

```
simulation/
    |
    +-- city.net.xml         <-- RETE STRADALE (nodi, archi, corsie, semafori)
    |                            Generato da netconvert o netedit
    |
    +-- traffic.rou.xml      <-- VEICOLI E PERCORSI
    |                            Tipi di veicoli, rotte, orari di partenza
    |
    +-- parking.add.xml      <-- INFRASTRUTTURA AGGIUNTIVA
    |                            Parcheggi, rerouter, sensori, fermate bus
    |
    +-- simulation.sumocfg   <-- CONFIGURAZIONE
    |                            Unisce tutti i file, definisce tempo simulazione
    |
    +-- output/              <-- RISULTATI (opzionali)
         +-- tripinfo.xml    <-- Info per ogni viaggio completato
         +-- stopinfo.xml    <-- Info su ogni sosta (parcheggio)
         +-- fcd.xml         <-- Floating Car Data (posizione/velocita' ogni step)
```

### Il file di rete (.net.xml)

**MAI scriverlo a mano.** Viene generato da:
- `netconvert` (da OpenStreetMap o altri formati)
- `netedit` (editor grafico di SUMO)

Concetti della rete:

```
NODO (Junction) = intersezione stradale
    |
ARCO (Edge) = segmento di strada tra due nodi
    |
CORSIA (Lane) = singola corsia di un arco (es: edge_0, edge_1)
    |
CONNESSIONE = come le corsie si collegano tra archi
```

```
   Nodo A ----Edge1 (2 corsie)---- Nodo B ----Edge2 (1 corsia)---- Nodo C
      |                                |
      Edge3                        Edge4
      |                                |
   Nodo D                          Nodo E
```

### Il file dei percorsi (.rou.xml)

Definisce CHI viaggia, DOVE e QUANDO.

```xml
<routes>
    <!-- Tipo di veicolo: definisce caratteristiche fisiche -->
    <vType id="auto_normale" accel="2.6" decel="4.5" sigma="0.5"
           length="5" maxSpeed="50" color="1,0,0"/>

    <!-- Percorso: sequenza di archi da attraversare -->
    <route id="percorso1" edges="edge1 edge2 edge3 edge4"/>

    <!-- Veicolo: usa un tipo e un percorso, parte al tempo depart -->
    <vehicle id="car_0" type="auto_normale" route="percorso1" depart="0"/>
    <vehicle id="car_1" type="auto_normale" route="percorso1" depart="10"/>

    <!-- Flusso: genera N veicoli in un intervallo -->
    <flow id="flusso1" type="auto_normale" route="percorso1"
          begin="0" end="3600" number="100"/>
    <!-- 100 veicoli distribuiti uniformemente nella prima ora -->
</routes>
```

**Attributi chiave di vType**:

| Attributo | Significato | Unita' |
|-----------|------------|--------|
| `accel` | Accelerazione massima | m/s^2 |
| `decel` | Decelerazione massima | m/s^2 |
| `sigma` | Imperfezione del conducente (0=perfetto, 1=pessimo) | - |
| `length` | Lunghezza veicolo | metri |
| `maxSpeed` | Velocita' massima | m/s |
| `tau` | Tempo di reazione | secondi |

### Il file di configurazione (.sumocfg)

Unisce tutto:

```xml
<configuration>
    <input>
        <net-file value="city.net.xml"/>
        <route-files value="traffic.rou.xml"/>
        <additional-files value="parking.add.xml"/>
    </input>
    <time>
        <begin value="0"/>       <!-- Secondo iniziale -->
        <end value="86400"/>     <!-- 86400 secondi = 24 ore -->
    </time>
    <processing>
        <parking.maneuver value="true"/>  <!-- Simula tempi di manovra -->
    </processing>
</configuration>
```

---

## 3. Il sistema di parcheggio in SUMO

### Definire un'area di parcheggio

Le aree di parcheggio si definiscono nel file `.add.xml`:

```xml
<additional>
    <!-- Parcheggio a bordo strada: 10 posti lungo l'arco "main_rd" -->
    <parkingArea id="park_stazione"
                 lane="main_rd_0"
                 startPos="200" endPos="300"
                 roadsideCapacity="10"
                 angle="90"
                 width="3.5"/>

    <!-- Parcheggio con posti individuali (posizioni precise) -->
    <parkingArea id="park_centro"
                 lane="centro_rd_0"
                 startPos="50" endPos="150"
                 roadsideCapacity="0">
        <space x="500" y="300" angle="0"/>
        <space x="505" y="300" angle="0"/>
        <space x="510" y="300" angle="0"/>
        <space x="515" y="300" angle="0"/>
    </parkingArea>
</additional>
```

**Attributi chiave di parkingArea**:

| Attributo | Significato |
|-----------|------------|
| `id` | Identificativo univoco |
| `lane` | Corsia su cui si affaccia il parcheggio |
| `startPos` / `endPos` | Posizione sull'arco (in metri) |
| `roadsideCapacity` | Numero di posti a bordo strada |
| `angle` | Angolo di parcheggio (0=parallelo, 90=perpendicolare) |
| `onRoad` | Se true, i veicoli restano sulla carreggiata (sosta in doppia fila) |
| `acceptedBadges` | Controllo accesso (es: "disabili", "elettrico") |

**Capacita' totale** = `roadsideCapacity` + numero di elementi `<space>`.

### Rerouting: cosa succede quando il parcheggio e' pieno

Senza rerouter: il veicolo arriva, trova pieno, si blocca (non realistico).

Con **parkingAreaReroute**: il veicolo cerca un'alternativa.

```xml
<additional>
    <!-- Definisco i parcheggi -->
    <parkingArea id="park_A" lane="main_0" startPos="100" endPos="200"
                 roadsideCapacity="5"/>
    <parkingArea id="park_B" lane="side_0" startPos="50" endPos="150"
                 roadsideCapacity="8"/>
    <parkingArea id="park_C" lane="back_0" startPos="200" endPos="350"
                 roadsideCapacity="15"/>

    <!-- Rerouter: se park_A e' pieno, prova B o C -->
    <rerouter id="rr_parking" edges="main side approach">
        <interval begin="0" end="86400">
            <parkingAreaReroute id="park_A" visible="true"/>
            <parkingAreaReroute id="park_B" visible="true"/>
            <parkingAreaReroute id="park_C" visible="false"/>
        </interval>
    </rerouter>
</additional>
```

**`visible="true"`**: il veicolo "sa" quanti posti ha il parcheggio (modella un sistema informativo, tipo la tua app!).
**`visible="false"`**: il veicolo deve arrivarci per scoprire se e' pieno.

### Strategia di scelta del parcheggio

Quando un veicolo deve scegliere tra piu' parcheggi, SUMO usa un **modello a punteggio pesato**. Per ogni parcheggio candidato con posti liberi, calcola:

```
score = w1 * distanza_dal_veicolo
      + w2 * tempo_di_viaggio
      + w3 * distanza_dalla_destinazione_finale
      + w4 * (1 - posti_liberi / capacita')
      + w5 * probabilita'
```

Il parcheggio con score **minimo** viene scelto.

I pesi si configurano per tipo di veicolo:

```xml
<vType id="pendolare">
    <param key="parking.distanceto.weight" value="0.5"/>
    <param key="parking.distancefrom.weight" value="0.5"/>
    <param key="parking.relfreespace.weight" value="0.3"/>
    <param key="parking.frustration" value="200"/>
    <param key="parking.memory" value="600"/>
    <param key="parking.knowledge" value="0.8"/>
</vType>
```

| Parametro | Significato |
|-----------|------------|
| `parking.distanceto.weight` | Peso della distanza veicolo -> parcheggio |
| `parking.distancefrom.weight` | Peso della distanza parcheggio -> destinazione finale |
| `parking.relfreespace.weight` | Peso dei posti liberi relativi |
| `parking.frustration` | Dopo N secondi di ricerca, accetta qualsiasi parcheggio |
| `parking.memory` | Per quanti secondi ricorda un parcheggio pieno (non ci ritorna) |
| `parking.knowledge` | Probabilita' (0-1) di conoscere l'occupazione di parcheggi "invisible" |

**Questo e' direttamente collegato al tuo progetto**: la tua app dara' informazioni in tempo reale, equivalente a `visible="true"` + `parking.knowledge=1.0` per chi usa l'app.

### Fermate e parcheggio nei percorsi

Per far parcheggiare un veicolo:

```xml
<vehicle id="car_0" type="pendolare" route="casa_lavoro" depart="0">
    <!-- Si ferma al parcheggio park_A per 8 ore (28800 secondi) -->
    <stop parkingArea="park_A" duration="28800" parking="true"/>
</vehicle>

<!-- Con flusso: tutti i veicoli del flusso cercano park_A -->
<flow id="pendolari" type="pendolare" route="casa_lavoro"
      begin="25200" end="32400" number="50">
    <stop parkingArea="park_A" duration="28800" parking="true"/>
</flow>
```

**`parking="true"`** e' fondamentale: senza, il veicolo si "ferma" sulla corsia bloccando il traffico (come una fermata bus).

---

## 4. TraCI: controllare SUMO da Python

### Cos'e' TraCI

**TraCI** (Traffic Control Interface) e' un'API client-server che permette di controllare SUMO da programmi esterni, step per step. Il programma piu' comune e' Python.

```
Python (client)  <--socket TCP-->  SUMO (server)
    |                                   |
    | traci.simulationStep()            |
    | --------------------------------> |
    |                                   | Avanza di 1 step
    | <-------------------------------- |
    |                                   |
    | traci.parkingarea.getVehicleCount("park_A")
    | --------------------------------> |
    |                                   | Legge lo stato
    | <--- 7 (ci sono 7 veicoli) ------|
```

### Installazione

```bash
pip install traci
```

### Il loop di simulazione base

```python
import traci

# Avvia SUMO come sottoprocesso
# "sumo" = senza GUI, "sumo-gui" = con interfaccia grafica
sumoCmd = ["sumo", "-c", "simulation.sumocfg"]
traci.start(sumoCmd)

# Loop: avanza di un step alla volta finche' ci sono veicoli
while traci.simulation.getMinExpectedNumber() > 0:
    traci.simulationStep()  # Avanza di 1 secondo (default)

    # Qui puoi leggere lo stato e interagire
    tempo = traci.simulation.getTime()
    n_veicoli = traci.vehicle.getIDCount()
    print(f"Tempo: {tempo}s, Veicoli attivi: {n_veicoli}")

traci.close()
```

### Domini principali di TraCI

TraCI e' organizzato in **domini**, ognuno un modulo Python:

| Dominio | Cosa controlla | Esempio |
|---------|---------------|---------|
| `traci.simulation` | Simulazione globale | `getTime()`, `getMinExpectedNumber()` |
| `traci.vehicle` | Singoli veicoli | `getSpeed("car_0")`, `getPosition("car_0")` |
| `traci.edge` | Archi stradali | `getTraveltime("edge1")` |
| `traci.lane` | Corsie | `getLength("edge1_0")` |
| `traci.parkingarea` | Aree parcheggio | `getVehicleCount("park_A")` |
| `traci.trafficlight` | Semafori | `setPhase("tl_1", 0)` |
| `traci.route` | Percorsi | `add("r1", ["e1","e2"])` |

### Metodi per il parcheggio

```python
# Lista di tutte le aree di parcheggio
parking_ids = traci.parkingarea.getIDList()
# ("park_A", "park_B", "park_C")

# Quanti veicoli sono parcheggiati in park_A
count = traci.parkingarea.getVehicleCount("park_A")

# Quali veicoli sono parcheggiati
vehicles = traci.parkingarea.getVehicleIDs("park_A")

# Su quale corsia si trova il parcheggio
lane = traci.parkingarea.getLaneID("park_A")

# Posizione inizio e fine sull'arco
start = traci.parkingarea.getStartPos("park_A")
end = traci.parkingarea.getEndPos("park_A")
```

### Metodi per i veicoli

```python
# Posizione (x, y) del veicolo
pos = traci.vehicle.getPosition("car_0")

# Velocita' in m/s
speed = traci.vehicle.getSpeed("car_0")

# Su quale arco si trova
road = traci.vehicle.getRoadID("car_0")

# Percorso rimanente
route = traci.vehicle.getRoute("car_0")

# Forzare rerouting verso un parcheggio diverso
traci.vehicle.rerouteParkingArea("car_0", "park_B")

# Aggiungere un veicolo dinamicamente
traci.route.add("nuova_rotta", ["edge1", "edge2", "edge3"])
traci.vehicle.add("new_car", "nuova_rotta", typeID="pendolare")
```

### Subscriptions (per performance)

Chiamare `getSpeed()` per ogni veicolo ad ogni step e' lento (una chiamata di rete per veicolo). Le **subscriptions** raggruppano le richieste:

```python
import traci.constants as tc

# Sottoscrivi: per "car_0", ad ogni step dammi velocita' e posizione
traci.vehicle.subscribe("car_0", [tc.VAR_SPEED, tc.VAR_POSITION])

# Nel loop:
traci.simulationStep()
result = traci.vehicle.getSubscriptionResults("car_0")
# {tc.VAR_SPEED: 13.5, tc.VAR_POSITION: (500.3, 200.1)}
```

### Context Subscriptions

Ancora piu' potente: "dammi tutti i veicoli entro 100 metri dal nodo X":

```python
# Tutti i veicoli entro 100m dalla giunzione "incrocio_1"
traci.junction.subscribeContext(
    "incrocio_1",
    tc.CMD_GET_VEHICLE_VARIABLE,
    100.0,  # raggio in metri
    [tc.VAR_SPEED, tc.VAR_WAITING_TIME]
)

traci.simulationStep()
context = traci.junction.getContextSubscriptionResults("incrocio_1")
# {"car_0": {tc.VAR_SPEED: 5.2, tc.VAR_WAITING_TIME: 3.0},
#  "car_1": {tc.VAR_SPEED: 0.0, tc.VAR_WAITING_TIME: 15.0}}
```

---

## 5. Importare mappe da OpenStreetMap

### Metodo veloce: osmWebWizard

```bash
python $SUMO_HOME/tools/osmWebWizard.py
```

Si apre un browser. Selezioni l'area, configuri il traffico, clicchi "Generate Scenario". SUMO si apre con la simulazione pronta.

**Su Windows**: Menu Start > SUMO > OSM Web Wizard.

### Metodo manuale: netconvert

```bash
# 1. Scarica i dati OSM (via script SUMO)
python $SUMO_HOME/tools/osmGet.py \
    --bbox 7.64,45.04,7.72,45.10 \
    --prefix torino

# 2. Converti in rete SUMO
netconvert --osm-files torino.osm.xml \
    -o torino.net.xml \
    --geometry.remove \
    --ramps.guess \
    --junctions.join \
    --tls.guess-signals \
    --tls.join \
    --output.street-names \
    --remove-edges.isolated

# 3. (Opzionale) Estrai parcheggi da OSM
netconvert --osm-files torino.osm.xml \
    -o torino.net.xml \
    --parking-output parking_from_osm.add.xml

# 4. (Opzionale) Estrai edifici e poligoni
polyconvert --net-file torino.net.xml \
    --osm-files torino.osm.xml \
    --type-file $SUMO_HOME/data/typemap/osmPolyconvert.typ.xml \
    -o buildings.add.xml
```

### Generare parcheggi automaticamente

SUMO ha tool per generare parcheggi sulla rete:

```bash
# Genera parcheggi probabilistici lungo tutta la rete
python $SUMO_HOME/tools/generateParkingAreas.py \
    -n torino.net.xml \
    -o parking.add.xml

# Genera rerouter automatici per i parcheggi
python $SUMO_HOME/tools/generateParkingAreaRerouters.py \
    -n torino.net.xml \
    -a parking.add.xml \
    -o rerouters.add.xml
```

### Generare traffico

```bash
# randomTrips: genera viaggi casuali sulla rete
python $SUMO_HOME/tools/randomTrips.py \
    -n torino.net.xml \
    -o trips.xml \
    --begin 0 --end 3600 \
    --period 5 \
    --route-file traffic.rou.xml
```

`--period 5` = un nuovo veicolo ogni 5 secondi = 720 veicoli/ora.

---

## 6. Esercizi pratici isolati

### Esercizio 1: La tua prima simulazione (senza parcheggio)

**Obiettivo**: creare una simulazione minimale e capire i file.

1. Installa SUMO: https://sumo.dlr.de/docs/Installing.html
2. Usa netedit per creare una rete semplice (3 nodi, 2 archi):
   ```bash
   netedit
   ```
   - Modalita' Network > crea 3 nodi cliccando
   - Connettili con archi
   - Salva come `simple.net.xml`

3. Crea un file percorsi `simple.rou.xml`:
   ```xml
   <routes>
       <vType id="car" accel="2.6" decel="4.5" length="5" maxSpeed="20"/>
       <route id="r1" edges="edge1 edge2"/>
       <flow id="f1" type="car" route="r1" begin="0" end="300" number="30"/>
   </routes>
   ```

4. Crea `simple.sumocfg`:
   ```xml
   <configuration>
       <input>
           <net-file value="simple.net.xml"/>
           <route-files value="simple.rou.xml"/>
       </input>
       <time>
           <begin value="0"/>
           <end value="600"/>
       </time>
   </configuration>
   ```

5. Lancia: `sumo-gui -c simple.sumocfg`
6. Premi Play e osserva i veicoli

**Domanda**: cosa succede se metti `number="100"` ma la rete e' corta? (I veicoli si accodano.)

---

### Esercizio 2: Aggiungi un parcheggio

**Obiettivo**: definire un parcheggio e far fermare i veicoli.

1. Crea `parking.add.xml`:
   ```xml
   <additional>
       <parkingArea id="park1" lane="edge2_0"
                    startPos="50" endPos="150"
                    roadsideCapacity="5" angle="90"/>
   </additional>
   ```

2. Modifica `simple.rou.xml` per far parcheggiare i veicoli:
   ```xml
   <routes>
       <vType id="car" accel="2.6" decel="4.5" length="5" maxSpeed="20"/>
       <route id="r1" edges="edge1 edge2"/>
       <flow id="f1" type="car" route="r1" begin="0" end="300" number="10">
           <stop parkingArea="park1" duration="120" parking="true"/>
       </flow>
   </routes>
   ```

3. Aggiorna `simple.sumocfg`:
   ```xml
   <additional-files value="parking.add.xml"/>
   ```

4. Lancia e osserva: i veicoli parcheggiano, stanno 120 secondi, poi ripartono.

**Compiti**:
- Metti `number="20"` con solo 5 posti. Cosa succede ai veicoli extra?
- Aggiungi un secondo parcheggio e un rerouter.

---

### Esercizio 3: Rerouting tra parcheggi

**Obiettivo**: implementare la ricerca del parcheggio.

1. Aggiungi un secondo parcheggio e un rerouter a `parking.add.xml`:
   ```xml
   <additional>
       <parkingArea id="park_A" lane="edge1_0"
                    startPos="100" endPos="200"
                    roadsideCapacity="3"/>
       <parkingArea id="park_B" lane="edge2_0"
                    startPos="50" endPos="200"
                    roadsideCapacity="8"/>

       <rerouter id="rr1" edges="edge1 edge2">
           <interval begin="0" end="86400">
               <parkingAreaReroute id="park_A" visible="true"/>
               <parkingAreaReroute id="park_B" visible="true"/>
           </interval>
       </rerouter>
   </additional>
   ```

2. Configura i veicoli per preferire park_A:
   ```xml
   <vType id="car" accel="2.6" decel="4.5" length="5" maxSpeed="20">
       <param key="parking.distanceto.weight" value="1.0"/>
       <param key="parking.frustration" value="100"/>
   </vType>
   ```

3. Manda 15 veicoli verso park_A (3 posti). Osserva il rerouting verso park_B.

**Domanda**: cambia `visible="true"` in `visible="false"` per park_B. Come cambia il comportamento dei veicoli?

---

### Esercizio 4: Il tuo primo script TraCI

**Obiettivo**: controllare la simulazione da Python.

```python
import traci
import csv

# Avvia SUMO
traci.start(["sumo", "-c", "simple.sumocfg"])

# Prepara file CSV per i dati
with open("parking_data.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["tempo", "parcheggio", "occupazione", "veicoli"])

    while traci.simulation.getMinExpectedNumber() > 0:
        traci.simulationStep()
        tempo = traci.simulation.getTime()

        # Ogni 10 secondi, registra l'occupazione
        if tempo % 10 == 0:
            for pa_id in traci.parkingarea.getIDList():
                count = traci.parkingarea.getVehicleCount(pa_id)
                veicoli = traci.parkingarea.getVehicleIDs(pa_id)
                writer.writerow([tempo, pa_id, count, ";".join(veicoli)])
                print(f"[{tempo:.0f}s] {pa_id}: {count} veicoli")

traci.close()
print("Simulazione completata! Dati in parking_data.csv")
```

**Compiti**:
1. Esegui lo script
2. Apri `parking_data.csv`: riesci a vedere il pattern di arrivo e partenza?
3. Modifica lo script per registrare anche la velocita' media dei veicoli attivi

---

### Esercizio 5: Aggiungere veicoli dinamicamente con TraCI

**Obiettivo**: creare veicoli a runtime, senza definirli nel .rou.xml.

```python
import traci
import random

traci.start(["sumo", "-c", "simple.sumocfg"])

# Definisci una rotta (gli archi devono esistere nella rete)
traci.route.add("route_parking", ["edge1", "edge2"])

vehicle_counter = 0

while traci.simulation.getMinExpectedNumber() > 0 or vehicle_counter < 20:
    traci.simulationStep()
    tempo = traci.simulation.getTime()

    # Ogni 30 secondi, aggiungi un veicolo con probabilita' 50%
    if tempo % 30 == 0 and vehicle_counter < 20:
        if random.random() < 0.5:
            veh_id = f"dynamic_car_{vehicle_counter}"
            traci.vehicle.add(veh_id, "route_parking", typeID="car")

            # Fai parcheggiare il veicolo
            # (devi conoscere l'edge su cui si trova il parcheggio)
            traci.vehicle.setStop(
                veh_id,
                edgeID="edge2",       # l'edge del parcheggio
                pos=100.0,            # posizione sull'edge
                laneIndex=0,
                duration=180,         # 3 minuti di sosta
                flags=traci.constants.STOP_PARKING_AREA,
            )

            vehicle_counter += 1
            print(f"[{tempo:.0f}s] Aggiunto {veh_id}")

traci.close()
```

**Domanda**: qual e' il vantaggio di aggiungere veicoli dinamicamente via TraCI rispetto a definirli tutti nel .rou.xml? (Suggerimento: pensa a simulazioni reattive dove il traffico dipende da condizioni in tempo reale.)

---

### Esercizio 6: Importa una mappa reale

**Obiettivo**: simulare il tuo quartiere.

1. Vai su https://www.openstreetmap.org
2. Naviga alla zona del tuo progetto (es: area della scuola o stazione)
3. Clicca "Esporta" e salva il file .osm
4. Oppure usa osmWebWizard:
   ```bash
   python $SUMO_HOME/tools/osmWebWizard.py
   ```
5. Genera parcheggi:
   ```bash
   python $SUMO_HOME/tools/generateParkingAreas.py \
       -n network.net.xml -o parking.add.xml
   python $SUMO_HOME/tools/generateParkingAreaRerouters.py \
       -n network.net.xml -a parking.add.xml -o rerouters.add.xml
   ```
6. Lancia con sumo-gui e osserva

---

## 7. Contesto nel progetto Parcheggio + Docker

### Architettura con Docker

```yaml
services:
  sumo:
    image: ghcr.io/eclipse-sumo/sumo:latest
    volumes:
      - ./simulation:/data        # File di simulazione
      - shared_data:/output       # Risultati condivisi
    ports:
      - "8813:8813"               # Porta TraCI
    command: sumo --remote-port 8813 -c /data/simulation.sumocfg

  python-backend:
    build: ./python-backend
    depends_on:
      - sumo
      - database
    volumes:
      - shared_data:/output
    environment:
      SUMO_HOST: sumo
      SUMO_PORT: 8813
      DB_HOST: database
      DB_PORT: 5432
```

### SUMO come container separato

SUMO ha dipendenze pesanti (binari C++, librerie grafiche). E' meglio tenerlo in un container dedicato piuttosto che installarlo nel container Python.

Il Python si connette via TraCI sulla rete Docker:

```python
import traci
import os

# Si connette al container SUMO
traci.init(
    port=int(os.environ.get("SUMO_PORT", 8813)),
    host=os.environ.get("SUMO_HOST", "sumo")
)
```

### Alternativa: SUMO dentro il container Python

Se preferisci semplicita':

```dockerfile
# Nel Dockerfile del python-backend
FROM python:3.11-slim

# Installa SUMO
RUN apt-get update && \
    apt-get install -y software-properties-common && \
    add-apt-repository ppa:sumo/stable && \
    apt-get update && \
    apt-get install -y sumo sumo-tools

ENV SUMO_HOME=/usr/share/sumo

# Installa dipendenze Python
COPY requirements.txt .
RUN pip install -r requirements.txt

# requirements.txt deve contenere:
# traci
# asyncpg
# fastapi
# uvicorn
```

In questo caso usi `traci.start()` (lancia SUMO come sottoprocesso) invece di `traci.init()` (si connette a un SUMO gia' in esecuzione).

---

## 8. Collegare SUMO a PostgreSQL

### Il flusso completo

```python
import traci
import asyncpg
import asyncio
import json
from datetime import datetime

async def run_simulation():
    # 1. Connettiti a PostgreSQL
    pool = await asyncpg.create_pool(
        host="database", port=5432,
        user="root", password="password",
        database="parcheggio"
    )

    # 2. Avvia SUMO
    traci.start(["sumo", "-c", "/data/simulation.sumocfg"])

    # 3. Loop di simulazione
    while traci.simulation.getMinExpectedNumber() > 0:
        traci.simulationStep()
        tempo = traci.simulation.getTime()

        # Ogni 60 secondi (1 minuto simulato), salva in DB
        if tempo % 60 == 0:
            for pa_id in traci.parkingarea.getIDList():
                occupazione = traci.parkingarea.getVehicleCount(pa_id)
                veicoli = traci.parkingarea.getVehicleIDs(pa_id)

                async with pool.acquire() as conn:
                    await conn.execute("""
                        INSERT INTO simulation_snapshots
                        (sim_time, parking_area_id, occupancy, vehicle_ids)
                        VALUES ($1, $2, $3, $4)
                    """, tempo, pa_id, occupazione, json.dumps(veicoli))

    traci.close()
    await pool.close()

asyncio.run(run_simulation())
```

### Tabella per i dati di simulazione

```sql
CREATE TABLE simulation_snapshots (
    id SERIAL PRIMARY KEY,
    sim_time FLOAT,              -- Tempo simulato (secondi)
    parking_area_id TEXT,        -- ID parcheggio SUMO
    occupancy INTEGER,           -- Numero veicoli parcheggiati
    vehicle_ids JSONB,           -- Lista veicoli
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON simulation_snapshots (parking_area_id, sim_time);
```

### Da simulazione a Parquet (per duckdb_fdw)

Per grandi volumi, scrivi in Parquet invece che direttamente in PostgreSQL:

```python
import pandas as pd

records = []

while traci.simulation.getMinExpectedNumber() > 0:
    traci.simulationStep()
    tempo = traci.simulation.getTime()

    if tempo % 60 == 0:
        for pa_id in traci.parkingarea.getIDList():
            records.append({
                "sim_time": tempo,
                "parking_id": pa_id,
                "occupancy": traci.parkingarea.getVehicleCount(pa_id)
            })

# Fine simulazione: salva in Parquet
df = pd.DataFrame(records)
df.to_parquet(f"/output/sim_{datetime.now().strftime('%Y%m%d_%H%M%S')}.parquet")
```

Poi DuckDB/duckdb_fdw lo legge da PostgreSQL (vedi 03-duckdb_fdw).

### Collegare parcheggi SUMO ai parcheggi del DB

Devi mappare gli ID parcheggio di SUMO con gli ID nella tua tabella `parcheggi`:

```sql
CREATE TABLE parking_sumo_mapping (
    sumo_parking_id TEXT PRIMARY KEY,       -- ID in SUMO (es: "park_stazione")
    parcheggio_id UUID REFERENCES parcheggi(id),  -- ID nel tuo DB
    note TEXT
);

INSERT INTO parking_sumo_mapping VALUES
    ('park_stazione', 'uuid-del-parcheggio-stazione', 'Parcheggio Stazione Nord'),
    ('park_centro', 'uuid-del-parcheggio-centro', 'Parcheggio Centro Citta');
```

---

## 9. Errori comuni e debugging

### "No module named traci"
**Soluzione**: `pip install traci` oppure aggiungi `$SUMO_HOME/tools` al PYTHONPATH.

### "Could not connect to TraCI server"
**Causa**: SUMO non e' ancora avviato quando Python tenta di connettersi.
**Soluzione**: aggiungi un retry:
```python
import time
for attempt in range(10):
    try:
        traci.init(port=8813, host="sumo")
        break
    except Exception:
        print(f"Tentativo {attempt+1}/10...")
        time.sleep(3)
```

### "Vehicle 'car_0' could not be inserted"
**Causa**: l'arco di partenza e' troppo corto o congestionato.
**Soluzione**: prova un arco di partenza piu' lungo o ritarda il `depart`.

### Parcheggio pieno ma nessun rerouting
**Causa**: manca il `<rerouter>` o gli archi nel rerouter non includono quelli percorsi dai veicoli.
**Verifica**: gli archi nel `edges=""` del rerouter sono quelli che i veicoli attraversano?

### Simulazione troppo lenta
**Soluzioni**:
- Usa `sumo` invece di `sumo-gui` (la GUI rallenta molto)
- Riduci la frequenza delle chiamate TraCI (non chiedere dati ad ogni step)
- Usa subscriptions invece di getter singoli
- Usa `libsumo` invece di `traci` (embedded, nessun socket):
  ```python
  import libsumo as traci  # Drop-in replacement, molto piu' veloce
  ```

### Output XML troppo grande
**Soluzione**: non abilitare `--fcd-output` (floating car data) su simulazioni lunghe con molti veicoli. Usa TraCI per raccogliere solo i dati che ti servono.

---

## 10. Domande di autovalutazione

1. **Concettuale**: Qual e' la differenza tra simulazione microscopica e macroscopica? Per il tuo progetto, perche' serve quella microscopica?

2. **File SUMO**: Elenca i 4 tipi di file principali di SUMO e cosa contiene ciascuno. Quale si scrive a mano e quale si genera con tool?

3. **Parcheggio**: Un veicolo in SUMO arriva a un parcheggio pieno. Descrivi passo per passo cosa succede con un rerouter configurato. Cosa cambia tra `visible="true"` e `visible="false"`?

4. **TraCI**: Qual e' la differenza tra `traci.start()` e `traci.init()`? Quando usi l'uno e quando l'altro?

5. **Architettura**: Nel tuo Docker stack, SUMO dovrebbe stare nel container Python o in un container separato? Elenca pro e contro.

6. **Dati**: SUMO simula 24 ore con 500 veicoli. Vuoi salvare l'occupazione di 10 parcheggi ogni minuto. Quanti record generi? (24 * 60 * 10 = 14.400) Dove li salvi: PostgreSQL, Parquet, o entrambi?

7. **Integrazione**: Come colleghi i dati di SUMO (parking_area IDs come stringhe) con i tuoi parcheggi nel DB (UUID)? Che tabella creeresti?

8. **Avanzata**: Vuoi simulare l'effetto della tua app: i conducenti che usano l'app hanno `parking.knowledge=1.0` (sanno dove ci sono posti), quelli senza app hanno `parking.knowledge=0.0`. Come configureresti due tipi di veicoli in SUMO per confrontare i tempi di ricerca?

---

## Risorse

- Documentazione SUMO: https://sumo.dlr.de/docs/
- ParkingArea: https://sumo.dlr.de/docs/Simulation/ParkingArea.html
- Rerouter/parkingAreaReroute: https://sumo.dlr.de/docs/Simulation/Rerouter.html
- TraCI Python: https://sumo.dlr.de/docs/TraCI/Interfacing_TraCI_from_Python.html
- TraCI ParkingArea domain: https://sumo.dlr.de/pydoc/traci._parkingarea.html
- osmWebWizard: https://sumo.dlr.de/docs/Tutorials/OSMWebWizard.html
- SUMO Docker: https://sumo.dlr.de/docs/Developer/Docker.html

---

> **Hai completato tutti i 6 moduli!** Ora hai le basi teoriche e pratiche per:
> 1. pg_cron -- automazione nel database
> 2. pgvector -- ricerca vettoriale per raccomandazioni
> 3. duckdb_fdw -- analytics OLAP sui big data
> 4. pgml -- machine learning dentro PostgreSQL
> 5. Replicazione -- alta disponibilita' e read scaling
> 6. SUMO + TraCI -- simulazione traffico e parcheggio
>
> Il passo successivo e' iniziare a implementare, partendo da pg_cron (il piu' semplice)
> e arrivando a SUMO (il piu' complesso). Buono studio!
