import React, { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import * as api from '../services/api'

export default function Header() {
  const { user, logout, isAdmin } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [activeBookings, setActiveBookings] = useState(0)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  const navigate = useNavigate()
  const menuRef = useRef(null)

  // Carica conteggio prenotazioni attive
  useEffect(() => {
    if (!user) { setActiveBookings(0); return }
    api.getPrenotazioniByUser(user.id).then(res => {
      if (res.success) {
        setActiveBookings(res.data.filter(b => b.stato === 'attiva').length)
      }
    })
  }, [user])

  // Applica/rimuovi dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Chiudi menu cliccando fuori
  useEffect(() => {
    if (!showMenu) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="header-logo">
          <span className="logo-icon">🅿️</span>
          <span className="logo-text">ParcheggioBrescia</span>
        </Link>

        <nav className="header-nav">
          <NavLink to="/" end className="nav-link">
            <span className="nav-icon">🗺️</span>
            <span>Mappa</span>
          </NavLink>
          <NavLink to="/search" className="nav-link">
            <span className="nav-icon">🔍️</span>
            <span>Cerca prenotazione</span>
          </NavLink>
          {user && isAdmin() && (
            <NavLink to="/admin" className="nav-link">
              <span className="nav-icon">📊</span>
              <span>Dashboard</span>
            </NavLink>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Toggle Dark Mode */}
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Passa alla modalità chiara' : 'Passa alla modalità scura'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {user ? (
            <div className="header-user" ref={menuRef}>
              <button className="user-button" onClick={() => setShowMenu(!showMenu)}>
                <div className="user-avatar-wrapper">
                  <span className="user-avatar">
                    {(user.nome || user.name || 'U')[0].toUpperCase()}
                  </span>
                  {activeBookings > 0 && (
                    <span className="booking-badge">{activeBookings}</span>
                  )}
                </div>
                <span className="user-name">{user.nome || user.name || user.email}</span>
                <span className="user-arrow">▼</span>
              </button>

              {showMenu && (
                <div className="user-menu">
                  <Link to="/profile" className="menu-item" onClick={() => setShowMenu(false)}>
                    <span className="menu-icon">👤</span>
                    <span>Il mio profilo</span>
                    {activeBookings > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', background: '#ef4444', color: 'white', borderRadius: '9999px', padding: '1px 7px', fontWeight: 700 }}>
                        {activeBookings}
                      </span>
                    )}
                  </Link>
                  <button className="menu-item" onClick={handleLogout}>
                    <span className="menu-icon">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="login-link">
              <span className="login-icon">🔐</span>
              <span>Accedi</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
