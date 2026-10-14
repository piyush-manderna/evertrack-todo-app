import { useState, useEffect, useRef } from 'react';
import CompletionCircle from './CompletionCircle';
import ConfirmModal from '../common/ConfirmModal';
import TaskDetailsModal from './TaskDetailsModal';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import useTaskUndo from '../../hooks/useTaskUndo';

function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TaskCard({ task, onComplete, onDelete, onEdit, onRestore, isFinished = false, isOverdue = false, hideDate = false }) {
  const { showNotification } = useNotification();
  const { notifyCompleted, deleteWithUndo } = useTaskUndo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const actionsRef = useRef(null);

  // Close the 3-dot menu when clicking anywhere outside it, or pressing Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await api.patch(`/tasks/${task.id}/complete`);
      setTimeout(() => {
        onComplete(task.id);
        notifyCompleted(task);
      }, 330);
    } catch {
      setCompleting(false);
      showNotification('Error', 'Could not complete task.', 'error');
    }
  };

  // The real DELETE is delayed until the Undo toast expires (see useTaskUndo).
  // deleteWithUndo must run first so refetches triggered by onDelete skip this task.
  const handleDelete = () => {
    setConfirmDelete(false);
    setMenuOpen(false);
    deleteWithUndo(task);
    setRemoving(true);
    setTimeout(() => onDelete(task.id), 320);
  };

  const handleRestore = async () => {
    setMenuOpen(false);
    try {
      await api.patch(`/tasks/${task.id}/restore`);
      onRestore(task.id);
      showNotification('Task restored', `"${task.title}" is back in your tasks.`, 'info');
    } catch {
      showNotification('Error', 'Could not restore task.', 'error');
    }
  };

  // Clicking the card body opens read-only details.
  // Ignore clicks from the 3-dot menu, the confirm dialog, or anything portaled out of the card.
  const handleCardClick = (e) => {
    if (!e.currentTarget.contains(e.target)) return;
    if (e.target.closest('.task-card-actions, .modal-overlay')) return;
    setMenuOpen(false);
    setDetailsOpen(true);
  };

  const handleCardKeyDown = (e) => {
    if (e.target !== e.currentTarget) return; // ignore keys from the circle / menu inside the card
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setMenuOpen(false);
      setDetailsOpen(true);
    }
  };

  const timeDisplay = formatTime(task.task_time);
  const dateDisplay = formatDate(task.task_date);

  return (
    <div className={`task-wrap ${completing || removing ? 'collapsing' : ''}`}>
    <div className="task-wrap-inner">
    <div
      className={`task-card task-card-clickable ${completing ? 'task-completing' : ''} ${removing ? 'task-removing' : ''} ${isOverdue ? 'task-overdue' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={0}
    >
      <div className="task-card-left">
        {!isFinished && (
          <span style={{ display: 'contents' }} onClick={(e) => e.stopPropagation()}>
            <CompletionCircle onComplete={handleComplete} completing={completing} />
          </span>
        )}
        {isFinished && <div className="task-done-icon">✓</div>}
        <div className="task-card-content">
          <span className={`task-title ${isFinished ? 'is-finished' : ''}`}>{task.title}</span>
          {task.description && <span className="task-desc">{task.description}</span>}
          <div className="task-meta">
            {isOverdue && (
              <span className="task-overdue-badge">
                Overdue{timeDisplay ? ` · ${timeDisplay}` : (dateDisplay ? ` · ${dateDisplay}` : '')}
              </span>
            )}
            {!isOverdue && (
              <>
                {dateDisplay && !hideDate && <span className="task-date">{dateDisplay}</span>}
                {timeDisplay && <span className="task-time">{timeDisplay}</span>}
              </>
            )}
            {isFinished && task.completed_at && (
              <span className="task-completed-at">
                Done: {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="task-card-actions" ref={actionsRef}>
        <button
          className="task-menu-btn"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Task options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
        {menuOpen && (
          <div className="task-menu-dropdown">
            {!isFinished && (
              <button onClick={() => { setMenuOpen(false); onEdit(task); }}>✏ Edit</button>
            )}
            {isFinished && (
              <button onClick={handleRestore}>↩ Restore</button>
            )}
            <button className="danger" onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}>✕ Delete</button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete this task?"
          message={`"${task.title}" will be deleted. You'll have a few seconds to undo.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {detailsOpen && (
        <TaskDetailsModal
          task={task}
          isOverdue={isOverdue}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </div>
    </div>
    </div>
  );
}
