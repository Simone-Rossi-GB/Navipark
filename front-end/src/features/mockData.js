// Mock data centralizzato — struttura allineata allo schema DB PostgreSQL

// ID mock fissi (simulano CHAR(21) del backend)
const MOCK_USER_ID = 'usr_00000000000000001'

export const parkings = [
  {
    id: 'prk_00000000000000001',
    nome: 'Parcheggio Centro',
    indirizzo: 'Piazza della Loggia, Brescia',
    capacita_totale: 100,
    posti_liberi: 25,
    tariffa_oraria: 2.50,
    lat: 45.5397,
    lng: 10.2205,
    tipo: 'coperto',
    servizi: ['videosorveglianza', 'disabili', 'elettrico'],
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400&h=250&fit=crop'
  },
  {
    id: 'prk_00000000000000002',
    nome: 'Parcheggio Stazione',
    indirizzo: 'Viale Venezia, Brescia',
    capacita_totale: 80,
    posti_liberi: 10,
    tariffa_oraria: 3.00,
    lat: 45.5342,
    lng: 10.2136,
    tipo: 'scoperto',
    servizi: ['videosorveglianza', 'h24'],
    image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400&h=250&fit=crop'
  },
  {
    id: 'prk_00000000000000003',
    nome: 'Parcheggio Ospedale',
    indirizzo: 'Via Filippo Turati, Brescia',
    capacita_totale: 50,
    posti_liberi: 15,
    tariffa_oraria: 1.50,
    lat: 45.5412,
    lng: 10.2241,
    tipo: 'coperto',
    servizi: ['disabili', 'custodito'],
    image: 'https://images.unsplash.com/photo-1560179406-67650a0d0de4?w=400&h=250&fit=crop'
  },
  {
    id: 'prk_00000000000000004',
    nome: 'Parcheggio Castello',
    indirizzo: 'Via del Castello, Brescia',
    capacita_totale: 120,
    posti_liberi: 45,
    tariffa_oraria: 2.00,
    lat: 45.5447,
    lng: 10.2156,
    tipo: 'scoperto',
    servizi: ['videosorveglianza', 'moto'],
    image: 'https://images.unsplash.com/photo-1564586895204-f37f73d78d3a?w=400&h=250&fit=crop'
  },
  {
    id: 'prk_00000000000000005',
    nome: 'Parcheggio Arnaldo',
    indirizzo: 'Piazza Arnaldo, Brescia',
    capacita_totale: 60,
    posti_liberi: 5,
    tariffa_oraria: 2.80,
    lat: 45.5385,
    lng: 10.2265,
    tipo: 'coperto',
    servizi: ['videosorveglianza', 'disabili', 'elettrico', 'custodito'],
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400&h=250&fit=crop'
  },
]

// Utente mock — struttura allineata alla tabella `utenti`
export const mockUser = {
  id: MOCK_USER_ID,
  email: 'mario.rossi@email.it',
  nome: 'Mario',
  cognome: 'Rossi',
  telefono: '+39 333 1234567',
  ruolo: 'User',
}

// Helper per generare date relative a oggi
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString()
const daysFromNow = (d) => new Date(Date.now() + d * 86400000).toISOString()
const hoursFromNow = (h) => new Date(Date.now() + h * 3600000).toISOString()
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString()

