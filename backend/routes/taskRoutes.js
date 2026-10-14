const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getToday, getUpcoming, getIncoming, getFinished, searchTasks, getStats,
  createTask, updateTask, completeTask, restoreTask, deleteTask,
} = require('../controllers/taskController');

// Apply auth middleware to ALL task routes
router.use(authMiddleware);

router.get('/today',      getToday);
router.get('/upcoming',   getUpcoming);
router.get('/incoming',   getIncoming);
router.get('/finished',   getFinished);
router.get('/search',     searchTasks);
router.get('/stats',      getStats);
router.post('/',          createTask);
router.put('/:id',        updateTask);
router.patch('/:id/complete', completeTask);
router.patch('/:id/restore',  restoreTask);
router.delete('/:id',    deleteTask);

module.exports = router;
