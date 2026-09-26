/* The kit every chapter draws with.

   One rule runs through all of it: a frame is a pure function of time.
   Nothing here remembers the last frame, and nothing a chapter draws may
   either — no Math.random, no accumulating state — so the scrubber can land
   on any instant and see exactly what playback would have shown there.
   Caches keyed by their inputs (text layout, gradients for a size) are fine.

   Units: every length a chapter uses should come from S.u, one hundredth of
   the frame's short side in backing pixels, so the same chapter composes on
   a 16:9 monitor and a 9:19.5 phone. */

export const PAL = {
  bg: '#0a0a09', panel: '#111110', ink: '#f5f5f0', dim: '#a19f97', faint: '#6a6862',
  gold: '#d8b26a', goldHi: '#f3dfa8', goldLo: '#8a6a32',
  // the four brand films' colour scripts, in the order they cut
  amber: '#e0923a', steel: '#6f8fb0', blossom: '#e79ab8', ember: '#e2502c',
  teal: '#4ecdc4'   // the Gacha product's own accent
};

export const FONT = {
  sans: "'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "'Cinzel', 'Times New Roman', serif"
};

/* the music: 96 bpm, four beats to the bar, two bars to a phrase. Every
   chapter starts on a bar line, so inside a chapter the beats fall at
   lt = 0, BEAT, 2*BEAT … (the opening chapter is the one exception: it runs
   over the intro and its last beat lands exactly on its end). */
export const BEAT = 0.625, BAR = 2.5, PHRASE = 5;

// ── numbers ────────────────────────────────────────────────────────────────
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invlerp = (a, b, x) => clamp((x - a) / (b - a));
/** eased progress of x through [a, b], 0 before, 1 after */
export const seg = (x, a, b, e = linear) => e(invlerp(a, b, x));
/** 1 inside [a, b] with eased shoulders of length `f` either side, else 0 */
export const window01 = (x, a, b, f = 0.3, e = inOutCubic) =>
  Math.min(e(invlerp(a - f, a, x)), e(1 - invlerp(b, b + f, x)));
export const smoothstep = (a, b, x) => { const t = invlerp(a, b, x); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;

/** deterministic 0..1 from any number (or pair) — use instead of Math.random */
export function rng(n, m = 0) {
  const x = Math.sin(n * 127.1 + m * 311.7 + 74.7) * 43758.5453123;
  return x - Math.floor(x);
}
/** smooth 1D value noise, -1..1 */
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(rng(i, seed), rng(i + 1, seed), u) * 2 - 1;
}

// ── easing ────────────────────────────────────────────────────────────────
export const linear = t => t;
export const inQuad = t => t * t;
export const outQuad = t => 1 - (1 - t) * (1 - t);
export const inOutQuad = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const inCubic = t => t * t * t;
export const outCubic = t => 1 - Math.pow(1 - t, 3);
export const inOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const inQuart = t => t * t * t * t;
export const outQuart = t => 1 - Math.pow(1 - t, 4);
export const inOutQuart = t => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);
export const inExpo = t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
export const outExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const inOutExpo = t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2);
export const inBack = (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t;
export const outBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const outElastic = t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1);

/** CSS-style cubic-bezier easing */
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
  const dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break; t -= e / d; }
    return Y(clamp(t));
  };
}
/** the site's own curve (--E in its CSS) and its nav curve */
export const siteE = bezier(0.16, 1, 0.3, 1);
export const navE = bezier(0.32, 0.72, 0, 1);
/** a snappy in-out for cuts and whips */
export const whip = bezier(0.7, 0, 0.2, 1);

/** a damped spring settling from 0 to 1; t in seconds */
export function spring(t, freq = 2.2, damp = 5.5) {
  if (t <= 0) return 0;
  return 1 - Math.exp(-damp * t) * Math.cos(TAU * freq * t);
}

