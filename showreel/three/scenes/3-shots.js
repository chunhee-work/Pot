/* 3 — Shot by shot. Station 02 on the flight path.

   On /process the second stage is the shot list: 23 setups, timed to the
   second. Here the chrome thread the reel rides on is that list. The thread
   tips over into depth and becomes the flight plan, and the setups are laid
   into it as waypoints at their own timecodes along the film's 2:15 — so the
   gaps between them are the film's real rhythm (S5 and S6 a second apart,
   S21 twelve seconds long). The camera flies the plan while the readout
   types the list as /process shows it, and the station's card closes round
   the readout as the last setup locks.

   bar 1  the thread tips into depth as the camera cranes up off it; the
          station title rises; waypoints start ticking on, a 16th apart
   bar 2  the flight: waypoints pass far → near, the counter rolls, the pane
          types S1 — VIS / CAM / LGT / AUD / LINK; the card closes round it and
          S23 locks on beat 7 — a spark runs the wire from it to the camera —
          with the line: The film exists on paper first. The station steps
          back round the line (readout, labels, numeral, a little the title).
   bar 3  hold; the waypoints fold back into the wire far → near, the counter
          rolls back to nothing, and the plan lies down flat on the seam.

   Type meant to be read (the index, the chip, the readout, the HUD labels,
   the near waypoints) is never set under 10 CSS px (readPx): where the frame
   is small the station's stack makes room for it, and the readout shows
   fewer fields rather than smaller ones. Upright, the plan fades into space
   over the frame's last few percent, so the frame's edge stays the seam's.

   A frame is a pure function of S.lt; the only caches are the node and
   glow sprites, the edge band and the layout for a frame size. */
import {
  clamp, lerp, seg, outCubic, outQuart, inOutCubic, inCubic, inQuad, outBack, bezier, rrect, text
} from '../../kit.js';
import { camera } from '../../space.js';
import { seam, space, metal, chip, numeral, stamp, readPx, UI, MONO } from '../kit3.js';
import { BEAT } from '../palette.js';

const B = BEAT;
const inOutSine = x => -(Math.cos(Math.PI * x) - 1) / 2;
const SWING = bezier(0.62, 0, 0.24, 1);      // the crane and the turn: the thread tipping into depth
const SWAY = bezier(0.5, 0, 0.18, 1);        // the swing in over the plan, a touch behind the crane
const FLY = bezier(0.52, 0, 0.3, 1);         // accelerate out of bar 1, brake into the station
const OPEN = bezier(0.16, 1, 0.3, 1);        // the site's own curve

// ── the clock, local seconds ─────────────────────────────────────────────
const T = {
  seam: 0.1,                  // exactly the seam until here
  liftA: 0.1, liftB: 1.8,     // the thread tips into depth
  flyA: 0.85, flyB: 5.0,      // the flight down the plan
  hud: 0.3,                   // corner ticks, clock, counter
  idx: 0.5, title: 0.62, chip: 1.02,
  pane: 1.15,
  cardA: 3.6, cardB: 4.3,     // the card closes round the pane
  line: 4.375,                // S23 locks and the line lands, beat 7 — whole from 4.8
  lineOut: 6.05,              // … and still whole until here (1.25 s)
  outA: 5.85,                 // the station lets go
  retA: 6.0,                  // waypoints fold into the wire, far → near
  foldA: 6.02, foldB: 7.3     // the plan lies back down; the seam from here
};
const PLOT = i => 4.375 - (22 - i) * B / 4;          // S1 … S23 a 16th apart
const RET = i => T.retA + (22 - i) * 0.028;

// ── the shot list (process.dc.html, stage 02) ─────────────────────────────
const secs = s => { const [m, x] = s.split(':'); return +m * 60 + +x; };
const A1 = 50, KA = 6.4;                  // S1's distance along the plan; world units per second of film
const SETUPS = [
  ['0:00', '0:05'], ['0:05', '0:10'], ['0:10', '0:13'], ['0:13', '0:17'], ['0:17', '0:18'],
  ['0:18', '0:25'], ['0:25', '0:35'], ['0:35', '0:42'], ['0:42', '0:46'], ['0:46', '0:48'],
  ['0:48', '0:52'], ['0:52', '0:58'], ['0:58', '1:03'], ['1:03', '1:10'], ['1:10', '1:14'],
  ['1:14', '1:19'], ['1:19', '1:30'], ['1:30', '1:38'], ['1:38', '1:43'], ['1:43', '1:48'],
  ['1:48', '2:00'], ['2:00', '2:08'], ['2:08', '2:15']
].map(([a, b], i) => ({ lab: 'S' + (i + 1), tc: `${a}–${b}`, a: A1 + secs(a) * KA }));

const DOC = [
  { id: 'title', k: 'title', s: 'LAND OF HOPE — Shot by Shot', t: [1.36, 1.68] },
  { id: 'sub', k: 'sub', s: 'FULLY-LINKED STORYBOARD, ~2:10 FLAGSHIP MASTER', t: [1.68, 1.9] },
  { id: 'rule', k: 'rule', t: [1.9, 2.04] },
  { id: 'act', k: 'act', s: 'ACT I — AUREA · GOLDEN HOME (0:00–0:13)', t: [2.04, 2.38] },
  { id: 'h', k: 'h', s: 'S1 — AUREA AT PEACE (0:00–0:05, ≈5s, 1 shot)', t: [2.38, 2.72] },
  { id: 'VIS', k: 't', tag: 'VIS', s: 'Wide cinematic dawn establishing shot of a peaceful golden utopian homeworld waking under a soft golden-amber sky — vast crystalline-and-warm-stone tiered architecture, slender golden spires, hanging garden balconies, narrow waterfall channels, two pale distant moons. First warm sun crests horizon casting long warm-gold light shafts.', t: [2.72, 3.26] },
  { id: 'CAM', k: 't', tag: 'CAM', s: 'Slow push-in.', t: [3.26, 3.36] },
  { id: 'LGT', k: 't', tag: 'LGT', s: 'Warm directional sunrise key from horizon, soft drifting golden pollen, gentle volumetric haze.', t: [3.36, 3.54] },
  { id: 'AUD', k: 't', tag: 'AUD', s: 'Soft wind + distant chime; a single warm string note rises.', t: [3.54, 3.68] },
  { id: 'lk', k: 'lk', s: '→ LINK Slow dissolve → S2.', t: [3.68, 3.82] }
];
/* where the pane cannot hold the whole entry at a readable size it shows less of it, in this
   order: the subtitle and its rule, then LGT and AUD, then VIS cut to its first lines (closed
   with an ellipsis), then the act line; the head, the setup, CAM and the link always stay */
