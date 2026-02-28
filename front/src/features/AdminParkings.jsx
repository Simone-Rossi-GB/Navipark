import React, { useState } from 'react'
import { initialParkings } from './mockData'

export default function AdminParkings() {
  const [parkings, setParkings] = useState(initialParkings)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', address: '', totalSpots: 0, freeSpots: 0, price: 0 })

  function startCreate() {
    setEditing('create')
    setForm({ name: '', address: '', totalSpots: 0, freeSpots: 0, price: 0 })
  }
  function startEdit(p) {
    setEditing(p.id)
    setForm(p)
  }
  function save() {
    if (editing === 'create') {
      setParkings((s) => [{ ...form, id: Date.now() }, ...s])
    } else {
      setParkings((s) => s.map((x) => (x.id === editing ? form : x)))
    }
    setEditing(null)
  }
  function remove(id) {
    setParkings((s) => s.filter((p) => p.id !== id))
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Gestione Parcheggi</h3>
        <button onClick={startCreate} className="bg-green-600 text-white px-3 py-1 rounded">Nuovo</button>
      </div>

      {editing && (
        <div className="border p-3 mb-4">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="w-full p-2 border rounded mb-2" />
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Indirizzo" className="w-full p-2 border rounded mb-2" />
          <input type="number" value={form.totalSpots} onChange={(e) => setForm({ ...form, totalSpots: Number(e.target.value) })} placeholder="Posti totali" className="w-full p-2 border rounded mb-2" />
          <input type="number" value={form.freeSpots} onChange={(e) => setForm({ ...form, freeSpots: Number(e.target.value) })} placeholder="Posti liberi" className="w-full p-2 border rounded mb-2" />
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} placeholder="Prezzo" className="w-full p-2 border rounded mb-2" />
          <div className="flex gap-2">
            <button onClick={save} className="bg-green-600 text-white px-3 py-1 rounded">Salva</button>
            <button onClick={() => setEditing(null)} className="px-3 py-1 border rounded">Annulla</button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {parkings.map((p) => (
          <li key={p.id} className="border p-3 rounded flex justify-between items-center">
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-sm text-gray-600">{p.address}</div>
              <div className="text-sm">{p.freeSpots} / {p.totalSpots} posti liberi</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(p)} className="px-2 py-1 border rounded">Modifica</button>
              <button onClick={() => remove(p.id)} className="px-2 py-1 border rounded">Elimina</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
