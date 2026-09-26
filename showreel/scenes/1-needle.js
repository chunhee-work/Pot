/* 1 — Needle (0–6 s). The reel's opening shot, and the frame it loops back to.

   The rest line is a gold thread. The camera leans in on it; a needle slides
   in along it, stabs down through it as if through cloth, loops underneath and
   comes back up, lifting the thread off the line into the C. As the camera
   pulls back it sews CHUN HEE in running stitches around the letters' own
   outlines (Archivo 900, baked in below so the needle can follow them stitch
   by stitch), then stabs back through the line beside the last E, on the bar.
   After the read the thread is pulled: the stitches cinch, the needle whips out
   to the right, the name stretches across the frame and snaps flat into the
   line — pure rest by 5.915, on the downbeat that opens chapter 2.

   Time map (local s; the intro's beats fall at 0.375 + k·0.625, bars at 1.0, 3.5, 6.0)
     0.00–0.08   rest
     0.08–0.98   the camera leans in on the line; a glint runs its length
     0.28–0.84   the needle slides in along the thread
     0.80–1.00   it lifts and takes aim; the stab lands on the bar at 1.00, the line twangs
     1.00–1.22   under the line, back up through it, the thread lifting off into the C
     1.22–3.20   C H U N H E E sewn — the first stitches slow and close up, then machine
                 speed while the camera pulls back (1.26–2.05)
     1.90–2.60   eyebrow SHOWREEL 2026 settles in above the name
     3.20–3.425  off the last E, the needle lifts and takes aim again
     3.425–3.50  the second stab, through the line on the bar (quiver, lens hit)
     3.50–4.10   "from needle & thread," drops from behind the line, word by word
     3.50–5.375  held: the camera leans in a touch; a sheen crosses the stitches 4.125–4.95
     4.95–5.375  tension: the copy leaves, stitches cinch and tremble, the needle draws back
     5.375–5.84  the pull (beat): the needle whips out right, the name stretches edge to
                 edge, then flattens into the line — snapping taut at 5.84
     5.84–5.915  the twang is damped out   ·   5.915–6.00 rest                          */
import {
  PAL, clamp, lerp, invlerp, smoothstep, noise1, TAU,
  outExpo, outCubic, inCubic, inOutCubic, inQuad, outQuad, inOutQuad, inQuart, siteE,
  thread, rest, needle, text, layout
} from '../kit.js';

/* Archivo 900 outlines of C H U N E, in font units (y up, 1000/em), flattened
   from assets/fonts/archivo-latin.woff2 at wght 900 — the same letters text()
   sets, here as paths so the needle can follow them stitch by stitch. */
const GLYPH = {
  C: [402,-12,379,-12,357,-10,335,-8,314,-6,294,-2,275,2,257,8,239,14,222,20,206,28,188,37,172,48,157,59,143,71,129,85,117,99,105,114,95,130,86,148,78,164,71,181,65,199,60,217,55,236,51,256,49,277,47,299,45,321,45,344,45,369,47,393,49,415,52,438,57,459,62,479,68,498,75,517,82,535,91,552,101,567,111,583,123,597,136,610,149,622,163,634,178,644,194,654,211,663,229,671,247,678,267,683,287,689,308,693,330,696,353,698,377,700,402,700,424,700,445,698,466,696,486,693,505,690,524,685,542,680,560,674,576,666,595,658,612,648,628,637,643,625,657,612,669,598,681,583,692,567,702,550,710,532,717,513,723,494,727,473,730,451,732,429,733,405,522,405,521,424,518,442,514,459,508,474,497,492,484,507,468,519,453,526,438,531,420,534,401,535,379,534,359,530,341,524,326,515,312,504,301,491,291,476,284,459,278,440,274,420,272,399,271,376,271,312,272,289,274,268,279,248,284,229,292,212,302,197,313,184,326,173,341,164,358,158,378,154,399,153,420,154,439,157,456,161,472,168,489,180,503,194,514,212,521,226,525,243,528,260,529,279,733,279,732,256,731,234,728,213,723,192,718,173,711,154,703,137,694,120,684,104,672,89,660,76,646,63,632,51,616,40,599,30,581,22,564,14,547,8,528,3,509,-2,489,-5,469,-8,447,-10,425,-12],
  H: [74,0,74,688,295,688,295,437,538,437,538,688,759,688,759,0,538,0,538,261,295,261,295,0],
  U: [417,-12,393,-12,371,-10,349,-8,327,-6,307,-2,287,2,268,8,250,14,232,20,214,29,196,39,180,49,165,61,151,74,138,87,126,102,115,118,105,134,97,152,90,170,84,190,80,210,77,231,75,254,74,277,74,688,295,688,295,280,296,259,300,239,306,221,314,204,325,189,338,176,354,166,372,159,393,154,416,153,439,154,460,159,478,166,494,176,508,189,518,204,527,221,533,239,537,259,538,280,538,688,759,688,759,277,758,254,756,231,753,210,749,190,743,170,736,152,728,134,718,118,708,102,696,87,683,74,669,61,654,49,638,39,620,29,602,20,584,14,566,8,547,2,527,-2,507,-6,486,-8,463,-10,441,-12],
  N: [74,0,74,688,262,688,476,441,486,429,500,412,510,399,520,386,530,374,544,356,554,342,559,344,558,363,558,381,558,400,558,424,558,441,558,688,759,688,759,0,572,0,331,275,320,288,311,300,302,312,290,328,279,343,274,341,275,322,275,303,275,286,275,275,275,0],
  E: [77,0,77,688,672,688,672,523,298,523,298,428,618,428,618,270,298,270,298,165,679,165,679,0]
};

