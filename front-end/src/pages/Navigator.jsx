import React, {use, useState} from 'react'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from 'react-router-dom'
import NavigationMap from "@/features/NavigationMap.jsx";

export default function Navigator() {
    const { user } = useAuth()

    const mapStyle= 'streets-v12'
    const location = useLocation()
    const parking = location.state?.parking
    const [selectedParking, setSelectedParking] = useState(parking)
    const { userPosition, route, isNavigating, startNavigation, stopNavigation } = useNavigation()

    return (
        <div className="home-container">
            <aside className="sidebar">
                // creare un menù laterale con dati se necessario
            </aside>

            <main className="map-main">
                {user && <NavigationMap
                    parking={selectedParking}
                    mapStyle={mapStyle}
                />
                }
            </main>
        </div>
    )
}
