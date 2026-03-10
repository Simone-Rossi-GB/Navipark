import React, { useState } from 'react'

export default function FilterPanel({ onFilterChange }) {
  const [filters, setFilters] = useState({
    type: 'all',
    priceRange: [0, 5],
    minFreeSpots: 0,
    amenities: []
  })

  const handleTypeChange = (type) => {
    const newFilters = { ...filters, type }
    setFilters(newFilters)
    if (onFilterChange) onFilterChange(newFilters)
  }

  const handlePriceChange = (e) => {
    const maxPrice = parseFloat(e.target.value)
    const newFilters = { ...filters, priceRange: [0, maxPrice] }
    setFilters(newFilters)
    if (onFilterChange) onFilterChange(newFilters)
  }

  const handleMinSpotsChange = (e) => {
    const minFreeSpots = parseInt(e.target.value)
    const newFilters = { ...filters, minFreeSpots }
    setFilters(newFilters)
    if (onFilterChange) onFilterChange(newFilters)
  }

  const toggleAmenity = (amenity) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity]
    const newFilters = { ...filters, amenities: newAmenities }
    setFilters(newFilters)
    if (onFilterChange) onFilterChange(newFilters)
  }

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h2 className="filter-title">ParcheggioBrescia</h2>
      </div>

      {/* Tipo Parcheggio */}
      <div className="filter-section">
        <h3 className="filter-section-title">Tipo Parcheggio</h3>
        <div className="filter-type-grid">
          <button
            className={`type-button ${filters.type === 'all' ? 'active' : ''}`}
            onClick={() => handleTypeChange('all')}
          >
            <span className="type-icon">🅿️</span>
            <span className="type-label">Tutti</span>
          </button>
          <button
            className={`type-button ${filters.type === 'coperto' ? 'active' : ''}`}
            onClick={() => handleTypeChange('coperto')}
          >
            <span className="type-icon">🏢</span>
            <span className="type-label">Coperto</span>
          </button>
          <button
            className={`type-button ${filters.type === 'scoperto' ? 'active' : ''}`}
            onClick={() => handleTypeChange('scoperto')}
          >
            <span className="type-icon">🌤️</span>
            <span className="type-label">Scoperto</span>
          </button>
        </div>
      </div>

      {/* Tariffa */}
      <div className="filter-section">
        <h3 className="filter-section-title">Tariffa Oraria</h3>
        <div className="price-range">
          <span className="price-label">€0 - €{filters.priceRange[1].toFixed(1)}</span>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={filters.priceRange[1]}
            onChange={handlePriceChange}
            className="price-slider"
          />
        </div>
      </div>

      {/* Posti Liberi Minimi */}
      <div className="filter-section">
        <h3 className="filter-section-title">Posti Liberi Minimi</h3>
        <div className="spots-selector">
          {[0, 5, 10, 20, 30].map((num) => (
            <button
              key={num}
              className={`spot-button ${filters.minFreeSpots === num ? 'active' : ''}`}
              onClick={() => handleMinSpotsChange({ target: { value: num } })}
            >
              {num === 0 ? 'Tutti' : `${num}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Servizi */}
      <div className="filter-section">
        <h3 className="filter-section-title">Servizi</h3>
        <div className="amenities-list">
          <label className="amenity-checkbox">
            <input
              type="checkbox"
              checked={filters.amenities.includes('videosorveglianza')}
              onChange={() => toggleAmenity('videosorveglianza')}
            />
            <span className="amenity-icon">📹</span>
            <span>Videosorveglianza</span>
          </label>
          <label className="amenity-checkbox">
            <input
              type="checkbox"
              checked={filters.amenities.includes('disabili')}
              onChange={() => toggleAmenity('disabili')}
            />
            <span className="amenity-icon">♿</span>
            <span>Posto disabili</span>
          </label>
          <label className="amenity-checkbox">
            <input
              type="checkbox"
              checked={filters.amenities.includes('elettrico')}
              onChange={() => toggleAmenity('elettrico')}
            />
            <span className="amenity-icon">⚡</span>
            <span>Ricarica elettrica</span>
          </label>
          <label className="amenity-checkbox">
            <input
              type="checkbox"
              checked={filters.amenities.includes('custodito')}
              onChange={() => toggleAmenity('custodito')}
            />
            <span className="amenity-icon">🔒</span>
            <span>Custodito</span>
          </label>
          <label className="amenity-checkbox">
            <input
              type="checkbox"
              checked={filters.amenities.includes('moto')}
              onChange={() => toggleAmenity('moto')}
            />
            <span className="amenity-icon">🏍️</span>
            <span>Posto moto</span>
          </label>
        </div>
      </div>

      {/* Reset filtri */}
      <button
        className="reset-button"
        onClick={() => {
          const resetFilters = {
            type: 'all',
            priceRange: [0, 5],
            minFreeSpots: 0,
            amenities: []
          }
          setFilters(resetFilters)
          if (onFilterChange) onFilterChange(resetFilters)
        }}
      >
        Resetta filtri
      </button>
    </div>
  )
}
