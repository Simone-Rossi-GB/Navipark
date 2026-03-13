# ParcheggioBrescia — Contesto per Claude Code

## Panoramica progetto
App web per la gestione e prenotazione di parcheggi a Brescia. Ha una parte **front-end** (React + Vite) e una parte **back-end** (non ancora integrata con il front, usa mock data).

Branch principale: `main`. Branch di lavoro attivo: `dev-rossi`.

## Stack tecnico — Front-end (`front-end/`)
- **React 19** + **Vite 7**
- **React Router DOM 7**
- **Mapbox GL JS 3** + **react-map-gl 7** per la mappa
- **Tailwind CSS 4** (con `@tailwindcss/vite`) — usato solo per il componente Checkbox, NON per il resto dell'app
- **react-aria-components** — installato come dipendenza del checkbox ma non più usato direttamente
- **clsx** + **tailwind-merge** — utilitiy per classnames

### CSS
Lo stile principale è in `src/App.css` e `src/index.css`. Si usano **variabili CSS custom** (es. `--primary-blue`, `--bg-sidebar`, `--text-primary`) per colori e temi. NON usare Tailwind per nuovi stili: aggiungere classi CSS in `App.css` o nel file CSS del componente.

### Tema scuro
Gestito con `data-theme="dark"` sull'elemento root. Le override dark mode sono in `index.css`.

### Componente Checkbox
`src/components/base/checkbox/checkbox.jsx` — componente custom JSX con CSS proprio (`checkbox.css`). API: `<Checkbox label="..." isSelected={bool} onChange={fn} isDisabled={bool} size="sm|md" hint="..." />`. Niente Tailwind, usa le variabili CSS del progetto.

## Struttura cartelle principali (`front-end/src/`)
```
pages/
  Home.jsx          — mappa + filtri (vista principale)
  AdminDashboard.jsx — dashboard amministratore
  Login.jsx
  Profile.jsx
  Bookings.jsx

features/
  ParkingMap.jsx    — mappa Mapbox con marker e popup
  mockData.js       — dati mock (parcheggi, prenotazioni, stats admin)

components/
  Header.jsx        — header con logo, navigazione, menu utente
  FilterPanel.jsx   — pannello filtri a sinistra (tipo, prezzo, posti, servizi)
  BookingModal.jsx  — modale prenotazione parcheggio
  base/checkbox/
    checkbox.jsx    — componente checkbox custom
    checkbox.css

services/
  api.js            — chiamate API (usa mockHandlers.js in sviluppo)
  mockHandlers.js   — intercetta le fetch e risponde con mock data

context/
  ToastContext.jsx  — context per notifiche toast

utils/
  cx.js             — utility classnames (clsx + tailwind-merge)
```

## Convenzioni commit
I messaggi di fix iniziano con `FIX:`. I messaggi informativi con `INFO:`. Commit normali con descrizione italiana concisa.

Sempre: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` in fondo al commit.

## Cosa è stato fatto (sessioni precedenti)
- Copia di tutti i file dalla cartella scaricata al progetto, con commit per ogni file
- **FIX header**: rimossa `max-width: 1920px`, usa `width: 100%` per adattarsi a monitor grandi
- **FIX map-style-selector**: aggiunto `gap: 0.75rem` e `flex-direction: column`
- **FIX 3D buildings satellite**: `{!isSatellite && <Layer {...buildingLayer} />}` in `ParkingMap.jsx`
- **FIX dark mode**: reset-button, results-badge, badge stato prenotazioni, badge tipo parcheggio, btn-edit/delete/cancel — tutti in `index.css`
- **FIX table border**: `border-bottom` spostato da `td` a `tbody tr` in `App.css` per evitare sfalsamento su schermi larghi
- **FIX click-outside menu**: `useRef` + `useEffect` + listener `mousedown` su `document` in `Header.jsx`
- **CO2 stat**: ripristinata in `mockData.js` e `AdminDashboard.jsx` con tooltip spiegativo
- **Checkbox**: sostituito componente Untitled UI (non funzionava con Tailwind tokens) con componente custom JSX in `src/components/base/checkbox/checkbox.jsx`
- **FIX sidebar**: rimosso titolo duplicato "ParcheggioBrescia" da `FilterPanel.jsx`; sidebar ora è flex column e il pannello filtri occupa tutta l'altezza con `justify-content: space-between`

## Prossimi task discussi (non ancora implementati)
- **Navigatore non turn-by-turn**: guida da posizione utente al parcheggio prenotato usando Mapbox Directions API + `watchPosition`. Stima 4–6h di lavoro Claude. Richiede token Mapbox Directions (lo stesso token già usato per la mappa). Si integra con la CO2: `km_risparmiati × 0.20 kg/km`.
- **UI mobile**: non è stato fatto nessun lavoro responsive. La mappa occupa tutto su mobile, la sidebar è nascosta. Da pianificare.

## Note importanti
- Il token Mapbox è nel `.env` (pushato per necessità, vedi commit `c12b778`)
- I dati mock sono in `src/features/mockData.js` — nessuna chiamata API reale al backend dal front-end attualmente
- `src/utils/cx.js` esiste ma non è più importato da nessun file (residuo del vecchio checkbox Untitled UI)
