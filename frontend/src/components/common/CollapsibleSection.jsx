import { useState, useId, useRef, useEffect } from 'react';

// A section heading that folds its content up and down (used for "Overdue" and "Today's Tasks").
//   danger      - red title (for Overdue)
//   collapsible - false = plain heading with no chevron / no folding
export default function CollapsibleSection({
  title, count, danger = false, defaultOpen = true, collapsible = true, children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  // 'settled' = fully open and not animating. Only then may content (like the 3-dot
  // menu) stick out of the section; while folding it has to be clipped.
  const [settled, setSettled] = useState(defaultOpen);
  const timerRef = useRef(null);
  const bodyId = useId();
  const isOpen = collapsible ? open : true;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const toggle = () => {
    clearTimeout(timerRef.current);
    if (open) {
      setSettled(false);
      setOpen(false);
    } else {
      setOpen(true);
      timerRef.current = setTimeout(() => setSettled(true), 300); // after the 260ms unfold
    }
  };

  const label = (
    <>
      {collapsible && (
        <span className="section-chevron" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      )}
      <span className="section-title">{title}</span>
      {count != null && <span className="section-count">({count})</span>}
    </>
  );

  return (
    <div className={`collapsible-section ${danger ? 'is-danger' : ''}`}>
      {collapsible ? (
        <button
          type="button"
          className="section-toggle"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls={bodyId}
        >
          {label}
        </button>
      ) : (
        <div className="section-toggle is-static">{label}</div>
      )}

      <div
        id={bodyId}
        className={`collapsible ${isOpen ? 'open' : ''}`}
        inert={!isOpen ? true : undefined}
      >
        <div className={`collapsible-inner ${isOpen && (settled || !collapsible) ? 'is-settled' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
