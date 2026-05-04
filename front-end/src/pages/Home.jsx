import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import ParkingMap from '../features/ParkingMap'
import FilterPanel from '../components/FilterPanel'
import * as api from '../services/api'
import { SlidersHorizontal, X, Trash2 } from 'lucide-react'

// Validazione targa italiana: 2 lettere, 3 cifre, 2 lettere (es. AB123CD)
const TARGA_REGEX = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/

export default function Home() {
  const { user, token } = useAuth()
  const { addToast } = useToast()
  const { darkMode } = useTheme()
  const navigate = useNavigate()

  const [parkings, setParkings] = useState([])
  const [filters, setFilters] = useState({
    type: 'all',
    priceRange: [0, 5],
    minFreeSpots: 0,
    amenities: []
  })
  const [mapStyle, setMapStyle] = useState(() =>
    localStorage.getItem('theme') === 'dark' ? 'dark-v11' : 'streets-v12'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedParking, setSelectedParking] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [bookingData, setBookingData] = useState({ targa: '', startDate: '', startHour: '', duration: 2 })
  const [formErrors, setFormErrors] = useState({})
  const [bookingCode, setBookingCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
    const [userBookings, setUserBookings] = useState([])
    const [bookingsPanelOpen, setBookingsPanelOpen] = useState(true)
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [bookingToCancel, setBookingToCancel] = useState(null)

    useEffect(() => {
    api.getParcheggi().then(res => {
      if (res.success) setParkings(res.data)
    })
  }, [])

    useEffect(() => {
        if (!user || !token) return
        api.getPrenotazioniByUser(user.id, token).then(res => {
            if (res.success) setUserBookings(res.data.filter(b => b.stato === 'attiva'))
        })
    }, [user])

  useEffect(() => {
    setMapStyle(prev => {
      if (darkMode && !prev.startsWith('dark')) return 'dark-v11'
      if (!darkMode && prev === 'dark-v11') return 'streets-v12'
      return prev
    })
  }, [darkMode])

    const handleCancelBooking = (b) => {
        setBookingToCancel(b)
        setShowCancelModal(true)
    }

    const handleConfirmCancel = async () => {
        const res = await api.cancelPrenotazione(bookingToCancel.id, token)
        if (res.success) {
            setUserBookings(prev => prev.filter(b => b.id !== bookingToCancel.id))
            addToast('Prenotazione annullata', 'success')
        } else {
            addToast(res.message || 'Errore durante l\'annullamento', 'error')
        }
        setShowCancelModal(false)
        setBookingToCancel(null)
    }

  const filteredParkings = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return parkings.filter(p => {
      if (q && !p.nome?.toLowerCase().includes(q) && !p.indirizzo?.toLowerCase().includes(q)) return false
      if (filters.type !== 'all' && p.tipo !== filters.type) return false
        if (parseFloat(p.tariffa_oraria) > filters.priceRange[1]) return false
      if (p.posti_liberi < filters.minFreeSpots) return false
      if (filters.amenities.length > 0) {
        if (!filters.amenities.every(a => p.servizi?.includes(a))) return false
      }
      return true
    })
  }, [filters, parkings, searchQuery])

  const handleParkingClick = (parking) => {
    if (!user) { navigate('/login'); return }
    setSelectedParking(parking)
    setShowModal(true)
    setBookingCode('')
    setFormErrors({})
    const start = new Date(Date.now() + 30 * 60000)
    const pad = n => String(n).padStart(2, '0')
    setBookingData({
      targa: '',
      startDate: start.toISOString().slice(0, 10),
      startHour: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      duration: 2
    })
  }

  const validateForm = () => {
    const errors = {}
    if (!bookingData.targa) {
      errors.targa = 'La targa è obbligatoria'
    } else if (!TARGA_REGEX.test(bookingData.targa)) {
      errors.targa = 'Formato non valido. Usa: AB123CD'
    }
    if (!bookingData.startDate || !bookingData.startHour) {
      errors.startTime = 'Data e ora di inizio sono obbligatorie'
    }
    if (bookingData.endDate < bookingData.startDate || bookingData.startDate < new Date()) {

    } else {
      const combined = new Date(`${bookingData.startDate}T${bookingData.startHour}`)
      if (isNaN(combined.getTime()) || combined < new Date(Date.now() - 5 * 60000)) {
        errors.startTime = 'La data/ora di inizio non può essere nel passato'
      }
    }
    return errors
  }

  const confirmBooking = async () => {
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})
    setSubmitting(true)

    const startDate = new Date(`${bookingData.startDate}T${bookingData.startHour}`)
    const endDate = new Date(startDate.getTime() + bookingData.duration * 3600000)
    const res = await api.createPrenotazione({
      parcheggio_id: selectedParking.id,
      targa: bookingData.targa,
      data_ora_inizio: startDate.toISOString(),
      data_ora_fine: endDate.toISOString(),
    }, token)
    setSubmitting(false)

    if (res.success) {
      const codice = res.data.codice_prenotazione
      // Aggiorna posti liberi localmente
      setParkings(prev => prev.map(p =>
        p.id === selectedParking.id ? { ...p, posti_liberi: Math.max(0, p.posti_liberi - 1) } : p
      ))
      setBookingCode(codice)
      addToast(`Prenotazione confermata! Codice: ${codice}`, 'success', 5000)
    } else {
      addToast(res.message || 'Errore durante la prenotazione', 'error')
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedParking(null)
    setBookingCode('')
    setFormErrors({})
  }

  return (
    <div className={`home-container${sidebarOpen ? ' sidebar-open' : ''}`}>
      <aside className={`sidebar${sidebarOpen ? '' : ' sidebar-hidden'}`}>
        <FilterPanel onFilterChange={setFilters} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <div className="map-style-selector">
          <h3 className="filter-section-title">Stile Mappa</h3>
          <select value={mapStyle} onChange={e => setMapStyle(e.target.value)} className="style-select">
            <option value="streets-v12">🗺️ Streets</option>
            <option value="outdoors-v12">🌲 Outdoors</option>
            <option value="satellite-streets-v12">🛰️ Satellite</option>
            <option value="light-v11">☀️ Light</option>
            <option value="dark-v11">🌙 Dark</option>
            <option value="navigation-day-v1">🚗 Navigazione</option>
          </select>
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
          {sidebarOpen ? <X size={16} /> : <SlidersHorizontal size={16} />}
          {sidebarOpen ? 'Chiudi' : 'Filtri'}
        </button>
        <ParkingMap
          parkings={filteredParkings}
          onParkingClick={handleParkingClick}
          mapStyle={mapStyle}
        />
        <div className="results-badge">
          {filteredParkings.length} parcheggi disponibili
        </div>
      </main>

        {user && (
            <aside className={`bookings-right-panel${bookingsPanelOpen ? '' : ' bookings-panel-collapsed'}`}>
                <button
                    className="bookings-panel-toggle"
                    onClick={() => setBookingsPanelOpen(p => !p)}
                >
                    {bookingsPanelOpen ? '›' : '‹'}
                </button>
                {bookingsPanelOpen && (
                    <>
                        <h3 className="bookings-panel-title">Prenotazioni attive</h3>
                        {userBookings.length === 0 ? (
                            <p className="bookings-panel-empty">Nessuna prenotazione attiva</p>
                        ) : (
                            <div className="bookings-panel-list">
                                {userBookings.map(b => (
                                    <div key={b.id} className="bookings-panel-card">
                                        <span className="bpc-nome">{b.parcheggio_nome}</span>
                                        <span className="bpc-targa">{b.targa}</span>
                                        <span className="bpc-data">
    {new Date(b.data_ora_inizio).toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit' })}
                                            {' '}
                                            {new Date(b.data_ora_inizio).toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' })}
  </span>
                                        <button className="btn-cancel" onClick={() => handleCancelBooking(b)}>
                                            <Trash2 size={14} /> Annulla
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </aside>
        )}

        {showCancelModal && bookingToCancel && (
            <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
                <div className="modal-content small" onClick={e => e.stopPropagation()}>
                    <button className="modal-close" onClick={() => setShowCancelModal(false)}>✕</button>
                    <div className="modal-body">
                        <div className="warning-icon">⚠️</div>
                        <h3 className="modal-title">Annulla Prenotazione</h3>
                        <p className="modal-text">
                            Sei sicuro di voler annullare la prenotazione per <strong>{bookingToCancel.parcheggio_nome}</strong>?
                        </p>
                        <p className="modal-subtext">Targa: <code>{bookingToCancel.targa}</code></p>
                    </div>
                    <div className="modal-actions">
                        <button className="btn-modal-cancel" onClick={() => setShowCancelModal(false)}>Chiudi</button>
                        <button className="btn-modal-confirm" onClick={handleConfirmCancel}>Conferma Annullamento</button>
                    </div>
                </div>
            </div>
        )}

      {/* Modal prenotazione */}
      {showModal && selectedParking && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>

            <div className="modal-header">
              <img src={selectedParking.image} alt={selectedParking.nome} className="modal-image" />
              <div className="modal-header-info">
                <h3 className="modal-title">{selectedParking.nome}</h3>
                <p className="modal-address">{selectedParking.indirizzo}</p>
                <div className="modal-stats">
                    <span className="modal-price">€{parseFloat(selectedParking.tariffa_oraria).toFixed(2)}/ora</span>
                  <span className={`modal-spots ${selectedParking.posti_liberi < 10 ? 'low' : ''}`}>
                    {selectedParking.posti_liberi} posti liberi ora
                  </span>
                </div>
              </div>
            </div>

            {!bookingCode ? (
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="targa">Targa veicolo *</label>
                  <input
                    id="targa"
                    type="text"
                    placeholder="AB123CD"
                    maxLength="7"
                    value={bookingData.targa}
                    onChange={e => {
                      setBookingData({ ...bookingData, targa: e.target.value.toUpperCase() })
                      if (formErrors.targa) setFormErrors(prev => ({ ...prev, targa: '' }))
                    }}
                    className={`form-input${formErrors.targa ? ' input-error' : ''}`}
                  />
                  {formErrors.targa && <p className="field-error">{formErrors.targa}</p>}
                </div>

                <div className="form-row" style={{ gap: '0.75rem' }}>
                  <div className="form-group">
                    <label htmlFor="startDate">Data inizio *</label>
                    <input
                      id="startDate"
                      type="date"
                      value={bookingData.startDate}
                      onChange={e => {
                        setBookingData({ ...bookingData, startDate: e.target.value })
                        if (formErrors.startTime) setFormErrors(prev => ({ ...prev, startTime: '' }))
                      }}
                      className={`form-input${formErrors.startTime ? ' input-error' : ''}`}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="startHour">Ora inizio *</label>
                    <input
                      id="startHour"
                      type="time"
                      value={bookingData.startHour}
                      onChange={e => {
                        setBookingData({ ...bookingData, startHour: e.target.value })
                        if (formErrors.startTime) setFormErrors(prev => ({ ...prev, startTime: '' }))
                      }}
                      className={`form-input${formErrors.startTime ? ' input-error' : ''}`}
                    />
                  </div>
                </div>
                {formErrors.startTime && <p className="field-error">{formErrors.startTime}</p>}

                <div className="form-group">
                  <label htmlFor="duration">Durata</label>
                  <select
                    id="duration"
                    value={bookingData.duration}
                    onChange={e => setBookingData({ ...bookingData, duration: parseInt(e.target.value) })}
                    className="form-input"
                  >
                    {[1,2,3,4,6,12,24].map(h => (
                      <option key={h} value={h}>{h} {h === 1 ? 'ora' : 'ore'}</option>
                    ))}
                  </select>
                </div>

                <div className="booking-summary">
                  <div className="summary-row">
                    <span>Costo stimato:</span>
                    <span className="summary-price">
                      €{(parseFloat(selectedParking.tariffa_oraria) * bookingData.duration).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button className="confirm-button" onClick={confirmBooking} disabled={submitting}>
                  {submitting ? 'Prenotazione in corso...' : 'Conferma prenotazione'}
                </button>
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
                <button className="confirm-button" style={{ marginTop: '1rem' }} onClick={closeModal}>
                  Chiudi
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
