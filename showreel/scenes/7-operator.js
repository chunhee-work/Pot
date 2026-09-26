/* 7 — One operator. The résumé end card.

   The thread gathers into a figure-eight: the finishing knot a tailor ties
   when the seam is done. The numbers land on the beats (17 min, 12, 4, then
   1, hardest, on the bar line), the name rises out of the thread, the role
   and the address drop from it, and after a long read the knot is pulled:
   the thread slides out, straightens, and breathes back to the first frame.

   The knot is one continuous path with real over-under crossings. Every
   point along it carries a depth that alternates from crossing to crossing
   (so the drawing is the alternating figure-eight), the crossings are found
   again every frame, and at each one the under-strand is broken by knocking
   a gap out along the over-strand, which is then drawn back on top. */
import {
  PAL, BEAT, TAU, clamp, lerp, seg, noise1,
  inOutQuad, inCubic, outCubic, inOutCubic, outQuart, inQuart, outExpo, siteE,
  thread, rest, text, layout, measure
} from '../kit.js';

// ── timing (local seconds; beats at k·0.625, the bar line at 2.5) ─────────
const T_IN = 0.08, T_OUT = 4.92;
const CINCH = BEAT;             // the knot snaps tight on beat 1
const SLAM = 4 * BEAT;          // "1 operator", the name: the bar line

// ── the knot, in knot units, y up; the thread runs along y = 0 ───────────
// standing part → loop up and back down over the line → round behind the
// standing part → through the loop → out along the line. Four crossings.
const KNOT = [
  [-17, 0], [-13.5, 0], [-10, 0], [-6.6, 0], [-3.4, 0], [-0.4, 0], [2.1, 0.05], [4.1, 0.4],
  [6.0, 1.9], [6.9, 4.4], [6.1, 7.0], [3.7, 8.5], [0.9, 8.1], [-0.9, 6.3], [-1.4, 3.9], [-0.95, 1.5],
  [0.35, -1.7], [-0.2, -3.9], [-2.4, -5.1], [-5.0, -4.5], [-6.5, -2.4], [-6.7, 0.3], [-5.8, 2.7],
  [-3.9, 4.2], [-1.5, 4.7], [0.8, 4.1], [2.3, 2.4], [3.2, 0.3], [3.9, -1.3], [5.1, -2.2],
  [6.8, -2.0], [8.3, -1.0], [9.9, -0.2], [12.2, 0], [15.5, 0], [19, 0], [22.5, 0]
];
const NK = KNOT.length;
const ON_LINE = KNOT.map((p, i) => i <= 5 || i >= NK - 4);
const PIVOT = 1.5;          // scaling about (PIVOT, 0) keeps the tails on the line
const KMINX = -6.7;         // the knot's leftmost reach
const KMAXX = 9.9;          // … and its rightmost, before it lies back on the line
const STEPS = 7;            // Catmull-Rom samples per control span

// arclength of the control polygon, for laying the knot's slack along the line
const KM = [0];
for (let i = 1; i < NK; i++) KM.push(KM[i - 1] + Math.hypot(KNOT[i][0] - KNOT[i - 1][0], KNOT[i][1] - KNOT[i - 1][1]));
const KMID = KM[NK - 1] / 2;
const REST_IN = KM.map(m => PIVOT + 0.52 * (m - KMID));          // slack before it gathers
const REST_OUT = KM.map(m => PIVOT + 14 + 0.95 * (m - KMID));    // slack after the pull, drawn off to the right

