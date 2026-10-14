import { useEffect, useRef } from 'react';

/*
  CustomCursor: the blob. A rose blob follows the mouse with a little lag,
  stretches in the direction you move, swells and turns see-through over
  buttons and links (so their labels stay readable), and shrinks on click.

  Mount it once. It only runs with a mouse or trackpad (not on touch screens),
  does nothing for visitors who prefer reduced motion, and steps aside over
  text fields so the normal text cursor shows there.
*/

const CSS = `
html.has-blob-cursor,
html.has-blob-cursor *:not(input):not(textarea):not(select):not([contenteditable="true"]):not(.sidebar-resize-handle) {
  cursor: none !important;
}
.blob-cursor {
  position: fixed;
  left: 0;
  top: 0;
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--bg-main) 70%, transparent);
  pointer-events: none;
  z-index: 9999;
  opacity: 0;
  transition: opacity 200ms ease;
  will-change: transform;
}
.blob-cursor.is-on { opacity: 0.9; }
.blob-cursor.is-hot { opacity: 0.3; }
.blob-cursor.is-field { opacity: 0; }
`;

// how much the blob grows over clickable things (1 = no growth, 2.2 was the old size)
const HOT_SCALE = 1.45;

// clickable things: the blob swells and turns see-through over them
const HOT = 'a, button, label, summary, [role="button"], [data-hot], .task-card-clickable, .search-modal-item';
// the real cursor is shown here (text fields, and the sidebar's drag-to-resize edge)
const FIELD = 'input, textarea, select, [contenteditable="true"], .sidebar-resize-handle';

export default function CustomCursor() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const usesMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!el || !usesMouse || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const html = document.documentElement;
    const m = { x: 0, y: 0 }; // where the mouse is
    const b = { x: 0, y: 0 }; // where the blob is
    let shown = false, hot = false, down = false, hs = 1, raf = 0, prev = 0;
    let onBar = false; // pointer is over a scrollbar

    // True when the pointer is on a scrollbar (the page's, or a scrolling panel's).
    // While you drag a scrollbar the browser stops sending mouse moves to the page,
    // so the blob would be left behind. Over a scrollbar we hide it and let the
    // normal cursor show instead.
    const scrollerOf = (t) => {
      for (let n = t; n && n.nodeType === 1; n = n.parentElement) {
        if (n === html || n === document.body) return null; // page scroll: handled by mouseleave
        const oy = getComputedStyle(n).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return n;
      }
      return null;
    };
    // True when the pointer is over, or just next to, the scrollbar of a scrolling panel
    // (like the main work area). Mouse moves stop arriving once the pointer is on the
    // bar, so we also hide the blob a little before it gets there.
    const barWidth = (n) => Math.max(n.offsetWidth - n.clientWidth, 12); // overlay bars report 0
    const overScrollbar = (e) => {
      const n = scrollerOf(e.target);
      if (!n) return false;
      return e.clientX >= n.getBoundingClientRect().right - barWidth(n);
    };
    // Pressing on a scrollbar sends a mousedown aimed at the panel itself, but no pointer
    // events follow while you drag. Catch the press so the blob is hidden before the drag.
    const onMouseDown = (e) => {
      const n = scrollerOf(e.target);
      if (n && e.target === n && e.clientX >= n.getBoundingClientRect().right - barWidth(n)) enterBar();
    };
    const enterBar = () => {
      if (onBar) return;
      onBar = true;
      el.classList.add('is-field');
      html.classList.remove('has-blob-cursor');
    };

    const loop = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000 || 0.016);
      prev = now;
      const k = 1 - Math.exp(-dt / 0.05);
      b.x += (m.x - b.x) * k;
      b.y += (m.y - b.y) * k;
      const dx = m.x - b.x, dy = m.y - b.y, dist = Math.hypot(dx, dy);
      const stretch = 1 + Math.min(dist * 0.035, 1.1);
      const target = hot ? HOT_SCALE : down ? 0.7 : 1;
      hs += (target - hs) * (1 - Math.exp(-dt / 0.08));
      el.style.transform = `translate3d(${b.x}px,${b.y}px,0) rotate(${Math.atan2(dy, dx)}rad) scale(${stretch * hs},${hs / Math.sqrt(stretch)})`;
      // keep animating only while something is still moving
      raf = dist > 0.05 || Math.abs(target - hs) > 0.002 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => {
      if (!raf) { prev = performance.now(); raf = requestAnimationFrame(loop); }
    };

    const onMove = (e) => {
      if (e.pointerType === 'touch') return;
      m.x = e.clientX;
      m.y = e.clientY;
      if (overScrollbar(e)) { enterBar(); return; }
      if (onBar) {
        // back from the scrollbar: jump the blob to the pointer instead of sliding
        onBar = false;
        b.x = m.x;
        b.y = m.y;
        if (shown) html.classList.add('has-blob-cursor');
      }
      if (!shown) {
        shown = true;
        b.x = m.x;
        b.y = m.y;
        el.classList.add('is-on');
        html.classList.add('has-blob-cursor');
      }
      const t = e.target;
      hot = !!(t.closest && t.closest(HOT));
      el.classList.toggle('is-hot', hot);
      el.classList.toggle('is-field', !!(t.closest && t.closest(FIELD)));
      kick();
    };
    const onDown = (e) => { if (overScrollbar(e)) { enterBar(); return; } down = true; kick(); };
    const onUp = () => { down = false; kick(); };
    const onLeave = () => {
      shown = false;
      onBar = false;
      el.classList.remove('is-on');
      html.classList.remove('has-blob-cursor');
    };

    // Dragging a scrollbar scrolls the page without any mouse-move events, so spot it by
    // "scrolling happened but no wheel, key or touch caused it". Hiding the blob by
    // mistake costs nothing: the next mouse move brings it straight back.
    let lastInput = 0;
    const stamp = () => { lastInput = performance.now(); };
    const onScroll = () => { if (shown && performance.now() - lastInput > 350) enterBar(); };
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('wheel', stamp, { passive: true, capture: true });
    window.addEventListener('keydown', stamp, { capture: true });
    window.addEventListener('touchstart', stamp, { passive: true, capture: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    html.addEventListener('mouseleave', onLeave);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('wheel', stamp, true);
      window.removeEventListener('keydown', stamp, true);
      window.removeEventListener('touchstart', stamp, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      html.removeEventListener('mouseleave', onLeave);
      html.classList.remove('has-blob-cursor');
      style.remove();
    };
  }, []);

  return <div ref={ref} className="blob-cursor" aria-hidden="true" />;
}
