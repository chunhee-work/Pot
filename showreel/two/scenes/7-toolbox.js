/* 7 — Toolbox. Butter.

   "AI lets one person carry a studio — without lowering the bar."

   We come out backwards through the counter of an O: the ring closes in from
   the corners and becomes THE TOOLBOX. Under it a ledger is kept on the beat.
   Five tools slam onto it out of the lens, each as a giant word with its own
   app tile and a line on what it does, each announced by a plus that twists
   in from a cross — two beats apart, then one, landing the last on the bar.
   The camera pulls back to see the column, the bar is ruled under it (and not
   lowered), an equals sign, and on the last bar ONE STUDIO slams in as the
   sum. The camera then drives into the I of STUDIO until its ink is the frame.

   Beats (local, BEAT = 0.46875): 0.09 out of the O · 0.94 CLAUDE ·
   1.88 CLAUDE DESIGN (bar) · 2.81 CAPCUT · 3.28 HIGGSFIELD · 3.75 ELEVENLABS
   (bar) · 4.69 the bar is ruled · 5.16 = · 5.63 ONE STUDIO (bar) · 6.33 the
   drive into the I · 7.34 ink is the frame.

   Landscape keeps the ledger at one size and lets the camera single out each
   row; on a phone the column is justified — every line set to its full width
   — and framed whole, so the ledger typesets itself down the page. Either
   way each row sits a step nearer the lens than the last, so the column fans
   out in perspective as it grows. */
import { text as kitText, layout, seg, clamp, lerp, inCubic, outCubic, outBack, bezier, whip, siteE, rrect, cover } from '../../kit.js';
import { camera, list, mix } from '../../space.js';
import { BLOCK, BEAT } from '../palette.js';
import { nextColour } from '../timeline.js';

const INK = BLOCK.ink, BUTTER = BLOCK.butter, KLEIN = BLOCK.klein, SIGNAL = BLOCK.signal;
const REF = 100, CAPR = 0.695;   // Archivo's capital is 0.695 of its font size
const FOC = 1.1;                 // the lens's focal length, in short sides

// ── the score ─────────────────────────────────────────────────────────────
const TOOLS = [
  { word: 'CLAUDE', note: 'strategy · code', img: 'assets/tool-claude.png', zoom: 1.85, r: 0.2, at: 2 * BEAT },
  { word: 'CLAUDE DESIGN', lines: ['CLAUDE', 'DESIGN'], note: 'UI/UX', img: 'assets/tool-claude-design.png', zoom: 2.2, r: 0.2, at: 4 * BEAT, bar: true },
  { word: 'CAPCUT', note: 'edit', img: 'assets/tool-capcut.jpg', zoom: 1.05, r: 0.22, at: 6 * BEAT },
  { word: 'HIGGSFIELD', note: 'video generation', img: 'assets/tool-higgsfield.jpg', zoom: 1.03, r: 0.21, at: 7 * BEAT },
  { word: 'ELEVENLABS', note: 'voices', img: 'assets/tool-elevenlabs.jpg', zoom: 1.36, r: 0.15, at: 8 * BEAT, bar: true }
];
const T = {
  open: 0.09,           // pure butter before this; then out of the O
  title: 0.64,          // TOOLBOX framed
  back: 4.02,           // the pull-back off ELEVENLABS begins
  rule: 10 * BEAT,      // the reveal lands and the bar is ruled
  eq: 11 * BEAT,        // =
  sum: 12 * BEAT,       // ONE STUDIO
  dive: 13.5 * BEAT,    // the drive into the I begins
  cover: 7.34           // the I's ink is the whole frame
};
const APP = 0.13;                 // a word's flight from the lens to the wall
const ROLLS = [-0.03, 0.028, -0.024, 0.03, -0.022];
const DZ = 8, DZR = 10;            // each row lands a step nearer the lens; the sum nearer still
const NOTE_BAR = 'without lowering the bar';

// ── small helpers ─────────────────────────────────────────────────────────
/** a hit that decays over `dur` seconds after `at` (1 → 0, squared) */
const decay = (t, at, dur) => (t >= at && t < at + dur ? Math.pow(1 - (t - at) / dur, 2) : 0);
/** a damped wobble after `at`: 1 at the hit, ringing out */
const ring = (t, at, rate = 16, freq = 42) => (t >= at ? Math.exp(-(t - at) * rate) * Math.cos((t - at) * freq) : 0);
const popE = bezier(0.22, 0.9, 0.25, 1);

