import React, { useState } from 'react'

export default function ParkingCard({ parking }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border p-4 rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold">{parking.name}</h3>
      <p className="text-sm text-gray-600">{parking.address}</p>
      <p className="mt-2">Posti liberi: <strong>{parking.freeSpots}</strong> / {parking.totalSpots}</p>
      <p>Prezzo: €{parking.price}</p>
      <div className="mt-4">
        <button onClick={() => setOpen(true)} className="bg-green-600 text-white px-3 py-1 rounded">Prenota</button>
      </div>
      {/* Solo UI, nessuna logica backend */}
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Prenota - {parking.name}</h3>
            <p className="text-sm text-gray-600 mb-4">Posti liberi: {parking.freeSpots}</p>
            <div className="space-x-2">
              <button className="bg-green-600 text-white px-3 py-1 rounded">Conferma prenotazione</button>
              <button onClick={() => setOpen(false)} className="px-3 py-1 border rounded">Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
