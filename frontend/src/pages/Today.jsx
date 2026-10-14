import { useState, useEffect } from 'react';
import api from '../api/axios';
import TaskList from '../components/tasks/TaskList';
import CollapsibleSection from '../components/common/CollapsibleSection';
import EditTaskModal from '../components/tasks/EditTaskModal';
import { useNotification } from '../context/NotificationContext';
import { withoutPendingDeletes } from '../utils/pendingDeletes';

export default function Today({ onAddTask }) {
  const { showNotification } = useNotification();
  const [overdue, setOverdue] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTask, setEditTask] = useState(null);

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks/today');
      setOverdue(withoutPendingDeletes(res.data.overdue || []));
      setTodayTasks(withoutPendingDeletes(res.data.today || []));
    } catch {
      showNotification('Error', 'Could not load tasks.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const handleRefresh = () => fetchTasks();
    window.addEventListener('tasks-updated', handleRefresh);
    const interval = setInterval(fetchTasks, 20000); // Check every 20s for passed deadlines
    return () => {
      window.removeEventListener('tasks-updated', handleRefresh);
      clearInterval(interval);
    };
  }, []);

  const handleComplete = (id) => {
    setOverdue(prev => prev.filter(t => t.id !== id));
    setTodayTasks(prev => prev.filter(t => t.id !== id));
    window.dispatchEvent(new CustomEvent('tasks-updated'));
  };

  const handleDelete = (id) => {
    setOverdue(prev => prev.filter(t => t.id !== id));
    setTodayTasks(prev => prev.filter(t => t.id !== id));
    window.dispatchEvent(new CustomEvent('tasks-updated'));
  };

  const handleUpdated = (updated) => {
    const update = list => list.map(t => t.id === updated.id ? updated : t);
    setOverdue(update);
    setTodayTasks(update);
    showNotification('Task updated', `"${updated.title}" was updated.`, 'info');
    window.dispatchEvent(new CustomEvent('tasks-updated'));
  };

  const allClear = overdue.length === 0 && todayTasks.length === 0;

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page today-page">
      <div className="page-header">
        <h1 className="page-title">Today</h1>
        <p className="page-date">{dateLabel}</p>
      </div>

      {overdue.length > 0 && (
        <section className="today-section">
          <CollapsibleSection title="Overdue" count={overdue.length} danger>
            <TaskList
              tasks={overdue}
              onComplete={handleComplete}
              onDelete={handleDelete}
              onEdit={setEditTask}
              isOverdue
            />
          </CollapsibleSection>
        </section>
      )}

      <section className="today-section">
        <CollapsibleSection title="Today's Tasks" count={todayTasks.length}>
        {todayTasks.length === 0 ? (
          allClear ? (
            <div className="empty-state all-clear">
              <div className="all-clear-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <p className="all-clear-title">All clear for today</p>
              <p className="all-clear-sub">Nothing on your plate. Enjoy it, or add something new.</p>
            </div>
          ) : (
            <p className="today-nothing-else">Nothing else scheduled for today.</p>
          )
        ) : (
          <TaskList
            tasks={todayTasks}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onEdit={setEditTask}
          />
        )}
        </CollapsibleSection>

        <button type="button" className="today-add-btn" onClick={onAddTask}>
          <span className="today-add-btn-icon" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          Add task
        </button>
      </section>

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
