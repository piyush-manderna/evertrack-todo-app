import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import EditTaskModal from '../tasks/EditTaskModal';
import { useNotification } from '../../context/NotificationContext';
import { withoutPendingDeletes } from '../../utils/pendingDeletes';

const ANIM_MS = 180;

export default function SearchBar() {
  const { showNotification } = useNotification();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false); // mounted
  const [visible, setVisible] = useState(false);     // animated in
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedTask, setSelectedTask] = useState(null);

  const debounceRef = useRef(null);
  const closeTimerRef = useRef(null);
  const requestIdRef = useRef(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const openPopup = () => {
    clearTimeout(closeTimerRef.current);
    setPopupOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };

  const closePopup = useCallback(() => {
    setVisible(false);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setPopupOpen(false);
      setQuery('');
      setResults([]);
      setActiveIndex(0);
    }, ANIM_MS);
  }, []);

  // Focus the input as soon as the popup mounts
  useEffect(() => {
    if (popupOpen) inputRef.current?.focus();
  }, [popupOpen]);

  // Debounced search
  useEffect(() => {
    if (!popupOpen) return;

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const myId = ++requestIdRef.current;
      setLoading(true);
      try {
        const res = await api.get(`/tasks/search?q=${encodeURIComponent(query)}`);
        if (myId !== requestIdRef.current) return; // a newer search replaced this one
        setResults(withoutPendingDeletes(res.data.tasks || []));
        setActiveIndex(0);
      } catch {
        if (myId === requestIdRef.current) setResults([]);
      } finally {
        if (myId === requestIdRef.current) setLoading(false);
      }
    }, 280);

    return () => clearTimeout(debounceRef.current);
  }, [query, popupOpen]);

  // Esc closes the popup
  useEffect(() => {
    if (!popupOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closePopup();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [popupOpen, closePopup]);

  // Clean up timers on unmount
  useEffect(() => () => {
    clearTimeout(debounceRef.current);
    clearTimeout(closeTimerRef.current);
  }, []);

  // Keep the highlighted result scrolled into view
  useEffect(() => {
    const el = listRef.current?.querySelector('.search-modal-item.active');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, results]);

  // Parse YYYY-MM-DD manually so the date never shifts with timezone
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return '';
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    closePopup();
  };

  const handleInputKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleTaskClick(results[activeIndex]);
    }
  };

  const handleUpdated = (updated) => {
    setSelectedTask(null);
    showNotification('Task updated', `"${updated.title}" was updated.`, 'info');
    window.dispatchEvent(new CustomEvent('tasks-updated'));
  };

  const hasQuery = query.trim().length > 0;

  return (
    <div className="search-container">
      {/* Sidebar field: looks like a search bar, opens the popup on click */}
      <div className="search-input-wrap">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <button
          type="button"
          className="search-input search-trigger"
          onClick={openPopup}
          aria-haspopup="dialog"
        >
          Search tasks...
        </button>
      </div>

      {/* Popup (same overlay + card as Add Task) */}
      {popupOpen && createPortal(
        <div
          className={`modal-overlay search-overlay ${visible ? 'visible' : ''}`}
          onMouseDown={(e) => { if (e.target === e.currentTarget) closePopup(); }}
        >
          <div
            className={`modal search-modal ${visible ? 'visible' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Search tasks"
          >
            <div className="modal-header">
              <h2>Search Tasks</h2>
              <button className="modal-close" onClick={closePopup} aria-label="Close search">✕</button>
            </div>

            <div className="search-input-wrap">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="search-input"
                placeholder="Search tasks..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                autoComplete="off"
              />
              {query && (
                <button className="search-clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Clear search">✕</button>
              )}
            </div>

            <div className="search-modal-results" ref={listRef}>
              {!hasQuery && (
                <div className="search-modal-empty">Type to search all your tasks, including completed ones.</div>
              )}
              {hasQuery && loading && results.length === 0 && (
                <div className="search-modal-empty">Searching...</div>
              )}
              {hasQuery && !loading && results.length === 0 && (
                <div className="search-modal-empty">No tasks match your search</div>
              )}
              {hasQuery && results.map((task, i) => (
                <div
                  key={task.id}
                  className={`search-modal-item ${i === activeIndex ? 'active' : ''}`}
                  onClick={() => handleTaskClick(task)}
                  onMouseEnter={() => setActiveIndex(i)}
                  title="Click to view/edit"
                >
                  <span className={`search-modal-item-title ${task.completed ? 'is-done' : ''}`}>{task.title}</span>
                  <span className="search-modal-item-meta">
                    {task.task_date && (
                      <span className="search-modal-item-date">{formatDate(task.task_date)}</span>
                    )}
                    <span className={task.completed ? 'search-done-badge' : 'search-pending-badge'}>
                      {task.completed ? 'Completed' : 'Pending'}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div className="search-modal-hint">
              <span><kbd className="sidebar-kbd">↑</kbd><kbd className="sidebar-kbd">↓</kbd> navigate</span>
              <span><kbd className="sidebar-kbd">Enter</kbd> open</span>
              <span><kbd className="sidebar-kbd">Esc</kbd> close</span>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedTask && (
        <EditTaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
