# ParcheggioBrescia — Contesto per Claude Code

## Panoramica progetto
App web per la gestione e prenotazione di parcheggi a Brescia. Ha una parte **front-end** (React + Vite) e una parte **back-end** (non ancora integrata con il front, usa mock data).

Branch principale: `main`. Branch di lavoro attivo: `dev-rossi`.

## Come lavoriamo
- L'utente scrive il codice da solo imparando. Claude spiega, non implementa, salvo quando esplicitamente richiesto.
- Quando Claude implementa UI, poi fornisce una lista di logiche che l'utente deve collegare da solo.
- Le spiegazioni includono sempre il **perché** concettuale, non solo il cosa.
- Non usare `Co-Authored-By: Claude` nei commit.
- Convenzioni commit: `FIX:` per fix, `INFO:` per informativi, italiano conciso per il resto.

## Stack tecnico — Front-end (`front-end/`)
- **React 19** + **Vite 7**
- **React Router DOM 7**
- **Mapbox GL JS 3** + **react-map-gl 7** per la mappa
- **Tailwind CSS 4** (con `@tailwindcss/vite`) — usato solo per il componente Checkbox, NON per il resto dell'app
- **react-aria-components** — installato come dipendenza del checkbox ma non più usato direttamente
- **clsx** + **tailwind-merge** — utility per classnames

### CSS
Lo stile principale è in `src/App.css` e `src/index.css`. Si usano **variabili CSS custom** (es. `--primary-blue`, `--bg-sidebar`, `--text-primary`) per colori e temi. NON usare Tailwind per nuovi stili: aggiungere classi CSS in `App.css` o nel file CSS del componente.

### Tema scuro
Gestito con `data-theme="dark"` sull'elemento root. Le override dark mode sono in `index.css`.

### Componente Checkbox
`src/components/base/checkbox/checkbox.jsx` — componente custom JSX con CSS proprio (`checkbox.css`). API: `<Checkbox label="..." isSelected={bool} onChange={fn} isDisabled={bool} size="sm|md" hint="..." />`. Niente Tailwind, usa le variabili CSS del progetto.

## Struttura cartelle principali (`front-end/src/`)
```
pages/
  Home.jsx           — mappa + filtri (vista principale)
  Navigator.jsx      — pagina navigatore GPS (in sviluppo attivo)
  AdminDashboard.jsx — dashboard amministratore
  Login.jsx
  Profile.jsx
  Bookings.jsx

features/
  ParkingMap.jsx     — mappa Mapbox con marker e popup (home)
  NavigationMap.jsx  — mappa Mapbox dedicata al navigatore (NON riusa ParkingMap)
  mockData.js        — dati mock (parcheggi, prenotazioni, stats admin)

hooks/
  useNavigation.js   — logica GPS watchPosition + fetch Directions API

components/
  Header.jsx         — header con logo, navigazione, menu utente
  FilterPanel.jsx    — pannello filtri a sinistra (tipo, prezzo, posti, servizi)
  BookingModal.jsx   — modale prenotazione parcheggio
  base/checkbox/
    checkbox.jsx     — componente checkbox custom
    checkbox.css

services/
  api.js             — chiamate API (usa mockHandlers.js in sviluppo)
  mockHandlers.js    — intercetta le fetch e risponde con mock data

context/
  ToastContext.jsx   — context per notifiche toast

utils/
  cx.js              — utility classnames (non più usato, residuo vecchio checkbox)
```

## Note importanti
- Il token Mapbox è nel `.env` (pushato per necessità, vedi commit `c12b778`)
- I dati mock sono in `src/features/mockData.js` — nessuna chiamata API reale al backend
- `src/utils/cx.js` non è importato da nessun file — può essere ignorato
- I campi dei parcheggi nei mock usano `nome`/`indirizzo`/`posti_liberi`/`tariffa_oraria`; i dati vecchi usano `name`/`address`/`freeSpots`/`price`. In tutto il codice si usa `??` per gestire entrambi: `p.nome ?? p.name`

---

## Navigatore GPS — stato attuale e TODO

### Architettura
La navigazione è una **pagina separata** `/navigator`, protetta da `ProtectedRoute` in `App.jsx`.
Il flusso è: click "Vai qui" su popup mappa → `navigate('/navigator', { state: { parking } })` → `Navigator.jsx`.

### File coinvolti
| File | Responsabilità |
|---|---|
| `src/pages/Navigator.jsx` | Pagina: orchestrazione, sidebar ricerca, pannello bottom |
| `src/features/NavigationMap.jsx` | Mappa: disegna route, marker utente, marker destinazione, camera |
| `src/hooks/useNavigation.js` | Logica: GPS watchPosition, fetch Directions API, stato route/distanza |