const LEAN = ['sub', 'rule'], BARE = ['sub', 'rule', 'LGT', 'AUD'];
const PLANS = [
  { drop: [] }, { drop: LEAN }, { drop: BARE },
  { drop: BARE, vis: 6 }, { drop: BARE, vis: 5 }, { drop: BARE, vis: 4 }, { drop: BARE, vis: 3 },
  { drop: BARE, vis: 2 }, { drop: [...BARE, 'act'], vis: 2 }
];
const LINE = 'The film exists on paper first.';

// ── the plan in the world ─────────────────────────────────────────────────
/* The plan is a line on the ground plane y = 0, in plan coordinates: a along
   it, b across it (b > 0 to its right). At eye level anything on the ground
   plane projects onto the horizon, so from the right place — beside the
   plan, level with it, looking across it so it vanishes just past the
   frame's right edge — the plan IS the seam: one straight line across the
   middle. Nothing morphs: the camera cranes up off the plane, turns down the
   plan and swings in over it, and the line opens into depth; flying on and
   swinging back out lays it flat again, the same line.
   World units: at depth 100 one unit is one S.u. */
const AMIN = -240, AMAX = 2700, D = 482;
// the plan comes round in one easy bend through the first act and then runs dead straight to its vanishing point
const pathB = a => 10 * (1 - Math.exp(-a / 280));
const camA = t => D * FLY(seg(t, T.flyA, T.flyB));

function view(S, g, t) {
  const p = t < 5.5 ? seg(t, T.liftA, T.liftB) : 1 - seg(t, T.foldA, T.foldB);
  const up = SWING(p), sway = SWAY(p);
  const ac = camA(t);
  const th = lerp(g.phi, g.th1, up);
  // a little bank as it swings in over the plan (and back out); none at rest
  const cam = camera(S, { zoom: 1, near: 0.5, cx: 0.5, cy: lerp(0.5, g.vpy, up), roll: -0.03 * Math.sin(Math.PI * sway) });
  return {
    t, p, up, ac, th, cam, c: Math.cos(th), s: Math.sin(th),
    h: g.hc * up, bc: lerp(g.B0, g.b1 + pathB(ac + 60), sway)
  };
}
/** the plan point at a (its bend comes in with the crane; at eye level it would not show anyway) */
function planAt(V, a) { return [a, pathB(a) * V.up, 0]; }
function proj(V, a, b, y) {
  const da = a - V.ac, db = b - V.bc;
  return V.cam.project(da * V.s + db * V.c, V.h + y, da * V.c - db * V.s);
}

// ── layout per frame size ─────────────────────────────────────────────────
let G = null;
function geo(S, ctx) {
  const key = S.W + 'x' + S.H + '@' + S.dpr;
  if (G && G.key === key) return G;
  const { W, H, u } = S, P = S.portrait;
  const tu = P ? Math.min(u * 1.75, H * 0.0095) : u;      // type unit: phones get larger type than 1/100 of their width
  const g = { key, P, tu };
  const wf = W / Math.min(W, H);                          // frame width in focal lengths
  g.hc = P ? 22 : 20;                                    // how high the camera cranes off the plan
  g.vpx = P ? 0.57 : 0.75; g.vpy = P ? 0.628 : 0.325;     // where the plan vanishes, once turned down it
  g.phi = Math.atan(0.6 * wf);                           // at rest the plan vanishes past the right edge
  g.th1 = Math.atan((g.vpx - 0.5) * wf);
  g.B0 = 60; g.b1 = P ? 4.5 : 9;                         // the camera's offset from the plan, at rest and in flight
  g.w0 = Math.max(1.5, 0.32 * u);                        // the seam wire's width
  // type meant to be read: k type units, never under 10 CSS px
  const rp = k => readPx(S, k * tu / u);
  const idxS = readPx(S, 1.45), chipS = readPx(S, 1.4);   // the stage index and the chip, on the other stations' scale
  const ms = rp(P ? 1.12 : 1.4);                          // the readout
  g.hudS = rp(1.02);                                      // MISSION CLOCK, SETUPS
  g.clockS = rp(1.32); g.slashS = rp(1.35);
  g.clockOff = Math.max(1.8 * tu, 1.3 * g.clockS);        // the clock's label, this far above its digits
  // the line keeps to one line: where the card is narrow it is set smaller
  const room = P ? 0.83 * W : 0.38 * W;
  ctx.save(); ctx.font = `700 100px 'Archivo', sans-serif`;
  const at100 = (ctx.measureText(LINE).width - 0.012 * 100 * (LINE.length - 1)) / 100;   // as kit's layout measures it
  ctx.restore();
  // (and never less than twice the chip: where the chip is at its floor, the line keeps its lead over it)
  const lineS = Math.min(Math.max((P ? 2.75 : 3.5) * tu, (P ? 1.8 : 2) * chipS), room / at100);
  /* the station's stack: each piece sits where the frame's proportions put it, or lower where the
     one above has grown to its readable size (a phone held sideways) */
  const stack = (x0, f, titleS, gaps) => {
    g.idx = { x: x0, y: f[0] * H, size: idxS };
    g.title = { x: x0 - 0.05 * tu, y: Math.max(f[1] * H, g.idx.y + 0.3 * idxS + 0.74 * titleS + gaps[0] * tu), size: titleS };
    g.chip = { x: x0, y: Math.max(f[2] * H, g.title.y + 0.24 * titleS + gaps[1] * tu), size: chipS };
    g.line = { x: x0, y: Math.max(f[3] * H, g.chip.y + 2.6 * chipS + gaps[2] * tu + 0.74 * lineS), size: lineS };
    return Math.max(f[4] * H, g.line.y + 0.26 * lineS + gaps[3] * tu);
  };
  if (!P) {
    const x0 = 0.064 * W;
    g.x0 = x0;
    g.card = { x: -0.04 * W, y: 0.13 * H, w: 0.475 * W, h: 1.0 * H, r: 2.6 * u };
    g.num = { x: 0.435 * W - 2.6 * u, y: 0.3 * H, size: 14 * tu };
    const py = stack(x0, [0.208, 0.312, 0.343, 0.458, 0.495], 6.8 * tu, [1.5, 0.9, 2.4, 2]);
    g.pane = { x: x0 - 1.7 * tu, y: py, w: 0.405 * W - (x0 - 1.7 * tu), h: 0 };
    g.clock = { x: 0.936 * W, y: 0.14 * H };
    g.count = { x: 0.936 * W, y: 0.845 * H };
  } else {
    const x0 = 0.08 * W;
    g.x0 = x0;
    // the clock's label keeps inside the text-safe band (its cap at ≥ 8 % of the height), the card clear below it
    g.clock = { x: 0.92 * W, y: Math.max(0.098 * H, 0.084 * H + g.clockOff + 0.76 * g.hudS) };
    g.card = { x: -0.05 * W, y: Math.max(0.122 * H, g.clock.y + 0.9 * g.clockS), w: 1.0 * W, h: 0.466 * H, r: 2.6 * tu };
    // where the clock pushed the card down (a short frame), its numeral comes with it
    g.num = { x: 0.9 * W, y: g.card.y + 0.09 * H, size: 9.6 * tu };
    const py = stack(x0, [0.163, 0.236, 0.254, 0.323, 0.352], 5.5 * tu, [1.2, 0.8, 2.2, 1.8]);
    g.pane = { x: x0 - 1.4 * tu, y: py, w: 0.9 * W - (x0 - 1.4 * tu), h: 0 };
    g.count = { x: 0.92 * W, y: 0.85 * H };
    // the plan fades into space over the frame's foot (alpha 1 at fade[0], 0 from fade[1])
    g.fade = [0.895 * H, 0.972 * H];
  }
  // the readout, wrapped to the pane: the whole entry if it fits, else the leanest plan that does
  const pad = Math.max(1.55 * tu, 1.1 * ms);
  const vpMax = 0.72, clear = 0.045 * H, below = 3.2 * tu;
  /* landscape: the last row's baseline stays in the text-safe band; upright: the card closes round
     the pane and the plan vanishes just below it, so the pane stops where the flight begins */
  const lim = P ? vpMax * H - clear - below - g.pane.y : 0.855 * H - g.pane.y + 0.6 * ms + pad;
  let lay;
  for (const plan of PLANS) { lay = wrap(ctx, g, S, ms, pad, plan); if (lay.need <= lim) break; }
  g.pane.h = Math.min(lay.need, lim);
  if (P) {
    g.card.h = g.pane.y + g.pane.h + below - g.card.y;
    g.vpy = clamp((g.card.y + g.card.h + clear) / H, 0.628, vpMax);
  }
  const { cw, rows, lh, small } = lay;
  const inner = g.pane.h - pad;
  for (const r of rows) r.scroll = Math.max(0, r.y + ms * 0.45 - inner);
  Object.assign(g, { ms, small, pad, cw, rows, lh });
  G = g;
  return g;
}

