/* Station 03 — Storyboard. By hand.

   The thread's highlight runs in from the left, leaves the line and draws the
   first star-chart line up to a sheet — and the 23 hand-drawn storyboard
   sheets light one after another as a constellation: small paper plates in
   depth, joined by hairlines, each with its sheet number and a tiny chart
   coordinate. The camera drifts up into the chart; NO TOOL. lands on the
   downbeat; sheet 03 (Aurea) swings out of the stars to the front, sharp
   enough to read, and a graphite pencil marks it up — its lens and move
   ringed, an arrow to the cut it hands into. Then the camera surges through
   the chart, the whole constellation folds flat into the plane of the
   thread, and every line and plate lies down on it: the seam.

   Beats (96 bpm): sheet 01 lights on beat 1 and the stage label types on
   with it (bottom left, a different part of the frame), BY HAND on beat 2,
   NO TOOL. on the bar (2.5), the hero leaves the chart on beat 5, the pencil
   draws from beat 6, the surge on bar 3 (5.0). */
import {
  clamp, lerp, seg, rng, noise1, inOutCubic, inOutQuad, outCubic, outExpo,
  inQuad, inCubic, outBack, smoothstep, text, layout, TAU
} from '../../kit.js';
import { camera, list } from '../../space.js';
import { seam, space, wire, metal, chip, numeral, UI, MONO } from '../kit3.js';
import { BEAT, BAR } from '../palette.js';

// ── the sheets: /process's storyboard pack, in its order (SB 01 … SB 23) ─────
const HASH = ['717b7e7b39', '73f234d2d7', 'cfc186a5a7', 'c82eaf2a94', '3073250c96', 'e92b32d644',
  'f8fb0b8f12', 'b17a31d254', '6e2dd154c3', '93408e536a', '38eb0f84b9', '0827ab085e', '0ea37a63de',
  '054dc27392', 'e5ecec5279', 'ce1e57a096', 'c91b5a19c7', 'a51b87f1a5', 'adad2cf6ca', '5118235a8d',
  '5c79ff2909', '8c2a997ab8', '68b4073ec7'];
const SHEETS = HASH.map(h => `assets/process/img-${h}.webp`);
const HERO = 2;                        // SB 03 — Aurea, the first Land of Hope

/* the chart. Near and mid sheets: [sx, sy, z] — where the sheet sits in the
   establishing frame (the camera at lt = T.est, as fractions of the frame)
   and its depth. Far sheets: [ex, ey, d, 1] — where it sits in the closing
   frame (the camera come to rest at the end) and how far ahead. Near: the
   first figure, top and right, clear of the stage label. Mid: the ones the
   surge passes. Far: a tight cluster dead ahead in the establishing frame
   that the camera flies at — by the end it spans the frame, and it is what
   folds flat into the thread. */
const NODES = [
  [0.43, 0.33, 11], [0.56, 0.16, 13], [0.75, 0.31, 10], [0.28, 0.16, 14], [0.89, 0.12, 13.5],
  [0.58, 0.53, 12], [0.87, 0.56, 11.5],
  [0.12, 0.09, 20], [0.71, 0.05, 22], [0.98, 0.37, 19], [0.67, 0.76, 18], [0.49, 0.43, 23],
  [0.07, 0.35, 21], [0.83, 0.82, 20],
  [0.29, 0.30, 7, 1], [0.62, 0.22, 9, 1], [0.14, 0.64, 8, 1], [0.76, 0.64, 6.5, 1], [0.46, 0.75, 11, 1],
  [0.06, 0.18, 15, 1], [0.92, 0.34, 13, 1], [0.50, 0.12, 18, 1], [0.54, 0.46, 21, 1]
];
const EDGES = [
  [0, 1], [3, 1], [1, 4], [0, 2], [0, 5], [5, 6], [2, 6], [3, 7], [7, 12], [4, 9], [1, 8], [8, 4],
  [6, 13], [13, 10], [10, 5], [0, 11], [11, 22], [22, 14], [14, 19], [14, 15], [15, 21], [15, 20],
  [14, 16], [16, 18], [18, 17], [17, 20], [22, 17], [12, 19], [9, 20], [10, 18], [8, 21]
];
const SW = 1.7, SH = SW * 0.565;      // a sheet's world size
const ZT = 90;                         // the thread lies far out, across the whole chart
const NODE_X = 0.36;                   // where the highlight leaves the thread (frame fraction)

