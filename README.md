# Parcheggio

A full-stack web application for managing and navigating public parking in Brescia. Users can browse a map of available parking areas, check availability, and book spots. Administrators can manage parking locations and view usage statistics.

![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat-square&logo=php&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)

---

## Features

- **Interactive parking map** — browse all parking locations in Brescia
- **Parking cards** — view availability, capacity, and details for each lot
- **Filter panel** — filter parking by type, availability, or zone
- **Booking history** — logged-in users can view their past bookings
- **Admin dashboard** — manage parking locations and view statistics
- **Role-based access** — public map view for anyone, booking and admin features require login

---

## Architecture

```
Frontend (React + Vite)
        ↕ REST API
Backend (PHP + Apache / Python)
        ↕
MySQL Database
```

The project is containerized with Docker Compose. A LAMP stack (Linux + Apache + MySQL + PHP) runs the server-side logic, with an additional Python service for extended API functionality.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, React Router, Vite |
| Backend | PHP (Apache), Python |
| Database | MySQL |
| Infrastructure | Docker Compose, Apache reverse proxy |

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js (for the frontend dev server)

### Run the full stack

```bash
# Start backend services (database + PHP + Python)
cd docker_lamp
docker compose up --build

# In a separate terminal, start the frontend
cd front-end
npm install
npm run dev
```

The app is available at `http://localhost:5173` (frontend) and `http://localhost` (backend).

---

## Project context

Personal project — part of the development work behind [Navipark Brescia](https://simoxhomenet.duckdns.org), a self-hosted web app for navigating public parking in Brescia.

**Author:** Simone Rossi
