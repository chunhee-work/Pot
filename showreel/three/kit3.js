/* The third reel's look, lifted from the site's own UI rather than invented:
   - the liquid-metal rim of the nav pill (nav-metal.js) and the chrome thread
     that joins the stages on /process (its `metalflow` gradient, stop for stop)
   - /process's cards: dark panel gradient, a hairline border, a soft breathing
     glow, the outlined stage numeral, the uppercase mono index, the chips
   - /process's glass document panes and their monospace telemetry
   - the starfield the home page's process opening flies through
   Everything here is a pure function of its arguments; caches are keyed by
   size and bounded. */
import { clamp, lerp, rng, TAU, rrect, text as kitText, layout } from '../kit.js';

export const UI = {
  space: '#05060a', bg: '#0a0a09', panel: '#141412', panel2: '#181816',
  ink: '#f5f4f0', muted: '#a6a49b', faint: '#6d6c64',
  line: 'rgba(245,244,240,.10)', lineUp: 'rgba(245,244,240,.22)',
  ion: '#aecbff', ember: '#ffd9ae', gold: '#d8b26a'
};
export const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

/** a size for type meant to be read: k·u, but never under `min` CSS px (on a
    phone, or a phone held sideways, k·u alone lands at 4–7 px). Whole backing
    px, rounded up: fonts are set in whole px, and where the player caps the
    backing store S.dpr is fractional, so rounding to nearest could land under */
export const readPx = (S, k, min = 10) => Math.ceil(Math.max(k * S.u, min * S.dpr) - 1e-6);

// ── liquid metal ──────────────────────────────────────────────────────────
/* /process's `metalflow`, stop for stop: dark steel, bright bands, and the
   cold-white-warm triplet that reads as chromatic aberration on chrome */
const FLOW = [
  [0, '#333338'], [0.13, '#5c5b57'], [0.22, '#c2c0b9'], [0.29, '#63625e'], [0.40, '#8f8d86'],
  [0.47, '#e4e2db'], [0.495, '#aecbff'], [0.52, '#ffffff'], [0.545, '#ffd9ae'], [0.58, '#e4e2db'],
  [0.70, '#75746e'], [0.86, '#3e3d42'], [1, '#333338']
];
/**
 * A repeating chrome gradient along (x0,y0)→(x1,y1), `period` px per band
 * cycle, slid by `phase` (in cycles) — animate phase with time and the
 * highlights travel along the metal the way the nav rim's do.
 */
export function metal(ctx, x0, y0, x1, y1, phase = 0, period = 160) {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  const n = L / period, off = ((phase % 1) + 1) % 1;
  // lay the cycle end to end across the span (at most 24 cycles; beyond that it is noise)
  const cycles = Math.min(24, Math.ceil(n) + 1);
  for (let c = -1; c < cycles; c++) {
    for (const [s, col] of FLOW) {
      const p = (c + s + off) / n;
      if (p >= 0 && p <= 1) g.addColorStop(p, col);
    }
  }
  void ux; void uy;
  return g;
}

/**
 * The chrome thread from /process: a dark core with the metal flowing over it.
 * `path` is (ctx) => void building the path; o.width in px; o.phase; o.alpha;
 * o.dash [on, off] for a partial draw (use with o.length).
 */
export function wire(ctx, S, path, o = {}) {
  const w = o.width ?? Math.max(1.5, 0.32 * S.u), a = o.alpha ?? 1;
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.length && o.progress !== undefined) { ctx.setLineDash([o.length * clamp(o.progress), o.length * 2]); }
  path(ctx);
  ctx.strokeStyle = 'rgba(245,244,240,.07)'; ctx.lineWidth = w * 5; ctx.stroke();     // halo
  ctx.strokeStyle = '#1b1b1e'; ctx.lineWidth = w * 1.6; ctx.stroke();                // the dark tube
  ctx.strokeStyle = metal(ctx, 0, 0, o.flowX ?? S.W, o.flowY ?? S.H * 0.35, o.phase || 0, o.period ?? 26 * S.u);
  ctx.lineWidth = w; ctx.stroke();
  ctx.restore();
}