// light-up order: breadth-first from SB 01 along the chart's lines
const IGN = new Array(NODES.length).fill(Infinity);
{
  IGN[0] = BEAT;
  const q = [0];
  while (q.length) {
    const a = q.shift();
    for (const [p, r] of EDGES) {
      const b = p === a ? r : r === a ? p : -1;
      if (b < 0 || IGN[b] !== Infinity) continue;
      IGN[b] = IGN[a] + 0.12 + 0.07 * rng(b, 3);
      q.push(b);
    }
  }
}
// a chart coordinate for each sheet, from where it sits (right ascension / declination)
const COORD = NODES.map(([sx, sy, z, end]) => {
  if (end) z += 27;
  const ra = ((Math.atan2((sx - 0.5) * 1.6, 1) / TAU + 0.5) * 24 + z * 0.37) % 24;
  const dec = -(sy - 0.5) * 76 + (z % 7) * 1.7;
  const h = Math.floor(ra), m = Math.floor((ra - h) * 60);
  const d = Math.round(dec);
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}m ${d >= 0 ? '+' : '−'}${String(Math.abs(d)).padStart(2, '0')}°`;
});

// ── time ─────────────────────────────────────────────────────────────────────
const T = {
  est: 2.0,                                        // the frame the chart is composed for
  sparkIn: 0.1, sparkNode: 0.4, first: BEAT,       // along the thread, then up the first line
  stage: BEAT, chip: 2 * BEAT, stageOut: 2.36,      // title held ≥ 1 s before the hit clears it
  hit: BAR,                                        // NO TOOL.
  heroIn: 5 * BEAT, heroLand: 5 * BEAT + 0.62,
  heroRush: 5 * BEAT + 0.38,                       // the approach at its fastest (the whoosh is centred here)
  noOut: 5 * BEAT + 0.3,                           // NO TOOL. starts sinking as the sheet rushes in
  pencil: 6 * BEAT + 0.05, pencilEnd: 7 * BEAT + 0.3,
  // the line comes up as NO TOOL. goes (upright it sits where TOOL. was, so it waits for it)
  cap: 3.5, capP: 3.6, capOut: 5.2,
  heroOut: 2 * BAR,                                // the surge
  fold: 6.3, foldEnd: 7.02, end: 7.4
};

// ── helpers ──────────────────────────────────────────────────────────────────
function camAt(lt) {
  const back = seg(lt, 5.9, 7.0, inOutCubic);
  const z = 3.4 * seg(lt, 0.45, 2.6, inOutCubic) + 1.3 * seg(lt, T.hit, T.hit + 0.8, outExpo)
    + 1.3 * seg(lt, 3.0, 5.2, inOutQuad) + 20 * seg(lt, 4.92, 6.75, inOutCubic);
  const y = (-1.05 * seg(lt, 0.45, 2.6, inOutCubic) - 0.3 * seg(lt, 3.0, 5.4, inOutQuad)) * (1 - back);
  const x = (0.55 * seg(lt, 0.45, 2.8, inOutCubic) - 0.95 * seg(lt, 3.4, 6.0, inOutQuad)) * (1 - back);
  const roll = (-0.04 * seg(lt, 0.45, 2.8, inOutCubic) + 0.075 * seg(lt, 4.9, 6.0, inOutCubic)) * (1 - back);
  return { x, y, z, roll };
}

function worldOf(S, i, F, E, Z) {
  const [sx, sy0, z, end] = NODES[i];
  if (end) return [(sx - 0.5) * S.W * z / F, (sy0 - 0.5) * S.H * z / F, Z.z + z];
  // on an upright frame the chart keeps to the upper two thirds, over the stage label
  const sy = S.portrait ? 0.05 + sy0 * 0.68 : sy0;
  return [E.x + (sx - 0.5) * S.W * (z - E.z) / F, E.y + (sy - 0.5) * S.H * (z - E.z) / F, z];
}

// bounded caches: a small copy of every sheet, two sprites, the hero sheet (see heroSheets)
const thumbs = new Map();
function thumb(img) {
  if (!img || !img.width) return null;
  let c = thumbs.get(img);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 480; c.height = Math.round(480 * img.height / img.width);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, c.width, c.height);
  if (thumbs.size > 40) thumbs.clear();
  thumbs.set(img, c);
  return c;
}
let glowC = null;
function glowSprite() {
  if (glowC) return glowC;
  glowC = document.createElement('canvas');
  glowC.width = glowC.height = 128;
  const g = glowC.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,246,230,1)'); r.addColorStop(0.18, 'rgba(255,240,215,.45)');
  r.addColorStop(0.5, 'rgba(255,236,210,.10)'); r.addColorStop(1, 'rgba(255,236,210,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return glowC;
}
let sparkC = null;
function sparkSprite() {
  if (sparkC) return sparkC;
  sparkC = document.createElement('canvas');
  sparkC.width = sparkC.height = 128;
  const g = sparkC.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.12, 'rgba(236,244,255,.85)');
  r.addColorStop(0.35, 'rgba(174,203,255,.22)'); r.addColorStop(1, 'rgba(174,203,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return sparkC;
}

/* the pencil: graphite on the Aurea sheet, in the sheet's own pixels
   (1000 × 565). A loose loop round panel 1's lens-and-move note, then an
   arrow along the gutter to panel 2 — the cut it hands into. The note
   ("1. EXTREME-WIDE AERIAL ESTABLISHING / HIGH CRANE DESCENDING") sits at
   x 10–188, y 254–273, 10 px in from the paper's edge, in a gutter from
   y 248 to 286: the loop is a squarish ellipse (exponent 4) so it hugs that
   gutter, passes left of the "1." and stays on the paper (x ≥ 2). */
const PENCIL = (() => {
  const ring = [];
  const cx = 98, cy = 265, rx = 97, ry = 20, a0 = -2.45, n = 4;
  const sq = v => Math.sign(v) * Math.pow(Math.abs(v), 2 / n);
  for (let i = 0; i <= 64; i++) {
    const f = i / 64, a = a0 + f * (TAU + 0.55);
    const wob = 1 + 0.035 * noise1(f * 7, 11);
    ring.push([cx + sq(Math.cos(a)) * rx * wob + f * 2, cy + sq(Math.sin(a)) * ry * wob - f * 2]);
  }
  const arrow = [];
  const P0 = [203, 273], P1 = [246, 286], P2 = [302, 285], P3 = [341, 267];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, u = 1 - t;
    arrow.push([u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0],
      u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1]]);
  }
  const head = [[328, 259.5], [343, 266.5], [331, 278]];
  return { ring, arrow, head };
})();
function plen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
const PL = [plen(PENCIL.ring), plen(PENCIL.arrow), plen(PENCIL.head)];

function graphite(g, pts, L, p, w) {
  if (p <= 0) return;
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
  g.setLineDash([L * clamp(p), L * 2]);
  g.strokeStyle = 'rgba(48,46,42,.28)'; g.lineWidth = w * 1.9; g.stroke();     // the soft edge of the lead
  g.strokeStyle = 'rgba(40,38,35,.86)'; g.lineWidth = w; g.stroke();           // the line
  g.setLineDash([]);
  g.restore();
}

/** the pencil at progress p, drawn in the sheet's own 1000-px space onto g */
function pencilOn(g, p) {
  const total = PL[0] + PL[1] * 0.9 + PL[2];
  let left = clamp(p) * total;
  const take = L => { const q = clamp(left / L); left -= L; return q; };
  graphite(g, PENCIL.ring, PL[0], take(PL[0]), 5.2);
  graphite(g, PENCIL.arrow, PL[1], take(PL[1] * 0.9), 4.6);
  graphite(g, PENCIL.head, PL[2], take(PL[2]), 4.6);
}

/* the hero sheet: a decoded copy (so nothing draws from the <img> per frame)
   and a composite with the finished pencil, for when it turns in perspective.
   While it faces us the pencil is drawn live over the plain copy instead. */
let heroOf = null, heroBase = null, heroDone = null;
function heroSheets(img) {
  if (!img || !img.width) return null;
  if (heroOf !== img) {
    heroBase = document.createElement('canvas'); heroBase.width = img.width; heroBase.height = img.height;
    heroBase.getContext('2d').drawImage(img, 0, 0);
    heroDone = document.createElement('canvas'); heroDone.width = img.width; heroDone.height = img.height;
    const g = heroDone.getContext('2d');
    g.drawImage(heroBase, 0, 0);
    g.save(); g.scale(img.width / 1000, img.width / 1000); pencilOn(g, 1); g.restore();
    heroOf = img;
  }
  return { base: heroBase, done: heroDone };
}

/* a plate turned about its vertical axis, in true perspective: drawn in thin
   vertical strips, each scaled for its own depth (used for the hero only;
   facing us it is a single draw). */
function plate3d(ctx, src, cx, cy, w, h, yaw, o = {}) {
  const D = w * 1.5, cs = Math.cos(yaw), sn = Math.sin(yaw);
  const px = x => { const zz = D + x * sn; return { X: cx + (x * cs) * D / zz, k: D / zz }; };
  const l = px(-w / 2), r = px(w / 2);
  const q = { tl: [l.X, cy - h * l.k / 2], bl: [l.X, cy + h * l.k / 2], tr: [r.X, cy - h * r.k / 2], br: [r.X, cy + h * r.k / 2] };
  if (Math.abs(r.X - l.X) < 1) return q;
  if (Math.abs(yaw) < 0.004) {           // facing us: one draw
    ctx.drawImage(src, cx - w / 2, cy - h / 2, w, h);
    if (o.edge) { ctx.strokeStyle = o.edge; ctx.lineWidth = 1; ctx.strokeRect(cx - w / 2, cy - h / 2, w, h); }
    return q;
  }
  // thin strips, each scaled for the depth at its own centre, so the content lines up across them
  const n = Math.round(clamp(Math.abs(r.X - l.X) / 3, 16, 160));   // ~3 px strips: no visible steps on the slanted edges
  const sw = src.width / n, fw = o.frameW ?? Infinity;
  let prev = px(-w / 2);
  for (let i = 0; i < n; i++) {
    const b = px(-w / 2 + ((i + 1) / n) * w);
    const L = Math.min(prev.X, b.X), R = Math.max(prev.X, b.X);
    prev = b;
    if (R < 0 || L > fw) continue;       // off the frame
    const hh = h * px(-w / 2 + ((i + 0.5) / n) * w).k;
    ctx.drawImage(src, i * sw, 0, sw, src.height, L - 0.35, cy - hh / 2, R - L + 0.7, hh);
  }
  if (o.edge) {
    ctx.beginPath(); ctx.moveTo(...q.tl); ctx.lineTo(...q.tr); ctx.lineTo(...q.br); ctx.lineTo(...q.bl); ctx.closePath();
    ctx.strokeStyle = o.edge; ctx.lineWidth = 1; ctx.stroke();
  }
  return q;
}

/** tracked monospace caps, one glyph at a time (canvas has no tracking for mono) */
function tracked(ctx, str, x, y, size, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 500} ${Math.round(size)}px ${MONO}`;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.fillStyle = o.color || UI.muted;
  const adv = ctx.measureText('M').width + (o.tracking ?? 0.22) * size;
  const n = o.reveal === undefined ? str.length : Math.floor(clamp(o.reveal) * str.length + 1e-6);
  let cx = o.align === 'right' ? x - adv * str.length + (o.tracking ?? 0.22) * size : x;
  for (let i = 0; i < n; i++) { ctx.fillText(str[i], cx, y); cx += adv; }
  if (o.caret && n < str.length) { ctx.fillStyle = UI.ink; ctx.fillRect(cx, y - size * 0.8, size * 0.55, size * 0.95); }
  ctx.restore();
  return adv * str.length;
}

