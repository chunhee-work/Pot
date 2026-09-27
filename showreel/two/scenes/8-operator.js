/* 8 — One operator. The résumé end card, at full volume.

   Out of the ink, a riser: the camera rushes down a vortex of everything the
   studio made (the brands, the universe, the tools, in the reel's own colour
   blocks). Then the numbers are thrown in from behind the lens on the beats,
   one block colour each — 17 MIN butter, 12 VOICES pink, 4 BRANDS signal —
   and with every hit the camera steps back to take in one more; on the bar
   line it pulls out to the whole wall as the 1 lands, a paper monolith with
   OPERATOR running up its side, and the lens is thrown. The camera threads
   the gap between the column and the 1, out to the name, and settles for the
   read: CHUN HEE, the role, the address, the footer. On the last bar the H
   is painted klein; the camera leans in, then drives into its stem until
   blue is all there is — the reel's first frame, so the loop closes.

   World: the camera looks down +z; at the resting distance D a world unit is
   a tenth of the frame's short side. The stat wall stands at z = ZW, the name
   at z = ZL. Every layout is measured from the real glyphs and fitted to the
   frame's safe box, per frame size, so one design serves 16:9 and a phone. */
import {
  clamp, lerp, seg, rng, layout, FONT,
  outExpo, outCubic, inOutCubic, whip, bezier
} from '../../kit.js';
import { camera, list, mix } from '../../space.js';
import { BLOCK, BEAT, BAR } from '../palette.js';
import { nextColour } from '../timeline.js';

const REF = 100, CAPR = 0.72;       // space.js lays type out at REF px; a capital is CAPR of it
const D = 10;                        // resting distance camera → plane
const ZW = 10;                       // the stat wall
const ZL = 36;                       // the name

// ── time (local seconds; beats at k·BEAT, bars at k·BAR) ─────────────────
const B = BEAT;
const T = {
  in: 0.08,                          // pure ink until here
  s17: 1 * B, s12: 2 * B, s4: 3 * B, // the numerals land on beats 1–3 …
  s1: BAR,                           // … and the 1 on the bar line, hardest
  fly: 7 * B,                        // through the gap to the name
  lock: 2 * BAR,                     // the name lands (sub drop)
  role: 2 * BAR + 0.25 * B,
  mail: 2 * BAR + 0.5 * B,
  foot: 2 * BAR + 1 * B,
  paint: 3 * BAR,                    // the H is klein
  plunge: 14 * B,                    // the drive into its stem
  fill: 7.5 - 0.1                    // klein is all there is
};
const STEP = 0.3;                    // the camera's step back into each hit

const STATS = [
  { n: '17', unit: 'MIN', desc: ['ORIGINAL', 'ANIMATION'], color: BLOCK.butter, at: T.s17 },
  { n: '12', unit: 'VOICES', desc: ['10 CHARACTERS', '+ 2 NPCS'], color: BLOCK.pink, at: T.s12 },
  { n: '4', unit: 'BRANDS', desc: ['WEB3', 'ECOSYSTEM'], color: BLOCK.signal, at: T.s4 },
  { n: '1', unit: 'OPERATOR', desc: ['ONE PERSON. A WHOLE STUDIO.'], color: BLOCK.paper, at: T.s1 }
];

const ST = {
  num: { weight: 900, tracking: -0.04 },
  unit: { weight: 900, tracking: -0.005 },
  desc: { weight: 600, tracking: 0.13 },
  name: { weight: 900, tracking: -0.03 },
  role: { weight: 500, tracking: 0 },
  mail: { weight: 700, tracking: 0.005 },
  foot: { weight: 500, tracking: 0.04 }
};

