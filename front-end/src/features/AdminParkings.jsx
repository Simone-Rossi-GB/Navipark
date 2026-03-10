import React from 'react'

const parkings = [
  { id: 1, name: 'Parcheggio Centro', address: 'Piazza della Loggia, Brescia', totalSpots: 100, freeSpots: 25, price: 2.5 },
  { id: 2, name: 'Parcheggio Stazione', address: 'Viale Venezia', totalSpots: 80, freeSpots: 10, price: 3.0 },
  { id: 3, name: 'Parcheggio Ospedale', address: 'Via Filippo Turati', totalSpots: 50, freeSpots: 15, price: 1.5 },
]

export default function AdminParkings() {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-4">Elenco Parcheggi</h3>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Nome</th>
            <th className="p-2 border">Indirizzo</th>
            <th className="p-2 border">Posti Totali</th>
            <th className="p-2 border">Posti Liberi</th>
            <th className="p-2 border">Prezzo (€)</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
