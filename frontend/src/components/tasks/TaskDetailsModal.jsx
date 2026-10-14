import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// "HH:MM[:SS]" -> "h:MM AM/PM"
function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

// "YYYY-MM-DD" -> "Oct 8, 2026" (parsed manually so it never shifts with timezone)
function formatDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// "YYYY-MM-DD HH:MM:SS" -> "Oct 8, 2026, 2:30 PM"
function formatDateTime(str) {
  if (!str) return null;
  const [datePart, timePart = '00:00'] = String(str).split(/[T ]/);
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, hh || 0, mm || 0).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function TaskDetailsModal({ task, isOverdue = false, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 180);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const isDone = !!task.completed;
  const status = isDone ? 'completed' : isOverdue ? 'overdue' : 'pending';
  const statusLabel = { completed: 'Completed', overdue: 'Overdue', pending: 'Pending' }[status];

  const dateDisplay = formatDate(task.task_date);
  const timeDisplay = formatTime(task.task_time);

  return createPortal(
    <div
      className={`modal-overlay ${visible ? 'visible' : ''}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className={`modal ${visible ? 'visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
      >
        <div className="modal-header">
          <h2>Task Details</h2>
          <button className="modal-close" onClick={close} aria-label="Close">✕</button>
        </div>

        <div className="details-body">
          <div className="details-title-row">
            <h3 className={`details-title ${isDone ? 'is-done' : ''}`}>{task.title}</h3>
            <span className={`details-status ${status}`}>{statusLabel}</span>
          </div>

          <div className="details-row">
            <span className="details-label">Description</span>
            <span className={`details-value details-desc ${task.description ? '' : 'muted'}`}>
              {task.description || 'No description'}
            </span>
          </div>

          <div className="details-grid">
            <div className="details-row">
              <span className="details-label">Date</span>
              <span className={`details-value ${dateDisplay ? '' : 'muted'}`}>{dateDisplay || 'Not set'}</span>
            </div>
            <div className="details-row">
              <span className="details-label">Time</span>
              <span className={`details-value ${timeDisplay ? '' : 'muted'}`}>{timeDisplay || 'Not set'}</span>
            </div>
          </div>

          <div className="details-grid">
            <div className="details-row">
              <span className="details-label">Created</span>
              <span className="details-value">{formatDateTime(task.created_at) || '—'}</span>
            </div>
            {isDone && (
              <div className="details-row">
                <span className="details-label">Completed</span>
                <span className="details-value">{formatDateTime(task.completed_at) || '—'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={close}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