/** a straight wire across the frame at height y */
export function wireAcross(ctx, S, y, o = {}) {
  wire(ctx, S, c => { c.beginPath(); c.moveTo(-0.02 * S.W, y); c.lineTo(1.02 * S.W, y); }, o);
}

// ── the nav pill ──────────────────────────────────────────────────────────
/**
 * The site's nav: a pill with a liquid-metal rim and a dark plate set in by
 * `rim` px, e.g. to grow into a cockpit viewport. (x, y) is the centre.
 *   o.rim (px, default 0.42u), o.phase (metal flow), o.alpha, o.glow (0..1)
 */
export function pill(ctx, S, x, y, w, h, o = {}) {
  const r = h / 2, rim = o.rim ?? Math.max(2, 0.42 * S.u), a = o.alpha ?? 1;
  if (a <= 0 || w <= 0 || h <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  const x0 = x - w / 2, y0 = y - h / 2;
  if (o.glow) {
    ctx.fillStyle = `rgba(245,244,240,${0.06 * o.glow})`;
    rrect(ctx, x0 - rim * 3, y0 - rim * 3, w + rim * 6, h + rim * 6, r + rim * 3); ctx.fill();
  }
  // the rim: metal flowing along the pill, a bright top and dark underside
  ctx.fillStyle = metal(ctx, x0, y0, x0 + w, y0 + h * 0.4, o.phase || 0, Math.max(40, w / 2.1));
  rrect(ctx, x0, y0, w, h, r); ctx.fill();
  const shade = ctx.createLinearGradient(0, y0, 0, y0 + h);
  shade.addColorStop(0, 'rgba(255,255,255,.16)'); shade.addColorStop(0.5, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = shade; ctx.fill();
  // the plate
  const plate = ctx.createLinearGradient(0, y0 + rim, 0, y0 + h - rim);
  plate.addColorStop(0, o.plateTop || '#1d1d1b'); plate.addColorStop(1, o.plateBottom || '#0a0a09');
  ctx.fillStyle = plate;
  rrect(ctx, x0 + rim, y0 + rim, w - 2 * rim, h - 2 * rim, Math.max(0, r - rim)); ctx.fill();
  ctx.restore();
}

/** the nav's links, as on the site, set inside a pill at (x, y) — returns their x centres */
export const NAV = ['About', 'Work', 'Series', 'World & Voices', 'Game UI', 'Process', 'Contact'];
export function navLinks(ctx, S, x, y, w, size, o = {}) {
  const gap = size * 1.9;
  const widths = NAV.map(s => layout(ctx, s, { size, weight: 600, tracking: 0.02 }).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (NAV.length - 1);
  let cx = x - total / 2;
  const centres = [];
  NAV.forEach((s, i) => {
    const hot = o.hot === i;
    kitText(ctx, S, s, cx, y + size * 0.36, { size, weight: 600, tracking: 0.02, color: hot ? UI.ink : '#a19f97', alpha: o.alpha ?? 1 });
    centres.push(cx + widths[i] / 2);
    cx += widths[i] + gap;
  });
  return centres;
}

// ── /process cards ────────────────────────────────────────────────────────
/**
 * A stage card: the panel gradient, a hairline border, a breathing glow.
 * (x, y) is the top-left. o.r radius (default 2.6u), o.glow 0..1, o.alpha,
 * o.metal true to draw the border in flowing chrome (o.phase).
 */
export function card(ctx, S, x, y, w, h, o = {}) {
  const r = o.r ?? 2.6 * S.u, a = o.alpha ?? 1;
  if (a <= 0 || w <= 0 || h <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  if (o.glow) {
    for (let i = 3; i >= 1; i--) {
      ctx.fillStyle = `rgba(245,244,240,${0.035 * o.glow})`;
      rrect(ctx, x - i * 0.9 * S.u, y - i * 0.9 * S.u, w + i * 1.8 * S.u, h + i * 1.8 * S.u, r + i * 0.9 * S.u); ctx.fill();
    }
  }
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, UI.panel2); g.addColorStop(0.6, UI.panel); g.addColorStop(1, UI.panel);
  ctx.fillStyle = g; rrect(ctx, x, y, w, h, r); ctx.fill();
  ctx.lineWidth = Math.max(1, 0.12 * S.u);
  ctx.strokeStyle = o.metal ? metal(ctx, x, y, x + w, y + h, o.phase || 0, Math.max(60, (w + h) / 3)) : (o.border || UI.lineUp);
  rrect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r); ctx.stroke();
  ctx.restore();
}

/** /process's glass pane: translucent white, a hairline, an inner highlight */
export function glass(ctx, S, x, y, w, h, o = {}) {
  const r = o.r ?? 2 * S.u, a = o.alpha ?? 1;
  if (a <= 0 || w <= 0 || h <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(255,255,255,.055)'; rrect(ctx, x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = 'rgba(245,244,240,.13)'; ctx.lineWidth = Math.max(1, 0.1 * S.u); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = Math.max(1, 0.18 * S.u);
  ctx.beginPath(); ctx.moveTo(x + r, y + 1.5); ctx.lineTo(x + w - r, y + 1.5); ctx.stroke();
  ctx.restore();
}

/** a chip ("CLAUDE", "BY HAND", "HIGGSFIELD"); o.solid for the paper chip; returns its width */
export function chip(ctx, S, str, x, y, o = {}) {
  const size = o.size ?? 1.2 * S.u, a = o.alpha ?? 1;
  const L = layout(ctx, str.toUpperCase(), { size, weight: 700, tracking: 0.15 });
  const pw = L.width + size * 3.2, ph = size * 2.6;
  if (a <= 0) return pw;
  ctx.save(); ctx.globalAlpha *= a;
  if (o.solid) { ctx.fillStyle = UI.ink; }
  else { const g = ctx.createLinearGradient(x, y, x + pw, y + ph); g.addColorStop(0, 'rgba(245,244,240,.10)'); g.addColorStop(1, 'rgba(245,244,240,.03)'); ctx.fillStyle = g; }
  rrect(ctx, x, y, pw, ph, ph / 2); ctx.fill();
  if (!o.solid) { ctx.strokeStyle = 'rgba(245,244,240,.22)'; ctx.lineWidth = Math.max(1, 0.08 * S.u); ctx.stroke(); }
  kitText(ctx, S, str.toUpperCase(), x + size * 1.6, y + ph / 2 + size * 0.36, { size, weight: 700, tracking: 0.15, color: o.solid ? '#0a0a09' : UI.ink });
  ctx.restore();
  return pw;
}

/** the outlined stage numeral: a thin stroke over a fading fill, as on /process */
export function numeral(ctx, S, str, x, y, size, o = {}) {
  const a = o.alpha ?? 1;
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.font = `900 ${Math.round(size)}px 'Archivo', sans-serif`;
  ctx.textAlign = o.align || 'right'; ctx.textBaseline = 'alphabetic';
  const g = ctx.createLinearGradient(0, y - size * 0.75, 0, y);
  g.addColorStop(0, 'rgba(245,244,240,.15)'); g.addColorStop(0.78, 'rgba(245,244,240,.02)');
  ctx.fillStyle = g; ctx.fillText(str, x, y);
  ctx.lineWidth = Math.max(1, size * 0.016);
  ctx.strokeStyle = o.metal ? metal(ctx, x - size, y - size, x, y, o.phase || 0, size * 0.9) : 'rgba(245,244,240,.20)';
  ctx.strokeText(str, x, y);
  ctx.restore();
}

// ── monospace telemetry ───────────────────────────────────────────────────
/**
 * Monospace lines (the /process docs, the site's own code), typed on.
 *   o.size px, o.color, o.alpha, o.lh line height (×size),
 *   o.reveal 0..1 over all characters (typewriter), o.cursor true shows a block caret
 * Returns the height used.
 */
export function mono(ctx, S, lines, x, y, o = {}) {
  const size = o.size ?? 1.3 * S.u, lh = (o.lh ?? 1.55) * size, a = o.alpha ?? 1;
  const arr = Array.isArray(lines) ? lines : [lines];
  if (a <= 0) return arr.length * lh;
  const total = arr.reduce((n, l) => n + l.length, 0);
  let left = o.reveal === undefined ? Infinity : Math.floor(clamp(o.reveal) * total);
  ctx.save(); ctx.globalAlpha *= a;
  ctx.font = `${o.weight || 400} ${Math.round(size)}px ${MONO}`;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  let cy = y, caret = null;
  for (const line of arr) {
    if (left <= 0) break;
    const shown = line.slice(0, Math.max(0, left));
    left -= line.length;
    ctx.fillStyle = o.color || UI.muted;
    ctx.fillText(shown, x, cy);
    if (left < 0) caret = [x + ctx.measureText(shown).width, cy];
    cy += lh;
  }
  if (o.cursor && caret) { ctx.fillStyle = UI.ink; ctx.fillRect(caret[0] + size * 0.1, caret[1] - size * 0.8, size * 0.55, size * 0.95); }
  ctx.restore();
  return arr.length * lh;
}

// ── space ─────────────────────────────────────────────────────────────────
/* the starfield: a fixed deterministic field, drawn as a function of a
   camera (x, y offset in frame fractions, zoom ≥ 1) and a warp amount that
   streaks the stars toward the vanishing point. Seeded; never random. */
const STARS = [];
for (let i = 0; i < 700; i++) {
  STARS.push({ x: rng(i, 1) * 2 - 1, y: rng(i, 2) * 2 - 1, z: 0.15 + 0.85 * rng(i, 3), b: 0.35 + 0.65 * rng(i, 4) ** 2, tw: rng(i, 5) });
}
/**
 * space(ctx, S, { x, y, zoom, warp, dim, twinkle, t })
 *   warp 0..1 streaks the stars (hyperspace); zoom scales the field around
 *   the centre; x, y slide it (parallax by depth); dim 0..1 darkens.
 * The seam frame is space(ctx, S) with no options.
 */
export function space(ctx, S, o = {}) {
  const { W, H } = S;
  ctx.fillStyle = UI.space; ctx.fillRect(0, 0, W, H);
  // a very faint nebula wash, fixed
  const neb = ctx.createRadialGradient(W * 0.72, H * 0.28, 0, W * 0.72, H * 0.28, Math.max(W, H) * 0.7);
  neb.addColorStop(0, 'rgba(120,140,190,.07)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
  const R = Math.max(W, H) * 0.62, zoom = o.zoom ?? 1, warp = clamp(o.warp ?? 0), dim = 1 - clamp(o.dim ?? 0);
  const ox = (o.x ?? 0) * W, oy = (o.y ?? 0) * H, cx = W / 2, cy = H / 2;
  const px = Math.max(1, 0.16 * S.u);
  ctx.save();
  for (let i = 0; i < STARS.length; i++) {
    const s = STARS[i];
    const k = lerp(1, zoom, s.z);
    const x = cx + (s.x * R + ox * s.z) * k, y = cy + (s.y * R + oy * s.z) * k;
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    const tw = o.t !== undefined && o.twinkle ? 0.75 + 0.25 * Math.sin(o.t * (2 + s.tw * 3) + s.tw * TAU) : 1;
    const a = s.b * dim * tw;
    if (a <= 0.02) continue;
    if (warp > 0.02) {
      const dx = x - cx, dy = y - cy, len = warp * warp * 0.9 * s.z;
      ctx.strokeStyle = `rgba(232,236,255,${a})`; ctx.lineWidth = px * (0.6 + s.z);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * len, y + dy * len); ctx.stroke();
    } else {
      ctx.fillStyle = `rgba(232,236,255,${a})`;
      const r = px * (0.5 + s.z * 0.9);
      ctx.fillRect(x - r / 2, y - r / 2, r, r);
    }
  }
  ctx.restore();
}

/**
 * The seam frame every chapter begins and ends on: deep space, the fixed
 * starfield, and the chrome thread lying across the middle, at rest.
 */
export function seam(ctx, S) {
  space(ctx, S);
  wireAcross(ctx, S, S.H / 2, { phase: 0 });
}

/** a monospace timestamp for the reel's clock at time t: "T+00:12.40" */
export function stamp(t) {
  const s = Math.max(0, t), m = Math.floor(s / 60), r = s - m * 60;
  return `T+${String(m).padStart(2, '0')}:${r.toFixed(2).padStart(5, '0')}`;
}