/** a colour between two hex colours, as hex (space.js's fog parses hex only) */
function hexMix(a, b, t) {
  const A = parseInt(a.slice(1), 16), Bc = parseInt(b.slice(1), 16);
  const ch = s => Math.round(lerp((A >> s) & 255, (Bc >> s) & 255, t));
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
const PAPER_DIM = hexMix(BLOCK.paper, BLOCK.ink, 0.18);
const FOOT = hexMix(BLOCK.paper, BLOCK.ink, 0.42);
const FAR_COL = '#18181f';

// the vortex: everything the studio made, in the reel's colour blocks
const VORTEX = ['OWNERSHIPCOIN', 'LAND OF HOPE', 'THE CHILL GALLERY', 'CLAUDE', 'CHARACTER VOICES', 'GACHA',
  'CAPCUT', 'ARK.TG', 'BRAND STRATEGY', 'HIGGSFIELD', 'CINEMATIC SHORT-FORM', 'ELEVENLABS', 'WORKING SOFTWARE',
  'CLAUDE DESIGN', 'ONE PERSON.', 'A WHOLE STUDIO.'];
const VCOL = [BLOCK.klein, BLOCK.signal, BLOCK.paper, BLOCK.pink, PAPER_DIM, BLOCK.teal, BLOCK.butter];
const NV = 44;

// far architecture: the thesis, ghosted huge behind the wall and the name, for parallax
const FAR = [
  { str: 'ONE PERSON.', wall: true, z: ZW + 30, y: -0.3, span: 1.25, shift: -0.1 },
  { str: 'ONE PERSON.', wall: true, z: ZW + 44, y: 0.42, span: 1.25, shift: 0.18 },
  { str: 'A WHOLE STUDIO.', wall: false, z: ZL + 30, y: -0.34, span: 1.2, shift: 0.16 },
  { str: 'A WHOLE STUDIO.', wall: false, z: ZL + 44, y: 0.4, span: 1.2, shift: 0.08 }
];

// ── measuring ─────────────────────────────────────────────────────────────
/** ink extents of `str` set at capital height `cap`, from its pen origin, in world units */
function ink(ctx, str, cap, st) {
  const L = layout(ctx, str, { size: REF, ...st });
  ctx.save(); ctx.font = L.font;
  const m = ctx.measureText(str);
  ctx.restore();
  const k = cap / (REF * CAPR), tr = (st.tracking || 0) * REF * (L.chars.length - 1);
  return { l: -m.actualBoundingBoxLeft * k, r: (m.actualBoundingBoxRight + tr) * k, w: L.width * k, L, k };
}

/** the frame on a plane at distance D, and a safe box inside it, in world units (y down) */
function safeBox(S, top = -0.74, bottom = 0.64, side = 0.86) {
  const sh = Math.min(S.W, S.H), hw = S.W / 2 / sh * D, hh = S.H / 2 / sh * D;
  return { hw, hh, x0: -side * hw, x1: side * hw, y0: top * hh, y1: bottom * hh };
}

/** scale and centre a design (elements with x, y, cap) with bbox bb into the box */
function fit(els, bb, box, maxK = 1.25) {
  const k = Math.min((box.x1 - box.x0) / (bb.x1 - bb.x0), (box.y1 - box.y0) / (bb.y1 - bb.y0), maxK);
  const ox = (box.x0 + box.x1) / 2 - (bb.x0 + bb.x1) / 2 * k, oy = (box.y0 + box.y1) / 2 - (bb.y0 + bb.y1) / 2 * k;
  const X = x => ox + x * k, Y = y => oy + y * k;
  for (const e of els) { e.x = X(e.x); e.y = Y(e.y); e.cap *= k; }
  return { k, X, Y };
}

// ── the designs ───────────────────────────────────────────────────────────
/* The wall. Each stat: the numeral, and beside it the unit (top-aligned) over
   the description (baseline-aligned). Three stats stack into a column; the 1
   stands beside it as tall as the column (in a phone frame, under it), with
   OPERATOR and its line running up its side. */
function designStats(ctx, S) {
  const portrait = S.H > S.W * 1.15;
  const N = portrait ? 2.4 : 2, U = portrait ? 0.7 : 0.78, Dc = 0.24, gap = 0.42, rg = 0.66;
  const els = [], rows = [];
  let top = 0, colW = 0;
  for (let i = 0; i < 3; i++) {
    const s = STATS[i], b = top + N;
    const nk = ink(ctx, s.n, N, ST.num);
    const ux = nk.r - nk.l + gap;
    const uw = ink(ctx, s.unit, U, ST.unit).w;
    els.push({ i, part: 'num', str: s.n, x: -nk.l, y: b, cap: N, st: ST.num, color: s.color, cx: (nk.r - nk.l) / 2, cy: b - N / 2 });
    els.push({ i, part: 'unit', str: s.unit, x: ux, y: b - N + U, cap: U, st: ST.unit, color: s.color });
    let dw = 0;
    s.desc.forEach((str, j) => {
      dw = Math.max(dw, ink(ctx, str, Dc, ST.desc).w);
      els.push({ i, part: 'desc', str, x: ux, y: b - (s.desc.length - 1 - j) * Dc * 1.75, cap: Dc, st: ST.desc, color: s.color, j });
    });
    const w = ux + Math.max(uw, dw);
    rows.push({ x0: 0, x1: w, y0: top, y1: b });
    colW = Math.max(colW, w);
    top = b + rg;
  }
  const colH = top - rg;
  const s = STATS[3];
  const N1 = portrait ? 2.75 * N : colH;
  const mk = ink(ctx, s.n, N1, ST.num);
  const mw = mk.r - mk.l;
  const U1 = Math.min(portrait ? 0.9 : 1.1, N1 * 0.99 / ink(ctx, s.unit, 1, ST.unit).w);
  const D1 = Math.min(0.3, N1 * 0.99 / ink(ctx, s.desc[0], 1, ST.desc).w);
  const blockW = mw + 0.4 * gap + U1 + 0.3 + D1;
  const mx = portrait ? (colW - blockW) / 2 : colW + 1.3, mtop = portrait ? colH + 1.05 : 0, mb = mtop + N1;
  els.push({ i: 3, part: 'num', str: s.n, x: mx - mk.l, y: mb, cap: N1, st: ST.num, color: s.color, cx: mx + mw / 2, cy: mb - N1 / 2 });
  const ux = mx + mw + 0.4 * gap + U1;
  // turned a quarter anticlockwise: the anchor is the line's baseline, the glyphs lie to its left
  els.push({ i: 3, part: 'unit', str: s.unit, x: ux, y: mb, cap: U1, st: ST.unit, color: s.color, rot: -Math.PI / 2 });
  els.push({ i: 3, part: 'desc', str: s.desc[0], x: ux + 0.3 + D1, y: mb, cap: D1, st: ST.desc, color: s.color, rot: -Math.PI / 2, j: 0 });
  const bb = { x0: 0, x1: Math.max(colW, mx + blockW), y0: 0, y1: Math.max(colH, mb) };
  const F = fit(els, bb, safeBox(S, -0.74, 0.64, 0.83));
  const R = rows.map(r => ({ x0: F.X(r.x0), x1: F.X(r.x1), y0: F.Y(r.y0), y1: F.Y(r.y1) }));
  for (const e of els) if (e.part === 'num') { e.cx = F.X(e.cx); e.cy = F.Y(e.cy); }
  // the way through: between the column and the 1 (landscape), or between them in height (portrait)
  const gapPt = portrait
    ? { x: F.X(colW / 2), y: F.Y(colH + 0.52) }
    : { x: F.X(colW + 0.65), y: F.Y(colH * 0.5) };
  return { els, rows: R, gapPt, k: F.k, portrait };
}

/* The lockup: the name huge (two lines on a phone), then the role, the
   address and the footer, left-aligned under it. */
function designLock(ctx, S) {
  const portrait = S.H > S.W * 1.15;
  const C = portrait ? 2.6 : 2, els = [];
  const names = portrait ? ['CHUN', 'HEE'] : ['CHUN HEE'];
  let b = 0, hit = null;
  names.forEach((str, j) => {
    b = C + j * C * 1.16;
    const k = ink(ctx, str, C, ST.name);
    const e = { part: 'name', str, x: -k.l, y: b, cap: C, st: ST.name, color: BLOCK.paper, j, L: k.L };
    els.push(e);
    const iH = str.indexOf('H', str === 'CHUN HEE' ? 2 : 0);
    if (iH >= 0 && (!portrait || j === 1)) {
      // the H of HEE: the middle of its left stem, at half the cap height
      ctx.save(); ctx.font = k.L.font;
      const mH = ctx.measureText('H'), mI = ctx.measureText('I');
      ctx.restore();
      const stem = mI.actualBoundingBoxRight + mI.actualBoundingBoxLeft;
      e.iH = iH;
      hit = { e, fx: k.L.xs[iH] - mH.actualBoundingBoxLeft + stem / 2, fy: -mH.actualBoundingBoxAscent / 2, stem };
    }
  });
  const roles = portrait ? ['AI-Native Web3 Marketer', '& Content Creator — Kuala Lumpur'] : ['AI-Native Web3 Marketer & Content Creator — Kuala Lumpur'];
  const Rc = 0.36;
  b += 1.02;
  roles.forEach((str, j) => {
    if (j) b += Rc * 1.75;
    els.push({ part: 'role', str, x: 0.04, y: b, cap: Rc, st: ST.role, color: PAPER_DIM, j });
  });
  b += 1.02;
  els.push({ part: 'mail', str: 'chunhee437@gmail.com', x: 0.04, y: b, cap: portrait ? 0.46 : 0.5, st: ST.mail, color: BLOCK.butter });
  b += 1.15;
  els.push({ part: 'foot', str: '© 2026 · built solo, with Claude', x: 0.04, y: b, cap: 0.24, st: ST.foot, color: FOOT });
  let x1 = 0;
  for (const e of els) x1 = Math.max(x1, e.x + ink(ctx, e.str, e.cap, e.st).w);
  const F = fit(els, { x0: 0, x1, y0: 0, y1: b }, safeBox(S, -0.66, 0.6, 0.82), 1.4);
  const ne = hit.e, kk = ne.cap / (REF * CAPR);   // ne is fitted by now
  const target = { x: ne.x + hit.fx * kk, y: ne.y + hit.fy * kk, stem: hit.stem * kk };
  return { els, target, k: F.k, portrait };
}

/** a camera pose that frames a box on the wall */
function frame(S, r, roll, fw = 0.84, fh = 0.66) {
  const sh = Math.min(S.W, S.H);
  const d = clamp(Math.max((r.x1 - r.x0) * sh / (fw * S.W), (r.y1 - r.y0) * sh / (fh * S.H)), 3.4, D);
  return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, z: ZW - d, roll };
}
const union = rs => ({ x0: Math.min(...rs.map(r => r.x0)), x1: Math.max(...rs.map(r => r.x1)), y0: Math.min(...rs.map(r => r.y0)), y1: Math.max(...rs.map(r => r.y1)) });

