/* 5 — Films: the editor's chapter, a fashion-magazine spread in motion.

   Four spreads, one a bar, each a sheet of paper with a giant word die-cut
   out of it — CUT. EDIT. GRADE. and the credit line. The films hang on a
   print a long way behind each sheet, so they are seen through the stems and
   bowls of the letters and slide against them as the camera moves (the phone
   stacks the letters into tall vertical masks). Inside a bar a cut lands on
   every beat: CUT cuts between the films, EDIT re-edits a four-clip timeline
   (one clip a letter, laid out over a runtime-true strip with a playhead),
   GRADE regrades one product spot. On the bar line the camera dives through
   a letter — the stem of the T, the I, the full stop — bursts out into the
   film behind it, and the next sheet is cut in on the downbeat. The last
   spread paints the O of ONE teal on its second beat, and the camera flies
   into the O's stroke until teal is all there is.

   Time map (local seconds; a beat is 0.469):
   0.00–0.08  paper
   0.08–0.47  CUT. rushes out of the paper haze, its letters still black leader
   0.47       CCATS 3:37 slams in · 0.94 OG10 ARE BACK 1:14 · 1.41 SKET 4:22
   1.41–1.78  dive into the stem of the T; through the sheet at 1.78
   1.875      EDIT. — four clips, one a letter; re-edits on 2.34 / 2.81 / 3.28
   3.28–3.65  dive into the I
   3.75       GRADE. — L'Occitane: natural; ink 4.22; signal 4.69; teal 5.16
   5.16–5.53  dive into the full stop
   5.625      STORY, VISUALS, EDIT, VO AND MUSIC: / ONE / PERSON. — the films
              through ONE PERSON.
   6.09       the O of ONE is painted teal
   6.56–7.40  fly into the O's stroke
   7.40–7.50  teal */
import { text as ktext, layout, cover, FONT, clamp, lerp, seg, outQuart, outCubic, inOutCubic, inCubic, inQuad } from '../../kit.js';
import { mix } from '../../space.js';
import { BLOCK, BEAT, BAR } from '../palette.js';
import { nextColour } from '../timeline.js';

const INK = BLOCK.ink, PAPER = BLOCK.paper;
const REF = 100, CAPR = 0.69;          // type is set at 100 px; an Archivo capital is 0.69 of that
const FONT900 = `900 ${REF}px ${FONT.sans}`;
const IN = 0.08, OUT = 7.4;            // pure paper before IN, pure teal after OUT
const GAP = 150;                       // how far behind its sheet a film print hangs
const D_FAR = 900, D_ARR = 260, D0 = 124, D1 = 106;   // camera distances to the sheet
const T_DIVE = 3 * BEAT, T_CROSS = BAR - 0.1, T_ARR = 0.36;          // bar-local: the dive, and the pass through the sheet
const T_FLY = 2 * BEAT, T_END = OUT - 3 * BAR, D_FLY = 112, D_LAST = 1.8;   // the last bar's fly-in
const FOG_NEAR = 180, FOG_FAR = 720;
const FPS = 24;

// ── the films ─────────────────────────────────────────────────────────────
// L / P: crop focus on a landscape / phone print; T: on a narrow EDIT tile
const FILMS = {
  ccats: { src: 'assets/ccats.jpg', n: '01', title: 'CCATS', rt: '3:37', sec: 217, L: [0.5, 0.28], P: [0.17, 0.4], T: [0.2, 0.4], TP: [0.3, 0.3] },
  og10: { src: 'assets/og10.jpg', n: '02', title: 'OG10 ARE BACK', rt: '1:14', sec: 74, L: [0.5, 0.62], P: [0.6, 0.5], T: [0.6, 0.5], TP: [0.5, 0.62] },
  sket: { src: 'assets/sket.jpg', n: '03', title: 'SKET', rt: '4:22', sec: 262, L: [0.5, 0.3], P: [0.2, 0.4], T: [0.24, 0.4], TP: [0.3, 0.3] },
  bounty: { src: 'assets/bounty-board.jpg', n: '04', title: 'BOUNTY BOARD', rt: '1:13', sec: 73, L: [0.5, 0.33], P: [0.5, 0.4], T: [0.5, 0.4], TP: [0.5, 0.35] },
  locc: { src: 'assets/w-loccitane.jpg', n: '05', title: 'L’OCCITANE', L: [0.5, 0.45], P: [0.5, 0.5] }
};
const CUT_SEQ = [null, 'ccats', 'og10', 'sket'];                 // beat 0 is black leader
const EDIT_SEQ = [['ccats', 'og10', 'sket', 'bounty'], ['sket', 'ccats', 'bounty', 'og10'],
  ['og10', 'bounty', 'ccats', 'sket'], ['bounty', 'sket', 'og10', 'ccats']];
