import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import * as api from '../services/api'
import {
  User, Mail, Phone, Pencil, Save, X,
  Ticket, Car, CalendarDays, Flag,
  Trash2, LogOut, ParkingSquare, ShieldCheck, Volume2
} from 'lucide-react'

export default function Profile() {
  const { user, logout, token, updateUser } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

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
  const [savingProfile, setSavingProfile] = useState(false)
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('nav_voice') || '')
  const [selectedAzureVoice, setSelectedAzureVoice] = useState(() => localStorage.getItem('nav_azure_voice') || 'it-IT-ElsaNeural')

  useEffect(() => {
    const load = () => {
      const vs = window.speechSynthesis?.getVoices() ?? []
      if (vs.length) setVoices(vs)
    }
    load()
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load
      return () => { window.speechSynthesis.onvoiceschanged = null }
    }
  }, [])

  useEffect(() => {
    if (!user) return
    api.getPrenotazioniByUser(user.id, token).then(res => {
      if (res.success) setBookings(res.data)
      setLoadingBookings(false)
    })
  }, [user])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const res = await api.updateProfilo(user.id, profileData, token)
    setSavingProfile(false)
    if (res.success) {
      updateUser(res.data)
      addToast('Profilo aggiornato con successo', 'success')
      setEditingProfile(false)
    } else {
      addToast('Errore nel salvataggio del profilo', 'error')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
          <p>Devi effettuare il login per vedere il tuo profilo.</p>
        </div>
      </div>
    )
  }

  const activeCount = bookings.filter(b => b.stato === 'attiva').length
  const isAdmin = user.ruolo === 'Admin' || user.role === 'Admin'

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
              {isAdmin
                ? <><ShieldCheck size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />Amministratore</>
                : <><User size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />Utente</>
              }
            </p>
          </div>
          <button className="btn-logout-profile" onClick={handleLogout} title="Esci">
            <LogOut size={18} />
            <span>Esci</span>
          </button>
        </div>

        {/* Informazioni Personali */}
        <div className="profile-section">
          <div className="section-header">
            <h2 className="section-title">
              <User size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Informazioni Personali
            </h2>
            {!editingProfile ? (
              <button className="btn-edit-profile" onClick={() => setEditingProfile(true)}>
                <Pencil size={15} /> Modifica
              </button>
            ) : (
              <div className="edit-actions">
                <button className="btn-cancel-edit" onClick={() => setEditingProfile(false)}>
                  <X size={15} /> Annulla
                </button>
                <button className="btn-save-profile" onClick={handleSaveProfile} disabled={savingProfile}>
                  <Save size={15} /> {savingProfile ? 'Salvataggio...' : 'Salva'}
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
                  <span className="data-label"><User size={14} /> Nome</span>
                  <span className="data-value">{user.nome || user.name}</span>
                </div>
                <div className="data-item">
                  <span className="data-label"><Mail size={14} /> Email</span>
                  <span className="data-value">{user.email}</span>
                </div>
                <div className="data-item">
                  <span className="data-label"><Phone size={14} /> Telefono</span>
                  <span className="data-value">{profileData.telefono || 'Non impostato'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Impostazioni Navigatore */}
        <div className="profile-section">
          <div className="section-header">
            <h2 className="section-title">
              <Volume2 size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Voce Navigatore
            </h2>
          </div>
          {/* Azure Neural voices */}
          <div className="form-group" style={{ maxWidth: 360 }}>
            <label htmlFor="azure-voice-select">Voce Azure Neural (prioritaria)</label>
            <select
              id="azure-voice-select"
              className="form-input"
              value={selectedAzureVoice}
              onChange={e => {
                setSelectedAzureVoice(e.target.value)
                localStorage.setItem('nav_azure_voice', e.target.value)
              }}
            >
              <optgroup label="Femminili">
                <option value="it-IT-ElsaNeural">Elsa (f)</option>
                <option value="it-IT-IsabellaNeural">Isabella (f)</option>
                <option value="it-IT-FabiolaNeural">Fabiola (f)</option>
                <option value="it-IT-FiammaNeural">Fiamma (f)</option>
                <option value="it-IT-ImeldaNeural">Imelda (f)</option>
                <option value="it-IT-IrmaNeural">Irma (f)</option>
                <option value="it-IT-PalmiraNeural">Palmira (f)</option>
                <option value="it-IT-PierinaNeural">Pierina (f)</option>
              </optgroup>
              <optgroup label="Maschili">
                <option value="it-IT-DiegoNeural">Diego (m)</option>
                <option value="it-IT-BenignoNeural">Benigno (m)</option>
                <option value="it-IT-CalimeroNeural">Calimero (m)</option>
                <option value="it-IT-CataldoNeural">Cataldo (m)</option>
                <option value="it-IT-GianniNeural">Gianni (m)</option>
                <option value="it-IT-LisandroNeural">Lisandro (m)</option>
                <option value="it-IT-RinaldoNeural">Rinaldo (m)</option>
              </optgroup>
            </select>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Usata quando Azure Speech è configurato (qualità superiore).
            </p>
            <button
              className="btn-edit-profile"
              style={{ marginTop: '0.5rem' }}
              onClick={async () => {
                const key = import.meta.env.VITE_AZURE_SPEECH_KEY
                const region = import.meta.env.VITE_AZURE_SPEECH_REGION
                if (!key || !region) { alert('Azure Speech non configurato nel .env'); return }
                const res = await fetch(
                  `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
                  {
                    method: 'POST',
                    headers: {
                      'Ocp-Apim-Subscription-Key': key,
                      'Content-Type': 'application/ssml+xml',
                      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'
                    },
                    body: `<speak version='1.0' xml:lang='it-IT'><voice xml:lang='it-IT' name='${selectedAzureVoice}'>Navigazione attivata. Benvenuto su Navipark.</voice></speak>`
                  }
                )
                if (res.ok) {
                  const url = URL.createObjectURL(await res.blob())
                  const audio = new Audio(url)
                  audio.onended = () => URL.revokeObjectURL(url)
                  audio.play()
                } else {
                  alert('Errore Azure: ' + res.status)
                }
              }}
            >
              Ascolta anteprima (Azure)
            </button>
          </div>

          {/* Web Speech API fallback */}
          <div className="form-group" style={{ maxWidth: 360 }}>
            <label htmlFor="voice-select">Voce di sistema (fallback)</label>
            <select
              id="voice-select"
              className="form-input"
              value={selectedVoice}
              onChange={e => {
                setSelectedVoice(e.target.value)
                localStorage.setItem('nav_voice', e.target.value)
              }}
            >
              <option value="">Automatica (migliore disponibile)</option>
              {voices.filter(v => v.lang.startsWith('it')).map(v => (
                <option key={v.name} value={v.name}>{v.name}</option>
              ))}
              {voices.filter(v => !v.lang.startsWith('it')).length > 0 && (
                <optgroup label="Altre lingue">
                  {voices.filter(v => !v.lang.startsWith('it')).map(v => (
                    <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                  ))}
                </optgroup>
              )}
            </select>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Usata solo se Azure non è disponibile. Le voci dipendono dal dispositivo.
            </p>
          </div>

          {selectedVoice && (
            <button
              className="btn-edit-profile"
              style={{ marginTop: '0.25rem' }}
              onClick={() => {
                const synth = window.speechSynthesis
                if (!synth) return
                synth.cancel()
                const u = new SpeechSynthesisUtterance('Navigazione attivata. Benvenuto su Navipark.')
                u.lang = 'it-IT'
                const v = voices.find(x => x.name === selectedVoice)
                if (v) u.voice = v
                setTimeout(() => synth.speak(u), 100)
              }}
            >
              Ascolta anteprima (sistema)
            </button>
          )}
        </div>

        {/* Prenotazioni */}
        <div className="profile-section">
          <div className="section-header">
            <h2 className="section-title">
              <Ticket size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Le Mie Prenotazioni
            </h2>
            <Link to="/le-mie-prenotazioni">
              <button className="btn-edit-profile">
                <Ticket size={15} /> Vai alle prenotazioni
              </button>
            </Link>
          </div>
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