function sampleCR(px, py, steps) {
  const n = px.length, N = (n - 1) * steps + 1;
  const X = new Float64Array(N), Y = new Float64Array(N), U = new Float64Array(N);
  let k = 0;
  for (let i = 0; i < n - 1; i++) {
    const i0 = i > 0 ? i - 1 : 0, i3 = i + 2 < n ? i + 2 : n - 1;
    const x0 = px[i0], y0 = py[i0], x1 = px[i], y1 = py[i], x2 = px[i + 1], y2 = py[i + 1], x3 = px[i3], y3 = py[i3];
    const bx = -x0 + x2, cx = 2 * x0 - 5 * x1 + 4 * x2 - x3, dx = -x0 + 3 * x1 - 3 * x2 + x3;
    const by = -y0 + y2, cyy = 2 * y0 - 5 * y1 + 4 * y2 - y3, dy = -y0 + 3 * y1 - 3 * y2 + y3;
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      X[k] = 0.5 * (2 * x1 + bx * t + cx * t2 + dx * t3);
      Y[k] = 0.5 * (2 * y1 + by * t + cyy * t2 + dy * t3);
      U[k] = i + t; k++;
    }
  }
  X[k] = px[n - 1]; Y[k] = py[n - 1]; U[k] = n - 1;
  return { X, Y, U, n: N };
}

/** every self-crossing of a dense polyline: segment indices, params, point, sine of the angle */
function crossings(P) {
  const { X, Y, U, n } = P, out = [];
  const m = n - 1;
  const x0 = new Float64Array(m), x1 = new Float64Array(m), y0 = new Float64Array(m), y1 = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const ax = X[i], bx = X[i + 1], ay = Y[i], by = Y[i + 1];
    x0[i] = ax < bx ? ax : bx; x1[i] = ax < bx ? bx : ax; y0[i] = ay < by ? ay : by; y1[i] = ay < by ? by : ay;
  }
  for (let i = 0; i < m; i++) {
    const ax0 = x0[i], ax1 = x1[i], ay0 = y0[i], ay1 = y1[i];
    for (let j = i + 2; j < m; j++) {
      if (x1[j] < ax0 || x0[j] > ax1 || y1[j] < ay0 || y0[j] > ay1) continue;
      const ax = X[i], ay = Y[i], rx = X[i + 1] - ax, ry = Y[i + 1] - ay;
      const cx = X[j], cy = Y[j], sx = X[j + 1] - cx, sy = Y[j + 1] - cy;
      const den = rx * sy - ry * sx;
      if (den > -1e-9 && den < 1e-9) continue;
      const qx = cx - ax, qy = cy - ay;
      const ta = (qx * sy - qy * sx) / den, tb = (qx * ry - qy * rx) / den;
      if (ta < 0 || ta >= 1 || tb < 0 || tb >= 1) continue;
      out.push({
        i, j, ta, tb, x: ax + rx * ta, y: ay + ry * ta,
        ua: U[i] + (U[i + 1] - U[i]) * ta, ub: U[j] + (U[j + 1] - U[j]) * tb,
        sin: Math.abs(den) / (Math.hypot(rx, ry) * Math.hypot(sx, sy) || 1)
      });
    }
  }
  return out;
}

// depth along the thread: the finished knot's crossing visits, in order,
// alternate over / under — z is +1, −1, +1 … at them and eases between
const ZU = (() => {
  const P = sampleCR(KNOT.map(p => p[0]), KNOT.map(p => p[1]), STEPS);
  const us = [];
  for (const c of crossings(P)) us.push(c.ua, c.ub);
  return us.sort((a, b) => a - b);
})();
function zAt(u) {
  if (u <= ZU[0]) return 1;
  for (let j = 0; j < ZU.length - 1; j++) {
    if (u < ZU[j + 1]) return (j % 2 ? -1 : 1) * Math.cos(Math.PI * (u - ZU[j]) / (ZU[j + 1] - ZU[j]));
  }
  return ZU.length % 2 ? 1 : -1;
}

// ── small curves ─────────────────────────────────────────────────────────
/** a quick rise and a slow fall, peaking at 1 when τ = a */
const bump = (τ, a) => (τ > 0 ? (τ / a) * Math.exp(1 - τ / a) : 0);
const decay = (τ, k) => (τ >= 0 ? Math.exp(-τ / k) : 0);

