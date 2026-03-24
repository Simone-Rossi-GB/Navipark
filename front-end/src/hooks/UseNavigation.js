import {useState, useRef} from 'react'

function speakInstruction(text, muted = false) {
    if (muted) return
    console.log("funzione speak chiamata:", text)
    if (!window.speechSynthesis) return

    window.speechSynthesis.cancel()

    // Chrome bug: dopo cancel() speechSynthesis può restare sospeso.
    // resume() lo risveglia; setTimeout dà il tempo a cancel() di completarsi.
    if (window.speechSynthesis.paused) window.speechSynthesis.resume()

    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'it-IT'
        utterance.rate = 1.0
        window.speechSynthesis.speak(utterance)
    }, 100)
}

export function useNavigation() {
    const [userPosition, setUserPosition] = useState(null)
    const [route, setRoute] = useState(null)
    const [distance, setDistance] = useState(null)
    const [ETA, setETA] = useState("-")
    const [isNavigating, setIsNavigating] = useState(false)
    const watchIDref = useRef(null) // id ref all'istanza di geolocalizzazione dell'utente via browser
    const lastSpokenDistance = useRef(1000) // soglia iniziale: parla quando mancano 1000m
    const isMutedRef = useRef(false) // ref per isMuted: letta dentro watchPosition senza stale closure


    const startNavigation = async (destination) => {
        setIsNavigating(true)
        speakInstruction("navigazione attivata. Percorso verso " + (destination.nome ?? destination.name ?? ''), isMutedRef.current)

        watchIDref.current = navigator.geolocation.watchPosition(
            async (pos) => {
                const current = { lat: pos.coords.latitude, lng: pos.coords.longitude}
                setUserPosition(current)

                console.log('posizione utente: ', current)

                const newRoute = await fetchRoute(current, destination)
                if (newRoute) {
                    setRoute(newRoute.geometry)
                    setDistance(newRoute.distance / 1000) // km
                    setETA(new Date(Date.now() + newRoute.duration * 1000).toLocaleTimeString(
                        'it-IT',
                        {
                            hour: '2-digit',
                            minute: '2-digit'
                        }))
                    console.log("newRoute: ", newRoute)
                    console.log("ETA date: ", new Date(Date.now() + newRoute.duration * 1000).toLocaleTimeString(
                        'it-IT',
                        {
                            hour: '2-digit',
                            minute: '2-digit'
                        }))
                }

                // Logica voce: parla quando la distanza rimasta scende sotto la soglia corrente
                if (newRoute && newRoute.distance <= lastSpokenDistance.current && lastSpokenDistance.current > 0) {
                    const announcement = newRoute.legs[0]?.steps[0]?.voiceInstructions?.[0]?.announcement
                    if (announcement) speakInstruction(announcement, isMutedRef.current)

                    // avanza alla soglia successiva
                    if (lastSpokenDistance.current >= 1000)     lastSpokenDistance.current = 300
                    else if (lastSpokenDistance.current >= 300)  lastSpokenDistance.current = 150
                    else if (lastSpokenDistance.current >= 150)  lastSpokenDistance.current = 50
                    else                                          lastSpokenDistance.current = 0
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
        setETA("-")
        lastSpokenDistance.current = 1000 // reset soglia per la prossima navigazione
    }

    const setMuted = (val) => { isMutedRef.current = val }

    return { userPosition, route, distance, ETA, isNavigating, startNavigation, stopNavigation, setMuted }
}

async function fetchRoute(from, to) {
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    const url = "https://api.mapbox.com/directions/v5/mapbox/driving/" +
    from.lng + "," + from.lat + ";" + to.lng + "," + to.lat + "?" +
    "geometries=geojson&" +
    "notifications=all&" +
    "voice_instructions=true&" +
    "steps=true&" +
    "roundabout_exits=true&" +
    "language=it&" +
    "banner_instructions=true&" +
    "voice_units=metric&" +
    "overview=full&" +
    "access_token=" + token

    const res = await fetch(url)
    const data = await res.json()
    console.log(data.routes?.[0] ?? "data routes non visibile")
    return data.routes?.[0] ?? null // il formato dovrebbe essere
    // { geometry: GeoJSON, distance: metri, duration: secondi }
}
