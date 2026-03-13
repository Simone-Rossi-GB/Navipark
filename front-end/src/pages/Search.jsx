import React, { useState } from 'react'
import { useToast } from '../context/ToastContext'
import * as api from '../services/api'

// Codici disponibili nei dati mock (solo per sviluppo)
const MOCK_CODES = ['A7B2C9D1', 'E3F6G8H4', 'K1L5M0N7', 'P2Q4R6S8', 'T5U0V3W9', 'X7Y1Z4A0', 'B8C2D5E3']

export default function Search() {
  const { addToast } = useToast()
  const [searchCode, setSearchCode] = useState('')
  const [booking, setBooking] = useState(null)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    setError('')
    setBooking(null)
    setSearching(true)
    const res = await api.getPrenotazioneByCodice(searchCode.trim())
    setSearching(false)
    if (res.success) {
      setBooking(res.data)
    } else {
      setError('Prenotazione non trovata. Verifica il codice inserito.')
    }
  }

  const handleCancel = async () => {
    const res = await api.cancelPrenotazione(booking.id)
    if (res.success) {
      setBooking({ ...booking, stato: 'annullata' })
      addToast('Prenotazione annullata con successo', 'success')
    } else {
      addToast(res.message || 'Errore durante l\'annullamento', 'error')
    }
    setShowCancelModal(false)
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

  const badge = booking ? (statusBadge[booking.stato] || statusBadge.attiva) : null

  return (
    <div className="search-page">
      <div className="search-container">
        <div className="search-header">
          <h1 className="search-title">🔍 Cerca Prenotazione</h1>
          <p className="search-subtitle">
            Inserisci il codice univoco della tua prenotazione per visualizzarne i dettagli
          </p>
        </div>

        {/* Banner codici demo — visibile solo in sviluppo */}
        <div className="dev-hint">
          <details>
            <summary>🛠️ Codici di prova disponibili (clicca per espandere)</summary>
            <div className="dev-codes">
              {MOCK_CODES.map(c => (
                <button key={c} type="button" className="dev-code-btn" onClick={() => setSearchCode(c)}>
                  {c}
                </button>
              ))}
            </div>
          </details>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Es: A7B2C9D1"
              value={searchCode}
              onChange={e => setSearchCode(e.target.value.toUpperCase())}
              className="search-input"
              maxLength="20"
              required
            />
            <button type="submit" className="search-button" disabled={searching || !searchCode.trim()}>
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
              <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
            </div>

            <div className="result-body">
              <div className="result-section">
                <h3>📋 Informazioni Prenotazione</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Codice:</span>
                    <span className="info-value code">{booking.codice_prenotazione}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Parcheggio:</span>
                    <span className="info-value">{booking.parcheggio_nome}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Targa:</span>
                    <span className="info-value">{booking.targa}</span>
                  </div>
                </div>
              </div>

              <div className="result-section">
                <h3>📅 Date e Orari</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Inizio:</span>
                    <span className="info-value">{formatDate(booking.data_ora_inizio)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Fine:</span>
                    <span className="info-value">{formatDate(booking.data_ora_fine)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Creata il:</span>
                    <span className="info-value">{formatDate(booking.created_at)}</span>
                  </div>
                </div>
              </div>

              {booking.stato === 'attiva' && (
                <div className="result-actions">
                  <button className="action-button cancel" onClick={() => setShowCancelModal(true)}>
                    🗑️ Annulla Prenotazione
                  </button>
                </div>
              )}
            </div>

            <div className="result-footer">
              <p className="help-text">💡 Conserva questo codice per accedere al parcheggio</p>
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

      {/* Modal Annullamento */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCancelModal(false)}>✕</button>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <h3 className="modal-title">Annulla Prenotazione</h3>
              <p className="modal-text">
                Sei sicuro di voler annullare la prenotazione per <strong>{booking?.parcheggio_nome}</strong>?
              </p>
              <p className="modal-subtext">Codice: <code>{booking?.codice_prenotazione}</code></p>
            </div>
            <div className="modal-actions">
              <button className="btn-modal-cancel" onClick={() => setShowCancelModal(false)}>Chiudi</button>
              <button className="btn-modal-confirm" onClick={handleCancel}>Conferma Annullamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