// ── the copy ────────────────────────────────────────────────────────────
const STATS = [
  { num: '17', roll: 17, unit: 'min', label: 'ORIGINAL ANIMATION' },
  { num: '12', roll: 12, label: 'CHARACTER VOICES' },
  { num: '4', roll: 14, label: 'BRANDS' },
  { num: '1', roll: 21, label: 'OPERATOR', hero: true }
];
const ROLE = 'AI-NATIVE WEB3 MARKETER & CONTENT CREATOR — KUALA LUMPUR';
const ROLE_2 = ['AI-NATIVE WEB3 MARKETER', '& CONTENT CREATOR — KUALA LUMPUR'];
const EMAIL = 'chunhee437@gmail.com';
const FOOT = '© 2026 · BUILT SOLO, WITH CLAUDE';

// ── layout, per frame size ───────────────────────────────────────────────
const LAYOUTS = new Map();
function getLayout(ctx, S) {
  const key = S.W + 'x' + S.H;
  let L = LAYOUTS.get(key);
  if (L) return L;
  const { u, W, H } = S, cy = H / 2;
  L = { cy, stats: [] };
  if (!S.portrait) {
    // one line of name on the thread, the knot as its full stop; the numbers
    // above in a row whose last column stands over the knot; role and
    // address below the thread
    const xL = 13 * u;
    const nameO = { size: 18.5 * u, weight: 900, tracking: -0.03 };
    const nameW = measure(ctx, 'CHUN HEE', nameO);
    L.name = [{ str: 'CHUN HEE', x: xL, y: cy - 2.8 * u, thread: true }];
    L.nameO = nameO;
    L.k = 1.85 * u;
    const knotL = xL + nameW + 4.4 * u;
    L.knotX = knotL + (PIVOT - KMINX) * L.k;
    const numO = { size: 8.6 * u, weight: 800, tracking: -0.02 };
    const labO = { size: 1.6 * u, weight: 600, tracking: 0.18 };
    const ny = cy - 28 * u, colW = (knotL - xL) / 3;
    STATS.forEach((st, j) => L.stats.push({
      x: xL + j * colW, y: ny, numO, unitO: { size: 3.4 * u, weight: 500, tracking: 0 },
      lab: { x: xL + j * colW, y: ny + 4.9 * u, o: labO }
    }));
    L.role = [{ str: ROLE, x: xL, y: cy + 8.4 * u }];
    L.roleO = { size: 1.7 * u, weight: 600, tracking: 0.16 };
    L.email = { x: xL, y: cy + 16.2 * u, o: { size: 3.5 * u, weight: 500, tracking: -0.005 } };
    L.foot = { x: W - xL, y: H * 0.84, o: { size: 1.35 * u, weight: 700, tracking: 0.1, align: 'right' } };
  } else {
    // two lines of name, the knot after HEE on the thread; the numbers
    // stacked above, the role and the address below
    const xL = 8 * u;
    const nameO = { size: 20 * u, weight: 900, tracking: -0.03 };
    const heeW = measure(ctx, 'HEE', nameO);
    const y2 = cy - 2.8 * u, y1 = y2 - 18.2 * u;
    L.name = [{ str: 'CHUN', x: xL, y: y1 }, { str: 'HEE', x: xL, y: y2, thread: true }];
    L.nameO = nameO;
    L.k = 1.75 * u;
    L.knotX = xL + heeW + 5 * u + (PIVOT - KMINX) * L.k;
    const numO = { size: 9 * u, weight: 800, tracking: -0.02 };
    const labO = { size: 2.6 * u, weight: 600, tracking: 0.18 };
    const capName = layout(ctx, 'CHUN', nameO).ascent, capNum = layout(ctx, '17', numO).ascent;
    const capLab = layout(ctx, 'ORIGINAL', labO).ascent;
    const rowH = 12 * u, last = y1 - capName - 8 * u;
    STATS.forEach((st, j) => {
      const y = last - (3 - j) * rowH;
      L.stats.push({
        x: xL, y, numO, unitO: { size: 3.8 * u, weight: 500, tracking: 0 },
        lab: { x: xL + 27 * u, y: y - (capNum - capLab) / 2, o: labO }
      });
    });
    L.role = [{ str: ROLE_2[0], x: xL, y: cy + 9 * u }, { str: ROLE_2[1], x: xL, y: cy + 13.6 * u }];
    L.roleO = { size: 2.6 * u, weight: 600, tracking: 0.14 };
    L.email = { x: xL, y: cy + 22.5 * u, o: { size: 4.9 * u, weight: 500, tracking: -0.005 } };
    L.foot = { x: xL, y: H * 0.84, o: { size: 2.2 * u, weight: 700, tracking: 0.1 } };
  }
  const h = L.stats[3], hl = layout(ctx, '1', h.numO);
  L.hero = { x: h.x + hl.width / 2, y: h.y - hl.ascent / 2 };
  LAYOUTS.set(key, L);
  return L;
}

