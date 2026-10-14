import { useEffect, useRef } from 'react';

/* ==========================================================================
   HeroField: the homepage's living background. It is fixed to the screen, so
   it stays put behind every section while the page scrolls over it.

   A field of empty task circles. The cursor pushes the circles aside and
   completes the ones it gets close to (they fill and show a tick, then slowly
   empty again), and now and then a random circle completes by itself, so the
   page stays alive even when nobody is moving the mouse.

   - Colours come from the same CSS variables as the rest of the app, so it
     follows the day/night switch.
   - It never blocks clicks: the canvas ignores the pointer, and the movement
     is read from the window instead.
   - It pauses when scrolled out of view or when the tab is hidden.
   - With "reduce motion" turned on it draws one still frame and nothing moves.
   ========================================================================== */

const TAU = Math.PI * 2;
const GAP = 34;          // distance between circles (px)
const GAP_SMALL = 30;    // on narrow screens
const SPARE = 160;       // extra rows kept below the screen, for phones whose address bar slides away
const RING = 5;          // circle radius at rest (px)
const REACH = 150;       // how far the cursor's push reaches (px)
const PUSH = 24;         // how far a circle is pushed at most (px)
const AUTO_EVERY = [450, 1100]; // a random circle completes every 450 to 1100 ms

function readColors(el) {
  const s = getComputedStyle(el);
  const get = (name, fallback) => s.getPropertyValue(name).trim() || fallback;
  return {
    ring: get('--border-strong', '#c9c9d1'),
    accent: get('--accent', '#e11d48'),
    tick: get('--on-accent', '#ffffff'),
  };
}

