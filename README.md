# Task Manager - Collaborative Workspace for Teams

🌐 **Live Demo:** [Live Demo](https://task-manager-assessment-production.up.railway.app/)
🎥 **Demo Video:** [Live Video]([https://your-demo-video-link-here.com](https://drive.google.com/file/d/1wKX8OqtthzLWyB-p1ngQCnNaykYC4CL6/view?usp=drive_link))

Task Manager is a web-based project and task management platform built for teams that need clear ownership, priority tracking, and progress visibility across multiple projects. Team admins control project setup and task assignment, members update task statuses on their own workload. A live dashboard aggregates stats across all projects a user belongs to.

---

## Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Application Structure](#application-structure)
- [Database Design](#database-design)
- [Environment Setup](#environment-setup)
- [Running the Project Locally](#running-the-project-locally)
- [REST API Reference](#rest-api-reference)
- [Deployment](#deployment)

---

## Project Overview

### What it does

- Users register and log in with JWT-secured sessions
- Any user can create a project and becomes its admin
- Admins invite teammates by email, assign tasks with priority and due dates, and manage the full project lifecycle
- Members can update the status of tasks assigned to them (`todo → inprogress → done`)
- A personal dashboard shows task counts by status, overdue alerts, and workload distribution across the team

### Design decisions

- The React client is built and served as static files from the Express server in production - no separate frontend hosting required
- MySQL tables are created automatically on first server boot via `initDB()` - no migration CLI needed
- Role checks are enforced server-side on every protected route, not just in the UI

---

## Tech Stack

### Frontend

| Library / Tool | Version | Role |
|---|---|---|
| React | ^18.2.0 | Component-based UI |
| React Router DOM | ^6.15.0 | SPA routing |
| Axios | ^1.5.0 | API communication |
| Vite | ^5.0.0 | Dev server and production bundler |
| Inter (Google Fonts) | — | Typography |

### Backend

| Package | Version | Role |
|---|---|---|
| Express | ^4.18.2 | HTTP server and route handling |
| mysql2 | ^3.6.0 | MySQL driver with promise support |
| jsonwebtoken | ^9.0.0 | Auth token signing and verification |
| bcryptjs | ^2.4.3 | Password hashing (10 salt rounds) |
| dotenv | ^16.0.3 | `.env` loading |
| cors | ^2.8.5 | Cross-origin policy |

### Database

- **MySQL** 5.7+ or MySQL 8.x
- Connection pooling via `mysql2/promise` (limit: 10 connections)
- SSL enabled automatically when `NODE_ENV=production`

---

## Application Structure

```
taskmanager/
├── package.json                    # Root — contains the production start script
├── railway.toml                    # One-click Railway deployment config
├── .gitignore
│
├── server/                         # Node.js / Express backend
│   ├── index.js                    # Entry point: mounts routes, serves React build, calls initDB
│   ├── db.js                       # Connection pool, query wrapper, auto table creation
│   ├── package.json
│   ├── .env.example                # Copy this to .env and fill in your values
│   ├── middleware/
│   │   └── auth.js                 # Reads Bearer token, verifies JWT, attaches req.user
│   └── routes/
│       ├── auth.js                 # /api/auth — signup and login
│       ├── projects.js             # /api/projects — project CRUD + member management
│       └── tasks.js                # /api/tasks — task CRUD + dashboard stats
│
└── client/                         # React + Vite frontend
    ├── index.html                  # App shell — sets page title "TaskManager — Team Task Manager"
    ├── vite.config.js              # Proxies /api/* to localhost:8080 in dev
    ├── package.json
    └── src/
        ├── main.jsx                # Mounts <App /> into #root
        ├── App.jsx                 # Route tree with Protected and Guest wrappers
        ├── index.css               # Global CSS variables (purple accent #6c4ef2, Inter font)
        ├── api/
        │   └── index.js            # Axios instance — reads token from localStorage
        ├── context/
        │   └── AuthContext.jsx     # Global auth state (user object + login/logout helpers)
        ├── components/
        │   ├── Layout.jsx          # Sidebar (⬡ logo, nav links, user info) + <Outlet />
        │   └── Layout.css
        └── pages/
            ├── Login.jsx           # Split-panel login — left brand panel, right form
            ├── Register.jsx        # Registration form
            ├── Auth.css            # Shared auth page styles
            ├── Dashboard.jsx       # Stat cards + per-user task bar chart
            ├── Dashboard.css
            ├── Projects.jsx        # Project grid + inline create form
            ├── Projects.css
            ├── ProjectDetail.jsx   # Task board with kanban columns + member panel
            └── ProjectDetail.css
```

---

## Database Design

Task Manager uses four tables. Foreign key constraints enforce referential integrity - deleting a project cascades to remove its members and tasks automatically.

### Entity Relationship Summary

```
users ──< project_members >── projects
                                  │
                              tasks (assigned_to → users, created_by → users)
```

---

### Table: `users`

| Column | Data Type | Constraints | Notes |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | — |
| `name` | VARCHAR(100) | NOT NULL | Display name shown across the UI |
| `email` | VARCHAR(150) | UNIQUE, NOT NULL | Used for login and member invites |
| `password` | VARCHAR(255) | NOT NULL | bcrypt hash — plaintext never stored |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | — |

---

### Table: `projects`

| Column | Data Type | Constraints | Notes |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | — |
| `name` | VARCHAR(150) | NOT NULL | — |
| `description` | TEXT | — | Optional |
| `admin_id` | INT | FK → users(id) CASCADE | Creator of the project |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | — |

---

### Table: `project_members`

Junction table linking users to projects with a role.

| Column | Data Type | Constraints | Notes |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | — |
| `project_id` | INT | FK → projects(id) CASCADE | — |
| `user_id` | INT | FK → users(id) CASCADE | — |
| `role` | ENUM('admin','member') | DEFAULT 'member' | Determines write permissions |
| — | UNIQUE KEY | `(project_id, user_id)` | Prevents duplicate rows |

---

### Table: `tasks`

| Column | Data Type | Constraints | Notes |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | — |
| `title` | VARCHAR(200) | NOT NULL | — |
| `description` | TEXT | — | Optional |
| `due_date` | DATE | — | Used to compute overdue status |
| `priority` | ENUM('low','medium','high') | DEFAULT 'medium' | — |
| `status` | ENUM('todo','inprogress','done') | DEFAULT 'todo' | Members can update this field |
| `project_id` | INT | FK → projects(id) CASCADE | — |
| `assigned_to` | INT | FK → users(id) SET NULL | Nullable — unassigned tasks allowed |
| `created_by` | INT | FK → users(id) CASCADE | — |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | — |

---

### SQL Schema

> Tables are created automatically when the server starts. These queries are for reference or manual setup only.

```sql
-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  UNIQUE NOT NULL,
  password    VARCHAR(255)  NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects
CREATE TABLE IF NOT EXISTS projects (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  admin_id    INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Project Members
CREATE TABLE IF NOT EXISTS project_members (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  project_id  INT NOT NULL,
  user_id     INT NOT NULL,
  role        ENUM('admin','member') DEFAULT 'member',
  UNIQUE KEY unique_member (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
);

-- 4. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  due_date    DATE,
  priority    ENUM('low','medium','high') DEFAULT 'medium',
  status      ENUM('todo','inprogress','done') DEFAULT 'todo',
  project_id  INT NOT NULL,
  assigned_to INT,
  created_by  INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id)    ON DELETE SET NULL,
  FOREIGN KEY (created_by)  REFERENCES users(id)    ON DELETE CASCADE
);
```

---

### Useful Queries

```sql
-- All projects visible to a user, with member and task counts
SELECT
  p.*,
  u.name         AS admin_name,
  pm.role        AS my_role,
  (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) AS member_count,
  (SELECT COUNT(*) FROM tasks            WHERE project_id = p.id) AS task_count
FROM projects p
JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
JOIN users u             ON u.id = p.admin_id
ORDER BY p.created_at DESC;

-- Tasks for a project, joined with assignee and creator names
SELECT t.*, u.name AS assigned_name, cb.name AS created_by_name
FROM tasks t
LEFT JOIN users u  ON u.id  = t.assigned_to
LEFT JOIN users cb ON cb.id = t.created_by
WHERE t.project_id = ?
ORDER BY t.created_at DESC;

-- Dashboard aggregate stats across multiple projects
SELECT
  COUNT(*)                                            AS total,
  SUM(status = 'todo')                               AS todo,
  SUM(status = 'inprogress')                         AS inprogress,
  SUM(status = 'done')                               AS done,
  SUM(due_date < CURDATE() AND status != 'done')     AS overdue
FROM tasks
WHERE project_id IN (?);  -- pass array of project IDs

-- Workload breakdown by assignee
SELECT u.name, COUNT(t.id) AS task_count
FROM tasks t
JOIN users u ON u.id = t.assigned_to
WHERE t.project_id IN (?)
GROUP BY t.assigned_to, u.name
ORDER BY task_count DESC;

-- Invite a user to a project (safe on duplicate)
INSERT IGNORE INTO project_members (project_id, user_id, role)
VALUES (?, ?, 'member');

-- Remove a member
DELETE FROM project_members
WHERE project_id = ? AND user_id = ?;

-- Update task status (member path)
UPDATE tasks SET status = ? WHERE id = ?;

-- Full task update (admin path)
UPDATE tasks
SET title = ?, description = ?, due_date = ?,
    priority = ?, status = ?, assigned_to = ?
WHERE id = ?;
```

---

## Environment Setup

Inside `server/`, copy the example file and fill in your values:

```bash
cp server/.env.example server/.env
```

`server/.env.example` contents:

```env
DATABASE_URL=mysql://root:password@localhost:3306/taskmanager
JWT_SECRET=change_this_to_a_random_secret
NODE_ENV=development
CLIENT_URL=http://localhost:5173
PORT=8080
```

| Key | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Full MySQL connection string |
| `JWT_SECRET` | ✅ | Used to sign tokens. Use a long random string in production |
| `NODE_ENV` | ✅ | `development` disables SSL on DB. `production` enables it |
| `CLIENT_URL` | Optional | Allowed CORS origin. Omit to allow all origins (`*`) |
| `PORT` | Optional | Express listen port. Defaults to `8080` |

---

## Running the Project Locally

### Prerequisites

- Node.js v18+
- MySQL running locally (or a remote instance you can connect to)

### 1. Clone and enter the project

```bash
git clone https://github.com/YOUR_USERNAME/taskmanager.git
cd taskmanager
```

### 2. Create the database

Log into MySQL and run:

```sql
CREATE DATABASE taskmanager;
```

Tables are created automatically when the server first starts.

### 3. Configure environment

```bash
cp server/.env.example server/.env
```

Open `server/.env` and update:

```env
DATABASE_URL=mysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/taskmanager
JWT_SECRET=pick_any_long_random_string
NODE_ENV=development
CLIENT_URL=http://localhost:5173
PORT=8080
```

### 4. Install dependencies

```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 5. Start both servers

Open two terminal tabs:

**Tab 1 — API server (port 8080):**
```bash
cd server
npm run dev
# nodemon will restart automatically on file changes
# Use `npm start` if nodemon is not installed globally
```

**Tab 2 — Vite dev server (port 5173):**
```bash
cd client
npm run dev
```

### 6. Open in browser

Navigate to `http://localhost:5173`.

All `/api` requests from the frontend are automatically proxied to `http://localhost:8080` by Vite's dev proxy - no CORS configuration needed during development.

---

## REST API Reference

All routes marked 🔒 require the header:
```
Authorization: Bearer <your_jwt_token>
```

### Auth — `/api/auth`

| Method | Route | Auth | Request Body | Response |
|---|---|---|---|---|
| `POST` | `/api/auth/signup` | — | `{ name, email, password }` | `{ token, user }` |
| `POST` | `/api/auth/login` | — | `{ email, password }` | `{ token, user }` |

Tokens are valid for **7 days**.

---

### Projects — `/api/projects`

| Method | Route | Auth | Body / Notes | Description |
|---|---|---|---|---|
| `GET` | `/api/projects` | 🔒 | — | All projects the current user belongs to |
| `POST` | `/api/projects` | 🔒 | `{ name, description? }` | Create project (caller becomes admin) |
| `GET` | `/api/projects/:id` | 🔒 | — | Project details + members list |
| `POST` | `/api/projects/:id/members` | 🔒 Admin | `{ email }` | Add member by email |
| `DELETE` | `/api/projects/:id/members/:userId` | 🔒 Admin | — | Remove a member |
| `DELETE` | `/api/projects/:id` | 🔒 Admin | — | Delete project (cascades tasks + members) |

---

### Tasks — `/api/tasks`

| Method | Route | Auth | Body / Notes | Description |
|---|---|---|---|---|
| `GET` | `/api/tasks/project/:projectId` | 🔒 | — | All tasks for a project |
| `POST` | `/api/tasks` | 🔒 Admin | `{ title, project_id, description?, due_date?, priority?, assigned_to? }` | Create task |
| `PUT` | `/api/tasks/:id` | 🔒 | See notes below | Update task |
| `DELETE` | `/api/tasks/:id` | 🔒 Admin | — | Delete task |
| `GET` | `/api/tasks/dashboard/stats` | 🔒 | — | Aggregate stats across user's projects |

**PUT update rules:**
- **Admin** — can update all fields: `title`, `description`, `due_date`, `priority`, `status`, `assigned_to`
- **Member** — can only update `status`, and only on tasks assigned to them

---

### System

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | — | Returns `{ status: "ok" }` |

---

## Deployment

### Railway (Recommended)

The repo includes `railway.toml` which configures build and start commands automatically.

**Steps:**

1. Push to a GitHub repository.
2. Sign in at [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**.
3. Select your repo.
4. Add a **MySQL** database plugin — Railway auto-injects `DATABASE_URL`.
5. Under your service's **Variables** tab, add:
   ```
   JWT_SECRET=your_production_secret
   NODE_ENV=production
   CLIENT_URL=https://your-app.up.railway.app
   ```
6. Railway runs:
   - Build: `cd client && npm install && npm run build && cd ../server && npm install`
   - Start: `cd server && node index.js`

Your app goes live at the Railway-provided domain.

---

### Render

1. New **Web Service** → connect your GitHub repo.
2. Set:
   - **Build Command:** `cd client && npm install && npm run build && cd ../server && npm install`
   - **Start Command:** `cd server && node index.js`
3. Add a MySQL database (or use an external provider like PlanetScale).
4. Add environment variables in the Render dashboard.

---

### VPS / Self-hosted

```bash
# Clone and enter project
git clone https://github.com/YOUR_USERNAME/taskmanager.git && cd taskmanager

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Set up MySQL
sudo apt install mysql-server
sudo mysql -e "CREATE DATABASE taskmanager;"

# Build frontend
cd client && npm install && npm run build

# Install backend deps
cd ../server && npm install

# Create .env
cp .env.example .env && nano .env

# Run with PM2
npm install -g pm2
pm2 start index.js --name taskmanager
pm2 save && pm2 startup
```

**Optional: Nginx reverse proxy**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass         http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/taskmanager /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Notes

- In production, the Express server serves the compiled React app from `client/dist`. The Vite dev server is not involved.
- Deleting a project removes all associated tasks and memberships automatically via database CASCADE rules.
- Token expiry is set to 7 days in `server/routes/auth.js`. Change the `expiresIn` value to suit your needs.
- `assigned_to` is nullable — tasks can exist without an assignee and will appear in the project board unassigned.
