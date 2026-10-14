import { useEffect, useRef } from 'react';
import api from '../api/axios';
import { useNotification } from '../context/NotificationContext';

// Android Chrome throws on `new Notification()` (it wants a service worker),
// and one throw would abort the rest of the reminder loop. Never let it.
function showSystemNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready
        .then(reg => reg.showNotification(title, { body }))
        .catch(() => {});
    } else {
      new Notification(title, { body });
    }
  } catch {
    // unsupported on this device: the in-app toast still shows
  }
}

export default function useDeadlineChecker() {
  const { showNotification } = useNotification();
  const notifiedIds = useRef(new Set());

  useEffect(() => {
    const checkDeadlines = async () => {
      try {
        const res = await api.get('/tasks/today');
        const tasks = [...(res.data.today || []), ...(res.data.overdue || [])];
        const now = new Date();

        tasks.forEach(task => {
          if (!task.task_date || !task.task_time || task.completed) return;
          if (notifiedIds.current.has(task.id)) return;

          const dateStr = typeof task.task_date === 'string'
            ? task.task_date.split('T')[0]
            : new Date(task.task_date).toISOString().split('T')[0];
          const timeStr = task.task_time.substring(0, 5);
          const deadline = new Date(`${dateStr}T${timeStr}`);
          const diff = deadline - now;

          // Fire if within ±2 minutes of deadline
          if (diff >= -120000 && diff <= 120000) {
            notifiedIds.current.add(task.id);
            showNotification('⏰ Task Reminder', `"${task.title}" is due now!`, 'warning');

            // Browser / system notification (safe on phones)
            showSystemNotification('Task Due — TaskFlow', `"${task.title}" is due now!`);
          }
        });
      } catch {
        // Silently catch if not logged in or network error
      }
    };

    // Initial check
    checkDeadlines();
    // Check every 45 seconds
    const interval = setInterval(checkDeadlines, 45000);
    return () => clearInterval(interval);
  }, [showNotification]);

  // Request browser notification permission once
  useEffect(() => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch {
      // ignore
    }
  }, []);
}
