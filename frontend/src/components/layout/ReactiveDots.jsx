import { useEffect, useRef } from 'react';

/**
 * Faint dot grid behind the main page. Dots near the mouse pointer light up
 * in the accent color. Purely decorative (pointer-events: none).
 * Skipped entirely for people who prefer reduced motion.
 */
export default function ReactiveDots() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${x - r.left}px`);
      el.style.setProperty('--my', `${y - r.top}px`);
      el.classList.add('active');
    };

    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onLeave = () => el.classList.remove('active');

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="reactive-dots" ref={ref} aria-hidden="true" />;
}
