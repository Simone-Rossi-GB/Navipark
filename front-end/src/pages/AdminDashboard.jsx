import React, { useState } from 'react'
import { parkings as initialParkings, adminStats } from '../features/mockData'
import { v4 as uuidv4 } from 'uuid'

export default function AdminDashboard() {
  const [parkings, setParkings] = useState(initialParkings)
  const [showModal, setShowModal] = useState(false)
  const [editingParking, setEditingParking] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    totalSpots: 50,
    freeSpots: 50,
    price: 2.0,
    type: 'scoperto',
    lat: 45.5397,
    lng: 10.2205,
    amenities: []
  })

  const handleAddNew = () => {
    setEditingParking(null)
    setFormData({
      name: '',
      address: '',
      totalSpots: 50,
      freeSpots: 50,
      price: 2.0,
      type: 'scoperto',
      lat: 45.5397,
      lng: 10.2205,
      amenities: []
    })
    setShowModal(true)
  }

  const handleEdit = (parking) => {
    setEditingParking(parking)
    setFormData({
      name: parking.name,
      address: parking.address,
      totalSpots: parking.totalSpots,
      freeSpots: parking.freeSpots,
      price: parking.price,
      type: parking.type,
      lat: parking.lat,
      lng: parking.lng,
      amenities: parking.amenities || []
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questo parcheggio?')) {
      setParkings(parkings.filter((p) => p.id !== id))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (editingParking) {
      // Update
      setParkings(
        parkings.map((p) =>
          p.id === editingParking.id ? { ...p, ...formData } : p
        )
      )
    } else {
      // Create new
      const newParking = {
        id: parkings.length + 1,
        ...formData,
        image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400&h=250&fit=crop'
      }
      setParkings([...parkings, newParking])
    }

    setShowModal(false)
  }

  const toggleAmenity = (amenity) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.includes(amenity)
        ? formData.amenities.filter((a) => a !== amenity)
        : [...formData.amenities, amenity]
    })
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1 className="admin-title">📊 Dashboard Amministratore</h1>
        <p className="admin-subtitle">Gestisci parcheggi e visualizza statistiche</p>
      </div>

      {/* Statistiche */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">{adminStats.totalBookings}</div>
            <div className="stat-label">Prenotazioni Totali</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{adminStats.activeBookings}</div>
            <div className="stat-label">Prenotazioni Attive</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">€{adminStats.totalRevenue.toLocaleString()}</div>
            <div className="stat-label">Ricavi Totali</div>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">🌱</div>
          <div className="stat-content">
            <div className="stat-value">{adminStats.co2Saved} kg</div>
            <div className="stat-label">CO₂ Risparmiata</div>
          </div>
        </div>
      </div>

      {/* Parcheggi più utilizzati */}
      <div className="top-parkings">
        <h2 className="section-title">🏆 Parcheggi Più Utilizzati</h2>
        <div className="top-list">
          {adminStats.mostUsedParkings.map((p, index) => (
            <div key={index} className="top-item">
              <span className="top-rank">#{index + 1}</span>
              <span className="top-name">{p.name}</span>
              <span className="top-count">{p.bookings} prenotazioni</span>
            </div>
          ))}
        </div>
      </div>

      {/* CRUD Parcheggi */}
      <div className="parkings-crud">
        <div className="crud-header">
          <h2 className="section-title">🅿️ Gestione Parcheggi</h2>
          <button className="btn-add" onClick={handleAddNew}>
            ➕ Aggiungi Parcheggio
          </button>
        </div>

        <div className="parkings-table">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Indirizzo</th>
                <th>Tipo</th>
                <th>Posti Totali</th>
                <th>Posti Liberi</th>
                <th>Tariffa</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {parkings.map((parking) => (
                <tr key={parking.id}>
                  <td className="parking-name">{parking.name}</td>
                  <td className="parking-address">{parking.address}</td>
                  <td>
                    <span className={`type-badge ${parking.type}`}>
                      {parking.type === 'coperto' ? '🏢 Coperto' : '🌤️ Scoperto'}
                    </span>
                  </td>
                  <td className="text-center">{parking.totalSpots}</td>
                  <td className="text-center">
                    <span className={parking.freeSpots < 10 ? 'text-red' : 'text-green'}>
                      {parking.freeSpots}
                    </span>
                  </td>
                  <td>€{parking.price}/h</td>
                  <td className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(parking)}
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(parking.id)}
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Aggiungi/Modifica */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              ✕
            </button>

            <h2 className="modal-title">
              {editingParking ? '✏️ Modifica Parcheggio' : '➕ Nuovo Parcheggio'}
            </h2>

            <form onSubmit={handleSubmit} className="parking-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nome Parcheggio *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                    placeholder="Parcheggio Centro"
                  />
                </div>

                <div className="form-group">
                  <label>Tipo *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="form-input"
                  >
                    <option value="coperto">🏢 Coperto</option>
                    <option value="scoperto">🌤️ Scoperto</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Indirizzo *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="form-input"
                  placeholder="Via Roma 123, Brescia"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Posti Totali *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.totalSpots}
                    onChange={(e) =>
                      setFormData({ ...formData, totalSpots: parseInt(e.target.value) })
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Posti Liberi *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max={formData.totalSpots}
                    value={formData.freeSpots}
                    onChange={(e) =>
                      setFormData({ ...formData, freeSpots: parseInt(e.target.value) })
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Tariffa Oraria (€) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseFloat(e.target.value) })
                    }
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitudine *</label>
                  <input
                    type="number"
                    required
                    step="0.0001"
                    value={formData.lat}
                    onChange={(e) =>
                      setFormData({ ...formData, lat: parseFloat(e.target.value) })
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Longitudine *</label>
                  <input
                    type="number"
                    required
                    step="0.0001"
                    value={formData.lng}
                    onChange={(e) =>
                      setFormData({ ...formData, lng: parseFloat(e.target.value) })
                    }
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Servizi</label>
                <div className="amenities-checkboxes">
                  {['videosorveglianza', 'disabili', 'elettrico', 'custodito', 'moto', 'h24'].map(
                    (amenity) => (
                      <label key={amenity} className="amenity-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.amenities.includes(amenity)}
                          onChange={() => toggleAmenity(amenity)}
                        />
                        <span>{amenity}</span>
                      </label>
                    )
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  Annulla
                </button>
                <button type="submit" className="btn-save">
                  {editingParking ? '💾 Salva Modifiche' : '➕ Crea Parcheggio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
