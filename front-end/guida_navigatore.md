# Guida al navigatore non turn-by-turn

Implementazione della guida da posizione utente al parcheggio prenotato.
La navigazione è una **pagina separata** (`src/pages/Navigator.jsx`), non integrata nella home.

---

## Architettura: riusare ParkingMap o creare un componente nuovo?

**Non riusare `ParkingMap.jsx`** per la navigazione. Ecco perché:

| ParkingMap (home) | NavigationMap (navigatore) |
|---|---|
| Mostra tutti i parcheggi con prezzi | Mostra solo partenza e destinazione |
| Gestisce popup di prenotazione | Nessun popup |
| viewState fisso centrato su Brescia | Mappa che segue la posizione utente |
| Nessun percorso disegnato | Disegna la LineString del percorso |

Aggiungere tutto questo a `ParkingMap` lo renderebbe un componente che fa troppe cose.
Crea invece un componente **dedicato e leggero** per la navigazione.

---

## File da creare / modificare

```
src/pages/Navigator.jsx              ← già esiste (vuoto): pagina principale
src/features/NavigationMap.jsx       ← NUOVO: mappa specializzata per navigazione
src/hooks/useNavigation.js           ← NUOVO: logica watchPosition + fetch Directions
```

Nessuna modifica a `ParkingMap.jsx` o agli altri componenti esistenti.

---

## Responsabilità di ogni file

### `Navigator.jsx` — la pagina

Gestisce la logica ad alto livello e compone la UI:
- Riceve il parcheggio di destinazione (via route params o state di React Router)
- Usa il hook `useNavigation`
- Renderizza `NavigationMap`
- Mostra un pannello in basso con: nome parcheggio, distanza, tempo stimato, CO2

```jsx
// Struttura della pagina
export default function Navigator() {
  const { state } = useLocation()          // destinazione passata da Bookings.jsx
  const { userPosition, route, isNavigating, startNavigation, stopNavigation } = useNavigation()

  return (
    <div className="navigator-page">
      <NavigationMap
        userPosition={userPosition}
        destination={state.parking}
        route={route}
      />
      <div className="navigator-panel">
        {/* info + bottone start/stop */}
      </div>
    </div>
  )
}
```

---

### `NavigationMap.jsx` — la mappa

Componente puro: riceve dati come props e li disegna. Non gestisce logica.

Props:
- `userPosition` — `{ lat, lng }` o `null`
- `destination` — oggetto parcheggio con `lat` e `lng`
- `route` — GeoJSON `LineString` o `null`

Cosa renderizza:
- `<Map>` base di react-map-gl con viewState che segue `userPosition`
- `<Marker>` per la posizione utente (icona diversa, tipo pallino blu)
- `<Marker>` per la destinazione (icona parcheggio)
- `<Source>` + `<Layer>` per il percorso, visibile solo quando `route` non è null

```jsx
import Map, { Marker, Source, Layer } from 'react-map-gl'

export default function NavigationMap({ userPosition, destination, route }) {
  return (
    <Map
      longitude={userPosition?.lng ?? destination.lng}
      latitude={userPosition?.lat ?? destination.lat}
      zoom={15}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
    >
      {/* Percorso */}
      {route && (
        <Source id="route" type="geojson" data={route}>
          <Layer
            id="route-line"
            type="line"
            paint={{ 'line-color': '#3b82f6', 'line-width': 5 }}
          />
        </Source>
      )}

      {/* Posizione utente */}
      {userPosition && (
        <Marker longitude={userPosition.lng} latitude={userPosition.lat}>
          <div className="user-dot" />
        </Marker>
      )}

      {/* Destinazione */}
      <Marker longitude={destination.lng} latitude={destination.lat}>
        <div className="destination-marker">P</div>
      </Marker>
    </Map>
  )
}
```

---

### `useNavigation.js` — il hook

Gestisce tutto lo stato e le chiamate asincrone. La pagina non sa come funziona GPS o API.

```js
import { useState, useRef } from 'react'

export function useNavigation() {
  const [userPosition, setUserPosition] = useState(null)
  const [route, setRoute] = useState(null)         // GeoJSON LineString
  const [distance, setDistance] = useState(null)   // km
  const [isNavigating, setIsNavigating] = useState(false)
  const watchIdRef = useRef(null)

  const startNavigation = async (destination) => {
    setIsNavigating(true)

    // 1. Avvia tracciamento posizione
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPosition(current)

        // 2. Ogni aggiornamento posizione → ricalcola percorso
        const newRoute = await fetchRoute(current, destination)
        if (newRoute) {
          setRoute(newRoute.geometry)
          setDistance(newRoute.distance / 1000)  // in km
        }
      },
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true }
    )
  }

  const stopNavigation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    setIsNavigating(false)
    setRoute(null)
    setUserPosition(null)
  }

  return { userPosition, route, distance, isNavigating, startNavigation, stopNavigation }
}

async function fetchRoute(from, to) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&access_token=${token}`
  const res = await fetch(url)
  const data = await res.json()
  return data.routes?.[0] ?? null   // { geometry: GeoJSON, distance: metri, duration: secondi }
}
```

---

## Flusso dei dati

```
Bottone "Naviga" in Bookings.jsx
  → navigate('/navigator', { state: { parking } })     ← React Router