// ── images ────────────────────────────────────────────────────────────────
/** draw `img` to cover the rect, cropped around focus (fx, fy), with zoom ≥ 1 */
export function cover(ctx, img, x, y, w, h, o = {}) {
  if (!img || !img.width) return;
  const fx = o.fx ?? 0.5, fy = o.fy ?? 0.5, zoom = o.zoom ?? 1;
  const ir = img.width / img.height, r = w / h;
  let sw, sh;
  if (ir > r) { sh = img.height; sw = sh * r; } else { sw = img.width; sh = sw / r; }
  sw /= zoom; sh /= zoom;
  const sx = clamp((img.width - sw) * fx, 0, img.width - sw);
  const sy = clamp((img.height - sh) * fy, 0, img.height - sh);
  if (o.alpha !== undefined) { ctx.save(); ctx.globalAlpha *= o.alpha; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  if (o.alpha !== undefined) ctx.restore();
}

/** a rounded rectangle path */
export function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ── the thread ─────────────────────────────────────────────────────────────
/** a smooth path through points [[x,y],…] (Catmull-Rom as cubic beziers) */
export function smoothPath(ctx, pts, tension = 0.5) {
  ctx.beginPath();
  if (!pts.length) return;
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 2) { ctx.lineTo(pts[1][0], pts[1][1]); return; }
  const k = tension / 3;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k,
      p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
}
export function polyLength(pts) {
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}
/** the point `f` (0..1) of the way along a polyline, with its tangent angle */
export function along(pts, f) {
  const L = polyLength(pts) * clamp(f); let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], l = Math.hypot(dx, dy);
    if (acc + l >= L || i === pts.length - 1) {
      const k = l ? (L - acc) / l : 0;
      return { x: pts[i - 1][0] + dx * k, y: pts[i - 1][1] + dy * k, a: Math.atan2(dy, dx) };
    }
    acc += l;
  }
  return { x: pts[0][0], y: pts[0][1], a: 0 };
}

/**
 * The gold thread. `path` is a list of points (smoothed unless o.sharp) or a
 * function (ctx) => void that builds the path itself.
 *   o.width     core width in backing px (default S.lw)
 *   o.progress  0..1 — how much of the path is drawn, from its start
 *               (points only, or pass o.length with a function path)
 *   o.from      0..1 — start of the drawn portion (default 0)
 *   o.glow      0..1 — halo strength (default 1)
 *   o.alpha     0..1
 *   o.twist     true draws the ply of a twisted thread along the highlight,
 *               o.twistPhase slides it (in widths) to make the thread turn
 */
export function thread(ctx, S, path, o = {}) {
  const w = o.width ?? S.lw, glow = o.glow ?? 1, alpha = o.alpha ?? 1;
  if (alpha <= 0) return;
  const pts = typeof path === 'function' ? null : path;
  let L = o.length ?? (pts ? polyLength(pts) * 1.02 : 0);
  const from = o.from ?? 0, prog = o.progress ?? 1;
  if (prog <= from) return;
  const build = () => { if (pts) (o.sharp ? linePath(ctx, pts) : smoothPath(ctx, pts, o.tension ?? 0.5)); else path(ctx); };
  const dash = L && (prog < 1 || from > 0);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha *= alpha;
  const a0 = ctx.globalAlpha;
  build();
  const setDash = () => { if (dash) { ctx.setLineDash([L * (prog - from), L * 2]); ctx.lineDashOffset = -L * from; } else ctx.setLineDash([]); };
  if (glow > 0) {
    setDash();
    ctx.strokeStyle = `rgba(216,178,106,${0.07 * glow})`; ctx.lineWidth = w * 7; ctx.stroke();
    ctx.strokeStyle = `rgba(243,223,168,${0.16 * glow})`; ctx.lineWidth = w * 3; ctx.stroke();
  }
  setDash();
  ctx.strokeStyle = o.color || PAL.gold; ctx.lineWidth = w; ctx.stroke();
  if (o.twist) {
    // the ply: short bright dashes that read as a twist at close range
    ctx.setLineDash(dash ? [] : [w * 1.1, w * 0.9]);
    if (!dash) ctx.lineDashOffset = -(o.twistPhase || 0) * w * 2;
    ctx.strokeStyle = PAL.goldHi; ctx.globalAlpha = a0 * 0.85; ctx.lineWidth = w * 0.42; ctx.stroke();
  } else {
    setDash();
    ctx.strokeStyle = PAL.goldHi; ctx.globalAlpha = a0 * 0.8; ctx.lineWidth = w * 0.38; ctx.stroke();
  }
  ctx.restore();
}
function linePath(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); }