/** the readout's rows at monospace size ms, wrapped to the pane's width, for one plan (which fields
    it keeps, how many lines of VIS); the kept fields share the typing time the full entry had;
    need is the pane height that holds them all */
function wrap(ctx, g, S, ms, pad, plan) {
  ctx.save();
  ctx.font = `400 ${Math.round(ms)}px ${MONO}`;
  const cw = ctx.measureText('MMMMMMMMMM').width / 10;
  ctx.restore();
  const tw = g.pane.w - 2 * pad, cols = Math.max(20, Math.floor(tw / cw));
  const small = Math.max(ms * 0.86, 10 * S.dpr);          // the subtitle and the field tags: smaller, never under 10 CSS px
  const lh = ms * 1.55, rows = [];
  // the kept fields, each broken into lines
  const kept = [];
  for (const para of DOC) {
    if (plan.drop.includes(para.id)) continue;
    const dur = para.t[1] - para.t[0];
    if (para.k === 'rule') { kept.push({ para, lines: null, dur }); continue; }
    const ind = para.tag ? 5 : 0;
    const fit = para.k === 'sub' ? Math.max(20, Math.floor(tw / (cw * small / ms + 0.1 * small))) : cols;
    const words = para.s.split(' '), lines = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (next.length + ind > fit && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    if (cur) lines.push(cur);
    let share = 1;
    if (para.id === 'VIS' && plan.vis && lines.length > plan.vis) {
      const all = lines.reduce((n, l) => n + l.length, 0);
      lines.length = plan.vis;
      let last = lines[plan.vis - 1];
      while (last.length + 1 + ind > fit && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '));
      lines[plan.vis - 1] = last.replace(/[\s,;:—–-]+$/, '') + '…';
      share = lines.reduce((n, l) => n + l.length, 0) / all;
    }
    kept.push({ para, lines, ind, dur: dur * share });
  }
  const T0 = DOC[0].t[0], T1 = DOC[DOC.length - 1].t[1];
  const tk = (T1 - T0) / kept.reduce((n, p) => n + p.dur, 0);
  let y = pad + ms * 1.05, at = T0;
  for (const { para, lines, ind, dur } of kept) {
    const t0 = at, t1 = at + dur * tk;
    at = t1;
    if (para.k === 'rule') { y += lh * 0.1; rows.push({ k: 'rule', y: y - ms * 0.35, t0, t1, n: 1 }); y += lh * 0.55; continue; }
    if (para.k === 'act') y += lh * 0.2;
    const total = lines.reduce((n, l) => n + l.length, 0);
    let acc = 0;
    lines.forEach((l, i) => {
      const a = t0 + (t1 - t0) * acc / total; acc += l.length;
      const b = t0 + (t1 - t0) * acc / total;
      const big = para.k === 'title';
      rows.push({ k: para.k, s: l, tag: i === 0 ? para.tag : null, ind, y, t0: a, t1: b, n: l.length, size: big ? ms * 1.16 : para.k === 'sub' ? small : ms });
      y += big ? lh * 1.12 : lh;
    });
    if (para.k === 'title') y -= lh * 0.1;
    if (para.k === 'h') y += lh * 0.12;
  }
  return { ms, cw, lh, small, rows, need: rows[rows.length - 1].y + ms * 0.6 + pad };
}

// ── the node sprite: a chrome rim round a dark well, a lit core ─────────────
const NR = 30;
let SPRITE = null;
function sprite() {
  if (SPRITE) return SPRITE;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'), n = NR * 2 + 8;
  c.width = c.height = n;
  const x = c.getContext('2d'), o = n / 2;
  x.fillStyle = metal(x, o - NR, o - NR, o + NR, o + NR, 0.18, NR * 1.3);
  x.beginPath(); x.arc(o, o, NR, 0, Math.PI * 2); x.fill();
  const sh = x.createLinearGradient(0, o - NR, 0, o + NR);
  sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.5)');
  x.fillStyle = sh; x.fill();
  const well = x.createLinearGradient(0, o - NR * 0.66, 0, o + NR * 0.66);
  well.addColorStop(0, '#0a0a0c'); well.addColorStop(1, '#1d1d20');
  x.fillStyle = well; x.beginPath(); x.arc(o, o, NR * 0.64, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#f5f4f0'; x.beginPath(); x.arc(o, o, NR * 0.24, 0, Math.PI * 2); x.fill();
  SPRITE = c;
  return c;
}
/** the spark's head: a soft cold-white glow with a hot core */
let GLOW = null;
function glow() {
  if (GLOW) return GLOW;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'), n = 64, o = n / 2;
  c.width = c.height = n;
  const x = c.getContext('2d'), gr = x.createRadialGradient(o, o, 0, o, o, o);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(240,245,255,.85)');
  gr.addColorStop(0.35, 'rgba(174,203,255,.22)'); gr.addColorStop(1, 'rgba(174,203,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, n, n);
  GLOW = c;
  return c;
}

/** upright, the frame's foot: the plan is drawn again into this strip and faded out down it, so where the
    thread comes toward the camera it dissolves into space before the frame's edge (one strip, for the frame size) */
let BAND = null;
function band(S, g) {
  if (!g.fade) return null;
  if (BAND && BAND.key === g.key) return BAND;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'), y0 = Math.floor(g.fade[0]);
  c.width = S.W; c.height = Math.max(1, S.H - y0);
  const x = c.getContext('2d'), k = (g.fade[1] - y0) / c.height;
  const gr = x.createLinearGradient(0, 0, 0, c.height);
  for (let i = 0; i <= 8; i++) {               // smoothstep, 1 → 0
    const f = i / 8, a = 1 - f * f * (3 - 2 * f);
    gr.addColorStop(clamp(f * k), `rgba(0,0,0,${a.toFixed(4)})`);
  }
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  BAND = { key: g.key, c, x, y0, mask: gr };
  return BAND;
}

// ── drawing helpers ───────────────────────────────────────────────────────
/** monospace set a character at a time with tracking (em); returns its width */
function trackedMono(ctx, str, x, y, size, track, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 600} ${Math.round(size)}px ${MONO}`;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const cw = ctx.measureText('M').width, step = cw + track * size;
  const n = o.n ?? str.length, width = str.length * step - track * size;
  let cx = o.align === 'right' ? x - width : x;
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.fillStyle = o.color || UI.muted;
  for (let i = 0; i < Math.min(n, str.length); i++) { if (str[i] !== ' ') ctx.fillText(str[i], cx, y); cx += step; }
  ctx.restore();
  return width;
}

/** /process's chip, set in one run (letter-spacing) so small caps keep even spacing; kit3's chip where that is missing */
function chipRun(ctx, S, str, x, y, o = {}) {
  if (!('letterSpacing' in ctx)) return chip(ctx, S, str, x, y, o);
  const size = o.size, a = o.alpha ?? 1, up = str.toUpperCase();
  ctx.save();
  ctx.font = `700 ${Math.round(size)}px 'Archivo', sans-serif`;
  ctx.letterSpacing = `${(0.15 * size).toFixed(2)}px`;
  const tw = ctx.measureText(up).width - 0.15 * size;
  const pw = tw + size * 3.2, ph = size * 2.6;
  ctx.globalAlpha *= a;
  const g = ctx.createLinearGradient(x, y, x + pw, y + ph);
  g.addColorStop(0, 'rgba(245,244,240,.10)'); g.addColorStop(1, 'rgba(245,244,240,.03)');
  ctx.fillStyle = g; rrect(ctx, x, y, pw, ph, ph / 2); ctx.fill();
  ctx.strokeStyle = 'rgba(245,244,240,.22)'; ctx.lineWidth = Math.max(1, 0.08 * S.u); ctx.stroke();
  // set 4x up and scaled down: small sizes otherwise snap each advance to whole pixels
  ctx.translate(x + size * 1.6, y + ph / 2 + size * 0.36); ctx.scale(0.25, 0.25);
  ctx.font = `700 ${Math.round(size * 4)}px 'Archivo', sans-serif`;
  ctx.letterSpacing = `${(0.6 * size).toFixed(2)}px`;
  ctx.fillStyle = UI.ink; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillText(up, 0, 0);
  ctx.restore();
  return pw;
}

/** the thread as a ribbon: halo, dark tube, flowing chrome — at eye level the seam wire exactly, in depth its width follows distance */
function ribbon(ctx, S, g, V, phase, pulse, spark) {
  const near = 1.5, N = 150, span = AMAX - V.ac;
  const P = [];
  let prev = null;
  for (let j = -12; j <= N; j++) {
    // dense near the camera, sparse far down the plan
    const a = j < 0 ? V.ac + (AMIN - V.ac) * (-j / 12) : V.ac + span * Math.pow(j / N, 2.3);
    const w = planAt(V, a), da = a - V.ac, db = w[1] - V.bc, z = da * V.c - db * V.s;
    if (z < near) { prev = [w, z]; continue; }
    if (prev && !P.length) {
      const k = (near - prev[1]) / (z - prev[1]);
      const q = proj(V, lerp(prev[0][0], w[0], k), lerp(prev[0][1], w[1], k), lerp(prev[0][2], w[2], k));
      if (q) P.push({ x: q.x, y: q.y, d: Math.max(near, q.d), a: lerp(prev[0][0], w[0], k) });
    }
    const q = proj(V, w[0], w[1], w[2]);
    if (q) P.push({ x: q.x, y: q.y, d: q.d, a });
  }
  if (P.length < 2) return;
  const n = P.length, L = [], R = [], Wd = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const w = g.w0 * lerp(1, Math.pow(clamp(100 / P[i].d, 0.2, 2.6), 0.9), V.up);
    L.push([P[i].x - ty * w, P[i].y + tx * w]); R.push([P[i].x + ty * w, P[i].y - tx * w]); Wd.push(w);
  }
  const poly = f => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const q = L[i], p = P[i]; ctx.lineTo(p.x + (q[0] - p.x) * f, p.y + (q[1] - p.y) * f); }
    for (let i = n - 1; i >= 0; i--) { const q = R[i], p = P[i]; ctx.lineTo(p.x + (q[0] - p.x) * f, p.y + (q[1] - p.y) * f); }
    ctx.closePath();
  };
  ctx.save();
  poly(2.5); ctx.fillStyle = `rgba(245,244,240,${(0.07 * (1 + pulse)).toFixed(4)})`; ctx.fill();   // halo (5 widths)
  poly(0.8); ctx.fillStyle = '#1b1b1e'; ctx.fill();                          // the dark tube (1.6)
  // the chrome: the seam's gradient, its axis turning to run up the plan
  const m = V.up, vx = g.vpx * S.W, vy = g.vpy * S.H;
  const x0 = lerp(0, vx, m), y0 = lerp(0, S.H, m), x1 = lerp(S.W, vx, m), y1 = lerp(S.H * 0.35, vy, m);
  poly(0.5); ctx.fillStyle = metal(ctx, x0, y0, x1, y1, phase, lerp(26, 17, m) * S.u); ctx.fill();
  // the lock: a spark runs down the wire from the last setup to the camera, its tail trailing back up the plan
  if (spark && spark.amp > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const { len, tail } = spark;
    let head = null;
    for (let i = 0; i < n - 1; i++) {
      const A = P[i], Bp = P[i + 1];
      if (!head && A.a <= spark.a && Bp.a > spark.a) {
        const k = (spark.a - A.a) / (Bp.a - A.a);
        head = [lerp(A.x, Bp.x, k), lerp(A.y, Bp.y, k), lerp(Wd[i], Wd[i + 1], k)];
      }
      const da = (A.a + Bp.a) / 2 - spark.a;
      if (da < -len || da > tail) continue;
      const k = spark.amp * (da < 0 ? Math.exp(-4 * (da / len) ** 2) : Math.exp(-2.4 * da / tail));
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(Bp.x, Bp.y);
      ctx.strokeStyle = `rgba(174,203,255,${(0.28 * k).toFixed(3)})`;
      ctx.lineWidth = Math.max(4, 4 * Wd[i]); ctx.stroke();
      ctx.strokeStyle = `rgba(240,245,255,${(0.95 * k).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.6, 1.2 * Wd[i]); ctx.stroke();
    }
    const gl = glow();
    if (head && gl) {
      const s = Math.max(2.4 * S.u, 6 * head[2]);
      ctx.globalAlpha = spark.amp;
      ctx.drawImage(gl, head[0] - s, head[1] - s, 2 * s, 2 * s);
    }
  }
  ctx.restore();
}

// ── the waypoints ─────────────────────────────────────────────────────────
/** every setup that is on: where it is, where its label sits and how much of it shows */
function waypoints(S, g, V) {
  const t = V.t, u = S.u, tu = g.tu, dpr = S.dpr;
  const N = [];
  for (let i = 0; i < 23; i++) {
    const W = SETUPS[i], age = t - PLOT(i);
    if (age < 0) continue;
    const ret = 1 - inCubic(seg(t, RET(i), RET(i) + 0.22));
    if (ret <= 0) continue;
    const w = planAt(V, W.a), p = proj(V, w[0], w[1], w[2]);
    if (!p || p.d < 6) continue;
    if (p.x < -12 * u || p.x > S.W + 12 * u || p.y > S.H + 8 * u) continue;
    const kk = p.k / u;                                      // 1 at the reference depth
    const r = clamp(kk, 0.26, 2.6) * u, sc = clamp(kk, 0.3, 1.3);
    /* labels fly to the left of their stems: the plan leans right, so up-left of a node is clear of the ones beyond it.
       They grow with nearness; the near ones read (the setup ≥ 13, its timecode ≥ 10 CSS px), the far ones are
       telemetry (never under 7) */
    const rd = clamp((sc - 0.6) / 0.4);
    const sz = Math.max((g.P ? 1.36 : 1.62) * tu * sc, lerp(7, 13, rd) * dpr), ts = Math.max(0.7 * sz, lerp(7, 10, rd) * dpr);
    const stem = 4.6 * sc * tu * (g.P ? 0.84 : 1) * outCubic(seg(age, 0.04, 0.3));
    const top = p.y - r * 0.9 - stem, lb = top + sz * 0.62, tb = lb + 0.3 * sz + ts, bot = tb + 0.37 * ts;
    const la = clamp((sc - 0.5) / 0.16) * outCubic(seg(age, 0.06, 0.34)) * (1 - seg(t, T.outA + (22 - i) * 0.012, T.outA + 0.3 + (22 - i) * 0.012));
    const edge = clamp((0.875 * S.H - bot) / (0.05 * S.H));     // annotations let go before the bottom band
    const wide = Math.max(sz * 4.6, ts * 5.6 + sz * 0.72);
    N.push({ i, W, age, ret, p, r, sz, ts, lb, tb, stem, top, la: la * edge, box: [p.x - wide, top - sz * 0.15, p.x, bot] });
  }
  /* a label only shows where it has room: setups tick on at the far end on top of each other, so
     each label gives way to the nearer labels below it and comes in as the flight opens the spacing */
  /* (it gives way to a nearer label's own presence, not to what is left of it after that one gave way:
     two labels that overlap never both show, even faintly — the farther one waits a step longer; and it
     waits until the nearer one has all but gone, so a hand-off dips through nothing rather than crossing) */
  const near = [];
  for (const n of N) {
    if (n.la <= 0.01) continue;
    const own = n.la, [x0, y0, x1, y1] = n.box;
    for (const q of near) {
      const gap = Math.max(q.box[1] - y1, y0 - q.box[3], q.box[0] - x1, x0 - q.box[2]);
      n.la *= 1 - clamp(q.own / 0.4) * (1 - clamp(gap / (0.5 * n.sz)));
    }
    near.push({ own, box: n.box });
  }
  return N;
}

/** draw the waypoints far → near; from y0 down only (the frame's foot, drawn again to fade it) */
function drawWaypoints(ctx, S, g, V, N, y0 = -Infinity) {
  const t = V.t, spr = sprite(), u = S.u;
  // labels step back with the rest of the station when the line lands
  const hush = 1 - 0.5 * seg(t, T.line, T.line + 0.43, inOutCubic);
  for (let j = N.length - 1; j >= 0; j--) {
    const { i, W, age, ret, p, r, sz, ts, lb, tb, top } = N[j];
    if (p.y + 10.5 * Math.max(r, 0.55 * u) < y0) continue;
    const fog = 1 - 0.78 * clamp((p.d - 300) / 700);
    const pop = outBack(clamp(age / 0.32), 2.2) * ret;
    ctx.save();
    ctx.globalAlpha = fog;
    // the ping as it ticks on; the last one, the lock, rings wide
    const last = i === 22, pa = age / (last ? 0.6 : 0.55);
    if (pa < 1) {
      const rr = last ? Math.max(r, 0.55 * u) * 2.6 : r;
      ctx.strokeStyle = `rgba(245,244,240,${(last ? 0.8 : 0.5) * (1 - pa) * (1 - pa)})`;
      ctx.lineWidth = Math.max(1, (last ? 0.16 : 0.1) * u);
      ctx.beginPath(); ctx.arc(p.x, p.y, rr * (1.3 + 2.6 * outCubic(pa)), 0, Math.PI * 2); ctx.stroke();
    }
    // the label on its stem
    const la = N[j].la * hush;
    if (la > 0.01) {
      const tx = p.x - sz * 0.72;
      ctx.globalAlpha = fog * la;
      ctx.strokeStyle = 'rgba(245,244,240,.34)'; ctx.lineWidth = Math.max(1, 0.08 * u);
      ctx.beginPath(); ctx.moveTo(p.x, p.y - r * 0.9); ctx.lineTo(p.x, top); ctx.lineTo(p.x - sz * 0.5, top); ctx.stroke();
      ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.font = `700 ${sz.toFixed(1)}px 'Archivo', sans-serif`; ctx.fillStyle = UI.ink;
      ctx.fillText(W.lab, tx, lb);
      ctx.font = `400 ${ts.toFixed(1)}px ${MONO}`; ctx.fillStyle = UI.muted;
      ctx.fillText(W.tc, tx, tb);
      ctx.globalAlpha = fog;
    }
    // the node
    if (spr && pop > 0.01) {
      const rr = r * pop, flash = 1 - clamp(age / (last ? 0.5 : 0.3));
      if (flash > 0) { ctx.fillStyle = `rgba(245,244,240,${(last ? 0.4 : 0.22) * flash})`; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(rr, last ? 0.5 * u : 0) * 2.1, 0, Math.PI * 2); ctx.fill(); }
      const k = rr / NR;
      ctx.drawImage(spr, p.x - (NR + 4) * k, p.y - (NR + 4) * k, (2 * NR + 8) * k, (2 * NR + 8) * k);
    }
    ctx.restore();
  }
}

