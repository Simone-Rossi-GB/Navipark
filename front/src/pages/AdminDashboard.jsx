import React from 'react'
import AdminParkings from '../features/AdminParkings'
import AdminStats from '../features/AdminStats'

export default function AdminDashboard() {
  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Admin Dashboard</h2>
      <div className="grid grid-cols-2 gap-6">
        <AdminParkings />
        <AdminStats />
      </div>
    </main>
  )
}