/* the chart's graticule: faint arcs of declination and hour lines converging
   on a pole below the frame, fixed to the sky (it moves with the stars, not
   with the camera), with tiny tick labels on the frame's left and top edges. */
function graticule(ctx, S, ox, oy, zoom, a) {
  if (a <= 0.01) return;
  const { W, H, u } = S;
  const cx = W / 2 + ox, px = cx, py = H / 2 + oy + 2.2 * Math.max(W, H) * zoom;
  const R0 = py - (H / 2 + oy), step = 0.3 * Math.min(W, H) * zoom;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = 'rgba(190,204,232,.5)'; ctx.lineWidth = Math.max(1, 0.08 * u);
  ctx.setLineDash([0.35 * u, 1.1 * u]);
  const fs = Math.round((S.portrait ? 1.15 : 0.95) * u);
  ctx.font = `500 ${fs}px ${MONO}`; ctx.fillStyle = 'rgba(166,164,155,.9)'; ctx.textBaseline = 'alphabetic';
  const span = Math.asin(Math.min(1, (W * 0.75) / (R0 + 2 * step)));
  for (let k = -2; k <= 2; k++) {
    const r = R0 - k * step;
    ctx.beginPath(); ctx.arc(px, py, r, -Math.PI / 2 - span, -Math.PI / 2 + span); ctx.stroke();
    // where it meets the left edge
    const dx = 0.035 * W - px, yy = py - Math.sqrt(Math.max(0, r * r - dx * dx));
    if (yy > 0.1 * H && yy < 0.9 * H) ctx.fillText(`+${String(20 - k * 10).padStart(2, '0')}°`, 0.035 * W + 0.5 * u, yy - 0.5 * u);
  }
  const hours = S.portrait ? [-1, 0, 1] : [-2, -1, 0, 1, 2];
  const dth = (S.portrait ? 0.34 : 0.3) * W / (R0 + 2 * step);
  for (const h of hours) {
    const th = -Math.PI / 2 + h * dth;
    const r0 = R0 - 2.6 * step, r1 = R0 + 2.6 * step;
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(th) * r0, py + Math.sin(th) * r0); ctx.lineTo(px + Math.cos(th) * r1, py + Math.sin(th) * r1);
    ctx.stroke();
    // where it meets the top edge
    const ty = 0.1 * H, k2 = (ty - py) / Math.sin(th), tx = px + Math.cos(th) * k2;
    if (tx > 0.08 * W && tx < 0.92 * W) ctx.fillText(`${String(4 + h).padStart(2, '0')}h`, tx + 0.5 * u, ty);
  }
  ctx.restore();
}