// ── the HUD ───────────────────────────────────────────────────────────────
function corners(ctx, S, a) {
  if (a <= 0) return;
  const { W, H, u } = S, m = 3.2 * u, l = 2.2 * u * a;
  ctx.save();
  ctx.strokeStyle = `rgba(245,244,240,${0.3 * a})`; ctx.lineWidth = Math.max(1, 0.1 * u);
  ctx.beginPath();
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.moveTo(x, y + sy * l); ctx.lineTo(x, y); ctx.lineTo(x + sx * l, y);
  }
  ctx.stroke();
  ctx.restore();
}

function clock(ctx, S, g, a) {
  if (a <= 0) return;
  const { x, y } = g.clock;
  trackedMono(ctx, 'MISSION CLOCK', x, y - g.clockOff, g.hudS, 0.22, { align: 'right', color: UI.faint, alpha: a, weight: 600 });
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.font = `500 ${Math.round(g.clockS)}px ${MONO}`;
  ctx.textAlign = 'right'; ctx.fillStyle = UI.ink;
  ctx.fillText(stamp(S.t), x, y);
  ctx.restore();
}

/** the setups counter: a two-digit odometer; val is continuous 0…23 */
function counter(ctx, S, g, val, a, lock = 0) {
  if (a <= 0) return;
  const tu = g.tu, { x, y } = g.count, size = (g.P ? 4.2 : 5.2) * tu;
  ctx.save();
  ctx.globalAlpha *= a;
  const slash = '/ 23', ss = g.slashS;
  ctx.font = `600 ${Math.round(ss)}px 'Archivo', sans-serif`;
  const sw = ctx.measureText(slash).width;
  ctx.textAlign = 'right'; ctx.fillStyle = lock > 0.01 ? `rgba(245,244,240,${lerp(0.42, 1, lock).toFixed(3)})` : UI.faint; ctx.fillText(slash, x, y);
  ctx.font = `800 ${Math.round(size)}px 'Archivo', sans-serif`;
  let cell = 0;
  for (let d = 0; d < 10; d++) cell = Math.max(cell, ctx.measureText(String(d)).width);
  const right = x - sw - 0.7 * tu, left = right - 2 * cell, capH = size * 0.74;
  trackedMono(ctx, 'SETUPS', left + 0.1 * tu, y - capH - Math.max(1.1 * tu, 0.45 * g.hudS), g.hudS, 0.24, { color: UI.faint, weight: 600 });
  // the lock: a bloom of light behind the full count
  const gl = lock > 0.01 && glow();
  if (gl) {
    ctx.save();
    ctx.globalAlpha *= 0.4 * lock; ctx.globalCompositeOperation = 'lighter';
    const cx = left + cell, cy = y - capH / 2, rx = 2.2 * cell, ry = 1.5 * capH;
    ctx.drawImage(gl, cx - rx, cy - ry, 2 * rx, 2 * ry);
    ctx.restore();
  }
  // the odometer
  const ones = ((val % 10) + 10) % 10, tens = Math.floor(val / 10) + (ones > 9 ? ones - 9 : 0);
  const row = size * 1.02;
  ctx.beginPath(); ctx.rect(left - 0.3 * tu, y - capH - 0.25 * tu, 2 * cell + 0.6 * tu, capH + 0.5 * tu); ctx.clip();
  ctx.textAlign = 'center'; ctx.fillStyle = UI.ink;
  [[tens, left + cell / 2], [ones, left + cell * 1.5]].forEach(([v, cx]) => {
    const f = Math.floor(v), fr = v - f;
    ctx.fillText(String(((f % 10) + 10) % 10), cx, y - fr * row);
    if (fr > 0.001) ctx.fillText(String((f + 1) % 10), cx, y + (1 - fr) * row);
  });
  ctx.restore();
}

