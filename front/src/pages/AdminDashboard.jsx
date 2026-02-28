import React from 'react'
import AdminParkings from '../features/AdminParkings'

export default function AdminDashboard() {
  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Admin Dashboard</h2>
      <AdminParkings />
    </main>
  )
}