// ── timing ────────────────────────────────────────────────────────────────
const T = {
  glint: [0.08, 0.78],
  zoomIn: [0.08, 0.98], zoomOut: [1.26, 2.05],
  slide: [0.28, 0.84],
  brow: [1.9, 2.6],
  cock: [0.80, 0.95], stab: [0.965, 1.0],
  leadIn: [1.0, 1.22],
  sew: [1.22, 3.2],
  leadOut: [3.2, 3.38, 3.425, 3.5, 3.535],   // lifts off the E and aims · holds · stabs · pierces the line (bar) · stops dead
  tag: [3.50, 4.10],
  sheen: [4.125, 4.95],
  drift: [3.5],
  tension: 4.95, pull: 5.375, snap: 5.84,
  tagOut: [5.1, 5.38], browOut: [5.0, 5.32],
  fade: [5.855, 5.91],
  end: 5.915
};
const ZMAX = 1.9;

// ── polyline paths: flat [x,y,…] with cumulative arc length ─────────────────
function mkPath(xy) {
  const n = xy.length / 2, c = new Float32Array(n);
  for (let i = 1; i < n; i++) c[i] = c[i - 1] + Math.hypot(xy[2 * i] - xy[2 * i - 2], xy[2 * i + 1] - xy[2 * i - 1]);
  return { xy, n, c, L: c[n - 1] };
}
function seek(p, s) {
  if (s <= 0) return 0;
  if (s >= p.L) return p.n - 2;
  let lo = 0, hi = p.n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p.c[m] <= s) lo = m; else hi = m; }
  return lo;
}
function ptAt(p, s, o = {}) {
  s = clamp(s, 0, p.L);
  const i = seek(p, s), l = p.c[i + 1] - p.c[i], k = l > 0 ? (s - p.c[i]) / l : 0;
  o.x = p.xy[2 * i] + (p.xy[2 * i + 2] - p.xy[2 * i]) * k;
  o.y = p.xy[2 * i + 1] + (p.xy[2 * i + 3] - p.xy[2 * i + 1]) * k;
  return o;
}
/** Catmull-Rom through control points, sampled to a polyline */
function spline(ctrl, per = 12) {
  const out = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[i - 1] || ctrl[i], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[i + 2] || p2;
    for (let q = 0; q < per; q++) {
      const t = q / per, t2 = t * t, t3 = t2 * t;
      for (let d = 0; d < 2; d++) {
        out.push(0.5 * (2 * p1[d] + (p2[d] - p0[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t3));
      }
    }
  }
  const e = ctrl[ctrl.length - 1]; out.push(e[0], e[1]);
  return mkPath(out);
}
function nearestS(p, x, y) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < p.n; i++) { const d = Math.hypot(p.xy[2 * i] - x, p.xy[2 * i + 1] - y); if (d < bd) { bd = d; best = p.c[i]; } }
  return best;
}

/* A mapping takes the sewn name to where the pull has got it:
   X = x·ax + bx,  Y = cy + (y − cy)·ky + by + dw·(the line's twang at X) */
let _defl = null;
function deflAt(x) {
  const d = _defl;
  if (!d) return 0;
  const f = clamp((x - d.x0) / (d.x1 - d.x0)) * (LN - 1), i = Math.min(LN - 2, Math.floor(f));
  return lerp(d.y[i], d.y[i + 1], f - i);
}
function mapPt(f, x, y, o) {
  o.x = x * f.ax + f.bx;
  o.y = f.cy + (y - f.cy) * f.ky + f.by + (f.dw ? f.dw * deflAt(o.x) : 0);
  return o;
}
const _m = {};
/** add the stretch [a, b] of path p to the current path, through mapping f */
function subPath(ctx, p, a, b, f) {
  const xy = p.xy, c = p.c;
  let i = seek(p, a), l = c[i + 1] - c[i], k = l > 0 ? (a - c[i]) / l : 0;
  mapPt(f, xy[2 * i] + (xy[2 * i + 2] - xy[2 * i]) * k, xy[2 * i + 1] + (xy[2 * i + 3] - xy[2 * i + 1]) * k, _m);
  ctx.moveTo(_m.x, _m.y);
  const j = seek(p, b);
  for (let q = i + 1; q <= j; q++) { mapPt(f, xy[2 * q], xy[2 * q + 1], _m); ctx.lineTo(_m.x, _m.y); }
  l = c[j + 1] - c[j]; k = l > 0 ? (b - c[j]) / l : 0;
  mapPt(f, xy[2 * j] + (xy[2 * j + 2] - xy[2 * j]) * k, xy[2 * j + 1] + (xy[2 * j + 3] - xy[2 * j + 1]) * k, _m);
  ctx.lineTo(_m.x, _m.y);
}

// ── the sewing speed: a few deliberate stitches, then machine speed ────────
const SEWN = 400;
const SEWQ = (() => {
  const q = new Float32Array(SEWN + 1);
  let acc = 0;
  for (let i = 1; i <= SEWN; i++) {
    const t = (i - 0.5) / SEWN;
    acc += lerp(0.13, 1, smoothstep(0.03, 0.3, t)) * lerp(1, 0.55, smoothstep(0.86, 1, t));
    q[i] = acc;
  }
  for (let i = 0; i <= SEWN; i++) q[i] /= acc;
  return q;
})();
function sewQ(t) { t = clamp(t) * SEWN; const i = Math.floor(t); return i >= SEWN ? 1 : lerp(SEWQ[i], SEWQ[i + 1], t - i); }
function sewT(q) {           // inverse: the time a sewing fraction is reached
  let lo = 0, hi = SEWN;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (SEWQ[m] < q) lo = m; else hi = m; }
  return lerp(T.sew[0], T.sew[1], (lo + invlerp(SEWQ[lo], SEWQ[hi], q)) / SEWN);
}
const sewD = (G, t) => G.Dt * sewQ(invlerp(T.sew[0], T.sew[1], t));

