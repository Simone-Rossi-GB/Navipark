import { v4 as uuidv4 } from 'uuid'

export const initialParkings = [
  { id: 1, name: 'Parcheggio Centro', address: 'Piazza della Loggia, Brescia', totalSpots: 100, freeSpots: 25, price: 2.5 },
  { id: 2, name: 'Parcheggio Stazione', address: "Viale Venezia", totalSpots: 80, freeSpots: 10, price: 3.0 },
  { id: 3, name: 'Parcheggio Ospedale', address: "Via Filippo Turati", totalSpots: 50, freeSpots: 15, price: 1.5 },
]

export const initialBookings = [
  { id: 1, userId: 100, parkingId: 1, uniqueCode: uuidv4(), status: 'active', timestamp: Date.now() - 1000 * 60 * 60 * 24 },
]
