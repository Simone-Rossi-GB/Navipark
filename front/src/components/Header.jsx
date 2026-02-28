import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="p-4 bg-green-700 text-white flex justify-between items-center">
      <h1 className="text-xl font-bold">Parcheggi Brescia - Green</h1>
      <nav className="space-x-4">
        <Link to="/" className="hover:underline">Home</Link>
        <Link to="/profile" className="hover:underline">Profilo</Link>
        {user?.role === 'Admin' && <Link to="/admin" className="hover:underline">Admin</Link>}
        {user ? (
          <button onClick={logout} className="ml-2 bg-white text-green-700 px-3 py-1 rounded">Logout</button>
        ) : (
          <Link to="/login" className="ml-2 bg-white text-green-700 px-3 py-1 rounded">Login</Link>
        )}
      </nav>
    </header>
  )
}
