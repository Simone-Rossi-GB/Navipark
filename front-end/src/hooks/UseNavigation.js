import {useState, useRef} from 'react'

export function useNavigation() {
    const [userPosition, setUserPosition] = useState(null)
    const [route, setRoute] = useState(null)
    const [distance, setDistance] = useState(null)
    const [duration, setDuration] = useState(null)
    const [ETA, setETA] = useState("-")
    const [isNavigating, setIsNavigating] = useState(false)
    const watchIDref = useRef(null) // id ref all'istanza di geolocalizzazione dell'utente via browser

    const startNavigation = async (destination) => {
        setIsNavigating(true)

        watchIDref.current = navigator.geolocation.watchPosition(
            async (pos) => {
                const current = { lat: pos.coords.latitude, lng: pos.coords.longitude}
                setUserPosition(current)

                console.log('posizione utente: ', current)

                const newRoute = await fetchRoute(current, destination)
                if (newRoute) {
                    setRoute(newRoute.geometry)
                    setDistance(newRoute.distance / 1000) // km
                    setDuration(newRoute.duration)
                    setETA(new Date(Date.now() + duration * 1000).toLocaleTimeString(
                        'it-IT',
                        {
                            hour: '2-digit',
                            minute: '2-digit'
                        }))
                    console.log("duration newRoute: ", newRoute.duration)
                    console.log("duration: ", duration)
                    console.log("ETA date: ", new Date(Date.now() + duration * 1000).toLocaleTimeString(
                        'it-IT',
                        {
                            hour: '2-digit',
                            minute: '2-digit'
                        }))
                    console.log("ETA: ", ETA)
                }
            },
            (err) => console.error('Errore del GPS dio smutandato: ', err),
            {enableHighAccuracy: true}
        )
    }

    const stopNavigation = () => {
        if (watchIDref.current != null) {
            navigator.geolocation.clearWatch(watchIDref.current)
        }
        setIsNavigating(false)
        setRoute(null)
        setUserPosition(null)
        setDistance(null)
        setDuration(null)
        setETA("-")
    }

    return { userPosition, route, distance, ETA, isNavigating, startNavigation, stopNavigation}
}

async function fetchRoute(from, to) {
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full&access_token=${token}`
    const res = await fetch(url)
    const data = await res.json()
    console.log(data.routes?.[0] ?? "data routes non visibile")
    return data.routes?.[0] ?? null // il formato dovrebbe essere
    // { geometry: GeoJSON, distance: metri, duration: secondi }
}
