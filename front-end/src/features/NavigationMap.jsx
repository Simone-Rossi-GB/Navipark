import React, {useEffect, useState} from 'react'
import Map, { Marker, Popup, Layer, Source} from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import {useAuth} from "@/hooks/useAuth.js";

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

function handleMarkerClick(parking, setShowParking) {
    setShowParking(prev => !prev) // prev è il valore attuale di show parking.
    // quindi dico che il valore nuovo attuale deve essere il contrario del valore attuale
}

export default function NavigationMap({ destination, userPos, route, mapStyle = 'streets-v12' }) {
    const { user } = useAuth()
    const [isViewLocked, setIsViewLocked] = useState(true)
    const selectedParking = destination
    const [showParking, setShowParking] = useState(false)
    const [mapError, setMapError] = useState(null)
    const [viewState, setViewState] = useState({
        longitude: destination.lng,
        latitude: destination.lat,
        zoom: 15.5,
        pitch: 45,
        bearing: 0
    })

    useEffect(() => {
        if(userPos && !isViewLocked) {
            setViewState(prev => ({ ...prev, longitude: userPos.lng, latitude: userPos.lat }))
        }
    }, [userPos]);

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
                <Layer {...buildingLayer} />

                {userPos && user &&
                    <Marker
                        key="user-position"
                        longitude={userPos.lng}
                        latitude={userPos.lat}
                        anchor="bottom"
                    >
                        <div className="marker-container">
                            <div className="user-dot"></div>
                            <div className="user-tag">
                                {user.name}
                            </div>
                        </div>
                    </Marker>
                }

                {/* Marker parcheggi con prezzi */}
                {selectedParking &&
                    <Marker
                    key={destination.id}
                    longitude={destination.lng}
                    latitude={destination.lat}
                    anchor="bottom"
                    onClick={(e) => {
                        e.originalEvent.stopPropagation()
                        handleMarkerClick(destination, setShowParking)
                    }}
                    >

                    <div className="marker-container">
                        <div className="marker-dot"></div>
                    </div>

                    </Marker>
                }

                {/* Popup con preview parcheggio */}
                {showParking && (
                    <Popup
                        longitude={selectedParking.lng}
                        latitude={selectedParking.lat}
                        anchor="bottom"
                        onClose={() => setShowParking(false)}
                        closeButton={true}
                        closeOnClick={false}
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
                        </div>
                    </Popup>
                )}
            </Map>
        </div>
    )
}
