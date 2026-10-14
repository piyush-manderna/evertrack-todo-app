import { useCallback } from 'react';
import api from '../api/axios';
import { useNotification } from '../context/NotificationContext';
import { scheduleDelete, cancelDelete } from '../utils/pendingDeletes';

const UNDO_MS = 5000;           // how long the Undo toast stays up
const DELETE_GRACE_MS = 500;    // the real DELETE is sent just after the toast is gone

const notifyUpdated = () => window.dispatchEvent(new CustomEvent('tasks-updated'));

// Shared "Undo" behaviour for completing and deleting tasks.
// Safe to call from anywhere: the undo callbacks don't depend on the card
// (or page) that triggered them still being mounted.
export default function useTaskUndo() {
  const { showNotification } = useNotification();

  // Call AFTER the task has been marked complete on the server.
  const notifyCompleted = useCallback((task) => {
    showNotification('Task completed', `"${task.title}" moved to Finished.`, 'success', {
      duration: UNDO_MS,
      replaceKey: 'undo',
      action: {
        label: 'Undo',
        onClick: async () => {
          try {
            await api.patch(`/tasks/${task.id}/restore`);
            notifyUpdated();
            showNotification('Task restored', `"${task.title}" is back in your tasks.`, 'info');
          } catch {
            showNotification('Error', 'Could not undo.', 'error');
          }
        },
      },
    });
  }, [showNotification]);

  // Hides the task everywhere and delays the real DELETE until the toast expires.
  // Call this BEFORE removing the task from page state.
  const deleteWithUndo = useCallback((task) => {
    scheduleDelete(task.id, UNDO_MS + DELETE_GRACE_MS, {
      onCommitted: notifyUpdated,
      onFailed: () => {
        notifyUpdated();
        showNotification('Error', `Could not delete "${task.title}".`, 'error');
      },
    });

    showNotification('Task deleted', `"${task.title}" was deleted.`, 'error', {
      duration: UNDO_MS,
      replaceKey: 'undo',
      action: {
        label: 'Undo',
        onClick: () => {
          if (cancelDelete(task.id)) {
            notifyUpdated();
            showNotification('Task restored', `"${task.title}" is back in your tasks.`, 'info');
          } else {
            showNotification('Too late', 'That task was already deleted.', 'error');
          }
        },
      },
    });
  }, [showNotification]);

  return { notifyCompleted, deleteWithUndo };
}
