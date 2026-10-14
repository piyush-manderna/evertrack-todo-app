import { useEffect, useRef } from 'react';

/*
  FlowBackground: thousands of tiny particles drifting along an invisible,
  slowly shifting current, leaving soft trails. The cursor acts like a hand
  in water: it pushes particles away, twists them into a small swirl and drags
  them along. With theme="auto" the colours come straight from your site's theme
  variables (the page colour --bg-sidebar and the pinks --accent,
  --accent-hover and --text-secondary), so the pink lines always match the
  card and the rest of the app, in light and in dark mode.

  When the mouse stops for about a second, the particles gather into a random
  pattern (rings, a spiral, waves, ellipses, diamonds, squares or contour
  lines, with a new size, position and direction each time), hold it, then
  dissolve and make a new one if you stay still. Move the mouse and they break
  free and flow again.

  For the Login and Signup pages. Add it once at the top of each page:

      import FlowBackground from '../components/common/FlowBackground';
      ...
      <FlowBackground />

  It is a fixed canvas behind the page (z-index 0) and ignores the pointer, so
  the form stays clickable. The element that wraps your form needs
  position: relative; z-index: 1; so it sits above the canvas.

  It paints its own background, so the page looks the same wherever you use it.

  Props
    theme    'auto' takes its colours from the site theme and follows the
             light/dark switch (data-theme). 'dark' or 'light' force a fixed
             grey look instead. ('dark')
    opacity  0 to 1, overall strength. Lower it if the form loses contrast. (1)
    density  more or fewer particles, 0.4 to 1.6. (1)
*/

const COLORS = {
  light: ['rgba(110,86,104,.55)', 'rgba(90,84,112,.5)', 'rgba(140,112,100,.5)'], // mauve, slate violet, taupe
  dark: ['rgba(201,205,214,.62)', 'rgba(143,150,166,.6)', 'rgba(184,174,176,.55)'], // silver, slate, warm grey
};
const BG = { light: '#f9f3f5', dark: '#0c0a12' };
const VEIL = { // soft darkening toward the edges for depth
  light: 'radial-gradient(ellipse at center, rgba(255,255,255,0) 45%, rgba(150,60,90,.1) 100%)',
  dark: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(12,3,8,.55) 100%)',
};
// theme variables used when theme="auto": [variable, line opacity], most common first
const AUTO = [['--accent', 0.6], ['--accent-hover', 0.5], ['--text-secondary', 0.55]];
const STEP = 1 / 60; // fixed 60 Hz step, so 120 Hz screens are not twice as fast