const cache = new Map();
function build(ctx, S) {
  const key = S.W + 'x' + S.H + (typeof document !== 'undefined' && document.fonts ? document.fonts.status : '');
  let G = cache.get(key);
  if (G) return G;
  const st = designStats(ctx, S), lk = designLock(ctx, S);
  const R = st.rows;
  // each hit, the camera steps back to take in one more stat
  const steps = [
    { t: T.s17, p: frame(S, R[0], 0.05) },
    { t: T.s12, p: frame(S, union(R.slice(0, 2)), -0.04) },
    { t: T.s4, p: frame(S, union(R), 0.03) },
    { t: T.s1, p: { x: 0, y: 0, z: 0, roll: 0 } }
  ];
  // the vortex: words on a ring round the approach to the first stat
  const c0 = steps[0].p, vortex = [];
  for (let j = 0; j < NV; j++) {
    const th = j * 2.39996 + 0.4, r = 1.9 + rng(j, 3) * 1.3;
    vortex.push({
      str: VORTEX[j % VORTEX.length], color: VCOL[j % VCOL.length],
      x: c0.x + Math.cos(th) * r, y: c0.y + Math.sin(th) * r, z: c0.z + 1 - j * 0.5,
      cap: 0.42 + rng(j, 5) * 0.4, rot: th + Math.PI / 2
    });
  }
  // far architecture: sized to overhang the frame, seen from the pose it stands behind
  const box = safeBox(S), far = FAR.map(f => {
    const dz = f.z - (f.wall ? 0 : ZL - D);
    const w = f.span * 2 * box.hw * dz / D;
    const cap = w / ink(ctx, f.str, 1, { weight: 900, tracking: -0.02 }).w;
    return { str: f.str, z: f.z, x: f.shift * w, y: f.y * box.hh * dz / D + cap / 2, cap, wall: f.wall };
  });
  G = { st, lk, steps, vortex, far };
  if (cache.size > 6) cache.clear();
  cache.set(key, G);
  return G;
}

