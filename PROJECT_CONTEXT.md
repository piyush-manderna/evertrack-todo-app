# TaskFlow — Complete Project Handover & AI Context

> **Note for AI Assistant:** This document provides the complete architectural, database, backend, frontend, and business logic state of the **TaskFlow** full-stack Todo application. You can immediately continue development, add features, or debug without asking the user to re-explain the system.

---

## 1. System Overview & Technology Stack

| Layer | Technology | Key Details |
|---|---|---|
| **Frontend** | React 19 + Vite | JavaScript (ESM), React Router DOM v7, Axios, Plain CSS (no CSS frameworks/Tailwind) |
| **Backend** | Node.js + Express | REST API, CommonJS modules, CORS enabled for `http://localhost:5173` with credentials |
| **Database** | MySQL Server 8.0+ | Port `3306`, database `todo_app`, connected via `mysql2` (promise pool) |
| **Auth & Sessions** | `express-session` + `bcryptjs` | Sessions persisted in MySQL via `express-mysql-session`, cookie name `connect.sid` |
| **Proxying** | Vite Dev Proxy | All `/api/*` frontend calls automatically forward to Express on `http://localhost:3000` |

---

## 2. Ports & Environment Variables

### Backend Port: `3000`
### Frontend Port: `5173`

### Backend `.env` (`backend/.env`)
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=piyush@155
DB_NAME=todo_app
SESSION_SECRET=t0d0App$uper$ecretKey2026!xPqZ9
```

---

## 3. Database Architecture (`todo_app`)

Initialized via [`backend/config/schema.sql`](file:///c:/Users/Piyush/Desktop/New%20folder%20(2)/second_time(todo%20website)/backend/config/schema.sql):

### 1. `users` Table
```sql
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `tasks` Table
```sql
CREATE TABLE tasks (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED  NOT NULL,
  title        VARCHAR(255)  NOT NULL,
  description  TEXT,
  task_date    DATE,
  task_time    TIME,
  completed    TINYINT(1)    NOT NULL DEFAULT 0,
  completed_at DATETIME      DEFAULT NULL,
  created_at   DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_user_id   ON tasks (user_id);
CREATE INDEX idx_tasks_task_date ON tasks (task_date);
CREATE INDEX idx_tasks_completed ON tasks (completed);
CREATE INDEX idx_tasks_user_date ON tasks (user_id, task_date);
```

### 3. `sessions` Table
Automatically provisioned by `express-mysql-session` to keep sessions persistent across server restarts.

---

## 4. Complete File Structure & Responsibilities

