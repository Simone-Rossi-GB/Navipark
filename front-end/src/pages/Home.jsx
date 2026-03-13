import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '../hooks/useAuth'
import ParkingMap from '../features/ParkingMap'
import FilterPanel from '../components/FilterPanel'
import { parkings } from '../features/mockData'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    type: 'all',
    priceRange: [0, 5],
    minFreeSpots: 0,
    amenities: []
  })
  const [mapStyle, setMapStyle] = useState('streets-v12')
  const [selectedParking, setSelectedParking] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [bookingData, setBookingData] = useState({
    licensePlate: '',
    startTime: '',
    duration: 2
  })
  const [bookingCode, setBookingCode] = useState('')
  const [message, setMessage] = useState('')

  // Filtra parcheggi in base ai filtri selezionati
  const filteredParkings = useMemo(() => {
    return parkings.filter((parking) => {
      // Filtro tipo
      if (filters.type !== 'all' && parking.type !== filters.type) return false

      // Filtro prezzo
      if (parking.price > filters.priceRange[1]) return false

      // Filtro posti liberi minimi
      if (parking.freeSpots < filters.minFreeSpots) return false

      // Filtro servizi
      if (filters.amenities.length > 0) {
        const hasAllAmenities = filters.amenities.every((amenity) =>
          parking.amenities.includes(amenity)
        )
        if (!hasAllAmenities) return false
      }

      return true
    })
  }, [filters])

  const handleParkingClick = (parking) => {
    // Se non loggato, manda al login
    if (!user) {
      navigate('/login')
      return
    }

    setSelectedParking(parking)
    setShowModal(true)
    setMessage('')
    setBookingCode('')

    // Imposta orario di default (ora attuale + 30 minuti)
    const now = new Date()
    const startTime = new Date(now.getTime() + 30 * 60000)
    setBookingData({
      ...bookingData,
      startTime: startTime.toISOString().slice(0, 16)
    })
  }

  const confirmBooking = () => {
    if (!bookingData.licensePlate || !bookingData.startTime) {
      setMessage('Compila tutti i campi obbligatori')
      return
    }

    // Genera codice univoco prenotazione
    const code = uuidv4().slice(0, 8).toUpperCase()
    setBookingCode(code)
    setMessage(`Prenotazione confermata! Codice: ${code}`)

    setTimeout(() => {
      setShowModal(false)
      setSelectedParking(null)
      setBookingData({ licensePlate: '', startTime: '', duration: 2 })
    }, 3000)
  }

  return (
    <div className="home-container">
      {/* Sidebar con filtri */}
      <aside className="sidebar">
        <FilterPanel onFilterChange={setFilters} />

        {/* Selettore stile mappa */}
        <div className="map-style-selector">
          <h3 className="filter-section-title">Stile Mappa</h3>
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
            className="style-select"
          >
            <option value="streets-v12">🗺️ Streets (Google Maps)</option>
            <option value="outdoors-v12">🌲 Outdoors (Natura)</option>
            <option value="satellite-streets-v12">🛰️ Satellite</option>
            <option value="light-v11">☀️ Light (Minimalista)</option>
            <option value="dark-v11">🌙 Dark (Scuro)</option>
            <option value="navigation-day-v1">🚗 Navigazione</option>
          </select>
        </div>
      </aside>

      {/* Mappa principale */}
      <main className="map-main">
        <ParkingMap
          parkings={filteredParkings}
          onParkingClick={handleParkingClick}
          mapStyle={mapStyle}
        />

        {/* Contatore parcheggi trovati */}
        <div className="results-badge">
          {filteredParkings.length} parcheggi disponibili
        </div>
      </main>

      {/* Modal prenotazione */}
      {showModal && selectedParking && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              ✕
            </button>

            <div className="modal-header">
              <img
                src={selectedParking.image}
                alt={selectedParking.name}
                className="modal-image"
              />
              <div className="modal-header-info">
                <h3 className="modal-title">{selectedParking.name}</h3>
                <p className="modal-address">{selectedParking.address}</p>
                <div className="modal-stats">
                  <span className="modal-price">€{selectedParking.price}/ora</span>
                  <span className={`modal-spots ${selectedParking.freeSpots < 10 ? 'low' : ''}`}>
                    {selectedParking.freeSpots} posti liberi
                  </span>
                </div>
              </div>
            </div>

            {!bookingCode ? (
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="licensePlate">Targa veicolo *</label>
                  <input
                    id="licensePlate"
                    type="text"
                    placeholder="AB123CD"
                    maxLength="7"
                    value={bookingData.licensePlate}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, licensePlate: e.target.value.toUpperCase() })
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="startTime">Data e ora inizio *</label>
                  <input
                    id="startTime"
                    type="datetime-local"
                    value={bookingData.startTime}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, startTime: e.target.value })
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="duration">Durata (ore)</label>
                  <select
                    id="duration"
                    value={bookingData.duration}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, duration: parseInt(e.target.value) })
                    }
                    className="form-input"
                  >
                    <option value="1">1 ora</option>
                    <option value="2">2 ore</option>
                    <option value="3">3 ore</option>
                    <option value="4">4 ore</option>
                    <option value="6">6 ore</option>
                    <option value="12">12 ore</option>
                    <option value="24">24 ore</option>
                  </select>
                </div>

                <div className="booking-summary">
                  <div className="summary-row">
                    <span>Costo stimato:</span>
                    <span className="summary-price">
                      €{(selectedParking.price * bookingData.duration).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button className="confirm-button" onClick={confirmBooking}>
                  Conferma prenotazione
                </button>

                {message && !bookingCode && (
                  <p className="error-message">{message}</p>
                )}
              </div>
            ) : (
              <div className="success-container">
                <div className="success-icon">✓</div>
                <h4 className="success-title">Prenotazione confermata!</h4>
                <div className="booking-code">
                  <span className="code-label">Codice prenotazione:</span>
                  <span className="code-value">{bookingCode}</span>
                </div>
                <p className="success-message">
                  Conserva questo codice. Ti servirà per accedere al parcheggio.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
