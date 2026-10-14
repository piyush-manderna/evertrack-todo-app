import { useState, useEffect } from 'react';
import api from '../api/axios';
import TaskList from '../components/tasks/TaskList';
import CollapsibleSection from '../components/common/CollapsibleSection';
import EditTaskModal from '../components/tasks/EditTaskModal';
import { useNotification } from '../context/NotificationContext';
import { withoutPendingDeletes } from '../utils/pendingDeletes';

export default function Incoming({ onAddTask }) {
  const { showNotification } = useNotification();
  const [overdue, setOverdue] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTask, setEditTask] = useState(null);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks/incoming');
      setOverdue(withoutPendingDeletes(res.data.overdue || []));
      setTasks(withoutPendingDeletes(res.data.tasks || []));
    } catch (err) {
      const status = err.response?.status;
      showNotification('Error', `Could not load tasks${status ? ` (error ${status})` : ''}.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const handleRefresh = () => fetchTasks();
    window.addEventListener('tasks-updated', handleRefresh);
    const interval = setInterval(fetchTasks, 20000); // tasks move to Overdue as their time passes
    return () => {
      window.removeEventListener('tasks-updated', handleRefresh);
      clearInterval(interval);
    };
  }, []);

  const removeTask = (id) => {
    setOverdue(prev => prev.filter(t => t.id !== id));
    setTasks(prev => prev.filter(t => t.id !== id));
    window.dispatchEvent(new CustomEvent('tasks-updated'));
  };

  const handleUpdated = (updated) => {
    const update = list => list.map(t => (t.id === updated.id ? updated : t));
    setOverdue(update);
    setTasks(update);
    showNotification('Task updated', `"${updated.title}" was updated.`, 'info');
    window.dispatchEvent(new CustomEvent('tasks-updated'));
  };

  const total = overdue.length + tasks.length;

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page today-page">
      <div className="page-header">
        <h1 className="page-title">Incoming</h1>
        <p className="page-date">
          {total === 0 ? 'Nothing left to do' : `${total} ${total === 1 ? 'task' : 'tasks'} left`}
        </p>
      </div>

      {overdue.length > 0 && (
        <section className="today-section">
          <CollapsibleSection title="Overdue" count={overdue.length} danger>
            <TaskList
              tasks={overdue}
              onComplete={removeTask}
              onDelete={removeTask}
              onEdit={setEditTask}
              isOverdue
            />
          </CollapsibleSection>
        </section>
      )}

      <section className="today-section">
        {total === 0 ? (
          <div className="empty-state all-clear">
            <div className="all-clear-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <p className="all-clear-title">You're all caught up</p>
            <p className="all-clear-sub">No unfinished tasks. Add something new when you're ready.</p>
          </div>
        ) : (
          tasks.length > 0 && (
            <CollapsibleSection title="All tasks" count={tasks.length}>
              <TaskList
                tasks={tasks}
                onComplete={removeTask}
                onDelete={removeTask}
                onEdit={setEditTask}
              />
            </CollapsibleSection>
          )
        )}

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