// ── motion ────────────────────────────────────────────────────────────────
const arrive = bezier(0.42, 0, 0.06, 1);
const L3 = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t), roll: lerp(a.roll, b.roll, t) });
/** a held pose keeps leaning in */
const creep = (p, dt) => ({ x: p.x, y: p.y, z: p.z + 0.5 * dt, roll: p.roll });
const driftW = p => ({ x: 0, y: 0, z: 0.4 * p, roll: -0.012 * p });

function lockPose(lt) {
  // settled on the name, breathing forward; a thud on the downbeat as it lands
  const p = seg(lt, T.lock, T.paint), t = lt - T.lock;
  const thud = t > 0 ? 0.32 * Math.sin(Math.min(t, 0.6) * 15) * Math.exp(-t * 9) : 0;
  return { x: 0.08 * (p - 0.5), y: 0, z: ZL - D + 0.28 * p + thud, roll: 0 };
}

/** the camera, a pure function of local time */
function pose(lt, G, S) {
  const K = G.steps;
  if (lt < K[0].t) {
    const c0 = K[0].p;
    const start = { x: c0.x + 0.45, y: c0.y - 0.25, z: c0.z - 22, roll: c0.roll + 1.2 };
    return L3(start, c0, whip(seg(lt, 0, K[0].t)));
  }
  for (let i = 0; i < K.length - 1; i++) {
    if (lt >= K[i + 1].t) continue;
    const m0 = K[i + 1].t - STEP;
    if (lt < m0) return creep(K[i].p, lt - K[i].t);
    return L3(creep(K[i].p, m0 - K[i].t), K[i + 1].p, whip(seg(lt, m0, K[i + 1].t)));
  }
  if (lt < T.fly) return driftW(outCubic(seg(lt, T.s1, T.fly)));
  // through the gap and out to the name
  const a = driftW(1), g = G.st.gapPt, L = lockPose(lt);
  const p = arrive(seg(lt, T.fly, T.lock + 0.06));
  const q = spline([[a.x, a.y, a.z], [g.x, g.y, ZW - 2.4], [g.x, g.y, ZW + 1.4], [L.x, L.y, L.z]], p);
  const roll = lerp(a.roll, 0, p) - 0.34 * Math.sin(Math.PI * p) * (1 - 0.3 * p);
  if (lt < T.paint) return { x: q[0], y: q[1], z: q[2], roll };
  return drive(lt, G, S);
}

