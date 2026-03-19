import React, {useState, useEffect} from 'react'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from 'react-router-dom'
import { Menu, X, Navigation, MapPin, Volume2, VolumeX, Square, Search } from 'lucide-react'
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
    const [sidebarOpen, setSidebarOpen] = useState(false)
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

    const selectDestination = (p) => {
        setDestination(p)
        setSidebarOpen(false)
    }

    const distanceLabel = distance != null
        ? distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`
        : '—'

    return (
        <div className="home-container">
            <aside className={`sidebar${sidebarOpen ? '' : ' sidebar-hidden'}`}>
                <div className="nav-sidebar-section">
                    <p className="filter-section-title">Cerca destinazione</p>
                    <div className="nav-search-wrapper">
                        <Search size={16} className="nav-search-icon" />
                        <input
                            type="text"
                            placeholder="Nome o indirizzo parcheggio..."
                            value={searchParking}
                            onChange={e => setSearchParking(e.target.value)}
                            className="search-input nav-search-input"
                        />
                    </div>
                </div>

                <div className="nav-parking-list">
                    {filteredParkings.length === 0 && (
                        <p className="nav-parking-empty">Nessun parcheggio trovato</p>
                    )}
                    {filteredParkings.map(p => (
                        <div
                            key={p.id}
                            className={`nav-parking-item ${destination?.id === p.id ? 'active' : ''}`}
                            onClick={() => selectDestination(p)}
                        >
                            <MapPin size={14} className="nav-parking-pin" />
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
                                        selectDestination(p)
                                    }}
                                >
                                    <Navigation size={12} />
                                    Vai
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {sidebarOpen && (
                <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
            )}

            <main className="map-main">
                <button
                    className="nav-sidebar-toggle"
                    onClick={() => setSidebarOpen(prev => !prev)}
                >
                    {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
                    {sidebarOpen ? 'Chiudi' : 'Cerca'}
                </button>
                {!isNavigating &&
                    <div className="map-error">
                        <Navigation size={28} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                        <h3>Nessuna destinazione</h3>
                        <p>Cerca un parcheggio nel pannello laterale</p>
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
                        <div className="nav-bottom-stats">
                            <div className="nav-bottom-stat">
                                <span className="nav-bottom-label">Distanza</span>
                                <span className="nav-bottom-value">{distanceLabel}</span>
                            </div>
                            <div className="nav-bottom-divider" />
                            <div className="nav-bottom-stat">
                                <span className="nav-bottom-label">Arrivo</span>
                                <span className="nav-bottom-value">{ETA}</span>
                            </div>
                        </div>
                        <div className="nav-bottom-actions">
                            <button
                                className={`nav-icon-button ${isMuted ? '' : 'active'}`}
                                onClick={() => setIsMuted(prev => !prev)}
                                title={isMuted ? 'Attiva voce' : 'Silenzia voce'}
                            >
                                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                            <button
                                className="nav-icon-button nav-stop-button"
                                onClick={() => stopNavigation()}
                                title="Ferma navigazione"
                            >
                                <Square size={16} />
                                Stop
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