// ── the station: card, title, numeral, chip, the line ──────────────────────
function cardRim(ctx, S, g, p, q, fill, phase) {
  const { x, y, w, h, r } = g.card;
  if (fill > 0) {
    ctx.save();
    ctx.globalAlpha *= fill;
    // the soft glow round the card: one wide, faint stroke (cheaper than stacked fills)
    ctx.strokeStyle = 'rgba(245,244,240,.045)'; ctx.lineWidth = 2.6 * S.u;
    rrect(ctx, x, y, w, h, r); ctx.stroke();
    ctx.strokeStyle = 'rgba(245,244,240,.04)'; ctx.lineWidth = 1.2 * S.u; ctx.stroke();
    const gr = ctx.createLinearGradient(0, y, 0, y + Math.min(h, S.H));
    gr.addColorStop(0, 'rgba(24,24,22,.94)'); gr.addColorStop(0.6, 'rgba(20,20,18,.94)'); gr.addColorStop(1, 'rgba(20,20,18,.94)');
    ctx.fillStyle = gr; rrect(ctx, x, y, w, h, r); ctx.fill();
    ctx.restore();
  }
  if (p <= q) return;
  // the rim traced from off-frame left, round the corner, down (and back along the bottom on a phone);
  // it lets go from the same end, so its last piece leaves off the frame's edge
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x, y + h);
  const len = 2 * w + h;
  ctx.setLineDash([len * (p - q), len * 3]); ctx.lineDashOffset = -len * q;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(245,244,240,.08)'; ctx.lineWidth = Math.max(3, 0.7 * S.u); ctx.stroke();
  ctx.strokeStyle = metal(ctx, x, y, x + w, y + h * 0.5, phase, Math.max(80, (w + h) / 3.2));
  ctx.lineWidth = Math.max(1.2, 0.2 * S.u); ctx.stroke();
  ctx.restore();
}

