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
    const [selectedParking, setSelectedParking] = useState(parking)
    const { userPosition, route, isNavigating, startNavigation, stopNavigation } = useNavigation()

    useEffect(() => {
        if (selectedParking) {
            startNavigation(selectedParking)
        }
    }, [selectedParking])

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
                {user && selectedParking && <NavigationMap
                    destination={selectedParking}
                    userPos={userPosition}
                    route={route}
                    mapStyle={mapStyle}
                />

                }
            </main>
        </div>
    )
}
