import React, { useState } from 'react'
import { initialBookings } from '../features/mockData'

export default function Search() {
  const [searchCode, setSearchCode] = useState('')
  const [booking, setBooking] = useState(null)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)

  const handleSearch = (e) => {
    e.preventDefault()
    setError('')
    setBooking(null)
    setSearching(true)

    // Simula ricerca (sostituire con API call)
    setTimeout(() => {
      const found = initialBookings.find(
        (b) => b.uniqueCode.toLowerCase() === searchCode.toLowerCase()
      )

      if (found) {
        setBooking(found)
      } else {
        setError('Prenotazione non trovata. Verifica il codice inserito.')
      }
      setSearching(false)
    }, 500)
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

  return (
    <div className="search-page">
      <div className="search-container">
        <div className="search-header">
          <h1 className="search-title">🔍 Cerca Prenotazione</h1>
          <p className="search-subtitle">
            Inserisci il codice univoco della tua prenotazione per visualizzarne i dettagli
          </p>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Inserisci codice prenotazione (es: ABC12345)"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              className="search-input"
              maxLength="50"
              required
            />
            <button
              type="submit"
              className="search-button"
              disabled={searching || !searchCode.trim()}
            >
              {searching ? '🔄 Ricerca...' : '🔍 Cerca'}
            </button>
          </div>
        </form>

        {error && (
          <div className="search-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {booking && (
          <div className="booking-result">
            <div className="result-header">
              <h2>Prenotazione Trovata</h2>
              <span className={`status-badge ${getStatusBadge(booking.status).class}`}>
                {getStatusBadge(booking.status).label}
              </span>
            </div>

            <div className="result-body">
              <div className="result-section">
                <h3>📋 Informazioni Prenotazione</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Codice:</span>
                    <span className="info-value code">{booking.uniqueCode}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Parcheggio:</span>
                    <span className="info-value">{booking.parkingName}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Targa:</span>
                    <span className="info-value">{booking.licensePlate}</span>
                  </div>
                </div>
              </div>

              <div className="result-section">
                <h3>📅 Date e Orari</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Inizio:</span>
                    <span className="info-value">{formatDate(booking.startTime)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Fine:</span>
                    <span className="info-value">{formatDate(booking.endTime)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Creata il:</span>
                    <span className="info-value">
                      {new Date(booking.timestamp).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
              </div>

              {booking.status === 'active' && (
                <div className="result-actions">
                  <button className="action-button modify">
                    ✏️ Modifica Prenotazione
                  </button>
                  <button className="action-button cancel">
                    🗑️ Annulla Prenotazione
                  </button>
                </div>
              )}
            </div>

            <div className="result-footer">
              <p className="help-text">
                💡 Conserva questo codice per accedere al parcheggio
              </p>
            </div>
          </div>
        )}

        {!booking && !error && (
          <div className="search-help">
            <div className="help-card">
              <h3>❓ Come funziona</h3>
              <ol className="help-list">
                <li>Inserisci il codice univoco ricevuto dopo la prenotazione</li>
                <li>Clicca su "Cerca" per visualizzare i dettagli</li>
                <li>Visualizza o gestisci la tua prenotazione</li>
              </ol>
            </div>

            <div className="help-card">
              <h3>📱 Dove trovo il codice?</h3>
              <p>
                Il codice di prenotazione ti è stato fornito al momento della conferma.
                Puoi trovarlo anche nella sezione "Profilo" se hai effettuato l'accesso.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