/** the rest line: where every chapter begins and ends — flat, full-bleed, dead centre */
export function restPoints(S) { return [[-0.02 * S.W, S.H / 2], [1.02 * S.W, S.H / 2]]; }
export function rest(ctx, S, o = {}) { thread(ctx, S, restPoints(S), { sharp: true, ...o }); }

/** a needle, point at (x, y) facing angle a (radians), length in px */
export function needle(ctx, S, x, y, a, len, o = {}) {
  const w = len * 0.045;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = o.alpha ?? 1;
  const g = ctx.createLinearGradient(0, -w, 0, w);
  g.addColorStop(0, '#fbfbf6'); g.addColorStop(0.45, '#c9c9c2'); g.addColorStop(1, '#6d6d67');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);                                  // the point
  ctx.quadraticCurveTo(-len * 0.25, -w * 0.9, -len * 0.55, -w);
  ctx.lineTo(-len, -w * 0.8); ctx.arc(-len, 0, w * 0.8, -Math.PI / 2, Math.PI / 2, true);
  ctx.lineTo(-len * 0.55, w); ctx.quadraticCurveTo(-len * 0.25, w * 0.9, 0, 0);
  ctx.fill();
  // the eye
  ctx.fillStyle = PAL.bg;
  ctx.beginPath(); ctx.ellipse(-len * 0.93, 0, len * 0.045, w * 0.32, 0, 0, TAU); ctx.fill();
  // a glint along the shaft
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(1, w * 0.18);
  ctx.beginPath(); ctx.moveTo(-len * 0.12, -w * 0.3); ctx.lineTo(-len * 0.7, -w * 0.45); ctx.stroke();
  ctx.restore();
}

// ── type ──────────────────────────────────────────────────────────────────
const layoutCache = new Map();
function fontOf(o) {
  const fam = o.font === 'serif' ? FONT.serif : FONT.sans;
  const weight = o.font === 'serif' ? 700 : (o.weight ?? 700);
  return `${o.italic ? 'italic ' : ''}${weight} ${Math.round(o.size)}px ${fam}`;
}
/** glyph offsets for str (kerned: measured by prefix), cached */
export function layout(ctx, str, o) {
  const font = fontOf(o), tr = (o.tracking ?? 0) * o.size;
  const key = font + '|' + tr + '|' + str;
  let L = layoutCache.get(key);
  if (L) return L;
  ctx.save(); ctx.font = font;
  const xs = [], chars = [...str];
  let pre = '';
  for (let i = 0; i < chars.length; i++) { xs.push(ctx.measureText(pre).width + i * tr); pre += chars[i]; }
  const width = ctx.measureText(str).width + Math.max(0, chars.length - 1) * tr;
  const m = ctx.measureText('Hg');
  ctx.restore();
  L = { chars, xs, width, font, ascent: m.actualBoundingBoxAscent || o.size * 0.75, descent: m.actualBoundingBoxDescent || o.size * 0.25 };
  if (layoutCache.size > 600) layoutCache.clear();
  layoutCache.set(key, L);
  return L;
}
export function measure(ctx, str, o) { return layout(ctx, str, o).width; }

