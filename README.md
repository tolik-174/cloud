# MotoCross Event Hub

MotoCross Event Hub is a containerized web application for browsing motocross events and reserving tickets with seat selection.

The project demonstrates the design and deployment of a multi-service application using Docker, with clearly separated frontend, backend, and database services.

The system supports user authentication, ticket reservations, and persistent data storage.

---

# Application Architecture

The application consists of three main services:

Frontend (FE)  
Backend (BE)  
Database (DB)

```
Browser
   │
   │ HTTP
   ▼
Frontend (Nginx)
   │
   │ Docker Network (FE → BE)
   ▼
Backend (FastAPI)
   │
   │ Docker Network (BE → DB)
   ▼
PostgreSQL Database
```

Each component runs inside its own Docker container and communicates only with the services it requires.

---

# Technologies Used

## Frontend
- HTML
- CSS
- JavaScript
- Nginx

The frontend is a static web application served by an Nginx container.  
It communicates with the backend exclusively via HTTP REST API.

---

## Backend
- Python
- FastAPI
- SQLAlchemy
- JWT Authentication
- Passlib (bcrypt)

The backend implements the application logic and exposes a REST API.

Features:
- user registration
- login with JWT authentication
- password hashing
- CRUD operations for reservations
- seat reservation validation

---

## Database
- PostgreSQL

PostgreSQL is used as the persistent data storage for users, events, and reservations.

---

# Docker Architecture

The application is fully containerized using Docker Compose.

Each service runs in its own container:

| Service | Container | Description |
|-------|--------|-------------|
Frontend | motocross-frontend | Serves static website via Nginx |
Backend | motocross-backend | FastAPI REST API |
Database | motocross-db | PostgreSQL database |

---

# Docker Networks

Two separate Docker networks are used to control communication between services.

### FE → BE network

```
motocross-event_fe_be_net
```

Used for communication between:

Frontend  
Backend

The database is **not accessible** from this network.

---

### BE → DB network

```
motocross-event_be_db_net
```

Used for communication between:

Backend  
Database

Frontend cannot access the database directly.

---

# Persistent Storage

The database uses a Docker named volume:

```
motocross-event_postgres_data
```

This volume stores PostgreSQL data and ensures that all data persists even if containers are restarted.

Example test performed:

```
docker restart motocross-db
```

After restart, all reservations and users remain stored in the database.

---

# Environment Configuration

Sensitive configuration values are not hardcoded in the source code.

Instead they are provided using environment variables.

Example configuration:

```
POSTGRES_DB=motodb
POSTGRES_USER=motouser
POSTGRES_PASSWORD=motopassword

DATABASE_URL=postgresql://motouser:motopassword@db:5432/motodb

JWT_SECRET=super_secret_key_change_me
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

This allows the application to be easily configured and securely deployed.

---

# Software Versions

The following versions were selected because they are stable, actively maintained, and officially supported.

### Python

```
python:3.12-slim
```

Python 3.12 is the latest stable version and fully supported by FastAPI.

The `slim` variant is used to reduce image size and improve container startup performance.

---

### PostgreSQL

```
postgres:17-alpine
```

PostgreSQL 17 is the current major release with long-term support and improved performance.

The `alpine` version provides a lightweight container while maintaining full database functionality.

---

### Nginx

```
nginx:1.28-alpine
```

Nginx is a reliable and high-performance web server widely used for serving static content.

The Alpine-based image is lightweight and well-suited for containerized environments.

---

# Authentication

User authentication is implemented using JWT tokens.

Workflow:

1. User registers via `/auth/register`
2. Password is hashed using bcrypt
3. User logs in via `/auth/login`
4. Backend returns JWT token
5. Token is stored in the browser
6. All authenticated requests include the token in the Authorization header

Passwords are **never stored in plain text**.

---

# CRUD Functionality

The application implements full CRUD operations for reservations.

| Operation | Endpoint |
|----------|-----------|
Create | POST /reservations |
Read | GET /reservations |
Update | PUT/PATCH /reservations/{id} |
Delete | DELETE /reservations/{id} |

---

# Application Features

The system allows users to:

- register an account
- log in securely
- browse motocross events
- choose seats for events
- reserve tickets
- view existing reservations
- cancel reservations

---

# Running the Application

The entire application can be started with a single command.

### Start the application

```
./start-app.sh
```

or

```
docker compose up --build -d
```

---

### Stop the application

```
./end-app.sh
```

or

```
docker compose down
```

---

# Accessing the Application

Frontend:

```
http://localhost:8080
```

Backend API documentation:

```
http://localhost:8000/docs
```

---

# Project Structure

```
motocross-event/
│
├── backend/
│   ├── app/
│   │   ├── models.py
│   │   ├── routes/
│   │   ├── auth.py
│   │   └── main.py
│   │
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── css/
│   ├── js/
│   ├── index.html
│   ├── login.html
│   ├── reservations.html
│   └── Dockerfile
│
├── docker-compose.yml
├── start-app.sh
├── end-app.sh
└── README.md
```

---

# Goal of the Project

The goal of this project is to demonstrate the ability to:

- design a multi-service web application
- containerize services using Docker
- configure network isolation
- implement persistent storage
- provide reproducible deployment using Docker Compose

The application architecture follows best practices for containerized systems with clearly separated services and controlled communication between them.