// ── geometry, built once per frame size ───────────────────────────────────
let GEO = null;
function geometry(ctx, S) {
  const key = S.W + 'x' + S.H + '@' + S.lw;   // the stitches are sized from the thread's width, which follows dpr
  if (GEO && GEO.key === key) return GEO;
  const { W, H, u } = S, cy = H / 2, P = S.portrait;
  // landscape: the name stands on the thread; phone: the thread runs between CHUN and HEE
  const strs = P ? ['CHUN', 'HEE'] : ['CHUN HEE'];
  // as large as the frame allows: the widest line fills at most 72% (84% on a phone) of the width
  const F0 = Math.round((P ? 25 : 21) * u), w0 = layout(ctx, strs[0], { size: F0, weight: 900, tracking: 0.02 }).width;
  const F = Math.min(F0, Math.round(F0 * (P ? 0.84 : 0.72) * W / w0)), k = F / 1000, capH = 688 * k, gap = 5.2 * u;
  const bases = P ? [cy - gap, cy + gap + capH] : [cy - gap];
  const rows = [], glyphs = [];
  strs.forEach((str, r) => {
    const L = layout(ctx, str, { size: F, weight: 900, tracking: 0.02 });
    const x0 = W / 2 - L.width / 2, base = bases[r];
    const row = { base, nL: Infinity, nR: -Infinity, top: base - capH };
    L.chars.forEach((ch, i) => {
      const src = GLYPH[ch];
      if (!src) return;
      const n = src.length / 2, raw = new Float32Array(n * 2);
      for (let j = 0; j < n; j++) {
        raw[2 * j] = x0 + L.xs[i] + src[2 * j] * k; raw[2 * j + 1] = base - src[2 * j + 1] * k;
        row.nL = Math.min(row.nL, raw[2 * j]); row.nR = Math.max(row.nR, raw[2 * j]);
      }
      glyphs.push({ ch, row: r, raw, n });
    });
    rows.push(row);
  });

  // stitches: a running stitch with a stitch centred on every corner
  const Pst = 1.5 * u, ratio = 0.6;
  glyphs.forEach((g, gi) => {
    const last = gi === glyphs.length - 1, below = rows[g.row].base > cy;
    const rule = gi === 0 ? (x, y) => x + 0.03 * Math.abs(y - (rows[g.row].base - 344 * k))   // the C's leftmost point
      : below ? (last ? (x, y) => -x + 2 * y : (x, y) => x + 2 * y)                           // under the line: from the top, nearest it
        : last ? (x, y) => -x - 2 * y                                                         // the last E's foot
          : (x, y) => x - 2 * y;                                                              // bottom-left corner
    g.p = contour(g.raw, g.n, rule);
    Object.assign(g, stitchesOf(g.p, Pst, ratio));
  });

  // the sewing order; the hops between letters are made under the cloth
  let D = 0;
  glyphs.forEach((g, gi) => {
    if (gi) {
      const pr = glyphs[gi - 1];
      g.jump = Math.hypot(g.p.xy[0] - pr.p.xy[0], g.p.xy[1] - pr.p.xy[1]);
      D += g.jump * 0.45;
    }
    g.D0 = D; D += g.p.L; g.D1 = D;
  });
  const Dt = D;
  glyphs.forEach(g => { g.tDone = sewT(g.D1 / Dt); });
  // a hop that passes from one side of the line to the other plucks it
  const crossings = [];
  glyphs.forEach((g, gi) => {
    if (!gi) return;
    const pr = glyphs[gi - 1], y0 = pr.p.xy[1], y1 = g.p.xy[1];
    if ((y0 - cy) * (y1 - cy) >= 0) return;
    const f = (cy - y0) / (y1 - y0);
    crossings.push({ t: sewT(lerp(pr.D1, g.D0, f) / Dt), x: lerp(pr.p.xy[0], g.p.xy[0], f), dir: Math.sign(y1 - y0) });
  });

  const r0 = rows[0], rl = rows[rows.length - 1];
  const NL = (P ? 12.5 : 12) * u;                // needle length
  // the dive, left of the name
  const C0 = { x: glyphs[0].p.xy[0], y: glyphs[0].p.xy[1] };
  const xu = r0.nL - 1.2 * u, xd = xu - 4.6 * u;
  const thD = 58 * Math.PI / 180, dD = [Math.cos(thD), Math.sin(thD)];
  const leadIn = spline([
    [xd, cy], [xd + dD[0] * 1.8 * u, cy + dD[1] * 1.8 * u],
    [(xd + xu) / 2 - 0.6 * u, cy + 3.1 * u], [(xd + xu) / 2 + 0.8 * u, cy + 3.1 * u],
    [xu - 0.3 * u, cy + 1.5 * u], [xu, cy],
    [lerp(xu, C0.x, 0.45) - (P ? 0.6 : 0.9) * u, lerp(cy, C0.y, 0.45)],
    [C0.x - 0.7 * u, C0.y + 2.4 * u], [C0.x, C0.y]
  ], 14);
  const sUp = nearestS(leadIn, xu, cy);
  // the exit, right of the last E: the thread runs on from its corner into the needle's eye.
  // side = 1 when the E stands above the line (the needle stabs down), -1 below it (stabs up)
  const gl = glyphs[glyphs.length - 1], E0 = { x: gl.p.xy[0], y: gl.p.xy[1] }, side = rl.base > cy ? -1 : 1;
  const xe = rl.nR + (P ? 8.6 : 8) * u, thE = side * 64 * Math.PI / 180, dE = [Math.cos(thE), Math.sin(thE)], depth = 4 * u;

  const topY = r0.top;
  GEO = {
    key, W, F, k, rows, glyphs, Dt, NL, cy, u,
    sw: Math.max(S.lw * 1.3, 0.34 * u),
    xd, xu, dD, thD, leadIn, sUp, focusX: (P ? 0.46 : 0.4) * W,
    xe, dE, thE, depth, E0, side, crossings,
    nL: Math.min(...rows.map(r => r.nL)), nR: Math.max(...rows.map(r => r.nR)), nTop: topY, nBot: rl.base,
    brow: { y: topY - (P ? 6.6 : 5.8) * u, size: (P ? 2.7 : 2.15) * u },
    // the copy hangs from the line — on a phone, from the foot of HEE
    tag: P ? { sill: rl.base + 0.7 * u, y: rl.base + 9.6 * u, size: 5.4 * u }
      : { sill: cy + S.lw * 1.6, y: cy + 9.2 * u, size: 4.4 * u }
  };
  // the lead-in carries the stab's speed in and hands the sewing its first, slow speed
  const dur = T.leadIn[1] - T.leadIn[0];
  GEO.m0 = Math.min(2 * 3.4 * u / (T.stab[1] - T.stab[0]) * dur, 2.2 * leadIn.L);
  GEO.m1 = Dt * sewQ(0.004) / (0.004 * (T.sew[1] - T.sew[0])) * dur;
  let lo = T.leadIn[0], hi = T.leadIn[1];
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (leadInS(GEO, m) < sUp) lo = m; else hi = m; }
  GEO.tUp = lo;
  return GEO;
}

