import { NavLink } from 'react-router-dom';
import SearchBar from '../common/SearchBar';
import { useState, useCallback, useRef, useEffect } from 'react';

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const COLLAPSED_WIDTH = 64;
const MOBILE_QUERY = '(max-width: 768px)';

export default function Sidebar({ onAddTask }) {
  const [width, setWidth] = useState(260);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const isResizing = useRef(false);

  // Phones: the sidebar becomes a slide-in drawer opened from a menu button
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isCollapsed = collapsed && !isMobile;

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => { if (!isMobile) setMobileOpen(false); }, [isMobile]);

  // Esc closes the drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const closeDrawer = useCallback(() => setMobileOpen(false), []);

  const handleAddTask = () => {
    closeDrawer();
    onAddTask?.();
  };

  // Resize uses pointer events so it works with mouse, pen and touch (tablets)
  const handleMouseMove = useCallback((e) => {
    if (!isResizing.current) return;
    const newW = Math.min(Math.max(e.clientX, MIN_WIDTH), MAX_WIDTH);
    setWidth(newW);
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    setDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('pointermove', handleMouseMove);
    document.removeEventListener('pointerup', handleMouseUp);
  }, [handleMouseMove]);

  const startResize = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;
    setDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', handleMouseMove);
    document.addEventListener('pointerup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  // Press "Q" anywhere (outside inputs) to open Add Task
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'q' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      e.preventDefault();
      onAddTask?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAddTask]);

  const effectiveWidth = isCollapsed ? COLLAPSED_WIDTH : width;

  const navItems = [
    {
      to: '/today',
      label: 'Today',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      to: '/upcoming',
      label: 'Upcoming',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      ),
    },
    {
      to: '/incoming',
      label: 'Incoming',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      ),
    },
    {
      to: '/finished',
      label: 'Finished',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      to: '/stats',
      label: 'Stats',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {isMobile && (
        <>
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {mobileOpen && <div className="sidebar-backdrop" onClick={closeDrawer} />}
        </>
      )}

      <aside
        className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${dragging ? 'resizing' : ''} ${isMobile ? 'is-mobile' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        style={isMobile ? undefined : { width: effectiveWidth }}
        inert={isMobile && !mobileOpen ? true : undefined}
      >
        {/* Header: logo + collapse symbol (top right) */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg className="sidebar-logo-svg" viewBox="0 0 64 64" aria-hidden="true">
              <rect x="12" y="6" width="44" height="52" rx="8" fill="currentColor" />
              <rect x="6" y="15" width="14" height="5" rx="2.5" fill="currentColor" opacity="0.6" />
              <rect x="6" y="29" width="14" height="5" rx="2.5" fill="currentColor" opacity="0.6" />
              <rect x="6" y="43" width="14" height="5" rx="2.5" fill="currentColor" opacity="0.6" />
              <g style={{ fill: 'var(--on-accent)' }}>
                <rect x="28" y="19" width="20" height="4.5" rx="2.2" />
                <rect x="28" y="30" width="20" height="4.5" rx="2.2" opacity="0.8" />
                <rect x="28" y="41" width="13" height="4.5" rx="2.2" opacity="0.65" />
              </g>
            </svg>
            {!isCollapsed && <span className="sidebar-logo-text">ToDo</span>}
          </div>

          <button
            className="sidebar-collapse-icon"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        </div>

        {/* Add Task */}
        <button className="add-task-btn" onClick={handleAddTask} title="Add Task (Q)">
          <span className="add-task-btn-icon">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 4v16M4 12h16" />
            </svg>
          </span>
          {!isCollapsed && <span>Add Task</span>}
          {!isCollapsed && (
            <span className="add-task-btn-hint" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 7v15" />
                <path d="M2 12a1 1 0 00.58.91l5.093 2.316" />
                <path d="M22 12a1 1 0 01-.59.92l-5.077 2.308" />
                <path d="M8 10.37 2.6 7.91a1 1 0 010-1.831l8.57-3.9a2 2 0 011.66.001l8.59 3.91a1 1 0 010 1.831l-5.392 2.45" />
                <path d="m9 19 3 3 3-3" />
              </svg>
            </span>
          )}
        </button>

        {/* Search */}
        {!isCollapsed && (
          <div style={{ display: 'contents' }} onClickCapture={() => { if (isMobile) closeDrawer(); }}>
            <SearchBar />
          </div>
        )}

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
              title={isCollapsed ? item.label : ''}
              onClick={closeDrawer}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {!isCollapsed && <span className="sidebar-nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer: quick tip */}
        {!isCollapsed && (
          <div className="sidebar-footer">
            <div className="sidebar-tip">
              <div className="sidebar-tip-title">Quick tip</div>
              <p className="sidebar-tip-text">
                Press <kbd className="sidebar-kbd">Q</kbd> anywhere to add a task instantly.
              </p>
            </div>
          </div>
        )}

        {/* Drag handle */}
        <div className="sidebar-resize-handle" onPointerDown={startResize} />
      </aside>
    </>
  );
}