/** Catmull-Rom through pts, even in segments */
function spline(pts, f) {
  const n = pts.length - 1, u = clamp(f) * n, i = Math.min(n - 1, Math.floor(u)), t = u - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t * t + (-a + 3 * b - 3 * c2 + d) * t * t * t);
  return [0, 1, 2].map(k => c(p0[k], p1[k], p2[k], p3[k]));
}

/* The drive into the H. From bar 4 the camera leans in a little (the lockup
   stays whole for the read); from beat 14 it plunges: the stem glides to the
   centre and swells until it is wider than the frame's diagonal. Zoom is
   interpolated in log space so the rush reads as one accelerating move. */
const LEAN = Math.log(1.03);
function drive(lt, G, S) {
  const L0 = lockPose(T.paint), tg = G.lk.target;
  const sh = Math.min(S.W, S.H), diag = Math.hypot(S.W, S.H);
  const d0 = ZL - L0.z, d1 = tg.stem * sh / (1.25 * diag);
  const q1 = seg(lt, T.paint, T.plunge), q2 = seg(lt, T.plunge, T.fill);
  const e1 = q1 * q1, e2 = 0.035 * q2 + 0.965 * Math.pow(q2, 2.7);
  const d = d0 * Math.exp(-(LEAN * e1 + (Math.log(d0 / d1) - LEAN) * e2));
  const c = inOutCubic(clamp(q2 / 0.72));
  const sx = (tg.x - L0.x) / d0 * (1 - c), sy = (tg.y - L0.y) / d0 * (1 - c);
  return { x: tg.x - sx * d, y: tg.y - sy * d, z: ZL - d, roll: 0.2 * e2 };
}