/** a glyph's outline as a closed path: clockwise on screen, from the chosen start */
function contour(raw, n, rule) {
  let area = 0;
  for (let j = 0; j < n; j++) { const q = (j + 1) % n; area += raw[2 * j] * raw[2 * q + 1] - raw[2 * q] * raw[2 * j + 1]; }
  const idx = [...Array(n).keys()];
  if (area < 0) idx.reverse();
  let best = 0, bv = Infinity;
  idx.forEach((j, q) => { const v = rule(raw[2 * j], raw[2 * j + 1]); if (v < bv - 1e-6) { bv = v; best = q; } });
  const order = idx.slice(best).concat(idx.slice(0, best));
  const xy = new Float32Array((n + 1) * 2);
  order.forEach((j, q) => { xy[2 * q] = raw[2 * j]; xy[2 * q + 1] = raw[2 * j + 1]; });
  xy[2 * n] = xy[0]; xy[2 * n + 1] = xy[1];
  return mkPath(xy);
}

/** running stitches along a closed path: one centred on every corner and the
    rest spaced evenly between, so each straight run takes whole stitches */
function stitchesOf(p, P, ratio) {
  const n = p.n - 1, bounds = [0];
  for (let j = 1; j < n; j++) {
    const ax = p.xy[2 * j] - p.xy[2 * j - 2], ay = p.xy[2 * j + 1] - p.xy[2 * j - 1];
    const bx = p.xy[2 * j + 2] - p.xy[2 * j], by = p.xy[2 * j + 3] - p.xy[2 * j + 1];
    if (Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by)) > 0.6) bounds.push(p.c[j]);
  }
  bounds.push(p.L);
  const cen = [];
  for (let r = 0; r < bounds.length - 1; r++) {
    const len = bounds[r + 1] - bounds[r], m = Math.max(1, Math.round(len / P)), per = len / m;
    for (let q = 0; q < m; q++) cen.push([bounds[r] + q * per, per]);
  }
  const list = [];
  for (let q = 0; q < cen.length; q++) {
    const m = cen[q][0], pr = cen[q][1], pl = cen[(q - 1 + cen.length) % cen.length][1];
    const a = m - ratio * pl / 2, b = m + ratio * pr / 2;
    if (a < 0) { list.push([0, b]); list.push([p.L + a, p.L]); } else list.push([a, b]);
  }
  list.sort((x, y) => x[0] - y[0]);
  return { sa: Float32Array.from(list, s => s[0]), sb: Float32Array.from(list, s => s[1]) };
}

// ── the camera: leans in on the thread for the stab, pulls back to sew ─────
/* world x = fx lands on screen x = sx, scaled by z about the line; so the line itself never moves */
function cam(G, t, o) {
  if (t < T.drift[0]) {
    const a = inOutQuad(invlerp(T.zoomIn[0], T.zoomIn[1], t)) * (1 - inOutCubic(invlerp(T.zoomOut[0], T.zoomOut[1], t)));
    o.z = 1 + (ZMAX - 1) * a; o.fx = G.xd; o.sx = lerp(G.xd, G.focusX, a);
  } else {                     // a slow lean in while it holds, yanked back by the pull
    const a = inOutQuad(invlerp(T.drift[0], T.pull, t)) * (1 - outCubic(invlerp(T.pull, T.pull + 0.2, t)));
    o.z = 1 + 0.035 * a; o.fx = o.sx = G.W / 2;
  }
  return o;
}

