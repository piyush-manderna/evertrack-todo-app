import { useEffect, useRef } from 'react';

/*
  FluidBackground: a dye-in-water simulation drawn on one full-screen canvas.

  It replaces HeroField on the landing page. The canvas uses the existing
  .lp-field rule in landing.css (fixed, behind the page, ignores the pointer),
  and it listens to the pointer on the window, so every button stays clickable.

  Props
    opacity   0 to 1, overall strength. Lower it if text loses contrast. (0.7)
    cellSize  size of one simulation cell in px. Smaller = sharper but heavier.
              Phones always use at least 12. (7)

  Stability: fixed 60 Hz step so 120 Hz screens are not faster, forces pull
  cells toward a target speed instead of piling up, damping 0.9% per frame.
*/

const PAL = {
  light: [[0.88, 0.11, 0.28], [0.49, 0.23, 0.93], [0.85, 0.47, 0.02]],
  dark: [[0.98, 0.44, 0.52], [0.65, 0.55, 0.98], [0.98, 0.75, 0.14]],
};
const CAP = 0.75; // max dye opacity, keeps text readable
const STEP = 1 / 60;

export default function FluidBackground({ className = 'lp-field', opacity = 0.7, cellSize = 7 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const ctx = canvas.getContext('2d');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
    const ptr = { x: 0, y: 0, mx: 0, my: 0, on: false, last: 0 };

    let W = 0, H = 0, cols = 1, rows = 1, S = 1; // S keeps reach and speeds the same at any grid size
    let U, V, U0, V0, PR, DV, DR, DG, DB, R0, G0, B0, off, octx, img;
    let raf = 0, acc = 0, simT = 0, lastT = performance.now();

    const colAt = (t) => {
      const p = PAL[isDark() ? 'dark' : 'light'];
      const s = (t * 0.08) % 3, i = s | 0, f = s - i, e = f * f * (3 - 2 * f);
      const a = p[i], b = p[(i + 1) % 3];
      return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, r.width | 0), h = Math.max(1, r.height | 0);
      // phones: the address bar showing or hiding changes the height a little; ignore that
      if (U && w === W && Math.abs(h - H) < 120) return;
      W = w; H = h;
      canvas.width = W;
      canvas.height = H;
      const cp = W < 700 ? Math.max(cellSize, 12) : cellSize;
      S = 11 / cp;
      cols = Math.max(24, Math.round(W / cp));
      rows = Math.max(16, Math.round(H / cp));
      const n = cols * rows, F = () => new Float32Array(n);
      U = F(); V = F(); U0 = F(); V0 = F(); PR = F(); DV = F();
      DR = F(); DG = F(); DB = F(); R0 = F(); G0 = F(); B0 = F();
      off = document.createElement('canvas');
      off.width = cols;
      off.height = rows;
      octx = off.getContext('2d');
      img = octx.createImageData(cols, rows);
    };

    // add dye, and either pull velocity toward (fx, fy) or, if add is true, add to it once
    const splat = (x, y, fx, fy, amt, rad, c, add) => {
      const cx = (x / W) * cols - 0.5, cy = (y / H) * rows - 0.5, r = Math.ceil(rad * 2);
      for (let j = Math.max(0, Math.floor(cy) - r); j <= Math.min(rows - 1, Math.floor(cy) + r); j++) {
        for (let i = Math.max(0, Math.floor(cx) - r); i <= Math.min(cols - 1, Math.floor(cx) + r); i++) {
          const a = i - cx, b = j - cy, f = Math.exp(-(a * a + b * b) / (rad * rad));
          if (f < 0.02) continue;
          const k = i + j * cols;
          if (add) { U[k] += fx * f; V[k] += fy * f; }
          else { U[k] += (fx - U[k]) * f * 0.55; V[k] += (fy - V[k]) * f * 0.55; }
          DR[k] += c[0] * amt * f; DG[k] += c[1] * amt * f; DB[k] += c[2] * amt * f;
        }
      }
    };

    const puff = (x, y) => {
      const c = colAt(simT);
      for (let a = 0; a < 12; a++) {
        const n = (a / 12) * 6.283;
        splat(x + Math.cos(n) * 14, y + Math.sin(n) * 14, Math.cos(n) * 1.1 * S, Math.sin(n) * 1.1 * S, 0.65, 2.8 * S, c, true);
      }
    };

    const project = () => {
      const w = cols, hh = rows;
      for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
        const k = i + j * w;
        DV[k] = -0.5 * (U[i < w - 1 ? k + 1 : k] - U[i > 0 ? k - 1 : k] + V[j < hh - 1 ? k + w : k] - V[j > 0 ? k - w : k]);
        PR[k] = 0;
      }
      for (let n = 0; n < 20; n++) for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
        const k = i + j * w;
        PR[k] = (DV[k] + PR[i > 0 ? k - 1 : k] + PR[i < w - 1 ? k + 1 : k] + PR[j > 0 ? k - w : k] + PR[j < hh - 1 ? k + w : k]) * 0.25;
      }
      for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
        const k = i + j * w;
        U[k] -= 0.5 * (PR[i < w - 1 ? k + 1 : k] - PR[i > 0 ? k - 1 : k]);
        V[k] -= 0.5 * (PR[j < hh - 1 ? k + w : k] - PR[j > 0 ? k - w : k]);
      }
    };

    const advect = (d, d0, su, sv) => {
      const w = cols, hh = rows;
      for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
        const k = i + j * w;
        const x = clamp(i - su[k], 0, w - 1.001), y = clamp(j - sv[k], 0, hh - 1.001);
        const i0 = x | 0, j0 = y | 0, s = x - i0, t = y - j0, k0 = i0 + j0 * w;
        d[k] = (1 - s) * ((1 - t) * d0[k0] + t * d0[k0 + w]) + s * ((1 - t) * d0[k0 + 1] + t * d0[k0 + w + 1]);
      }
    };

    // two invisible stirrers keep the page alive when nobody is touching it
    const stir = (s, t) => [
      W * (0.5 + 0.36 * Math.sin(t * 0.45 + s * 2.4) * Math.cos(t * 0.13 + s)),
      H * (0.5 + 0.34 * Math.sin(t * 0.37 + s * 4.1 + 1)),
    ];

    const step = (t, draw) => {
      const px = W / cols; // screen pixels per cell
      if (ptr.on) {
        const sp = Math.hypot(ptr.mx, ptr.my);
        if (sp > 0.3) {
          const k = Math.min(0.85 / px, (3.2 * S) / sp);
          // lay dye along the whole path since the last step, so fast moves leave no gaps
          const n = Math.min(60, Math.ceil(sp / (px * 1.2 * S)));
          const am = Math.min(1.1, Math.max(0.12, (0.1 * sp) / (px * S))) / n;
          const c = colAt(t);
          for (let q = 1; q <= n; q++) {
            const f = q / n;
            splat(ptr.x - ptr.mx * (1 - f), ptr.y - ptr.my * (1 - f), ptr.mx * k, ptr.my * k, am, 4 * S, c);
          }
        }
      }
      ptr.mx = ptr.my = 0;
      if (!ptr.on || performance.now() - ptr.last > 2000) {
        for (let s = 0; s < 2; s++) {
          const a = stir(s, t), b = stir(s, t - STEP);
          const sx = clamp(((a[0] - b[0]) / px) * 2.6, -1.1 * S, 1.1 * S);
          const sy = clamp(((a[1] - b[1]) / px) * 2.6, -1.1 * S, 1.1 * S);
          splat(a[0], a[1], sx, sy, 0.24, 4 * S, colAt(t + s * 12));
        }
      }
      project();
      U0.set(U); V0.set(V);
      advect(U, U0, U0, V0); advect(V, V0, U0, V0);
      project();
      R0.set(DR); G0.set(DG); B0.set(DB);
      advect(DR, R0, U, V); advect(DG, G0, U, V); advect(DB, B0, U, V);

      const d = img.data, n = cols * rows;
      for (let k = 0; k < n; k++) {
        U[k] = clamp(U[k] * 0.991, -4.5 * S, 4.5 * S);
        V[k] = clamp(V[k] * 0.991, -4.5 * S, 4.5 * S);
        DR[k] *= 0.9925; DG[k] *= 0.9925; DB[k] *= 0.9925;
        const m = Math.max(DR[k], DG[k], DB[k]), o = k * 4;
        if (m < 0.004) { d[o + 3] = 0; continue; }
        const inv = 255 / m;
        d[o] = DR[k] * inv; d[o + 1] = DG[k] * inv; d[o + 2] = DB[k] * inv;
        d[o + 3] = CAP * (1 - Math.exp(-m * 1.6)) * 255;
      }
      if (draw) {
        octx.putImageData(img, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(off, 0, 0, W, H);
      }
    };

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) { lastT = now; return; }
      acc += Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      let st = 0;
      while (acc >= STEP && st < 3) {
        acc -= STEP; simT += STEP; st++;
        step(simT, !(acc >= STEP && st < 3));
      }
      if (st === 3) acc = 0;
    };

    // The canvas is fixed at the top-left of the screen, so client coordinates are canvas coordinates
    const onMove = (e) => {
      if (ptr.on) { ptr.mx += e.clientX - ptr.x; ptr.my += e.clientY - ptr.y; }
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; ptr.last = performance.now();
    };
    const onDown = (e) => {
      if (e.button > 0) return;
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.mx = ptr.my = 0; ptr.on = true; ptr.last = performance.now();
      const t = e.target;
      // a click on a button, link or field should not also splash the background
      if (t && t.closest && t.closest('button, a, input, textarea, select, label, [role="button"]')) return;
      puff(e.clientX, e.clientY);
    };
    const onLeave = () => { ptr.on = false; ptr.mx = ptr.my = 0; };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointercancel', onLeave);
    window.addEventListener('blur', onLeave);
    document.documentElement.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointercancel', onLeave);
      window.removeEventListener('blur', onLeave);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, [cellSize]);

  return <canvas ref={ref} className={className} aria-hidden="true" style={{ opacity }} />;
}