/** width of `str` in world units when its capital is `cap` units tall */
function widthOf(ctx, str, cap, weight = 900, tracking = -0.02) {
  return layout(ctx, str, { size: REF, weight, tracking }).width * cap / (REF * CAPR);
}

/** a line of type in the 3D list, anchored at (x, y) on its baseline */
function type3(D, S, str, o) {
  D.custom(o.z ?? 0, (ctx, p) => {
    const px = o.cap * p.k;
    if (px < 0.6 || px > 90 * S.W) return;
    const s = px / (REF * CAPR);
    ctx.scale(s * (o.sx ?? 1), s * (o.sy ?? 1));
    kitText(ctx, S, str, 0, 0, {
      size: REF, weight: o.weight ?? 900, tracking: o.tracking ?? -0.02, align: o.align ?? 'left',
      color: o.color ?? INK, reveal: o.reveal, window: o.window, rise: o.rise, glyph: o.glyph
    });
  }, { x: o.x, y: o.y, alpha: o.alpha ?? 1, rotZ: o.rot || 0 });
}

/** a geometric operator (+ or =) in signal, centred on (x, y) */
function op3(D, S, kind, o) {
  D.custom(o.z ?? 0, (ctx, p) => {
    const a = o.cap * p.k * 0.5;               // half the arm
    if (a < 0.3) return;
    const th = a * 0.56;
    ctx.scale(o.sx ?? 1, o.sy ?? 1);
    ctx.fillStyle = SIGNAL;
    if (kind === '+') { ctx.fillRect(-a, -th / 2, 2 * a, th); ctx.fillRect(-th / 2, -a, th, 2 * a); }
    else { ctx.fillRect(-a, -a * 0.62, 2 * a, th); ctx.fillRect(-a, a * 0.62 - th, 2 * a, th); }
  }, { x: o.x, y: o.y, alpha: o.alpha ?? 1, rotZ: o.rot || 0 });
}

// ── the app tiles: rounded, a hard ink shadow, pre-rendered once per size ──
const tiles = new Map();
const SH = 0.075;   // the shadow's offset, in tile widths
function tileCanvas(S, tool) {
  const img = S.img(tool.img);
  if (!img || !img.width) return null;
  const P = clamp(Math.ceil(0.24 * Math.min(S.W, S.H) / 32) * 32, 64, 416);
  const key = tool.img + '|' + P;
  let c = tiles.get(key);
  if (c) return c;
  if (tiles.size > 20) tiles.clear();
  const N = Math.ceil(P * (1 + SH)) + 2;
  c = document.createElement('canvas'); c.width = c.height = N; c.tileP = P;
  const x = c.getContext('2d');
  const r = P * tool.r, lw = Math.max(1, P * 0.022);
  x.fillStyle = INK; rrect(x, P * SH, P * SH, P, P, r); x.fill();
  x.save(); rrect(x, 0, 0, P, P, r); x.clip();
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, P, P);
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  cover(x, img, 0, 0, P, P, { zoom: tool.zoom });
  x.restore();
  x.lineWidth = lw; x.strokeStyle = INK; rrect(x, lw / 2, lw / 2, P - lw, P - lw, r - lw / 2); x.stroke();
  tiles.set(key, c);
  return c;
}

