/* 2 — Story. Station 01 on the flight path: the /process stage card, its
   story bible, and the one line the whole film grows from.

   The chrome thread lies in the camera's own plane, so from the seam it reads
   as a flat line; everything here opens out of it and closes back into it.
     0.00–0.10  the seam
     0.10–2.45  arrival: the camera brakes in from far out (the stars zoom and
                barely streak, a slight bank); the stage card and, half a beat
                later, the glass pane unfold out of the thread, their chrome
                edges splitting away from it
     1.10–2.30  the card lands on the beats: STAGE 01 OF 06, the outlined 01,
                Story, the CLAUDE chip, the copy
     1.56–3.55  the story bible streams into the pane like telemetry — its
                header, then its contents, one row a 32nd
     3.75       the first row, 0 · LOGLINE, is selected; the rest fall away and
                the HUD goes (3.86–4.00)
     3.90–5.00  the camera pushes into the pane and brakes on the logline as
                its last word lands on bar 3; the card steps back
     5.00–6.45  the logline, large and still
     6.45–7.20  the camera pulls back out ahead of the fold (the card comes back
                up), so the whole station is seen closing: the pane folds into
                the thread 6.70–7.22, the card 6.78–7.30, and they leave on it
                as a glint by 7.34
     7.38–7.50  the seam
   The thread's highlights run the whole chapter and come to rest on a whole
   number of cycles, so the last frame is exactly the rest frame. */
import { FONT, clamp, lerp, seg, linear, outCubic, outExpo, inOutQuad, inOutCubic, bezier } from '../../kit.js';
import { camera } from '../../space.js';
import { seam, space, wire, wireAcross, metal, card, glass, chip, numeral, mono, stamp, UI, MONO } from '../kit3.js';
import { BEAT } from '../palette.js';

const B = BEAT;
const D = 100;            // at this distance (and σ = 1) one world unit is one S.u
const FAR = 1.8;          // the arrival starts this many times further out
const Z_CODE = 340;       // the code panel's plane, far behind the station

// ── the clock, local seconds ──────────────────────────────────────────────
const T = {
  wake: 0.1, settle: 2.45,
  card: [0.3, 1.3], pane: [0.3 + B / 2, 1.3 + B / 2],
  idx: 0.94, num: 0.9, title: 1.25, chip: 1.56, copy: 1.875,
  doc: 1.56, sub: 1.72, meta: 1.875, toc: 3.125, sel: 3.75, drop: 3.86,
  sheen: 5.25, push: [3.9, 5.0], log: [4.2, 4.64], logLen: 0.4,
  exit: [6.45, 7.2], fold: { card: [6.78, 7.3], pane: [6.7, 7.22] }, glint: 7.34, gone: 7.36
};

// ── copy (process.dc.html, stage 01) ──────────────────────────────────────
const IDX = 'STAGE 01 OF 06';
const COPY = 'An idea in your head is not something you can shoot. This is the story bible — the world, the fall, the boy, the vow — written before anything was generated.';
const DOC = 'LAND OF HOPE — Cinematic Promo';
const SUB = 'STORY BIBLE';
const META = [
  'Project: The Chill Gallery — Land of Hope origin trailer',
  'Format: 16:9 cinematic master (4K)',
  'Runtime: flagship master ~2:10 · 60s social cut + 15s teaser derive from it',
  'Through-line: They lost their Land of Hope. They are quietly rebuilding it here.'
];
// the bible's own section heads, in order
const TOC = [
  '0 · LOGLINE',
  '1 · The Eleventh — WICK, the boy who carried the spark',
  '1.1 · The Fall — THE WHISPER',
  '1.5 · Earth, the Mayor & the New Land of Hope',
  '1.6 · The Two Lessons — woven into the film',
  '2 · THE STORY, TOLD STRAIGHT THROUGH'
];
// 'Ten legendary warriors from a fallen golden world crash-land on Earth.'
const LOG = {
  l: ['Ten legendary warriors', 'from a fallen golden world', 'crash-land on Earth.'],
  p: ['Ten legendary', 'warriors from a', 'fallen golden world', 'crash-land on Earth.']
};
// nav-metal.js, lines 31–37, verbatim: the field under the nav pill's liquid-metal rim
const CODE_FROM = 31;
const CODE = [
  'float field(vec2 uv, float t) {',
  '  float x = uv.x, y = uv.y;',
  '  return y * 2.30',
  '       + 0.62 * sin(x * 6.2832 * 1.15 * u_freq + t * 0.95)',
  '       + 0.30 * sin(x * 6.2832 * 2.40 * u_freq - t * 0.62)',
  '       + 0.14 * sin((x * 3.1 * u_freq + y * 1.4) * 6.2832 * 0.7 + t * 1.3);',
  '}'
];

// ── sizes, in world units (≈ S.u at rest) ─────────────────────────────────
const SIZE = {
  l: { cw: 64, pw: 88, gap: 6, pad: 5.4, idx: 1.35, g1: 3.2, title: 9.6, g2: 3.2, chip: 1.4, g3: 4.6,
       num: 15.5, copy: 1.95, copyLh: 1.55, doc: 2.35, sub: 1.25, meta: 1.55, metaLh: 1.62, divGap: 6.2,
       toc: 1.55, tocLh: 1.75, log: 4.8, logLh: 1.12, logGap: 4.2, paneZ: -3, hud: 1.45 },
  p: { cw: 88, pw: 88, gap: 3, pad: 6, idx: 2.1, g1: 4, title: 12.5, g2: 4, chip: 1.9, g3: 5,
       num: 20, copy: 3.0, copyLh: 1.45, doc: 3.3, sub: 2.0, meta: 2.3, metaLh: 1.55, divGap: 6.5,
       toc: 2.3, tocLh: 1.7, log: 6.6, logLh: 1.1, logGap: 4.5, paneZ: -2, hud: 2.5 }
};
const CPS = 300;          // telemetry, characters a second

