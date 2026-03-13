// Service Layer API
// Cambia USE_MOCK a false e imposta API_BASE_URL quando il backend PHP è pronto.
import * as mock from './mockHandlers.js'

const USE_MOCK = true
const API_BASE_URL = 'http://localhost:10080/v1'

// Helper per chiamate reali al backend PHP
async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  })
  return res.json()
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  if (USE_MOCK) return mock.mockLogin(email, password)
  return request('POST', '/auth/login', { email, password })
}

export async function logout(token) {
  if (USE_MOCK) return mock.mockLogout()
  return request('POST', '/auth/logout', null, token)
}

// ── PARCHEGGI ─────────────────────────────────────────────────────────────────

export async function getParcheggi() {
  if (USE_MOCK) return mock.mockGetParcheggi()
  return request('GET', '/parcheggio')
}

export async function getParcheggioById(id) {
  if (USE_MOCK) return mock.mockGetParcheggioById(id)
  return request('GET', `/parcheggio/id/${id}`)
}

export async function createParcheggio(data, token) {
  if (USE_MOCK) return mock.mockCreateParcheggio(data)
  return request('POST', '/parcheggio', data, token)
}

export async function updateParcheggio(id, data, token) {
  if (USE_MOCK) return mock.mockUpdateParcheggio(id, data)
  return request('PUT', `/parcheggio/id/${id}`, data, token)
}

export async function deleteParcheggio(id, token) {
  if (USE_MOCK) return mock.mockDeleteParcheggio(id)
  return request('DELETE', `/parcheggio/id/${id}`, null, token)
}

// ── PRENOTAZIONI ──────────────────────────────────────────────────────────────

export async function getPrenotazioniByUser(userId, token) {
  if (USE_MOCK) return mock.mockGetPrenotazioniByUser(userId)
  return request('GET', `/prenotazione/utente/${userId}`, null, token)
}

export async function getPrenotazioneById(id, token) {
  if (USE_MOCK) return mock.mockGetPrenotazioneById(id)
  return request('GET', `/prenotazione/id/${id}`, null, token)
}

export async function getPrenotazioneByCodice(codice) {
  if (USE_MOCK) return mock.mockGetPrenotazioneByCodice(codice)
  return request('GET', `/prenotazione/codice/${codice}`)
}

export async function createPrenotazione(data, token) {
  if (USE_MOCK) return mock.mockCreatePrenotazione(data)
  return request('POST', '/prenotazione', data, token)
}

export async function cancelPrenotazione(id, token) {
  if (USE_MOCK) return mock.mockCancelPrenotazione(id)
  return request('PATCH', `/prenotazione/id/${id}/annulla`, null, token)
}

export async function updatePrenotazione(id, data, token) {
  if (USE_MOCK) return mock.mockUpdatePrenotazione(id, data)
  return request('PUT', `/prenotazione/id/${id}`, data, token)
}

export async function getAllPrenotazioni(token) {
  if (USE_MOCK) return mock.mockGetAllPrenotazioni()
  return request('GET', '/prenotazione', null, token)
}

export async function getPrenotazioniByParcheggio(parcheggioId, token) {
  if (USE_MOCK) return mock.mockGetPrenotazioniByParcheggio(parcheggioId)
  return request('GET', `/prenotazione/parcheggio/${parcheggioId}`, null, token)
}

export async function adminCreatePrenotazione(data, token) {
  if (USE_MOCK) return mock.mockAdminCreatePrenotazione(data)
  return request('POST', '/prenotazione', data, token)
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────

export async function getAdminStats(token) {
  if (USE_MOCK) return mock.mockGetAdminStats()
  return request('GET', '/admin/stats', null, token)
}

// ── PROFILO ───────────────────────────────────────────────────────────────────

export async function updateProfilo(userId, data, token) {
  if (USE_MOCK) return mock.mockUpdateProfilo(userId, data)
  return request('PUT', `/utente/id/${userId}`, data, token)
}