// ── the ledger, laid out in world units (a tool's capital is 10 tall) ─────
function buildLayout(ctx, portrait) {
  const C = 10, rows = [];
  let head, rule, eq, res;
  if (!portrait) {
    // [op] [tile] WORD with its note hung off the cap line; ONE STUDIO under the bar
    const PITCH = 14, OPX = -8, WX = 13.5, NC = 2.3, NG = 1.5;
    TOOLS.forEach((tool, i) => {
      const base = i * PITCH, w = widthOf(ctx, tool.word, C), nw = widthOf(ctx, tool.note, NC, 700, 0.02);
      rows.push({
        lines: [{ str: tool.word, x: WX, y: base, cap: C, w }],
        tile: { x: C / 2, y: base - C / 2, s: C },
        note: { str: tool.note, x: WX + w + NG, y: base - C + NC, cap: NC },
        op: i ? { x: OPX, y: base - C / 2, cap: 6.2 } : null,
        box: [i ? OPX - 4 : 0, base - C - 0.6, WX + w + NG + nw, base], z: -i * DZ
      });
    });
    const last = 4 * PITCH, Cr = 16, ry = last + 4.4, rb = ry + 4.2 + Cr;
    const w = widthOf(ctx, 'ONE STUDIO', Cr);
    res = { lines: [{ str: 'ONE STUDIO', x: 0, y: rb, cap: Cr, w }], cap: Cr };
    eq = { x: OPX, y: rb - Cr / 2, cap: 7.2 };
    const right = Math.max(w, ...rows.map(r => r.box[2]));
    rule = { x0: OPX - 4, x1: right, y: ry, h: 1.15, note: { x: right, cap: 2.1 } };
    const Ch = 16, hb = rows[0].box[1] - 4.5;
    head = { word: { str: 'TOOLBOX', x: 0, y: hb, cap: Ch, w: widthOf(ctx, 'TOOLBOX', Ch) }, the: { x: 0.4, y: hb - Ch - 2.8, cap: 3.2 } };
  } else {
    // a justified column: every line set to the column's full width, so the
    // short names come up huge; [tile] note on a line above, the op hanging left
    const OPX = -6.6, TS = 8.5, GAP = 5.2;
    let top = 0, colW = 0;
    TOOLS.forEach(tool => { for (const s of tool.lines || [tool.word]) colW = Math.max(colW, widthOf(ctx, s, C)); });
    const just = (s, y) => { const cap = Math.min(22, colW / widthOf(ctx, s, 1)); return { str: s, x: 0, y, cap, w: widthOf(ctx, s, cap) }; };
    TOOLS.forEach((tool, i) => {
      const strs = tool.lines || [tool.word], L = [];
      let y = top + TS + 2.8;
      strs.forEach((s, j) => { const ln = just(s, 0); y += (j ? ln.cap * 0.14 + 1.2 : 0) + ln.cap; ln.y = y; L.push(ln); });
      const lastB = y;
      rows.push({
        lines: L,
        tile: { x: TS / 2, y: top + TS / 2, s: TS },
        note: { str: tool.note, x: TS + 2.2, y: top + TS / 2 + 1.45, cap: 2.9 },
        op: i ? { x: OPX, y: L[0].y - L[0].cap / 2, cap: 5.6 } : null,
        box: [i ? OPX - 3 : 0, top, colW, lastB], z: -i * DZ
      });
      top = lastB + GAP;
    });
    const lastB = top - GAP, ry = lastB + 5.5;
    const one = just('ONE', 0), studio = just('STUDIO', 0);
    one.y = ry + 4.6 + one.cap; studio.y = one.y + studio.cap * 0.14 + 1.6 + studio.cap;
    res = { lines: [one, studio], cap: studio.cap };
    eq = { x: OPX, y: one.y - one.cap / 2, cap: 6.2 };
    rule = { x0: OPX - 3, x1: colW, y: ry, h: 0.95, note: { x: colW, cap: 2.3 } };
    const Ch = colW / widthOf(ctx, 'TOOLBOX', 1), hb = -5;
    head = { word: { str: 'TOOLBOX', x: 0, y: hb, cap: Ch, w: colW }, the: { x: 0.3, y: hb - Ch - 2.6, cap: 3 } };
  }
  head.box = [0, head.the.y - head.the.cap, head.word.x + head.word.w, head.word.y];
  head.z = DZ;
  res.z = -4 * DZ - DZR;
  rule.note.w = widthOf(ctx, NOTE_BAR, rule.note.cap, 700, 0.02);
  rule.note.y = rule.y + rule.note.cap * 0.38;          // its x-height centred on the bar
  rule.end = rule.x1 - rule.note.w - rule.note.cap * 0.8;
  const resBox = [rule.x0, rule.y - 2, rule.x1, res.lines[res.lines.length - 1].y];

  // the O we come out of (TOOLBOX's first O) and the I we drive into (STUDIO's)
  const glyph = (line, idx, ch) => {
    const L = layout(ctx, line.str, { size: REF, weight: 900, tracking: -0.02 });
    ctx.save(); ctx.font = L.font;
    const m = ctx.measureText(ch);
    ctx.restore();
    const sc = line.cap / (REF * CAPR);
    const l = -m.actualBoundingBoxLeft, r = m.actualBoundingBoxRight, a = m.actualBoundingBoxAscent;
    return { x: line.x + (L.xs[idx] + (l + r) / 2) * sc, y: line.y - a / 2 * sc, hw: (r - l) / 2 * sc, hh: a / 2 * sc };
  };
  const O = glyph(head.word, 1, 'O');
  O.r = 0.19 * head.word.cap;            // the counter's smallest inner radius
  O.z = head.z;
  const sl = res.lines.find(l => l.str.includes('STUDIO'));
  const I = glyph(sl, sl.str.indexOf('I', sl.str.indexOf('STUDIO')), 'I');
  I.z = res.z;
  return { rows, head, rule, eq, res, resBox, O, I };
}

