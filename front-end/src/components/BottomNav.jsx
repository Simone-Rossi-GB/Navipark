import React from 'react'
import { NavLink } from 'react-router-dom'
import { Map, Compass, Search, User, LayoutDashboard, LogIn } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function BottomNav() {
  const { user, isAdmin } = useAuth()

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-bar">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <Map size={22} strokeWidth={1.75} />
          <span>Mappa</span>
        </NavLink>

        {user && (
          <NavLink to="/navigator" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
            <Compass size={22} strokeWidth={1.75} />
            <span>Navigatore</span>
          </NavLink>
        )}

        <NavLink to="/search" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <Search size={22} strokeWidth={1.75} />
          <span>Cerca</span>
        </NavLink>

        {user ? (
          <NavLink to="/profile" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
            <User size={22} strokeWidth={1.75} />
            <span>Profilo</span>
          </NavLink>
        ) : (
          <NavLink to="/login" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
            <LogIn size={22} strokeWidth={1.75} />
            <span>Accedi</span>
          </NavLink>
        )}

        {user && isAdmin() && (
          <NavLink to="/admin" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={22} strokeWidth={1.75} />
            <span>Admin</span>
          </NavLink>
        )}
      </div>
    </nav>
  )
}
