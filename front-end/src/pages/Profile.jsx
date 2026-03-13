import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { initialBookings, parkings } from '../features/mockData'

export default function Profile() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState(initialBookings)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: ''
  })
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState(null)

  const handleSaveProfile = () => {
    // TODO: Chiamata API per salvare profilo
    setEditingProfile(false)
  }

  const handleCancelBooking = () => {
    setBookings(
      bookings.map((b) =>
        b.id === bookingToCancel.id ? { ...b, status: 'cancelled' } : b
      )
    )
    setShowCancelModal(false)
    setBookingToCancel(null)
  }

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A'
    const date = new Date(isoString)
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const badges = {
      active: { label: 'Attiva', class: 'badge-active' },
      cancelled: { label: 'Annullata', class: 'badge-cancelled' },
      completed: { label: 'Completata', class: 'badge-completed' },
      expired: { label: 'Scaduta', class: 'badge-expired' }
    }
    return badges[status] || badges.active
  }

  const getParkingName = (parkingId) => {
    const parking = parkings.find((p) => p.id === parkingId)
    return parking?.name || 'Parcheggio non trovato'
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <p>Devi effettuare il login per vedere il tuo profilo.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{user.name}</h1>
            <p className="profile-role">
              {user.role === 'Admin' ? '👑 Amministratore' : '👤 Utente'}
            </p>
          </div>
        </div>

        {/* Sezione Profilo */}
        <div className="profile-section">
          <div className="section-header">
            <h2 className="section-title">📝 Informazioni Personali</h2>
            {!editingProfile ? (
              <button className="btn-edit-profile" onClick={() => setEditingProfile(true)}>
                ✏️ Modifica
              </button>
            ) : (
              <div className="edit-actions">
                <button className="btn-cancel-edit" onClick={() => setEditingProfile(false)}>
                  Annulla
                </button>
                <button className="btn-save-profile" onClick={handleSaveProfile}>
                  💾 Salva
                </button>
              </div>
            )}
          </div>

          <div className="profile-data">
            {editingProfile ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Nome</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, name: e.target.value })
                    }
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Telefono</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, phone: e.target.value })
                    }
                    className="form-input"
                    placeholder="+39 123 456 7890"
                  />
                </div>
              </div>
            ) : (
              <div className="data-grid">
                <div className="data-item">
                  <span className="data-label">Nome:</span>
                  <span className="data-value">{user.name}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Email:</span>
                  <span className="data-value">{user.email}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Telefono:</span>
                  <span className="data-value">{profileData.phone || 'Non impostato'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sezione Prenotazioni */}
        <div className="profile-section">
          <div className="section-header">
            <h2 className="section-title">🎫 Le Mie Prenotazioni</h2>
            <span className="bookings-count">{bookings.length} prenotazioni</span>
          </div>

          {bookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>Nessuna prenotazione</h3>
              <p>Non hai ancora effettuato prenotazioni</p>
            </div>
          ) : (
            <div className="bookings-list">
              {bookings.map((booking) => (
                <div key={booking.id} className={`booking-card ${booking.status}`}>
                  <div className="booking-header">
                    <div className="booking-parking">
                      <span className="parking-icon">🅿️</span>
                      <span className="parking-name">{booking.parkingName}</span>
                    </div>
                    <span className={`status-badge ${getStatusBadge(booking.status).class}`}>
                      {getStatusBadge(booking.status).label}
                    </span>
                  </div>

                  <div className="booking-details">
                    <div className="detail-row">
                      <span className="detail-icon">🎫</span>
                      <div className="detail-content">
                        <span className="detail-label">Codice:</span>
                        <span className="detail-value code">{booking.uniqueCode}</span>
                      </div>
                    </div>

                    <div className="detail-row">
                      <span className="detail-icon">🚗</span>
                      <div className="detail-content">
                        <span className="detail-label">Targa:</span>
                        <span className="detail-value">{booking.licensePlate}</span>
                      </div>
                    </div>

                    <div className="detail-row">
                      <span className="detail-icon">📅</span>
                      <div className="detail-content">
                        <span className="detail-label">Inizio:</span>
                        <span className="detail-value">{formatDate(booking.startTime)}</span>
                      </div>
                    </div>

                    <div className="detail-row">
                      <span className="detail-icon">🏁</span>
                      <div className="detail-content">
                        <span className="detail-label">Fine:</span>
                        <span className="detail-value">{formatDate(booking.endTime)}</span>
                      </div>
                    </div>
                  </div>

                  {booking.status === 'active' && (
                    <div className="booking-actions">
                      <button className="btn-modify">✏️ Modifica</button>
                      <button
                        className="btn-cancel"
                        onClick={() => {
                          setBookingToCancel(booking)
                          setShowCancelModal(true)
                        }}
                      >
                        🗑️ Annulla
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Conferma Cancellazione */}
      {showCancelModal && bookingToCancel && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCancelModal(false)}>
              ✕
            </button>

            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <h3 className="modal-title">Annulla Prenotazione</h3>
              <p className="modal-text">
                Sei sicuro di voler annullare la prenotazione per{' '}
                <strong>{bookingToCancel.parkingName}</strong>?
              </p>
              <p className="modal-subtext">
                Codice: <code>{bookingToCancel.uniqueCode}</code>
              </p>
            </div>

            <div className="modal-actions">
              <button className="btn-modal-cancel" onClick={() => setShowCancelModal(false)}>
                Chiudi
              </button>
              <button className="btn-modal-confirm" onClick={handleCancelBooking}>
                Conferma Annullamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
