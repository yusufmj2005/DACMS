# DACMS — Data Access Control Management System

**Assignment ID:** FSD-25  
**Duration:** 3 Hours

---

## Project Overview

DACMS is a full-stack web application that allows administrators to assign datasets to users and control access permissions. The system ensures users can access **only authorized datasets** and persists all data in a database.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| Database | LibSQL (SQLite-compatible, file-based) |
| Frontend | Vanilla HTML/CSS/JavaScript (SPA) |
| Environment | dotenv |

---

## User Roles & Permissions

### USER
- Register and log in to the system
- View **only** datasets assigned to them by an Admin
- Access dataset details (read-only)
- Cannot access any unassigned dataset (rejected at backend)

### ADMIN
- Register and log in to the system
- Create, edit, and delete datasets
- Assign or revoke dataset access for specific users
- View all access mappings (audit log)
- View all registered users

---

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, receive JWT |
| GET | `/api/auth/me` | JWT | Get current user profile |

### Datasets
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/datasets` | JWT | ANY | ADMIN: all datasets; USER: assigned only |
| GET | `/api/datasets/:id` | JWT | ANY | Get one dataset (access enforced) |
| POST | `/api/datasets` | JWT | ADMIN | Create dataset |
| PUT | `/api/datasets/:id` | JWT | ADMIN | Update dataset |
| DELETE | `/api/datasets/:id` | JWT | ADMIN | Delete dataset + access mappings |

### Access Control
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/access` | JWT | ADMIN | All access mappings |
| GET | `/api/access/users` | JWT | ADMIN | All registered users |
| GET | `/api/access/user/:id` | JWT | ADMIN | Datasets for a specific user |
| POST | `/api/access/assign` | JWT | ADMIN | Grant user access to dataset |
| DELETE | `/api/access/revoke` | JWT | ADMIN | Revoke by user+dataset IDs |
| DELETE | `/api/access/revoke/:id` | JWT | ADMIN | Revoke by mapping ID |

---

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,          -- bcrypt hashed
  role TEXT NOT NULL DEFAULT 'USER', -- 'USER' or 'ADMIN'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Datasets table
CREATE TABLE datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  size TEXT,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Access mappings table (enforces USER ↔ DATASET access)
CREATE TABLE access_mappings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  dataset_id TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, dataset_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (dataset_id) REFERENCES datasets(id),
  FOREIGN KEY (granted_by) REFERENCES users(id)
);
```

---

## Setup & Running

### Backend

```bash
cd backend
npm install
# Configure .env (already provided)
node server.js
# Runs on http://localhost:5000
```

### Frontend

```bash
# Simply open frontend/index.html in a browser
# Or serve with any static server:
npx serve frontend
# Runs on http://localhost:3000
```

### Environment Variables (backend/.env)

```env
JWT_SECRET=dacms_super_secret_jwt_key_2025
JWT_EXPIRES_IN=24h
PORT=5000
DB_URL=file:dacms.db
```

---

## Security

- All passwords hashed with bcrypt (12 rounds)
- JWT tokens required for all protected routes
- Role checked server-side on every request
- Users attempting to access unassigned datasets receive `403 Forbidden`
- No hardcoded or in-memory data — all data persisted in SQLite database

---

## Live Deployment

- **Unified Frontend & Backend Deployment:** [https://dacms-delta.vercel.app](https://dacms-delta.vercel.app)
  
> The project is deployed as a unified application on Vercel, utilizing Vercel's Edge/Serverless functions for the Node.js API and serving the static frontend from the root.

---

## Evaluation Focus

✅ Access control correctness — backend rejects unauthorized dataset access  
✅ Role enforcement — ADMIN vs USER views and API protection  
✅ End-to-end execution — register → login → create dataset → assign → access
"# DACMS" 