// ── the needle's path through the chapter ──────────────────────────────────
const _a = {}, _c = {}, _pm = {};
/** where the needle is at time t (world coords): tip (x, y), angle a, length, alpha */
function pose(G, t, o) {
  const { u, cy, NL } = G;
  o.al = 1; o.len = NL; o.hide = false;
  if (t < T.slide[0]) { o.al = 0; o.hide = true; o.x = -NL; o.y = cy; o.a = 0; return o; }
  const xp = G.xd - 2.9 * u;
  const P0x = G.xd - G.dD[0] * 3.4 * u, P0y = cy - G.dD[1] * 3.4 * u;
  if (t < T.cock[0]) {                                          // slides in along the thread
    cam(G, T.slide[0], _c);
    const x0 = _c.fx + (-1.5 * u - _c.sx) / _c.z;                // just off the left edge of the frame
    o.x = lerp(x0, xp, outExpo(invlerp(T.slide[0], T.slide[1], t))); o.y = cy; o.a = 0; return o;
  }
  if (t < T.stab[0]) {                                          // wind-up: lifts and takes aim
    const e = siteE(invlerp(T.cock[0], T.cock[1], t));
    o.x = lerp(xp, P0x, e); o.y = lerp(cy, P0y, e); o.a = lerp(0, G.thD, e); return o;
  }
  if (t < T.leadIn[0]) {                                        // the stab
    const e = inQuad(invlerp(T.stab[0], T.stab[1], t));
    o.x = lerp(P0x, G.xd, e); o.y = lerp(P0y, cy, e); o.a = G.thD; return o;
  }
  if (t < T.sew[0]) {                                           // under, up through, into the C
    const s = leadInS(G, t);
    ptAt(G.leadIn, s, o);
    const back = s - NL * 0.93;
    if (back >= 0) ptAt(G.leadIn, back, _a); else { _a.x = G.xd + G.dD[0] * back; _a.y = cy + G.dD[1] * back; }
    o.a = Math.atan2(o.y - _a.y, o.x - _a.x); return o;
  }
  if (t < T.leadOut[0]) {                                       // sewing
    const D = sewD(G, t);
    let gi = 0;
    while (gi < G.glyphs.length - 1 && D >= G.glyphs[gi].D1) gi++;
    const g = G.glyphs[gi];
    if (D < g.D0) {                                             // hopping to the next letter, under the cloth
      const pr = G.glyphs[gi - 1], f = invlerp(pr.D1, g.D0, D);
      o.x = lerp(pr.p.xy[0], g.p.xy[0], f); o.y = lerp(pr.p.xy[1], g.p.xy[1], f);
      o.a = Math.atan2(g.p.xy[1] - pr.p.xy[1], g.p.xy[0] - pr.p.xy[0]); o.al = 0; o.hide = true; return o;
    }
    const s = Math.min(D - g.D0, g.p.L);
    ptAt(g.p, s, o);
    const back = s - NL * 0.93;
    if (back >= 0) ptAt(g.p, back, _a);
    else if (gi === 0) ptAt(G.leadIn, G.leadIn.L + back, _a);
    else {
      const pr = G.glyphs[gi - 1], f = Math.min(1, -back / Math.max(1, g.jump));
      _a.x = lerp(g.p.xy[0], pr.p.xy[0], f); _a.y = lerp(g.p.xy[1], pr.p.xy[1], f);
    }
    o.a = Math.atan2(o.y - _a.y, o.x - _a.x);
    // the first stitches go in slowly enough to see the needle dip at each hole
    const slow = 1 - smoothstep(T.sew[0] + 0.15, T.sew[0] + 0.4, t);
    if (slow > 0) {
      const q = stitchIndex(g, s);
      if (q >= 0 && s > g.sb[q] && q + 1 < g.sa.length) {
        const dip = Math.sin(Math.PI * invlerp(g.sb[q], g.sa[q + 1], s));
        o.len = NL * (1 - 0.22 * dip * slow);
      }
    }
    return o;
  }
  const [lo0, loAim, loStab, lop, lo1] = T.leadOut;
  if (t < lo1) {
    const upX = G.xe - G.dE[0] * 5.5 * u, upY = cy - G.dE[1] * 5.5 * u;
    if (t < loStab) {                                           // off the E: lifts and takes aim
      if (G.aEnd === undefined) G.aEnd = pose(G, lo0 - 1e-4, {}).a;
      const e = siteE(invlerp(lo0, loAim, t));
      let da = G.thE - G.aEnd;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      o.x = lerp(G.E0.x, upX, e); o.y = lerp(G.E0.y, upY, e) - G.side * Math.sin(Math.PI * e) * 2 * u;
      o.a = G.aEnd + da * e; return o;
    }
    o.a = G.thE;                                                // the stab, then it stops dead
    const d = t < lop ? lerp(-5.5 * u, 0, inQuad(invlerp(loStab, lop, t))) : lerp(0, G.depth, outQuad(invlerp(lop, lo1, t)));
    o.x = G.xe + G.dE[0] * d; o.y = cy + G.dE[1] * d; return o;
  }
  // stuck through the line: it quivers from the blow, then draws back and whips out
  let a = G.thE, x = G.xe + G.dE[0] * G.depth, y = cy + G.dE[1] * G.depth;
  const qv = t - lo1;
  const quiver = 0.12 * Math.exp(-5.5 * qv) * Math.sin(TAU * 5.2 * qv);
  if (Math.abs(quiver) > 1e-5) {
    const c = Math.cos(quiver), sn = Math.sin(quiver), dx = x - G.xe, dy = y - cy;
    x = G.xe + dx * c - dy * sn; y = cy + dx * sn + dy * c; a += quiver;
  }
  const back = 3.2 * u * inOutCubic(invlerp(T.tension + 0.1, T.pull, t));
  x -= G.dE[0] * back; y -= G.dE[1] * back;
  if (t >= T.pull) {
    const w = invlerp(T.pull, T.pull + 0.24, t);
    const r = outCubic(Math.min(1, w * 1.8));
    a = lerp(G.thE, -0.02, r);
    y = lerp(y, cy - 0.25 * u, r);
    x = lerp(x, G.W + NL * 1.4, inQuart(w));
    // it leads the thread: never behind the last E's corner as the name stretches after it
    const m = mapping(G, G.glyphs.length - 1, t, _pm);
    x = Math.max(x, G.E0.x * m.ax + m.bx + NL * 0.93 * Math.cos(a) + 1.5 * u);
    if (w >= 1) { o.al = 0; o.hide = true; }
  }
  o.x = x; o.y = y; o.a = a; return o;
}
function leadInS(G, t) {          // cubic Hermite: leaves at the stab's speed, arrives at the sewing's
  const x = invlerp(T.leadIn[0], T.leadIn[1], t), x2 = x * x, x3 = x2 * x, L = G.leadIn.L;
  return clamp((x3 - 2 * x2 + x) * G.m0 + (3 * x2 - 2 * x3) * L + (x3 - x2) * G.m1, 0, L);
}
function stitchIndex(g, s) {
  let lo = 0, hi = g.sa.length - 1;
  if (s < g.sa[0]) return -1;
  while (hi > lo) { const m = (lo + hi + 1) >> 1; if (g.sa[m] <= s) lo = m; else hi = m - 1; }
  return lo;
}

/** the needle, split where it passes through the line: the part that has gone
    through is on the far side of the cloth (below for a stab down, above for one up) */