function station(ctx, S, g, t, phase) {
  const tu = g.tu;
  // leaving, in order: the line, the pane (see readout), the title block, the card
  const gone = seg(t, T.outA + 0.13, T.outA + 0.45, inCubic);
  const rim = seg(t, T.cardA, T.cardB, bezier(0.7, 0, 0.2, 1)), rimOut = seg(t, T.lineOut + 0.03, T.lineOut + 0.45, bezier(0.6, 0, 0.3, 1));
  const fill = seg(t, T.cardA + 0.12, T.cardB, outCubic) * (1 - seg(t, T.lineOut + 0.08, T.lineOut + 0.38, inOutCubic));
  cardRim(ctx, S, g, rim, rimOut, fill * 0.96, phase);
  // the numeral, in the card's corner
  // when the line lands the station steps back round it: the numeral to 60 %, the title a little
  const hush = seg(t, T.line, T.line + 0.43, inOutCubic);
  const na = seg(t, T.cardA + 0.25, T.cardB + 0.15, outCubic) * (1 - gone);
  if (na > 0) numeral(ctx, S, '02', g.num.x, g.num.y + (1 - na) * 1.2 * tu, g.num.size, { alpha: na * (1 - 0.4 * hush), metal: true, phase: phase * 0.5 });
  // the index types on
  const idx = 'STAGE 02 OF 06', ni = Math.round(seg(t, T.idx, T.idx + 0.36) * idx.length * (1 - seg(t, T.outA + 0.12, T.outA + 0.36)));
  if (ni > 0) trackedMono(ctx, idx, g.idx.x, g.idx.y, g.idx.size, 0.34, { n: ni, color: '#c9c7bf', weight: 700 });
  // the title rises out of its sill
  // (in and out both run left to right: out, the reveal falls with the order reversed)
  const tIn = seg(t, T.title, T.title + 0.7), tOut = seg(t, T.outA + 0.12, T.outA + 0.44);
  if (tIn > 0 && tOut < 1) {
    const ts = g.title.size;
    const gr = ctx.createLinearGradient(0, g.title.y - ts * 0.76, 0, g.title.y);
    gr.addColorStop(0, '#f7f6f2'); gr.addColorStop(1, '#a9a79f');
    text(ctx, S, 'Shot by Shot', g.title.x, g.title.y, {
      size: ts, weight: 800, tracking: -0.028, color: gr, mask: true, ease: outQuart, alpha: 1 - 0.22 * hush,
      ...(tOut > 0 ? { reveal: 1 - tOut, window: 0.6, order: 'reverse' } : { reveal: tIn, window: 0.55 })
    });
  }
  // the chip
  const ca = seg(t, T.chip, T.chip + 0.3, outCubic) * (1 - gone);
  if (ca > 0) chipRun(ctx, S, 'Claude', g.chip.x - (1 - ca) * 1.2 * tu, g.chip.y, { size: g.chip.size, alpha: ca });
  // the line
  const lIn = seg(t, T.line, T.line + 0.43), lOut = seg(t, T.lineOut, T.lineOut + 0.2);
  if (lIn > 0 && lOut < 1) {
    const o = { size: g.line.size, weight: 700, tracking: -0.012, color: UI.ink, mask: true, ease: outQuart };
    text(ctx, S, LINE, g.line.x, g.line.y, lOut > 0 ? { ...o, reveal: 1 - lOut, window: 0.6, order: 'reverse' } : { ...o, reveal: lIn, window: 0.5 });
  }
}