// ── the knot, frame by frame ─────────────────────────────────────────────
function knotFrame(S, t, L) {
  const k = L.k, ax = L.knotX, cy = L.cy;
  const late = t > SLAM;
  const restX = late ? REST_OUT : REST_IN;

  // scale: loose, then the cinch on beat 1 (with a little recoil), a tug on
  // every stat, a hard one on the bar line, and a loosening before the pull
  let s = 1.45 - 0.45 * seg(t, 0.36, CINCH, inCubic);
  const c = t - CINCH;
  if (c > 0) s -= 0.07 * Math.exp(-6 * c) * Math.sin(TAU * 2.4 * c);
  s *= 1 - 0.035 * (bump(t - 2 * BEAT, 0.05) + bump(t - 3 * BEAT, 0.05)) - 0.085 * bump(t - SLAM, 0.045);
  s *= 1 + 0.12 * seg(t, 4.40, 4.64, inOutQuad);

  // a slow, living wobble in the loops while the knot holds
  const wob = 0.16 * seg(t, 0.3, 0.8) * (1 - seg(t, 4.4, 4.7));
  // the settle after the pull: the line overshoots flat by a hair and comes back
  const settle = 0.06 * Math.sin(Math.PI * seg(t, 4.74, 4.9, inOutQuad));
  const px_ = new Float64Array(NK), py_ = new Float64Array(NK);
  for (let i = 0; i < NK; i++) {
    const f = KM[i] / KM[NK - 1];
    let gx, gy;
    if (!late) {
      // tied in order along the thread: the loop is thrown first, then the
      // wrap round the standing part, then the end goes through
      const a = 0.14 + 0.2 * f;
      gx = outCubic(clamp((t - a) / 0.24));
      gy = inOutCubic(clamp((t - a - 0.01) / 0.26));
    } else {
      // pulled from the right: the far end straightens first and the pull
      // runs back through the knot
      const a = 4.44 + 0.16 * (1 - f);
      gx = 1 - inOutCubic(clamp((t - a) / 0.26));
      gy = 1 - inOutCubic(clamp((t - a - 0.02) / 0.22)) - settle;
    }
    let kx = PIVOT + s * (KNOT[i][0] - PIVOT), ky = s * KNOT[i][1];
    if (!ON_LINE[i]) { kx += wob * noise1(t * 0.9 + i * 0.61, 3); ky += wob * noise1(t * 0.9 + i * 0.61, 11); }
    px_[i] = ax + k * (lerp(restX[i], kx, gx) - PIVOT);
    py_[i] = cy - k * ky * gy;
  }
  return sampleCR(px_, py_, STEPS);
}