// Prenotazioni mock — struttura allineata alla tabella `prenotazioni`
export const initialBookings = [
  {
    id: 'bkn_00000000000000001',
    codice_prenotazione: 'A7B2C9D1',
    utente_id: MOCK_USER_ID,
    parcheggio_id: 'prk_00000000000000001',
    parcheggio_nome: 'Parcheggio Centro',
    posto_id: 'posto_A01',
    targa: 'AB123CD',
    data_ora_inizio: hoursFromNow(1),
    data_ora_fine: hoursFromNow(3),
    stato: 'attiva',
    created_at: daysAgo(0),
  },
  {
    id: 'bkn_00000000000000002',
    codice_prenotazione: 'E3F6G8H4',
    utente_id: MOCK_USER_ID,
    parcheggio_id: 'prk_00000000000000002',
    parcheggio_nome: 'Parcheggio Stazione',
    posto_id: 'posto_B12',
    targa: 'XY987ZW',
    data_ora_inizio: daysFromNow(2),
    data_ora_fine: new Date(Date.now() + 2 * 86400000 + 4 * 3600000).toISOString(),
    stato: 'attiva',
    created_at: daysAgo(1),
  },
  {
    id: 'bkn_00000000000000003',
    codice_prenotazione: 'K1L5M0N7',
    utente_id: MOCK_USER_ID,
    parcheggio_id: 'prk_00000000000000003',
    parcheggio_nome: 'Parcheggio Ospedale',
    posto_id: 'posto_C05',
    targa: 'CD456EF',
    data_ora_inizio: daysAgo(3),
    data_ora_fine: new Date(Date.now() - 3 * 86400000 + 2 * 3600000).toISOString(),
    stato: 'completata',
    created_at: daysAgo(4),
  },
  {
    id: 'bkn_00000000000000004',
    codice_prenotazione: 'P2Q4R6S8',
    utente_id: MOCK_USER_ID,
    parcheggio_id: 'prk_00000000000000001',
    parcheggio_nome: 'Parcheggio Centro',
    posto_id: 'posto_A07',
    targa: 'GH789IJ',
    data_ora_inizio: daysAgo(7),
    data_ora_fine: new Date(Date.now() - 7 * 86400000 + 3 * 3600000).toISOString(),
    stato: 'annullata',
    created_at: daysAgo(8),
  },
  {
    id: 'bkn_00000000000000005',
    codice_prenotazione: 'T5U0V3W9',
    utente_id: MOCK_USER_ID,
    parcheggio_id: 'prk_00000000000000004',
    parcheggio_nome: 'Parcheggio Castello',
    posto_id: 'posto_D03',
    targa: 'KL012MN',
    data_ora_inizio: daysAgo(14),
    data_ora_fine: new Date(Date.now() - 14 * 86400000 + 2 * 3600000).toISOString(),
    stato: 'completata',
    created_at: daysAgo(15),
  },
  {
    id: 'bkn_00000000000000006',
    codice_prenotazione: 'X7Y1Z4A0',
    utente_id: MOCK_USER_ID,
    parcheggio_id: 'prk_00000000000000005',
    parcheggio_nome: 'Parcheggio Arnaldo',
    posto_id: 'posto_E11',
    targa: 'OP345QR',
    data_ora_inizio: daysAgo(21),
    data_ora_fine: new Date(Date.now() - 21 * 86400000 + 1.5 * 3600000).toISOString(),
    stato: 'scaduta',
    created_at: daysAgo(22),
  },
  {
    id: 'bkn_00000000000000007',
    codice_prenotazione: 'B8C2D5E3',
    utente_id: MOCK_USER_ID,
    parcheggio_id: 'prk_00000000000000002',
    parcheggio_nome: 'Parcheggio Stazione',
    posto_id: 'posto_B08',
    targa: 'ST678UV',
    data_ora_inizio: daysFromNow(5),
    data_ora_fine: new Date(Date.now() + 5 * 86400000 + 2 * 3600000).toISOString(),
    stato: 'attiva',
    created_at: daysAgo(0),
  },
]

// Statistiche admin mock
export const adminStats = {
  totalBookings: 1247,
  activeBookings: 89,
  totalRevenue: 12450.50,
  co2Saved: 324.5,
  mostUsedParkings: [
    { nome: 'Parcheggio Centro', prenotazioni: 456 },
    { nome: 'Parcheggio Stazione', prenotazioni: 389 },
    { nome: 'Parcheggio Arnaldo', prenotazioni: 245 },
  ]
}
