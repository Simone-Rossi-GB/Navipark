import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import * as api from '../services/api.js'

export default function Register() {
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', password: '', telefono: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.register(form)
      if (res.success) {
        login(res.data.user, res.data.token)
        navigate('/')
      } else {
        setError(res.message || 'Errore durante la registrazione')
      }
    } catch {
      setError('Errore di connessione al server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Crea account</h1>
          <p className="login-subtitle">Registrati per prenotare i parcheggi</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="nome">Nome</label>
            <input id="nome" name="nome" type="text" required value={form.nome} onChange={handleChange} placeholder="Mario" className="form-input" />
          </div>

          <div className="form-group">
            <label htmlFor="cognome">Cognome</label>
            <input id="cognome" name="cognome" type="text" value={form.cognome} onChange={handleChange} placeholder="Rossi" className="form-input" />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} placeholder="mario.rossi@example.com" className="form-input" />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required value={form.password} onChange={handleChange} placeholder="Minimo 8 caratteri" className="form-input" />
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Telefono <span style={{ fontWeight: 400, opacity: 0.6 }}>(opzionale)</span></label>
            <input id="telefono" name="telefono" type="tel" value={form.telefono} onChange={handleChange} placeholder="+39 333 1234567" className="form-input" />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Registrazione...' : 'Crea account'}
          </button>
        </form>

        <div className="login-footer">
          <p>Hai già un account? <Link to="/login">Accedi</Link></p>
        </div>
      </div>
    </div>
  )
}