// ── the camera: shots, and the moves between them ─────────────────────────
/* A shot is { x, y, k, zp, roll }: the camera looks at (x, y) with k pixels
   per world unit on the plane z = zp, so it stands at z = zp - F/k. */
/** from shot A to shot B at eased e, measured on B's plane: a zoom about the
    one point both shots put in the same place on screen, so nothing slides
    against the zoom. `bank` swings the roll through the move, like a whip-pan. */
function blend(F, A, B, e, bank = 0) {
  const kA = F / (B.zp - A.zp + F / A.k);
  const k = Math.exp(lerp(Math.log(kA), Math.log(B.k), e));
  const roll = lerp(A.roll, B.roll, e) + bank * Math.sin(Math.PI * e);
  if (Math.abs(Math.log(B.k / kA)) < 0.04) return { x: lerp(A.x, B.x, e), y: lerp(A.y, B.y, e), k, zp: B.zp, roll };
  const px = (B.x * B.k - A.x * kA) / (B.k - kA), py = (B.y * B.k - A.y * kA) / (B.k - kA);
  return { x: px - (px - A.x) * kA / k, y: py - (py - A.y) * kA / k, k, zp: B.zp, roll };
}
/** a shot held: the camera keeps creeping in */
const drift = (A, dt) => ({ ...A, k: A.k * (1 + 0.045 * dt) });

/** a shot that puts world point (x, y) on plane zp at screen offset (sx, sy) from centre */
const aim = (x, y, zp, sx, sy, k, roll) => ({ x: x - sx / k, y: y - sy / k, k, zp, roll });

/** fit world points [[x, y, z], …] into a frame box, with perspective: the
    camera is solved by a few rounds of project, measure, rescale, recentre */
function fitPts(S, F, pts, o) {
  const zp = o.zp ?? 0;
  let x = 0, y = 0, n = 0;
  for (const q of pts) { x += q[0]; y += q[1]; n++; }
  x /= n; y /= n;
  // a first guess on the reference plane
  let k, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  k = Math.min(S.W * o.w / (x1 - x0), S.H * o.h / (y1 - y0));
  if (o.kMax) k = Math.min(k, o.kMax);
  for (let it = 0; it < 8; it++) {
    const cz = zp - F / k;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const q of pts) {
      const kk = F / (q[2] - cz);
      const px = (q[0] - x) * kk, py = (q[1] - y) * kk;
      a0 = Math.min(a0, px); a1 = Math.max(a1, px); b0 = Math.min(b0, py); b1 = Math.max(b1, py);
    }
    let sc = Math.min(S.W * o.w / (a1 - a0), S.H * o.h / (b1 - b0));
    if (o.kMax) sc = Math.min(sc, o.kMax / k);
    // recentre: put the projected box's centre at (fx, fy) of the frame
    const ex = (a0 + a1) / 2 - ((o.fx ?? 0.5) - 0.5) * S.W / sc;
    const ey = (b0 + b1) / 2 - ((o.fy ?? 0.5) - 0.5) * S.H / sc;
    x += ex / k; y += ey / k;
    k *= sc;
  }
  return { x, y, k, zp, roll: o.roll || 0 };
}
const boxPts = (bb, z) => [[bb[0], bb[1], z], [bb[2], bb[1], z], [bb[0], bb[3], z], [bb[2], bb[3], z]];

