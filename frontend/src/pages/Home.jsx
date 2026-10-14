import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FluidBackground from '../components/common/FluidBackground';
import SmoothScroll from '../components/common/SmoothScroll';
import PageScrollbar from '../components/common/PageScrollbar';
import './landing.css';

/* ==========================================================================
   Homepage. Every demo on this page is playable and saves nothing.
   ========================================================================== */

const HEADLINE = "Know what's due today, and what's slipping.";
const TYPED_EXAMPLES = ['Call mum at 5', 'Pay the electricity bill', 'Renew my passport'];
const VOICE_PHRASE = 'Call the bank tomorrow at 10';
const SIM_MINUTES = 12; // how far the hero clock runs before it starts over

/* ---------- helpers ---------- */

// minutes since midnight -> "2:30 PM"
function fmtTime(total) {
  const m = ((total % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  return `${h24 % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

function usePrefersReducedMotion() {
  const [reduced] = useState(
    () => typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  return reduced;
}

function useInView(threshold = 0.4) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen];
}

function useCountUp(target, run, ms = 1100) {
  const reduced = usePrefersReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return undefined;
    if (reduced) { setV(target); return undefined; }
    let raf;
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, ms, reduced]);
  return v;
}

function useTheme() {
  const read = () => document.documentElement.getAttribute('data-theme') || 'light';
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const o = new MutationObserver(() => setTheme(read()));
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => o.disconnect();
  }, []);
  return theme;
}

// Types example phrases into an empty box, one after another
function useTypewriter(phrases, active) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!active) { setText(''); return undefined; }
    let i = 0;
    let n = 0;
    let dir = 1;
    let timer;
    const step = () => {
      const p = phrases[i];
      n += dir;
      setText(p.slice(0, n));
      let delay = dir === 1 ? 70 : 32;
      if (dir === 1 && n === p.length) { dir = -1; delay = 1600; }
      else if (dir === -1 && n === 0) { dir = 1; i = (i + 1) % phrases.length; delay = 450; }
      timer = setTimeout(step, delay);
    };
    timer = setTimeout(step, 700);
    return () => clearTimeout(timer);
  }, [active, phrases]);
  return text;
}

// Completing a row: the circle fills and ticks, the row folds away, then it is gone
function useRowStates() {
  const [states, setStates] = useState({});
  const complete = useCallback(id => {
    setStates(s => (s[id] ? s : { ...s, [id]: 'done' }));
    setTimeout(() => setStates(s => ({ ...s, [id]: 'leaving' })), 420);
    setTimeout(() => setStates(s => ({ ...s, [id]: 'gone' })), 740);
  }, []);
  const reset = useCallback(() => setStates({}), []);
  return [states, complete, reset];
}

/* ---------- small pieces ---------- */

function LogoMark() {
  return (
    <svg className="home-logo-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="32" height="30" rx="8" fill="currentColor" />
      <rect x="14" y="2" width="12" height="7" rx="3" fill="currentColor" opacity="0.6" />
      <path d="m12 22 6 6 11-12" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const Tick = ({ drawn }) => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path className={`lp-tick${drawn ? ' is-drawn' : ''}`} d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

const MicIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

/* One task row, styled by the real app's .task-card.
   state: undefined | 'done' | 'leaving'  (set by useRowStates) */
function TaskRow({ title, meta, overdue, state, onComplete, fresh, slip, cue }) {
  const done = state === 'done' || state === 'leaving';
  return (
    <div className={`lp-wrap${state === 'leaving' ? ' is-leaving' : ''}`}>
      <div className="lp-wrap-inner">
        <div className={`task-card${overdue ? ' task-overdue' : ''}${fresh ? ' lp-fresh' : ''}${slip ? ' lp-slip' : ''}`}>
          <div className="task-card-left">
            {onComplete ? (
              <button
                type="button"
                className={`completion-circle lp-circle${done ? ' completing' : ''}${cue ? ' is-cue' : ''}`}
                aria-label={`Complete ${title}`}
                onClick={onComplete}
                disabled={done}
              >
                <Tick />
              </button>
            ) : (
              <span className="completion-circle lp-circle is-static" aria-hidden="true" />
            )}
            <div className="task-card-content">
              <span className={`task-title${done ? ' is-finished' : ''}`}>{title}</span>
              {meta && (
                <div className="task-meta">
                  {overdue
                    ? <span className="task-overdue-badge">{meta}</span>
                    : <span className="task-time">{meta}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Hero: a live Today page. Its clock runs, tasks slip into Overdue on their
   own, and the visitor can finish tasks or add one. Hovering or typing pauses
   the clock so nothing moves under the cursor.
   ========================================================================== */
function HeroDemo() {
  const reduced = usePrefersReducedMotion();

  // The demo clock starts at the visitor's real time and runs a minute per second
  const start = useMemo(() => {
    const d = new Date();
    return Math.min(1200, Math.max(240, d.getHours() * 60 + d.getMinutes()));
  }, []);
  const dateLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
    []
  );
  const tasks = useMemo(() => {
    const nice = m => Math.ceil(m / 5) * 5;
    const dentist = nice(start + 3);
    return [
      { id: 'update', title: 'Send the project update', due: nice(start - 150) },
      { id: 'dentist', title: 'Book dentist appointment', due: dentist },
      { id: 'invoice', title: 'Submit the invoice', due: dentist + 4 }, // always a different time, and still inside the demo's 12 minutes
      { id: 'groceries', title: 'Buy groceries for the week', due: nice(start + 210) },
    ];
  }, [start]);

  const [step, setStep] = useState(0);
  const [hover, setHover] = useState(false);
  const [focusIn, setFocusIn] = useState(false);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const [added, setAdded] = useState([]);
  const [used, setUsed] = useState(false); // the one-time pulse stops after the first interaction
  const [states, complete, resetStates] = useRowStates();
  const inputRef = useRef(null);
  const idRef = useRef(0);
  const hold = hover || focusIn;

  useEffect(() => {
    if (reduced || hold) return undefined;
    const id = setInterval(() => setStep(s => (s >= SIM_MINUTES + 3 ? 0 : s + 1)), 1000);
    return () => clearInterval(id);
  }, [reduced, hold]);

  // The page-wide Q shortcut asks the hero box to take focus
  useEffect(() => {
    const focusBox = () => {
      const el = inputRef.current;
      if (!el) return;
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    };
    window.addEventListener('lp-hero-focus', focusBox);
    return () => window.removeEventListener('lp-hero-focus', focusBox);
  }, [reduced]);

  const typed = useTypewriter(TYPED_EXAMPLES, !reduced && !focused && !draft);

  const nowMin = start + Math.min(step, SIM_MINUTES);
  const live = tasks.filter(t => states[t.id] !== 'gone');
  const overdue = live.filter(t => t.due < nowMin);
  const today = live.filter(t => t.due >= nowMin);
  const extras = added.filter(t => states[t.id] !== 'gone');
  const empty = overdue.length === 0 && today.length === 0 && extras.length === 0;

  const submit = e => {
    e.preventDefault();
    const title = draft.trim().slice(0, 60);
    if (!title) return;
    idRef.current += 1;
    setUsed(true);
    setAdded(a => [...a, { id: `new-${idRef.current}`, title, due: null }].slice(-4));
    setDraft('');
  };

  const reset = () => {
    resetStates();
    setAdded([]);
    setStep(0);
  };

  const row = (t, isOverdue) => (
    <TaskRow
      key={t.id}
      title={t.title}
      overdue={isOverdue}
      meta={t.due == null ? 'Added just now' : isOverdue ? `Overdue · ${fmtTime(t.due)}` : fmtTime(t.due)}
      state={states[t.id]}
      onComplete={() => { setUsed(true); complete(t.id); }}
      slip={isOverdue && t.due >= start}
      fresh={!isOverdue}
      cue={!used && t.id === 'groceries'}
    />
  );

  return (
    <div
      className="lp-panel lp-hero-card"
      role="group"
      aria-label="Interactive demo of the Today page"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocusIn(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocusIn(false); }}
    >
      <div className="lp-card-head">
        <div>
          <strong>Today</strong>
          <span className="lp-card-date">{dateLabel}</span>
        </div>
        <span className="lp-clock" title="Demo clock">
          <i className={`lp-live-dot${hold || reduced ? ' is-paused' : ''}`} />
          {fmtTime(nowMin)}
        </span>
      </div>

      {overdue.length > 0 && (
        <section className="lp-sec">
          <h3 className="section-heading overdue-heading">
            <span className="overdue-dot" /> Overdue <span className="section-count">({overdue.length})</span>
          </h3>
          <div className="task-list">{overdue.map(t => row(t, true))}</div>
        </section>
      )}

      {(today.length > 0 || extras.length > 0) && (
        <section className="lp-sec">
          <h3 className="section-heading">
            Today's Tasks <span className="section-count">({today.length + extras.length})</span>
          </h3>
          <div className="task-list">
            {today.map(t => row(t, false))}
            {extras.map(t => row(t, false))}
          </div>
        </section>
      )}

      {empty && (
        <div className="lp-clear">
          <span className="lp-clear-icon"><Tick drawn /></span>
          <div>
            <strong>All clear</strong>
            <span>Nothing due right now.</span>
          </div>
          <button type="button" className="lp-link" onClick={reset}>Reset demo</button>
        </div>
      )}

      <form className="lp-add" onSubmit={submit}>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onFocus={() => { setFocused(true); setUsed(true); }}
          onBlur={() => setFocused(false)}
          placeholder={typed || 'Add a task'}
          maxLength={60}
          aria-label="Add a task to the demo"
        />
        <kbd className="sidebar-kbd" aria-hidden="true">Q</kbd>
      </form>
      <p className="lp-demo-hint">Tap a circle to finish a task, or type one and press Enter.</p>
    </div>
  );
}

/* ==========================================================================
   Feature demos
   ========================================================================== */

/* Overdue: the clock sweeps past 9:00 once when it scrolls in, then it's yours */
function TimeDemo() {
  const reduced = usePrefersReducedMotion();
  const [ref, seen] = useInView(0.5);
  const [mins, setMins] = useState(527);
  const touched = useRef(false);

  useEffect(() => {
    if (!seen || reduced) return undefined;
    let m = 527;
    const id = setInterval(() => {
      if (touched.current) { clearInterval(id); return; }
      m += 1;
      setMins(m);
      if (m >= 548) clearInterval(id);
    }, 140);
    return () => clearInterval(id);
  }, [seen, reduced]);

  const overdue = mins >= 540;
  return (
    <div ref={ref}>
      <div className="lp-time">
        <span>Drag the clock</span>
        <b>{fmtTime(mins)}</b>
      </div>
      <div className="lp-range-wrap">
        <span className="lp-range-mark" aria-hidden="true" />
        <input
          className="lp-range"
          type="range"
          min="510"
          max="570"
          value={mins}
          aria-label="Time of day"
          onPointerDown={() => { touched.current = true; }}
          onChange={e => { touched.current = true; setMins(Number(e.target.value)); }}
        />
      </div>
      <div className="lp-range-scale" aria-hidden="true">
        <span>8:30 AM</span>
        <span>Due 9:00 AM</span>
        <span>9:30 AM</span>
      </div>

      <h3 className={`section-heading lp-gap${overdue ? ' overdue-heading' : ''}`}>
        <span className="overdue-dot" /> Overdue <span className="section-count">({overdue ? 1 : 0})</span>
      </h3>
      <div className="task-list lp-slot">
        {overdue
          ? <TaskRow key="o" overdue title="Send the project update" meta="Overdue · 9:00 AM" slip />
          : <p className="lp-empty">Nothing overdue</p>}
      </div>

      <h3 className="section-heading lp-gap">
        Today's Tasks <span className="section-count">({overdue ? 1 : 2})</span>
      </h3>
      <div className="task-list lp-slot lp-slot-2">
        {!overdue && <TaskRow key="t" title="Send the project update" meta="9:00 AM" fresh />}
        <TaskRow title="Review the budget" meta="11:00 AM" />
      </div>
    </div>
  );
}

/* Upcoming: click "+ Add task" under any day and type */
function UpcomingDemo() {
  const [ref, seen] = useInView(0.5);
  const days = useMemo(() => [1, 2, 3].map(n => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  }), []);
  const base = useMemo(() => [
    [{ id: 'u1', title: 'Submit the invoice', meta: '10:00 AM' }],
    [{ id: 'u2', title: 'Team lunch', meta: '1:00 PM' }],
    [{ id: 'u3', title: 'Renew gym membership' }],
  ], []);

  const [extra, setExtra] = useState([[], [], []]);
  const [open, setOpen] = useState(-1);
  const [draft, setDraft] = useState('');
  const [used, setUsed] = useState(false);
  const [states, complete] = useRowStates();
  const idRef = useRef(0);

  const close = () => { setOpen(-1); setDraft(''); };
  const submit = (e, i) => {
    e.preventDefault();
    const title = draft.trim().slice(0, 50);
    if (title) {
      idRef.current += 1;
      const task = { id: `x${idRef.current}`, title, meta: 'Added just now', fresh: true };
      setExtra(x => x.map((list, j) => (j === i ? [...list, task].slice(-3) : list)));
    }
    close();
  };

  return (
    <div ref={ref}>
      {days.map((label, i) => (
        <div className="lp-day" key={label}>
          <h3 className="lp-day-title">{label}</h3>
          <div className="task-list">
            {[...base[i], ...extra[i]]
              .filter(t => states[t.id] !== 'gone')
              .map(t => (
                <TaskRow
                  key={t.id}
                  title={t.title}
                  meta={t.meta}
                  fresh={t.fresh}
                  state={states[t.id]}
                  onComplete={() => complete(t.id)}
                />
              ))}
          </div>
          {open === i ? (
            <form className="lp-day-form" onSubmit={e => submit(e, i)}>
              <input
                className="lp-input"
                autoFocus
                value={draft}
                maxLength={50}
                placeholder="Task name, then Enter"
                aria-label={`Add a task on ${label}`}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') close(); }}
                onBlur={() => { if (!draft.trim()) close(); }}
              />
            </form>
          ) : (
            <button
              type="button"
              className={`lp-add-row${seen && !used && i === 1 ? ' is-cue' : ''}`}
              onClick={() => { setUsed(true); setDraft(''); setOpen(i); }}
            >
              + Add task
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* Finished: restore a task and it folds out of the list */
const DONE_TASKS = ['Send the project update', 'Book dentist appointment', 'Buy groceries for the week'];

function FinishedDemo() {
  const [ref, seen] = useInView(0.5);
  const [items, setItems] = useState(DONE_TASKS);
  const [leaving, setLeaving] = useState(null);
  const [note, setNote] = useState('');
  const [used, setUsed] = useState(false);

  const restore = t => {
    if (leaving) return;
    setUsed(true);
    setLeaving(t);
    setNote(`${t} is back in Today.`);
    setTimeout(() => { setItems(list => list.filter(x => x !== t)); setLeaving(null); }, 320);
  };
  const reset = () => { setItems(DONE_TASKS); setNote(''); };

  return (
    <div ref={ref}>
      <div className="lp-done-list">
        {items.map((t, idx) => (
          <div className={`lp-wrap${leaving === t ? ' is-leaving' : ''}`} key={t}>
            <div className="lp-wrap-inner">
              <div className="lp-done">
                <span className="lp-done-check"><Tick drawn /></span>
                <span className="lp-done-title">{t}</span>
                <button
                  type="button"
                  className={`lp-restore${seen && !used && idx === 0 ? ' is-cue' : ''}`}
                  onClick={() => restore(t)}
                >
                  Restore
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="lp-clear">
            <span className="lp-clear-icon"><Tick drawn /></span>
            <div>
              <strong>All back in Today</strong>
              <span>Every task was restored.</span>
            </div>
            <button type="button" className="lp-link" onClick={reset}>Reset</button>
          </div>
        )}
      </div>
      <p className="lp-demo-hint" aria-live="polite">{note || 'Click Restore to bring a task back.'}</p>
    </div>
  );
}

/* Stats: the ring draws and the numbers count up when it scrolls in */
function StatsInner({ onReplay }) {
  const [ref, seen] = useInView(0.5);
  const pct = useCountUp(86, seen);
  const done = useCountUp(24, seen);
  const pending = useCountUp(3, seen);
  const late = useCountUp(1, seen);
  return (
    <div ref={ref}>
      <div className="lp-stats">
        <div className="lp-ring">
          <svg viewBox="0 0 120 120" width="132" height="132" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="lp-ring-track" />
            <circle
              cx="60" cy="60" r="52" fill="none" strokeWidth="10" strokeLinecap="round"
              strokeDasharray="326.7"
              style={{ strokeDashoffset: seen ? 45.7 : 326.7 }}
              className="lp-ring-fill"
            />
          </svg>
          <span className="lp-ring-num">{pct}%</span>
        </div>
        <div className="lp-metrics">
          <div className="lp-metric"><span>Completed</span><b>{done}</b></div>
          <div className="lp-metric"><span>Pending</span><b>{pending}</b></div>
          <div className="lp-metric"><span>Overdue</span><b>{late}</b></div>
        </div>
      </div>
      <button type="button" className="lp-link lp-replay" onClick={onReplay}>Replay</button>
    </div>
  );
}

function StatsDemo() {
  const [run, setRun] = useState(0);
  return <StatsInner key={run} onReplay={() => setRun(r => r + 1)} />;
}

/* Quick add: press Q (or the key), or tap the mic. The voice demo types a sample task. */
function QuickDemo() {
  const reduced = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const [saved, setSaved] = useState([]);
  const inputRef = useRef(null);
  const timers = useRef([]);
  const idRef = useRef(0);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const openCard = useCallback(() => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
  }, []);

  useEffect(() => {
    window.addEventListener('lp-quick-open', openCard);
    return () => window.removeEventListener('lp-quick-open', openCard);
  }, [openCard]);

  const closeCard = () => {
    clearTimers();
    setOpen(false);
    setListening(false);
    setDraft('');
  };

  const save = e => {
    e.preventDefault();
    const title = draft.trim().slice(0, 60);
    if (!title) return;
    idRef.current += 1;
    setSaved(s => [{ id: `q${idRef.current}`, title }, ...s].slice(0, 2));
    closeCard();
  };

  const speak = () => {
    if (listening) return;
    clearTimers();
    setOpen(true);
    setDraft('');
    setListening(true);
    const later = (ms, fn) => timers.current.push(setTimeout(fn, ms));
    if (reduced) {
      later(900, () => { setListening(false); setDraft(VOICE_PHRASE); });
      return;
    }
    later(1500, () => {
      setListening(false);
      let i = 0;
      const type = () => {
        i += 1;
        setDraft(VOICE_PHRASE.slice(0, i));
        if (i < VOICE_PHRASE.length) timers.current.push(setTimeout(type, 45));
      };
      type();
    });
  };

  return (
    <div className="lp-quick" id="lp-quick">
      <button type="button" className="lp-quick-item" onClick={openCard}>
        <kbd className="sidebar-kbd lp-keycap">Q</kbd>
        <span className="lp-quick-text">
          <strong>Press Q</strong>
          <span>From any page, to add a task</span>
        </span>
      </button>

      <button type="button" className={`lp-quick-item${listening ? ' is-listening' : ''}`} onClick={speak}>
        <span className="lp-mic">
          {listening
            ? <span className="lp-wave" aria-hidden="true"><i /><i /><i /><i /></span>
            : <MicIcon />}
        </span>
        <span className="lp-quick-text">
          <strong>{listening ? 'Listening…' : 'Say it'}</strong>
          <span>Tap the mic and speak your task</span>
        </span>
      </button>

      <div className={`lp-collapse${open ? ' is-open' : ''}`}>
        <div className="lp-collapse-inner">
          <form
            className="lp-quick-card"
            onSubmit={save}
            onKeyDown={e => { if (e.key === 'Escape') closeCard(); }}
          >
            <div className="lp-quick-card-head">
              <strong>Add Task</strong>
              <button type="button" className="lp-x" aria-label="Close" onClick={closeCard}>×</button>
            </div>
            <input
              ref={inputRef}
              className="lp-input"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={listening ? 'Listening…' : 'What needs doing?'}
              maxLength={60}
              disabled={listening}
              aria-label="Task title"
            />
            <div className="lp-quick-card-actions">
              <button type="button" className="btn-secondary" onClick={closeCard}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={!draft.trim()}>Add task</button>
            </div>
          </form>
        </div>
      </div>

      {saved.length > 0 && (
        <div className="lp-saved">
          <h3 className="section-heading">Today's Tasks</h3>
          <div className="task-list">
            {saved.map(t => <TaskRow key={t.id} title={t.title} meta="Added to Today" fresh />)}
          </div>
        </div>
      )}
      <p className="lp-demo-hint">The mic here types a sample task, so you can see the flow.</p>
    </div>
  );
}

/* Tapping a swatch presses the real theme switch in the top bar, so both stay in sync */
function ModesDemo() {
  const theme = useTheme();
  const pick = want => { if (theme !== want) document.querySelector('.theme-switch')?.click(); };
  return (
    <>
      <div className="lp-modes-pair">
        <button type="button" aria-pressed={theme === 'light'} className={`lp-mode lp-mode-light${theme === 'light' ? ' is-current' : ''}`} onClick={() => pick('light')}>
          <b>Day</b><i>Send the update</i><i>Book dentist</i>
        </button>
        <button type="button" aria-pressed={theme === 'dark'} className={`lp-mode lp-mode-dark${theme === 'dark' ? ' is-current' : ''}`} onClick={() => pick('dark')}>
          <b>Night</b><i>Send the update</i><i>Book dentist</i>
        </button>
      </div>
      <p className="lp-demo-hint">Tap one. It flips the whole page.</p>
    </>
  );
}

function FeatureRow({ title, text, flip, top, children }) {
  return (
    <section className="lp-band" data-fade>
      <div className={`lp-row${flip ? ' is-flip' : ''}${top ? ' is-top' : ''}`}>
        <div className="lp-row-copy">
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <div className="lp-panel">{children}</div>
      </div>
    </section>
  );
}

/* Q opens Add Task in the quick-add demo when it is on screen, otherwise it
   jumps to the hero box (like the real app, which opens Add Task anywhere) */
function QKey() {
  useEffect(() => {
    const onKey = e => {
      if (e.key.toLowerCase() !== 'q' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable) return;
      e.preventDefault();
      const r = document.getElementById('lp-quick')?.getBoundingClientRect();
      const visible = r && r.top < window.innerHeight * 0.75 && r.bottom > window.innerHeight * 0.25;
      window.dispatchEvent(new CustomEvent(visible ? 'lp-quick-open' : 'lp-hero-focus'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}

/* ==========================================================================
   Scroll fade. Each section fades in as it rises into view and fades out as
   it leaves, so only one or two are readable at a time. The opacity follows
   the scroll position (it is not a one-off trigger), so scrolling back up
   works just as smoothly. Skipped when the visitor prefers reduced motion.
   Any element inside <main> with a data-fade attribute takes part.
   ========================================================================== */
const ease01 = t => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

function FadeMain({ children }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const items = Array.from(root.querySelectorAll('[data-fade]'));
    let raf = 0;

    // The fade follows a section's content, not its empty padding, so adding or
    // removing space between sections never changes how the fade feels.
    let pads = [];
    const measure = () => {
      pads = items.map(el => {
        const cs = getComputedStyle(el);
        return [parseFloat(cs.paddingTop) || 0, parseFloat(cs.paddingBottom) || 0];
      });
    };

    const apply = () => {
      raf = 0;
      const H = window.innerHeight;
      items.forEach((el, i) => {
        // measure where the section would be without its own slide-up offset
        const shift = Number(el.dataset.fadeShift || 0);
        const r = el.getBoundingClientRect();
        const top = r.top - shift + pads[i][0];
        const bottom = r.bottom - shift - pads[i][1];
        const enter = ease01((H - top) / (H * 0.3));          // 0 at the screen's bottom edge, 1 once it is 30% up
        const exit = ease01((bottom - H * 0.1) / (H * 0.35)); // 1 until its bottom passes 45%, 0 at 10%
        const o = Math.min(enter, exit);
        const nextShift = (1 - enter) * 36;
        el.dataset.fadeShift = nextShift.toFixed(1);
        el.style.opacity = o.toFixed(3);
        el.style.transform = nextShift > 0.1 ? `translateY(${nextShift.toFixed(1)}px)` : '';
        el.style.pointerEvents = o < 0.3 ? 'none' : ''; // a faded section never catches stray clicks
      });
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };

    measure();
    apply();
    const onResize = () => { measure(); schedule(); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    if (ro) items.forEach(el => ro.observe(el));

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
      items.forEach(el => {
        el.style.opacity = '';
        el.style.transform = '';
        el.style.pointerEvents = '';
        delete el.dataset.fadeShift;
      });
    };
  }, []);

  return <main className="home-main" ref={ref}>{children}</main>;
}

/* The header is clear at the top of the page and turns to frosted glass once
   you scroll (the look itself is in landing.css) */
function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`home-header${scrolled ? ' is-scrolled' : ''}`}>
      <Link to="/" className="home-logo">
        <LogoMark />
        <span>ToDo</span>
      </Link>
    </header>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <div className="auth-loading"><div className="spinner" /></div>;
  if (user) return <Navigate to="/today" replace />;

  return (
    <div className="home-page lp-page">
      <SmoothScroll />
      <PageScrollbar />
      <FluidBackground />
      <QKey />

      <LandingHeader />

      <FadeMain>
        {/* ---------- Hero ---------- */}
        <section className="lp-hero" data-fade>
          <div className="lp-hero-copy">
            <h1>
              <span className="lp-sr">{HEADLINE}</span>
              <span aria-hidden="true">
                {HEADLINE.split(' ').map((w, i) => (
                  <Fragment key={i}>
                    <span className="lp-word"><span style={{ '--i': i }}>{w}</span></span>{' '}
                  </Fragment>
                ))}
              </span>
            </h1>
            <p className="lp-fade" style={{ '--d': '650ms' }}>
              ToDo keeps today, upcoming and finished tasks in one calm place.
              Add a task in a second, and let deadlines sort themselves out.
            </p>
            <div className="home-cta lp-fade" style={{ '--d': '800ms' }}>
              <Link to="/signup" className="btn-primary home-cta-main">Create free account</Link>
            </div>
          </div>

          <div className="lp-hero-visual lp-fade" style={{ '--d': '450ms' }}>
            <HeroDemo />
          </div>
        </section>

        {/* ---------- Feature rows ---------- */}
        <div className="lp-rows">
          <FeatureRow
            title="Overdue sorts itself"
            text="The moment a deadline passes, the task slides from Today into Overdue. You never refresh, and nothing slips by unseen."
          >
            <TimeDemo />
          </FeatureRow>

          <FeatureRow
            flip
            top
            title="A year ahead, one day at a time"
            text="Upcoming lays out the next 365 days by date. Add a task straight into any day without opening a form."
          >
            <UpcomingDemo />
          </FeatureRow>

          <FeatureRow
            title="Finished, and one click from back"
            text="Completed tasks stay in Finished for a week, and a single click brings one back. Older ones stay saved even after they leave the list."
          >
            <FinishedDemo />
          </FeatureRow>

          <FeatureRow
            flip
            title="See how your week really went"
            text="Stats shows your completion rate as a ring and counts your numbers up, so you can tell at a glance whether you're keeping pace."
          >
            <StatsDemo />
          </FeatureRow>

          <FeatureRow
            top
            title="Add a task in a second"
            text="Press Q anywhere to open Add Task, or tap the mic and say it out loud. Either way, it's saved before you lose the thought."
          >
            <QuickDemo />
          </FeatureRow>

          <FeatureRow
            flip
            title="Day or night, one switch"
            text="Flip the toggle in the corner and the whole app changes with it, easy on the eyes at 2 PM or 2 AM."
          >
            <ModesDemo />
          </FeatureRow>
        </div>

        {/* ---------- Final call to action: one flat block of the accent colour ---------- */}
        <section className="lp-cta" data-fade>
          <div className="lp-cta-inner">
            <div>
              <h2>Start with today.</h2>
              <p>Create an account and add your first task in under a minute.</p>
            </div>
            <div className="lp-cta-actions">
              <Link to="/signup" className="lp-cta-main">Create free account</Link>
            </div>
          </div>
        </section>
      </FadeMain>

      <footer className="home-footer">
        <span>ToDo</span>
        <span>Press <kbd className="sidebar-kbd">Q</kbd> anywhere to add a task once you're in.</span>
      </footer>
    </div>
  );
}