/** the dense points within `len` px of the crossing, along the strand through segment i at ta */
function around(P, i, ta, len) {
  const { X, Y, n } = P;
  const cx = X[i] + (X[i + 1] - X[i]) * ta, cy = Y[i] + (Y[i + 1] - Y[i]) * ta;
  const back = [], fwd = [];
  let acc = 0, px = cx, py = cy;
  for (let j = i; j >= 0; j--) {
    const d = Math.hypot(X[j] - px, Y[j] - py);
    if (acc + d >= len) { const f = (len - acc) / d; back.push([px + (X[j] - px) * f, py + (Y[j] - py) * f]); break; }
    acc += d; px = X[j]; py = Y[j]; back.push([px, py]);
  }
  acc = 0; px = cx; py = cy;
  for (let j = i + 1; j < n; j++) {
    const d = Math.hypot(X[j] - px, Y[j] - py);
    if (acc + d >= len) { const f = (len - acc) / d; fwd.push([px + (X[j] - px) * f, py + (Y[j] - py) * f]); break; }
    acc += d; px = X[j]; py = Y[j]; fwd.push([px, py]);
  }
  return back.reverse().concat([[cx, cy]], fwd);
}

function linePts(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}

function drawKnot(ctx, S, t, L) {
  const P = knotFrame(S, t, L);
  const { X, Y, U, n } = P, cy = L.cy;
  const wk = 1 + 0.7 * (seg(t, 0.1, 0.6, inOutCubic) - seg(t, 4.5, 4.86, inOutCubic));
  const w = S.lw * wk;
  const glow = 1 + 0.55 * Math.sin(Math.PI * seg(t, 4.56, T_OUT, inOutQuad));
  thread(ctx, S, c => {
    c.beginPath(); c.moveTo(-0.05 * S.W, cy);
    for (let i = 0; i < n; i++) c.lineTo(X[i], Y[i]);
    c.lineTo(1.05 * S.W, cy);
  }, { width: w, glow });

  // light running along the taut line: in from both edges before the knot
  // is thrown (the slack being drawn in), out to the right when it is pulled
  const gxK = L.knotX + (KMINX - PIVOT) * L.k, gxR = L.knotX + (KMAXX - PIVOT) * L.k;
  comet(ctx, S, t, 0.08, 0.31, -0.02 * S.W, gxK, cy, w);
  comet(ctx, S, t, 0.08, 0.31, 1.02 * S.W, gxR, cy, w);
  comet(ctx, S, t, 4.5, 4.9, L.knotX, 1.1 * S.W, cy, w);

  // a glint that runs along the knot when it cinches, on the bar line, and once in the hold
  for (const [g0, gd] of [[0.5, 0.75], [SLAM, 0.6], [3.5, 1.1]]) {
    const τ = (t - g0) / gd;
    if (τ <= 0 || τ >= 1) continue;
    const uc = lerp(5, NK - 4, inOutQuad(τ)), a = Math.sin(Math.PI * τ);
    const pts = [];
    for (let i = 0; i < n; i++) if (Math.abs(U[i] - uc) < 0.9) pts.push([X[i], Y[i]]);
    if (pts.length < 2) continue;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    linePts(ctx, pts);
    ctx.strokeStyle = `rgba(255,244,214,${0.22 * a})`; ctx.lineWidth = w * 3; ctx.stroke();
    ctx.strokeStyle = `rgba(255,251,238,${0.9 * a})`; ctx.lineWidth = w * 0.6; ctx.stroke();
    ctx.restore();
  }

  // over and under: at each crossing, a narrow band along the over-strand is
  // cleared (that is the break in the under-strand) and the over-strand is
  // drawn back inside it exactly as it was, glow and all, so nothing doubles
  for (const c of crossings(P)) {
    const aOver = zAt(c.ua) >= zAt(c.ub);
    const i = aOver ? c.i : c.j, ta = aOver ? c.ta : c.tb;
    const len = (2.4 * w) / Math.max(0.28, c.sin) + 1.5 * w;
    const pts = around(P, i, ta, len);
    if (pts.length < 2) continue;
    ctx.save();
    bandPath(ctx, pts, w * 1.75);
    ctx.fillStyle = PAL.bg; ctx.fill();
    ctx.clip();
    thread(ctx, S, pts, { sharp: true, width: w, glow });
    ctx.restore();
  }
}

