/* Chapter 2 — Brands. "Four brands. One marketer."

   The four brands of the ecosystem as type architecture, one per bar, each
   built a different way, in one continuous move of the camera:

     bar 1  OWNERSHIPCOIN      a wall of letters the camera flies along
     bar 2  THE CHILL GALLERY  words standing on a ground plane, receding
     bar 3  GACHA              a stack of floors the camera rises through
     bar 4  ARK.TG             a word that spins into place — then the camera
                               drives into its dot until ink is the frame.

   space.js's camera only looks down +z, and its type always faces the lens;
   this chapter needs letters lying on walls and floors and turning in space,
   so it carries a small renderer of its own: a camera with yaw, pitch and
   roll, and glyphs laid on planes in 3D. Each glyph is drawn with its own
   affine transform (the local linear part of the perspective at its centre),
   which stays vector at any size, and is extruded by stacking a few copies
   between its back and front faces. Everything is a pure function of S.lt. */
import { text, layout, seg, clamp, lerp, outExpo, inExpo, outCubic, inCubic, inOutCubic, outQuad, inQuad, outQuart, outBack, whip, FONT } from '../../kit.js';
import { rgb } from '../../space.js';
import { BLOCK, BEAT, BAR } from '../palette.js';
import { nextColour } from '../timeline.js';

const OR = rgb(BLOCK.signal), INK = rgb(BLOCK.ink), PAPER = rgb(BLOCK.paper);
const CAP = 70;                      // Archivo's cap height at the 100px reference size
const FONT100 = `900 100px ${FONT.sans}`;
const TAU = Math.PI * 2, HALF_PI = Math.PI / 2;

// ── colour ────────────────────────────────────────────────────────────────
const css = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const SIDE = mixc(OR, INK, 0.58);      // the flanks of ink letters: burnt orange
const SHADOW = mixc(OR, INK, 0.2);    // cast shadows on the ground plane
const fogged = (c, f) => css(f > 0 ? mixc(c, OR, f) : c);

// ── the camera: position, yaw (turn right +), pitch (look up +), roll ──────
function makeCam(S, p) {
  const F = (p.zoom || 1) * Math.min(S.W, S.H);
  const cyw = Math.cos(p.yaw), syw = Math.sin(p.yaw), cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  const cr = Math.cos(p.roll), sr = Math.sin(p.roll);
  const ox = S.W * 0.5, oy = S.H * 0.5, X = p.x, Y = p.y, Z = p.z, NEAR = 0.05;
  const view = (x, y, z, o) => {
    const dx = x - X, dy = y - Y, dz = z - Z;
    const x1 = dx * cyw - dz * syw, z1 = dx * syw + dz * cyw;
    o[0] = x1; o[1] = dy * cp + z1 * sp; o[2] = -dy * sp + z1 * cp;
    return o;
  };
  const screen = (xc, yc, zc) => {
    const k = F / zc, sx = xc * k, sy = yc * k;
    return { x: ox + sx * cr - sy * sr, y: oy + sx * sr + sy * cr, d: zc };
  };
  const v = [0, 0, 0];
  return {
    F, NEAR, W: S.W, H: S.H, view, screen,
    project(x, y, z) { view(x, y, z, v); return v[2] <= NEAR ? null : screen(v[0], v[1], v[2]); },
    depth(x, y, z) { view(x, y, z, v); return v[2]; }
  };
}

// ── glyphs on planes ──────────────────────────────────────────────────────
/* A glyph is drawn at the 100px reference size through one affine transform:
   the parallelogram that best fits (least squares) the perspective image of
   its box — exact far away, and without seams up close. A glyph that reaches
   behind the lens is cut into strips, each fitted the same way and clipped
   to itself, and the strips behind are dropped — so a letter can pass right
   beside the camera without its approximation blowing up across the frame.
   The glyph box in reference px: x 0..adv, y -BOX_T..BOX_B (y down). */
const BOX_T = CAP * 1.08, BOX_B = CAP * 0.06;
const Q = [null, null, null, null];