```
second_time(todo website)/
├── PROJECT_CONTEXT.md                <-- This handover document
├── README.md                         <-- User documentation
│
├── backend/
│   ├── .env                          <-- DB credentials & session secret
│   ├── .gitignore                    <-- Ignores node_modules & .env
│   ├── package.json                  <-- Scripts: "start": "node server.js", "dev": "nodemon server.js"
│   ├── server.js                     <-- Express app setup, CORS, session store, route registration
│   │
│   ├── config/
│   │   ├── db.js                     <-- mysql2 pool (dateStrings: true enabled for timezone safety)
│   │   └── schema.sql                <-- MySQL DDL script
│   │
│   ├── middleware/
│   │   └── authMiddleware.js         <-- Protects routes: checks req.session.userId (returns 401 if null)
│   │
│   ├── controllers/
│   │   ├── authController.js         <-- signup, login, logout, me (with bcryptjs 12 rounds)
│   │   └── taskController.js         <-- All task endpoints with strict WHERE user_id = req.session.userId
│   │
│   ├── routes/
│   │   ├── authRoutes.js             <-- /api/auth/signup, /login, /logout, /me
│   │   └── taskRoutes.js             <-- /api/tasks/* (protected by authMiddleware)
│   │
│   └── test-api.js                   <-- Automated node test verifying all API endpoints and user isolation
│
└── frontend/
    ├── index.html                    <-- Sets title & Plus Jakarta Sans font
    ├── vite.config.js                <-- Configures proxy: /api -> http://localhost:3000
    ├── package.json                  <-- React 19, react-router-dom, axios
    │
    └── src/
        ├── main.jsx                  <-- Mounts <App /> into #root
        ├── App.jsx                   <-- React Router routes, AuthProvider, NotificationProvider, modals
        ├── App.css                   <-- Cleared Vite boilerplate
        ├── index.css                 <-- Comprehensive modern CSS theme (orange #f97316 accent, minimalist)
        │
        ├── api/
        │   └── axios.js              <-- Axios instance with baseURL: '/api' and withCredentials: true
        │
        ├── context/
        │   ├── AuthContext.jsx       <-- User state, checks /api/auth/me on mount, login/logout functions
        │   └── NotificationContext.jsx<-- Global toast queue: showNotification(title, message, type)
        │
        ├── hooks/
        │   └── useDeadlineChecker.js <-- Polling hook (45s): triggers in-app toasts & Web Notification API
        │
        ├── components/
        │   ├── common/
        │   │   ├── ProtectedRoute.jsx<-- Redirects unauthenticated users to /login
        │   │   └── SearchBar.jsx     <-- Debounced live search of active tasks; click opens Edit modal
        │   │
        │   ├── layout/
        │   │   ├── Sidebar.jsx       <-- Draggable resize (200-400px), collapse mode, navigation links
        │   │   ├── SidebarItem.jsx   <-- (Sub-item helper if needed)
        │   │   └── UserMenu.jsx      <-- User profile badge & logout trigger
        │   │
        │   ├── notifications/
        │   │   ├── Notification.jsx  <-- Individual animated toast (success/error/warning/info)
        │   │   └── NotificationContainer.jsx <-- Fixed bottom-right container
        │   │
        │   └── tasks/
        │       ├── TaskCard.jsx      <-- Single task item with completion circle, overdue pill, 3-dot menu
        │       ├── TaskList.jsx      <-- Maps array of tasks to TaskCard components
        │       ├── CompletionCircle.jsx<-- Circular checkbox: hover shows checkmark, click triggers complete
        │       ├── AddTaskModal.jsx  <-- Modal with 95%->100% scale animation, defaults date to local today
        │       └── EditTaskModal.jsx <-- Modal to edit title, description, date, and time
        │
        └── pages/
            ├── Login.jsx             <-- Login form (email + password)
            ├── Signup.jsx            <-- Signup form (name + email + password)
            ├── Today.jsx             <-- Overdue section + Today's active tasks (20s dynamic auto-refresh)
            ├── Upcoming.jsx          <-- 365-day vertical timeline with inline + Add Task per day
            ├── Finished.jsx          <-- Last 7 days completed tasks with 1-click restore
            └── Stats.jsx             <-- SVG circular completion progress + animated count-up numbers
```

---

## 5. API Reference (`/api`)

All `/api/tasks/*` routes require an active session cookie (`connect.sid`).

### Auth Routes (`/api/auth`)
- `POST /api/auth/signup`: `{ name, email, password }` $\rightarrow$ creates user, sets session, returns `{ user: { id, name, email } }`
- `POST /api/auth/login`: `{ email, password }` $\rightarrow$ checks bcrypt hash, sets session, returns `{ user }`
- `POST /api/auth/logout`: destroys session, clears cookie
- `GET /api/auth/me`: returns currently authenticated user `{ user }` (or `401`)

### Task Routes (`/api/tasks`)
- `GET /api/tasks/today`: Returns `{ overdue: [...], today: [...] }`
  - **Overdue criteria:** `completed = 0 AND (task_date < CURDATE() OR (task_date = CURDATE() AND task_time IS NOT NULL AND task_time < CURTIME()))`
  - **Today criteria:** `completed = 0 AND ((task_date = CURDATE() AND (task_time IS NULL OR task_time >= CURTIME())) OR task_date IS NULL)`
