import { useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserMenu from '../layout/UserMenu';

/**
 * Fixed top-right controls shown on every page:
 *  - sliding day/night switch
 *  - user menu (name -> email + sign out) when logged in
 *  - Log in / Sign up buttons (only when logged out, and not on the
 *    Login / Signup pages themselves, which already have their own links)
 */
export default function TopBar() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'light'
  );
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    const root = document.documentElement;

    const apply = () => {
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('taskflow-theme', next); } catch (e) { /* ignore */ }
      flushSync(() => setTheme(next));
    };

    // Per-element transitions on color make inherited text lag and then snap
    // (the flicker). So switch themes with transitions off, and let the browser
    // cross-fade the whole page instead.
    root.classList.add('theme-switching');
    const done = () => root.classList.remove('theme-switching');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (document.startViewTransition && !reduceMotion) {
      const vt = document.startViewTransition(apply);
      vt.finished.then(done, done);
    } else {
      apply();
      void root.offsetHeight; // flush styles while transitions are disabled
      requestAnimationFrame(done);
    }
  };

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const showAuth = !loading && !user && !isAuthPage;

  return (
    <div className="topbar">
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Switch to day mode' : 'Switch to night mode'}
        title={isDark ? 'Switch to day mode' : 'Switch to night mode'}
        className="theme-switch"
        onClick={toggleTheme}
      >
        {/* faint icons on the track */}
        <svg className="theme-switch-bg left" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
        <svg className="theme-switch-bg right" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>

        {/* sliding knob showing the current mode */}
        <span className="theme-switch-thumb">
          {isDark ? (
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          )}
        </span>
      </button>

      {!loading && user && <UserMenu />}

      {showAuth && (
        <>
          <Link to="/login" className="topbar-link">
            Log in
          </Link>
          <Link to="/signup" className="topbar-btn">
            Sign up
          </Link>
        </>
      )}
    </div>
  );
}