/** a soft pool of dark behind type, so the chart never fights it */
function scrim(ctx, x, y, rx, ry, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, 'rgba(5,6,10,.9)'); g.addColorStop(0.55, 'rgba(5,6,10,.6)'); g.addColorStop(1, 'rgba(5,6,10,0)');
  ctx.globalAlpha = a; ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

function ticks(ctx, S, x0, y0, x1, y1, len, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = 'rgba(245,244,240,.55)'; ctx.lineWidth = Math.max(1, 0.12 * S.u);
  ctx.beginPath();
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    ctx.moveTo(x, y + sy * len); ctx.lineTo(x, y); ctx.lineTo(x + sx * len, y);
  }
  ctx.stroke();
  ctx.restore();
}

// ── layout per frame shape ──────────────────────────────────────────────────
function heroRect(S) {
  const { W, H, u } = S;
  if (!S.portrait) {
    const w = Math.min(0.585 * W, 1.36 * H);
    return { cx: W * 0.935 - w / 2, cy: H * 0.465, w, h: w * 0.565 };
  }
  const w = 0.9 * W;
  return { cx: W / 2, cy: H * 0.4 - 2 * u, w, h: w * 0.565 };
}

// ── the chapter ──────────────────────────────────────────────────────────────
export default {
  id: 'boards',
  title: 'Storyboard',
  caption: 'Station 03, by hand: the 23 storyboard sheets as a constellation, one swinging forward to be marked up in pencil.',
  assets: SHEETS,
  models: [],
  still: 4.8,
  sfx: [
    { at: T.first, type: 'tick', gain: 0.6 },
    { at: T.chip, type: 'tick', gain: 0.4 },
    { at: T.hit, type: 'impact' },
    { at: T.heroRush, type: 'whoosh', gain: 0.55 },
    { at: T.heroOut, type: 'whoosh', gain: 0.8 }
  ],
  prepare(S) {
    for (const p of SHEETS) thumb(S.img(p));
    glowSprite(); sparkSprite();
    heroSheets(S.img(SHEETS[HERO]));
  },
  draw(ctx, S) {
    const { W, H, u, lt } = S;
    if (lt < 0.1 || lt > T.end) { seam(ctx, S); return; }

    // ── camera, stars ───────────────────────────────────────────────────────
    const C = camAt(lt);
    const cam = camera(S, { x: C.x, y: C.y, z: C.z, roll: C.roll, zoom: 1.1, near: 0.4 });
    const F = cam.F;
    const starZoom = 1 + 0.035 * seg(lt, 0.45, 2.6, inOutCubic) + 0.1 * seg(lt, 4.9, 6.2, inOutCubic) * (1 - seg(lt, 6.0, 7.3, inOutCubic))
      - 0.035 * seg(lt, 6.0, 7.3, inOutCubic);
    const surge = Math.sin(Math.PI * seg(lt, 5.05, 6.35));
    space(ctx, S, { x: -C.x * 0.012, y: -C.y * 0.02, zoom: starZoom, warp: 0.18 * surge * surge });
    graticule(ctx, S, -C.x * 0.012 * W, -C.y * 0.02 * H, starZoom,
      0.55 * seg(lt, 0.7, 1.6, inOutQuad) * (1 - seg(lt, 6.1, 6.7, inOutQuad)) * (1 - 0.5 * surge));

    const fold = seg(lt, T.fold, T.foldEnd, inOutCubic);          // the chart lying down into the thread's plane
    const fadeOut = 1 - seg(lt, 6.82, 7.32, inOutQuad);            // what is left of it, going
    const heroOn = lt >= T.heroIn && lt < T.heroOut + 0.8;

    // world positions (folded)
    const E = camAt(T.est), Z = camAt(T.end);
    const P = NODES.map((_, i) => { const w = worldOf(S, i, F, E, Z); w[1] *= 1 - fold; return w; });
    const proj = P.map(w => cam.project(w[0], w[1], w[2]));

    // ── the thread, far out across the chart ─────────────────────────────────
    const threadA = lerp(1, 0.2, seg(lt, 0.7, 1.7, inOutQuad)) + 0.8 * seg(lt, 6.55, 7.28, inOutCubic);
    const phase = 0.6 * seg(lt, 0.1, 1.7, outCubic) + 0.15 * seg(lt, 1.7, 6.2) + 0.25 * seg(lt, 6.2, T.end, inOutCubic);
    const Lx = 4 * W / F * (ZT - C.z);
    const ta = cam.project(-Lx, 0, ZT), tb = cam.project(Lx, 0, ZT);
    if (ta && tb) {
      wire(ctx, S, c => { c.beginPath(); c.moveTo(ta.x, ta.y); c.lineTo(tb.x, tb.y); }, { phase, alpha: clamp(threadA) });
    }

    // ── the chart lines ─────────────────────────────────────────────────────
    const lineW = Math.max(1, 0.1 * u);
    const segLine = (A, B, p, alpha) => {
      // clip to the near plane, then project
      let a = A, b = B, clipped = 1;
      const nz = C.z + 0.45;
      if (a[2] < nz && b[2] < nz) return;
      if (a[2] < nz || b[2] < nz) clipped = 1 - fold;     // lines running out past the lens fade as the chart lies down
      if (a[2] < nz) { const k = (nz - a[2]) / (b[2] - a[2]); a = [lerp(a[0], b[0], k), lerp(a[1], b[1], k), nz]; }
      if (b[2] < nz) { const k = (nz - b[2]) / (a[2] - b[2]); b = [lerp(b[0], a[0], k), lerp(b[1], a[1], k), nz]; }
      const pa = cam.project(...a), pb = cam.project(...b);
      if (!pa || !pb) return;
      const x1 = lerp(pa.x, pb.x, p), y1 = lerp(pa.y, pb.y, p);
      const dz = Math.min(pa.d, pb.d);
      const fog = clamp((dz - 16) / 60) * 0.65;
      ctx.globalAlpha = clamp(alpha * (1 - fog) * clipped);
      ctx.strokeStyle = 'rgba(205,216,238,.4)';
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(x1, y1); ctx.stroke();
      return [x1, y1];
    };
    ctx.save();
    ctx.lineWidth = lineW; ctx.lineCap = 'round';
    const lineA = fadeOut * (1 + 1.3 * Math.sin(Math.PI * seg(lt, T.fold, 7.15)));
    // the first line: from the thread up to SB 01, drawn by the highlight
    const firstP = seg(lt, T.sparkNode, T.first, outCubic);
    const nodeF = [(NODE_X - 0.5) * W / F * ZT, 0, ZT];   // the station node, on the thread
    if (firstP > 0) segLine(nodeF, P[0], firstP, lineA);
    // figure lines solid; the long links between near, mid and far figures dotted, as on a chart
    const group = i => (NODES[i][3] ? 2 : i >= 7 ? 1 : 0);
    const dots = [Math.max(1, 0.25 * u), Math.max(2, 0.7 * u)];
    for (let pass = 0; pass < 2; pass++) {
      ctx.setLineDash(pass ? dots : []);
      for (const [a, b] of EDGES) {
        if ((group(a) !== group(b)) !== (pass === 1)) continue;
        const [s, e] = IGN[a] <= IGN[b] ? [a, b] : [b, a];
        const p = seg(lt, IGN[s], IGN[e], outCubic);
        if (p <= 0) continue;
        segLine(P[s], P[e], p, lineA * (pass ? 1.15 : 1));
      }
    }
    ctx.setLineDash([]);
    ctx.restore();

    // ── the spark: along the thread, then up the first line ─────────────────
    if (lt < T.first + 0.35) {
      const sp = sparkSprite();
      let sx, sy, sa = 1;
      const pn = cam.project(...nodeF), p0 = proj[0];
      if (lt < T.sparkNode) {
        const f = inQuad(seg(lt, T.sparkIn, T.sparkNode));
        sx = lerp(-0.04 * W, pn ? pn.x : NODE_X * W, f); sy = pn ? pn.y : H / 2;
        sa = seg(lt, T.sparkIn, T.sparkIn + 0.08);
        // a fading trail along the metal
        const tl = 14 * u * (0.4 + f);
        const g = ctx.createLinearGradient(sx - tl, sy, sx, sy);
        g.addColorStop(0, 'rgba(174,203,255,0)'); g.addColorStop(1, 'rgba(240,246,255,.8)');
        ctx.fillStyle = g; ctx.fillRect(sx - tl, sy - 0.18 * u, tl, 0.36 * u);
      } else {
        const f = firstP;
        sx = lerp(pn ? pn.x : NODE_X * W, p0 ? p0.x : W / 2, f); sy = lerp(pn ? pn.y : H / 2, p0 ? p0.y : H / 3, f);
        sa = 1 - seg(lt, T.first, T.first + 0.3);
      }
      const r = 5 * u * (1 + 0.5 * seg(lt, T.first - 0.05, T.first + 0.12) * (1 - seg(lt, T.first + 0.12, T.first + 0.35)));
      ctx.save(); ctx.globalAlpha = sa; ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(sp, sx - r, sy - r, 2 * r, 2 * r);
      ctx.restore();
    }
    // the station node, a small ring where the first line leaves the thread
    if (lt > T.sparkNode - 0.05 && lt < 1.6) {
      const pn = cam.project(...nodeF);
      const na = seg(lt, T.sparkNode - 0.05, T.sparkNode + 0.1) * (1 - seg(lt, 1.1, 1.6));
      if (pn && na > 0) {
        ctx.save(); ctx.globalAlpha = na; ctx.strokeStyle = 'rgba(236,242,255,.8)'; ctx.lineWidth = lineW;
        ctx.beginPath(); ctx.arc(pn.x, pn.y, (0.9 + 0.5 * seg(lt, T.sparkNode, T.sparkNode + 0.3, outCubic)) * u, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }

    // ── the sheets: paper plates, depth-sorted ──────────────────────────────
    const D = list();
    const glow = glowSprite();
    const labelSize = (S.portrait ? 1.25 : 1.0) * u;
    for (let i = 0; i < NODES.length; i++) {
      if (lt < IGN[i]) continue;
      if (heroOn && i === HERO) continue;
      const w = P[i];
      const ig = seg(lt, IGN[i], IGN[i] + 0.42);
      const img = S.img(SHEETS[i]);
      const yaw = (rng(i, 7) - 0.5) * 0.7, rz = (rng(i, 8) - 0.5) * 0.12;
      D.custom(w[2], (c, p) => {
        const d = p.d;
        if (d < 0.6) return;
        const sc = lerp(0.3, 1, outBack(ig, 1.3));
        const pw = SW * p.k * sc, ph = SH * p.k * sc * (1 - fold * 0.985);
        if (pw > 4 * W) return;
        const fog = clamp((d - 14) / 55) * 0.7;
        // a sheet rushing past the lens thins out before it can fill the frame
        const a = clamp(ig * 3) * fadeOut * smoothstep(0.75, 2.4, d);
        if (a <= 0) return;
        /* glow: every sheet is a warm star — a tight bloom, so neighbours
           lighting together stay points of light, never a haze between them */
        const gr = Math.max(pw * 0.7, 2.5 * u) * (1 + 0.5 * (1 - ig));
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = a * (0.12 + 0.35 * (1 - ig)) * (1 - fog * 0.6);
        c.drawImage(glow, -gr, -gr * (1 - fold * 0.9), gr * 2, gr * 2 * (1 - fold * 0.9));
        c.restore();
        // the ignition flare: a four-point glint
        if (ig < 1) {
          const fl = (1 - ig) * Math.max(2.6 * u, pw * 0.6);
          c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = (1 - ig) * 0.9;
          c.strokeStyle = 'rgba(255,248,236,.9)'; c.lineWidth = Math.max(1, 0.12 * u);
          c.beginPath(); c.moveTo(-fl, 0); c.lineTo(fl, 0); c.moveTo(0, -fl * 0.7); c.lineTo(0, fl * 0.7); c.stroke();
          c.restore();
        }
        c.save();
        c.globalAlpha = a;
        c.rotate(rz * (1 - fold));
        c.transform(Math.cos(yaw * (1 - fold)), Math.sin(yaw * (1 - fold)) * 0.22, 0, 1, 0, 0);
        if (pw < 2.5 || ph < 0.8) {
          c.fillStyle = '#f3efe6'; c.fillRect(-Math.max(1, pw) / 2, -Math.max(0.6, ph) / 2, Math.max(1, pw), Math.max(0.6, ph));
        } else {
          const src = thumb(img);
          if (src) c.drawImage(src, -pw / 2, -ph / 2, pw, ph);
          else { c.fillStyle = '#efebe2'; c.fillRect(-pw / 2, -ph / 2, pw, ph); }
          c.strokeStyle = 'rgba(255,250,240,.5)'; c.lineWidth = 1; c.strokeRect(-pw / 2, -ph / 2, pw, ph);
          if (fog > 0) { c.globalAlpha = a * fog; c.fillStyle = UI.space; c.fillRect(-pw / 2 - 1, -ph / 2 - 1, pw + 2, ph + 2); }
        }
        c.restore();
        // the chart label: sheet number and coordinate
        const la = a * clamp((pw - 34) / 40) * (1 - fold) * clamp((ig - 0.3) * 2) * (1 - fog);
        if (la > 0.02) {
          c.save();
          c.globalAlpha = la;
          c.font = `600 ${Math.round(labelSize)}px ${MONO}`;
          c.fillStyle = UI.ink; c.textBaseline = 'alphabetic';
          const lx = -pw / 2, ly = ph / 2 + labelSize * 1.55;
          const num = String(i + 1).padStart(2, '0');
          c.fillText(num, lx, ly);
          c.font = `400 ${Math.round(labelSize)}px ${MONO}`;
          c.fillStyle = UI.faint;
          c.fillText(COORD[i], lx + labelSize * 2.2, ly);
          c.restore();
        }
      }, { x: w[0], y: w[1] });
    }
    D.draw(ctx, S, cam);

    /* the close: with the chart lying in the thread, one highlight runs off
       along it to the right — on to the next station — mirroring the one
       that came in from the left */
    if (lt > 6.9 && lt < 7.38) {
      const f = inQuad(seg(lt, 6.9, 7.36));
      const sx = lerp(0.5 * W, 1.25 * W, f), sy = H / 2;
      const a = seg(lt, 6.9, 7.0);
      const tl = 16 * u * (0.5 + f);
      ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(sx - tl, sy, sx, sy);
      g.addColorStop(0, 'rgba(174,203,255,0)'); g.addColorStop(1, 'rgba(240,246,255,.75)');
      ctx.fillStyle = g; ctx.fillRect(sx - tl, sy - 0.18 * u, tl, 0.36 * u);
      const r = 4.5 * u;
      ctx.drawImage(sparkSprite(), sx - r, sy - r, 2 * r, 2 * r);
      ctx.restore();
    }

    // ── HUD: the stage ──────────────────────────────────────────────────────
    const stageIn = seg(lt, T.stage, T.stage + 0.5, outCubic);
    const stageA = stageIn * (1 - seg(lt, T.stageOut, T.hit, inQuad));
    if (stageA > 0) {
      const x0 = S.portrait ? 0.08 * W : 0.075 * W;
      const titleSize = (S.portrait ? 9.2 : 7.4) * u;
      const yT = S.portrait ? H * 0.77 : H * 0.8;          // title baseline
      scrim(ctx, x0 + 22 * u, yT - 6 * u, S.portrait ? 0.7 * W : 0.42 * W, S.portrait ? 0.16 * H : 0.3 * H, stageA);
      const lab = 'STAGE 03 OF 06';
      tracked(ctx, lab, x0, yT - titleSize * 1.3, (S.portrait ? 1.9 : 1.6) * u, {
        alpha: stageA, color: '#c9c7bf', reveal: seg(lt, T.stage, T.stage + 0.35), caret: true, weight: 600
      });
      const tr = seg(lt, T.stage + 0.1, T.stage + 0.7);
      // out on the upbeat before the hit: the title sinks below its sill, left to right
      text(ctx, S, 'Storyboard', x0 - 0.3 * u, yT, {
        size: titleSize, weight: 800, tracking: -0.03, color: UI.ink, alpha: stageIn, reveal: tr, mask: true, window: 0.5,
        glyph: i => ({ dy: inCubic(seg(lt, T.stageOut - 0.02 + i * 0.009, T.stageOut + 0.1 + i * 0.009)) * titleSize * 1.05 })
      });
      const numSize = (S.portrait ? 20 : 24) * u;
      const L = layout(ctx, 'Storyboard', { size: titleSize, weight: 800, tracking: -0.03 });
      const nW = layout(ctx, '03', { size: numSize, weight: 900 }).width;
      numeral(ctx, S, '03', S.portrait ? W * 0.93 : x0 + L.width + 2.4 * u + nW, yT, numSize, {
        alpha: stageA * seg(lt, T.stage + 0.15, T.stage + 0.8, outCubic), metal: true, phase: 0.3 + lt * 0.12
      });
      const ca = seg(lt, T.chip, T.chip + 0.14) * (1 - seg(lt, T.stageOut, T.hit, inQuad));
      if (ca > 0) {
        const cs = (S.portrait ? 1.7 : 1.35) * u;
        const pop = outBack(seg(lt, T.chip, T.chip + 0.3), 2);
        ctx.save();
        const cx = x0, cy = yT + titleSize * 0.42;
        ctx.translate(cx, cy + cs * 1.3); ctx.scale(lerp(0.85, 1, pop), lerp(0.85, 1, pop)); ctx.translate(-cx, -cy - cs * 1.3);
        chip(ctx, S, 'By hand', cx, cy, { solid: true, size: cs, alpha: ca });
        ctx.restore();
      }
    }

    // the chart dims under the hero, so the sheet is the only thing lit
    const dimA = heroOn ? 0.72 * seg(lt, T.heroIn, T.heroLand) * (1 - seg(lt, T.heroOut, T.heroOut + 0.35)) : 0;
    if (dimA > 0) { ctx.save(); ctx.globalAlpha = dimA; ctx.fillStyle = UI.space; ctx.fillRect(0, 0, W, H); ctx.restore(); }

    // ── NO TOOL. ────────────────────────────────────────────────────────────
    const noIn = seg(lt, T.hit - 0.02, T.hit + 0.02);
    if (noIn > 0 && lt < T.noOut + 0.3) {
      // the chart dims behind the hit (handing over to the hero's dim as the words go)
      const dim = 0.5 * noIn * (1 - seg(lt, T.noOut, T.noOut + 0.3));
      ctx.save(); ctx.globalAlpha = dim; ctx.fillStyle = UI.space; ctx.fillRect(0, 0, W, H); ctx.restore();
      const k = lerp(1.1, 1, outExpo(seg(lt, T.hit, T.hit + 0.5)));
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
      /* out: the glyphs sink below their sill one by one from the right, as
         the sheet swings in from that side and pushes them down */
      const x0 = T.noOut;
      const sink = (n, off) => (i, p) => {
        const j = off + (n - 1 - i);
        const q = inCubic(seg(lt, x0 + j * 0.014, x0 + j * 0.014 + 0.13));
        return { dy: q * sizeNo * 1.35 };           // well past the mask's sill, which sits below the baseline
      };
      let sizeNo;
      if (!S.portrait) {
        const ref = layout(ctx, 'NO TOOL.', { size: 100, weight: 900, tracking: -0.035 });
        sizeNo = Math.min(0.66 * W / (ref.width / 100), 0.36 * H);
        text(ctx, S, 'NO TOOL.', W / 2, H / 2 + sizeNo * 0.36, { size: sizeNo, weight: 900, tracking: -0.035, align: 'center', color: UI.ink, reveal: seg(lt, T.hit, T.hit + 0.12), mask: true, window: 0.6, glyph: sink(8, 0) });
      } else {
        const ref = layout(ctx, 'TOOL.', { size: 100, weight: 900, tracking: -0.035 });
        sizeNo = Math.min(0.84 * W / (ref.width / 100), 0.2 * H);
        text(ctx, S, 'NO', W / 2, H / 2 - sizeNo * 0.12, { size: sizeNo, weight: 900, tracking: -0.035, align: 'center', color: UI.ink, reveal: seg(lt, T.hit, T.hit + 0.12), mask: true, window: 0.6, glyph: sink(2, 2) });
        text(ctx, S, 'TOOL.', W / 2, H / 2 + sizeNo * 0.84, { size: sizeNo, weight: 900, tracking: -0.035, align: 'center', color: UI.ink, reveal: seg(lt, T.hit + 0.03, T.hit + 0.15), mask: true, window: 0.6, glyph: sink(5, 0) });
      }
      ctx.restore();
    }

    // ── the hero: SB 03 swings out of the chart to the front ────────────────
    if (heroOn) {
      const R = heroRect(S);
      const home = proj[HERO];
      const hw = home ? SW * home.k : 0.1 * W;
      const hx = home ? home.x : W * 0.7, hy = home ? home.y : H * 0.3;
      const tin = seg(lt, T.heroIn, T.heroLand);
      const tout = seg(lt, T.heroOut, T.heroOut + 0.42);
      const eo = inCubic(tout);
      /* in: a real approach — its depth eases in and out (z from r to 1, r
         the size ratio), so it lingers small in the chart while NO TOOL. is
         read, rushes in, then settles; the screen path follows the same
         depth so it runs straight in 3D, bowed a little.
         Out: past the camera, off to the right. */
      const r = Math.max(1.01, R.w / hw), zt = lerp(r, 1, inOutCubic(tin));
      const pp = (1 / zt - 1 / r) / (1 - 1 / r);
      let w = R.w / zt;
      let cx = lerp(hx, R.cx, pp), cy = lerp(hy, R.cy, pp) - Math.sin(Math.PI * pp) * 0.05 * H;
      // it leaves the chart at the angle it sat there, swings away through a quarter turn and back to face us
      const yh = (rng(HERO, 7) - 0.5) * 0.7, rh = (rng(HERO, 8) - 0.5) * 0.12 + C.roll;
      let yaw = lerp(yh, 0, pp) - 0.95 * Math.sin(Math.PI * clamp((tin - 0.12) * 1.45));
      const rot = rh * (1 - pp);
      // held, it still breathes: a slow push-in while the pencil works
      const hold = seg(lt, T.heroLand - 0.1, T.heroOut + 0.2, inOutQuad);
      w *= 1 + 0.035 * hold; cx -= 0.006 * W * hold;
      w *= 1 + eo * 1.7; cx += eo * (W - R.cx + R.w * 1.2); cy -= eo * 0.05 * H; yaw -= eo * 0.9;
      const h = w * 0.565;
      const pencil = seg(lt, T.pencil, T.pencilEnd, inOutQuad);
      const hs = heroSheets(S.img(SHEETS[HERO]));
      const flat = Math.abs(yaw) < 0.004 && Math.abs(rot) < 1e-4;
      const src = hs && (pencil >= 1 ? hs.done : hs.base);
      if (src) {
        ctx.save();
        // a soft warm bloom behind the paper
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.1 * (1 - eo);
        const gr = w * 0.85;
        ctx.drawImage(glowSprite(), cx - gr, cy - gr * 0.62, gr * 2, gr * 1.24);
        ctx.restore();
        ctx.save();
        if (rot) { ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy); }
        const corners = plate3d(ctx, src, cx, cy, w, h, yaw, { edge: 'rgba(255,250,240,.6)', frameW: W });
        // the pencil, live, while the sheet faces us (it is only ever drawing then),
        // clipped to the paper exactly as the finished composite is
        if (pencil > 0 && pencil < 1 && flat) {
          ctx.translate(cx - w / 2, cy - h / 2); ctx.scale(w / 1000, w / 1000);
          ctx.beginPath(); ctx.rect(0, 0, 1000, 565); ctx.clip();
          pencilOn(ctx, pencil);
        }
        ctx.restore();
        // chrome ticks and the sheet's index once it has landed
        const la = seg(lt, T.heroLand - 0.1, T.heroLand + 0.25) * (1 - seg(lt, T.heroOut, T.heroOut + 0.15));
        if (la > 0) {
          const g = 1.4 * u;
          ticks(ctx, S, corners.tl[0] - g, corners.tl[1] - g, corners.br[0] + g, corners.br[1] + g, 1.6 * u, la);
          const ms = (S.portrait ? 1.35 : 1.1) * u;
          tracked(ctx, 'SB 03 / 23', corners.tl[0], corners.tl[1] - g - 1.2 * ms, ms, { alpha: la, color: UI.ink, weight: 600, reveal: seg(lt, T.heroLand, T.heroLand + 0.3) });
          tracked(ctx, COORD[HERO], corners.tr[0], corners.tr[1] - g - 1.2 * ms, ms, { alpha: la * 0.8, color: UI.faint, align: 'right', tracking: 0.12 });
        }
      }
    }

    // ── the line ────────────────────────────────────────────────────────────
    const cap0 = S.portrait ? T.capP : T.cap;
    const capIn = seg(lt, cap0, cap0 + 0.4);
    const capA = capIn * (1 - seg(lt, T.capOut, T.capOut + 0.22, inQuad));
    if (capA > 0) {
      const R = heroRect(S);
      const lines = ['Composition, pacing', 'and shot language', 'get decided here.'];
      let size, x, y;
      if (!S.portrait) {
        size = Math.min(3.8 * u, (R.cx - R.w / 2 - 0.1 * W) / 10.5);
        x = 0.075 * W; y = R.cy - R.h / 2 + size * 3.2;
      } else {
        size = 5.2 * u; x = R.cx - R.w / 2; y = R.cy + R.h / 2 + 11.5 * u;
      }
      const lh = size * 1.22;
      if (!S.portrait) scrim(ctx, x + 12 * size * 0.5, y + lh, 0.26 * W, 0.24 * H, capA);
      else {
        // upright, the line sits in the chart under the sheet: a pool of dark
        // behind it too, kept below the sheet's lower edge so the paper stays lit
        ctx.save();
        ctx.beginPath(); ctx.rect(0, R.cy + R.h / 2 + 2.5 * u, W, H); ctx.clip();
        scrim(ctx, x + 0.42 * W, y + lh - 0.25 * size, 0.66 * W, 0.12 * H, capA);
        ctx.restore();
      }
      lines.forEach((s, i) => {
        text(ctx, S, s, x, y + i * lh, {
          size, weight: 600, tracking: -0.012, color: i === 2 ? UI.ink : '#d9d7cf', alpha: capA,
          reveal: seg(lt, cap0 + i * 0.06, cap0 + 0.32 + i * 0.06), mask: true, window: 0.55
        });
      });
      // a graphite rule under it, drawn on
      const rw = layout(ctx, lines[2], { size, weight: 600, tracking: -0.012 }).width;
      const rp = seg(lt, cap0 + 0.5, cap0 + 0.95, inOutQuad);
      if (rp > 0) {
        ctx.save(); ctx.globalAlpha = capA * 0.9;
        ctx.strokeStyle = '#8f8c84'; ctx.lineWidth = Math.max(1, 0.2 * u); ctx.lineCap = 'round';
        ctx.beginPath();
        const yl = y + 2 * lh + size * 0.45;
        for (let i = 0; i <= 20; i++) {
          const f = (i / 20) * rp;
          const px = x + f * rw * 1.04, py = yl + noise1(f * 5, 4) * 0.18 * u + f * 0.25 * u;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke(); ctx.restore();
      }
    }

    // the corner index, once the stage has been called
    const hudA = seg(lt, T.hit, T.hit + 0.4) * (1 - seg(lt, 5.9, 6.3));
    if (hudA > 0) {
      const hs = (S.portrait ? 1.35 : 1.1) * u, hx = S.portrait ? 0.05 * W : 0.075 * W;
      // upright: keep clear of the line under the hero (it ends ~ R.h/2 + 11.5u + 3 lines of 5.2u below the hero's centre)
      const Rh = heroRect(S);
      const hy = S.portrait ? clamp(Rh.cy + Rh.h / 2 + 11.5 * u + 2 * 1.22 * 5.2 * u + 9 * u, 0.8 * H, 0.84 * H) : 0.8 * H;
      tracked(ctx, 'STAGE 03 OF 06', hx, hy, hs, { alpha: hudA, color: UI.muted, weight: 600 });
      ctx.save(); ctx.globalAlpha = hudA;
      ctx.fillStyle = metal(ctx, hx, 0, hx + 18 * hs, 0, 0.2 + lt * 0.1, 12 * hs);
      ctx.fillRect(hx, hy + hs * 0.9, 17.5 * hs * seg(lt, T.hit, T.hit + 0.5, outCubic), Math.max(1, 0.1 * u));
      ctx.restore();
      tracked(ctx, 'STORYBOARD PACK — ×23 SHEETS', hx, hy + hs * 2.6, hs * 0.9, { alpha: hudA * 0.8, color: UI.faint, reveal: seg(lt, T.hit + 0.1, T.hit + 0.6), tracking: 0.16 });
    }

    // ── the lens ────────────────────────────────────────────────────────────
    const hit = 1 - seg(lt, T.hit, T.hit + 0.42, outCubic);
    if (lt >= T.hit && hit > 0) {
      S.fx.ab = 0.7 * hit;
      S.fx.flash = 0.1 * (1 - seg(lt, T.hit, T.hit + 0.12));
      S.fx.shake = 5 * (1 - seg(lt, T.hit, T.hit + 0.3)) * u / 7;
    }
    const kick = Math.sin(Math.PI * seg(lt, T.heroOut, T.heroOut + 0.7));
    if (kick > 0) S.fx.ab = Math.max(S.fx.ab, 0.28 * kick);
  }
};
