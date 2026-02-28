import React from 'react'
import ParkingList from '../features/ParkingList'

const parkings = [
  { id: 1, name: 'Parcheggio Centro', address: 'Piazza della Loggia, Brescia', totalSpots: 100, freeSpots: 25, price: 2.5 },
  { id: 2, name: 'Parcheggio Stazione', address: "Viale Venezia", totalSpots: 80, freeSpots: 10, price: 3.0 },
  { id: 3, name: 'Parcheggio Ospedale', address: "Via Filippo Turati", totalSpots: 50, freeSpots: 15, price: 1.5 },
]

export default function Home() {
  return (
    <main className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Parcheggi disponibili</h2>
      <ParkingList parkings={parkings} />
    </main>
  )
}
