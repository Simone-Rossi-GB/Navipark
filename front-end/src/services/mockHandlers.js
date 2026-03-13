// Mock handlers — simulano le risposte del backend PHP
// Formato risposta identico al backend: { success, code, message, data }
import {
  parkings as mockParkings,
  initialBookings,
  mockUser,
  adminStats,
} from '../features/mockData.js'

// Stato locale mutabile per simulare il DB durante la sessione
let _parkings = mockParkings.map(p => ({ ...p }))
let _bookings = initialBookings.map(b => ({ ...b }))

const ok = (data) => ({ success: true, code: 'OK', message: 'Successo', data })
const err = (code, message) => ({ success: false, code, message, data: null })

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms))

// ── AUTH ──────────────────────────────────────────────────────────────────────

export async function mockLogin(email, password) {
  await delay()
  if (!email || !password) return err('VALIDATION_REQUEST_FAILED', 'Email e password obbligatorie')
  const nome = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').trim() || 'Utente'
  return ok({
    user: { ...mockUser, email, nome },
    token: 'mock-token-' + Date.now(),
  })
}

export async function mockLogout() {
  await delay(100)
  return ok(null)
}

// ── PARCHEGGI ─────────────────────────────────────────────────────────────────

export async function mockGetParcheggi() {
  await delay()
  return ok(_parkings)
}

export async function mockGetParcheggioById(id) {
  await delay()
  const p = _parkings.find(p => p.id === id)
  if (!p) return err('NOT_FOUND', 'Parcheggio non trovato')
  return ok(p)
}

export async function mockCreateParcheggio(data) {
  await delay()
  const newP = { ...data, id: 'prk_' + Date.now() }
  _parkings.push(newP)
  return ok(newP)
}

export async function mockUpdateParcheggio(id, data) {
  await delay()
  const idx = _parkings.findIndex(p => p.id === id)
  if (idx === -1) return err('NOT_FOUND', 'Parcheggio non trovato')
  _parkings[idx] = { ..._parkings[idx], ...data }
  return ok(_parkings[idx])
}

export async function mockDeleteParcheggio(id) {
  await delay()
  const idx = _parkings.findIndex(p => p.id === id)
  if (idx === -1) return err('NOT_FOUND', 'Parcheggio non trovato')
  _parkings.splice(idx, 1)
  return ok(null)
}

// ── PRENOTAZIONI ──────────────────────────────────────────────────────────────

export async function mockGetPrenotazioniByUser(userId) {
  await delay()
  const bookings = _bookings.filter(b => b.utente_id === userId)
  return ok(bookings)
}

export async function mockGetPrenotazioneById(id) {
  await delay()
  const b = _bookings.find(b => b.id === id)
  if (!b) return err('NOT_FOUND', 'Prenotazione non trovata')
  return ok(b)
}

export async function mockGetPrenotazioneByCodice(codice) {
  await delay(500)
  const b = _bookings.find(b => b.codice_prenotazione.toLowerCase() === codice.toLowerCase())
  if (!b) return err('NOT_FOUND', 'Nessuna prenotazione trovata con questo codice')
  return ok(b)
}

export async function mockCreatePrenotazione(data) {
  await delay()
  // Diminuisce posti liberi nel parcheggio
  const pIdx = _parkings.findIndex(p => p.id === data.parcheggio_id)
  if (pIdx !== -1 && _parkings[pIdx].posti_liberi > 0) {
    _parkings[pIdx].posti_liberi -= 1
  }
  const newB = {
    id: 'bkn_' + Date.now(),
    codice_prenotazione: data.codice_prenotazione,
    utente_id: data.utente_id,
    parcheggio_id: data.parcheggio_id,
    parcheggio_nome: data.parcheggio_nome,
    posto_id: null,
    targa: data.targa,
    data_ora_inizio: data.data_ora_inizio,
    data_ora_fine: data.data_ora_fine,
    stato: 'attiva',
    created_at: new Date().toISOString(),
  }
  _bookings.push(newB)
  return ok(newB)
}

export async function mockCancelPrenotazione(id) {
  await delay()
  const idx = _bookings.findIndex(b => b.id === id)
  if (idx === -1) return err('NOT_FOUND', 'Prenotazione non trovata')
  if (_bookings[idx].stato !== 'attiva') return err('INVALID_STATE', 'Solo le prenotazioni attive possono essere annullate')
  // Ripristina posti liberi
  const pIdx = _parkings.findIndex(p => p.id === _bookings[idx].parcheggio_id)
  if (pIdx !== -1) _parkings[pIdx].posti_liberi += 1
  _bookings[idx] = { ..._bookings[idx], stato: 'annullata' }
  return ok(_bookings[idx])
}

export async function mockUpdatePrenotazione(id, data) {
  await delay()
  const idx = _bookings.findIndex(b => b.id === id)
  if (idx === -1) return err('NOT_FOUND', 'Prenotazione non trovata')
  if (_bookings[idx].stato !== 'attiva') return err('INVALID_STATE', 'Solo le prenotazioni attive possono essere modificate')
  _bookings[idx] = { ..._bookings[idx], ...data }
  return ok(_bookings[idx])
}

// ── ADMIN PRENOTAZIONI ────────────────────────────────────────────────────────

export async function mockGetAllPrenotazioni() {
  await delay()
  return ok([..._bookings])
}

export async function mockGetPrenotazioniByParcheggio(parcheggioId) {
  await delay()
  return ok(_bookings.filter(b => b.parcheggio_id === parcheggioId))
}

export async function mockAdminCreatePrenotazione(data) {
  await delay()
  const pIdx = _parkings.findIndex(p => p.id === data.parcheggio_id)
  if (pIdx !== -1 && _parkings[pIdx].posti_liberi > 0) {
    _parkings[pIdx].posti_liberi -= 1
  }
  const newB = {
    id: 'bkn_admin_' + Date.now(),
    codice_prenotazione: data.codice_prenotazione,
    utente_id: data.utente_id || 'admin',
    parcheggio_id: data.parcheggio_id,
    parcheggio_nome: data.parcheggio_nome,
    posto_id: null,
    targa: data.targa,
    data_ora_inizio: data.data_ora_inizio,
    data_ora_fine: data.data_ora_fine,
    stato: 'attiva',
    created_at: new Date().toISOString(),
  }
  _bookings.push(newB)
  return ok(newB)
}

// ── ADMIN STATS ───────────────────────────────────────────────────────────────

export async function mockGetAdminStats() {
  await delay()
  return ok({
    ...adminStats,
    activeBookings: _bookings.filter(b => b.stato === 'attiva').length,
  })
}

// ── PROFILO ───────────────────────────────────────────────────────────────────

export async function mockUpdateProfilo(userId, data) {
  await delay()
  return ok({ ...mockUser, ...data })
}
