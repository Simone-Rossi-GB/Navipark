import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [role, setRole] = useState('User')

  function handleSubmit(e) {
    e.preventDefault()
    login({ id: Date.now(), name, role })
    navigate('/')
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Login (mock)</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="w-full p-2 border rounded" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border rounded">
          <option>User</option>
          <option>Admin</option>
        </select>
        <button type="submit" className="w-full bg-green-600 text-white p-2 rounded">Accedi</button>
      </form>
    </main>
  )
}
