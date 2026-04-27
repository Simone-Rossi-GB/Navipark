import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import { useAuth } from './hooks/useAuth'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Navigator from './pages/Navigator'
import Login from './pages/Login'
import Register from './pages/Register'
import Search from './pages/Search'
import AdminDashboard from './pages/AdminDashboard'
import Profile from './pages/Profile'
import UserBookings from './pages/UserBookings'
import './App.css'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
      {/* Home è PUBBLICA - chiunque può vedere la mappa */}
      <Route path="/" element={<Home />} />
      {/* Search è PUBBLICA - chiunque può cercare una prenotazione */}
      <Route path="/search" element={<Search />} />
      <Route
        path="/navigator"
        element={
          <ProtectedRoute>
              <Navigator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/le-mie-prenotazioni"
        element={
          <ProtectedRoute>
            <UserBookings />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <div className="app-wrapper">
              <Header />
              <AppRoutes />
              <BottomNav />
            </div>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