/** a numeral thrown in from behind the camera: scale > 1 on the way, 1 on the beat, a shudder after */
const SLAM = 0.2;
function slam(lt, at, S0) {
  if (lt < at - SLAM) return null;
  if (lt < at) {
    const p = (lt - (at - SLAM)) / SLAM;
    return { s: 1 + (S0 - 1) * (1 - p * p), a: clamp(p / 0.07), spin: 1 - p * p };
  }
  const t = lt - at;
  return { s: 1 - 0.04 * Math.exp(-t * 13) * Math.cos(t * 52), a: 1, spin: 0 };
}

/** a hit's envelope: 1 on the hit, falling to 0 over len */
const env = (lt, at, len) => { const t = lt - at; return t < 0 || t > len ? 0 : Math.pow(1 - t / len, 2); };
/** the camera's punch on a hit: in and back out */
const punch = (lt, at) => { const t = (lt - at) * 16; return t <= 0 || t > 12 ? 0 : t * Math.exp(1 - t); };

// ── drawing ───────────────────────────────────────────────────────────────
const fontPx = w => `${w} ${REF}px ${FONT.sans}`;

/** the name, a glyph at a time, rising from a sill; the H painted klein from the bottom up */
function nameItem(e, lt, paint, W) {
  return (ctx, p, f) => {
    const s = e.cap * p.k / (REF * CAPR);
    if (s * REF > 80 * W) return;
    const L = e.L, asc = L.ascent, n = L.chars.length;
    ctx.scale(s, s);
    ctx.font = L.font; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const col = f > 0 ? mix(BLOCK.paper, BLOCK.ink, f) : BLOCK.paper;
    ctx.beginPath(); ctx.rect(-REF, -asc * 1.3, L.width + REF * 2, asc * 1.3 + REF * 0.04); ctx.clip();
    for (let i = 0; i < n; i++) {
      const ch = L.chars[i]; if (ch === ' ') continue;
      const off = (e.j || 0) * 0.08 + i * 0.026;
      const g = outExpo(seg(lt, T.lock - 0.4 + off, T.lock - 0.16 + off));
      if (g <= 0) continue;
      const x = L.xs[i], y = (1 - g) * asc * 1.3;
      if (i === e.iH && paint > 0) {
        const top = y - asc - 2, cut = top + (asc + 4) * (1 - paint);
        ctx.save(); ctx.beginPath(); ctx.rect(x - REF, top - REF, REF * 3, cut - top + REF); ctx.clip();
        ctx.fillStyle = col; ctx.fillText(ch, x, y); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(x - REF, cut, REF * 3, REF * 2); ctx.clip();
        ctx.fillStyle = BLOCK.klein; ctx.fillText(ch, x, y); ctx.restore();
      } else { ctx.fillStyle = col; ctx.fillText(ch, x, y); }
    }
  };
}

