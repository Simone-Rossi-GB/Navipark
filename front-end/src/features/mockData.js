import { v4 as uuidv4 } from 'uuid'

// Mock data centralizzato per i parcheggi di Brescia
export const parkings = [
  {
    id: 1,
    name: 'Parcheggio Centro',
    address: 'Piazza della Loggia, Brescia',
    totalSpots: 100,
    freeSpots: 25,
    price: 2.5,
    lat: 45.5397,
    lng: 10.2205,
    type: 'coperto',
    amenities: ['videosorveglianza', 'disabili', 'elettrico'],
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400&h=250&fit=crop'
  },
  {
    id: 2,
    name: 'Parcheggio Stazione',
    address: 'Viale Venezia, Brescia',
    totalSpots: 80,
    freeSpots: 10,
    price: 3.0,
    lat: 45.5342,
    lng: 10.2136,
    type: 'scoperto',
    amenities: ['videosorveglianza', 'h24'],
    image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400&h=250&fit=crop'
  },
  {
    id: 3,
    name: 'Parcheggio Ospedale',
    address: 'Via Filippo Turati, Brescia',
    totalSpots: 50,
    freeSpots: 15,
    price: 1.5,
    lat: 45.5412,
    lng: 10.2241,
    type: 'coperto',
    amenities: ['disabili', 'custodito'],
    image: 'https://images.unsplash.com/photo-1560179406-67650a0d0de4?w=400&h=250&fit=crop'
  },
  {
    id: 4,
    name: 'Parcheggio Castello',
    address: 'Via del Castello, Brescia',
    totalSpots: 120,
    freeSpots: 45,
    price: 2.0,
    lat: 45.5447,
    lng: 10.2156,
    type: 'scoperto',
    amenities: ['videosorveglianza', 'moto'],
    image: 'https://images.unsplash.com/photo-1564586895204-f37f73d78d3a?w=400&h=250&fit=crop'
  },
  {
    id: 5,
    name: 'Parcheggio Arnaldo',
    address: 'Piazza Arnaldo, Brescia',
    totalSpots: 60,
    freeSpots: 5,
    price: 2.8,
    lat: 45.5385,
    lng: 10.2265,
    type: 'coperto',
    amenities: ['videosorveglianza', 'disabili', 'elettrico', 'custodito'],
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400&h=250&fit=crop'
  },
]

export const initialBookings = [
  {
    id: 1,
    userId: 100,
    parkingId: 1,
    parkingName: 'Parcheggio Centro',
    uniqueCode: uuidv4(),
    status: 'active',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    licensePlate: 'AB123CD',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  },
]

// Statistiche admin mock
export const adminStats = {
  totalBookings: 1247,
  activeBookings: 89,
  totalRevenue: 12450.50,
  co2Saved: 324.5, // kg
  mostUsedParkings: [
    { name: 'Parcheggio Centro', bookings: 456 },
    { name: 'Parcheggio Stazione', bookings: 389 },
    { name: 'Parcheggio Arnaldo', bookings: 245 },
  ]
}