function buildPlan(ctx, S) {
  const L = buildLayout(ctx, S.portrait);
  const F = FOC * Math.min(S.W, S.H);
  const C = 10;
  const kMax = (S.portrait ? 0.075 : 0.155) * S.H / C;
  const half = Math.hypot(S.W, S.H) / 2;
  const headPts = boxPts(L.head.box, L.head.z);
  const rowPts = L.rows.map(R => boxPts(R.box, R.z));
  const resPts = boxPts(L.resBox, L.res.z);
  const sO = { x: L.O.x, y: L.O.y, k: 1.3 * half / L.O.r, zp: L.O.z, roll: -0.55 };
  const sT = fitPts(S, F, headPts, { w: 0.8, h: 0.34, fy: 0.44, zp: L.head.z, roll: -0.02 });
  // on a phone the whole column is framed from the first row, so the ledger
  // typesets itself down the page; each landing still rolls and creeps the camera
  const colPts = [...headPts, ...rowPts.flat()];
  const sR = L.rows.map((R, i) => S.portrait
    ? fitPts(S, F, colPts, { w: 0.8, h: 0.8, fy: 0.47 + 0.006 * i, zp: R.z, roll: ROLLS[i] * 0.8 })
    : i === 0
      ? fitPts(S, F, [...headPts, ...rowPts[0]], { w: 0.84, h: 0.6, fy: 0.5, kMax, zp: R.z, roll: ROLLS[0] })
      : fitPts(S, F, rowPts[i], { w: 0.86, h: 0.4, fy: 0.6, kMax, zp: R.z, roll: ROLLS[i] }));
  if (S.portrait) sR.forEach((sh, i) => { sh.k *= 1 + 0.015 * i; });
  const sV = fitPts(S, F, [...rowPts.flat(), ...resPts], { w: 0.84, h: 0.76, fy: 0.47, zp: L.res.z, roll: 0.012 });
  const sV2 = { ...drift(sV, T.eq - T.rule), k: sV.k * 0.972 };
  // after the sum lands: a slow push on it, keeping all of = ONE STUDIO in frame
  const I = L.I, rb = L.resBox, rc = [(rb[0] + rb[2]) / 2, (rb[1] + rb[3]) / 2];
  const kV = F / (L.res.z - sV2.zp + F / sV2.k);
  const rOff = [(rc[0] - sV2.x) * kV, (rc[1] - sV2.y) * kV];
  const sF1 = aim(rc[0], rc[1], L.res.z, rOff[0], rOff[1] * (S.portrait ? 0.88 : 0.6), kV * (S.portrait ? 1.03 : 1.06), 0.02);
  // the end: the I's stem, centred, a little wider than the frame (at the final roll)
  const rEnd = 0.16, c = Math.abs(Math.cos(rEnd)), s = Math.abs(Math.sin(rEnd));
  const kCover = Math.max((S.W * c + S.H * s) / (2 * I.hw), (S.W * s + S.H * c) / (2 * I.hh));
  const sF2 = aim(I.x, I.y, I.z, 0, 0, kCover * 1.07, rEnd);

  const at = TOOLS.map(t => t.at);
  const moves = [
    { a: T.open, b: T.title, to: sT, e: popE },
    { a: T.title, b: at[0] - 0.03, to: sR[0], e: whip, bank: 0.03 },
    { a: at[1] - 0.44, b: at[1] - 0.02, to: sR[1], e: whip, bank: -0.07 },
    { a: at[2] - 0.44, b: at[2] - 0.02, to: sR[2], e: whip, bank: 0.07 },
    { a: at[3] - 0.3, b: at[3] - 0.02, to: sR[3], e: whip, bank: -0.06 },
    { a: at[4] - 0.3, b: at[4] - 0.02, to: sR[4], e: whip, bank: 0.06 },
    { a: T.back, b: T.rule, to: sV, e: siteE, bank: -0.05 },
    { a: T.eq, b: T.sum - 0.02, to: sV2, e: whip },
    { a: T.sum, b: T.dive, to: sF1, e: outCubic, still: true },
    { a: T.dive, b: T.cover, to: sF2, e: p => 0.18 * p + 0.82 * inCubic(p), still: true }
  ];
  const P = { L, F, sO, moves };
  // the camera's distance from each row's plane as it lands, for the words' flight
  const camZ = t => { const h = shotAt(P, t); return h.zp - F / h.k; };
  P.D = at.map((t, i) => L.rows[i].z - camZ(t));
  P.Dsum = L.res.z - camZ(T.sum);
  return P;
}