function drawNeedle(ctx, S, G, o, alpha, farSide) {
  const al = o.al * alpha;
  if (al <= 0.004) return;
  const ey = o.y - Math.sin(o.a) * o.len * 0.93, m = 0.6 * G.u;
  const far = y => (farSide > 0 ? y > G.cy + m : y < G.cy - m);
  if (!far(o.y) && !far(ey)) { needle(ctx, S, o.x, o.y, o.a, o.len, { alpha: al }); return; }
  const band = (y0, h, a) => {
    ctx.save(); ctx.beginPath(); ctx.rect(-S.W, y0, 3 * S.W, h); ctx.clip();
    needle(ctx, S, o.x, o.y, o.a, o.len, { alpha: a }); ctx.restore();
  };
  band(-S.H, S.H + G.cy, farSide > 0 ? al : al * 0.4);
  band(G.cy, 2 * S.H, farSide > 0 ? al * 0.4 : al);
}

// ── the line: taut, and twanging where the needle goes through it ─────────
const LN = 120;
const _ly = new Float32Array(LN);
function modal(xf, p, A, tau, f1, damp) {
  let y = 0;
  const d = Math.PI * Math.PI * p * (1 - p);
  for (let n = 1; n <= 4; n++) {
    const an = 2 * A * Math.sin(n * Math.PI * p) / (n * n * d);
    y += an * Math.sin(n * Math.PI * xf) * Math.cos(TAU * f1 * n * tau) * Math.exp(-damp * n * n * tau);
  }
  return y;
}
/** fills _ly across the visible stretch [x0, x1] of the string (world x); returns the largest deflection */
function lineShape(S, G, t, x0, x1) {
  const { W, u } = S, s0 = -0.02 * W, s1 = 1.02 * W;
  const pf = x => clamp((x - s0) / (s1 - s0), 0.02, 0.98);
  const plucks = [
    [1.0, pf(G.xd), 0.85 * u, 0.025, 7, 6],
    [G.tUp, pf(G.xu), -0.55 * u, 0.02, 7, 6],
    [T.leadOut[3], pf(G.xe), 1.0 * u * G.side, 0.02, 7, 6],
    [T.snap, 0.5, 0.75 * u, 0.0, 9, 9],
    ...G.crossings.map(c => [c.t, pf(c.x), 0.5 * u * c.dir, 0.015, 7, 6])
  ];
  // the needle tugs the line back the way it came in as it draws back, and lets go on the pull
  const tugA = -0.9 * u * G.side, tug = tugA * inOutCubic(invlerp(T.tension + 0.1, T.pull, t));
  const env = 1 - smoothstep(T.fade[0], T.fade[1], t);
  let mxAbs = 0;
  for (let i = 0; i < LN; i++) {
    const xf = (lerp(x0, x1, i / (LN - 1)) - s0) / (s1 - s0);
    let y = 0;
    if (xf > 0 && xf < 1) {
      for (const [t0, p, A, pre, f1, dm] of plucks) {
        if (t < t0 - pre || (t < t0 && !pre)) continue;
        y += t < t0 ? modal(xf, p, A * smoothstep(t0 - pre, t0, t), 0, f1, dm) : modal(xf, p, A, t - t0, f1, dm);
      }
      if (t < T.pull) { if (tug) y += modal(xf, pf(G.xe), tug, 0, 7, 6); }
      else y += modal(xf, pf(G.xe), tugA, t - T.pull, 7.5, 7);
      y *= env;
    }
    _ly[i] = y; mxAbs = Math.max(mxAbs, Math.abs(y));
  }
  return mxAbs;
}

// ── the pull: the name stretches edge to edge and flattens into the line ──
function mapping(G, gi, t, out) {
  const g = G.glyphs[gi], row = G.rows[g.row], n = G.glyphs.length, u = G.u;
  const cinch = inOutCubic(invlerp(T.tension, T.pull, t));
  const st = (n - 1 - gi) * 0.012;                           // the pull reaches the far letters last
  const tx = invlerp(T.pull + st, T.pull + st + 0.24, t);
  const ty = invlerp(T.pull + 0.02 + st, T.snap, t);
  const kx = outCubic(tx);
  const ky = (1 - inCubic(ty)) * (1 - 0.05 * cinch);
  const xL = -0.02 * G.W, xR = 1.02 * G.W, sr = (xR - xL) / (row.nR - row.nL);
  const A = 1 - kx + kx * sr, B = kx * (xL - row.nL * sr);
  const xc = (row.nL + row.nR) / 2, gth = 0.014 * cinch * (1 - tx);   // the cloth gathers in
  const trem = cinch * (1 - ty) * 0.16 * u;
  out.ax = (1 - gth) * A; out.bx = xc * gth * A + B + noise1(t * 41, gi * 3.7 + 1) * trem;
  out.ky = ky; out.cy = G.cy;
  out.by = noise1(t * 37, gi * 5.1 + 2) * trem;
  out.dw = smoothstep(0.85, 1, ty);
  out.close = smoothstep(0.25, 0.8, tx);
  out.shrink = 0.22 * cinch * (1 - out.close);
  out.flat = ty;
  return out;
}

