import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios';
import AddTaskModal from '../components/tasks/AddTaskModal';
import EditTaskModal from '../components/tasks/EditTaskModal';
import TaskList from '../components/tasks/TaskList';
import { useNotification } from '../context/NotificationContext';
import { withoutPendingDeletes } from '../utils/pendingDeletes';

function formatLocalDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateYearDates() {
  const dates = [];
  const start = new Date();
  start.setDate(start.getDate() + 1); // start from tomorrow
  for (let i = 0; i < 365; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(formatLocalDateString(d));
  }
  return dates;
}

function formatDayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
    date: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  };
}

export default function Upcoming() {
  const { showNotification } = useNotification();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addForDate, setAddForDate] = useState(null);
  const [editTask, setEditTask] = useState(null);

  const yearDates = useMemo(() => generateYearDates(), []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks/upcoming');
      setTasks(withoutPendingDeletes(res.data.tasks || []));
    } catch {
      showNotification('Error', 'Could not load upcoming tasks.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchTasks();
    const handleRefresh = () => fetchTasks();
    window.addEventListener('tasks-updated', handleRefresh);
    return () => window.removeEventListener('tasks-updated', handleRefresh);
  }, [fetchTasks]);

  // Group tasks by date string (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.task_date) return;
      const key = typeof t.task_date === 'string'
        ? t.task_date.split('T')[0]
        : new Date(t.task_date).toISOString().split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const handleAdded = (task) => {
    setTasks(prev => [...prev, task]);
    showNotification('Task added', `"${task.title}" was added.`, 'success');
    window.dispatchEvent(new CustomEvent('tasks-updated'));
    setAddForDate(null);
  };

  // TaskCard talks to the API and shows the Undo toast itself;
  // the page only needs to drop the task from its local list.
  const handleRemoved = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    window.dispatchEvent(new CustomEvent('tasks-updated'));
  };

  const handleUpdated = (updated) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    showNotification('Task updated', `"${updated.title}" was updated.`, 'info');
    window.dispatchEvent(new CustomEvent('tasks-updated'));
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page upcoming-page">
      <div className="page-header">
        <h1 className="page-title">Upcoming</h1>
        <p className="page-date">Next 365 Days Overview</p>
      </div>

      <div className="upcoming-list">
        {yearDates.map(dateStr => {
          const { weekday, date } = formatDayLabel(dateStr);
          const dayTasks = tasksByDate[dateStr] || [];

          return (
            <div key={dateStr} className="upcoming-day">
              <div className="upcoming-day-header">
                <div className="upcoming-day-label">
                  <span className="upcoming-weekday">{weekday}</span>
                  <span className="upcoming-date">{date}</span>
                </div>
              </div>

              <div className="upcoming-day-tasks">
                {dayTasks.length === 0 ? (
                  <p className="upcoming-no-tasks" style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', padding: '4px 0' }}>
                    No tasks
                  </p>
                ) : (
                  <TaskList
                    tasks={dayTasks}
                    onComplete={handleRemoved}
                    onDelete={handleRemoved}
                    onEdit={setEditTask}
                    hideDate
                  />
                )}

                <button
                  className="upcoming-add-btn"
                  onClick={() => setAddForDate(dateStr)}
                >
                  + Add Task
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {addForDate && (
        <AddTaskModal
          defaultDate={addForDate}
          onClose={() => setAddForDate(null)}
          onAdded={handleAdded}
        />
      )}

      {editTask && (
        <EditTaskModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