/** the least-squares affine for the local rect [x0,x1]×[y0,y1]; null if any corner is behind the lens */
function quadAffine(C, O, ex, ey, s, x0, y0, x1, y1) {
  for (let k = 0; k < 4; k++) {
    const u = (k & 1 ? x1 : x0) * s, v = (k & 2 ? y1 : y0) * s;
    const p = C.project(O[0] + ex[0] * u + ey[0] * v, O[1] + ex[1] * u + ey[1] * v, O[2] + ex[2] * u + ey[2] * v);
    if (!p) return null;
    Q[k] = p;
  }
  const [tl, tr, bl, br] = Q, w = x1 - x0, h = y1 - y0;
  const a = (tr.x + br.x - tl.x - bl.x) / (2 * w), b = (tr.y + br.y - tl.y - bl.y) / (2 * w);
  const c = (bl.x + br.x - tl.x - tr.x) / (2 * h), d = (bl.y + br.y - tl.y - tr.y) / (2 * h);
  const mx = (tl.x + tr.x + bl.x + br.x) / 4, my = (tl.y + tr.y + bl.y + br.y) / 4, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return {
    a, b, c, d, e: mx - a * cx - c * cy, f: my - b * cx - d * cy, z: (tl.d + tr.d + bl.d + br.d) / 4,
    x0: Math.min(tl.x, tr.x, bl.x, br.x), x1: Math.max(tl.x, tr.x, bl.x, br.x),
    y0: Math.min(tl.y, tr.y, bl.y, br.y), y1: Math.max(tl.y, tr.y, bl.y, br.y)
  };
}
const onFrame = (m, W, H) => m.x1 > 0 && m.x0 < W && m.y1 > 0 && m.y0 < H;
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const fogOf = (d, fog) => clamp((d - fog.near) / (fog.far - fog.near));

/**
 * lay a run of glyphs into the draw list.
 *   w: { L (layout at 100px), s, O (baseline-left of the run), ex, ey, T (extrusion depth),
 *        face, side, back, per(i) → { off:[dx,dy,dz] } }
 */
function run(items, C, w, fog) {
  const L = w.L, n = L.chars.length, nrm = cross(w.ex, w.ey), W = C.W, H = C.H, ex = w.ex, ey = w.ey, s = w.s;
  const NEAR = C.NEAR * 3;
  for (let i = 0; i < n; i++) {
    const ch = L.chars[i]; if (ch === ' ') continue;
    const adv = (i < n - 1 ? L.xs[i + 1] : L.width) - L.xs[i];
    const q = w.per ? w.per(i) : null;
    const k = L.xs[i] * s;
    const O = [w.O[0] + w.ex[0] * k, w.O[1] + w.ex[1] * k, w.O[2] + w.ex[2] * k];
    if (q && q.off) { O[0] += q.off[0]; O[1] += q.off[1]; O[2] += q.off[2]; }
    // a glyph may turn on its own (q.ey): it keeps its place in the run
    const gy = q && q.ey ? q.ey : ey, gn = q && q.ey ? cross(ex, gy) : nrm;
    const dAt = (O, u, v) => C.depth(O[0] + (ex[0] * u + gy[0] * v) * s, O[1] + (ex[1] * u + gy[1] * v) * s, O[2] + (ex[2] * u + gy[2] * v) * s);
    const d00 = dAt(O, 0, -BOX_T), d10 = dAt(O, adv, -BOX_T), d01 = dAt(O, 0, BOX_B), d11 = dAt(O, adv, BOX_B);
    const dmin = Math.min(d00, d10, d01, d11), dmax = Math.max(d00, d10, d01, d11);
    if (dmax <= NEAR) continue;
    const zc = (d00 + d10 + d01 + d11) / 4;
    const f = fogOf(zc, fog);
    if (f >= 0.995) continue;
    // strips only for a glyph that reaches behind the lens
    const ns = dmin <= NEAR ? 10 : 1;
    const alongX = Math.abs(d10 - d00) + Math.abs(d11 - d01) >= Math.abs(d01 - d00) + Math.abs(d11 - d10);
    const B = w.T ? [O[0] + gn[0] * w.T, O[1] + gn[1] * w.T, O[2] + gn[2] * w.T] : null;
    const strips = [];
    for (let j = 0; j < ns; j++) {
      let x0 = 0, x1 = adv, y0 = -BOX_T, y1 = BOX_B;
      if (ns > 1) {
        if (alongX) { x0 = adv * j / ns; x1 = adv * (j + 1) / ns; } else { y0 = -BOX_T + (BOX_T + BOX_B) * j / ns; y1 = -BOX_T + (BOX_T + BOX_B) * (j + 1) / ns; }
        if (Math.min(dAt(O, x0, y0), dAt(O, x1, y0), dAt(O, x0, y1), dAt(O, x1, y1)) <= NEAR) continue;
      }
      const m = quadAffine(C, O, ex, gy, s, x0, y0, x1, y1);
      if (!m) continue;
      const st = { m, mb: null, nl: 0, sp: 0, x0, y0, x1, y1 };
      if (B) {
        const mb = quadAffine(C, B, ex, gy, s, x0, y0, x1, y1);
        if (mb) {
          // enough copies between back and front that neighbours overlap
          let disp = 0;
          for (let c = 0; c < 4; c++) {
            const u = c & 1 ? x1 : x0, v = c & 2 ? y1 : y0;
            disp = Math.max(disp, Math.hypot((m.a - mb.a) * u + (m.c - mb.c) * v + m.e - mb.e, (m.b - mb.b) * u + (m.d - mb.d) * v + m.f - mb.f));
          }
          st.mb = mb; st.nl = Math.min(ns > 1 ? 16 : 36, Math.ceil(disp / 1.6));
        }
      }
      if (!onFrame(m, W, H) && !(st.mb && onFrame(st.mb, W, H))) continue;
      strips.push(st);
    }
    if (!strips.length) continue;
    items.push({ z: zc + (w.bias || 0), ch, strips, clip: ns > 1, face: fogged(w.face || INK, f), side: fogged(w.side || SIDE, f), back: fogged(w.back || w.face || INK, f), bmp: st0(strips) ? glyphBitmap(ch, w.side || SIDE) : null, fogBmp: st0(strips) && f > 0.02 ? glyphBitmap(ch, OR) : null, f });
  }
}
function setM(ctx, m) { ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f); }
function setLerp(ctx, a, b, t) {
  ctx.setTransform(lerp(a.a, b.a, t), lerp(a.b, b.b, t), lerp(a.c, b.c, t), lerp(a.d, b.d, t), lerp(a.e, b.e, t), lerp(a.f, b.f, t));
}
/* A glyph's silhouette as a bitmap, for the copies that make its flank.
   Drawn as text, every copy under its own skewed transform is a new glyph
   rasterisation for the browser (a spinning, extruded word asks for hundreds
   a frame, and the caches that hold them overflow into long stalls); drawn as
   an image each copy is one textured quad. The face on top stays vector.
   One bitmap per letter and colour (flank colours, plus orange for fog). */
