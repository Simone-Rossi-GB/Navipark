import React, { useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Map, Compass, Search, User, LayoutDashboard, LogIn, Ticket } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function BottomNav() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const barRef = useRef(null)
  const [dragIndex, setDragIndex] = useState(null)

  function getItems() {
    const items = [{ to: '/', icon: Map, label: 'Mappa' }]
    if (user) items.push({ to: '/navigator', icon: Compass, label: 'Navigatore' })
    items.push({ to: '/search', icon: Search, label: 'Cerca' })
    if (user) items.push({ to: '/le-mie-prenotazioni', icon: Ticket, label: 'Prenotazioni' })
    if (user) items.push({ to: '/profile', icon: User, label: 'Profilo' })
    else items.push({ to: '/login', icon: LogIn, label: 'Accedi' })
    if (user && isAdmin()) items.push({ to: '/admin', icon: LayoutDashboard, label: 'Admin' })
    return items
  }

  const items = getItems()

  const activeIndex = (() => {
    if (location.pathname === '/') return items.findIndex(i => i.to === '/')
    return items.findIndex(i => i.to !== '/' && location.pathname.startsWith(i.to))
  })()

  const displayIndex = dragIndex !== null ? dragIndex : activeIndex

  function indexFromX(touchX) {
    const bar = barRef.current
    if (!bar) return null
    const els = bar.querySelectorAll('.bottom-nav-item')
    for (let i = 0; i < els.length; i++) {
      const r = els[i].getBoundingClientRect()
      if (touchX >= r.left && touchX <= r.right) return i
    }
    return null
  }

  function handleTouchStart(e) {
    const idx = indexFromX(e.touches[0].clientX)
    if (idx !== null) setDragIndex(idx)
  }

  function handleTouchMove(e) {
    e.preventDefault() // evita scroll della pagina durante il drag
    const idx = indexFromX(e.touches[0].clientX)
    if (idx !== null) setDragIndex(idx)
  }

  function handleTouchEnd() {
    if (dragIndex !== null) {
      navigate(items[dragIndex].to)
    }
    setDragIndex(null)
  }

  return (
    <nav className="bottom-nav">
      <div
        className="bottom-nav-bar"
        ref={barRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {items.map((item, i) => {
          const Icon = item.icon
          return (
            <button
              key={item.to}
              className={`bottom-nav-item${i === displayIndex ? ' active' : ''}`}
              onClick={() => navigate(item.to)}
            >
              <Icon size={22} strokeWidth={1.75} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
