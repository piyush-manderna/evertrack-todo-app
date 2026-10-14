import { useEffect } from 'react';

/*
  SmoothScroll: eases mouse-wheel scrolling instead of jumping, with no library.
  Mount it once. It renders nothing.

  - works on the page and on inner scroll areas (a list, a modal body)
  - touch scrolling, the keyboard and dragging the scrollbar stay native
  - does nothing for visitors who prefer reduced motion
  - skips inputs and anything marked data-no-smooth
  - stays out of the way while a modal has locked the page (overflow: hidden)

  Prop
    smoothness  seconds the scroll takes to catch up with the wheel. Higher
                feels floatier, lower feels snappier. (0.1)
*/

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function SmoothScroll({ smoothness = 0.1 }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const states = new Map(); // scroll container -> { target, pos, last }
    let raf = 0;
    let prev = 0;
    const page = () => document.scrollingElement || document.documentElement;

    const canScroll = (el, dir) => {
      if (!/(auto|scroll)/.test(getComputedStyle(el).overflowY)) return false;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 1) return false;
      return dir > 0 ? el.scrollTop < max - 1 : el.scrollTop > 0;
    };

    // the nearest thing that can still scroll in this direction, like the browser would pick
    const findContainer = (node, dir) => {
      for (let el = node; el && el !== document.documentElement; el = el.parentElement) {
        if (el.hasAttribute && el.hasAttribute('data-no-smooth')) return null;
        if (canScroll(el, dir)) return el;
      }
      const hidden = /hidden/;
      if (hidden.test(getComputedStyle(document.documentElement).overflowY)
        || hidden.test(getComputedStyle(document.body).overflowY)) return null;
      const p = page();
      const max = p.scrollHeight - p.clientHeight;
      if (max <= 1) return null;
      return dir > 0 ? (p.scrollTop < max - 1 ? p : null) : (p.scrollTop > 0 ? p : null);
    };

    const tick = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const k = 1 - Math.exp(-dt / smoothness);
      states.forEach((s, el) => {
        // someone else moved it (scrollbar drag, keyboard, a link): let go
        if (Math.abs(el.scrollTop - s.last) > 2) { states.delete(el); return; }
        s.pos += (s.target - s.pos) * k;
        if (Math.abs(s.target - s.pos) < 0.5) s.pos = s.target;
        el.scrollTo({ top: s.pos, behavior: 'instant' });
        s.last = el.scrollTop;
        if (s.pos === s.target) states.delete(el);
      });
      raf = states.size ? requestAnimationFrame(tick) : 0;
    };

    const onWheel = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dir = Math.sign(e.deltaY);
      if (!dir) return;
      const node = e.target instanceof Element ? e.target : document.body;
      if (node.closest('input, select, [data-no-smooth]')) return;
      const el = findContainer(node, dir);
      if (!el) return;

      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      let s = states.get(el);
      if (!s || Math.abs(el.scrollTop - s.last) > 2) {
        s = { target: el.scrollTop, pos: el.scrollTop, last: el.scrollTop };
        states.set(el, s);
      }
      s.target = clamp(s.target + e.deltaY * unit, 0, el.scrollHeight - el.clientHeight);
      e.preventDefault();
      if (!raf) { prev = performance.now(); raf = requestAnimationFrame(tick); }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      if (raf) cancelAnimationFrame(raf);
      states.clear();
    };
  }, [smoothness]);

  return null;
}