const BMP = new Map(), BK = 2.5, BPAD = 5;
const st0 = strips => strips.some(s => s.mb && s.nl > 0);
function glyphBitmap(ch, col) {
  const key = ch + css(col);
  let b = BMP.get(key);
  if (b) return b;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'), x = c.getContext('2d');
  x.font = `900 ${100 * BK}px ${FONT.sans}`;
  const adv = x.measureText(ch).width;
  c.width = Math.ceil(adv + BPAD * 2 + 8 * BK); c.height = Math.ceil((BOX_T + BOX_B) * BK + BPAD * 2);
  x.font = `900 ${100 * BK}px ${FONT.sans}`;
  x.fillStyle = css(col); x.textBaseline = 'alphabetic';
  x.fillText(ch, BPAD, BPAD + BOX_T * BK);
  b = { cv: c, k: 1 / BK, ox: -BPAD / BK, oy: -BPAD / BK - BOX_T };
  if (BMP.size > 64) BMP.clear();
  BMP.set(key, b);
  return b;
}
const HULL = [];
/** clip to the convex hull of a strip's rect at its front and at its back */
function hullClip(ctx, st) {
  HULL.length = 0;
  for (const m of [st.m, st.mb]) for (let c = 0; c < 4; c++) {
    const u = c & 1 ? st.x1 : st.x0, v = c & 2 ? st.y1 : st.y0;
    HULL.push([m.a * u + m.c * v + m.e, m.b * u + m.d * v + m.f]);
  }
  HULL.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const p of HULL) { while (lo.length >= 2 && turn(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = HULL.length - 1; i >= 0; i--) { const p = HULL[i]; while (hi.length >= 2 && turn(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  const poly = lo.slice(0, -1).concat(hi.slice(0, -1));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
  ctx.clip();
}
function paint(ctx, g) {
  if (g.fn) { g.fn(ctx); return; }
  const m0 = g.strips[0].m, front = m0.a * m0.d - m0.b * m0.c > 0;
  // the flank first: copies of the silhouette from the back face to the
  // front (or front to back, seen from behind), fogged by an orange copy
  const bm = g.bmp, fb = g.fogBmp;
  if (bm) for (const st of g.strips) {
    const n = st.nl, m = st.m, mb = st.mb;
    if (!mb || n <= 0) continue;
    if (g.clip) { ctx.save(); hullClip(ctx, st); }
    for (let k = 0; k < n; k++) {
      setLerp(ctx, mb, m, (front ? k : n - k) / n);
      ctx.transform(bm.k, 0, 0, bm.k, bm.ox, bm.oy);
      ctx.drawImage(bm.cv, 0, 0);
      if (fb) { ctx.globalAlpha = g.f; ctx.drawImage(fb.cv, 0, 0); ctx.globalAlpha = 1; }
    }
    if (g.clip) ctx.restore();
  }
  // then the face, as vector type
  ctx.fillStyle = front ? g.face : g.back;
  for (const st of g.strips) {
    const m = front || !st.mb ? st.m : st.mb;
    setM(ctx, m);
    if (g.clip) {
      ctx.save();
      const e = 1.2 / Math.sqrt(Math.abs(m.a * m.d - m.b * m.c) || 1);
      ctx.beginPath(); ctx.rect(st.x0 - e, st.y0 - e, st.x1 - st.x0 + 2 * e, st.y1 - st.y0 + 2 * e); ctx.clip();
      ctx.fillText(g.ch, 0, 0);
      ctx.restore();
    } else ctx.fillText(g.ch, 0, 0);
  }
}

/** a straight 3D line, clipped at the near plane, fogged in `segs` pieces */
function line3(ctx, C, a, b, col, width, fog, segs = 1) {
  const va = C.view(a[0], a[1], a[2], [0, 0, 0]), vb = C.view(b[0], b[1], b[2], [0, 0, 0]);
  const N = C.NEAR * 2;
  if (va[2] < N && vb[2] < N) return;
  if (va[2] < N) { const t = (N - va[2]) / (vb[2] - va[2]); for (let k = 0; k < 3; k++) va[k] = lerp(va[k], vb[k], t); }
  if (vb[2] < N) { const t = (N - vb[2]) / (va[2] - vb[2]); for (let k = 0; k < 3; k++) vb[k] = lerp(vb[k], va[k], t); }
  ctx.lineWidth = width;
  let prev = C.screen(va[0], va[1], va[2]);
  for (let i = 1; i <= segs; i++) {
    const t = i / segs, zc = lerp(va[2], vb[2], t);
    const p = C.screen(lerp(va[0], vb[0], t), lerp(va[1], vb[1], t), zc);
    const f = fogOf((prev.d + p.d) / 2, fog);
    if (f < 0.995) {
      ctx.strokeStyle = fogged(col, f);
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    prev = p;
  }
}

// ── geometry for a frame size (cached: it only depends on the frame) ──────
const GEO = new Map();
function geometry(ctx, S) {
  const key = S.W + 'x' + S.H;
  let G = GEO.get(key);
  if (G) return G;
  const P = S.portrait, F = Math.min(S.W, S.H), wide = S.W / F, tall = S.H / F;
  const lay = str => layout(ctx, str, { size: 100, weight: 900, tracking: -0.01 });
  G = { P, F };

  // bar 1 — the wall. A-local space: the camera looks down +z, the wall is
  // the plane x = -WX, the letters stand on the ground (y = 0) reading into +z.
  const capA = P ? 4 : 4.6;
  const linesA = P ? ['OWNERSHIP', 'COIN'] : ['OWNERSHIPCOIN'];
  G.A = {
    WX: P ? 7 : 8, cap: capA, T: capA * 0.16, z0: 4,
    yaw: P ? -0.34 : -0.4,
    lines: linesA.map((str, i, a) => ({ L: lay(str), s: capA / CAP, y: -(a.length - 1 - i) * capA * 1.22 })),
    eye: P ? -capA * 1.11 : -capA * 0.43
  };
  G.A.top = -(linesA.length - 1) * capA * 1.22 - capA;

  // bar 2 — the ground plane; world space from here on. Three rows stand on
  // y = 0, the farther ones higher on the frame: a pyramid tapering toward the
  // vanishing point. Each row's depth is solved from where its baseline should
  // sit on the frame, and its size from the share of the width it should fill.
  const camB = P ? { y: -11, z: 1.5, pitch: -0.56 } : { y: -9, z: 1.5, pitch: -0.42 };
  const rowsB = P
    ? [['THE', 0.36, 0.4], ['CHILL', 0.52, 0.62], ['GALLERY', 0.69, 0.8]]
    : [['THE', 0.305, 0.22], ['CHILL', 0.5, 0.44], ['GALLERY', 0.74, 0.74]];
  const h = -camB.y, sp = Math.sin(camB.pitch), cp = Math.cos(camB.pitch);
  G.B = {
    cam: camB,
    rows: rowsB.map(([str, yf, frac]) => {
      const Y = (yf - 0.5) * tall;
      const dz = h * (cp + Y * sp) / (Y * cp - sp);
      const z2 = -h * sp + dz * cp;
      const L = lay(str), wW = frac * wide * z2, s = wW / L.width;
      return { str, L, D: camB.z + dz, s, cap: s * CAP, x0: -wW / 2 };
    })
  };

  // bar 3 — the stack: floors of GACHA over the plaza, read from below
  const Lg = lay('GACHA'), y0 = -17, gap = 8, K = 7, SZ = 24, firstD = 7;
  const gW = (P ? 0.86 : 0.7) * wide * firstD;
  G.C = {
    L: Lg, s: gW / Lg.width, w: gW, SZ, K, gap, y0, twist: 0.3, start: y0 + firstD,
    // the floors twist out and back like a helix that turns home
    floors: Array.from({ length: K }, (_, k) => ({ y: y0 - k * gap, ang: 0.3 * helix(k), paper: k === K - 1 }))
  };
  G.C.top = y0 - (K - 1) * gap;

  // bar 4 — ARK.TG over the top of the stack
  const Dd = 16, lookUp = 0.26;
  const dLines = P ? ['ARK.', 'TG'] : ['ARK.TG'];
  const L0 = lay(dLines[0]);
  const sD = (P ? 0.74 : 0.78) * wide * Dd / L0.width, capD = sD * CAP, lead = capD * 1.14;
  const yCam = G.C.top - 6;             // where the rise leaves the camera, over the top floor
  G.D = {
    yCam, lookUp, pivot: [0, yCam - Math.tan(lookUp) * Dd, SZ + Dd], dist: Dd, s: sD, cap: capD, T: capD * 0.3,
    lines: dLines.map((str, i) => {
      const L = lay(str);
      return { L, w: L.width * sD, base: (i - (dLines.length - 1) / 2) * lead + capD / 2 };
    })
  };
  // the dot: its ink box at 100px, and where it sits in its line
  ctx.save(); ctx.font = FONT100;
  const mt = ctx.measureText('.');
  ctx.restore();
  const bl = mt.actualBoundingBoxLeft || -6, br = mt.actualBoundingBoxRight || 27, ba = mt.actualBoundingBoxAscent || 20, bd = mt.actualBoundingBoxDescent || 0;
  const l0 = G.D.lines[0], di = l0.L.chars.indexOf('.');
  G.D.dot = {
    lx: -l0.w / 2 + (l0.L.xs[di] + (br - bl) / 2) * sD,   // along ex from the pivot
    ly: l0.base + ((bd - ba) / 2) * sD,                     // along ey from the pivot
    r: Math.min(br + bl, ba + bd) / 2 * sD
  };

  if (GEO.size > 6) GEO.clear();
  GEO.set(key, G);
  return G;
}

// ── time ──────────────────────────────────────────────────────────────────
const T_WHIP = 1.43, T_B = BAR, T_TILT = 3.2, T_C = 2 * BAR, T_LEVEL = 4.45, T_LEVELED = 5.0,
  T_SPIN = T_LEVEL, T_D = 3 * BAR, T_DRIVE = 6.6, T_INK = 7.36;
const helix = k => Math.max(0, 3 - Math.abs(k - 3));
const pulse = (lt, at, dur) => { const k = (lt - at) / dur; return k < 0 || k > 1 ? 0 : (1 - k) * (1 - k); };
const OA = [44, 0, 0];      // where the wall's local space sits in the world (turned -90°)
function aToWorld(lx, ly, lz) { return [OA[0] - lz, ly, OA[2] + lx]; }

/** the camera at local time lt */
function pose(lt, G) {
  const A = G.A, B = G.B.cam, C = G.C, D = G.D;
  if (lt < T_B) {
    // bar 1: burst out of the orange, settle off the wall and fly along it;
    // then whip right, craning up, onto the plaza
    const p = outCubic(clamp(lt / 0.5)), g = clamp((lt - 0.5) / (T_WHIP - 0.5));
    const z = -36 + 16 * p + 34 * lt;
    const yawA = lerp(0.3, A.yaw, p) - 0.06 * g;
    const rollA = lerp(0.18, 0, p) - 0.03 * g;
    const w = whip(seg(lt, T_WHIP, T_B));
    const [wx, wy, wz] = aToWorld(0, A.eye, z);
    return {
      x: lerp(wx, 0, w), y: lerp(wy, B.y, inOutCubic(w)), z: lerp(wz, B.z - 1.5, w),
      yaw: lerp(yawA - HALF_PI, 0, w), pitch: lerp(0, B.pitch, w), roll: lerp(rollA, 0, w) + 0.1 * Math.sin(Math.PI * w)
    };
  }
  if (lt < T_TILT) {
    // bar 2: the hold over the plaza — a slow crane forward, the whip settling
    const k = (lt - T_B) / (T_TILT - T_B), tau = lt - T_B;
    return {
      x: 0, y: B.y + 0.5 * k, z: B.z - 1.5 + 3 * k,
      yaw: 0.04 * Math.exp(-9 * tau) * Math.sin(24 * tau), pitch: B.pitch + 0.025 * k, roll: 0.015 * k
    };
  }
  if (lt < T_C) {
    // tilt up and fly in under the stack
    const k = (lt - T_TILT) / (T_C - T_TILT), e = whip(k);
    return {
      x: 0, y: lerp(B.y + 0.5, C.start, outCubic(k)), z: lerp(B.z + 1.5, C.SZ, inOutCubic(k)),
      yaw: 0, pitch: lerp(B.pitch + 0.025, HALF_PI, e), roll: lerp(0.015, 0, e)
    };
  }
  // bar 3: rise through the floors, the roll following their twist so the
  // floor ahead always reads upright; then level off in front of ARK.TG
  const y = lerp(C.start, D.yCam, inOutCubic(seg(lt, T_C, T_LEVELED)));
  const kappa = (C.start - y) / C.gap - 0.4;          // ≈ the index of the floor overhead
  const lv = inOutCubic(seg(lt, T_LEVEL, T_LEVELED));
  const cam = { x: 0, y, z: C.SZ, yaw: 0, pitch: lerp(HALF_PI, D.lookUp, lv), roll: -C.twist * helix(kappa) * (1 - lv) };
  if (lt < T_D) return cam;
  // bar 4: a slow push, rising to the word's level as the camera levels off
  // (so it stays centred), then the drive into the dot
  const dot = dotWorld(G);
  const push = clamp((lt - T_D) / (T_DRIVE - T_D)), lvl = inOutCubic(clamp(push * 1.15));
  const d0 = D.dist * 0.86, dPush = lerp(D.dist, d0, outQuad(push));
  const q = seg(lt, T_DRIVE, T_INK);
  const dist = q > 0 ? Math.exp(lerp(Math.log(d0), Math.log(0.04), inCubic(q))) : dPush;
  const aim = outCubic(q);
  return {
    x: lerp(0, dot[0], aim), y: lerp(lerp(D.yCam, D.pivot[1], lvl), dot[1], aim), z: dot[2] - dist,
    yaw: 0, pitch: lerp(D.lookUp, 0, lvl), roll: 0.06 * inQuad(q)
  };
}
function dotWorld(G) {
  const D = G.D;
  return [D.pivot[0] + D.dot.lx, D.pivot[1] + D.dot.ly, D.pivot[2]];
}

// ── the set pieces ────────────────────────────────────────────────────────
function wall(items, C, G, lt, fog) {
  const A = G.A;
  // the letters lie flat on the wall until the first beat, then punch out of it
  const T = A.T * outBack(seg(lt, BEAT - 0.07, BEAT + 0.2), 2.4);
  // A-local → world: the reading direction (local +z) is world -x
  for (const ln of A.lines) {
    run(items, C, { L: ln.L, s: ln.s, O: aToWorld(-A.WX, ln.y, A.z0), ex: [-1, 0, 0], ey: [0, 1, 0], T }, fog);
  }
  // paper-white rails along the foot and the head of the lettering
  const lw = Math.max(1, 0.26 * Math.min(C.W, C.H) / 100);
  for (const y of [0.5, A.top - 0.5]) {
    items.push({ z: 1e4, fn: c => { c.setTransform(1, 0, 0, 1, 0, 0); line3(c, C, aToWorld(-A.WX, y, -60), aToWorld(-A.WX, y, 160), PAPER, lw, fog, 24); } });
  }
}

function plaza(items, C, G, lt, fog) {
  const B = G.B;
  // the ground: a grid that runs to the vanishing point
  const gfog = { near: fog.near * 0.4, far: fog.far * 0.75 };
  items.push({ z: 2e4, fn: c => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    const lw = Math.max(1, Math.min(C.W, C.H) / 700);
    for (let x = -66; x <= 66; x += 6) line3(c, C, [x, 0, -6], [x, 0, 130], INK, lw, gfog, 12);
    for (let z = 0; z <= 96; z += 6) line3(c, C, [-80, 0, z], [80, 0, z], INK, lw, gfog, 1);
  } });
  // the rows lie flat on the ground, then slam upright on the beat, hinged
  // at their feet: THE on the bar, CHILL an eighth later, GALLERY on the beat
  const lands = [T_B, T_B + BEAT / 2, T_B + BEAT];
  const shadows = [];
  B.rows.forEach((r, j) => {
    const n = r.L.chars.length, phi = [];
    for (let i = 0; i < n; i++) {
      const at = lands[j] + i * 0.03;
      phi.push(HALF_PI * outBack(seg(lt, at - 0.2, at), 2.2));
    }
    run(items, C, {
      L: r.L, s: r.s, O: [r.x0, 0, r.D], ex: [1, 0, 0], ey: [0, 1, 0], T: r.cap * 0.3,
      per: i => ({ ey: [0, Math.sin(phi[i]), -Math.cos(phi[i])] })
    }, fog);
    shadows.push({ r, phi });
  });
  // long shadows, cast back toward the vanishing point (under everything standing)
  items.push({ z: 1.5e4, fn: c => {
    const list = [];
    for (const { r, phi } of shadows) {
      run(list, C, {
        L: r.L, s: r.s, O: [r.x0, 0, r.D], ex: [1, 0, 0], ey: [0, 0, -1], face: SHADOW,
        per: i => ({ off: [0, 0, r.cap * 0.3 * Math.sin(phi[i])], ey: [0, 0, -(Math.cos(phi[i]) + 1.3 * Math.sin(phi[i]))] })
      }, fog);
    }
    list.sort((p, q) => q.z - p.z);
    for (const g of list) paint(c, g);
  } });
}

function stack(items, C, G, fog) {
  const K = G.C;
  for (const fl of K.floors) {
    const a = fl.ang, ex = [Math.cos(a), 0, Math.sin(a)], ey = [-Math.sin(a), 0, Math.cos(a)];
    const hc = K.s * CAP / 2;
    // centre the word on the axis
    const O = [-ex[0] * K.w / 2 + ey[0] * hc, fl.y, K.SZ - ex[2] * K.w / 2 + ey[2] * hc];
    run(items, C, { L: K.L, s: K.s, O, ex, ey, T: 0.8, face: fl.paper ? PAPER : INK, side: fl.paper ? mixc(PAPER, OR, 0.5) : SIDE }, fog);
  }
}

function ark(items, C, G, lt, fog) {
  const D = G.D;
  // it comes down out of the sky as the camera tilts down to meet it, turning
  // a turn and a half about its own upright, and lands face-on on the bar
  const p = seg(lt, T_SPIN, T_D), tau = lt - T_D;
  const theta = -3 * Math.PI * Math.pow(1 - p, 1.6) + (tau > 0 ? 0.14 * Math.exp(-7 * tau) * Math.sin(tau * 19) : 0);
  const ex = [Math.cos(theta), 0, Math.sin(theta)], ey = [0, 1, 0];
  const lift = 30 * (1 - outCubic(seg(lt, T_LEVEL, T_LEVELED + 0.3)));
  for (const ln of D.lines) {
    const O = [D.pivot[0] - ex[0] * ln.w / 2, D.pivot[1] + ln.base - lift, D.pivot[2] - ex[2] * ln.w / 2];
    run(items, C, { L: ln.L, s: D.s, O, ex, ey, T: D.T, side: PAPER, back: INK }, fog);
  }
}

// ── the HUD: flat labels in paper-white ───────────────────────────────────
function label(ctx, S, str, x, y, o, lt, tin, tout) {
  if (lt < tin || lt > tout + 0.6) return;
  const rin = seg(lt, tin, tin + 0.55);
  const size = o.size;
  text(ctx, S, str, x, y, {
    weight: 700, tracking: 0.16, color: css(PAPER), align: 'left', ...o, mask: true, reveal: rin, window: 0.4,
    glyph: (i, pp, n) => {
      const q = outExpo(seg(lt, tout + (i / Math.max(1, n - 1)) * 0.12, tout + 0.3 + (i / Math.max(1, n - 1)) * 0.12));
      return q > 0 ? { dy: -q * size * 1.5 } : null;
    }
  });
}

function hud(ctx, S, lt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const P = S.portrait, u = S.u, W = S.W, H = S.H;
  const sz = P ? 3.2 * u : 2.05 * u;
  const xL = W * (P ? 0.075 : 0.055), xR = W * (P ? 0.925 : 0.945);
  const yT = H * (P ? 0.1 : 0.13), yB = H * (P ? 0.84 : 0.85);
  const OUT = 6.8;
  const paper = css(PAPER);

  // the eyebrow, with a short rule before it
  const rr = outExpo(seg(lt, BEAT, BEAT + 0.5)) - inExpo(seg(lt, OUT, OUT + 0.25));
  if (rr > 0) { ctx.fillStyle = paper; ctx.fillRect(xL, yT - sz * 0.36, sz * 2.2 * rr, Math.max(1, sz * 0.14)); }
  label(ctx, S, 'BRAND & GROWTH', xL + sz * 3, yT, { size: sz }, lt, BEAT + 0.06, OUT);

  // the counter: 1 → 4, rolling over on each bar
  const nsz = P ? 15 * u : 10.5 * u;
  const nOn = outExpo(seg(lt, BEAT, BEAT + 0.45)), nOff = inExpo(seg(lt, OUT + 0.06, OUT + 0.32));
  if (nOn > 0 && nOff < 1) {
    ctx.save();
    ctx.beginPath(); ctx.rect(xL - nsz * 0.2, yB - nsz * 0.86, nsz * 1.4, nsz * 0.96); ctx.clip();
    const bars = [0, T_B, T_C, T_D];
    let cur = 0;
    for (let i = 1; i < 4; i++) if (lt >= bars[i] - 0.03) cur = i;
    const roll = cur === 0 ? 1 : outExpo(seg(lt, bars[cur] - 0.03, bars[cur] + 0.32));
    const dy = nsz * 0.9, lift = (1 - nOn) * dy - nOff * dy;
    const o = { size: nsz, weight: 900, tracking: -0.04, color: paper };
    text(ctx, S, String(cur + 1), xL, yB + (1 - roll) * dy + lift, o);
    if (roll < 1) text(ctx, S, String(cur), xL, yB - roll * dy + lift, o);
    ctx.restore();
  }
  const lx = xL + nsz * 0.72;
  label(ctx, S, 'BRAND', lx, yB, { size: sz * 1.3, weight: 800, tracking: 0.1 }, lt, BEAT + 0.1, OUT + 0.04);
  // the plural arrives with the second brand
  const bw = measureLabel(ctx, 'BRAND', sz * 1.3, 800, 0.1);
  label(ctx, S, 'S', lx + bw + sz * 1.3 * 0.1, yB, { size: sz * 1.3, weight: 800, tracking: 0.1 }, lt, T_B - 0.02, OUT + 0.1);

  // what the work was
  const s1 = 'POSITIONING · GTM';
  if (P) {
    const yc = yB - nsz * 1.05;
    label(ctx, S, s1, xL, yc, { size: sz }, lt, T_B + BEAT / 2, 5.3);
    label(ctx, S, 'SOLE MARKETER —', xL, yc - sz * 1.75, { size: sz }, lt, T_D - 0.12, OUT - 0.06);
    label(ctx, S, 'CONCEPT TO LAUNCH TO DAILY OPS', xL, yc, { size: sz }, lt, T_D, OUT);
  } else {
    const s2 = 'SOLE MARKETER — CONCEPT TO LAUNCH TO DAILY OPS';
    label(ctx, S, s1, xR - measureLabel(ctx, s1, sz), yB, { size: sz }, lt, T_B + BEAT / 2, 5.3);
    label(ctx, S, s2, xR - measureLabel(ctx, s2, sz), yB, { size: sz }, lt, T_D, OUT);
  }
}
function measureLabel(ctx, str, sz, weight = 700, tracking = 0.16) { return layout(ctx, str, { size: sz, weight, tracking }).width; }

// ── the chapter ───────────────────────────────────────────────────────────
const scene = {
  id: 'brands',
  title: 'Brands',
  caption: 'Four brands, one marketer: OwnershipCoin, The Chill Gallery, Gacha and Ark.tg built as giant black letters in an orange city.',
  bg: BLOCK.signal,
  assets: [],
  models: [],
  still: 6.1,
  // the score already crashes on the downbeat and swells into the seam; these
  // are the four landings, the moves between them, and the fly-in
  sfx: [
    { at: BEAT, type: 'impact' },                      // OWNERSHIPCOIN punches out of the wall
    { at: 1.66, type: 'whoosh', gain: 0.6 },           // the whip onto the plaza
    { at: T_B, type: 'impact' },                       // THE CHILL GALLERY slams upright
    { at: T_C, type: 'impact' },                       // under the GACHA stack
    { at: 4.6, type: 'whoosh', gain: 0.6, len: 0.5 },  // out through the last floors
    { at: T_D, type: 'impact' },                       // ARK.TG lands face-on
    { at: 7.12, type: 'whoosh', gain: 0.8, len: 0.8 }  // the fly-in: into the dot
  ],
  draw(ctx, S) {
    const lt = S.lt;
    const next = nextColour(scene);
    const G = geometry(ctx, S);
    const pz = pose(lt, G);
    const C = makeCam(S, pz);

    // the ends: in on orange, out on ink once the dot has the whole frame
    if (lt < 0.08) return;
    const D = G.D;
    if (lt >= T_DRIVE) {
      const dot = dotWorld(G);
      const p = C.project(dot[0], dot[1], dot[2]);
      if (lt > T_INK || (p && D.dot.r * 0.94 * C.F / p.d >= Math.hypot(S.W, S.H) / 2 + Math.hypot(p.x - S.W / 2, p.y - S.H / 2))) {
        ctx.fillStyle = next; ctx.fillRect(0, 0, S.W, S.H);
        return;
      }
    }

    // fog: the frame starts as nothing but orange and the city develops out of it
    const open = outQuad(seg(lt, 0.08, 0.42));
    const fog = { near: lerp(0.5, 18, open), far: lerp(1.5, 75, open) };

    const items = [];
    if (lt < T_B + 0.05) wall(items, C, G, lt, fog);
    if (lt > T_WHIP && lt < T_C + 0.05) plaza(items, C, G, lt, fog);
    if (lt > T_TILT && lt < T_LEVELED) stack(items, C, G, { near: 4, far: 25 });
    if (lt > T_LEVEL + 0.1) ark(items, C, G, lt, { near: 200, far: 300 });

    ctx.save();
    ctx.font = FONT100; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    items.sort((p, q) => q.z - p.z);
    for (const g of items) paint(ctx, g);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    hud(ctx, S, lt);

    // the lens, on the hits only
    const fx = S.fx;
    const h1 = pulse(lt, BEAT, 0.35), h2 = pulse(lt, T_B, 0.45), h3 = pulse(lt, T_C, 0.4), h4 = pulse(lt, T_D, 0.5);
    fx.ab = 0.5 * h1 + 0.8 * h2 + 0.6 * h3 + 0.9 * h4 + 0.5 * pulse(lt, 1.6, 0.3);
    fx.shake = S.u * (0.5 * h1 + 0.9 * h2 + 0.6 * h3 + 1.1 * h4);
    const wv = (at, dur) => (lt > at && lt < at + dur ? (lt - at) / dur : 0);
    fx.warp = wv(T_B, 0.55) || wv(T_D, 0.6);
    fx.warpX = 0.5; fx.warpY = 0.5;
    fx.flash = 0.05 * pulse(lt, T_C, 0.16);
  }
};
export default scene;
