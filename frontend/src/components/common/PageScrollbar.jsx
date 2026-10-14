import { useEffect, useRef } from 'react';

/*
  PageScrollbar: replaces the browser's page scrollbar with a thin accent-coloured
  thumb that floats over the page. There is no track at all, so nothing is drawn
  behind it and the fluid background shows all the way to the edge.

  Native scrolling is untouched (wheel, trackpad, keyboard, touch, smooth scroll),
  only the scrollbar is swapped. It does nothing on touch screens, which keep their
  own overlay scrollbar. Mount it once on the page that scrolls.
*/

const CSS = `
html.has-page-scrollbar { scrollbar-width: none; }
html.has-page-scrollbar::-webkit-scrollbar { display: none; }

.page-scrollbar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 14px;
  z-index: 9000;
}
.page-scrollbar-thumb {
  position: absolute;
  top: 0;
  right: 4px;
  width: 6px;
  border-radius: 999px;
  background: var(--accent);
  will-change: transform;
  touch-action: none;
  transition: width 140ms ease, right 140ms ease;
}
.page-scrollbar:hover .page-scrollbar-thumb,
.page-scrollbar.is-dragging .page-scrollbar-thumb {
  width: 9px;
  right: 3px;
}
`;

const INSET = 6;      // gap kept above and below the thumb
const MIN_THUMB = 44; // never shrink the thumb below this

export default function PageScrollbar() {
  const trackRef = useRef(null);
  const thumbRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    const usesMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!track || !thumb || !usesMouse) {
      if (track) track.style.display = 'none';
      return undefined;
    }

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    const html = document.documentElement;
    html.classList.add('has-page-scrollbar');

    let raf = 0;
    let drag = null;

    // measurements shared by drawing and dragging
    const metrics = () => {
      const vh = window.innerHeight;
      const total = html.scrollHeight;
      const trackH = vh - INSET * 2;
      const thumbH = Math.max(MIN_THUMB, (vh / total) * trackH);
      return { vh, total, trackH, thumbH, scrollable: total - vh > 1 && trackH > thumbH };
    };

    const draw = () => {
      raf = 0;
      const m = metrics();
      if (!m.scrollable) { track.style.display = 'none'; return; }
      track.style.display = '';
      const progress = window.scrollY / (m.total - m.vh);
      const top = INSET + Math.min(1, Math.max(0, progress)) * (m.trackH - m.thumbH);
      thumb.style.height = `${m.thumbH}px`;
      thumb.style.transform = `translate3d(0,${top}px,0)`;
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };

    const onThumbDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      drag = { y: e.clientY, scroll: window.scrollY };
      thumb.setPointerCapture(e.pointerId);
      track.classList.add('is-dragging');
    };
    const onThumbMove = (e) => {
      if (!drag) return;
      const m = metrics();
      if (!m.scrollable) return;
      const ratio = (m.total - m.vh) / (m.trackH - m.thumbH);
      window.scrollTo({ top: drag.scroll + (e.clientY - drag.y) * ratio, behavior: 'instant' });
    };
    const onThumbUp = (e) => {
      drag = null;
      track.classList.remove('is-dragging');
      if (thumb.hasPointerCapture?.(e.pointerId)) thumb.releasePointerCapture(e.pointerId);
    };
    // clicking the empty strip pages up or down, like a normal scrollbar
    const onTrackDown = (e) => {
      if (e.target !== track) return;
      const r = thumb.getBoundingClientRect();
      const dir = e.clientY < r.top ? -1 : 1;
      window.scrollBy({ top: dir * window.innerHeight * 0.9, behavior: 'smooth' });
    };

    thumb.addEventListener('pointerdown', onThumbDown);
    thumb.addEventListener('pointermove', onThumbMove);
    thumb.addEventListener('pointerup', onThumbUp);
    thumb.addEventListener('pointercancel', onThumbUp);
    track.addEventListener('pointerdown', onTrackDown);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (ro) ro.observe(document.body);
    draw();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      thumb.removeEventListener('pointerdown', onThumbDown);
      thumb.removeEventListener('pointermove', onThumbMove);
      thumb.removeEventListener('pointerup', onThumbUp);
      thumb.removeEventListener('pointercancel', onThumbUp);
      track.removeEventListener('pointerdown', onTrackDown);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (ro) ro.disconnect();
      html.classList.remove('has-page-scrollbar');
      style.remove();
    };
  }, []);

  return (
    <div ref={trackRef} className="page-scrollbar" aria-hidden="true">
      <div ref={thumbRef} className="page-scrollbar-thumb" data-hot />
    </div>
  );
}
