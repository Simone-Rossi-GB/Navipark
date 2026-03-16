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
