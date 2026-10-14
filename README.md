# TaskFlow — Modern Full-Stack Todo Application

A modern, clean, minimal full-stack Todo application built with **React**, **Node.js**, **Express**, and **MySQL**.

---

## 🌟 Features Implemented

1. **Authentication & User Isolation**
   - User Signup, Login, and Logout
   - Passwords securely hashed with **bcryptjs** (12 salt rounds)
   - Server-side sessions with **express-session** stored in MySQL via `express-mysql-session`
   - Strict database user isolation on every query (`WHERE user_id = ?`)
   - Protected routes in React (`<ProtectedRoute />`)

2. **Modern Minimalist Layout & Resizable Sidebar**
   - White application background with very light gray sidebar and clean orange accents (`#f97316`)
   - Draggable sidebar right boundary (with hover visual indicators and min/max limits)
   - Collapsible sidebar mode (compact icon-only view)
   - Two main layout regions: left sidebar + full-width main content area (no permanent right panels)

3. **Live Search**
   - Built directly into the sidebar
   - Debounced search querying **only unfinished/active tasks** by title and description
   - Click search results to view or edit immediately

4. **Today View**
   - Separate **Overdue** section for past-due unfinished tasks
   - **Today's Active Tasks** list with date header
   - Circular completion control with smooth hover checkmark animation and completion transition
   - Action dropdown for each task: Edit, Delete

5. **Upcoming 365-Day View**
   - 12-month vertical timeline
   - Grouped tasks per date with completion circles and time tags
   - Inline `+ Add Task` button directly for any future date

6. **Finished History (7-Day Rolling Window)**
   - Completed tasks from the last 7 days
   - Records older than 7 days remain safely stored in MySQL
   - One-click task restore (`completed = 0, completed_at = NULL`) returning the task to active lists

7. **Productivity Stats**
   - Total tasks, Completed, Pending, Overdue, Done Today, Done This Week
   - Animated SVG circular completion progress ring
   - Smooth count-up number animations on page load

8. **Notifications & Reminders**
   - Floating bottom-right notifications for Task Added, Deleted, Completed, and Restored
   - Deadline checker hook monitoring due dates in background
   - Native Web Notifications API integration for background tab reminders

---

## 🚀 How to Run the Project

### Prerequisites
- Node.js (v18+)
- MySQL Server 8.0+ running on port 3306

### 1. Backend Setup
```bash
cd backend
npm install
# Ensure .env has your MySQL password
npm run dev
```
Backend runs on `http://localhost:3000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

### 3. Running Backend Tests
To test all API endpoints and verify multi-user security isolation:
```bash
cd backend
node test-api.js
```
