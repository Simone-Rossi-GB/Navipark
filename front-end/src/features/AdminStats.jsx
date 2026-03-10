import React from 'react'
import { initialParkings, initialBookings } from './mockData'

function computeCO2(bookingsCount) {
  // semplice stima: 120 g CO2 per km, risparmio ipotetico 2 km per parcheggio condiviso -> 0.24 kg
  // moltiplichiamo per bookings
  return (bookingsCount * 0.24).toFixed(2)
}

export default function AdminStats() {
  const bookingsCount = initialBookings.length
  const mostUsed = initialParkings.reduce((a, b) => (a.freeSpots < b.freeSpots ? a : b))

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-2">Statistiche</h3>
      <div className="space-y-2">
        <div>Numero prenotazioni: <strong>{bookingsCount}</strong></div>
        <div>Parcheggio più usato: <strong>{mostUsed.name}</strong></div>
        <div>CO2 risparmiata (kg): <strong>{computeCO2(bookingsCount)}</strong></div>
      </div>
    </div>
  )
}
