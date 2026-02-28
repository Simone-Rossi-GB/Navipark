import React, { useState } from 'react'
import { initialBookings } from './mockData'

export default function BookingHistory() {
  const [bookings, setBookings] = useState(initialBookings)

  function cancel(id) {
    setBookings((b) => b.map((item) => (item.id === id ? { ...item, status: 'cancelled' } : item)))
  }

  return (
    <section>
      <h3 className="text-xl font-semibold mb-2">Storico prenotazioni</h3>
      <ul className="space-y-2">
        {bookings.map((bk) => (
          <li key={bk.id} className="border p-3 rounded bg-white flex justify-between items-center">
            <div>
              <div><strong>Codice:</strong> {bk.uniqueCode}</div>
              <div className="text-sm text-gray-600">Stato: {bk.status}</div>
            </div>
            <div>
              {bk.status === 'active' && <button onClick={() => cancel(bk.id)} className="px-2 py-1 border rounded">Annulla</button>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