const GRADE_SEQ = ['klein', 'signal', 'pink', 'teal'];
const LINE_SEQ = ['ccats', 'sket', 'og10', 'bounty'];
const CREDITS = ['ccats', 'og10', 'sket', 'bounty', 'locc'];

// the lens: [time, aberration, shake, warp]
const HITS = [
  [BEAT, 0.8, 5, 1], [2 * BEAT, 0.3, 0, 0], [3 * BEAT, 0.5, 2, 0],
  [BAR, 0.45, 3, 0], [BAR + BEAT, 0.25, 0, 0], [BAR + 2 * BEAT, 0.4, 1.5, 0], [BAR + 3 * BEAT, 0.25, 0, 0],
  [2 * BAR, 0.45, 3, 0], [2 * BAR + BEAT, 0.3, 0, 0], [2 * BAR + 2 * BEAT, 0.45, 1.5, 0], [2 * BAR + 3 * BEAT, 0.3, 0, 0],
  [3 * BAR, 0.65, 5, 1], [3 * BAR + BEAT, 0.4, 2.5, 0]
];

// ── helpers ───────────────────────────────────────────────────────────────
const INKM = new Map();
function inkOf(ctx, ch) {
  let m = INKM.get(ch);
  if (m) return m;
  ctx.save(); ctx.font = FONT900;
  const t = ctx.measureText(ch);
  ctx.restore();
  m = { l: -t.actualBoundingBoxLeft, r: t.actualBoundingBoxRight, w: t.width, a: t.actualBoundingBoxAscent };
  INKM.set(ch, m);
  return m;
}

/** kit type, in sheet units: (x, y) the baseline, cap the height of a capital */
function tx(ctx, S, str, x, y, cap, o = {}) {
  const s = cap / (REF * CAPR);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const r = ktext(ctx, S, str, 0, 0, { size: REF, weight: 800, ...o });
  ctx.restore();
  return r.width * s;
}