// ── stitches ───────────────────────────────────────────────────────────────
function stitchPath(ctx, g, upto, f, hl) {
  const { sa, sb, p } = g, N = sa.length;
  for (let q = 0; q < N; q++) {
    let a = sa[q];
    if (a >= upto) break;
    let b = sb[q];
    if (f.close > 0) b += ((q + 1 < N ? sa[q + 1] : p.L) - b) * f.close;
    if (f.shrink > 0) { const m = (a + b) / 2, h = (b - a) / 2 * (1 - f.shrink); a = m - h; b = m + h; }
    if (hl > 0) { const d = b - a; a += d * 0.2 * hl; b -= d * 0.3 * hl; }
    b = Math.min(b, upto);
    if (b > a) subPath(ctx, p, a, b, f);
  }
}
function sheenStyles(ctx, G, t) {
  const e = inOutCubic(invlerp(T.sheen[0], T.sheen[1], t));
  if (e <= 0 || e >= 1) return null;
  const u = G.u, bw = 10 * u, dx = 0.94, dy = 0.34;
  const xs = lerp(G.nL - 14 * u, G.nR + 14 * u, e), ys = (G.nTop + Math.max(G.cy, G.nBot)) / 2;
  const mk = (c0, c1) => {
    const gr = ctx.createLinearGradient(xs - bw * dx, ys - bw * dy, xs + bw * dx, ys + bw * dy);
    gr.addColorStop(0, c0); gr.addColorStop(0.5, c1); gr.addColorStop(1, c0);
    return gr;
  };
  return { base: mk(PAL.gold, '#fff0c8'), hi: mk(PAL.goldHi, '#ffffff') };
}

