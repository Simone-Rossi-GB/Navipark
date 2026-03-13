import React, { createContext, useState } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  function login(userData) {
    // Normalizza i campi sia in italiano (backend) che in inglese (legacy)
    const name = userData.nome || userData.name || ''
    setUser({
      id: userData.id,
      name,
      nome: name,
      email: userData.email || '',
      telefono: userData.telefono || '',
      role: userData.role || userData.ruolo || 'User',
      ruolo: userData.ruolo || userData.role || 'User',
    })
  }
  function logout() {
    setUser(null)
  }
  function isAdmin() {
    return user?.role === 'Admin' || user?.ruolo === 'Admin'
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
