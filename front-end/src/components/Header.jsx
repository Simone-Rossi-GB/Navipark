import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Header() {
  const { user, logout, isAdmin } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const navigate = useNavigate()

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
          <Link to="/" className="nav-link">
            <span className="nav-icon">🗺️</span>
            <span>Mappa</span>
          </Link>

          {user && isAdmin() && (
            <Link to="/admin" className="nav-link">
              <span className="nav-icon">📊</span>
              <span>Dashboard</span>
            </Link>
          )}
        </nav>

        {user ? (
          <div className="header-user">
          <button
            className="user-button"
            onClick={() => setShowMenu(!showMenu)}
          >
            <span className="user-avatar">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </span>
            <span className="user-name">{user.name || user.email}</span>
            <span className="user-arrow">▼</span>
          </button>

          {showMenu && (
            <div className="user-menu">
              <Link
                to="/profile"
                className="menu-item"
                onClick={() => setShowMenu(false)}
              >
                <span className="menu-icon">👤</span>
                <span>Il mio profilo</span>
              </Link>
              <button
                className="menu-item"
                onClick={handleLogout}
              >
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
    </header>
  )
}