// ── draw ───────────────────────────────────────────────────────────────────
const _o = {}, _g = {}, _f = {}, _cam = {}, _f0 = {}, _fl = {};
const TAG = ['from', 'needle', '&', 'thread,'];
export default {
  id: 'needle',
  title: 'Needle',
  caption: 'A needle stabs through the gold thread and sews the name Chun Hee in running stitches: from needle & thread,',
  assets: [],
  models: [],
  still: 4.45,
  draw(ctx, S) {
    const t = S.lt;
    if (t <= T.glint[0] || t >= T.end) { rest(ctx, S); return; }
    const G = geometry(ctx, S);
    const { W, H, u } = S, cy = G.cy;
    const C = cam(G, t, _cam), z = C.z;
    const nG = G.glyphs.length;
    const fade = 1 - smoothstep(T.fade[0], T.fade[1], t);
    const f0 = mapping(G, 0, t, _f0), fl = mapping(G, nG - 1, t, _fl);

    // ── world: everything the camera sees ──
    ctx.save();
    if (z > 1.0001) { ctx.translate(C.sx, cy); ctx.scale(z, z); ctx.translate(-C.fx, -cy); }
    const wx0 = C.fx + (-0.02 * W - C.sx) / z, wx1 = C.fx + (1.02 * W - C.sx) / z;

    // the line
    const dm = lineShape(S, G, t, wx0, wx1);
    _defl = { x0: wx0, x1: wx1, y: _ly };
    if (dm < 0.05 && z <= 1.0001) rest(ctx, S);
    else {
      const pts = [];
      for (let i = 0; i < LN; i++) pts.push([lerp(wx0, wx1, i / (LN - 1)), cy + _ly[i]]);
      thread(ctx, S, pts, { sharp: true });
    }

    // the thread lifted off the line into the C (the loop under the line is on the far side of the cloth)
    if (t >= T.leadIn[0]) {
      const li = G.leadIn;
      const s1 = t < T.sew[0] ? Math.max(0, leadInS(G, t) - G.NL * 0.93)
        : lerp(li.L - G.NL * 0.93, li.L, smoothstep(T.sew[0], T.sew[0] + 0.12, t));
      if (s1 > 0.1) {
        const w = lerp(S.lw * 1.1, S.lw, f0.close);
        const build = c => { c.beginPath(); subPath(c, li, 0, s1, f0); };
        ctx.save(); ctx.beginPath(); ctx.rect(-W, -H, 3 * W, H + cy); ctx.clip();
        thread(ctx, S, build, { width: w, alpha: fade, glow: 0.8 }); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(-W, cy, 3 * W, 2 * H); ctx.clip();
        thread(ctx, S, build, { width: w, alpha: fade * 0.42, glow: 0.4 }); ctx.restore();
      }
    }

    // the stitched name
    if (t >= T.sew[0]) {
      const D = sewD(G, t);
      const sheen = sheenStyles(ctx, G, t);
      const trail = 9 * u;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let gi = 0; gi < nG; gi++) {
        const g = G.glyphs[gi];
        const upto = D - g.D0;
        if (upto <= 0) break;
        const f = mapping(G, gi, t, _f);
        const sw = lerp(G.sw, S.lw, f.close);
        // the felt the letter is stitched onto
        const felt = smoothstep(g.tDone, g.tDone + 0.4, t) * (1 - smoothstep(0, 0.6, f.flat));
        if (felt > 0) {
          ctx.beginPath(); subPath(ctx, g.p, 0, g.p.L, f); ctx.closePath();
          ctx.globalAlpha = felt * fade; ctx.fillStyle = 'rgba(216,178,106,0.075)'; ctx.fill();
        }
        // body: a soft glow and the thread itself
        ctx.globalAlpha = fade;
        ctx.beginPath(); stitchPath(ctx, g, upto, f, 0);
        ctx.strokeStyle = `rgba(216,178,106,${0.09 * (1 - f.close)})`; ctx.lineWidth = sw * 4.5; ctx.stroke();
        ctx.strokeStyle = sheen ? sheen.base : PAL.gold; ctx.lineWidth = sw; ctx.stroke();
        // each stitch catches the light along its top
        const off = 1 - f.close;
        const fh = { ax: f.ax, bx: f.bx - 0.1 * sw * off, ky: f.ky, cy: f.cy, by: f.by - 0.15 * sw * off, dw: f.dw };
        ctx.beginPath(); stitchPath(ctx, g, upto, fh, off);
        ctx.strokeStyle = sheen ? sheen.hi : PAL.goldHi; ctx.globalAlpha = fade * 0.85;
        ctx.lineWidth = lerp(sw * 0.36, S.lw * 0.38, f.close); ctx.stroke();
        // stitches still warm from the needle
        if (upto < g.p.L + trail && t < T.leadOut[3]) {
          const hot = Math.max(0, upto - trail);
          ctx.beginPath();
          const { sa, sb } = g;
          for (let q = 0; q < sa.length; q++) {
            if (sa[q] >= upto) break;
            const a = Math.max(sa[q], hot), b = Math.min(sb[q], upto);
            if (b > a) subPath(ctx, g.p, a, b, f);
          }
          ctx.strokeStyle = '#fff6dc'; ctx.globalAlpha = 0.55; ctx.lineWidth = sw * 0.75; ctx.stroke();
        }
      }
      ctx.restore();
    }

    // the thread from the last E into the needle's eye
    const o = pose(G, t, _o);
    if (t >= T.leadOut[0]) {
      const eX = o.al > 0 ? o.x - Math.cos(o.a) * o.len * 0.93 : 1.1 * W;
      const eY = o.al > 0 ? o.y - Math.sin(o.a) * o.len * 0.93 : cy;
      mapPt(fl, G.E0.x, G.E0.y, _m);
      const sx = _m.x, sy = _m.y, sag = 0.5 * u * (1 - fl.close);
      const build = c => {
        c.beginPath(); c.moveTo(sx, sy);
        c.quadraticCurveTo((sx + eX) / 2, (sy + eY) / 2 + sag, eX, eY);
      };
      thread(ctx, S, build, { width: lerp(S.lw * 1.1, S.lw, fl.close), alpha: fade, glow: 0.8 });
    }

    // the needle, smeared when it moves fast
    const far = t < T.sew[0] ? 1 : G.side;
    if (!o.hide) {
      const dt = 1 / 60, p1 = pose(G, t - dt, _g);
      if (!p1.hide && Math.hypot(o.x - p1.x, o.y - p1.y) > 1.2 * u) {
        for (let kk = 3; kk >= 1; kk--) {
          const gp = pose(G, t - dt * kk / 3.2, _g);
          if (!gp.hide) drawNeedle(ctx, S, G, gp, [0, 0.34, 0.2, 0.1][kk], far);
        }
      }
      drawNeedle(ctx, S, G, o, 1, far);
    }
    ctx.restore();

    // ── screen: the glint, and the copy ──
    const gw = invlerp(T.glint[0], T.glint[1], t);
    if (gw > 0 && gw < 1) {
      const xg = lerp(-0.1 * W, 1.1 * W, inOutCubic(gw)), a = Math.sin(Math.PI * gw), gl = 11 * u;
      const gr = ctx.createLinearGradient(xg - gl, 0, xg + gl, 0);
      gr.addColorStop(0, 'rgba(255,247,222,0)'); gr.addColorStop(0.5, 'rgba(255,247,222,1)'); gr.addColorStop(1, 'rgba(255,247,222,0)');
      ctx.save(); ctx.strokeStyle = gr; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(xg - gl, cy); ctx.lineTo(xg + gl, cy);
      ctx.globalAlpha = 0.22 * a; ctx.lineWidth = S.lw * z * 6; ctx.stroke();
      ctx.globalAlpha = 0.95 * a; ctx.lineWidth = S.lw * z * 1.15; ctx.stroke();
      ctx.restore();
    }

    // SHOWREEL 2026
    const bIn = invlerp(T.brow[0], T.brow[1], t), bOut = invlerp(T.browOut[0], T.browOut[1], t);
    if (bIn > 0 && bOut < 1) {
      const e = outCubic(bIn), x = inOutCubic(bOut);
      text(ctx, S, 'SHOWREEL 2026', W / 2, G.brow.y - 0.6 * u * x, {
        size: G.brow.size, weight: 600, tracking: lerp(0.62, 0.36, e) - 0.08 * x, align: 'center',
        color: PAL.dim, alpha: e * (1 - x)
      });
    }

    // from needle & thread, — hangs from the line, a word at a time
    if (t > T.tag[0] && t < T.tagOut[1]) {
      const o2 = { size: G.tag.size, weight: 400 };
      const L = layout(ctx, TAG.join(' '), o2);
      const x0 = W / 2 - L.width / 2, drop = G.tag.y - G.tag.sill + G.tag.size * 0.35;
      ctx.save(); ctx.beginPath(); ctx.rect(0, G.tag.sill, W, H); ctx.clip();
      let ci = 0;
      TAG.forEach((w, i) => {
        const pin = outExpo(invlerp(T.tag[0] + i * 0.06, T.tag[0] + i * 0.06 + 0.5, t));
        const o0 = T.tagOut[0] + (TAG.length - 1 - i) * 0.05;      // back up behind the line, last word first
        const pout = inCubic(invlerp(o0, o0 + (T.tagOut[1] - T.tagOut[0]) - 0.15, t));
        const p = pin * (1 - pout);
        if (p > 0.001) {
          text(ctx, S, w, x0 + L.xs[ci], G.tag.y - (1 - p) * drop, {
            ...o2, color: w === '&' ? PAL.gold : PAL.ink, alpha: Math.min(1, p * 1.6)
          });
        }
        ci += w.length + 1;
      });
      ctx.restore();
    }

    // the lens: a small knock on the stab, a proper one when the name is finished
    const fx = S.fx;
    if (t >= 1.0 && t < 1.2) fx.ab = 0.14 * (1 - outCubic(invlerp(1.0, 1.2, t)));
    const lp = T.leadOut[3];
    if (t >= lp && t < lp + 0.5) {
      const k = invlerp(lp, lp + 0.5, t);
      fx.ab = 0.3 * Math.pow(1 - k, 3);
      fx.shake = 0.3 * u * Math.pow(Math.max(0, 1 - k * 2.4), 2);
      fx.warp = lerp(0.55, 1, outQuad(k)); fx.warpX = G.xe / W; fx.warpY = 0.5;
    }
    if (t >= T.pull && t < T.pull + 0.25) fx.ab = 0.16 * (1 - outCubic(invlerp(T.pull, T.pull + 0.25, t)));
    if (t >= T.snap && t < T.snap + 0.06) {
      const k = invlerp(T.snap, T.snap + 0.06, t);
      fx.ab = 0.12 * (1 - k);
      fx.shake = 0.14 * u * Math.pow(1 - k, 2);
    }
  }
};