// ── small helpers ─────────────────────────────────────────────────────────
const EA = bezier(0.3, 0, 0, 1);        // out of rest, then a long brake
const EO = bezier(0.42, 0, 0.12, 1);    // a slab unfolding: the edges part, then settle
const EP = bezier(0.6, 0, 0.18, 1);     // gathers, then brakes onto the bar
const EX = bezier(0.45, 0, 0.2, 1);     // the pull back: out ahead of the fold, so the whole station is seen closing
const bump = (x, a, b) => { const s = Math.sin(Math.PI * seg(x, a, b)); return s * s; };
const hit = (x, t0, len) => (x >= t0 && x < t0 + len ? Math.pow(1 - (x - t0) / len, 2) : 0);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

let MC = null;            // a context for measuring
function mctx() {
  if (!MC) MC = document.createElement('canvas').getContext('2d');
  return MC;
}
const monoFont = (px, w = 400) => `${w} ${Math.round(px)}px ${MONO}`;
const sansFont = (px, w = 400) => `${w} ${Math.round(px)}px ${FONT.sans}`;
function wrapWords(str, maxW, measure) {
  const words = str.split(' '), out = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (line && measure(t) > maxW) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
function measureWith(px, weight, tracking = 0, mono = false) {
  const c = mctx(), K = !mono && px < BIG ? BIG / px : 1;
  return s => {
    c.font = mono ? monoFont(px, weight) : sansFont(px * K, weight); c.letterSpacing = (tracking * px * K) + 'px';
    const w = c.measureText(s).width / K; c.letterSpacing = '0px'; return w;
  };
}

/* The layout measures Archivo (the copy's wrap, the logline's size, the slabs'
   heights, the push), so it is keyed on whether the face is in as well as on
   the frame size: a layout measured in a fallback face is never kept once
   Archivo arrives. Once in, a face stays in, so that answer is remembered. */
let FONTS_IN = false;
function fontsIn() {
  if (FONTS_IN) return true;
  if (typeof document === 'undefined' || !document.fonts) return (FONTS_IN = true);
  try { FONTS_IN = document.fonts.check("400 40px 'Archivo'") && document.fonts.check("800 40px 'Archivo'"); } catch (e) { FONTS_IN = true; }
  return FONTS_IN;
}

// ── layout, per frame size ────────────────────────────────────────────────
let G = null;
function geo(S) {
  const key = S.W + 'x' + S.H + (fontsIn() ? ':f' : ':n');
  if (G && G.key === key) return G;
  const u = S.u, P = S.portrait;
  const A = Math.max(S.W, S.H) / Math.min(S.W, S.H);
  const hx = P ? 50 : 50 * A, hy = P ? 50 * A : 50;
  const Z = P ? SIZE.p : SIZE.l;
  const g = { key, P, hx, hy, Z };
  const pad = Z.pad;

  // the card
  const c = { w: Z.cw };
  c.idxY = pad + Z.idx * 0.8;
  c.titleY = c.idxY + Z.g1 + Z.title * 0.72;
  c.chipY = c.titleY + Z.g2;
  c.copy = wrapWords(COPY, (Z.cw - 2 * pad) * u, measureWith(Z.copy * u, 400));
  c.copyY = c.chipY + Z.chip * 2.6 + Z.g3 + Z.copy * 0.74;
  c.h = c.copyY + (c.copy.length - 1) * Z.copy * Z.copyLh + Z.copy * 0.3 + pad;
  c.numY = c.titleY + Z.title * 0.02;

  // the pane: header, the streamed bible, then its contents (where the logline opens)
  const p = { w: Z.pw };
  const tw = (Z.pw - 2 * pad) * u;
  p.docY = pad + Z.doc * 0.74;
  p.subY = p.docY + Z.doc * 0.55 + Z.sub * 1.9;
  const mm = measureWith(Z.meta * u, 400, 0, true);
  p.meta = [];
  let at = 0;
  for (const line of META) {
    for (const s of wrapWords(line, tw, mm)) { p.meta.push({ s, t0: at }); at += s.length / CPS + 0.025; }
    at += 0.04;
  }
  p.metaLines = p.meta.map(m => m.s);
  p.metaChars = p.metaLines.reduce((n, s) => n + s.length, 0);
  p.metaY = p.subY + Z.sub * 0.5 + Z.meta * 2.1;
  const metaLast = p.metaY + (p.meta.length - 1) * Z.meta * Z.metaLh;
  p.div = metaLast + Z.meta * 0.3 + Z.divGap * 0.45;          // where the thread runs behind the glass
  p.headY = metaLast + Z.divGap + Z.toc * 0.74;
  // the contents, shrunk if a row would not fit
  const tm = measureWith(Z.toc * u, 400, 0, true);
  p.toc = Math.min(Z.toc, Z.toc * tw / Math.max(...TOC.map(tm)));
  const tocLast = p.headY + (TOC.length - 1) * p.toc * Z.tocLh;
  // the logline, set to fit the pane
  const lines = P ? LOG.p : LOG.l;
  const lm = measureWith(Z.log * u, 800, -0.012);
  const logW0 = Math.max(...lines.map(lm)) / u;
  p.log = Math.min(Z.log, Z.log * (Z.pw - 2 * pad) / logW0);
  p.lines = lines;
  p.logW = logW0 * p.log / Z.log;
  p.logY = p.headY + Z.logGap + p.log * 0.74;
  const logLast = p.logY + (lines.length - 1) * p.log * Z.logLh;
  p.h = Math.max(logLast + p.log * 0.3, tocLast + p.toc * 0.4) + pad;
  p.logTop = p.headY - p.toc * 0.8;
  p.logBot = logLast + p.log * 0.22;

  // the station in the world: hinged on the thread (y = 0, z = 0), fitted into
  // the band between the HUD and the foot of the reading area
  const top = -hy + 0.16 * hy + Z.hud * 3.7 + 3, bot = 0.76 * hy, band = bot - top;
  if (!P) {
    const H = Math.max(c.h, p.h), a = p.div;           // one box for both; the thread splits the pane's bible from its contents
    c.h = H; p.h = H; c.a = a; p.a = a;
    // the card's copy settles to its foot, below the thread
    c.copyY = H - Z.pad - Z.copy * 0.3 - (c.copy.length - 1) * Z.copy * Z.copyLh;
    const total = Z.cw + Z.gap + Z.pw;
    c.x = -total / 2 + Z.cw / 2; p.x = total / 2 - Z.pw / 2;
    c.y = 0; p.y = 0; c.z = 0; p.z = Z.paneZ;
    g.sig = Math.min(1, 0.9 * 2 * hx / total, band / H);
    g.rest = { x: 0, y: H / 2 - a, z: -D / g.sig };
  } else {
    // the card stands on the thread, hinged on its bottom edge; the pane hangs from it
    c.a = c.h; p.a = 0;
    c.x = 0; p.x = 0;
    c.y = -Z.gap / 2; p.y = Z.gap / 2; c.z = 0; p.z = Z.paneZ;
    const span = c.h + Z.gap + p.h;
    g.sig = Math.min(1, 0.92 * 100 / Z.cw, band / span);
    const mid = (p.h - c.h) / 2;
    g.rest = { x: 0, y: mid - (top + bot) / 2 / g.sig, z: -D / g.sig };
  }
  g.start = { x: 0, y: 0, z: -FAR * D / g.sig };
  g.card = c; g.pane = p;

  // the push: onto the logline, centred a touch above the middle
  const lx = p.x - Z.pw / 2 + pad + p.logW / 2;
  const ly = p.y - p.a + (p.logTop + p.logBot) / 2;
  const sPush = Math.min(P ? 1.3 : 2.35, 0.84 * 2 * hx / p.logW, 0.64 * 2 * hy / (p.logBot - p.logTop));
  g.push = { x: lx, y: ly + 0.05 * hy / sPush, z: p.z - D / sPush, s: sPush };

  // the code panel: far behind, placed on screen as it would sit at rest
  const dist = Z_CODE - g.rest.z;
  const sc = P ? [-0.26 * hx, 0.8 * hy] : [0.6 * hx, -0.63 * hy];
  g.code = { x: g.rest.x + sc[0] * dist / D, y: g.rest.y + sc[1] * dist / D, k: dist / D };
  G = g;
  return g;
}

// ── the code panel, rendered once per frame size ──────────────────────────
let CODEC = null;
function codeArt(S) {
  const key = S.W + 'x' + S.H;
  if (CODEC && CODEC.key === key) return CODEC;
  const u = S.u, P = S.portrait;
  const fpx = Math.max(7, (P ? 1.9 : 1.05) * u), lh = fpx * 1.55;
  const x = document.createElement('canvas').getContext('2d');
  x.font = monoFont(fpx);
  const adv = x.measureText('0').width;
  const gut = adv * 4.2, padX = fpx * 1.4, padY = fpx * 1.3;
  const w = Math.ceil(padX * 2 + gut + Math.max(...CODE.map(s => s.length)) * adv);
  const h = Math.ceil(padY * 2 + lh * (CODE.length + 1.6));
  const cv = x.canvas; cv.width = w; cv.height = h;
  x.font = monoFont(fpx);
  x.textBaseline = 'alphabetic';
  // a holographic plate: a cold wash, a hairline, corner ticks, scanlines
  x.fillStyle = 'rgba(174,203,255,.045)'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(174,203,255,.26)'; x.lineWidth = 1; x.strokeRect(0.5, 0.5, w - 1, h - 1);
  x.fillStyle = 'rgba(174,203,255,.9)';
  const tick = fpx * 1.1, tw = Math.max(1.5, fpx * 0.14);
  for (const [cx, cy, dx, dy] of [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]]) {
    x.fillRect(cx - (dx < 0 ? tw : 0), cy - (dy < 0 ? tick : 0), tw, tick);
    x.fillRect(cx - (dx < 0 ? tick : 0), cy - (dy < 0 ? tw : 0), tick, tw);
  }
  x.fillStyle = 'rgba(174,203,255,.75)';
  x.fillText('nav-metal.js', padX, padY + fpx * 0.8);
  x.fillStyle = 'rgba(174,203,255,.25)'; x.fillRect(padX, padY + fpx * 1.35, w - 2 * padX, 1);
  CODE.forEach((s, i) => {
    const y = padY + lh * (i + 1.6) + fpx * 0.8;
    x.fillStyle = 'rgba(174,203,255,.38)';
    x.textAlign = 'right'; x.fillText(String(CODE_FROM + i), padX + gut - adv * 1.4, y);
    x.textAlign = 'left'; x.fillStyle = 'rgba(214,228,255,.92)'; x.fillText(s, padX + gut, y);
  });
  x.fillStyle = 'rgba(0,0,0,.18)';
  for (let yy = 0; yy < h; yy += 3) x.fillRect(0, yy, w, 1);
  CODEC = { key, cv, w, h };
  return CODEC;
}

