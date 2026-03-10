import React from 'react'
import { useAuth } from '../hooks/useAuth'
import BookingHistory from '../features/BookingHistory'

export default function Profile() {
  const { user } = useAuth()

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Profilo</h2>
      {user ? (
        <div className="mb-6">
          <p><strong>Nome:</strong> {user.name}</p>
          <p><strong>Ruolo:</strong> {user.role}</p>
        </div>
      ) : (
        <p>Non sei loggato.</p>
      )}

      <BookingHistory />
    </main>
  )
}
