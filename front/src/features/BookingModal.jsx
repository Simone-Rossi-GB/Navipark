import React from 'react'

export default function BookingModal({ parking, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2">Prenota - {parking.name}</h3>
        <p className="text-sm text-gray-600 mb-4">Posti liberi: {parking.freeSpots}</p>
        <div className="space-x-2">
          <button className="bg-green-600 text-white px-3 py-1 rounded">Conferma prenotazione</button>
          <button onClick={onClose} className="px-3 py-1 border rounded">Chiudi</button>
        </div>
      </div>
    </div>
  )
}
