import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import * as api from '../services/api'

export default function Profile() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    nome: user?.nome || user?.name || '',
    email: user?.email || '',
    telefono: user?.telefono || ''
  })
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState(null)
  const [showModifyModal, setShowModifyModal] = useState(false)
  const [bookingToModify, setBookingToModify] = useState(null)
  const [modifyData, setModifyData] = useState({ targa: '', data_ora_inizio: '', data_ora_fine: '' })
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (!user) return
    api.getPrenotazioniByUser(user.id).then(res => {
      if (res.success) setBookings(res.data)
      setLoadingBookings(false)
    })
  }, [user])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const res = await api.updateProfilo(user.id, profileData)
    setSavingProfile(false)
    if (res.success) {
      addToast('Profilo aggiornato con successo', 'success')
      setEditingProfile(false)
    } else {
      addToast('Errore nel salvataggio del profilo', 'error')
    }
  }

  const handleConfirmCancel = async () => {
    const res = await api.cancelPrenotazione(bookingToCancel.id)
    if (res.success) {
      setBookings(prev => prev.map(b => b.id === bookingToCancel.id ? { ...b, stato: 'annullata' } : b))
      addToast('Prenotazione annullata', 'success')
    } else {
      addToast(res.message || 'Errore durante l\'annullamento', 'error')
    }
    setShowCancelModal(false)
    setBookingToCancel(null)
  }

  const openModifyModal = (booking) => {
    setBookingToModify(booking)
    setModifyData({
      targa: booking.targa,
      data_ora_inizio: booking.data_ora_inizio.slice(0, 16),
      data_ora_fine: booking.data_ora_fine.slice(0, 16),
    })
    setShowModifyModal(true)
  }

  const handleConfirmModify = async () => {
    const res = await api.updatePrenotazione(bookingToModify.id, {
      targa: modifyData.targa.toUpperCase(),
      data_ora_inizio: new Date(modifyData.data_ora_inizio).toISOString(),
      data_ora_fine: new Date(modifyData.data_ora_fine).toISOString(),
    })
    if (res.success) {
      setBookings(prev => prev.map(b => b.id === bookingToModify.id ? res.data : b))
      addToast('Prenotazione modificata con successo', 'success')
      setShowModifyModal(false)
      setBookingToModify(null)
    } else {
      addToast(res.message || 'Errore durante la modifica', 'error')
    }
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
          <p>Devi effettuare il login per vedere il tuo profilo.</p>
        </div>
      </div>
    )
  }

  const activeCount = bookings.filter(b => b.stato === 'attiva').length

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {(user.nome || user.name || 'U')[0].toUpperCase()}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{user.nome || user.name}</h1>
            <p className="profile-role">
              {user.ruolo === 'Admin' || user.role === 'Admin' ? '👑 Amministratore' : '👤 Utente'}
            </p>
          </div>
        </div>

        {/* Informazioni Personali */}
        <div className="profile-section">
          <div className="section-header">
            <h2 className="section-title">📝 Informazioni Personali</h2>
            {!editingProfile ? (
              <button className="btn-edit-profile" onClick={() => setEditingProfile(true)}>
                ✏️ Modifica
              </button>
            ) : (
              <div className="edit-actions">
                <button className="btn-cancel-edit" onClick={() => setEditingProfile(false)}>Annulla</button>
                <button className="btn-save-profile" onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? 'Salvataggio...' : '💾 Salva'}
                </button>
              </div>
            )}
          </div>

          <div className="profile-data">
            {editingProfile ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Nome</label>
                  <input type="text" className="form-input" value={profileData.nome}
                    onChange={e => setProfileData({ ...profileData, nome: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" className="form-input" value={profileData.email}
                    onChange={e => setProfileData({ ...profileData, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Telefono</label>
                  <input type="tel" className="form-input" value={profileData.telefono}
                    onChange={e => setProfileData({ ...profileData, telefono: e.target.value })}
                    placeholder="+39 333 1234567" />
                </div>
              </div>
            ) : (
              <div className="data-grid">
                <div className="data-item">
                  <span className="data-label">Nome:</span>
                  <span className="data-value">{user.nome || user.name}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Email:</span>
                  <span className="data-value">{user.email}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Telefono:</span>
                  <span className="data-value">{profileData.telefono || 'Non impostato'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Prenotazioni */}
        <div className="profile-section">
          <div className="section-header">
            <h2 className="section-title">🎫 Le Mie Prenotazioni</h2>
            <span className="bookings-count">
              {activeCount > 0 && <span style={{ color: '#16a34a', marginRight: '0.5rem' }}>{activeCount} attive</span>}
              {bookings.length} totali
            </span>
          </div>

          {loadingBookings ? (
            <div className="empty-state"><p>Caricamento...</p></div>
          ) : bookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
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
                        <span className="parking-icon">🅿️</span>
                        <span className="parking-name">{booking.parcheggio_nome}</span>
                      </div>
                      <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
                    </div>

                    <div className="booking-details">
                      <div className="detail-row">
                        <span className="detail-icon">🎫</span>
                        <div className="detail-content">
                          <span className="detail-label">Codice:</span>
                          <span className="detail-value code">{booking.codice_prenotazione}</span>
                        </div>
                      </div>
                      <div className="detail-row">
                        <span className="detail-icon">🚗</span>
                        <div className="detail-content">
                          <span className="detail-label">Targa:</span>
                          <span className="detail-value">{booking.targa}</span>
                        </div>
                      </div>
                      <div className="detail-row">
                        <span className="detail-icon">📅</span>
                        <div className="detail-content">
                          <span className="detail-label">Inizio:</span>
                          <span className="detail-value">{formatDate(booking.data_ora_inizio)}</span>
                        </div>
                      </div>
                      <div className="detail-row">
                        <span className="detail-icon">🏁</span>
                        <div className="detail-content">
                          <span className="detail-label">Fine:</span>
                          <span className="detail-value">{formatDate(booking.data_ora_fine)}</span>
                        </div>
                      </div>
                    </div>

                    {booking.stato === 'attiva' && (
                      <div className="booking-actions">
                        <button className="btn-modify" onClick={() => openModifyModal(booking)}>
                          ✏️ Modifica
                        </button>
                        <button className="btn-cancel" onClick={() => { setBookingToCancel(booking); setShowCancelModal(true) }}>
                          🗑️ Annulla
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

      {/* Modal Modifica */}
      {showModifyModal && bookingToModify && (
        <div className="modal-overlay" onClick={() => setShowModifyModal(false)}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModifyModal(false)}>✕</button>
            <div className="modal-body">
              <h3 className="modal-title">Modifica Prenotazione</h3>
              <p className="modal-subtext" style={{ marginBottom: '1rem' }}>
                {bookingToModify.parcheggio_nome} — <code>{bookingToModify.codice_prenotazione}</code>
              </p>
              <div className="parking-form">
                <div className="form-group">
                  <label>Targa</label>
                  <input type="text" className="form-input" value={modifyData.targa}
                    onChange={e => setModifyData({ ...modifyData, targa: e.target.value.toUpperCase() })}
                    maxLength={7} placeholder="AB123CD" />
                </div>
                <div className="form-group">
                  <label>Data/ora inizio</label>
                  <input type="datetime-local" className="form-input" value={modifyData.data_ora_inizio}
                    onChange={e => setModifyData({ ...modifyData, data_ora_inizio: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Data/ora fine</label>
                  <input type="datetime-local" className="form-input" value={modifyData.data_ora_fine}
                    onChange={e => setModifyData({ ...modifyData, data_ora_fine: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-modal-cancel" onClick={() => setShowModifyModal(false)}>Annulla</button>
              <button className="btn-save" onClick={handleConfirmModify}>💾 Salva Modifiche</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
