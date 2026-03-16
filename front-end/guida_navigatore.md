# Guida al navigatore non turn-by-turn

Implementazione della guida da posizione utente al parcheggio prenotato usando Mapbox Directions API + `watchPosition`.

---

## API da usare

**Mapbox Directions API** — REST, già hai il token:
```
GET https://api.mapbox.com/directions/v5/mapbox/driving/{lng_start},{lat_start};{lng_end},{lat_end}
    ?geometries=geojson
    &access_token=TOKEN
```
Risponde con un GeoJSON `LineString` che è esattamente il percorso su strada.

**Browser Geolocation API** — nativa, zero librerie:
```js
const watchId = navigator.geolocation.watchPosition(
  (position) => { /* position.coords.latitude, .longitude */ },
  (error) => { /* gestisci errori */ },
  { enableHighAccuracy: true }
)
// Per smettere: navigator.geolocation.clearWatch(watchId)
```

---

## File da creare / modificare

```
src/hooks/useNavigation.js     ← NUOVO: logica watchPosition + fetch Directions
src/features/ParkingMap.jsx    ← MODIFICA: aggiungi Source + Layer per il percorso
src/pages/Bookings.jsx         ← MODIFICA: bottone "Naviga" che attiva/disattiva
```

---

## Struttura del hook `useNavigation.js`

```js
// Responsabilità: gestisce tutto lo stato della navigazione
export function useNavigation() {
  const [userPosition, setUserPosition] = useState(null)
  const [route, setRoute] = useState(null)      // GeoJSON LineString
  const [isNavigating, setIsNavigating] = useState(false)
  const watchIdRef = useRef(null)

  const startNavigation = (destination) => { /* avvia watchPosition + fetch */ }
  const stopNavigation = () => { /* clearWatch + reset stato */ }

  return { userPosition, route, isNavigating, startNavigation, stopNavigation }
}
```

---

## Come disegnare il percorso in `ParkingMap.jsx`

react-map-gl espone `<Source>` e `<Layer>` — sono i mattoni per aggiungere dati alla mappa:

```jsx
{route && (
  <Source id="route" type="geojson" data={route}>
    <Layer id="route-line" type="line" paint={{ 'line-color': '#3b82f6', 'line-width': 4 }} />
  </Source>
)}
```

---

## Flusso dei dati

```
[watchPosition] → aggiorna userPosition
userPosition + destination → [fetch Directions API] → GeoJSON LineString
GeoJSON → [Source + Layer su mappa] → percorso disegnato
```

---

## Integrazione CO2

Il calcolo CO2 usa la distanza del percorso (disponibile nella risposta dell'API Directions):

```js
const distanceKm = response.routes[0].distance / 1000  // risposta in metri
const co2Risparmiati = distanceKm * 0.20  // kg CO2 per km
```

---

## Costruzione step by step (consigliato)

1. Fai funzionare `watchPosition` → logga le coordinate in console
2. Fai la chiamata all'API Directions con coordinate fisse → logga il GeoJSON
3. Disegna il GeoJSON sulla mappa (linea statica)
4. Collega la posizione reale al posto di quelle fisse
5. Aggiungi il calcolo CO2

---

## Documentazione di riferimento

- Mapbox Directions API: `docs.mapbox.com/api/navigation/directions/`
- react-map-gl Source e Layer: `visgl.github.io/react-map-gl/docs/api-reference/source`
- Esempi Mapbox "add a line": `docs.mapbox.com/mapbox-gl-js/example/`
- MDN Geolocation API: `developer.mozilla.org/en-US/docs/Web/API/Geolocation_API`