function shotAt(P, t) {
  let cur = P.sO, since = T.open, still = true;
  for (const m of P.moves) {
    if (t < m.a) return still ? cur : drift(cur, t - since);
    const from = still ? cur : drift(cur, m.a - since);
    if (t < m.b) return blend(P.F, from, m.to, m.e(seg(t, m.a, m.b)), m.bank || 0);
    cur = m.to; since = m.b; still = !!m.still;
  }
  return cur;
}

function cameraAt(P, S, lt) {
  const sh = shotAt(P, lt);
  // every landing kicks the lens in a touch
  let kick = 0;
  for (const tool of TOOLS) kick += 0.035 * decay(lt, tool.at, 0.32);
  const k = sh.k * (1 + kick);
  return camera(S, { x: sh.x, y: sh.y, z: sh.zp - P.F / k, roll: sh.roll, zoom: FOC, near: 0.02 });
}

const plans = new Map();
function planFor(ctx, S) {
  const key = S.W + 'x' + S.H;
  let P = plans.get(key);
  if (!P) {
    P = buildPlan(ctx, S);
    // measured before the face arrived? use it for this frame only
    if (typeof document !== 'undefined' && document.fonts && document.fonts.status !== 'loaded') return P;
    if (plans.size > 6) plans.clear();
    plans.set(key, P);
  }
  return P;
}

// ── the ground: a field of registration crosses at two depths ─────────────
const FIELD = [
  { z: 150, gap: 46, arm: 2.6, th: 0.7, col: mix(BUTTER, INK, 0.08) },
  { z: 55, gap: 23, arm: 1.3, th: 0.36, col: mix(BUTTER, INK, 0.12) }
];
function field(ctx, S, cam, a) {
  if (a <= 0) return;
  const cr = Math.cos(cam.roll), sr = Math.sin(cam.roll);
  ctx.save();
  ctx.globalAlpha = a;
  for (const f of FIELD) {
    const d = f.z - cam.z;
    if (d <= 1) continue;
    const k = cam.F / d, R = Math.hypot(S.W, S.H) / 2 / k + f.arm;
    const i0 = Math.floor((cam.x - R) / f.gap), i1 = Math.ceil((cam.x + R) / f.gap);
    const j0 = Math.floor((cam.y - R) / f.gap), j1 = Math.ceil((cam.y + R) / f.gap);
    if ((i1 - i0) * (j1 - j0) > 900) continue;
    ctx.fillStyle = f.col;
    const A = f.arm * k, t = f.th * k;
    if (A < 0.5) continue;
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const p = cam.project(i * f.gap, j * f.gap, f.z);
        if (!p || p.x < -A || p.y < -A || p.x > S.W + A || p.y > S.H + A) continue;
        ctx.setTransform(cr, sr, -sr, cr, p.x, p.y);
        ctx.fillRect(-A, -t / 2, 2 * A, t); ctx.fillRect(-t / 2, -A, t, 2 * A);
      }
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.restore();
}

/** does the I's stem cover the whole frame? */
function covered(S, cam, I) {
  const p = cam.project(I.x, I.y, I.z);
  if (!p) return false;
  const hw = I.hw * p.k - 1, hh = I.hh * p.k - 1;
  const c = Math.cos(cam.roll), s = Math.sin(cam.roll);
  for (const [X, Y] of [[0, 0], [S.W, 0], [0, S.H], [S.W, S.H]]) {
    const dx = X - p.x, dy = Y - p.y;
    if (Math.abs(dx * c + dy * s) > hw || Math.abs(-dx * s + dy * c) > hh) return false;
  }
  return true;
}

