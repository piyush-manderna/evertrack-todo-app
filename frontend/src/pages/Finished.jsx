import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import TaskList from '../components/tasks/TaskList';
import { useNotification } from '../context/NotificationContext';
import { withoutPendingDeletes } from '../utils/pendingDeletes';

export default function Finished() {
  const { showNotification } = useNotification();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks/finished');
      setTasks(withoutPendingDeletes(res.data.tasks || []));
    } catch {
      showNotification('Error', 'Could not load finished tasks.', 'error');
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

  const handleRestore = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    window.dispatchEvent(new CustomEvent('tasks-updated'));
  };

  const handleDelete = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    window.dispatchEvent(new CustomEvent('tasks-updated'));
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page finished-page">
      <div className="page-header">
        <h1 className="page-title">Finished</h1>
        <p className="page-date">Completed tasks from the last 7 days</p>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✓</div>
          <p>No completed tasks in the last 7 days.</p>
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          onDelete={handleDelete}
          onRestore={handleRestore}
          onComplete={() => {}}
          onEdit={() => {}}
          isFinished
        />
      )}
    </div>
  );
}