Navigator.jsx
  → useNavigation() → startNavigation(parking)
       → watchPosition → setUserPosition
       → fetchRoute(userPosition, parking) → setRoute

Navigator.jsx passa a NavigationMap:
  userPosition → Marker utente
  route        → Source + Layer linea
  destination  → Marker parcheggio
```

---

## Integrazione CO2

La risposta dell'API Directions include la distanza in metri:

```js
const distanceKm = route.distance / 1000
const co2Risparmiato = distanceKm * 0.20  // kg CO2 per km
```

Mostralo nel pannello in basso in `Navigator.jsx`. Se vuoi salvarlo nelle statistiche, aggiornalo in `mockData.js` quando la navigazione finisce.

---

## Come navigare verso la pagina da `Bookings.jsx`

```jsx
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()

// Al click "Naviga" su una prenotazione:
navigate('/navigator', { state: { parking: bookingDestination } })
```

Ricordati di aggiungere la route in `App.jsx` (o dove hai il router):
```jsx
<Route path="/navigator" element={<Navigator />} />
```

---

## Step by step consigliato

1. Crea `Navigator.jsx` con layout statico (mappa + pannello) senza logica
2. Crea `NavigationMap.jsx` con mappa base e marker fisso sulla destinazione
3. Crea `useNavigation.js` → fai funzionare `watchPosition` → logga le coordinate
4. Aggiungi `fetchRoute` → logga il GeoJSON restituito dall'API
5. Collega il GeoJSON a `NavigationMap` → disegna la linea
6. Aggiungi il pannello info (distanza, tempo, CO2)
7. Aggiungi bottone start/stop navigazione

---

## Documentazione di riferimento

- Mapbox Directions API: `docs.mapbox.com/api/navigation/directions/`
- react-map-gl Source e Layer: `visgl.github.io/react-map-gl/docs/api-reference/source`
- Esempi Mapbox "add a line": `docs.mapbox.com/mapbox-gl-js/example/geojson-line/`
- MDN Geolocation watchPosition: `developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition`
- React Router — passare state: `reactrouter.com/en/main/hooks/use-navigate`

---

## Guida vocale e visiva — usando voice_instructions e banner_instructions nativi

L'approccio corretto **non è** costruire le istruzioni a mano leggendo `maneuver.instruction`.
La Directions API le prepara già per te — testo, timing e contenuto del banner inclusi.

### Parametri da aggiungere all'URL

```js
`...?geometries=geojson&overview=full
  &steps=true
  &voice_instructions=true
  &banner_instructions=true
  &roundabout_exits=true
  &language=it
  &voice_units=metric
  &access_token=${token}`
```

---

### Struttura completa della risposta con questi parametri

```js
step = {
  distance: 350,              // metri totali di questo step
  maneuver: {
    type: "turn",
    modifier: "right",
    location: [10.22, 45.53]  // [lng, lat] del punto di svolta
  },
  name: "Via Roma",

  // VOCE — l'API ti dice QUANDO parlare e COSA dire
  voiceInstructions: [
    {
      distanceAlongGeometry: 320,   // parla quando mancano 320m alla svolta
      announcement: "Tra 300 metri, svolta a destra in Via Roma",
      ssmlAnnouncement: "..."       // ignora, è per Amazon Polly
    },
    {
      distanceAlongGeometry: 50,    // parla di nuovo quando mancano 50m
      announcement: "Svolta a destra in Via Roma"
    }
  ],

  // BANNER — l'API ti dice QUANDO mostrarlo e COSA scrivere
  bannerInstructions: [
    {
      distanceAlongGeometry: 320,   // mostra il banner quando mancano 320m
      primary: {
        text: "Via Roma",
        type: "turn",
        modifier: "right",
        components: [{ text: "Via Roma", type: "text" }]
      },
      secondary: {
        text: "Verso Piazza Loggia"  // info extra (non sempre presente)
      }
    }
  ]
}
```

`distanceAlongGeometry` è la distanza **rimanente nello step corrente** quando devi
parlare/mostrare il banner. L'API fornisce tipicamente due annunci per step:
uno lontano (~300-400m) e uno vicino (~50m).

---

### Logica di avanzamento con voiceInstructions

Il cuore del sistema: per ogni aggiornamento GPS, calcoli la distanza alla svolta dello
step corrente. Quando quella distanza scende sotto il `distanceAlongGeometry` di un
annuncio che non hai ancora pronunciato → parli.

```js
// ref necessari (leggi il paragrafo su useRef più sotto)
const stepsRef = useRef([])
const currentStepIdxRef = useRef(0)
const spokenVoiceIdxRef = useRef(0)     // quanti voiceInstructions hai già detto
const shownBannerIdxRef = useRef(0)     // quanti bannerInstructions hai già mostrato

