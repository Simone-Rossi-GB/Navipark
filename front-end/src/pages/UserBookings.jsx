import React, { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import * as api from '../services/api'
import {
  Ticket, Car, CalendarDays, Flag, Trash2, ParkingSquare
} from 'lucide-react'

export default function UserBookings() {
  const { user, token } = useAuth()
  const { addToast } = useToast()
  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState(null)

  useEffect(() => {
    if (!user) return
    api.getPrenotazioniByUser(user.id, token).then(res => {
      if (res.success) setBookings(res.data)
      setLoadingBookings(false)
    })
  }, [user])

  const handleConfirmCancel = async () => {
    const res = await api.cancelPrenotazione(bookingToCancel.id, token)
    if (res.success) {
      setBookings(prev => prev.map(b => b.id === bookingToCancel.id ? { ...b, stato: 'annullata' } : b))
      addToast('Prenotazione annullata', 'success')
    } else {
      addToast(res.message || 'Errore durante l\'annullamento', 'error')
    }
    setShowCancelModal(false)
    setBookingToCancel(null)
  }

  const formatDate = (iso) => {
    if (!iso) return 'N/A'
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const statusBadge = {
    attiva:     { label: 'Attiva',     cls: 'badge-active' },
    annullata:  { label: 'Annullata',  cls: 'badge-cancelled' },
    completata: { label: 'Completata', cls: 'badge-completed' },
    scaduta:    { label: 'Scaduta',    cls: 'badge-expired' },
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <p>Devi effettuare il login per vedere le tue prenotazioni.</p>
        </div>
      </div>
    )
  }

  const activeCount = bookings.filter(b => b.stato === 'attiva').length

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-section">
          <div className="section-header">
            <h2 className="section-title">
              <Ticket size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Le Mie Prenotazioni
            </h2>
            <span className="bookings-count">
              {activeCount > 0 && <span style={{ color: '#16a34a', marginRight: '0.5rem' }}>{activeCount} attive</span>}
              {bookings.length} totali
            </span>
          </div>

          {loadingBookings ? (
            <div className="empty-state"><p>Caricamento...</p></div>
          ) : bookings.length === 0 ? (
            <div className="empty-state">
              <Ticket size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <h3>Nessuna prenotazione</h3>
              <p>Non hai ancora effettuato prenotazioni</p>
            </div>
          ) : (
            <div className="bookings-list">
              {bookings.map(booking => {
                const badge = statusBadge[booking.stato] || statusBadge.attiva
                return (
                  <div key={booking.id} className={`booking-card ${booking.stato}`}>
                    <div className="booking-header">
                      <div className="booking-parking">
                        <ParkingSquare size={16} />
                        <span className="parking-name">{booking.parcheggio_nome}</span>
                      </div>
                      <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
                    </div>

                    <div className="booking-details">
                      <div className="detail-row">
                        <Ticket size={14} className="detail-icon-svg" />
                        <div className="detail-content">
                          <span className="detail-label">Codice</span>
                          <span
                            className="detail-value code"
                            title="Clicca per copiare"
                            onClick={() => navigator.clipboard.writeText(booking.codice_prenotazione)}
                            style={{ cursor: 'pointer', wordBreak: 'break-all' }}
                          >{booking.codice_prenotazione}</span>
                        </div>
                      </div>
                      <div className="detail-row">
                        <Car size={14} className="detail-icon-svg" />
                        <div className="detail-content">
                          <span className="detail-label">Targa</span>
                          <span className="detail-value">{booking.targa}</span>
                        </div>
                      </div>
                      <div className="detail-row">
                        <CalendarDays size={14} className="detail-icon-svg" />
                        <div className="detail-content">
                          <span className="detail-label">Inizio</span>
                          <span className="detail-value">{formatDate(booking.data_ora_inizio)}</span>
                        </div>
                      </div>
                      <div className="detail-row">
                        <Flag size={14} className="detail-icon-svg" />
                        <div className="detail-content">
                          <span className="detail-label">Fine</span>
                          <span className="detail-value">{formatDate(booking.data_ora_fine)}</span>
                        </div>
                      </div>
                    </div>

                    {booking.stato === 'attiva' && (
                      <div className="booking-actions">
                        <button className="btn-cancel" onClick={() => { setBookingToCancel(booking); setShowCancelModal(true) }}>
                          <Trash2 size={14} /> Annulla
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Annullamento */}
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
              <p className="modal-subtext">Codice: <code>{bookingToCancel.codice_prenotazione}</code></p>
            </div>
            <div className="modal-actions">
              <button className="btn-modal-cancel" onClick={() => setShowCancelModal(false)}>Chiudi</button>
              <button className="btn-modal-confirm" onClick={handleConfirmCancel}>Conferma Annullamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