// ── the readout ───────────────────────────────────────────────────────────
function readout(ctx, S, g, t) {
  const pn = g.pane, tu = g.tu;
  const wOpen = seg(t, T.pane, T.pane + 0.2, OPEN), hOpen = seg(t, T.pane + 0.1, T.pane + 0.42, OPEN);
  const close = seg(t, T.outA + 0.04, T.outA + 0.34, bezier(0.6, 0, 0.3, 1));    // the pane shuts upward over its text
  const lineGo = seg(t, T.outA + 0.28, T.outA + 0.46, inQuad);
  if (wOpen <= 0 || lineGo >= 1) return;
  const h = Math.max(1, pn.h * hOpen * (1 - close)), y = pn.y;
  const w = pn.w * wOpen * (1 - lineGo), x = pn.x;
  ctx.save();
  ctx.globalAlpha *= 1 - lineGo;
  // the pane: /process's glass
  const r = Math.min(1.6 * tu, h / 2);
  ctx.fillStyle = 'rgba(255,255,255,.05)'; rrect(ctx, x, y, w, h, r); ctx.fill();
  ctx.fillStyle = 'rgba(8,8,10,.55)'; ctx.fill();
  ctx.strokeStyle = 'rgba(245,244,240,.15)'; ctx.lineWidth = Math.max(1, 0.1 * S.u); ctx.stroke();
  if (h > 4) { ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = Math.max(1, 0.16 * S.u); ctx.beginPath(); ctx.moveTo(x + r, y + 1.5); ctx.lineTo(x + w - r, y + 1.5); ctx.stroke(); }
  // the text (it steps back when the line lands: the line is the one thing to read)
  const ta = (1 - seg(t, T.outA + 0.16, T.outA + 0.3)) * (1 - 0.55 * seg(t, T.line, T.line + 0.43, inOutCubic));
  if (ta > 0 && h > 6) {
    ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();
    let scroll = 0;
    for (const rw of g.rows) if (rw.scroll > 0) scroll = Math.max(scroll, rw.scroll * seg(t, rw.t0 - 0.05, rw.t0 + 0.14, outCubic));
    scroll *= 1 - seg(t, T.cardA + 0.2, T.cardB + 0.1, inOutCubic);      // where it ran long, the list settles back to its head as the card closes
    const px = x + g.pad, top = y - scroll;
    let caret = null;
    ctx.globalAlpha *= ta;
    for (const rw of g.rows) {
      if (t < rw.t0) break;
      const ry = top + rw.y;
      // lines fade as they scroll out of the top, and a line the pane's foot would cut is let go entirely
      if (ry < y || ry + 0.3 * g.ms > y + h) continue;
      const edge = clamp((ry - y - g.ms * 0.2) / (g.lh * 1.2)) * clamp((y + h - ry - 0.3 * g.ms) / (0.5 * g.lh));
      if (edge <= 0.004) continue;
      const n = Math.floor(seg(t, rw.t0, rw.t1) * rw.n);
      ctx.save();
      ctx.globalAlpha *= edge;
      if (rw.k === 'rule') {
        ctx.strokeStyle = 'rgba(245,244,240,.14)'; ctx.lineWidth = Math.max(1, 0.08 * S.u);
        ctx.beginPath(); ctx.moveTo(px, ry); ctx.lineTo(px + (w - 2 * g.pad) * seg(t, rw.t0, rw.t1, outCubic), ry); ctx.stroke();
        ctx.restore(); continue;
      }
      const str = rw.s.slice(0, n);
      if (rw.k === 'sub') {
        trackedMono(ctx, rw.s, px, ry, rw.size, 0.1, { n, color: UI.faint, weight: 500 });
      } else {
        const heavy = rw.k === 'title' || rw.k === 'act' || rw.k === 'h';
        ctx.font = `${heavy ? 700 : 400} ${Math.round(rw.size)}px ${MONO}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = rw.k === 'title' ? UI.ink : rw.k === 'act' ? '#e9e7e0' : rw.k === 'h' ? '#d9d7cf' : rw.k === 'lk' ? UI.faint : UI.muted;
        const tx = px + rw.ind * g.cw;
        if (rw.tag) {
          // the field tag, boxed as on /process
          const bw = g.cw * 3 * g.small / g.ms + 0.9 * g.ms, bh = g.ms * 1.3;
          ctx.save();
          ctx.fillStyle = 'rgba(245,244,240,.09)'; rrect(ctx, px - 0.3 * g.ms, ry - g.ms * 0.98, bw, bh, 0.3 * g.ms); ctx.fill();
          ctx.strokeStyle = 'rgba(245,244,240,.2)'; ctx.lineWidth = Math.max(1, 0.06 * S.u); ctx.stroke();
          ctx.font = `700 ${Math.round(g.small)}px ${MONO}`; ctx.fillStyle = UI.ink;
          ctx.fillText(rw.tag, px + 0.15 * g.ms, ry - g.ms * 0.06);
          ctx.restore();
        }
        ctx.fillText(str, tx, ry);
        if (n < rw.n || (rw === g.rows[g.rows.length - 1])) caret = [tx + ctx.measureText(str).width, ry, rw.size];
      }
      ctx.restore();
    }
    // the caret: solid while typing, blinking on the 8ths once it is done
    if (caret) {
      const done = t > g.rows[g.rows.length - 1].t1;
      if (!done || Math.floor((t - 3.82) / (B / 2)) % 2 === 0) {
        ctx.fillStyle = UI.ink;
        ctx.fillRect(caret[0] + caret[2] * 0.12, caret[1] - caret[2] * 0.82, caret[2] * 0.56, caret[2] * 0.98);
      }
    }
  }
  ctx.restore();
}

// ── the chapter ───────────────────────────────────────────────────────────
export default {
  id: 'shots',
  title: 'Shot by shot',
  caption: 'Station 02: the chrome thread tips into a flight plan of the film\'s 23 setups, each a waypoint at its own timecode — the film exists on paper first.',
  assets: [],
  models: [],
  still: 5.0,
  sfx: [
    { at: 0.12, type: 'whoosh', gain: 0.45 },
    ...SETUPS.map((_, i) => ({ at: +PLOT(i).toFixed(4), type: 'tick', gain: i === 22 ? 0.4 : 0.16 + (i % 4 === 2 ? 0.08 : 0) })),
    { at: 3.6, type: 'glitch', gain: 0.18 },
    { at: 4.375, type: 'impact', gain: 0.55 },
    { at: 4.375, type: 'sub', gain: 0.45 },
    { at: 6.0, type: 'whoosh', gain: 0.35 }
  ],
  prepare(S) {
    // the node sprite and this frame size's layout (measured on a scratch context), so nothing is built on the cut
    sprite(); glow();
    // (only once the type is in: the layout measures it)
    const fontsIn = typeof document !== 'undefined' && document.fonts && document.fonts.check("700 40px 'Archivo'");
    if (fontsIn && S.W) band(S, geo(S, document.createElement('canvas').getContext('2d')));
  },
  draw(ctx, S) {
    const t = S.lt;
    if (t < T.seam || t >= T.foldB) { seam(ctx, S); return; }
    const g = geo(S, ctx);
    const V = view(S, g, t);
    const phase = 2 * inOutSine(seg(t, T.seam, T.foldB));
    const back = seg(t, T.foldA, T.foldB, inOutCubic);

    // the stars: they pan with the turn, lift with the crane and open out as the camera flies
    // (no warp streaks: this is a cruise, not a jump — and a streaked field costs a stroke a star)
    const turn = (g.phi - V.th) / (g.phi - g.th1 || 1);
    space(ctx, S, { x: -0.1 * turn, y: -0.05 * V.up, zoom: 1 + 0.26 * (V.ac / D) * (1 - back) });

    // the halo breathes on the beat while the plan is up (never at the ends)
    const beat = (t % B) / B, pulse = 0.9 * Math.exp(-beat * 5) * seg(t, 0.9, 1.4) * (1 - seg(t, 5.4, 6.0));
    // S23 locks on beat 7: a spark leaves it and runs the wire down to the camera, gathering speed
    // (it moves evenly in 1/distance, so evenly down the frame, and leaves off the bottom edge)
    const lk = seg(t, T.line, T.line + 0.46);
    let spark = null;
    if (lk > 0 && lk < 1) {
      const dz = 1 / lerp(1 / (SETUPS[22].a - V.ac), 1 / 16, Math.pow(lk, 1.45));      // (the wire leaves the frame at about 30)
      spark = { a: V.ac + dz, len: 3 + 0.06 * dz, tail: 6 + 0.4 * dz, amp: clamp(lk / 0.05) * (1 - seg(lk, 0.88, 1)) };
    }
    const N = waypoints(S, g, V), foot = band(S, g);
    if (foot) {
      // upright: the plan down to the frame's foot as it is, the foot itself faded into space
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, S.W, foot.y0); ctx.clip();
      ribbon(ctx, S, g, V, phase, pulse, spark);
      drawWaypoints(ctx, S, g, V, N);
      ctx.restore();
      const b = foot.x;
      b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
      b.clearRect(0, 0, foot.c.width, foot.c.height);
      b.setTransform(1, 0, 0, 1, 0, -foot.y0);
      ribbon(b, S, g, V, phase, pulse, spark);
      drawWaypoints(b, S, g, V, N, foot.y0);
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.globalCompositeOperation = 'destination-in'; b.fillStyle = foot.mask; b.fillRect(0, 0, foot.c.width, foot.c.height);
      b.globalCompositeOperation = 'source-over';
      ctx.drawImage(foot.c, 0, foot.y0);
    } else {
      ribbon(ctx, S, g, V, phase, pulse, spark);
      drawWaypoints(ctx, S, g, V, N);
    }

    // the HUD
    const hud = seg(t, T.hud, T.hud + 0.6, outCubic) * (1 - seg(t, T.retA + 0.55, T.retA + 1.0));
    corners(ctx, S, hud);
    clock(ctx, S, g, seg(t, T.hud + 0.15, T.hud + 0.6, outCubic) * (1 - seg(t, T.outA, T.outA + 0.4)));
    let val = 0;
    for (let i = 0; i < 23; i++) val += seg(t, PLOT(i), PLOT(i) + 0.11, outCubic) - seg(t, RET(i), RET(i) + 0.11, outCubic);
    const lock = seg(t, T.line + 0.05, T.line + 0.1) * (1 - seg(t, T.line + 0.12, T.line + 0.5, outCubic));
    counter(ctx, S, g, val, seg(t, T.hud + 0.3, T.hud + 0.8, outCubic) * (1 - seg(t, RET(0) - 0.1, RET(0) + 0.2)), lock);

    station(ctx, S, g, t, phase);
    readout(ctx, S, g, t);

    // the lens: a breath of aberration as the last setup locks
    if (t >= T.line && t < T.line + 0.45) S.fx.ab = 0.28 * Math.pow(1 - seg(t, T.line, T.line + 0.45), 2);
  }
};
