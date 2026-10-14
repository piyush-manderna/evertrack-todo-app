import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { useNotification } from '../context/NotificationContext';

function CountUp({ target = 0 }) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!target) { setValue(0); return; }
    const duration = 650;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(ease * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return <>{value}</>;
}

export default function Stats() {
  const { showNotification } = useNotification();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/tasks/stats');
      setStats(res.data);
    } catch {
      showNotification('Error', 'Could not load stats.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchStats();
    const handleRefresh = () => fetchStats();
    window.addEventListener('tasks-updated', handleRefresh);
    return () => window.removeEventListener('tasks-updated', handleRefresh);
  }, [fetchStats]);

  if (loading) return <div className="page-loading">Loading stats...</div>;
  if (!stats) return null;

  const statCards = [
    { label: 'Total Tasks', value: stats.total, color: '#18181b' },
    { label: 'Completed', value: stats.completed, color: '#22c55e' },
    { label: 'Pending', value: stats.pending, color: '#ea580c' },
    { label: 'Overdue', value: stats.overdue, color: '#ef4444' },
    { label: 'Done Today', value: stats.completedToday, color: '#3b82f6' },
    { label: 'Done This Week', value: stats.completedThisWeek, color: '#8b5cf6' },
  ];

  return (
    <div className="page stats-page">
      <div className="page-header">
        <h1 className="page-title">Stats</h1>
        <p className="page-date">Your Productivity Overview</p>
      </div>

      {/* Completion ring */}
      <div className="stats-highlight">
        <div className="stats-ring">
          <svg viewBox="0 0 120 120" width="80" height="80">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke="#ea580c"
              strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - (stats.completionPercentage || 0) / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="stats-ring-label">
            <span className="stats-ring-pct">{stats.completionPercentage || 0}%</span>
            <span className="stats-ring-sub">done</span>
          </div>
        </div>
        <div className="stats-highlight-text">
          <h2>Completion Rate</h2>
          <p>You have completed {stats.completed} out of {stats.total} total recorded tasks.</p>
        </div>
      </div>

      {/* Stat cards grid */}
      <div className="stats-grid">
        {statCards.map(card => (
          <div key={card.label} className="stat-card">
            <div className="stat-value" style={{ color: card.color }}>
              <CountUp target={card.value} />
            </div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