/**
 * Kinetic type, a glyph at a time. (x, y) is the baseline at the alignment point.
 *   o.font 'sans' | 'serif'   o.size px   o.weight   o.tracking (em)
 *   o.align 'left'|'center'|'right'   o.color   o.alpha
 *   o.reveal 0..1 — the whole line's reveal; each glyph takes o.window of it,
 *            staggered left to right (o.order 'center' | 'random' | 'reverse')
 *   o.ease   easing for each glyph (default outExpo)
 *   o.rise   how far a glyph travels up as it arrives (default 0.6 × size)
 *   o.mask   true clips each line to its own box so glyphs rise from behind a sill
 *   o.glyph  (i, p, n) => ({dx, dy, rot, sx, sy, alpha, color}) per-glyph override
 *   o.stroke draws outlined instead of filled; o.strokeWidth
 * Returns { x0, x1, width, ascent, descent } in frame px.
 */
export function text(ctx, S, str, x, y, o = {}) {
  const L = layout(ctx, str, o);
  const n = L.chars.length, align = o.align || 'left';
  const x0 = align === 'center' ? x - L.width / 2 : align === 'right' ? x - L.width : x;
  const reveal = o.reveal ?? 1, win = o.window ?? 0.35, ease = o.ease || outExpo;
  const rise = o.rise ?? o.size * 0.6;
  ctx.save();
  ctx.font = L.font; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.globalAlpha *= (o.alpha ?? 1);
  if (o.mask) {
    ctx.beginPath(); ctx.rect(x0 - o.size, y - L.ascent * 1.25, L.width + o.size * 2, (L.ascent + L.descent) * 1.3); ctx.clip();
  }
  const baseAlpha = ctx.globalAlpha;
  for (let i = 0; i < n; i++) {
    const ch = L.chars[i]; if (ch === ' ') continue;
    let k = i;
    if (o.order === 'center') k = Math.abs(i - (n - 1) / 2) * 2;
    else if (o.order === 'reverse') k = n - 1 - i;
    else if (o.order === 'random') k = rng(i, str.length) * (n - 1);
    const st = n > 1 ? (k / (n - 1)) * (1 - win) : 0;
    const p = reveal >= 1 ? 1 : ease(invlerp(st, st + win, reveal));
    if (p <= 0) continue;
    const g = o.glyph ? o.glyph(i, p, n) || {} : {};
    const gx = x0 + L.xs[i] + (g.dx || 0), gy = y + (1 - p) * (o.mask ? L.ascent * 1.3 : rise) + (g.dy || 0);
    ctx.globalAlpha = baseAlpha * (g.alpha ?? (o.mask ? 1 : p));
    if (g.rot || g.sx || g.sy) {
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(g.rot || 0); ctx.scale(g.sx ?? 1, g.sy ?? 1);
      paintGlyph(ctx, ch, 0, 0, o, g); ctx.restore();
    } else paintGlyph(ctx, ch, gx, gy, o, g);
  }
  ctx.restore();
  return { x0, x1: x0 + L.width, width: L.width, ascent: L.ascent, descent: L.descent };
}
function paintGlyph(ctx, ch, x, y, o, g) {
  if (o.stroke) { ctx.strokeStyle = g.color || o.color || PAL.ink; ctx.lineWidth = o.strokeWidth || 1; ctx.strokeText(ch, x, y); }
  else { ctx.fillStyle = g.color || o.color || PAL.ink; ctx.fillText(ch, x, y); }
}

/** a counter that rolls up to `value` as p goes 0..1 (tabular digits) */
export function counter(value, p, decimals = 0) {
  const v = value * clamp(p);
  return decimals ? v.toFixed(decimals) : String(Math.round(v));
}

/** the small uppercase label used everywhere (eyebrows, captions) */
export function label(ctx, S, str, x, y, o = {}) {
  return text(ctx, S, str.toUpperCase(), x, y, { size: 1.55 * S.u, weight: 600, tracking: 0.18, color: PAL.dim, ...o });
}
