import React from 'react'
import ParkingCard from './ParkingCard'

export default function ParkingList({ parkings }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {parkings.map((p) => (
        <ParkingCard key={p.id} parking={p} />
      ))}
    </div>
  )
}
