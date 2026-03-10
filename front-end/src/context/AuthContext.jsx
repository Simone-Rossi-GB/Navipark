import React, { createContext, useState } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  function login({ id, name, role }) {
    setUser({ id, name, role })
  }
  function logout() {
    setUser(null)
  }
  function isAdmin() {
    return user?.role === 'Admin'
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