### Cosa funziona già
- Route disegnata sulla mappa (linea blu) con `overview=full`
- `watchPosition` aggiorna la posizione utente in tempo reale
- Camera segue l'utente quando `isViewLocked = true`
- Bearing calcolato tra posizione precedente e attuale → mappa ruota nella direzione di marcia
- Pulsante "Segui posizione" ON/OFF con stile attivo/inattivo
- Marker utente con nome, marker destinazione con popup info
- Sidebar con ricerca parcheggi per nome/indirizzo (filtro derivato, non useEffect)
- Lista parcheggi filtrati con pulsante "Vai qui" per ciascuno
- Pannello bottom con distanza rimasta e pulsanti stop/muto (UI pronta, logica da collegare)
- `stopNavigation()` chiamato in cleanup del useEffect → no memory leak watchPosition

### TODO logici da implementare (UI già presente)
1. **Avviare navigazione dalla sidebar**: nel `onClick` "Vai qui" chiamare `stopNavigation()` poi `startNavigation(p)`, aggiornare `activeDestination`
2. **Unificare destinazione attiva**: `NavigationMap` riceve ancora `parking` da `location.state` — deve usare `activeDestination` che può essere aggiornato anche dalla sidebar
3. **ETA arrivo**: aggiungere `duration` al return di `useNavigation` (da `routes[0].duration` in secondi) → `new Date(Date.now() + duration * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })`
4. **Collegare `isMuted`**: passarlo a `useNavigation` o controllarlo in `speakInstruction` prima di parlare
5. **Stop button redirect**: dopo `stopNavigation()` aggiungere `navigate(-1)` o `navigate('/')`
6. **Mostrare destinazione attiva in cima alla sidebar** se navigazione in corso

### TODO futuri (non ancora iniziati)
- **Guida vocale e banner**: aggiungere `voice_instructions=true&banner_instructions=true&roundabout_exits=true` all'URL, gestire `voiceInstructions[].distanceAlongGeometry` per il timing vocale, `bannerInstructions` per il banner sopra la mappa — vedi `guida_navigatore.md` per dettagli completi
- **`driving-traffic`** al posto di `driving` per traffico reale
- **Notifiche ZTL** con `ToastContext` leggendo `routes[0].legs[0].notifications`
- **Rerouting automatico** se utente esce dal percorso
- **Colore route per traffico** con `annotations=congestion`

### Concetti React importanti appresi durante lo sviluppo
- `useRef` vs `useState` nei callback asincroni: `watchPosition` è una closure — legge i valori al momento della sua creazione. Tutto ciò che viene scritto fuori ma letto dentro → `useRef`. Tutto ciò che serve alla UI → `useState`.
- `useState(valore)` usa il valore iniziale **solo al primo montaggio** — non aggiornarlo avvolgendo una prop in `useState` senza usare mai il setter.
- `useEffect` è per side effects (fetch, timer, listener), non per trasformare dati in memoria. Il filtro `parkings.filter(...)` va calcolato direttamente nel render, non in un `useEffect`.
- Cleanup dei `useEffect`: ritornare una funzione dal `useEffect` la esegue quando il componente si smonta. Usato per `stopNavigation()` → evita `watchPosition` leaked.
- Props reattive: quando lo stato del genitore cambia, il figlio riceve automaticamente la prop aggiornata senza dover "richiedere" nulla.

---

## Cosa è stato fatto nelle sessioni precedenti

### Fix vari
- **FIX header**: rimossa `max-width: 1920px`, usa `width: 100%`
- **FIX map-style-selector**: aggiunto `gap: 0.75rem` e `flex-direction: column`
- **FIX 3D buildings satellite**: `{!isSatellite && <Layer {...buildingLayer} />}` in `ParkingMap.jsx`
- **FIX dark mode**: reset-button, results-badge, badge stato prenotazioni, badge tipo parcheggio, btn-edit/delete/cancel — tutti in `index.css`
- **FIX table border**: `border-bottom` spostato da `td` a `tbody tr` in `App.css`
- **FIX click-outside menu**: `useRef` + `useEffect` + listener `mousedown` su `document` in `Header.jsx`
- **CO2 stat**: ripristinata in `mockData.js` e `AdminDashboard.jsx` con tooltip
- **Checkbox**: sostituito componente Untitled UI con componente custom in `src/components/base/checkbox/`
- **FIX sidebar**: rimosso titolo duplicato da `FilterPanel.jsx`
- **ParkingMap**: aggiunto pulsante "Vai qui" (visibile solo se autenticati) nel popup, naviga a `/navigator` con `state: { parking: selectedParking }`

### Guide create
Nella cartella `front-end/` ci sono due guide markdown scritte da Claude:
- `guida_aggiunta_funzionalita.md` — metodo generale per affrontare qualsiasi nuova feature
- `guida_navigatore.md` — guida completa al navigatore: architettura, hook, Directions API, voce, banner, step, raccomandazioni future

---

## Fix tester — stato aggiornato

### Già risolti in questa sessione
- **FIX popup chiusura**: `closeOnClick={false}` → `closeOnClick={true}` in `ParkingMap.jsx`
- **FIX CO2 dark mode**: aggiunto override in `index.css` per `.stat-card.green .stat-value` e `.stat-label` → colore `#6ee7b7` in dark mode