/** a streak of light sliding along the flat line from x0 to x1 between t0 and t1 */
function comet(ctx, S, t, t0, t1, x0, x1, cy, w) {
  const τ = (t - t0) / (t1 - t0);
  if (τ <= 0 || τ >= 1) return;
  const x = lerp(x0, x1, inCubic(τ)), dir = Math.sign(x1 - x0);
  const a = Math.sin(Math.PI * Math.min(1, τ * 1.25)) ** 0.7;
  const len = (6 + 30 * τ) * S.u;       // it stretches as it accelerates
  ctx.save(); ctx.lineCap = 'round';
  for (const [f, al, lw] of [[1, 0.22, 5], [0.6, 0.45, 2.4], [0.25, 1, 1.15]]) {
    ctx.beginPath(); ctx.moveTo(x - dir * len * f, cy); ctx.lineTo(x, cy);
    ctx.strokeStyle = `rgba(255,246,222,${al * a})`; ctx.lineWidth = w * lw; ctx.stroke();
  }
  ctx.restore();
}

/** the outline of a strip of half-width hw along a polyline */
function bandPath(ctx, pts, hw) {
  const n = pts.length, R = [];
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = pts[i > 0 ? i - 1 : 0], b = pts[i < n - 1 ? i + 1 : n - 1];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const x = pts[i][0], y = pts[i][1];
    if (i) ctx.lineTo(x - dy * hw, y + dx * hw); else ctx.moveTo(x - dy * hw, y + dx * hw);
    R.push(x + dy * hw, y - dx * hw);
  }
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[2 * i], R[2 * i + 1]);
  ctx.closePath();
}

// ── type ────────────────────────────────────────────────────────────────
/** a line that rises (rise > 0: from below) inside a clip band, and sinks back out */
function sillText(ctx, S, str, x, y, o, reveal, sink, band) {
  if (reveal <= 0) return;
  const n = [...str].length, R = o.rise;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, band[0], S.W, band[1] - band[0]); ctx.clip();
  text(ctx, S, str, x, y, {
    ...o, reveal,
    glyph: sink > 0
      ? (i => ({ alpha: 1, dy: R * inCubic(clamp(sink * 1.6 - 0.6 * (n > 1 ? i / (n - 1) : 0))) }))
      : () => ({ alpha: 1 })
  });
  ctx.restore();
}

function digitChar(d, blankZero) {
  if (d < 0) return '';
  const k = ((d % 10) + 10) % 10;
  return blankZero && k === 0 ? '' : String(k);
}

/** a rolling counter: each column is a strip of digits sliding upward, clipped to the line */
function odometer(ctx, S, str, x, y, o, v, vel, color, dy) {
  const Lt = layout(ctx, str, o), n = Lt.chars.length, asc = Lt.ascent;
  const step = o.size * 1.06, tr = (o.tracking || 0) * o.size;
  ctx.save();
  ctx.beginPath(); ctx.rect(x - o.size * 0.4, y - asc - o.size * 0.14, Lt.width + o.size * 0.8, asc + o.size * 0.3); ctx.clip();
  ctx.font = Lt.font; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
  const dd = vel / 60;
  const ghosts = Math.abs(dd) > 0.12 ? [[0.7, 0.16], [0.35, 0.32]] : [];
  for (let i = 0; i < n; i++) {
    const c = n - 1 - i;
    let pos;
    if (c === 0) pos = v;
    else { const p10 = Math.pow(10, c), vv = Math.max(0, v), q = Math.floor(vv / p10); pos = q + Math.max(0, vv - q * p10 - (p10 - 1)); }
    const x1 = i < n - 1 ? Lt.xs[i + 1] - tr : Lt.width;
    const cx = x + (Lt.xs[i] + x1) / 2;
    const passes = ghosts.map(([k, a]) => [pos - dd * k * (c === 0 ? 1 : 0.1), a]).concat([[pos, 1]]);
    for (const [p, a] of passes) {
      const b = Math.floor(p), f = p - b;
      ctx.globalAlpha = a;
      const d0 = digitChar(b, c > 0), d1 = digitChar(b + 1, c > 0);
      if (d0) ctx.fillText(d0, cx, y - f * step + dy);
      if (d1 && f > 0) ctx.fillText(d1, cx, y + (1 - f) * step + dy);
    }
  }
  ctx.restore();
  return Lt;
}

