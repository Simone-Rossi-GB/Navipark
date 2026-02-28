import React from 'react'
import Map, { Marker } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Usa la variabile d'ambiente per il token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const parkings = [
  { id: 1, name: 'Parcheggio Centro', lat: 45.5397, lng: 10.2205 },
  { id: 2, name: 'Parcheggio Stazione', lat: 45.5342, lng: 10.2136 },
  { id: 3, name: 'Parcheggio Ospedale', lat: 45.5412, lng: 10.2241 },
]

export default function ParkingMap() {
  if (!MAPBOX_TOKEN) {
    return (
      <div style={{ color: 'red', padding: 16 }}>
        Errore: Mapbox token non trovato. Imposta VITE_MAPBOX_TOKEN nel file .env.
      </div>
    );
  }

  return (
    <div className="my-6" style={{ height: 400 }}>
      <Map
        initialViewState={{ longitude: 10.2205, latitude: 45.5397, zoom: 13 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {parkings.map((p) => (
          <Marker key={p.id} longitude={p.lng} latitude={p.lat} anchor="bottom">
            <div style={{ color: 'green', fontWeight: 'bold', background: 'white', borderRadius: 4, padding: '2px 6px', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
              {p.name}
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  )
}