const hash = (i, j) => {
  let n = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const noise = (x, y) => {
  const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j;
  const u = a * a * (3 - 2 * a), v = b * b * (3 - 2 * b);
  return hash(i, j) * (1 - u) * (1 - v) + hash(i + 1, j) * u * (1 - v)
    + hash(i, j + 1) * (1 - u) * v + hash(i + 1, j + 1) * u * v;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;

// A pattern is a scalar field F(x, y) whose whole-number levels are the lines
// of the pattern. field() writes F and its gradient into o.
const makePattern = (W, H) => {
  const ang = Math.random() * Math.PI;
  return {
    type: Math.floor(Math.random() * 7),
    cx: W * (0.3 + Math.random() * 0.4),
    cy: H * (0.3 + Math.random() * 0.4),
    gap: (26 + Math.random() * 24) * clamp(Math.min(W, H) / 800, 0.7, 1.3),
    alt: Math.random() < 0.5, // neighbouring lines flow in opposite directions
    dir: Math.random() < 0.5 ? 1 : -1,
    arms: 2 + Math.floor(Math.random() * 4),
    off: [Math.random() * 1000, Math.random() * 1000],
    f2: [W * (0.2 + Math.random() * 0.6), H * (0.2 + Math.random() * 0.6)],
    wf: 0.004 + Math.random() * 0.006,
    amp: 20 + Math.random() * 60,
    ca: Math.cos(ang),
    sa: Math.sin(ang),
  };
};
const land = (p, x, y) => (noise(x * 0.0032 + p.off[0], y * 0.0032 + p.off[1]) * 0.75
  + noise(x * 0.0067 + p.off[1], y * 0.0067 + p.off[0]) * 0.25) * 12;
const field = (p, x, y, o) => {
  const dx = x - p.cx, dy = y - p.cy, g = p.gap;
  if (p.type === 0) { // concentric rings
    const r = Math.hypot(dx, dy) || 1;
    o[0] = r / g; o[1] = dx / (r * g); o[2] = dy / (r * g);
  } else if (p.type === 1) { // spiral arms
    const r2 = dx * dx + dy * dy || 1, r = Math.sqrt(r2), k = p.arms / TAU;
    o[0] = r / g - Math.atan2(dy, dx) * k;
    o[1] = dx / (r * g) + (k * dy) / r2;
    o[2] = dy / (r * g) - (k * dx) / r2;
  } else if (p.type === 2) { // tilted waves
    const u = dx * p.ca + dy * p.sa, v = -dx * p.sa + dy * p.ca;
    o[0] = (v + p.amp * Math.sin(u * p.wf)) / g;
    const du = (p.amp * p.wf * Math.cos(u * p.wf)) / g, dv = 1 / g;
    o[1] = du * p.ca - dv * p.sa;
    o[2] = du * p.sa + dv * p.ca;
  } else if (p.type === 3) { // ellipses around two centres
    const ex = x - p.f2[0], ey = y - p.f2[1], r1 = Math.hypot(dx, dy) || 1, r2 = Math.hypot(ex, ey) || 1;
    o[0] = (r1 + r2) / g; o[1] = (dx / r1 + ex / r2) / g; o[2] = (dy / r1 + ey / r2) / g;
  } else if (p.type === 4) { // diamonds
    o[0] = (Math.abs(dx) + Math.abs(dy)) / g; o[1] = Math.sign(dx) / g; o[2] = Math.sign(dy) / g;
  } else if (p.type === 5) { // squares
    const ax = Math.abs(dx), ay = Math.abs(dy);
    o[0] = Math.max(ax, ay) / g;
    o[1] = ax > ay ? Math.sign(dx) / g : 0;
    o[2] = ax > ay ? 0 : Math.sign(dy) / g;
  } else { // contour lines of a random landscape
    const f0 = land(p, x, y);
    o[0] = f0; o[1] = (land(p, x + 2, y) - f0) / 2; o[2] = (land(p, x, y + 2) - f0) / 2;
  }
};

export default function FlowBackground({ theme = 'dark', opacity = 1, density = 1 }) {
  const ref = useRef(null);
  const veil = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const ctx = canvas.getContext('2d');
    const html = document.documentElement;
    const isDark = () => theme === 'dark' || (theme === 'auto' && html.getAttribute('data-theme') === 'dark');

    // lets the browser turn a CSS variable into a real rgb colour
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;width:0;height:0;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    const cssRgb = (name, fallback) => {
      probe.style.color = '';
      probe.style.color = `var(${name})`;
      const m = getComputedStyle(probe).color.match(/[\d.]+/g);
      return m && m.length >= 3 ? [Math.round(m[0]), Math.round(m[1]), Math.round(m[2])] : fallback;
    };

    let W = 1, H = 1, N = 0, bg = BG.light, dark = false, cols = COLORS.light;
    let px, py, life, pc, po;
    let raf = 0, acc = 0, simT = 0, last = performance.now();
    const ptr = { x: 0, y: 0, vx: 0, vy: 0, on: false };
    let pat = null, pm = 0, cycle = -1, lastMove = performance.now();

    const clear = () => { ctx.globalAlpha = 1; ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); };
    const spawn = (i) => {
      px[i] = Math.random() * W;
      py[i] = Math.random() * H;
      life[i] = 120 + Math.random() * 320;
      const r = Math.random();
      pc[i] = r < 0.58 ? 0 : r < 0.86 ? 1 : 2;
      po[i] = (Math.random() - 0.5) * 0.26; // each particle holds a slightly different spot on its line
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width | 0);
      H = Math.max(1, r.height | 0);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      N = Math.round(clamp(((W * H) / (1440 * 800)) * 2400 * density, 900, 3600));
      px = new Float32Array(N); py = new Float32Array(N); life = new Float32Array(N); pc = new Uint8Array(N); po = new Float32Array(N);
      for (let i = 0; i < N; i++) spawn(i);
      clear();
    };
    const sync = () => {
      dark = isDark();
      if (theme === 'auto') {
        const f = dark ? [33, 17, 26] : [255, 244, 246];
        const b = cssRgb('--bg-sidebar', f); // the same colour as the page behind the card
        bg = `rgb(${b[0]},${b[1]},${b[2]})`;
        cols = AUTO.map(([v, a]) => { const c = cssRgb(v, [150, 130, 140]); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; });
      } else {
        bg = BG[dark ? 'dark' : 'light'];
        cols = COLORS[dark ? 'dark' : 'light'];
      }
      if (veil.current) veil.current.style.background = VEIL[dark ? 'dark' : 'light'];
      clear();
    };

    const step = (t) => {
      // pattern mode: after about a second without mouse movement, gather into a random pattern
      const idle = performance.now() - lastMove - 900;
      let want = 0;
      if (idle > 0) {
        const k = Math.floor(idle / 10000);
        if (k !== cycle) { cycle = k; pat = makePattern(W, H); }
        want = idle % 10000 < 8500 ? 1 : 0;
      } else cycle = -1;
      pm += (want - pm) * (want ? 0.035 : 0.1);
      const usePat = pm > 0.002 && pat, fo = [0, 0, 0];
      ctx.globalAlpha = 0.032; // fade a little each step: the lower this is, the longer the trails
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      const R = clamp(Math.min(W, H) * 0.26, 150, 230), R2 = R * R, tt = t * 0.12, s = 0.0021;
      const paths = [new Path2D(), new Path2D(), new Path2D()];
      for (let i = 0; i < N; i++) {
        const X = px[i], Y = py[i];
        const a = (noise(X * s + tt * 3, Y * s - tt * 2) * 0.7 + noise(X * s * 2.3 - tt * 4, Y * s * 2.3 + tt * 2.5) * 0.3) * 12.57;
        let vx = Math.cos(a) * 2.5, vy = Math.sin(a) * 2.5;
        if (usePat) {
          field(pat, X, Y, fo);
          const gl = Math.hypot(fo[1], fo[2]) || 1e-6, m = Math.round(fo[0]), d = (fo[0] - m - po[i]) / gl;
          const pull = -clamp(d * 0.22, -3, 3), sg = pat.alt && (m & 1) ? -pat.dir : pat.dir;
          vx += ((fo[1] / gl) * pull - (fo[2] / gl) * sg * 2.6 - vx) * pm;
          vy += ((fo[2] / gl) * pull + (fo[1] / gl) * sg * 2.6 - vy) * pm;
        }
        if (ptr.on) {
          const ex = X - ptr.x, ey = Y - ptr.y, d2 = ex * ex + ey * ey;
          if (d2 < R2 && d2 > 1) {
            const d = Math.sqrt(d2), f = 1 - d / R, g = f * f, ux = ex / d, uy = ey / d;
            vx += g * (ux * 3.4 - uy * 2.8 + ptr.vx * 0.2);
            vy += g * (uy * 3.4 + ux * 2.8 + ptr.vy * 0.2);
          }
        }
        const nx = X + vx, ny = Y + vy, p = paths[pc[i]];
        p.moveTo(X, Y);
        p.lineTo(nx, ny);
        px[i] = nx;
        py[i] = ny;
        if (--life[i] <= 0 || nx < 0 || nx > W || ny < 0 || ny > H) spawn(i);
      }
      ctx.lineWidth = 1.25;
      ctx.lineCap = 'round';
      const c = cols;
      for (let k = 0; k < 3; k++) { ctx.strokeStyle = c[k]; ctx.stroke(paths[k]); }
      ptr.vx *= 0.8;
      ptr.vy *= 0.8;
    };

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) { last = now; return; }
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      let n = 0;
      while (acc >= STEP && n < 3) { acc -= STEP; simT += STEP; n++; step(simT); }
      if (n === 3) acc = 0;
    };

    const onMove = (e) => {
      if (e.pointerType === 'touch') return;
      lastMove = performance.now();
      if (ptr.on) { ptr.vx = e.clientX - ptr.x; ptr.vy = e.clientY - ptr.y; }
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true;
    };
    const onLeave = () => { ptr.on = false; ptr.vx = ptr.vy = 0; };

    sync();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const mo = new MutationObserver(sync); // follows the light/dark switch
    mo.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('blur', onLeave);
    html.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      probe.remove();
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('blur', onLeave);
      html.removeEventListener('mouseleave', onLeave);
    };
  }, [density, theme]);

  const fixed = { position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 };
  return (
    <>
      <canvas ref={ref} aria-hidden="true" style={{ ...fixed, opacity }} />
      <div ref={veil} aria-hidden="true" style={fixed} />
    </>
  );
}
