import React, {useState, useEffect} from 'react'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from 'react-router-dom'
import NavigationMap from "@/features/NavigationMap.jsx";
import {useNavigation} from "@/hooks/UseNavigation.js";

export default function Navigator() {
    const { user } = useAuth()

    const mapStyle= 'streets-v12'
    const location = useLocation()
    const parking = location.state?.parking
    const { userPosition, route, isNavigating, startNavigation, stopNavigation } = useNavigation()

    useEffect(() => {
        if (parking) {
            startNavigation(parking)
        }
        return () => stopNavigation()
    }, [parking])

    return (
        <div className="home-container">
            <aside className="sidebar">
            </aside>

            <main className="map-main">
                {!isNavigating &&
                    <div className="map-error">
                        <h3>⚠️ Nessuna destinazione selezionata</h3>
                        <p>scegliere la destinazione dal menù laterale, dalla prenotazione o dalla mappa scegliendo un parcheggio</p>
                    </div>
                }
                {user && parking && <NavigationMap
                    destination={parking}
                    userPos={userPosition}
                    route={route}
                    mapStyle={mapStyle}
                />

                }
            </main>
        </div>
    )
}