- `GET /api/tasks/upcoming`: Returns `{ tasks: [...] }` scheduled between `CURDATE() + INTERVAL 1 DAY` and `CURDATE() + INTERVAL 1 YEAR`.
- `GET /api/tasks/finished`: Returns `{ tasks: [...] }` completed in last 7 days (`completed = 1 AND completed_at >= NOW() - INTERVAL 7 DAY`).
- `GET /api/tasks/search?q={query}`: Searches **only incomplete** tasks (`completed = 0`) matching title or description (`LIKE %q%`).
- `GET /api/tasks/stats`: Returns `{ total, completed, pending, overdue, completedToday, completedThisWeek, completionPercentage }`.
- `POST /api/tasks`: `{ title, description, task_date, task_time }` $\rightarrow$ creates task under `req.session.userId`.
- `PUT /api/tasks/:id`: `{ title, description, task_date, task_time }` $\rightarrow$ updates task (checks `user_id = req.session.userId`).
- `PATCH /api/tasks/:id/complete`: sets `completed = 1, completed_at = NOW()`.
- `PATCH /api/tasks/:id/restore`: sets `completed = 0, completed_at = NULL`.
- `DELETE /api/tasks/:id`: deletes task record from MySQL.

---

## 6. Critical Business Rules & Design Details

1. **Security Isolation:**
   `user_id` is **NEVER** trusted from the request body or parameters. Every database query strictly filters by `WHERE user_id = req.session.userId`.
2. **Date & Timezone Integrity:**
   `mysql2` connection pool in [`backend/config/db.js`](file:///c:/Users/Piyush/Desktop/New%20folder%20%282%29/second_time(todo%20website)/backend/config/db.js) uses `dateStrings: true`. This prevents the driver from converting SQL `DATE` into JavaScript UTC `Date` objects, preserving local calendar dates.
3. **Cross-Component Synchronization:**
   Whenever a task is created, updated, completed, restored, or deleted anywhere in the app, a global event is dispatched:
   ```javascript
   window.dispatchEvent(new CustomEvent('tasks-updated'));
   ```
   All views (`Today.jsx`, `Upcoming.jsx`, `Finished.jsx`, `Stats.jsx`, `SearchBar.jsx`) listen for this event and instantly re-fetch their data without requiring page reloads or complex external state libraries.
4. **Real-Time Overdue Transitioning:**
   `Today.jsx` runs a 20-second interval check. If a task's deadline passes while the user is actively viewing the screen, it automatically transitions from "Today's Tasks" into the "Overdue" section.
5. **Soft Retention in Finished Section:**
   The Finished page only surfaces items completed in the past 7 days (`INTERVAL 7 DAY`). Tasks older than 7 days remain safely in MySQL for historical stats and are never deleted automatically.
6. **UI Design Palette:**
   - Background: Pure White (`#ffffff`)
   - Sidebar: Very light gray (`#f8f9fa`)
   - Text: Charcoal (`#18181b`) and muted secondary (`#71717a`)
   - Primary Accent: Orange (`#f97316`, hover `#ea580c`)
   - Overdue Indicator: Subtle rose border (`#f87171`) and soft badge `rgba(239, 68, 68, 0.08)` (no harsh red saturation).

---

## 7. How to Start the Application

### 1. Start Backend:
```powershell
cd "c:\Users\Piyush\Desktop\New folder (2)\second_time(todo website)\backend"
npm run dev
# Server starts on http://localhost:3000
```

### 2. Start Frontend:
```powershell
cd "c:\Users\Piyush\Desktop\New folder (2)\second_time(todo website)\frontend"
npm run dev
# Vite runs on http://localhost:5173
```

### 3. Run Backend Integration Tests:
```powershell
cd "c:\Users\Piyush\Desktop\New folder (2)\second_time(todo website)\backend"
node test-api.js
```
