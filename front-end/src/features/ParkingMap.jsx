import React, { useState } from 'react'
import Map, { Marker, Popup, Layer } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import {useAuth} from "@/hooks/useAuth.js";
import {useNavigate} from "react-router-dom";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// Layer per edifici 3D
const buildingLayer = {
  id: '3d-buildings',
  source: 'composite',
  'source-layer': 'building',
  filter: ['==', 'extrude', 'true'],
  type: 'fill-extrusion',
  minzoom: 14,
  paint: {
    'fill-extrusion-color': '#ddd',
    'fill-extrusion-height': [
      'interpolate',
      ['linear'],
      ['zoom'],
      15,
      0,
      15.05,
      ['get', 'height']
    ],
    'fill-extrusion-base': [
      'interpolate',
      ['linear'],
      ['zoom'],
      15,
      0,
      15.05,
      ['get', 'min_height']
    ],
    'fill-extrusion-opacity': 0.6
  }
}

export default function ParkingMap({ parkings, onParkingClick, mapStyle = 'streets-v12' }) {
  const isSatellite = mapStyle.startsWith('satellite')
  const [selectedParking, setSelectedParking] = useState(null)
  const [mapError, setMapError] = useState(null)
  const [viewState, setViewState] = useState({
    longitude: 10.2205,
    latitude: 45.5397,
    zoom: 15.5,
    pitch: 45,
    bearing: 0
  });
  const { user } = useAuth();
  const navigate = useNavigate()

  const handleMarkerClick = (parking) => {
    setSelectedParking(parking)
  }

  const handleMapError = (error) => {
    console.error('Mapbox error:', error)
    setMapError(error.error?.message || 'Errore nel caricamento della mappa')
  }

  if (mapError) {
    return (
      <div className="map-error">
        <h3>⚠️ Errore Mappa</h3>
        <p>{mapError}</p>
        <p style={{ fontSize: '0.875rem', marginTop: '1rem' }}>
          Verifica che il token Mapbox sia corretto in <code>.env</code>
          <br />
          Deve iniziare con <code>pk.</code> (public token), non <code>sk.</code> (secret token)
        </p>
      </div>
    )
  }

  return (
    <div className="parking-map-container" style={{ height: '100%', width: '100%' }}>
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onError={handleMapError}
        style={{ width: '100%', height: '100%' }}
        mapStyle={`mapbox://styles/mapbox/${mapStyle}`}
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {/* Layer 3D Buildings (disabilitato in modalità satellite) */}
        {!isSatellite && <Layer {...buildingLayer} />}

        {/* Marker parcheggi con prezzi */}
        {parkings && parkings.map((parking) => (
          <Marker
            key={parking.id}
            longitude={parking.lng}
            latitude={parking.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              handleMarkerClick(parking)
            }}
          >
            <div className="marker-container">
              <div className="price-tag">
                €{parking.tariffa_oraria ?? parking.price}/h
              </div>
              <div className="marker-dot"></div>
            </div>
          </Marker>
        ))}

        {/* Popup con preview parcheggio */}
        {selectedParking && (
          <Popup
            longitude={selectedParking.lng}
            latitude={selectedParking.lat}
            anchor="bottom"
            onClose={() => setSelectedParking(null)}
            closeButton={true}
            closeOnClick={true}
            offset={25}
          >
            <div className="parking-popup">
              <img
                src={selectedParking.image}
                alt={selectedParking.nome ?? selectedParking.name}
                className="popup-image"
              />
              <h3 className="popup-title">{selectedParking.nome ?? selectedParking.name}</h3>
              <p className="popup-price">€{(selectedParking.tariffa_oraria ?? selectedParking.price)}/ora</p>
              <p className="popup-spots">
                <span className={(selectedParking.posti_liberi ?? selectedParking.freeSpots) < 10 ? 'text-red' : 'text-green'}>
                  {selectedParking.posti_liberi ?? selectedParking.freeSpots}
                </span>
                /{selectedParking.capacita_totale ?? selectedParking.totalSpots} posti liberi
              </p>
              <p className="popup-address">{selectedParking.indirizzo ?? selectedParking.address}</p>
              <button
                className="popup-button"
                onClick={() => onParkingClick && onParkingClick(selectedParking)}
              >
                Prenota ora
              </button>
                { user &&
                    <button onClick={() => navigate('/navigator', {state: { parking: selectedParking } })} className="popup-button">Vai qui</button>
                }
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
