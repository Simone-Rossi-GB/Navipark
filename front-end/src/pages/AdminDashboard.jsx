import React, { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useToast } from '../context/ToastContext'
import * as api from '../services/api'

const EMPTY_PARKING_FORM = {
  nome: '',
  indirizzo: '',
  capacita_totale: 50,
  posti_liberi: 50,
  tariffa_oraria: 2.0,
  tipo: 'scoperto',
  lat: 45.5397,
  lng: 10.2205,
  servizi: [],
  image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400&h=250&fit=crop'
}

const TARGA_REGEX = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/
const SERVIZI = ['videosorveglianza', 'disabili', 'elettrico', 'custodito', 'moto', 'h24']

function statusBadge(stato) {
  const map = {
    attiva: { label: 'Attiva', cls: 'badge-active' },
    annullata: { label: 'Annullata', cls: 'badge-cancelled' },
    completata: { label: 'Completata', cls: 'badge-completed' },
    scaduta: { label: 'Scaduta', cls: 'badge-expired' },
  }
  const s = map[stato] || { label: stato, cls: '' }
  return <span className={`booking-status-badge ${s.cls}`}>{s.label}</span>
}

function formatDT(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminDashboard() {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('parcheggi')

  // ── Parcheggi ──
  const [parkings, setParkings] = useState([])
  const [stats, setStats] = useState(null)
  const [showParkingModal, setShowParkingModal] = useState(false)
  const [editingParking, setEditingParking] = useState(null)
  const [parkingForm, setParkingForm] = useState(EMPTY_PARKING_FORM)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [parkingToDelete, setParkingToDelete] = useState(null)

  // ── Prenotazioni ──
  const [bookings, setBookings] = useState([])
  const [filterParkingId, setFilterParkingId] = useState('all')
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [editingBooking, setEditingBooking] = useState(null)
  const [bookingForm, setBookingForm] = useState({ targa: '', data_ora_inizio: '', data_ora_fine: '', parcheggio_id: '', utente_id: '' })
  const [bookingFormErrors, setBookingFormErrors] = useState({})
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState(null)

  useEffect(() => {
    api.getParcheggi().then(res => { if (res.success) setParkings(res.data) })
    api.getAdminStats().then(res => { if (res.success) setStats(res.data) })
    api.getAllPrenotazioni().then(res => { if (res.success) setBookings(res.data) })
  }, [])

  // ── Parcheggi handlers ──
  const handleAddParking = () => {
    setEditingParking(null)
    setParkingForm(EMPTY_PARKING_FORM)
    setShowParkingModal(true)
  }

  const handleEditParking = (p) => {
    setEditingParking(p)
    setParkingForm({
      nome: p.nome, indirizzo: p.indirizzo,
      capacita_totale: p.capacita_totale, posti_liberi: p.posti_liberi,
      tariffa_oraria: p.tariffa_oraria, tipo: p.tipo,
      lat: p.lat, lng: p.lng,
      servizi: p.servizi || [],
      image: p.image || EMPTY_PARKING_FORM.image
    })
    setShowParkingModal(true)
  }

  const handleDeleteParking = async () => {
    const res = await api.deleteParcheggio(parkingToDelete.id)
    if (res.success) {
      setParkings(prev => prev.filter(p => p.id !== parkingToDelete.id))
      addToast(`Parcheggio "${parkingToDelete.nome}" eliminato`, 'success')
    } else {
      addToast('Errore durante l\'eliminazione', 'error')
    }
    setShowDeleteModal(false)
    setParkingToDelete(null)
  }

  const handleParkingSubmit = async (e) => {
    e.preventDefault()
    if (editingParking) {
      const res = await api.updateParcheggio(editingParking.id, parkingForm)
      if (res.success) {
        setParkings(prev => prev.map(p => p.id === editingParking.id ? res.data : p))
        addToast('Parcheggio aggiornato con successo', 'success')
      } else {
        addToast('Errore durante l\'aggiornamento', 'error')
      }
    } else {
      const res = await api.createParcheggio(parkingForm)
      if (res.success) {
        setParkings(prev => [...prev, res.data])
        addToast('Parcheggio creato con successo', 'success')
      } else {
        addToast('Errore durante la creazione', 'error')
      }
    }
    setShowParkingModal(false)
  }

  const toggleServizio = (s) => {
    setParkingForm(prev => ({
      ...prev,
      servizi: prev.servizi.includes(s) ? prev.servizi.filter(x => x !== s) : [...prev.servizi, s]
    }))
  }

  // ── Prenotazioni handlers ──
  const filteredBookings = filterParkingId === 'all'
    ? bookings
    : bookings.filter(b => b.parcheggio_id === filterParkingId)

  const handleEditBooking = (b) => {
    setEditingBooking(b)
    const toDateTimeLocal = (iso) => {
      if (!iso) return ''
      return iso.slice(0, 16)
    }
    setBookingForm({
      targa: b.targa,
      data_ora_inizio: toDateTimeLocal(b.data_ora_inizio),
      data_ora_fine: toDateTimeLocal(b.data_ora_fine),
      parcheggio_id: b.parcheggio_id,
      utente_id: b.utente_id || ''
    })
    setBookingFormErrors({})
    setShowBookingModal(true)
  }

  const handleAddBooking = () => {
    setEditingBooking(null)
    setBookingForm({ targa: '', data_ora_inizio: '', data_ora_fine: '', parcheggio_id: parkings[0]?.id || '', utente_id: '' })
    setBookingFormErrors({})
    setShowBookingModal(true)
  }

  const validateBookingForm = () => {
    const errors = {}
    if (!bookingForm.targa) {
      errors.targa = 'Targa obbligatoria'
    } else if (!TARGA_REGEX.test(bookingForm.targa)) {
      errors.targa = 'Formato non valido (es. AB123CD)'
    }
    if (!bookingForm.data_ora_inizio) errors.data_ora_inizio = 'Data/ora inizio obbligatoria'
    if (!bookingForm.data_ora_fine) errors.data_ora_fine = 'Data/ora fine obbligatoria'
    if (bookingForm.data_ora_inizio && bookingForm.data_ora_fine) {
      if (new Date(bookingForm.data_ora_fine) <= new Date(bookingForm.data_ora_inizio)) {
        errors.data_ora_fine = 'La fine deve essere dopo l\'inizio'
      }
    }
    if (!bookingForm.parcheggio_id) errors.parcheggio_id = 'Seleziona un parcheggio'
    return errors
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    const errors = validateBookingForm()
    if (Object.keys(errors).length > 0) { setBookingFormErrors(errors); return }
    setBookingFormErrors({})

    const parking = parkings.find(p => p.id === bookingForm.parcheggio_id)

    if (editingBooking) {
      const res = await api.updatePrenotazione(editingBooking.id, {
        targa: bookingForm.targa,
        data_ora_inizio: new Date(bookingForm.data_ora_inizio).toISOString(),
        data_ora_fine: new Date(bookingForm.data_ora_fine).toISOString(),
      })
      if (res.success) {
        setBookings(prev => prev.map(b => b.id === editingBooking.id ? res.data : b))
        addToast('Prenotazione aggiornata', 'success')
      } else {
        addToast(res.message || 'Errore aggiornamento', 'error')
      }
    } else {
      const codice = uuidv4().slice(0, 8).toUpperCase()
      const res = await api.adminCreatePrenotazione({
        codice_prenotazione: codice,
        utente_id: bookingForm.utente_id || 'admin',
        parcheggio_id: bookingForm.parcheggio_id,
        parcheggio_nome: parking?.nome || '',
        targa: bookingForm.targa,
        data_ora_inizio: new Date(bookingForm.data_ora_inizio).toISOString(),
        data_ora_fine: new Date(bookingForm.data_ora_fine).toISOString(),
      })
      if (res.success) {
        setBookings(prev => [...prev, res.data])
        if (parking) {
          setParkings(prev => prev.map(p =>
            p.id === parking.id ? { ...p, posti_liberi: Math.max(0, p.posti_liberi - 1) } : p
          ))
        }
        addToast(`Prenotazione creata. Codice: ${codice}`, 'success', 5000)
      } else {
        addToast(res.message || 'Errore creazione', 'error')
      }
    }
    setShowBookingModal(false)
  }

  const handleConfirmCancel = async () => {
    const res = await api.cancelPrenotazione(bookingToCancel.id)
    if (res.success) {
      setBookings(prev => prev.map(b => b.id === bookingToCancel.id ? { ...b, stato: 'annullata' } : b))
      const parking = parkings.find(p => p.id === bookingToCancel.parcheggio_id)
      if (parking) {
        setParkings(prev => prev.map(p =>
          p.id === parking.id ? { ...p, posti_liberi: p.posti_liberi + 1 } : p
        ))
      }
      addToast('Prenotazione annullata', 'success')
    } else {
      addToast(res.message || 'Errore annullamento', 'error')
    }
    setShowCancelModal(false)
    setBookingToCancel(null)
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1 className="admin-title">📊 Dashboard Amministratore</h1>
        <p className="admin-subtitle">Gestisci parcheggi, prenotazioni e visualizza statistiche</p>
      </div>

      {/* Statistiche */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalBookings.toLocaleString()}</div>
              <div className="stat-label">Prenotazioni Totali</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.activeBookings}</div>
              <div className="stat-label">Prenotazioni Attive</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-value">€{stats.totalRevenue.toLocaleString()}</div>
              <div className="stat-label">Ricavi Totali</div>
            </div>
          </div>
          <div className="stat-card green" title="Ogni prenotazione in parcheggio centralizzato evita ~0.24 kg CO₂ rispetto a guidare alla ricerca di parcheggio">
            <div className="stat-icon">🌱</div>
            <div className="stat-content">
              <div className="stat-value">{stats.co2Saved} kg</div>
              <div className="stat-label">CO₂ Risparmiata ℹ️</div>
            </div>
          </div>
        </div>
      )}

      {/* Parcheggi più utilizzati */}
      {stats?.mostUsedParkings && (
        <div className="top-parkings">
          <h2 className="section-title">🏆 Parcheggi Più Utilizzati</h2>
          <div className="top-list">
            {stats.mostUsedParkings.map((p, i) => (
              <div key={i} className="top-item">
                <span className="top-rank">#{i + 1}</span>
                <span className="top-name">{p.nome}</span>
                <span className="top-count">{p.prenotazioni} prenotazioni</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab${activeTab === 'parcheggi' ? ' active' : ''}`}
          onClick={() => setActiveTab('parcheggi')}
        >
          🅿️ Parcheggi
        </button>
        <button
          className={`admin-tab${activeTab === 'prenotazioni' ? ' active' : ''}`}
          onClick={() => setActiveTab('prenotazioni')}
        >
          📋 Prenotazioni
          {bookings.filter(b => b.stato === 'attiva').length > 0 && (
            <span className="tab-badge">{bookings.filter(b => b.stato === 'attiva').length}</span>
          )}
        </button>
      </div>

      {/* Tab: Parcheggi */}
      {activeTab === 'parcheggi' && (
        <div className="parkings-crud">
          <div className="crud-header">
            <h2 className="section-title">Gestione Parcheggi</h2>
            <button className="btn-add" onClick={handleAddParking}>➕ Aggiungi Parcheggio</button>
          </div>
          <div className="parkings-table">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Indirizzo</th>
                  <th>Tipo</th>
                  <th>Posti Totali</th>
                  <th>Posti Liberi</th>
                  <th>Tariffa</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {parkings.map(p => (
                  <tr key={p.id}>
                    <td className="parking-name">{p.nome}</td>
                    <td className="parking-address">{p.indirizzo}</td>
                    <td>
                      <span className={`type-badge ${p.tipo}`}>
                        {p.tipo === 'coperto' ? '🏢 Coperto' : '🌤️ Scoperto'}
                      </span>
                    </td>
                    <td className="text-center">{p.capacita_totale}</td>
                    <td className="text-center">
                      <span className={p.posti_liberi < 10 ? 'text-red' : 'text-green'}>{p.posti_liberi}</span>
                    </td>
                    <td>€{p.tariffa_oraria.toFixed(2)}/h</td>
                    <td className="actions">
                      <button className="btn-edit" onClick={() => handleEditParking(p)} title="Modifica">✏️</button>
                      <button className="btn-delete" onClick={() => { setParkingToDelete(p); setShowDeleteModal(true) }} title="Elimina">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Prenotazioni */}
      {activeTab === 'prenotazioni' && (
        <div className="parkings-crud">
          <div className="crud-header">
            <h2 className="section-title">Gestione Prenotazioni</h2>
            <div className="crud-header-actions">
              <select
                className="form-input"
                style={{ minWidth: 200 }}
                value={filterParkingId}
                onChange={e => setFilterParkingId(e.target.value)}
              >
                <option value="all">Tutti i parcheggi</option>
                {parkings.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
              <button className="btn-add" onClick={handleAddBooking}>➕ Nuova Prenotazione</button>
            </div>
          </div>
          <div className="parkings-table">
            <table>
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Parcheggio</th>
                  <th>Targa</th>
                  <th>Inizio</th>
                  <th>Fine</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 && (
                  <tr><td colSpan={7} className="text-center" style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>Nessuna prenotazione trovata</td></tr>
                )}
                {filteredBookings.map(b => (
                  <tr key={b.id}>
                    <td><code style={{ fontSize: '0.85rem' }}>{b.codice_prenotazione}</code></td>
                    <td className="parking-name">{b.parcheggio_nome}</td>
                    <td><strong>{b.targa}</strong></td>
                    <td style={{ fontSize: '0.85rem' }}>{formatDT(b.data_ora_inizio)}</td>
                    <td style={{ fontSize: '0.85rem' }}>{formatDT(b.data_ora_fine)}</td>
                    <td>{statusBadge(b.stato)}</td>
                    <td className="actions">
                      {b.stato === 'attiva' && (
                        <>
                          <button className="btn-edit" onClick={() => handleEditBooking(b)} title="Modifica">✏️</button>
                          <button className="btn-delete" onClick={() => { setBookingToCancel(b); setShowCancelModal(true) }} title="Annulla prenotazione">🚫</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Aggiungi/Modifica Parcheggio */}
      {showParkingModal && (
        <div className="modal-overlay" onClick={() => setShowParkingModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowParkingModal(false)}>✕</button>
            <h2 className="modal-title" style={{ padding: '1.5rem 1.5rem 0' }}>
              {editingParking ? '✏️ Modifica Parcheggio' : '➕ Nuovo Parcheggio'}
            </h2>
            <form onSubmit={handleParkingSubmit} className="parking-form" style={{ padding: '1rem 1.5rem 1.5rem' }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nome *</label>
                  <input type="text" required value={parkingForm.nome} className="form-input"
                    onChange={e => setParkingForm({ ...parkingForm, nome: e.target.value })}
                    placeholder="Parcheggio Centro" />
                </div>
                <div className="form-group">
                  <label>Tipo *</label>
                  <select value={parkingForm.tipo} className="form-input"
                    onChange={e => setParkingForm({ ...parkingForm, tipo: e.target.value })}>
                    <option value="coperto">🏢 Coperto</option>
                    <option value="scoperto">🌤️ Scoperto</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Indirizzo *</label>
                <input type="text" required value={parkingForm.indirizzo} className="form-input"
                  onChange={e => setParkingForm({ ...parkingForm, indirizzo: e.target.value })}
                  placeholder="Via Roma 123, Brescia" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Posti Totali *</label>
                  <input type="number" required min="1" value={parkingForm.capacita_totale} className="form-input"
                    onChange={e => setParkingForm({ ...parkingForm, capacita_totale: parseInt(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Posti Liberi *</label>
                  <input type="number" required min="0" max={parkingForm.capacita_totale} value={parkingForm.posti_liberi} className="form-input"
                    onChange={e => setParkingForm({ ...parkingForm, posti_liberi: parseInt(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Tariffa (€/h) *</label>
                  <input type="number" required min="0" step="0.1" value={parkingForm.tariffa_oraria} className="form-input"
                    onChange={e => setParkingForm({ ...parkingForm, tariffa_oraria: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Latitudine *</label>
                  <input type="number" required step="0.0001" value={parkingForm.lat} className="form-input"
                    onChange={e => setParkingForm({ ...parkingForm, lat: parseFloat(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Longitudine *</label>
                  <input type="number" required step="0.0001" value={parkingForm.lng} className="form-input"
                    onChange={e => setParkingForm({ ...parkingForm, lng: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="form-group">
                <label>Servizi</label>
                <div className="amenities-checkboxes">
                  {SERVIZI.map(s => (
                    <label key={s} className="amenity-checkbox">
                      <input type="checkbox" checked={parkingForm.servizi.includes(s)} onChange={() => toggleServizio(s)} />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowParkingModal(false)} className="btn-cancel">Annulla</button>
                <button type="submit" className="btn-save">
                  {editingParking ? '💾 Salva Modifiche' : '➕ Crea Parcheggio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Conferma Eliminazione Parcheggio */}
      {showDeleteModal && parkingToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <h3 className="modal-title">Elimina Parcheggio</h3>
              <p className="modal-text">Sei sicuro di voler eliminare <strong>{parkingToDelete.nome}</strong>?</p>
              <p className="modal-subtext">Questa azione non può essere annullata.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-modal-cancel" onClick={() => setShowDeleteModal(false)}>Annulla</button>
              <button className="btn-modal-confirm" onClick={handleDeleteParking}>Elimina</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aggiungi/Modifica Prenotazione */}
      {showBookingModal && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowBookingModal(false)}>✕</button>
            <h2 className="modal-title" style={{ padding: '1.5rem 1.5rem 0' }}>
              {editingBooking ? '✏️ Modifica Prenotazione' : '➕ Nuova Prenotazione'}
            </h2>
            <form onSubmit={handleBookingSubmit} className="parking-form" style={{ padding: '1rem 1.5rem 1.5rem' }}>
              {!editingBooking && (
                <div className="form-group">
                  <label>Parcheggio *</label>
                  <select value={bookingForm.parcheggio_id} className={`form-input${bookingFormErrors.parcheggio_id ? ' input-error' : ''}`}
                    onChange={e => setBookingForm({ ...bookingForm, parcheggio_id: e.target.value })}>
                    <option value="">Seleziona parcheggio…</option>
                    {parkings.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} ({p.posti_liberi} posti liberi)</option>
                    ))}
                  </select>
                  {bookingFormErrors.parcheggio_id && <p className="field-error">{bookingFormErrors.parcheggio_id}</p>}
                </div>
              )}
              {!editingBooking && (
                <div className="form-group">
                  <label>ID Utente</label>
                  <input type="text" value={bookingForm.utente_id} className="form-input"
                    placeholder="Lascia vuoto per prenotazione admin"
                    onChange={e => setBookingForm({ ...bookingForm, utente_id: e.target.value })} />
                </div>
              )}
              <div className="form-group">
                <label>Targa *</label>
                <input type="text" value={bookingForm.targa} maxLength={7}
                  className={`form-input${bookingFormErrors.targa ? ' input-error' : ''}`}
                  placeholder="AB123CD"
                  onChange={e => {
                    setBookingForm({ ...bookingForm, targa: e.target.value.toUpperCase() })
                    if (bookingFormErrors.targa) setBookingFormErrors(prev => ({ ...prev, targa: '' }))
                  }} />
                {bookingFormErrors.targa && <p className="field-error">{bookingFormErrors.targa}</p>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Data/ora inizio *</label>
                  <input type="datetime-local" value={bookingForm.data_ora_inizio}
                    className={`form-input${bookingFormErrors.data_ora_inizio ? ' input-error' : ''}`}
                    onChange={e => {
                      setBookingForm({ ...bookingForm, data_ora_inizio: e.target.value })
                      if (bookingFormErrors.data_ora_inizio) setBookingFormErrors(prev => ({ ...prev, data_ora_inizio: '' }))
                    }} />
                  {bookingFormErrors.data_ora_inizio && <p className="field-error">{bookingFormErrors.data_ora_inizio}</p>}
                </div>
                <div className="form-group">
                  <label>Data/ora fine *</label>
                  <input type="datetime-local" value={bookingForm.data_ora_fine}
                    className={`form-input${bookingFormErrors.data_ora_fine ? ' input-error' : ''}`}
                    onChange={e => {
                      setBookingForm({ ...bookingForm, data_ora_fine: e.target.value })
                      if (bookingFormErrors.data_ora_fine) setBookingFormErrors(prev => ({ ...prev, data_ora_fine: '' }))
                    }} />
                  {bookingFormErrors.data_ora_fine && <p className="field-error">{bookingFormErrors.data_ora_fine}</p>}
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowBookingModal(false)} className="btn-cancel">Annulla</button>
                <button type="submit" className="btn-save">
                  {editingBooking ? '💾 Salva Modifiche' : '➕ Crea Prenotazione'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Conferma Annullamento Prenotazione */}
      {showCancelModal && bookingToCancel && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCancelModal(false)}>✕</button>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <h3 className="modal-title">Annulla Prenotazione</h3>
              <p className="modal-text">Annullare la prenotazione <strong>{bookingToCancel.codice_prenotazione}</strong> (targa: {bookingToCancel.targa})?</p>
              <p className="modal-subtext">Il posto libero verrà ripristinato nel parcheggio.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-modal-cancel" onClick={() => setShowCancelModal(false)}>Indietro</button>
              <button className="btn-modal-confirm" onClick={handleConfirmCancel}>Annulla Prenotazione</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