### Da fare nella prossima sessione
Leggere i file prima di modificare:

**3. Modal modifica/annulla prenotazione — risoluzione** (`App.css`)
Il problema è probabilmente che `.modal-content` ha `max-width: 500px` fisso e l'admin dashboard ha form più larghi. Controllare i modal di modifica prenotazione in `AdminDashboard.jsx` e aggiungere una variante `.modal-content.large` con `max-width: 700px` o usare la classe `.modal-content.small` già esistente (400px) per il modal di annulla. Verificare se manca `overflow-x: hidden` su piccoli schermi.

**4. Barra ricerca parcheggi per nome/via** (`FilterPanel.jsx` + `Home.jsx`)
- In `Home.jsx`: aggiungere `useState('')` per `searchQuery`, passarlo a `FilterPanel` e usarlo nel filtro dei parcheggi con `.filter(p => p.nome?.toLowerCase().includes(q) || p.indirizzo?.toLowerCase().includes(q))`
- In `FilterPanel.jsx`: aggiungere un `<input>` in cima al pannello, prima dei filtri tipo. Classe `search-input` già esiste in App.css.
- La prop da passare: `searchQuery` e `onSearchChange` (o direttamente `setSearchQuery`)

**5. Tema scuro auto-switch mappa** (`Home.jsx`)
- `darkMode` vive in `Header.jsx` come stato locale, non è accessibile da `Home.jsx`
- Soluzione: in `Home.jsx` aggiungere un `MutationObserver` su `document.documentElement` che osserva l'attributo `data-theme`:
```js
useEffect(() => {
    const observer = new MutationObserver(() => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
        setMapStyle(prev => {
            if (isDark && !prev.startsWith('dark')) return 'dark-v11'
            if (!isDark && prev === 'dark-v11') return 'streets-v12'
            return prev
        })
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
}, [])
```
- Inizializzare anche `mapStyle` da localStorage: `useState(() => localStorage.getItem('theme') === 'dark' ? 'dark-v11' : 'streets-v12')`

**6. Modifica posizione parcheggio — Geocoding API** (`AdminDashboard.jsx`)
- Sostituire i due campi lat/lng con un campo testo indirizzo
- URL Geocoding: `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=it&proximity=10.2205,45.5397&access_token=${TOKEN}`
- La risposta ha `features[0].center` → `[lng, lat]`
- Approccio: input testo + pulsante "Cerca" → fetch → popola `parkingForm.lat` e `parkingForm.lng` automaticamente (campi nascosti o in sola lettura per conferma)
- Token: `import.meta.env.VITE_MAPBOX_TOKEN`

## Prossimi task dopo il navigatore
- **UI mobile/responsive**: nessun lavoro responsive fatto. Approccio scelto: Flexbox wrapping + CSS Grid auto-fill come strumenti principali, media query solo per i layout globali di pagina dove strettamente necessario. Da fare per ogni pagina: Home, Navigator, AdminDashboard, Profile, Bookings.

---

## Piano futuro — Capacitor (app store iOS/Android)

Quando il progetto web è completo, si può pubblicare su App Store e Google Play usando **Capacitor** senza riscrivere nulla.

### Come funziona
Capacitor avvolge la build `dist/` di Vite in una WebView nativa. Il codice React rimane uno solo — modifiche a `src/` si propagano automaticamente a web, iOS e Android.

### Struttura cartelle aggiunta da Capacitor
```
front-end/
  ios/                   ← progetto Xcode (aggiunto da Capacitor)
  android/               ← progetto Android Studio (aggiunto da Capacitor)
  capacitor.config.ts    ← config Capacitor
```

### Flusso di lavoro
1. `npm run build` → Vite compila `src/` in `dist/`
2. `npx cap sync` → Capacitor copia `dist/` in `ios/` e `android/`
3. Xcode → compila → App Store
4. Android Studio → compila → Google Play

### Due sole modifiche necessarie a `useNavigation.js`
Le API web native non funzionano dentro WKWebView (iOS). Entrambe si risolvono con un `if (Capacitor.isNativePlatform())` nello stesso file:

| API web attuale | Problema su iOS | Plugin Capacitor |
|---|---|---|
| `navigator.geolocation.watchPosition` | Bloccato da iOS su `capacitor://localhost` | `@capacitor/geolocation` (stessa firma) |
| `window.speechSynthesis` | Bug WKWebView su iOS | `@capacitor-community/text-to-speech` |

```js
import { Capacitor } from '@capacitor/core'

if (Capacitor.isNativePlatform()) {
  // usa plugin Capacitor
} else {
  // comportamento web attuale invariato
}
```

### Sequenza consigliata
1. Finire navigatore + responsive web
2. Aggiungere `manifest.json` (PWA gratuita — installabile da browser, specie Android)
3. Integrare Capacitor quando si vuole pubblicare sugli store

### Perché non Expo
Expo è React Native: `react-map-gl` e Mapbox GL JS non esistono in React Native, andrebbero riscritti con `@rnmapbox/maps`. Scartato.