// ── the camera, a pure function of local time ────────────────────────────
function pose(lt, g) {
  const A = g.start, R = g.rest, P = g.push;
  const a = EA(seg(lt, T.wake, T.settle));
  let x = lerp(A.x, R.x, a), y = lerp(A.y, R.y, a), z = lerp(A.z, R.z, a);
  z += 0.05 * Math.abs(R.z) * sstep(1.6, 4.4, lt);          // a slow drift in while the bible streams
  const pp = EP(seg(lt, T.push[0], T.push[1]));
  x = lerp(x, P.x, pp); y = lerp(y, P.y, pp); z = lerp(z, P.z, pp);
  z += 0.03 * (D / P.s) * sstep(4.9, 6.9, lt);              // and a breath closer on the logline
  // the landing on bar 3: a small recoil, gone in a third of a second
  z -= 0.022 * (D / P.s) * sstep(4.96, 5.0, lt) * Math.exp(-Math.max(0, lt - 5.0) * 11);
  // the pull back, along a straight line, paced so the zoom (the log of the distance) follows the ease:
  // eased in z alone, most of the shrink would come in its first few frames
  const pe = EX(seg(lt, T.exit[0], T.exit[1]));
  if (pe > 0) {
    const d0 = -z, d1 = -A.z, f = pe >= 1 ? 1 : (d0 * Math.pow(d1 / d0, pe) - d0) / (d1 - d0);
    x = lerp(x, A.x, f); y = lerp(y, A.y, f); z = lerp(z, A.z, f);
  }
  const roll = 0.02 * bump(lt, T.wake, 2.3) - 0.012 * bump(lt, T.exit[0], T.exit[1] + 0.02);
  return { x, y, z, roll };
}