const scene = {
  id: 'operator',
  title: 'One operator',
  caption: 'The numbers slam in on the beat — 17 minutes of original animation, 12 voices, 4 brands, 1 operator — then the name, Chun Hee, with the role and the address; the camera drives into the H and the reel begins again.',
  bg: BLOCK.ink,
  assets: [],
  models: [],
  still: 5.9,
  sfx: [
    { at: T.s17, type: 'riser' },
    { at: T.s17, type: 'impact' },
    { at: T.s12, type: 'impact' },
    { at: T.s4, type: 'impact' },
    { at: T.s1, type: 'impact' },
    { at: 3.46, type: 'whoosh' },           // through the wall
    { at: T.lock, type: 'sub' },
    { at: 7.32, type: 'whoosh' }            // into the stem
  ],
  draw(ctx, S) {
    const lt = S.lt, W = S.W, H = S.H;
    ctx.fillStyle = BLOCK.ink; ctx.fillRect(0, 0, W, H);
    if (lt < T.in) return;
    if (lt >= T.fill) { ctx.fillStyle = nextColour(scene); ctx.fillRect(0, 0, W, H); return; }
    const G = build(ctx, S);
    const P = pose(lt, G, S);
    // the punch on each hit, toward the wall
    if (lt < T.fly) {
      const dw = ZW - P.z;
      let k = 0;
      for (const s of STATS) k = Math.max(k, punch(lt, s.at) * (s.n === '1' ? 0.07 : 0.045));
      P.z += dw * k;
    }
    const cam = camera(S, { ...P, zoom: 1 });

    // far architecture
    const bg = list();
    for (const w of G.far) {
      // the wall's ghosts give way as the camera leaves it; the name's come up behind it
      const a = w.wall ? 1 - seg(lt, T.fly, T.fly + 0.3) : seg(lt, T.fly + 0.15, T.lock);
      if (a <= 0) continue;
      bg.custom(w.z, (c, p, f) => {
        c.globalAlpha *= a;
        const s = w.cap * p.k / (REF * CAPR);
        if (s * REF > 4 * W) return;
        c.scale(s, s); c.font = fontPx(900); c.textAlign = 'center';
        c.fillStyle = mix(FAR_COL, BLOCK.ink, f); c.fillText(w.str, 0, 0);
      }, { x: w.x, y: w.y });
    }
    bg.draw(ctx, S, cam, { fog: BLOCK.ink, near: 14, far: 80 });

    const Lst = list();
    // the vortex, on the approach
    if (lt < T.s17 + 0.25) {
      const va = clamp((lt - T.in) / 0.1);
      for (const v of G.vortex) {
        Lst.custom(v.z, (c, p, f) => {
          const px = v.cap * p.k;
          if (px < 0.6 || px > 2 * W) return;
          const s = px / (REF * CAPR);
          c.globalAlpha *= va;
          c.scale(s, s); c.font = fontPx(900); c.textAlign = 'center';
          c.fillStyle = mix(v.color, BLOCK.ink, f); c.fillText(v.str, 0, 0);
        }, { x: v.x, y: v.y, rotZ: v.rot });
      }
    }

    // the wall
    const st = G.st;
    if (lt < T.lock + 0.3) {
      for (const e of st.els) {
        const s = STATS[e.i];
        if (e.part === 'num') {
          const sl = slam(lt, s.at, e.i === 3 ? 4.2 : 3.2);
          if (!sl) continue;
          // thrown in from behind the lens: it swells about (mostly) its own centre, drifting in a little from the axis
          const dw = ZW - P.z, de = dw / sl.s, m = Math.pow(de / dw, 0.78);
          const cx = P.x + (e.cx - P.x) * m, cy = P.y + (e.cy - P.y) * m;
          const rot = sl.spin * (e.i % 2 ? -0.3 : 0.3), cr = Math.cos(rot), sr = Math.sin(rot);
          const ox = e.x - e.cx, oy = e.y - e.cy;   // the pen from the centre, turned with the spin
          Lst.text(e.str, { x: cx + ox * cr - oy * sr, y: cy + ox * sr + oy * cr, z: P.z + de, size: e.cap, color: e.color, ...e.st, align: 'left', alpha: sl.a, rotZ: rot });
          // the shock of the landing: two outlines of it thrown back toward the lens
          const te = (lt - s.at) / 0.34;
          if (te > 0 && te < 1) {
            for (const [grow, a0] of e.i === 3 ? [[0.22, 0.5], [0.45, 0.28]] : [[0.4, 0.6], [0.8, 0.32]]) {
              const mg = 1 + grow * outCubic(te), dg = dw / mg, kg = dg / dw;
              Lst.text(e.str, { x: P.x + (e.cx - P.x) * kg + ox, y: P.y + (e.cy - P.y) * kg + oy, z: P.z + dg, size: e.cap, color: e.color, ...e.st, align: 'left', alpha: a0 * (1 - te) * (1 - te), stroke: true, strokeWidth: 1.6 });
            }
          }
        } else {
          const d0 = e.part === 'unit' ? 0.02 : 0.1 + (e.j || 0) * 0.06;
          const r = seg(lt, s.at + d0, s.at + d0 + (e.part === 'unit' ? 0.22 : 0.34));
          if (r <= 0) continue;
          Lst.text(e.str, { x: e.x, y: e.y, z: ZW, size: e.cap, color: e.color, ...e.st, align: 'left', reveal: r, mask: true, window: 0.45, rotZ: e.rot || 0 });
        }
      }
    }

    // the lockup
    if (lt > T.fly) {
      const paint = inOutCubic(seg(lt, T.paint - 0.5 * B, T.paint));
      for (const e of G.lk.els) {
        if (e.part === 'name') { Lst.custom(ZL, nameItem(e, lt, paint, W), { x: e.x, y: e.y }); continue; }
        const at = e.part === 'role' ? T.role + (e.j || 0) * 0.07 : e.part === 'mail' ? T.mail : T.foot;
        const r = seg(lt, at, at + 0.4);
        if (r <= 0) continue;
        Lst.text(e.str, { x: e.x, y: e.y, z: ZL, size: e.cap, color: e.color, ...e.st, align: 'left', reveal: r, mask: true, window: 0.3 });
      }
    }
    Lst.draw(ctx, S, cam, { fog: BLOCK.ink, near: 6, far: 48, maxPx: 80 });

    // ── the lens: seasoning on the hits, quiet at both ends ──
    const fx = S.fx;
    let ab = 0, shake = 0;
    for (const at of [T.s17, T.s12, T.s4]) { const h = env(lt, at, 0.3); ab = Math.max(ab, 0.45 * h); shake = Math.max(shake, 0.8 * S.u * h); }
    const h1 = env(lt, T.s1, 0.6);
    ab = Math.max(ab, 1.2 * h1); shake = Math.max(shake, 2.4 * S.u * h1);
    fx.flash = 0.34 * env(lt, T.s1, 0.15);
    if (lt > T.s1 && lt < T.s1 + 0.6) {
      fx.warp = seg(lt, T.s1, T.s1 + 0.6, outCubic);
      const one = st.els.find(e => e.i === 3 && e.part === 'num');
      const q = cam.project(one.cx, one.cy, ZW);
      if (q) { fx.warpX = clamp(q.x / W); fx.warpY = clamp(q.y / H); }
    }
    const hs = env(lt, T.lock, 0.5);
    ab = Math.max(ab, 0.35 * hs); shake = Math.max(shake, 0.9 * S.u * hs);
    fx.exposure = 1 + 0.05 * env(lt, T.lock, 0.35);
    ab = Math.max(ab, 0.55 * Math.sin(Math.PI * seg(lt, T.fly, T.lock)));
    ab = Math.max(ab, 0.75 * seg(lt, T.plunge + 0.3, 7.2) * (1 - seg(lt, 7.2, T.fill - 0.04)));
    fx.ab = ab; fx.shake = shake;
  }
};
export default scene;
