import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Login from './pages/Login'
import './App.css'

function AppRoutes({ logged, setLogged }) {
  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={() => setLogged(true)} />} />
      <Route path="/" element={logged ? <Home /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to={logged ? '/' : '/login'} />} />
    </Routes>
  )
}

export default function App() {
  const [logged, setLogged] = useState(false)

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <AppRoutes logged={logged} setLogged={setLogged} />
      </div>
    </BrowserRouter>
  )
}