// ── drawing pieces ────────────────────────────────────────────────────────
/** a slab hinged on a line: (x, y, z) is the hinge's centre, `a` the distance
    from the slab's top down to the hinge; open 0 is edge-on (a line), 1 face on */
function slab(ctx, S, cam, o, face) {
  if (o.open <= 0.001 && !(o.edge > 0.003)) return;
  const p = cam.project(o.x, o.y, o.z);
  if (!p) return;
  const u = S.u, s = p.k / u;
  const w = o.w * u, h = o.h * u, top = -o.a * u;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(p.x, p.y);
  if (cam.roll) ctx.rotate(cam.roll);
  if (o.open > 0.001) {
    ctx.save(); ctx.scale(s, s * o.open);
    ctx.globalAlpha *= o.closing ? sstep(0, 0.3, o.open) : sstep(0, 0.55, o.open);
    face(ctx, -w / 2, top, w, h, o.open);
    // light spilling out of the thread across the face while it is still turning
    const spill = 0.2 * Math.pow(1 - o.open, 1.4);
    if (spill > 0.004) {
      const gr = ctx.createLinearGradient(0, top, 0, top + h), m = clamp(-top / h);
      gr.addColorStop(0, 'rgba(245,244,240,0)'); gr.addColorStop(m, `rgba(245,244,240,${spill})`); gr.addColorStop(1, 'rgba(245,244,240,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(-w / 2, top, w, h, 2 * u); ctx.fill();
    }
    ctx.restore();
  }
  if (o.edge > 0.003) {
    // the chrome edges parting from (or closing onto) the thread
    const ya = top * s * o.open, yb = (top + h) * s * o.open, xa = -w / 2 * s, xb = w / 2 * s;
    ctx.globalAlpha *= clamp(o.edge);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(245,244,240,.09)'; ctx.lineWidth = Math.max(3, 1.2 * u * s);
    edges(ctx, xa, xb, ya, yb, top, h); ctx.stroke();
    ctx.strokeStyle = metal(ctx, xa, ya, xb, yb, o.phase || 0, Math.max(40, (xb - xa) / 2.3));
    ctx.lineWidth = Math.max(1.3, 0.3 * u * s);
    edges(ctx, xa, xb, ya, yb, top, h); ctx.stroke();
  }
  ctx.restore();
}
function edges(ctx, xa, xb, ya, yb, top, h) {
  ctx.beginPath();
  if (top < 0) { ctx.moveTo(xa, ya); ctx.lineTo(xb, ya); }
  if (top + h > 0) { ctx.moveTo(xa, yb); ctx.lineTo(xb, yb); }
}

/** tracked monospace, typed (the /process stage index, the doc's sub) */
function monoT(ctx, str, x, y, px, n, color, tracking = 0.3) {
  n = Math.min(str.length, n);
  if (n <= 0) return x;
  ctx.font = monoFont(px, 500);
  ctx.letterSpacing = (tracking * px) + 'px';
  ctx.fillStyle = color; ctx.fillText(str.slice(0, n), x, y);
  const w = ctx.measureText(str.slice(0, n)).width;
  ctx.letterSpacing = '0px';
  return x + w;
}
/** a typed monospace line: the last few characters in are still hot */
function typed(ctx, str, x, y, px, n, color, w = 400) {
  if (n <= 0) return x;
  ctx.font = monoFont(px, w);
  const shown = str.slice(0, n);
  ctx.fillStyle = color; ctx.fillText(shown, x, y);
  const width = ctx.measureText(shown).width;
  if (n < str.length) {
    const hot = Math.min(3, n), pre = ctx.measureText(str.slice(0, n - hot)).width;
    ctx.fillStyle = UI.ink; ctx.fillText(str.slice(n - hot, n), x + pre, y);
  }
  return x + width;
}
/** the outlined stage numeral (as kit3's numeral()), its outline drawn on by p 0..1 */
function drawNumeral(ctx, str, x, y, size, p, phase) {
  ctx.save();
  ctx.font = `900 ${Math.round(size)}px ${FONT.sans}`;
  ctx.letterSpacing = (-0.05 * size) + 'px';
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  const fa = sstep(0.45, 1, p);
  if (fa > 0) {
    const g = ctx.createLinearGradient(0, y - size * 0.75, 0, y);
    g.addColorStop(0, `rgba(245,244,240,${0.15 * fa})`); g.addColorStop(0.78, `rgba(245,244,240,${0.02 * fa})`);
    ctx.fillStyle = g; ctx.fillText(str, x, y);
  }
  const L = size * 3.2;
  ctx.setLineDash([L, L]); ctx.lineDashOffset = L * (1 - p);
  ctx.lineWidth = Math.max(1, size * 0.016);
  ctx.strokeStyle = metal(ctx, x - size, y - size, x, y, phase, size * 0.9);
  ctx.strokeText(str, x, y);
  ctx.restore();
}
/** the site's silver on a title: a gradient from cap height to baseline, in layout space */
const silver = (top, bottom) => (ctx, P) => {
  const g = ctx.createLinearGradient(0, -P * 0.74, 0, 0);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  return g;
};
function caret(ctx, x, y, px, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = UI.ink;
  ctx.fillRect(x + px * 0.15, y - px * 0.8, px * 0.55, px * 0.98);
  ctx.restore();
}
/* Small type is laid out large and drawn scaled down: at a dozen pixels the
   browser rounds each advance to a whole pixel and the spacing goes uneven. */
const BIG = 64;
/** sans type, filled in one run so it keeps its kerning (o.tracking in em) */
function sans(ctx, str, x, y, px, weight, fill, o = {}) {
  const K = px < BIG ? BIG / px : 1;
  ctx.save();
  ctx.translate(x, y); ctx.scale(1 / K, 1 / K);
  ctx.font = sansFont(px * K, weight);
  ctx.letterSpacing = ((o.tracking || 0) * px * K) + 'px';
  ctx.textAlign = o.align || 'left';
  ctx.fillStyle = fill; ctx.fillText(str, 0, 0);
  ctx.restore();
}
/** a line of type rising word by word from behind its own sill; r 0..1 over the line.
    o.sheen (0..1) runs the chrome's cold-white-warm glint across it once */
function riseLine(ctx, str, x, y, px, weight, fill, r, o = {}) {
  if (r <= 0) return;
  const K = px < BIG ? BIG / px : 1, P = px * K;
  ctx.save();
  ctx.translate(x, y); ctx.scale(1 / K, 1 / K);
  ctx.font = sansFont(P, weight);
  ctx.letterSpacing = ((o.tracking || 0) * P) + 'px';
  const words = str.split(' '), n = words.length, win = o.window ?? 0.55;
  const full = ctx.measureText(str).width;
  ctx.beginPath(); ctx.rect(-P, -P * 1.02, full + 2 * P, P * 1.36); ctx.clip();
  const xs = [];
  let idx = 0;
  for (let i = 0; i < n; i++) { xs.push(idx ? ctx.measureText(str.slice(0, idx)).width : 0); idx += words[i].length + 1; }
  const pass = (style) => {
    ctx.fillStyle = style;
    for (let i = 0; i < n; i++) {
      const st = n > 1 ? (i / (n - 1)) * (1 - win) : 0;
      const p = r >= 1 ? 1 : outExpo(clamp((r - st) / win));
      if (p <= 0) continue;
      ctx.fillText(words[i], xs[i], (1 - p) * P * 1.12);
    }
  };
  pass(typeof fill === 'function' ? fill(ctx, P) : fill);
  const sh = o.sheen ?? 0;
  if (sh > 0 && sh < 1) {
    // a narrow band of the metal's own glint sliding left to right
    const c = lerp(-0.3, 1.3, sh) * full, bw = Math.max(P * 2.2, full * 0.16);
    const g = ctx.createLinearGradient(c - bw, 0, c + bw, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.38, 'rgba(174,203,255,.55)');
    g.addColorStop(0.5, 'rgba(255,255,255,.95)'); g.addColorStop(0.62, 'rgba(255,217,174,.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    pass(g);
  }
  ctx.restore();
}

// ── the stage card ────────────────────────────────────────────────────────
function drawCard(ctx, S, g, lt, x0, y0, w, h, open, phase, dim) {
  const u = S.u, Z = g.Z, c = g.card, pad = Z.pad * u;
  const land = hit(lt, T.card[1] - 0.1, 1.0);
  const cr = (g.P ? 3 : 2.4) * u;
  card(ctx, S, x0, y0, w, h, { metal: true, phase, glow: 0.35 + 0.65 * land, r: cr });
  // the /process card's chrome rim: brighter along the top, as if lit from above
  ctx.save();
  ctx.lineWidth = Math.max(1.2, 0.2 * u);
  ctx.strokeStyle = metal(ctx, x0, y0, x0 + w, y0 + h * 0.5, phase + 0.1, Math.max(80, w / 1.6));
  ctx.globalAlpha *= 0.75;
  ctx.beginPath(); ctx.roundRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1, cr); ctx.stroke();
  const top = ctx.createLinearGradient(x0, 0, x0 + w, 0);
  top.addColorStop(0, 'rgba(255,255,255,0)'); top.addColorStop(0.5, 'rgba(255,255,255,.55)'); top.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = top; ctx.lineWidth = Math.max(1, 0.12 * u);
  ctx.beginPath(); ctx.moveTo(x0 + cr, y0 + 0.5); ctx.lineTo(x0 + w - cr, y0 + 0.5); ctx.stroke();
  ctx.restore();
  // dimmed while the logline holds; on a phone the card sits above it in frame, so its copy goes entirely
  const cf = (lt > T.exit[0] - 0.1 ? sstep(0.12, 0.6, open) : sstep(0.55, 0.97, open)) * (1 - (g.P ? 1 : 0.8) * dim);
  if (cf <= 0.01) return;
  ctx.save(); ctx.globalAlpha *= cf;
  // the outlined numeral: its chrome outline draws on, then its fill fades up under it
  const np = seg(lt, T.num, T.num + 0.9, inOutQuad);
  if (np > 0 && np < 1) drawNumeral(ctx, '01', x0 + w - pad, y0 + c.numY * u, Z.num * u, np, phase * 0.6 + 0.15);
  else if (np >= 1) {
    ctx.save(); ctx.letterSpacing = (-0.05 * Z.num * u) + 'px';
    numeral(ctx, S, '01', x0 + w - pad, y0 + c.numY * u, Z.num * u, { metal: true, phase: phase * 0.6 + 0.15 });
    ctx.restore();
  }
  // STAGE 01 OF 06, typed
  const ni = Math.floor(seg(lt, T.idx, T.idx + 0.3) * IDX.length);
  const ex = monoT(ctx, IDX, x0 + pad, y0 + c.idxY * u, Z.idx * u, ni, UI.muted);
  if (ni > 0 && ni < IDX.length) caret(ctx, ex, y0 + c.idxY * u, Z.idx * u);
  // Story, rising from behind its sill in the site's silver
  const tr = seg(lt, T.title, T.title + 0.55);
  if (tr > 0) {
    const ty = y0 + c.titleY * u, ts = Z.title * u;
    riseLine(ctx, 'Story', x0 + pad - ts * 0.03, ty, ts, 800, silver('#f7f6f2', '#a9a79f'), tr, { tracking: -0.025, window: 1 });
  }
  // the chip
  const ca = seg(lt, T.chip, T.chip + 0.3, outCubic);
  if (ca > 0) {
    const cs = Z.chip * u, ch = cs * 2.6;
    ctx.save();
    ctx.translate(x0 + pad, y0 + c.chipY * u + ch / 2);
    const k = lerp(0.85, 1, seg(lt, T.chip, T.chip + 0.5, outExpo));
    ctx.scale(k, k);
    chip(ctx, S, 'Claude', 0, -ch / 2, { size: cs, alpha: ca });
    ctx.restore();
  }
  // the copy, a line at a time
  const cs = Z.copy * u;
  c.copy.forEach((s, i) => {
    const r = seg(lt, T.copy + i * 0.08, T.copy + i * 0.08 + 0.5, outCubic);
    if (r <= 0) return;
    ctx.save(); ctx.globalAlpha *= r;
    sans(ctx, s, x0 + pad, y0 + (c.copyY + i * Z.copy * Z.copyLh) * u + (1 - r) * cs * 0.6, cs, 400, UI.muted);
    ctx.restore();
  });
  ctx.restore();
}

// ── the glass pane: the story bible ──────────────────────────────────────
function drawPane(ctx, S, g, lt, x0, y0, w, h, open, hero) {
  const u = S.u, Z = g.Z, p = g.pane, pad = Z.pad * u, r = (g.P ? 2.6 : 2.1) * u;
  // a dark backing so the glass reads over space, then the glass itself
  ctx.fillStyle = `rgba(11,11,12,${0.8 - 0.14 * hero})`;
  ctx.beginPath(); ctx.roundRect(x0, y0, w, h, r); ctx.fill();
  glass(ctx, S, x0, y0, w, h, { r });
  const cf = lt > T.exit[0] - 0.1 ? sstep(0.12, 0.6, open) : sstep(0.55, 0.97, open);
  if (cf <= 0.01) return;
  ctx.save(); ctx.globalAlpha *= cf;
  const bible = 1 - hero;
  // the header
  ctx.save(); ctx.globalAlpha *= bible;
  const dr = seg(lt, T.doc, T.doc + 0.45, outCubic);
  if (dr > 0) {
    ctx.save(); ctx.globalAlpha *= dr;
    sans(ctx, DOC, x0 + pad + (1 - dr) * Z.doc * u, y0 + p.docY * u, Z.doc * u, 700, UI.ink);
    ctx.restore();
  }
  monoT(ctx, SUB, x0 + pad, y0 + p.subY * u, Z.sub * u, Math.floor(seg(lt, T.sub, T.sub + 0.18) * SUB.length), UI.faint, 0.22);
  // the bible, streamed through kit3's mono(); the last few characters in are still hot
  const ms = Z.meta * u;
  let shown = 0, hot = null;
  p.meta.forEach((m, i) => {
    const n = clamp(Math.floor((lt - T.meta - m.t0) * CPS), 0, m.s.length);
    shown += n;
    if (n > 0 && n < m.s.length) hot = [i, n];
  });
  if (shown > 0) {
    mono(ctx, S, p.metaLines, x0 + pad, y0 + p.metaY * u, { size: ms, lh: Z.metaLh, color: UI.muted, reveal: (shown + 0.5) / p.metaChars, cursor: shown < p.metaChars });
    if (hot) {
      const [i, n] = hot, str = p.meta[i].s, k = Math.min(3, n);
      ctx.font = monoFont(ms); ctx.fillStyle = UI.ink;
      ctx.fillText(str.slice(n - k, n), x0 + pad + ctx.measureText(str.slice(0, n - k)).width, y0 + (p.metaY + i * Z.meta * Z.metaLh) * u);
    }
  }
  ctx.restore();

  // its contents, a row a 32nd; the first is selected, the rest fall away
  const ts = p.toc * u, sel = seg(lt, T.sel, T.sel + 0.16, outCubic);
  const drop = seg(lt, T.drop, T.drop + 0.34, inOutCubic);
  TOC.forEach((s, i) => {
    const t0 = T.toc + i * B / 8;
    const n = Math.floor((lt - t0) * CPS * 1.3);
    if (n <= 0) return;
    const y = y0 + (p.headY + i * p.toc * Z.tocLh) * u;
    if (i === 0) {
      if (sel > 0) {
        // the selection: a hairline bar sweeping in under the row
        const bw = (w - 2 * pad + ts) * sel;
        ctx.fillStyle = `rgba(245,244,240,${0.075 * (1 - 0.6 * hero)})`;
        ctx.fillRect(x0 + pad - ts * 0.5, y - ts * 1.05, bw, ts * 1.5);
        ctx.fillStyle = `rgba(245,244,240,${0.55 * (1 - 0.5 * hero)})`;
        ctx.fillRect(x0 + pad - ts * 0.5, y - ts * 1.05, Math.max(1, 0.18 * u), ts * 1.5);
      }
      const ex = typed(ctx, s, x0 + pad, y, ts, Math.min(n, s.length), sel > 0.5 ? UI.ink : UI.muted, sel > 0.5 ? 600 : 400);
      // the caret waits on it, blinking on the eighths, until the line comes
      if (lt >= T.sel && lt < T.log[0] + 0.12) caret(ctx, ex + ts * 0.3, y, ts, Math.floor((lt - T.sel) / (B / 2)) % 2 === 0 ? 1 : 0.15);
      return;
    }
    const a = (1 - drop) * (1 - 0.35 * sel);
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha *= a;
    typed(ctx, s, x0 + pad, y + drop * ts * 0.9 * (1 + i * 0.25), ts, Math.min(n, s.length), UI.faint);
    ctx.restore();
  });

  // the logline
  const ls = p.log * u;
  p.lines.forEach((s, i) => {
    const t0 = lerp(T.log[0], T.log[1], i / (p.lines.length - 1));   // the last word lands on bar 3
    const rv = seg(lt, t0, t0 + T.logLen);
    if (rv <= 0) return;
    const y = y0 + (p.logY + i * p.log * Z.logLh) * u;
    const sheen = seg(lt, T.sheen + i * 0.09, T.sheen + i * 0.09 + 0.75, inOutQuad);
    riseLine(ctx, s, x0 + pad - ls * 0.03, y, ls, 800, silver('#fbfaf6', '#cfccc3'), rv, { tracking: -0.012, window: 0.62, sheen });
  });
  ctx.restore();
}

export default {
  id: 'story',
  title: 'Story',
  caption: 'Station 01, Story: the stage card and its story bible open out of the thread, and the logline lands.',
  assets: [],
  models: [],
  still: 3.85,
  sfx: [
    { at: 0.625, type: 'whoosh', gain: 0.5, len: 0.9 },   // the arrival: beat 1, as the chrome edges part
    { at: 1.25, type: 'sub', gain: 0.6 },         // the card locks
    { at: T.meta, type: 'tick', gain: 0.3 },      // the bible starts streaming
    { at: T.sel, type: 'tick', gain: 0.5 },       // 0 · LOGLINE selected
    { at: 5.0, type: 'riser', gain: 0.35, len: 1.1 },    // into the pane: 3.9 → 5.0, resolving on the impact
    { at: 5.0, type: 'impact' },                  // the logline lands on bar 3
    { at: 6.875, type: 'whoosh', gain: 0.45, len: 0.9 }  // the station pulls back and folds away: beat 11, spanning 6.43–7.33
  ],
  // (the layout only once the type is in: it measures it; draw() rebuilds it otherwise)
  prepare(S) { if (fontsIn()) geo(S); codeArt(S); },
  draw(ctx, S) {
    const lt = S.lt;
    if (lt <= T.wake || lt >= T.gone + 0.02) { seam(ctx, S); return; }
    const g = geo(S), { W, H, u } = S;
    const cp = pose(lt, g);
    const cam = camera(S, { x: cp.x, y: cp.y, z: cp.z, roll: cp.roll, zoom: 1 });

    // stars: zoom with the dolly, streak a little on the arrival, bank with the roll
    const speed = Math.abs(pose(lt + 0.02, g).z - pose(lt - 0.02, g).z) / 0.04 / Math.abs(g.rest.z);
    const zoom = Math.pow(g.start.z / cp.z, 0.3);
    ctx.save();
    if (cp.roll) { ctx.translate(W / 2, H / 2); ctx.rotate(cp.roll); ctx.translate(-W / 2, -H / 2); }
    space(ctx, S, {
      x: -(cp.x - g.start.x) * u * 0.25 / W, y: -(cp.y - g.start.y) * u * 0.25 / H, zoom,
      warp: lt < 3 ? clamp(speed * 0.1, 0, 0.13) : 0
    });
    ctx.restore();

    // the thread's highlights: four whole cycles over the chapter, fast on the arrival and the exit
    const phase = 1.6 * seg(lt, T.wake, T.settle, outCubic) + 0.9 * seg(lt, T.settle - 0.6, T.exit[0], linear)
      + 1.5 * seg(lt, T.exit[0] - 0.1, T.gone, inOutQuad);

    const hero = sstep(T.push[0], T.push[1] - 0.25, lt);
    // the card steps back while the logline holds, and comes back up as the camera pulls out to watch it fold
    const dimC = hero * (1 - sstep(T.exit[0], T.exit[0] + 0.35, lt));
    // the code panel, far behind, dim
    const ca = sstep(0.7, 1.7, lt) * (1 - sstep(6.3, 7.0, lt)) * (1 - 0.55 * hero);
    if (ca > 0) {
      const art = codeArt(S);
      const q = cam.project(g.code.x + lt * 4 * g.code.k, g.code.y - lt * 0.8 * g.code.k, Z_CODE);
      if (q) {
        const k = q.k / (S.u * 100 / (Z_CODE - g.rest.z));   // 1 at rest
        ctx.save(); ctx.globalAlpha = 0.34 * ca;
        ctx.translate(q.x, q.y); if (cp.roll) ctx.rotate(cp.roll); ctx.scale(k, k);
        ctx.drawImage(art.cv, -art.w / 2, -art.h / 2);
        ctx.restore();
      }
    }

    // the thread: the camera's plane seen edge on — tilted by the bank, lifted by the camera
    const tp = cam.project(cp.x, 0, 0);
    const k0 = (S.u * 100) / Math.abs(g.start.z);
    const wf = clamp(Math.pow(tp.k / k0, 0.45), 1, 1.8);
    const base = Math.max(1.5, 0.32 * u);
    if (Math.abs(cp.roll) < 1e-6 && Math.abs(tp.y - H / 2) < 1e-6 && wf === 1 && Math.abs(phase - Math.round(phase)) < 1e-9) {
      wireAcross(ctx, S, H / 2, { phase: 0 });
    } else {
      const c = Math.cos(cp.roll), s = Math.sin(cp.roll), L = W * 1.2;
      wire(ctx, S, cx => { cx.beginPath(); cx.moveTo(tp.x - L * c, tp.y - L * s); cx.lineTo(tp.x + L * c, tp.y + L * s); }, { phase, width: base * wf });
    }

    // the station
    const C = g.card, Pn = g.pane;
    const openC = EO(seg(lt, T.card[0], T.card[1])) * (1 - seg(lt, T.fold.card[0], T.fold.card[1], inOutCubic));
    const openP = EO(seg(lt, T.pane[0], T.pane[1])) * (1 - seg(lt, T.fold.pane[0], T.fold.pane[1], inOutCubic));
    const edgeIn = x => sstep(0, 0.08, x);
    const edgeC = Math.pow(1 - openC, 0.6) * edgeIn(lt - T.card[0]) * (1 - sstep(T.fold.card[1] - 0.04, T.glint, lt));
    const edgeP = Math.pow(1 - openP, 0.6) * edgeIn(lt - T.pane[0]) * (1 - sstep(T.fold.pane[1] - 0.04, T.glint - 0.04, lt));
    const gap = g.P ? g.Z.gap / 2 : 0;
    // in portrait the hinges close up onto the thread as the slabs fold flat
    const cy = g.P ? -gap * sstep(0, 0.6, openC) : 0, py = g.P ? gap * sstep(0, 0.6, openP) : 0;
    slab(ctx, S, cam, { x: C.x, y: cy, z: C.z, w: C.w, h: C.h, a: C.a, open: openC, edge: edgeC, phase: phase + 0.3, closing: lt > 5,
      alpha: g.P ? 1 - 0.85 * dimC : 1 },
      (cx, x0, y0, w, h, open) => drawCard(cx, S, g, lt, x0, y0, w, h, open, phase, dimC));
    slab(ctx, S, cam, { x: Pn.x, y: py, z: Pn.z, w: Pn.w, h: Pn.h, a: Pn.a, open: openP, edge: edgeP, phase: phase + 0.55, closing: lt > 5 },
      (cx, x0, y0, w, h, open) => drawPane(cx, S, g, lt, x0, y0, w, h, open, hero));

    // the HUD: the station and the mission clock
    // gone before the push lifts the station into its corner (on a short frame the card's rim would cross the clock)
    const ha = sstep(0.95, 1.45, lt) * (1 - sstep(T.drop, T.push[0] + 0.1, lt));
    if (ha > 0) {
      ctx.save(); ctx.globalAlpha = ha;
      const hs = g.Z.hud * u, hxp = W * 0.05, hyp = H * 0.08 + hs;
      sans(ctx, 'STATION 01 · STORY', hxp, hyp, hs, 700, UI.muted, { tracking: 0.22 });
      ctx.font = monoFont(hs * 1.02); ctx.fillStyle = UI.faint; ctx.textAlign = 'left';
      ctx.fillText(stamp(S.t), hxp, hyp + hs * 2.1);
      ctx.restore();
    }

    // seasoning, on the hits only
    S.fx.ab = 0.12 * hit(lt, 1.22, 0.35) + 0.3 * hit(lt, 4.98, 0.45);
    S.fx.exposure = 1 + 0.045 * hit(lt, 4.98, 0.5);
  }
};
