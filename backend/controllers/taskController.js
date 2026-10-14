const pool = require('../config/db');

// GET /api/tasks/today
const getToday = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Overdue tasks:
    // 1) Scheduled for a date prior to today (task_date < CURDATE()), OR
    // 2) Scheduled for today but the time has already passed (task_date = CURDATE() AND task_time IS NOT NULL AND task_time < CURTIME())
    const [overdue] = await pool.query(
      `SELECT * FROM tasks
       WHERE user_id = ? AND completed = 0 AND (
         task_date < CURDATE()
         OR (task_date = CURDATE() AND task_time IS NOT NULL AND task_time < CURTIME())
       )
       ORDER BY task_date ASC, ISNULL(task_time) ASC, task_time ASC`,
      [userId]
    );

    // Today's active tasks:
    // Tasks scheduled for today (or unscheduled) whose deadline has not passed yet
    const [todayTasks] = await pool.query(
      `SELECT * FROM tasks
       WHERE user_id = ? AND completed = 0 AND (
         (task_date = CURDATE() AND (task_time IS NULL OR task_time >= CURTIME()))
         OR task_date IS NULL
       )
       ORDER BY ISNULL(task_time) ASC, task_time ASC, id ASC`,
      [userId]
    );

    res.json({ overdue, today: todayTasks });
  } catch (err) {
    console.error('getToday error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/tasks/upcoming
const getUpcoming = async (req, res) => {
  try {
    const userId = req.session.userId;

    const [tasks] = await pool.query(
      `SELECT * FROM tasks
       WHERE user_id = ? AND completed = 0
         AND task_date >= CURDATE() + INTERVAL 1 DAY
         AND task_date <= CURDATE() + INTERVAL 1 YEAR
       ORDER BY task_date ASC, ISNULL(task_time) ASC, task_time ASC`,
      [userId]
    );

    res.json({ tasks });
  } catch (err) {
    console.error('getUpcoming error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/tasks/incoming
// Every unfinished task: overdue ones first, then everything else by date/time
// (tasks without a date go last).
const getIncoming = async (req, res) => {
  try {
    const userId = req.session.userId;

    const [overdue] = await pool.query(
      `SELECT * FROM tasks
       WHERE user_id = ? AND completed = 0 AND (
         task_date < CURDATE()
         OR (task_date = CURDATE() AND task_time IS NOT NULL AND task_time < CURTIME())
       )
       ORDER BY task_date ASC, ISNULL(task_time) ASC, task_time ASC, id ASC`,
      [userId]
    );

    const [tasks] = await pool.query(
      `SELECT * FROM tasks
       WHERE user_id = ? AND completed = 0 AND (
         task_date IS NULL
         OR task_date > CURDATE()
         OR (task_date = CURDATE() AND (task_time IS NULL OR task_time >= CURTIME()))
       )
       ORDER BY ISNULL(task_date) ASC, task_date ASC, ISNULL(task_time) ASC, task_time ASC, id ASC`,
      [userId]
    );

    res.json({ overdue, tasks });
  } catch (err) {
    console.error('getIncoming error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/tasks/finished
const getFinished = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Completed tasks in the last 7 days. Older records remain in DB.
    const [tasks] = await pool.query(
      `SELECT * FROM tasks
       WHERE user_id = ? AND completed = 1
         AND completed_at >= NOW() - INTERVAL 7 DAY
       ORDER BY completed_at DESC`,
      [userId]
    );

    res.json({ tasks });
  } catch (err) {
    console.error('getFinished error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/tasks/search?q=term
const searchTasks = async (req, res) => {
  try {
    const userId = req.session.userId;
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ tasks: [] });

    const term = `%${q}%`;
    const [tasks] = await pool.query(
      `SELECT * FROM tasks
       WHERE user_id = ?
         AND (title LIKE ? OR description LIKE ?)
       ORDER BY completed ASC, task_date ASC, task_time ASC
       LIMIT 20`,
      [userId, term, term]
    );

    res.json({ tasks });
  } catch (err) {
    console.error('searchTasks error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/tasks/stats
const getStats = async (req, res) => {
  try {
    const userId = req.session.userId;

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM tasks WHERE user_id = ?', [userId]
    );
    const [[{ completed }]] = await pool.query(
      'SELECT COUNT(*) as completed FROM tasks WHERE user_id = ? AND completed = 1', [userId]
    );
    const [[{ pending }]] = await pool.query(
      'SELECT COUNT(*) as pending FROM tasks WHERE user_id = ? AND completed = 0', [userId]
    );
    const [[{ overdue }]] = await pool.query(
      `SELECT COUNT(*) as overdue FROM tasks
       WHERE user_id = ? AND completed = 0 AND (
         task_date < CURDATE()
         OR (task_date = CURDATE() AND task_time IS NOT NULL AND task_time < CURTIME())
       )`,
      [userId]
    );
    const [[{ completedToday }]] = await pool.query(
      'SELECT COUNT(*) as completedToday FROM tasks WHERE user_id = ? AND completed = 1 AND DATE(completed_at) = CURDATE()',
      [userId]
    );
    const [[{ completedThisWeek }]] = await pool.query(
      'SELECT COUNT(*) as completedThisWeek FROM tasks WHERE user_id = ? AND completed = 1 AND completed_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)',
      [userId]
    );

    res.json({
      total, completed, pending, overdue,
      completedToday, completedThisWeek,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { title, description, task_date, task_time } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const cleanDate = task_date ? task_date.trim() : null;
    const cleanTime = task_time ? task_time.trim() : null;

    const [result] = await pool.query(
      `INSERT INTO tasks (user_id, title, description, task_date, task_time)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title.trim(), description || null, cleanDate, cleanTime]
    );

    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json({ task: rows[0] });
  } catch (err) {
    console.error('createTask error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { title, description, task_date, task_time } = req.body;

    const [tasks] = await pool.query(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?', [id, userId]
    );
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found or access denied.' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const cleanDate = task_date ? task_date.trim() : null;
    const cleanTime = task_time ? task_time.trim() : null;

    await pool.query(
      `UPDATE tasks SET title = ?, description = ?, task_date = ?, task_time = ?
       WHERE id = ? AND user_id = ?`,
      [title.trim(), description || null, cleanDate, cleanTime, id, userId]
    );

    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    res.json({ task: rows[0] });
  } catch (err) {
    console.error('updateTask error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// PATCH /api/tasks/:id/complete
const completeTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const [tasks] = await pool.query(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?', [id, userId]
    );
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found or access denied.' });
    }

    await pool.query(
      'UPDATE tasks SET completed = 1, completed_at = NOW() WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    res.json({ task: rows[0] });
  } catch (err) {
    console.error('completeTask error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// PATCH /api/tasks/:id/restore
const restoreTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const [tasks] = await pool.query(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?', [id, userId]
    );
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found or access denied.' });
    }

    await pool.query(
      'UPDATE tasks SET completed = 0, completed_at = NULL WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    res.json({ task: rows[0] });
  } catch (err) {
    console.error('restoreTask error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const [tasks] = await pool.query(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?', [id, userId]
    );
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found or access denied.' });
    }

    await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    console.error('deleteTask error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  getToday, getUpcoming, getIncoming, getFinished, searchTasks, getStats,
  createTask, updateTask, completeTask, restoreTask, deleteTask,
};
