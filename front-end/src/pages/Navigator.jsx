import React, {useState, useEffect} from 'react'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from 'react-router-dom'
import NavigationMap from "@/features/NavigationMap.jsx";
import {useNavigation} from "@/hooks/UseNavigation.js";
import * as api from "@/services/api.js";

export default function Navigator() {
    const { user } = useAuth()

    const mapStyle= 'streets-v12'
    const location = useLocation()
    const [parkings, setParkings] = useState([])
    const [searchParking, setSearchParking] = useState('')
    const [destination, setDestination] = useState(location.state?.parking ?? null)
    const [isMuted, setIsMuted] = useState(false)
    const filteredParkings = parkings.filter(p => {
        const query = searchParking.toLowerCase()
        return (
            p.nome?.toLowerCase().includes(query) || p.indirizzo.toLowerCase().includes(query)
        )
    })
    const { userPosition, route, distance, ETA, isNavigating, startNavigation, stopNavigation } = useNavigation()

    useEffect(() => {
        if (destination) {
            startNavigation(destination)
        }
        return () => stopNavigation()
    }, [destination])

    useEffect(() => {
        api.getParcheggi().then(res => {
            if (res.success) setParkings(res.data)
        })
    }, [])



    return (
        <div className="home-container">
            <aside className="sidebar">
                <div className="nav-sidebar-section">
                    <p className="filter-section-title">Cerca destinazione</p>
                    <input
                        type="text"
                        placeholder="Nome o indirizzo parcheggio..."
                        value={searchParking}
                        onChange={e => setSearchParking(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="nav-parking-list">
                    {filteredParkings.length === 0 && (
                        <p className="nav-parking-empty">Nessun parcheggio trovato</p>
                    )}
                    {filteredParkings.map(p => (
                        <div
                            key={p.id}
                            className={`nav-parking-item ${destination?.id === p.id ? 'active' : ''}`}
                            onClick={() => setDestination(p)}
                        >
                            <div className="nav-parking-item-info">
                                <span className="nav-parking-item-name">{p.nome ?? p.name}</span>
                                <span className="nav-parking-item-address">{p.indirizzo ?? p.address}</span>
                            </div>
                            <div className="nav-parking-item-meta">
                                <span className={`nav-parking-item-spots ${(p.posti_liberi ?? p.freeSpots) < 10 ? 'text-red' : 'text-green'}`}>
                                    {p.posti_liberi ?? p.freeSpots} posti
                                </span>
                                <button
                                    className="popup-button nav-parking-vai"
                                    onClick={e => {
                                        e.stopPropagation()
                                        setDestination(p)
                                    }}
                                >
                                    Vai qui
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            <main className="map-main">
                {!isNavigating &&
                    <div className="map-error">
                        <h3>⚠️ Nessuna destinazione selezionata</h3>
                        <p>Cerca un parcheggio nel pannello laterale o sceglilo dalla mappa</p>
                    </div>
                }
                {user && destination && <NavigationMap
                    destination={destination}
                    userPos={userPosition}
                    route={route}
                    mapStyle={mapStyle}
                />}

                {isNavigating && (
                    <div className="nav-bottom-panel">
                        <div className="nav-bottom-stat">
                            <span className="nav-bottom-label">Distanza</span>
                            <span className="nav-bottom-value">
                                {distance != null
                                    ? distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`
                                    : '—'}
                            </span>
                        </div>
                        <div className="nav-bottom-stat">
                            <span className="nav-bottom-label">Arrivo</span>
                            <span className="nav-bottom-value">
                                {ETA}
                            </span>
                        </div>
                        <button
                            className={`nav-icon-button ${isMuted ? '' : 'active'}`}
                            onClick={() => setIsMuted(prev => !prev)}
                            title={isMuted ? 'Attiva voce' : 'Silenzia voce'}
                        >
                            {isMuted ? '🔇' : '🔊'}
                        </button>
                        <button
                            className="nav-icon-button nav-stop-button"
                            onClick={() => {
                                stopNavigation()
                                // TODO: navigare alla home o pagina precedente
                            }}
                            title="Ferma navigazione"
                        >
                            ■ Stop
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}