export default function HeroField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let dots = [];
    let w = 0;
    let h = 0;
    let colors = readColors(canvas);
    let raf = 0;
    let visible = true;
    let last = 0;
    let nextAuto = 0;
    // x, y: smoothed position inside the canvas. cx, cy: raw position in the window.
    const ptr = { cx: -9999, cy: -9999, x: -9999, y: -9999, active: false, power: 0 };

    /* ---------- layout ---------- */
    let builtW = 0; // the size the circles were last laid out for
    let builtH = 0;

    // match the drawing buffer to the canvas's current size
    const sizeBuffer = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const layout = () => {
      if (!w || !h) { dots = []; return; }
      const gap = w < 600 ? GAP_SMALL : Math.max(GAP, Math.round(w / 56));
      const cols = Math.ceil(w / gap) + 2;
      const rows = Math.ceil((h + SPARE) / gap) + 2;
      const startX = (w - (cols - 1) * gap) / 2;
      const startY = -gap;
      const next = [];
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          next.push({
            hx: startX + c * gap + (r % 2 ? gap / 2 : 0), // every other row sits half a step across
            hy: startY + r * gap,
            ox: 0,
            oy: 0,
            f: 0, // 0 = empty circle, 1 = completed
            ph: Math.random() * TAU,
          });
        }
      }
      dots = next;
    };

    const build = () => {
      sizeBuffer();
      layout();
      builtW = w;
      builtH = h;
    };

    /* ---------- drawing ---------- */
    const draw = (now) => {
      ctx.clearRect(0, 0, w, h);

      // all the empty circles in one go: much cheaper than one path each
      ctx.beginPath();
      for (let i = 0; i < dots.length; i += 1) {
        const d = dots[i];
        if (d.f > 0.04) continue;
        const x = d.hx + d.ox;
        const y = d.hy + d.oy;
        const wobble = reduced ? 0 : Math.sin(now * 0.0011 + d.ph) * 0.45;
        ctx.moveTo(x + RING + wobble, y);
        ctx.arc(x, y, RING + wobble, 0, TAU);
      }
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = colors.ring;
      ctx.globalAlpha = 0.45;
      ctx.stroke();

      // circles that are being completed (or are emptying again)
      for (let i = 0; i < dots.length; i += 1) {
        const d = dots[i];
        if (d.f <= 0.04) continue;
        const x = d.hx + d.ox;
        const y = d.hy + d.oy;
        const r = RING + d.f * 2.5;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.globalAlpha = Math.min(1, d.f * 1.05);
        ctx.fillStyle = colors.accent;
        ctx.fill();
        ctx.globalAlpha = 0.35 + 0.65 * d.f;
        ctx.lineWidth = 1.25;
        ctx.strokeStyle = colors.accent;
        ctx.stroke();

        if (d.f > 0.5) {
          ctx.globalAlpha = Math.min(1, (d.f - 0.5) * 2);
          ctx.beginPath();
          ctx.moveTo(x - r * 0.45, y + r * 0.02);
          ctx.lineTo(x - r * 0.1, y + r * 0.38);
          ctx.lineTo(x + r * 0.5, y - r * 0.32);
          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = colors.tick;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    /* ---------- animation ---------- */
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(50, now - (last || now)) / 16.67; // 1 = one frame at 60fps
      last = now;
      // frame-rate independent easing: ease(0.16) feels the same at 60 or 120fps
      const ease = (k) => 1 - Math.pow(1 - k, dt);

      const rect = canvas.getBoundingClientRect();
      const tx = ptr.cx - rect.left;
      const ty = ptr.cy - rect.top;
      const near = tx > -REACH && tx < w + REACH && ty > -REACH && ty < h + REACH;
      if (ptr.power < 0.02) {
        // not influencing anything yet: jump straight to the cursor, so it never glides in from far away
        ptr.x = tx;
        ptr.y = ty;
      } else {
        ptr.x += (tx - ptr.x) * ease(0.3);
        ptr.y += (ty - ptr.y) * ease(0.3);
      }
      ptr.power += ((ptr.active && near ? 1 : 0) - ptr.power) * ease(0.12);

      if (now > nextAuto) {
        const pick = dots[(Math.random() * dots.length) | 0];
        if (pick) pick.f = 1;
        nextAuto = now + AUTO_EVERY[0] + Math.random() * (AUTO_EVERY[1] - AUTO_EVERY[0]);
      }

      const pushK = ease(0.16);
      const fillUp = ease(0.25);
      const fillDown = ease(0.035);
      const completeReach = REACH * 0.5;

      for (let i = 0; i < dots.length; i += 1) {
        const d = dots[i];
        const dx = d.hx - ptr.x;
        const dy = d.hy - ptr.y;
        const dist = Math.hypot(dx, dy) || 1;

        let px = 0;
        let py = 0;
        let fillTarget = 0;
        if (ptr.power > 0.01 && dist < REACH) {
          const t = 1 - dist / REACH;
          const push = t * t * PUSH * ptr.power;
          px = (dx / dist) * push;
          py = (dy / dist) * push;
          if (dist < completeReach) fillTarget = (1 - dist / completeReach) * ptr.power;
        }

        // a slow, tiny drift so the field is never perfectly still
        const driftX = Math.sin(now * 0.0007 + d.ph) * 1.8;
        const driftY = Math.cos(now * 0.0006 + d.ph * 1.3) * 1.8;

        d.ox += (px + driftX - d.ox) * pushK;
        d.oy += (py + driftY - d.oy) * pushK;
        d.f += (fillTarget - d.f) * (fillTarget > d.f ? fillUp : fillDown);
      }

      draw(now);
    };

    const start = () => {
      if (reduced || raf || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    /* ---------- events ---------- */
    const onMove = (e) => {
      ptr.cx = e.clientX;
      ptr.cy = e.clientY;
      ptr.active = true;
    };
    const onUp = (e) => {
      if (e.pointerType === 'touch') ptr.active = false; // a finger lifting means no pointer any more
    };
    const onLeave = () => { ptr.active = false; };
    const onVisibility = () => { if (document.hidden) stop(); else start(); };

    const ro = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      if (Math.abs(rect.width - builtW) < 1 && Math.abs(rect.height - builtH) < SPARE) {
        // only a small height change (a phone's address bar sliding away): keep the circles where they are
        sizeBuffer();
      } else {
        build();
      }
      if (reduced) draw(0);
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start(); else stop();
    });
    io.observe(canvas);

    // the day/night switch changes the CSS variables, so re-read them
    const mo = new MutationObserver(() => {
      colors = readColors(canvas);
      if (reduced) draw(0);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    build();
    if (reduced) {
      draw(0);
    } else {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerdown', onMove, { passive: true });
      window.addEventListener('pointerup', onUp, { passive: true });
      window.addEventListener('pointercancel', onUp, { passive: true });
      window.addEventListener('blur', onLeave);
      document.documentElement.addEventListener('mouseleave', onLeave);
      document.addEventListener('visibilitychange', onVisibility);
      start();
    }

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onLeave);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-field" aria-hidden="true" />;
}
