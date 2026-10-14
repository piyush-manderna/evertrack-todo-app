-- TaskFlow database schema (MySQL 8.0+)
-- Rebuilt from the project notes + the drag & drop column (sort_order).
-- For an EXISTING database don't re-run this: use `node config/addSortOrder.js` instead.

CREATE DATABASE IF NOT EXISTS todo_app;
USE todo_app;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  task_date    DATE,
  task_time    TIME,
  completed    TINYINT(1) DEFAULT 0,
  completed_at DATETIME DEFAULT NULL,
  sort_order   INT NULL DEFAULT NULL,            -- manual position (drag & drop); NULL = never dragged
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_tasks_user_id (user_id),
  INDEX idx_tasks_task_date (task_date),
  INDEX idx_tasks_completed (completed),
  INDEX idx_tasks_user_date (user_id, task_date),
  INDEX idx_tasks_user_sort (user_id, sort_order)
);

-- The `sessions` table is created automatically by express-mysql-session.
