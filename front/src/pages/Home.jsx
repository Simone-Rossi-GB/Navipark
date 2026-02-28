import React, { useState } from 'react'

const parkings = [
  { id: 1, name: 'Parcheggio Centro', address: 'Piazza della Loggia, Brescia', totalSpots: 100, freeSpots: 25, price: 2.5 },
  { id: 2, name: 'Parcheggio Stazione', address: 'Viale Venezia', totalSpots: 80, freeSpots: 10, price: 3.0 },
  { id: 3, name: 'Parcheggio Ospedale', address: 'Via Filippo Turati', totalSpots: 50, freeSpots: 15, price: 1.5 },
]

export default function Home() {
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState('')

  function handleBook(parking) {
    setSelected(parking)
    setShowModal(true)
    setMessage('')
  }

  function confirmBooking() {
    setMessage('Prenotazione confermata!')
    setTimeout(() => {
      setShowModal(false)
      setSelected(null)
    }, 1500)
  }

  return (
    <main className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Parcheggi disponibili</h2>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Nome</th>
            <th className="p-2 border">Indirizzo</th>
            <th className="p-2 border">Posti Totali</th>
            <th className="p-2 border">Posti Liberi</th>
            <th className="p-2 border">Prezzo (€)</th>
            <th className="p-2 border">Prenota</th>
          </tr>
        </thead>
        <tbody>
          {parkings.map((p) => (
            <tr key={p.id}>
              <td className="p-2 border">{p.name}</td>
              <td className="p-2 border">{p.address}</td>
              <td className="p-2 border">{p.totalSpots}</td>
              <td className="p-2 border">{p.freeSpots}</td>
              <td className="p-2 border">{p.price}</td>
              <td className="p-2 border">
                <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => handleBook(p)}>Prenota</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showModal && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Prenota - {selected.name}</h3>
            <p className="text-sm text-gray-600 mb-4">Posti liberi: {selected.freeSpots}</p>
            <div className="space-x-2">
              <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={confirmBooking}>Conferma prenotazione</button>
              <button onClick={() => setShowModal(false)} className="px-3 py-1 border rounded">Chiudi</button>
            </div>
            {message && <p className="mt-4 text-green-700 font-semibold">{message}</p>}
          </div>
        </div>
      )}
    </main>
  )
}
