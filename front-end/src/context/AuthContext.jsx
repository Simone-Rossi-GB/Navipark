import React, { createContext, useState } from 'react'

const AuthContext = createContext()

function loadFromStorage() {
  try {
    const user = JSON.parse(localStorage.getItem('auth_user'))
    const token = localStorage.getItem('auth_token')
    return { user, token }
  } catch {
    return { user: null, token: null }
  }
}

export function AuthProvider({ children }) {
  const stored = loadFromStorage()
  const [user, setUser] = useState(stored.user)
  const [token, setToken] = useState(stored.token)

  function login(userData, authToken) {
    const name = userData.nome || userData.name || ''
    const u = {
      id: userData.id,
      name,
      nome: name,
      email: userData.email || '',
      telefono: userData.telefono || '',
      ruolo: userData.ruolo || userData.role || 'User',
    }
    setUser(u)
    setToken(authToken)
    localStorage.setItem('auth_user', JSON.stringify(u))
    localStorage.setItem('auth_token', authToken)
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_token')
  }

  function isAdmin() {
    return user?.role === 'Admin' || user?.ruolo === 'Admin'
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