function statValue(st, j, t) {
  if (!st.hero) {
    const a = (j + 1) * BEAT - 0.03, d = 0.56;
    return -1 + (st.roll + 1) * outQuart(clamp((t - a) / d));
  }
  // the last one spins up into the bar line and slams, with a bounce
  const a = SLAM - 0.36;
  if (t < SLAM) return -1 + (st.roll + 1) * inQuart(clamp((t - a) / 0.36));
  const h = t - SLAM;
  return st.roll + 0.09 * Math.exp(-11 * h) * Math.sin(TAU * 3 * h);
}

function mixHex(a, b, f) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(pa >> 16, pb >> 16, f)), g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, f)), bl = Math.round(lerp(pa & 255, pb & 255, f));
  return `rgb(${r},${g},${bl})`;
}

function drawStats(ctx, S, t, L) {
  const u = S.u;
  STATS.forEach((st, j) => {
    const g = L.stats[j], t0 = (j + 1) * BEAT;
    if (t < t0 - 0.4) return;
    const out = seg(t, 4.22 + j * 0.05, 4.48 + j * 0.05, inCubic);
    const v = statValue(st, j, t);
    const vel = st.hero && t >= SLAM ? 0 : (v - statValue(st, j, t - 1 / 60)) * 60;
    const numAsc = layout(ctx, st.num, g.numO).ascent;
    const dropN = out * (numAsc + g.numO.size * 0.3);
    // the hero: gold, a flash of white-gold on impact and a punch in scale
    let color = PAL.ink, sc = 1;
    if (st.hero) {
      const h = t - SLAM;
      color = h < 0 ? PAL.gold : mixHex(PAL.goldHi, PAL.gold, clamp(h / 0.5));
      sc = 1 + 0.13 * decay(h, 0.06);
    }
    ctx.save();
    if (sc !== 1) { const Lt = layout(ctx, st.num, g.numO); ctx.translate(g.x + Lt.width / 2, g.y - numAsc / 2); ctx.scale(sc, sc); ctx.translate(-(g.x + Lt.width / 2), -(g.y - numAsc / 2)); }
    const Lt = odometer(ctx, S, st.num, g.x, g.y, g.numO, v, vel, color, dropN);
    ctx.restore();
    // the unit
    if (st.unit) {
      const ux = g.x + Lt.width + 0.9 * u;
      const ul = layout(ctx, st.unit, g.unitO);
      sillText(ctx, S, st.unit, ux, g.y, { ...g.unitO, color: PAL.dim, rise: ul.ascent * 1.4, window: 0.5 },
        seg(t, t0 + 0.1, t0 + 0.45), out, [g.y - ul.ascent * 1.3, g.y + ul.descent * 0.6]);
    }
    // the label
    const lb = g.lab, ll = layout(ctx, st.label, lb.o);
    const hero = st.hero;
    const lt0 = hero ? SLAM + 0.02 : t0 + 0.07;
    sillText(ctx, S, st.label, lb.x, lb.y, { ...lb.o, color: hero ? PAL.gold : PAL.dim, rise: ll.ascent * 1.5, window: hero ? 0.3 : 0.4 },
      seg(t, lt0, lt0 + (hero ? 0.32 : 0.48)), out, [lb.y - ll.ascent * 1.4, lb.y + ll.descent + 0.2 * u]);
  });
}