/** numerals in fixed cells, so a ticking timecode never jitters */
function cells(ctx, str, x, y, cap, o = {}) {
  const s = cap / (REF * CAPR), cw = (o.cell ?? 0.62) * REF, pw = (o.colon ?? 0.3) * REF;
  const chars = [...str];
  const w = chars.reduce((a, ch) => a + (ch === ':' ? pw : cw), 0);
  let cx = o.align === 'right' ? -w : o.align === 'center' ? -w / 2 : 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.font = `${o.weight ?? 600} ${REF}px ${FONT.sans}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = o.color;
  ctx.globalAlpha *= o.alpha ?? 1;
  for (const ch of chars) { const c = ch === ':' ? pw : cw; ctx.fillText(ch, cx + c / 2, 0); cx += c; }
  ctx.restore();
  return w * s;
}

/** the reel's own clock as SMPTE timecode, frame-accurate at 24 fps */
function timecode(t) {
  const f = Math.floor(t * FPS + 1e-6);
  const v = [Math.floor(f / (FPS * 3600)), Math.floor(f / (FPS * 60)) % 60, Math.floor(f / FPS) % 60, f % FPS];
  return v.map(n => String(n).padStart(2, '0')).join(':');
}

// ── graded prints, painted once per image and grade ───────────────────────
const GRADED = new Map();
function graded(img, g) {
  if (!img || !img.width || g === 'natural') return img;
  const key = img.src + '|' + g;
  let c = GRADED.get(key);
  if (c) return c;
  const w = img.width, h = img.height;
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'saturation'; x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);   // to grey
  const t = document.createElement('canvas'); t.width = w; t.height = h;
  t.getContext('2d').drawImage(c, 0, 0);
  x.globalCompositeOperation = 'overlay'; x.drawImage(t, 0, 0);                                 // punch the contrast
  t.getContext('2d').drawImage(c, 0, 0);
  // a duotone: black stays black, white becomes the colour block
  x.globalCompositeOperation = 'source-over'; x.fillStyle = BLOCK[g]; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'multiply'; x.drawImage(t, 0, 0);
  if (GRADED.size > 16) GRADED.clear();
  GRADED.set(key, c);
  return c;
}

// ── the offscreen sheet the words are die-cut from ────────────────────────
let SHEET = null, SHX = null;
function sheetCtx(S) {
  if (!SHEET || SHEET.width !== S.W || SHEET.height !== S.H) {
    SHEET = document.createElement('canvas'); SHEET.width = S.W; SHEET.height = S.H;
    SHX = SHEET.getContext('2d');
  }
  return SHX;
}

// ── layout, cached per frame size ─────────────────────────────────────────
function inline(ctx, str, x0, base, cap, tr = -0.02) {
  const L = layout(ctx, str, { size: REF, weight: 900, tracking: tr });
  const s = cap / (REF * CAPR), i0 = inkOf(ctx, L.chars[0]).l;
  return L.chars.map((ch, i) => {
    const m = inkOf(ctx, ch), x = x0 + (L.xs[i] - i0) * s;
    return { ch, x, y: base, s, x0: x + m.l * s, x1: x + m.r * s, y0: base - m.a * s, y1: base + s };
  });
}
function stacked(ctx, str, x0, top, cap, gap) {
  const s = cap / (REF * CAPR), gl = [];
  let row = 0;
  for (const ch of str) {
    const m = inkOf(ctx, ch);
    if (ch === '.') {
      const p = gl[gl.length - 1], x = p.x + (inkOf(ctx, p.ch).w - 2) * s;
      gl.push({ ch, x, y: p.y, s, x0: x + m.l * s, x1: x + m.r * s, y0: p.y - m.a * s, y1: p.y + s });
      continue;
    }
    const base = top + cap + row * (cap + gap); row++;
    const x = x0 - m.l * s;
    gl.push({ ch, x, y: base, s, x0, x1: x + m.r * s, y0: base - m.a * s, y1: base + s, row: row - 1, top: base - cap });
  }
  return gl;
}
function bbox(gl) {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const g of gl) { b.x0 = Math.min(b.x0, g.x0); b.x1 = Math.max(b.x1, g.x1); b.y0 = Math.min(b.y0, g.y0); b.y1 = Math.max(b.y1, g.y1); }
  return b;
}
// where the camera dives: a stem, the full stop, the O's left stroke (hw, hh: the half-size of the
// region that has to fill the frame before the sheet can be dropped)
const stemT = g => ({ x: (g.x0 + g.x1) / 2, y: g.y - 24 * g.s, hw: 10 * g.s, hh: 22 * g.s });
const stemI = g => ({ x: (g.x0 + g.x1) / 2, y: g.y - 34 * g.s, hw: 10 * g.s, hh: 32 * g.s });
const dot = g => ({ x: (g.x0 + g.x1) / 2, y: g.y - 10 * g.s, hw: 9 * g.s, hh: 9 * g.s });
const oStroke = g => ({ x: g.x0 + 11 * g.s, y: g.y - 34.5 * g.s, hw: 9 * g.s, hh: 14 * g.s });

let GEO = null;
function geo(ctx, S) {
  const key = S.W + 'x' + S.H + (document.fonts ? document.fonts.status : '');
  if (GEO && GEO.key === key) return GEO;
  const P = S.portrait;
  // the design frame (at a distance of 110) is 177.8 × 100 sheet units, or 100 × 216.7 on a phone;
  // a frame that cannot hold it gets a shorter lens, never a different layout
  const base = 1.1 * Math.min(S.W, S.H);
  const aw = 100 * S.W / Math.min(S.W, S.H), ah = 100 * S.H / Math.min(S.W, S.H);
  const fit = Math.min(1, aw / (P ? 100 : 177.8), ah / (P ? 216.7 : 100));
  const G = { key, P, F: base * fit, cx: S.W / 2, cy: S.H / 2 };
  G.hx = S.W / 2 / G.F; G.hy = S.H / 2 / G.F;          // frame half-extent per unit of distance
  G.sp = P ? spreadsP(ctx) : spreadsL(ctx);
  G.sp.forEach((sp, bar) => {
    sp.bb = bbox(sp.gl);
    const L = sp.gl.filter(g => g.ch !== '.');
    sp.colX = L.reduce((a, g) => a + (g.x0 + g.x1) / 2, 0) / L.length;
    const cr = Math.cos(sp.rollDive), sr = Math.abs(Math.sin(sp.rollDive));
    sp.cover = Math.min(sp.aim.hw / (G.hx * cr + G.hy * sr), sp.aim.hh / (G.hx * sr + G.hy * cr)) * 0.9;
    sp.print = printRect(G, sp, bar);
    if (sp.tiles) sp.tileEdges = tileEdges(sp, G);
  });
  GEO = G;
  return G;
}

/** the print behind a sheet: exactly what can be seen through the holes, all bar long */
function printRect(G, sp, bar) {
  const r = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }, b = sp.bb;
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * BAR;
    if (bar === 0 && t < IN) continue;
    if (bar === 3 && t > T_END) continue;
    const c = camAt(bar, t, sp), dp = c.d + GAP;
    if (dp <= 1) continue;
    const cr = Math.abs(Math.cos(c.roll)), sr = Math.abs(Math.sin(c.roll));
    const ex = (G.hx * cr + G.hy * sr) * dp, ey = (G.hx * sr + G.hy * cr) * dp;
    let x0 = c.x - ex, x1 = c.x + ex, y0 = c.y - ey, y1 = c.y + ey;
    if (c.d > 0.5) {
      const kf = dp / c.d;
      x0 = Math.max(x0, c.x + (b.x0 - c.x) * kf); x1 = Math.min(x1, c.x + (b.x1 - c.x) * kf);
      y0 = Math.max(y0, c.y + (b.y0 - c.y) * kf); y1 = Math.min(y1, c.y + (b.y1 - c.y) * kf);
    }
    if (x1 <= x0 || y1 <= y0) continue;
    r.x0 = Math.min(r.x0, x0); r.x1 = Math.max(r.x1, x1); r.y0 = Math.min(r.y0, y0); r.y1 = Math.max(r.y1, y1);
  }
  const m = 0.05 * Math.max(r.x1 - r.x0, r.y1 - r.y0);
  return { x: r.x0 - m, y: r.y0 - m, w: r.x1 - r.x0 + 2 * m, h: r.y1 - r.y0 + 2 * m };
}

/** EDIT: a clip behind each letter — the seams sit behind the gaps as seen from the hold */
function tileEdges(sp, G) {
  const kf = ((D0 + D1) / 2 + GAP) / ((D0 + D1) / 2), L = sp.gl.filter(g => g.ch !== '.');
  const e = [];
  for (let i = 0; i < L.length - 1; i++) e.push(G.P ? (L[i].y1 + L[i + 1].y0) / 2 * kf : (L[i].x1 + L[i + 1].x0) / 2 * kf);
  return e;
}

// the four spreads, landscape (sheet units: the design frame is ±88.9 × ±50)
function spreadsL(ctx) {
  const cut = inline(ctx, 'CUT.', 0, 31, 40); centre(cut);
  const edit = inline(ctx, 'EDIT.', 0, 10, 36); centre(edit);
  const grade = inline(ctx, 'GRADE.', 0, 10, 25); centre(grade);
  const one = inline(ctx, 'ONE', -74, 8, 27), person = inline(ctx, 'PERSON.', -74, 33, 20);
  return [
    { kind: 'cut', gl: cut, aim: stemT(cut[2]), drift: [-2, 1, 2, -1], roll0: 0, rollHold: -0.02, rollDive: 0.1 },
    { kind: 'edit', gl: edit, aim: stemI(edit[2]), drift: [0, 1.5, 0, -1.5], roll0: -0.1, rollHold: 0.02, rollDive: -0.12, tiles: true },
    { kind: 'grade', gl: grade, aim: dot(grade[5]), drift: [2, -1, -2, 0], roll0: 0.1, rollHold: -0.015, rollDive: 0.09 },
    { kind: 'line', gl: [...one, ...person], one, person, aim: oStroke(one[0]), drift: [1.5, 1, -1, 0], roll0: -0.08, rollHold: 0.015, rollDive: 0.13 }
  ];
}
function centre(gl) {
  const b = bbox(gl), dx = -(b.x0 + b.x1) / 2;
  for (const g of gl) { g.x += dx; g.x0 += dx; g.x1 += dx; }
}

// the four spreads, on a phone (the design frame is ±50 × ±108.3): the words stand up as vertical masks
function spreadsP(ctx) {
  const cut = stacked(ctx, 'CUT.', -43, -68, 44, 5);
  const edit = stacked(ctx, 'EDIT.', -43, -69, 32.5, 4.5);
  const grade = stacked(ctx, 'GRADE.', -43, -69, 25.5, 4);
  const one = inline(ctx, 'ONE', -43, 4, 25), person = inline(ctx, 'PERSON.', -43, 22, 12);
  return [
    { kind: 'cut', gl: cut, aim: stemT(cut[2]), drift: [1, -2, -1, 2], roll0: 0, rollHold: -0.02, rollDive: 0.1 },
    { kind: 'edit', gl: edit, aim: stemI(edit[2]), drift: [1.5, 0, -1.5, 0], roll0: -0.1, rollHold: 0.02, rollDive: -0.12, tiles: true },
    { kind: 'grade', gl: grade, aim: dot(grade[5]), drift: [-1, 2, 1, -1], roll0: 0.1, rollHold: -0.015, rollDive: 0.09 },
    { kind: 'line', gl: [...one, ...person], one, person, aim: oStroke(one[0]), drift: [1, 1, -1, 0], roll0: -0.08, rollHold: 0.015, rollDive: 0.13 }
  ];
}

// ── the camera ────────────────────────────────────────────────────────────
function camAt(bar, t, sp) {
  const last = bar === 3;
  const tA = last ? T_FLY : T_DIVE, dH = last ? D_FLY : D1;
  const h = clamp(t / tA);
  let d = lerp(D0, dH, h);
  if (bar === 0) d += (D_FAR - D0) * (1 - outQuart(seg(t, IN, BEAT + 0.03)));
  else d += (D_ARR - D0) * (1 - outQuart(clamp(t / T_ARR)));
  const [x0, y0, x1, y1] = sp.drift, e = inOutCubic(h);
  let x = lerp(x0, x1, e), y = lerp(y0, y1, e);
  let roll = sp.roll0 * (1 - outCubic(clamp(t / 0.5))) + sp.rollHold * h;
  if (t > tA) {
    const tB = last ? T_END : T_CROSS, p = clamp((t - tA) / (tB - tA));
    const q = inOutCubic(clamp(p / 0.72));
    x = lerp(x, sp.aim.x, q); y = lerp(y, sp.aim.y, q);
    roll += sp.rollDive * inQuad(p);
    if (last) d = dH * Math.exp(-Math.log(dH / D_LAST) * inCubic(p));
    else d = t <= tB ? dH * (1 - p * p * p) : -3 * dH / (tB - tA) * (t - tB);
  }
  return { x, y, d, roll };
}

/** the transform that puts a plane `z` behind the sheet on screen, in sheet units */
function xf(G, cam, z) {
  const d = cam.d + z;
  if (d <= 0.5) return null;
  const k = G.F / d, c = Math.cos(cam.roll) * k, s = Math.sin(cam.roll) * k;
  return { d, k, m: [c, s, -s, c, G.cx - (c * cam.x - s * cam.y), G.cy - (s * cam.x + c * cam.y)] };
}
const fogAt = d => clamp((d - FOG_NEAR) / (FOG_FAR - FOG_NEAR));

// ── drawing ───────────────────────────────────────────────────────────────
function drawPrint(ctx, S, G, sp, cam, st) {
  const X = xf(G, cam, GAP);
  if (!X) return;
  ctx.setTransform(...X.m);
  const r = sp.print, ox = st.slip * (G.P ? 2 : 3.5);
  if (st.bar === 0 && !st.film) {
    ctx.fillStyle = INK; ctx.fillRect(r.x, r.y, r.w, r.h);           // black leader
  } else if (sp.kind === 'edit') {
    const e = sp.tileEdges, ord = st.order;
    for (let i = 0; i < 4; i++) {
      const F = FILMS[ord[i]], f = G.P ? F.TP : F.T;
      const a = i ? e[i - 1] : (G.P ? r.y : r.x), b = i < 3 ? e[i] : (G.P ? r.y + r.h : r.x + r.w);
      if (G.P) cover(ctx, S.img(F.src), r.x + ox, a, r.w, b - a + 0.3, { fx: f[0], fy: f[1] });
      else cover(ctx, S.img(F.src), a + ox, r.y, b - a + 0.3, r.h, { fx: f[0], fy: f[1] });
    }
  } else {
    const F = FILMS[st.film], f = G.P ? F.P : F.L;
    let img = S.img(F.src);
    if (sp.kind === 'grade') img = graded(img, st.grade);
    if (sp.kind === 'grade' && G.P && img) {
      // the phone's column of letters stands in front of the whole bottle, on its own black
      const w = r.h * img.width / img.height, kf = ((D0 + D1) / 2 + GAP) / ((D0 + D1) / 2);
      ctx.fillStyle = '#000'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.drawImage(img, sp.colX * kf - w / 2 + ox, r.y, w, r.h);
    } else cover(ctx, img, r.x + ox, r.y, r.w, r.h, { fx: f[0], fy: f[1] });
  }
  if (st.fog > 0) { ctx.globalAlpha = st.fog; ctx.fillStyle = PAPER; ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2); ctx.globalAlpha = 1; }
}

/** the sheet: paper with the word cut out of it (glyphs listed in `solid` stay paper) */
function drawSheet(ctx, S, G, sp, cam, solid) {
  const X = xf(G, cam, 0);
  if (!X || cam.d < sp.cover) return null;
  const o = sheetCtx(S);
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = 'source-over';
  o.fillStyle = PAPER; o.fillRect(0, 0, S.W, S.H);
  o.globalCompositeOperation = 'destination-out';
  o.font = FONT900; o.textAlign = 'left'; o.textBaseline = 'alphabetic'; o.fillStyle = '#000';
  const vis = visible(G, cam);
  for (const g of sp.gl) {
    if (solid && solid.includes(g)) continue;
    if (g.x1 < vis.x0 || g.x0 > vis.x1 || g.y1 < vis.y0 || g.y0 > vis.y1) continue;
    o.setTransform(...X.m); o.translate(g.x, g.y); o.scale(g.s, g.s);
    o.fillText(g.ch, 0, 0);
  }
  o.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(SHEET, 0, 0);
  return X;
}
/** the part of the sheet the frame can see (roll-safe) */
function visible(G, cam) {
  const r = Math.max(G.hx, G.hy) * 1.45 * cam.d;
  return { x0: cam.x - r, x1: cam.x + r, y0: cam.y - r, y1: cam.y + r };
}

/** printer's crop marks at the corners of the spread: the sheet reads as a sheet */
function cropMarks(ctx, G, col, k) {
  const [x0, y0, x1, y1] = G.P ? [-46.5, -96, 46.5, 83] : [-82, -42, 82, 39];
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, 0.28 * k) / k;
  ctx.beginPath();
  for (const [x, y, sx, sy] of [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]]) {
    ctx.moveTo(x + sx * 1.5, y); ctx.lineTo(x + sx * 5.5, y);
    ctx.moveTo(x, y + sy * 1.5); ctx.lineTo(x, y + sy * 5.5);
  }
  ctx.stroke();
}

/** the folio and the ticking timecode along the top of every spread */
function header(ctx, S, G, col, tc = true) {
  const L = G.P ? [-43, 43, -84, 2.6] : [-74, 74, -34, 2.2];
  tx(ctx, S, '05 — FILMS', L[0], L[2], L[3], { weight: 700, tracking: 0.16, color: col });
  if (tc) cells(ctx, timecode(S.t), L[1], L[2], L[3], { weight: 600, align: 'right', color: col });
}

// ── the spreads' print work, drawn on the sheet in ink ────────────────────
function inkCut(ctx, S, G, sp, st) {
  const col = st.col, F = st.film && FILMS[st.film], P = G.P, b = sp.bb;
  header(ctx, S, G, col);
  if (!F) return;
  if (!P) {
    tx(ctx, S, F.n + ' / 05', b.x0, -24, 2.2, { weight: 600, tracking: 0.16, color: col });
    tx(ctx, S, F.title, b.x0, -14.5, 6.2, { weight: 900, tracking: -0.01, color: col });
    cells(ctx, F.rt, b.x1, -13, 16, { weight: 200, align: 'right', cell: 0.58, colon: 0.26, color: col });
  } else {
    tx(ctx, S, F.n + ' / 05', 43, -72, 2.4, { weight: 600, tracking: 0.16, align: 'right', color: col });
    cells(ctx, F.rt, 43, -54, 10.5, { weight: 200, align: 'right', cell: 0.58, colon: 0.26, color: col });
    tx(ctx, S, F.title, 43, -46, 3.1, { weight: 900, align: 'right', color: col });
  }
}

function inkEdit(ctx, S, G, sp, st) {
  const col = st.col, P = G.P, L = sp.gl.filter(g => g.ch !== '.'), ord = st.order, b = sp.bb;
  header(ctx, S, G, col);
  const total = ord.reduce((a, f) => a + FILMS[f].sec, 0);
  const play = clamp(st.t / BAR);               // the playhead crosses the cut once a bar
  if (!P) {
    // under each letter the runtime of its clip
    L.forEach((g, i) => cells(ctx, FILMS[ord[i]].rt, g.x0, 17, 4, { weight: 300, cell: 0.58, colon: 0.26, color: col }));
    // the timeline: the same four clips, runtime-true, the playhead naming the clip it is in
    const on = strip(ctx, ord, total, b.x0, b.x1, 24.5, 29, play, col, false);
    const ph = b.x0 + play * (b.x1 - b.x0), name = FILMS[on].title;
    const flip = ph > b.x1 - 30;
    tx(ctx, S, name, ph + (flip ? -1.8 : 1.8), 22.6, 1.7, { weight: 800, tracking: 0.08, color: col, align: flip ? 'right' : 'left' });
  } else {
    L.forEach((g, i) => {
      const F = FILMS[ord[i]];
      cells(ctx, F.rt, 36, g.top + 9, 7, { weight: 200, align: 'right', cell: 0.58, colon: 0.26, color: col });
      tx(ctx, S, F.title, 36, g.top + 14.5, 2.4, { weight: 800, tracking: 0.04, align: 'right', color: col });
    });
    strip(ctx, ord, total, b.y0, b.y1, 39.5, 43, play, col, true);
  }
}
/** a runtime-true timeline of the four clips (a0..a1 along it, b0..b1 across it) */
function strip(ctx, ord, total, a0, a1, b0, b1, play, col, vertical) {
  const gap = 0.8, span = a1 - a0 - gap * 3;
  let a = a0, active = ord[0];
  const ph = a0 + play * (a1 - a0);
  ctx.lineWidth = 0.28; ctx.strokeStyle = col; ctx.fillStyle = col;
  for (const f of ord) {
    const len = span * FILMS[f].sec / total;
    const on = ph >= a && ph < a + len + gap;
    if (on) active = f;
    if (vertical) { if (on) ctx.fillRect(b0, a, b1 - b0, len); else ctx.strokeRect(b0, a, b1 - b0, len); }
    else { if (on) ctx.fillRect(a, b0, len, b1 - b0); else ctx.strokeRect(a, b0, len, b1 - b0); }
    a += len + gap;
  }
  // the playhead
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  if (vertical) { ctx.moveTo(b0 - 3, ph); ctx.lineTo(b1 + 1.5, ph); ctx.moveTo(b0 - 3, ph - 1.2); ctx.lineTo(b0 - 3, ph + 1.2); }
  else { ctx.moveTo(ph, b0 - 3); ctx.lineTo(ph, b1 + 1.5); ctx.moveTo(ph - 1.2, b0 - 3); ctx.lineTo(ph + 1.2, b0 - 3); }
  ctx.stroke();
  return active;
}

function inkGrade(ctx, S, G, sp, st) {
  const col = st.col, P = G.P, b = sp.bb, F = FILMS.locc, img = S.img(F.src);
  header(ctx, S, G, col, P);
  const chip = (x, y, w, h, i) => {
    cover(ctx, graded(img, GRADE_SEQ[i]), x, y, w, h, { fx: 0.5, fy: 0.42 });
    if (i === st.gi) {
      ctx.lineWidth = 0.55; ctx.strokeStyle = col; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    }
  };
  if (!P) {
    tx(ctx, S, F.title, b.x0, -24, 5.5, { weight: 900, tracking: -0.01, color: col });
    tx(ctx, S, 'PRODUCT SPOT', b.x0, -18, 2, { weight: 700, tracking: 0.18, color: col });
    // the stills of the four grades, the one on screen marked
    for (let i = 0; i < 4; i++) chip(b.x0 + i * 15.5, 17, 13.5, 7.6, i);
    ctx.fillStyle = col;
    const cx = b.x0 + st.gi * 15.5 + 6.75;
    ctx.beginPath(); ctx.moveTo(cx - 1.1, 27.8); ctx.lineTo(cx + 1.1, 27.8); ctx.lineTo(cx, 26.2); ctx.closePath(); ctx.fill();
    // the timecode, set big and thin as the spread's headline numerals
    cells(ctx, timecode(S.t), b.x1, 27, 9, { weight: 200, align: 'right', cell: 0.6, colon: 0.24, color: col });
  } else {
    tx(ctx, S, F.title, 43, -60, 4.2, { weight: 900, align: 'right', color: col });
    tx(ctx, S, 'PRODUCT SPOT', 43, -54.5, 2.2, { weight: 700, tracking: 0.16, align: 'right', color: col });
    for (let i = 0; i < 4; i++) chip(24, -40 + i * 13.5, 19, 10.7, i);
    ctx.fillStyle = col;
    const cy = -40 + st.gi * 13.5 + 5.35;
    ctx.beginPath(); ctx.moveTo(20.6, cy - 1.1); ctx.lineTo(20.6, cy + 1.1); ctx.lineTo(22.2, cy); ctx.closePath(); ctx.fill();
  }
}

function inkLine(ctx, S, G, sp, st) {
  const col = st.col, P = G.P;
  header(ctx, S, G, col);
  // the line itself: the credit runs straight into the die-cut ONE PERSON.
  const rv = seg(st.t, 0.02, 0.36);
  const lines = P ? ['STORY, VISUALS,', 'EDIT, VO AND', 'MUSIC:'] : ['STORY, VISUALS, EDIT, VO AND MUSIC:'];
  const x0 = P ? -43 : -74, y0 = P ? -46 : -25, cap = P ? 4.4 : 3.8, lead = P ? 7 : 0;
  lines.forEach((s, i) => tx(ctx, S, s, x0, y0 + i * lead, cap, { weight: 800, tracking: 0.06, color: col, reveal: clamp(rv * 1.25 - i * 0.12), mask: true, window: 0.5 }));
  // the films, credited like a masthead
  const rows = CREDITS.map(k => FILMS[k]);
  const [cx0, cx1, cy0, dy, c] = P ? [-43, 43, 42, 6.2, 2.4] : [40, 74, -15, 4.4, 2];
  ctx.fillStyle = col;
  if (P) ctx.fillRect(cx0, cy0 - c - 2.6, cx1 - cx0, 0.25); else ctx.fillRect(cx0 - 3.5, cy0 - c - 0.5, 0.25, 4 * dy + c + 1.5);
  rows.forEach((F, i) => {
    const y = cy0 + i * dy, a = clamp((st.t - 0.08 - i * 0.04) / 0.12);
    if (a <= 0) return;
    tx(ctx, S, F.title, cx0, y, c, { weight: 800, tracking: 0.06, color: col, alpha: a });
    if (F.rt) cells(ctx, F.rt, cx1, y, c, { weight: 500, align: 'right', cell: 0.6, colon: 0.28, color: col, alpha: a });
  });
}

/** the O of ONE, painted the next chapter's colour */
function paintO(ctx, G, sp, col) {
  const g = sp.one[0];
  ctx.save();
  ctx.font = FONT900; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = col;
  ctx.translate(g.x, g.y); ctx.scale(g.s, g.s); ctx.fillText(g.ch, 0, 0);
  ctx.restore();
}

// ── the lens ──────────────────────────────────────────────────────────────
function lens(S, lt) {
  if (lt < IN || lt > OUT - 0.06) return;
  const f = S.fx;
  let ab = 0, sh = 0, warp = 0;
  for (const [t, a, s, w] of HITS) {
    if (lt < t) break;
    const e = lt - t;
    ab = Math.max(ab, a * Math.exp(-e / 0.09));
    sh = Math.max(sh, s * Math.exp(-e / 0.11));
    if (w && e < 0.45) warp = Math.max(warp, e / 0.45);
  }
  // each pass through a sheet tears the colours apart for a moment
  for (let b = 0; b < 3; b++) ab = Math.max(ab, 0.5 * Math.exp(-Math.abs(lt - (b * BAR + T_CROSS)) / 0.05));
  // the fly-in shimmers as it builds, and is still again before the end
  ab = Math.max(ab, 0.3 * seg(lt, 6.8, 7.2) * (1 - seg(lt, 7.22, 7.32)));
  f.ab = ab;
  f.shake = sh * S.u * 0.18;
  if (warp > 0 && warp < 1) { f.warp = warp; f.warpX = 0.5; f.warpY = 0.5; }
}

// ── the chapter ───────────────────────────────────────────────────────────
const scene = {
  id: 'films',
  title: 'Films',
  caption: 'Cut, edit, grade: the brand films seen through giant die-cut letters on paper, ending on the line “Story, visuals, edit, VO and music: one person.”',
  bg: BLOCK.paper,
  assets: CREDITS.map(k => FILMS[k].src),
  models: [],
  still: 6.3,
  sfx: [
    { at: BEAT, type: 'impact' },               // the first film slams into CUT.
    { at: 3 * BEAT, type: 'glitch' },
    { at: T_CROSS, type: 'whoosh' },            // through the T
    { at: BAR + 2 * BEAT, type: 'glitch' },     // a re-edit
    { at: BAR + T_CROSS, type: 'whoosh' },      // through the I
    { at: 2 * BAR + 2 * BEAT, type: 'glitch' }, // a regrade
    { at: 3 * BAR, type: 'impact' },            // ONE PERSON.
    { at: OUT, type: 'riser' }                  // into the teal O
  ],
  draw(ctx, S) {
    const lt = S.lt;
    if (lt < IN) return;                                   // the seam: paper
    if (lt >= OUT) {                                       // the seam: the next chapter's colour
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = nextColour(scene); ctx.fillRect(0, 0, S.W, S.H);
      return;
    }
    const G = geo(ctx, S);
    const bar = Math.min(3, Math.floor(lt / BAR + 1e-9)), t = lt - bar * BAR;
    const beat = Math.min(3, Math.floor(t / BEAT + 1e-9)), sinceCut = t - beat * BEAT;
    const sp = G.sp[bar], cam = camAt(bar, t, sp);
    const fog = bar === 0 ? fogAt(cam.d) : 0;
    const st = {
      bar, t, beat, fog, col: fog > 0 ? mix(INK, PAPER, fog) : INK,
      // a cut lands with a one-frame slip of the print, as a hard edit does
      slip: beat > 0 && sinceCut < 0.034 && !(bar === 0 && beat === 0) ? (beat % 2 ? 1 : -1) : 0,
      film: bar === 0 ? CUT_SEQ[beat] : bar === 2 ? 'locc' : bar === 3 ? LINE_SEQ[beat] : null,
      order: EDIT_SEQ[beat], grade: GRADE_SEQ[beat], gi: beat
    };
    if (bar === 3 && beat === 0 && sinceCut < 0.034) st.slip = 1;
    if (fog >= 1) return;

    const teal = bar === 3 && beat >= 1;
    if (teal && cam.d < sp.cover) {                       // deep in the O's stroke: it is all there is
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = nextColour(scene); ctx.fillRect(0, 0, S.W, S.H);
      lens(S, lt);
      return;
    }
    drawPrint(ctx, S, G, sp, cam, st);
    const X = drawSheet(ctx, S, G, sp, cam, teal ? [sp.one[0]] : null);
    if (X) {
      ctx.setTransform(...X.m);
      cropMarks(ctx, G, st.col, X.k);
      if (sp.kind === 'cut') inkCut(ctx, S, G, sp, st);
      else if (sp.kind === 'edit') inkEdit(ctx, S, G, sp, st);
      else if (sp.kind === 'grade') inkGrade(ctx, S, G, sp, st);
      else inkLine(ctx, S, G, sp, st);
      if (teal) paintO(ctx, G, sp, nextColour(scene));
    }
    lens(S, lt);
  }
};
export default scene;
