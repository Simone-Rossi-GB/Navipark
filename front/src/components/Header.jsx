import React from 'react'
import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="p-4 bg-green-700 text-white flex justify-between items-center">
      <h1 className="text-xl font-bold">Parcheggi Brescia</h1>
      <nav className="space-x-4">
        <Link to="/">Home</Link>
        <Link to="/admin">Admin</Link>
      </nav>
    </header>
  )
}