function drawLockup(ctx, S, t, L) {
  const u = S.u, cy = L.cy, lw = S.lw * 1.7;
  // the name rises out of the thread (the line on it) or out of its own sill
  const sinkName = seg(t, 4.40, 4.70, inOutQuad);
  L.name.forEach((ln, i) => {
    const Lt = layout(ctx, ln.str, L.nameO);
    const t0 = SLAM + 0.08 + i * 0.1;
    const bottom = ln.thread ? cy - lw * 0.6 : ln.y + Lt.descent * 0.4;
    const rise = bottom - ln.y + Lt.ascent + 0.3 * u;
    sillText(ctx, S, ln.str, ln.x, ln.y, { ...L.nameO, color: PAL.ink, rise, window: 0.55, ease: siteE },
      seg(t, t0, t0 + 0.72), sinkName, [0, bottom]);
  });
  // the role and the address drop from the thread
  const top = cy + lw * 0.6;
  const sinkLow = seg(t, 4.42, 4.70, inOutQuad);
  L.role.forEach((ln, i) => {
    const t0 = SLAM + 0.2 + i * 0.06;
    const rise = -(ln.y - top + 0.3 * u);
    sillText(ctx, S, ln.str, ln.x, ln.y, { ...L.roleO, color: PAL.dim, rise, window: 0.3, ease: outExpo },
      seg(t, t0, t0 + 0.5), sinkLow, [top, S.H]);
  });
  {
    const e = L.email, t0 = SLAM + 0.36;
    const rise = -(e.y - top + 0.3 * u);
    sillText(ctx, S, EMAIL, e.x, e.y, { ...e.o, color: PAL.ink, rise, window: 0.35, ease: outExpo },
      seg(t, t0, t0 + 0.55), sinkLow, [top, S.H]);
  }
  // the footer, quietly
  const f = L.foot, fa = seg(t, SLAM + 0.55, SLAM + 1.0, outCubic) * (1 - seg(t, 4.3, 4.55));
  if (fa > 0) text(ctx, S, FOOT, f.x, f.y, { ...f.o, color: PAL.faint, alpha: fa, reveal: 1, rise: 0 });
}

function lens(S, t, L) {
  const fx = S.fx, u = S.u;
  const c = t - CINCH;
  if (c >= 0 && c < 0.45) { const e = decay(c, 0.06); fx.ab += 0.14 * e; fx.shake += 0.18 * u * e; }
  const h = t - SLAM;
  if (h >= 0 && h < 0.7) {
    const e = decay(h, 0.085);
    fx.ab += 0.42 * e; fx.shake += 0.5 * u * e;
    // the shock leaves the knot, which tugs tight as the one lands
    fx.warp = h / 0.7; fx.warpX = L.knotX / S.W; fx.warpY = 0.5 - 2.5 * L.k / S.H;
  }
}

export default {
  id: 'operator',
  title: 'One operator',
  caption: 'The gold thread ties itself into a figure-eight knot as the numbers land — 17 min of original animation, 12 character voices, 4 brands, 1 operator — and signs off: Chun Hee, AI-native Web3 marketer and content creator in Kuala Lumpur, chunhee437@gmail.com.',
  assets: [],
  models: [],
  still: 3.9,
  draw(ctx, S) {
    const t = S.lt;
    if (t < T_IN || t > T_OUT) { rest(ctx, S); return; }
    const L = getLayout(ctx, S);
    lens(S, t, L);
    drawStats(ctx, S, t, L);
    drawLockup(ctx, S, t, L);
    drawKnot(ctx, S, t, L);
  }
};
