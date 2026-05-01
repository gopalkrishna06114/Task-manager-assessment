# Nexus — Team Task Manager

A full-stack team task management app built with React, Node.js, Express, and MySQL.

## Live Demo
https://your-railway-url.up.railway.app

## GitHub
https://github.com/YOUR_USERNAME/nexus-task-manager

## Features
- JWT Authentication (Signup / Login)
- Create & manage projects
- Role-based access (Admin / Member)
- Kanban board (To Do / In Progress / Done)
- Task assignment, priorities, due dates
- Dashboard with stats
- Add/remove team members

## Tech Stack
- Frontend: React 18 + Vite
- Backend: Node.js + Express
- Database: MySQL
- Auth: JWT + bcrypt
- Deployment: Railway

## Local Setup

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd nexus
```

### 2. Set up server environment
```bash
cd server && cp .env.example .env
```
Edit .env:
```
DATABASE_URL=mysql://root:password@localhost:3306/nexus
JWT_SECRET=your_secret_key
NODE_ENV=development
PORT=8080
```

### 3. Run server
```bash
cd server && npm install && node index.js
```

### 4. Run client
```bash
cd client && npm install && npm run dev
```

Visit http://localhost:5173

## Railway Deployment
Set these variables in Railway service:
```
DATABASE_URL = ${{MySQL.MYSQL_URL}}
JWT_SECRET   = any_random_string
NODE_ENV     = production
CLIENT_URL   = https://your-domain.up.railway.app
```
Set networking port to 8080.
