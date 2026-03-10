import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Mock authentication (sostituire con chiamata API reale)
    if (email && password) {
      login({
        id: Math.random().toString(36).substr(2, 9),
        name: email.split('@')[0],
        email: email,
        role: isAdmin ? 'Admin' : 'User'
      })
      navigate('/')
    } else {
      setError('Inserisci email e password')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">ParcheggioBrescia</h1>
          <p className="login-subtitle">Trova e prenota il tuo parcheggio</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mario.rossi@example.com"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input"
            />
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
            <span>Accedi come amministratore</span>
          </label>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="login-button">
            Accedi
          </button>
        </form>

        <div className="login-footer">
          <p>Demo: usa qualsiasi email/password per accedere</p>
        </div>
      </div>
    </div>
  )
}