// dentro il callback watchPosition, dopo setUserPosition(current):
const steps = stepsRef.current
const idx = currentStepIdxRef.current
if (!steps.length || idx >= steps.length) return

const step = steps[idx]
const [sLng, sLat] = step.maneuver.location
const distToManeuver = distanceBetween(current, { lat: sLat, lng: sLng })

// --- VOCE ---
const voices = step.voiceInstructions ?? []
for (let i = spokenVoiceIdxRef.current; i < voices.length; i++) {
    if (distToManeuver <= voices[i].distanceAlongGeometry) {
        speakInstruction(voices[i].announcement)
        spokenVoiceIdxRef.current = i + 1
    }
}

// --- BANNER ---
const banners = step.bannerInstructions ?? []
for (let i = shownBannerIdxRef.current; i < banners.length; i++) {
    if (distToManeuver <= banners[i].distanceAlongGeometry) {
        setCurrentBanner({
            text: banners[i].primary?.text,
            type: banners[i].primary?.type,
            modifier: banners[i].primary?.modifier,
            secondary: banners[i].secondary?.text ?? null,
            distance: Math.round(distToManeuver)
        })
        shownBannerIdxRef.current = i + 1
    }
}

// --- AVANZAMENTO STEP (quando arrivi alla svolta) ---
if (distToManeuver < 15 && idx + 1 < steps.length) {
    currentStepIdxRef.current = idx + 1
    spokenVoiceIdxRef.current = 0
    shownBannerIdxRef.current = 0
}
```

Quando cambia la route (ricalcolo), resetta tutti e tre i ref a 0.

---

### Come funziona Web Speech API

API nativa del browser, zero librerie.

```js
function speakInstruction(text) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()           // interrompe eventuale voce in corso
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'it-IT'
    utterance.rate = 1.0                      // 0.5 = lento, 2.0 = veloce
    window.speechSynthesis.speak(utterance)
}
```

`cancel()` prima di `speak()` è importante: senza, se il GPS aggiorna frequentemente le
frasi si accumulano in coda e la voce continua a parlare anche dopo.

---

### Helper distanceBetween (formula Haversine)

```js
function distanceBetween(a, b) {
    const R = 6371000
    const dLat = (b.lat - a.lat) * Math.PI / 180
    const dLng = (b.lng - a.lng) * Math.PI / 180
    const x = Math.sin(dLat/2) ** 2 +
              Math.cos(a.lat * Math.PI / 180) *
              Math.cos(b.lat * Math.PI / 180) *
              Math.sin(dLng/2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}
```

---

### Banner in Navigator.jsx

Salva `currentBanner` nello stato e mostralo sopra la mappa:

```jsx
{currentBanner && (
    <div className="nav-instruction-banner">
        <span className="nav-instruction-icon">
            {maneuverIcon(currentBanner.type, currentBanner.modifier)}
        </span>
        <div className="nav-instruction-text">
            <span className="nav-instruction-main">{currentBanner.text}</span>
            {currentBanner.secondary &&
                <span className="nav-instruction-street">{currentBanner.secondary}</span>
            }
        </div>
        <span className="nav-instruction-distance">
            {currentBanner.distance < 1000
                ? `${currentBanner.distance}m`
                : `${(currentBanner.distance / 1000).toFixed(1)}km`}
        </span>
    </div>
)}
```

```js
function maneuverIcon(type, modifier) {
    if (type === 'arrive') return '🅿'
    if (type === 'depart') return '↑'
    if (type === 'roundabout' || type === 'exit roundabout') return '↻'
    if (modifier === 'right') return '↱'
    if (modifier === 'left') return '↰'
    if (modifier === 'slight right') return '↗'
    if (modifier === 'slight left') return '↖'
    if (modifier === 'uturn') return '↩'
    return '↑'
}
```

---

### Stile banner in App.css

```css
.nav-instruction-banner {
    position: absolute;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    background: var(--bg-main);
    border: 1.5px solid var(--border-light);
    border-radius: 1rem;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    min-width: 280px;
    max-width: 420px;
}
.nav-instruction-icon { font-size: 1.5rem; flex-shrink: 0; }
.nav-instruction-text { display: flex; flex-direction: column; flex: 1; }
.nav-instruction-main { font-weight: 600; font-size: 0.95rem; color: var(--text-primary); }
.nav-instruction-street { font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.1rem; }
.nav-instruction-distance { font-weight: 700; font-size: 0.9rem; color: var(--primary-blue); flex-shrink: 0; }
```

Aggiungi `position: relative` a `.map-main` in App.css.

---

### Perché useRef e non useState per steps e indici

`watchPosition` crea il suo callback **una volta sola**. Quel callback è una closure:
ricorda i valori al momento della sua creazione, non quelli aggiornati in seguito.

Se metti gli step in `useState`, il callback vedrà sempre l'array vuoto iniziale.
Con `useRef` invece il callback legge `stepsRef.current` che è sempre aggiornato,
perché il ref è un oggetto condiviso per riferimento, non copiato nella closure.

**Regola:** tutto ciò che viene scritto fuori dal callback ma letto dentro → `useRef`.
Tutto ciò che serve alla UI per renderizzare → `useState`.

---

## Altre cose da aggiungere, migliorare o considerare

### 1. Profilo `driving-traffic` al posto di `driving`

```js
`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/...`
```

Con `driving-traffic` il percorso tiene conto del traffico in tempo reale e le stime
di arrivo sono accurate. Richiede lo stesso token, non costa di più.

---

### 2. ETA (orario di arrivo stimato)

La risposta include `routes[0].duration` in secondi. Puoi mostrare l'orario di arrivo:

```js
const arrivalTime = new Date(Date.now() + duration * 1000)
const label = arrivalTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
// es. "Arrivo previsto: 14:32"
```

Da mostrare nel pannello laterale o in fondo alla pagina Navigator.

---

### 3. Notifiche ZTL con ToastContext

La risposta include un campo `notifications` con avvertimenti sul percorso:
- `type: "violation"` → zona a traffico limitato, area riservata
- `type: "alert"` → frontiera, strada a pedaggio

Hai già `ToastContext.jsx` nel progetto. Quando carichi il percorso puoi ciclare su
`routes[0].legs[0].notifications` e mostrare un toast per ogni avvertimento rilevante.
Brescia ha zone ZTL nel centro storico — questo sarebbe molto utile.

---

### 4. Rerouting automatico (off-route detection)

Se l'utente si allontana troppo dal percorso, ricalcola automaticamente.
Nel callback `watchPosition`, dopo aver aggiornato la posizione:

```js
// distanza dal percorso (linea più vicina nella geometria)
// se > 50 metri → ricalcola
```

Per calcolare la distanza tra un punto e una LineString GeoJSON esistono librerie
come `@turf/nearest-point-on-line` (Turf.js). Oppure puoi usare una soglia semplice:
se la distanza alla svolta corrente aumenta invece di diminuire per N aggiornamenti
consecutivi → ricalcola.

---

### 5. Pulsante muto voce

Un secondo pulsante accanto a "Segui posizione" per silenziare gli annunci vocali
senza fermare la navigazione. Basta un `useState(false)` per `isMuted` e controllarlo
dentro `speakInstruction`:

```js
function speakInstruction(text) {
    if (isMuted || !window.speechSynthesis) return
    ...
}
```

Il `isMuted` deve essere anch'esso un `useRef` se viene letto dentro il callback.

---

### 6. Colore della route per traffico (annotations)

Aggiungendo `&annotations=congestion` alla URL, ogni segmento della geometria ha
un livello di traffico: `unknown`, `low`, `moderate`, `heavy`, `severe`.

Con questi dati puoi disegnare la linea in verde/giallo/rosso invece che sempre blu —
esattamente come Google Maps o Apple Maps. Richiede di spezzare la LineString in
segmenti e colorarli separatamente con più `<Layer>`.

---

### 7. Rotonde con `roundabout_exits=true`

Già incluso nei parametri consigliati. Senza questo flag, la rotonda è un solo step
generico. Con il flag ottieni due step separati:
1. Entrata rotonda: "Entra nella rotonda"
2. Uscita rotonda: "Prendi la 2a uscita" — con numero uscita esplicito

---

### Documentazione di riferimento

- Web Speech API: `developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis`
- Mapbox Directions — voice_instructions: `docs.mapbox.com/api/navigation/directions/#voice-instruction-object`
- Mapbox Directions — banner_instructions: `docs.mapbox.com/api/navigation/directions/#banner-instruction-object`
- Mapbox Directions — notifications: `docs.mapbox.com/api/navigation/directions/#route-leg-notification`
- Turf.js nearest point on line: `turfjs.org/docs/api/nearestPointOnLine`