// ── the chapter ───────────────────────────────────────────────────────────
const scene = {
  id: 'toolbox',
  title: 'Toolbox',
  caption: 'The toolbox as a ledger: Claude, Claude Design, CapCut, Higgsfield and ElevenLabs slam in on the beat, plus by plus, and add up to one studio.',
  bg: BLOCK.butter,
  assets: TOOLS.map(t => t.img),
  models: [],
  still: 6.2,
  sfx: [
    ...TOOLS.map(t => ({ at: t.at, type: 'impact' })),
    { at: T.sum, type: 'impact' },
    { at: T.sum, type: 'sub' },
    { at: T.cover, type: 'riser' }
  ],
  draw(ctx, S) {
    const lt = S.lt;
    const P = planFor(ctx, S), L = P.L;
    // the seam: butter, nothing else (the tiles are cut here, where a slow frame cannot show)
    if (lt < T.open) { for (const tool of TOOLS) tileCanvas(S, tool); return; }
    const cam = cameraAt(P, S, lt);
    if (lt >= T.cover + 0.04 || (lt > T.dive && covered(S, cam, L.I))) {
      ctx.fillStyle = nextColour(scene); ctx.fillRect(0, 0, S.W, S.H);
      return;
    }
    field(ctx, S, cam, seg(lt, 0.34, 0.9));

    const D = list();
    // every landing jolts what is already on the wall
    const bump = (at, amp, rate, freq) => (lt > at ? amp * Math.exp(-(lt - at) * rate) * Math.sin((lt - at) * freq) : 0);
    const jolt = i => {
      let dy = bump(T.sum, 0.9, 12, 34);
      TOOLS.forEach((t, j) => { if (j > i) dy += bump(t.at, 0.5, 13, 36); });
      return dy;
    };

    // THE TOOLBOX
    const H = L.head, hj = jolt(-1);
    type3(D, S, 'THE', { x: H.the.x, y: H.the.y + hj, z: H.z, cap: H.the.cap, weight: 800, tracking: 0.26, color: KLEIN });
    type3(D, S, H.word.str, { x: H.word.x, y: H.word.y + hj, z: H.z, cap: H.word.cap });

    // the five tools
    TOOLS.forEach((tool, i) => {
      const s = tool.at, R = L.rows[i];
      if (lt < s - 0.3) return;
      const dy = jolt(i);
      // the plus twists in from a cross just before its word, and spins once more at the sum
      if (R.op) {
        const t0 = s - 0.2, p = seg(lt, t0, t0 + 0.26);
        if (p > 0) {
          const spin = outCubic(seg(lt, T.sum + 0.05 * (4 - i), T.sum + 0.05 * (4 - i) + 0.42));
          const sc = outBack(p, 2.6);
          op3(D, S, '+', { x: R.op.x, y: R.op.y + dy, z: R.z, cap: R.op.cap, sx: sc, sy: sc, rot: -Math.PI / 4 * (1 - outCubic(p)) + spin * Math.PI / 2 });
        }
      }
      // the word flies out of the lens and hits the wall on the beat
      if (lt >= s - APP) {
        const p = seg(lt, s - APP, s), m = 1 + 1.5 * (1 - inCubic(p));
        const z = R.z - P.D[i] * (1 - 1 / m);
        const q = ring(lt, s);
        for (const ln of R.lines) {
          type3(D, S, ln.str, { x: ln.x + ln.w / 2, y: ln.y + dy, z, cap: ln.cap, align: 'center', sx: 1 + 0.07 * q, sy: 1 - 0.14 * q });
        }
      }
      // then its tile pops, then its note types on
      const tp = seg(lt, s + 0.03, s + 0.36);
      const cv = tp > 0 ? tileCanvas(S, tool) : null;
      if (cv) {
        const sc = outBack(tp, 2.2), rot = -0.5 * (1 - outCubic(tp)), T0 = R.tile;
        D.custom(R.z, (c, pp) => {
          const w = T0.s * pp.k * sc;
          if (w < 1) return;
          const n = w * cv.width / cv.tileP;
          c.drawImage(cv, -w / 2, -w / 2, n, n);
        }, { x: T0.x, y: T0.y + dy, rotZ: rot });
      }
      const np = seg(lt, s + 0.08, s + 0.5);
      if (np > 0) type3(D, S, R.note.str, { x: R.note.x, y: R.note.y + dy, z: R.z, cap: R.note.cap, weight: 700, tracking: 0.02, color: KLEIN, reveal: np, window: 0.5 });
    });

    // the bar, ruled — and not lowered
    const Z = L.res.z;
    const rp = outCubic(seg(lt, T.rule - 0.06, T.rule + 0.3));
    if (rp > 0) {
      const Rl = L.rule;
      D.custom(Z, (c, pp) => {
        c.fillStyle = INK;
        c.fillRect(0, -Rl.h / 2 * pp.k, (Rl.end - Rl.x0) * rp * pp.k, Rl.h * pp.k);
      }, { x: Rl.x0, y: Rl.y });
      const bp = seg(lt, T.rule + 0.1, T.rule + 0.55);
      if (bp > 0) type3(D, S, NOTE_BAR, { x: Rl.note.x - Rl.note.w, y: Rl.note.y, z: Z, cap: Rl.note.cap, weight: 700, tracking: 0.02, color: KLEIN, reveal: bp, window: 0.3 });
    }
    // =
    const ep = seg(lt, T.eq - 0.02, T.eq + 0.26);
    if (ep > 0) {
      const sq = ring(lt, T.sum, 14, 38);
      op3(D, S, '=', { x: L.eq.x, y: L.eq.y + 0.4 * sq, z: Z, cap: L.eq.cap, sx: outBack(ep, 2.4) * (1 + 0.2 * sq), sy: 1 - 0.25 * sq });
    }
    // ONE STUDIO: out of the lens, harder, on the bar
    if (lt >= T.sum - APP * 1.3) {
      const p = seg(lt, T.sum - APP * 1.3, T.sum), m = 1 + 3 * (1 - inCubic(p));
      const z = Z - P.Dsum * (1 - 1 / m);
      const q = ring(lt, T.sum, 13, 38);
      // ONE in klein — the reel's first colour, its first word — STUDIO in ink
      const one = (i, g) => (i < 3 ? { color: KLEIN } : null);
      for (const ln of L.res.lines) {
        type3(D, S, ln.str, { x: ln.x + ln.w / 2, y: ln.y, z, cap: ln.cap, align: 'center', sx: 1 + 0.08 * q, sy: 1 - 0.16 * q, glyph: ln.str.startsWith('ONE') ? one : null });
      }
    }
    D.draw(ctx, S, cam, { maxPx: 90 });

    // ── the lens: seasoning on the hits only, harder on the bars ──
    const fx = S.fx, u = S.u;
    let ab = 0, shake = 0;
    TOOLS.forEach(tool => {
      const g = tool.bar ? 1.5 : 1;
      ab = Math.max(ab, 0.3 * g * decay(lt, tool.at, 0.28));
      shake = Math.max(shake, 0.6 * g * u * decay(lt, tool.at, 0.2));
    });
    ab = Math.max(ab, 0.7 * decay(lt, T.sum, 0.42), 0.14 * decay(lt, T.rule, 0.2));
    shake = Math.max(shake, 1.5 * u * decay(lt, T.sum, 0.32));
    // the drive into the I: fringes grow with the speed, gone before the ink
    ab = Math.max(ab, 0.32 * Math.sin(Math.PI * seg(lt, 6.7, T.cover - 0.05)));
    const warpAt = (t0, dur, w0, x, y, z) => {
      const p = cam.project(x, y, z);
      if (!p) return;
      fx.warp = w0 + (1 - w0) * seg(lt, t0, t0 + dur);
      fx.warpX = clamp(p.x / S.W, 0.05, 0.95); fx.warpY = clamp(p.y / S.H, 0.05, 0.95);
    };
    if (lt >= T.sum && lt < T.sum + 0.55) {
      const ln = L.res.lines[L.res.lines.length - 1];
      warpAt(T.sum, 0.55, 0.18, ln.x + ln.w / 2, ln.y - ln.cap / 2, Z);
    } else {
      // on the bars only: a lighter ring, born already clear of the word
      TOOLS.forEach((tool, i) => {
        if (!tool.bar || lt < tool.at || lt >= tool.at + 0.4) return;
        const ln = L.rows[i].lines[0];
        warpAt(tool.at, 0.4, 0.35, ln.x + ln.w / 2, ln.y - ln.cap / 2, L.rows[i].z);
      });
    }
    fx.ab = ab; fx.shake = shake;
    fx.exposure = 1 + 0.08 * decay(lt, T.sum, 0.22);
    fx.flash = 0.16 * decay(lt, T.sum, 0.09);
  }
};
export default scene;
