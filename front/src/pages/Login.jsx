import React, { useState } from 'react'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [admin, setAdmin] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    onLogin(admin)
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Login</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full p-2 border rounded" />
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full p-2 border rounded" />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={admin} onChange={e => setAdmin(e.target.checked)} />
          Accedi come admin
        </label>
        <button type="submit" className="w-full bg-green-600 text-white p-2 rounded">Accedi</button>
      </form>
    </main>
  )
}
