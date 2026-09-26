/* 5 — Four more cuts.

   The thread becomes a blade. The rest line tilts, a glint runs down its
   edge, and on the beat the frame falls apart along it: the two halves slide
   off each other and the next brand film is underneath. Between slashes the
   blade lies sheathed as the gold rule under the film's title, trembles for
   the last beat of the bar, then whips out across the frame again. Four
   films, four slashes, and a fifth that cuts the last film away and lets the
   blade fall back flat into the rest line.

   Beats (local): 0.625 first slash · 2.5 / 5 / 7.5 slashes on the downbeats
   · 9.375 the last slash · rest by 9.9. */
import {
  PAL, FONT, clamp, lerp, invlerp, seg, rng, noise1, TAU,
  outExpo, outCubic, inOutCubic, bezier, whip,
  cover, thread, rest, text, measure, layout
} from '../kit.js';

// ── the score ─────────────────────────────────────────────────────────────
const CUT = [0.625, 2.5, 5, 7.5, 9.375];      // the five slashes
const IN = 0.08, OUT = 9.9;                    // pure rest outside these
const SLIDE = 0.44;                            // how long the halves take to leave
const CREDIT = ['STORY,', ' VISUALS, EDIT,', ' VO AND MUSIC:', ' ONE PERSON.'];
const CREDIT_T = [1.875, 3.75, 6.25, 8.125];   // one phrase of the credit per film, on a beat

// ── colour ────────────────────────────────────────────────────────────────
const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const C = {
  bg: rgb(PAL.bg), ink: rgb(PAL.ink), gold: rgb(PAL.gold), goldHi: rgb(PAL.goldHi),
  amber: rgb(PAL.amber), steel: rgb(PAL.steel), blossom: rgb(PAL.blossom), ember: rgb(PAL.ember),
  sun: rgb('#f2b35c'), parch: rgb('#e4cc98'), white: [255, 255, 255]
};

// ── the four films ────────────────────────────────────────────────────────
const FILMS = [
  {
    img: 'assets/ccats.jpg', kick: 'OG10 ORIGIN', rt: '3:37',
    title: ['CCATS'],
    log: ['A factory cat, a coffee-powered idea,', 'a city saved.'],
    L: { fx: 0, fy: 0.4, z: 1.16 }, P: { fx: 0.13, fy: 0.4, z: 1 }, pan: 1, motes: 'ember', grade: ['color', 0.42]
  },
  {
    img: 'assets/og10.jpg', kick: 'TEASER', rt: '1:14',
    title: ['OG10', 'ARE BACK'],
    log: ['Ten characters walk off the page.'],
    L: { fx: 1, fy: 0.55, z: 1 }, P: { fx: 0.9, fy: 0.5, z: 1 }, pan: -1, motes: 'dust', grade: ['overlay', 0.24]
  },
  {
    img: 'assets/sket.jpg', kick: 'OG10 ORIGIN', rt: '4:22',
    title: ['SKET'],
    log: ['A student’s gi, a moonlit road,', 'the armor he came back for.'],
    L: { fx: 0.02, fy: 0.35, z: 1.08 }, P: { fx: 0.09, fy: 0.35, z: 1 }, pan: 1, motes: 'petal', grade: ['color', 0.3]
  },
  {
    img: 'assets/bounty-board.jpg', kick: 'COMMUNITY', rt: '1:13',
    title: ['BOUNTY', 'BOARD'],
    log: ['Pick a platform, share the heroes,', 'earn your reward.'],
    L: { fx: 0.5, fy: 0.45, z: 1 }, P: { fx: 1, fy: 0.45, z: 1 }, pan: -1, motes: 'speck', grade: ['soft-light', 0.4]
  }
];

/** each film's colour script, sampled at film-time ft */
function scriptAt(k, ft) {
  if (k === 0) {
    // amber → steel blue → donut-shop pink → inferno, one grade per beat
    const K = [[0, C.amber], [0.625, C.steel], [0.9375, C.blossom], [1.25, C.ember]];
    let c = K[0][1];
    for (let i = 1; i < K.length; i++) { const p = seg(ft, K[i][0], K[i][0] + 0.09, outCubic); if (p > 0) c = mixc(c, K[i][1], p); }
    return c;
  }
  if (k === 1) return C.sun;
  if (k === 2) return mixc(C.blossom, C.ember, seg(ft, 0.55, 2.3, inOutCubic));
  return C.parch;
}

// ── easing of our own ─────────────────────────────────────────────────────
/** in-out with a breath of anticipation and a small overshoot: the rest line leaning into the slash */
const tiltE = p => {
  const c = 1.70158 * 1.15;
  return p < 0.5 ? (Math.pow(2 * p, 2) * ((c + 1) * 2 * p - c)) / 2
    : (Math.pow(2 * p - 2, 2) * ((c + 1) * (p * 2 - 2) + c) + 2) / 2;
};
/** a damped settle that overshoots once and lands exactly on 1 at p = 1 */
const settle = p => 1 - Math.exp(-3.2 * p) * Math.cos(TAU * 1.1 * p) * (1 - p);
const SLIDE_E = bezier(0.36, 0, 0.16, 1);
const wrapf = (v, a, b) => a + ((((v - a) % (b - a)) + (b - a)) % (b - a));
const filmAt = lt => (lt < CUT[1] ? 0 : lt < CUT[2] ? 1 : lt < CUT[3] ? 2 : 3);

// ── layout, cached per frame size ─────────────────────────────────────────
let GC = null;
function geo(ctx, S) {
  const key = S.W + 'x' + S.H;
  if (GC && GC.key === key) return GC;
  const { W, H, u } = S, P = S.portrait;
  const G = { key, W, H, P };
  G.diag = Math.hypot(W, H);
  G.Lb = 0.62 * G.diag;           // half-length of a blade (always past the corners)
  G.D = 1.2 * G.diag;             // how far a half slides to leave the frame
  G.mx = (P ? 0.07 : 0.062) * W;
  // the film's plate: the top of the phone, the right-hand panel of the landscape
  // frame (cropped to the character, so the key art's own lettering stays out)
  G.plate = P ? { x: 0, y: 0, w: W, h: 0.64 * H } : { x: 0.4 * W, y: 0, w: 0.6 * W, h: H };

  // type sizes: the phone gets proportionally bigger type (its u is a narrow side)
  G.tS = (P ? 15.5 : 13) * u;     // film title
  G.kS = (P ? 2.8 : 2.0) * u;     // kicker
  G.rS = (P ? 3.5 : 2.5) * u;     // runtime
  G.lS = (P ? 3.9 : 2.9) * u;     // logline
  G.hS = (P ? 2.5 : 1.8) * u;     // header
  G.cS = (P ? 2.45 : 1.7) * u;    // credit
  G.nS = 24 * u;                  // the landscape's big cut numeral
  G.hdS = (P ? 8.8 : 11) * u;     // the opening heading
  G.ebS = (P ? 2.8 : 2.2) * u;    // its eyebrow
  G.yH = 0.1 * H + G.hS * 0.8;    // header baseline

  // the five slashes: landscape runs them near the frame's diagonal, the phone
  // stands them up along its long axis. The first and last pass through the
  // dead centre so they can grow out of and fall back into the rest line.
  const ang = P ? [-24, 58, -62, 55, -27] : [-21, 29, -33, 26, -19];
  const cen = P ? [[0.5, 0.5], [0.5, 0.42], [0.5, 0.47], [0.5, 0.44], [0.5, 0.5]]
    : [[0.5, 0.5], [0.54, 0.47], [0.46, 0.52], [0.53, 0.48], [0.5, 0.5]];
  const dir = [1, -1, 1, -1, 1];
  G.cut = ang.map((d, j) => {
    const a = d * Math.PI / 180;
    return { a, c: { x: cen[j][0] * W, y: cen[j][1] * H }, t: { x: Math.cos(a), y: Math.sin(a) }, n: { x: -Math.sin(a), y: Math.cos(a) }, dir: dir[j] };
  });

  // the type stack of each film
  const yc2 = 0.852 * H, yc1 = yc2 - G.cS * 1.65;
  // (both orientations stack the same way, bottom up from the logline)
  G.type = FILMS.map(F => {
    const lines = F.title, logs = F.log;
    const to = { size: G.tS, weight: 900, tracking: -0.012 };
    const tW = Math.max(...lines.map(s => measure(ctx, s, to)));
    const n = logs.length, yLn = P ? yc1 - 5.6 * u : 0.835 * H - G.cS - 4.2 * u;
    const yL = logs.map((_, j) => yLn - (n - 1 - j) * G.lS * 1.42);
    const yR = yL[0] - G.lS - (P ? 2.5 : 2.3) * u;
    const yTn = yR - (P ? 3.1 : 2.8) * u;
    const yT = lines.map((_, j) => yTn - (lines.length - 1 - j) * G.tS * 0.94);
    const yK = yT[0] - G.tS * 0.73 - (P ? 3.6 : 3.2) * u;
    return { x: G.mx, tW, lines, logs, yL, yR, yT, yK, yN: yK - 4.4 * u };
  });

  // the credit that builds a phrase per film
  const lab = { size: G.cS, weight: 600, tracking: 0.2 }, hv = { size: G.cS, weight: 800, tracking: 0.2 };
  const starts = []; let acc = 0; CREDIT.forEach(s => { starts.push(acc); acc += s.length; });
  if (!P) {
    // closes the type column, under the logline
    const Lf = layout(ctx, CREDIT.join(''), lab);
    const x0 = G.mx, y = 0.835 * H;
    G.credit = CREDIT.map((s, i) => ({ s, x: x0 + Lf.xs[starts[i]], y, o: i === 3 ? hv : lab, c: i === 3 ? PAL.goldHi : PAL.dim, t: CREDIT_T[i] }));
  } else {
    const a = CREDIT[0] + CREDIT[1], b0 = CREDIT[2].trimStart();
    const LA = layout(ctx, a, lab), LB = layout(ctx, b0 + CREDIT[3], lab);
    G.credit = [
      { s: CREDIT[0], x: G.mx, y: yc1, o: lab, c: PAL.dim, t: CREDIT_T[0] },
      { s: CREDIT[1], x: G.mx + LA.xs[CREDIT[0].length], y: yc1, o: lab, c: PAL.dim, t: CREDIT_T[1] },
      { s: b0, x: G.mx, y: yc2, o: lab, c: PAL.dim, t: CREDIT_T[2] },
      { s: CREDIT[3], x: G.mx + LB.xs[b0.length], y: yc2, o: hv, c: PAL.goldHi, t: CREDIT_T[3] }
    ];
  }

  G.scrim = makeScrim(W, H, P);
  GC = G;
  return G;
}

/** the static darkening that keeps type legible, painted once per size */
function makeScrim(W, H, P) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  let gr;
  if (!P) {
    // the panel's left edge leans like a cut, and feathers into the black type column
    const xt = 0.475 * W, xb = 0.405 * W, f = 0.1 * W;
    const ex = xb - xt, ey = H, el = Math.hypot(ex, ey), nx = ey / el, ny = -ex / el;
    gr = g.createLinearGradient(xt, 0, xt + nx * f, ny * f);
    gr.addColorStop(0, css(C.bg, 1)); gr.addColorStop(0.45, css(C.bg, 0.62)); gr.addColorStop(1, css(C.bg, 0));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(xt + nx * f * 1.2, 0); g.lineTo(xb + nx * f * 1.2, H); g.lineTo(0, H); g.closePath();
    g.fill();
    gr = g.createLinearGradient(0, H, 0, H * 0.55);
    gr.addColorStop(0, css(C.bg, 0.9)); gr.addColorStop(0.35, css(C.bg, 0.55)); gr.addColorStop(1, css(C.bg, 0));
    g.fillStyle = gr; g.fillRect(0, H * 0.55, W, H * 0.45);
    gr = g.createLinearGradient(0, 0, 0, H * 0.2);
    gr.addColorStop(0, css(C.bg, 0.45)); gr.addColorStop(1, css(C.bg, 0));
    g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.2);
  } else {
    const y0 = H * 0.36, y1 = H * 0.64;
    gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, css(C.bg, 0)); gr.addColorStop(0.5, css(C.bg, 0.55)); gr.addColorStop(0.82, css(C.bg, 0.93)); gr.addColorStop(1, css(C.bg, 1));
    g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0);
    g.fillStyle = css(C.bg, 1); g.fillRect(0, y1 - 1, W, H - y1 + 1);
    gr = g.createLinearGradient(0, 0, 0, H * 0.2);
    gr.addColorStop(0, css(C.bg, 0.82)); gr.addColorStop(0.5, css(C.bg, 0.55)); gr.addColorStop(1, css(C.bg, 0));
    g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.2);
  }
  return c;
}

/** a soft round glow, one per colour, painted once */
const sprites = new Map();
function glow(c) {
  const key = c.join(',');
  let s = sprites.get(key);
  if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 128;
  const g = s.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, css(c, 1)); gr.addColorStop(0.18, css(c, 0.6)); gr.addColorStop(0.5, css(c, 0.14)); gr.addColorStop(1, css(c, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  sprites.set(key, s);
  return s;
}
const blot = (ctx, spr, x, y, r) => ctx.drawImage(spr, x - r, y - r, 2 * r, 2 * r);

// ── a film: plate, grade, motes, type ─────────────────────────────────────
const typeDrift = (S, k, ft) => S.u * 1.1 * (0.5 - clamp(ft / 2.5)) * (k % 2 ? -1 : 1);

function drawFilm(ctx, S, G, k, ft) {
  const F = FILMS[k], img = S.img(F.img), pr = G.plate, o = S.portrait ? F.P : F.L;
  // push in: a punch on the cut settling into a slow creep, the plate panning against the type
  const z = o.z * (1.02 + 0.07 * clamp(ft / 2.5) + 0.08 * (1 - outExpo(clamp(ft / 0.75))));
  const m = 0.028 * pr.w, dx = lerp(m, -m, clamp(ft / 2.5)) * F.pan;
  ctx.save();
  ctx.beginPath(); ctx.rect(pr.x, pr.y, pr.w, pr.h); ctx.clip();
  cover(ctx, img, pr.x - m + dx, pr.y - m * 0.5, pr.w + 2 * m, pr.h + m, { fx: o.fx, fy: o.fy, zoom: z });
  grade(ctx, S, G, k, ft);
  ctx.restore();
  ctx.drawImage(G.scrim, 0, 0);
  motes(ctx, S, G, k, ft);
  typeBlock(ctx, S, G, k, ft);
}

function grade(ctx, S, G, k, ft) {
  const pr = G.plate, c = scriptAt(k, ft), F = FILMS[k];
  ctx.globalCompositeOperation = F.grade[0];
  ctx.globalAlpha = F.grade[1];
  ctx.fillStyle = css(c); ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
  ctx.globalCompositeOperation = 'lighter';
  const R = Math.max(pr.w, pr.h);
  if (k === 0) {
    // the colour script's own light, then the inferno climbing out of the floor
    // (a blob per key colour, crossfaded, so the sprite cache stays four entries big)
    const K = [0, 0.625, 0.9375, 1.25], cs = [C.amber, C.steel, C.blossom, C.ember];
    for (let i = 0; i < 4; i++) {
      const w = Math.min(i ? seg(ft, K[i], K[i] + 0.09, outCubic) : 1, 1 - (i < 3 ? seg(ft, K[i + 1], K[i + 1] + 0.09, outCubic) : 0));
      if (w > 0.001) { ctx.globalAlpha = 0.2 * w; blot(ctx, glow(cs[i]), pr.x + pr.w * 0.62, pr.y + pr.h * 0.3, R * 0.5); }
    }
    const inf = seg(ft, 1.2, 1.875, inOutCubic);
    if (inf > 0) { ctx.globalAlpha = 0.55 * inf; blot(ctx, glow(C.ember), pr.x + pr.w * 0.5, pr.y + pr.h * 1.1, R * (0.55 + 0.2 * inf)); }
  } else if (k === 1) {
    // golden hour: a low sun leaking in from the top of the street
    ctx.globalAlpha = 0.2 + 0.05 * Math.sin(ft * 3); blot(ctx, glow(C.sun), pr.x + pr.w * (0.25 + 0.08 * ft / 2.5), pr.y + pr.h * 0.02, R * 0.55);
  } else if (k === 2) {
    const e = seg(ft, 0.7, 2.5, inOutCubic);
    const e2 = seg(ft, 0.55, 2.3, inOutCubic), a = 0.14 + 0.36 * e;
    if (e2 < 1) { ctx.globalAlpha = a * (1 - e2); blot(ctx, glow(C.blossom), pr.x + pr.w * 0.55, pr.y + pr.h * 1.08, R * 0.6); }
    if (e2 > 0) { ctx.globalAlpha = a * e2; blot(ctx, glow(C.ember), pr.x + pr.w * 0.55, pr.y + pr.h * 1.08, R * 0.6); }
  } else {
    ctx.globalAlpha = 0.16 + 0.05 * noise1(ft * 9, 4); blot(ctx, glow(C.amber), pr.x + pr.w * 0.97, pr.y + pr.h * 0.97, R * 0.28);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/** the nearest layer of the parallax: embers, dust, petals, specks */
function motes(ctx, S, G, k, ft) {
  const { W, u } = S, pr = G.plate, kind = FILMS[k].motes, P = S.portrait;
  const n = kind === 'petal' ? 24 : 30, sc = P ? 1.35 : 1;
  const y0 = pr.y - 4 * u, y1 = pr.y + pr.h * (P ? 0.72 : 1) + 4 * u;
  const x0 = P ? -6 * u : pr.x - 4 * u, x1 = W + 6 * u;
  const inf = k === 0 ? seg(ft, 1.2, 1.875) : 0;
  const petal = css(mixc(scriptAt(k, ft), C.white, 0.18));
  ctx.save();
  if (kind !== 'petal') ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const r0 = rng(i, 11 + k * 5), r1 = rng(i, 12 + k * 5), z = 0.35 + rng(i, 13 + k * 5) * 0.95, r3 = rng(i, 14 + k * 5);
    let vx, vy, s;
    if (kind === 'ember') { vx = (1.5 + noise1(ft * 1.3 + i, 3) * 2.5) * u * z; vy = -(6 + 10 * r3) * u * z * (1 + 1.6 * inf); s = (0.16 + 0.3 * r3) * u * z; }
    else if (kind === 'dust') { vx = 1.4 * u * z; vy = (-0.7 + noise1(ft + i, 5) * 0.8) * u * z; s = (0.14 + 0.32 * r3) * u * z; }
    else if (kind === 'petal') { vx = (8 + 5 * r3) * u * z; vy = (3.5 + 3 * r3 + noise1(ft * 2 + i, 6) * 2) * u * z; s = (0.4 + 0.3 * r3) * u * z; }
    else { vx = 0.7 * u * z; vy = -0.35 * u * z; s = (0.1 + 0.22 * r3) * u * z; }
    s *= sc;
    // nearer motes also drift further with the pan: parallax
    const par = -FILMS[k].pan * z * 2.2 * u * ft;
    const x = wrapf(x0 + r0 * (x1 - x0) + vx * ft + par, x0, x1);
    const y = wrapf(y0 + r1 * (y1 - y0) + vy * ft, y0, y1);
    const tw = 0.5 + 0.5 * Math.sin(ft * (5 + 7 * r3) + i * 2.1);
    if (kind === 'petal') {
      ctx.globalAlpha = 0.55 + 0.35 * tw;
      ctx.fillStyle = petal;
      ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.46, ft * (2 + 3 * r3) + i, 0, TAU); ctx.fill();
    } else {
      const col = kind === 'ember' ? (i % 3 ? C.ember : C.amber) : kind === 'dust' ? C.goldHi : C.parch;
      ctx.globalAlpha = (kind === 'ember' ? 0.45 + 0.55 * inf : kind === 'dust' ? 0.45 : 0.3) * (0.35 + 0.65 * tw);
      blot(ctx, glow(col), x, y, s * 4);
    }
  }
  ctx.restore();
}

/** the runtime rolls up like an odometer, each digit landing a little after the last */
const cells = new Map();
function odometer(ctx, str, x, y, size, p) {
  const font = `800 ${Math.round(size)}px ${FONT.sans}`;
  ctx.save();
  ctx.font = font; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = PAL.ink;
  ctx.globalAlpha *= clamp(p * 5);
  let cw = cells.get(font);
  if (!cw) { cw = Math.max(...'0123456789'.split('').map(d => ctx.measureText(d).width)); cells.set(font, cw); }
  const chars = [...str], nd = chars.filter(ch => ch >= '0' && ch <= '9').length, lh = size * 1.08;
  let cx = x, di = 0;
  for (const ch of chars) {
    if (ch >= '0' && ch <= '9') {
      const q = clamp((p - di * 0.12) / (1 - (nd - 1) * 0.12));
      const pos = (+ch + 10 * (1 + di)) * outExpo(q), b = Math.floor(pos), f = pos - b;
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - size * 0.1, y - size * 0.9, cw + size * 0.2, size * 1.08); ctx.clip();
      const d0 = String(b % 10), d1 = String((b + 1) % 10);
      ctx.fillText(d0, cx + (cw - ctx.measureText(d0).width) / 2, y - f * lh);
      if (f > 0.002) ctx.fillText(d1, cx + (cw - ctx.measureText(d1).width) / 2, y + (1 - f) * lh);
      ctx.restore();
      cx += cw; di++;
    } else { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width; }
  }
  ctx.restore();
  return cx;
}

/** the title slams down onto its baseline, glyph by glyph, out of the slash's direction */
function slam(ctx, S, str, x, y, size, r, push) {
  if (r <= 0) return;
  const o = { size, weight: 900, tracking: -0.012 };
  const L = layout(ctx, str, o), cap = size * 0.72;
  text(ctx, S, str, x, y, {
    ...o, color: PAL.ink, reveal: r, window: 0.6, rise: 0,
    glyph: (i, p) => {
      const gw = (i + 1 < L.xs.length ? L.xs[i + 1] : L.width) - L.xs[i], s = 1 + 0.85 * (1 - p);
      return { sx: s, sy: s, dx: -gw / 2 * (s - 1) + (1 - p) * push, dy: cap / 2 * (s - 1), alpha: clamp(p * 2.4) };
    }
  });
}

function typeBlock(ctx, S, G, k, ft) {
  const F = FILMS[k], T = G.type[k], u = S.u;
  const x = T.x + typeDrift(S, k, ft);
  const acc = css(mixc(scriptAt(k, ft), C.white, 0.3));
  if (!S.portrait) {
    // the cut's number, outlined large at the head of the column, rising out of its own sill
    const nr = seg(ft, 0.06, 0.5);
    const nb = text(ctx, S, '0' + (k + 1), x - G.nS * 0.05, T.yN, {
      size: G.nS, weight: 800, tracking: -0.02, stroke: true, strokeWidth: Math.max(1, S.lw * 0.6),
      color: 'rgba(216,178,106,.78)', reveal: nr, mask: true, window: 0.7
    });
    text(ctx, S, '/ 04', nb.x1 + 1.6 * u, T.yN, { size: G.hS, weight: 700, tracking: 0.22, color: PAL.faint, reveal: seg(ft, 0.2, 0.55), mask: true, window: 0.5 });
  }
  // beat 1, with the cut: the title slams in
  T.lines.forEach((s, j) => slam(ctx, S, s, x, T.yT[j], G.tS, seg(ft, 0.08 + j * 0.07, 0.46 + j * 0.07), G.cut[k].dir * -4 * u));
  // up to beat 2: the kicker rises, the runtime spins and lands on the beat
  const kr = seg(ft, 0.12, 0.46);
  const kb = text(ctx, S, F.kick, x, T.yK, { size: G.kS, weight: 700, tracking: 0.24, color: acc, reveal: kr, mask: true, window: 0.5 });
  const pr = seg(ft, 0.2, 0.625);
  if (pr > 0) {
    const sx = kb.x1 + G.kS * 0.8;
    text(ctx, S, '·', sx, T.yK, { size: G.kS * 1.2, weight: 700, color: PAL.faint, alpha: clamp(pr * 5) });
    odometer(ctx, F.rt, sx + G.kS * 1.3, T.yK + (G.rS - G.kS) * 0.12, G.rS, pr);
  }
  // then the logline rises under the rule, set well before beat 3
  T.logs.forEach((s, j) => text(ctx, S, s, x, T.yL[j], {
    size: G.lS, weight: 400, color: 'rgba(245,245,240,.92)',
    reveal: seg(ft, 0.3 + j * 0.12, 0.74 + j * 0.12), mask: true, window: 0.2
  }));
}

// ── the chrome that stays put while films cut under it ───────────────────
function overlays(ctx, S, G, lt) {
  if (lt < 0.7) return;
  const W = S.W;
  const hb = text(ctx, S, 'BRAND FILMS', G.mx, G.yH, { size: G.hS, weight: 700, tracking: 0.22, color: PAL.gold, reveal: seg(lt, 0.7, 1.1), mask: true, window: 0.5 });
  text(ctx, S, '·  FOUR MORE CUTS', hb.x1 + G.hS * 0.9, G.yH, { size: G.hS, weight: 600, tracking: 0.22, color: PAL.dim, reveal: seg(lt, 0.78, 1.2), mask: true, window: 0.5 });
  // the credit, a phrase per film
  for (const c of G.credit) {
    const r = seg(lt, c.t - 0.12, c.t + 0.3);
    if (r > 0) text(ctx, S, c.s, c.x, c.y, { ...c.o, color: c.c, reveal: r, mask: true, window: 0.4 });
  }
  if (!S.portrait) return;   // landscape carries the count in the type column
  // the phone's cut counter, its digit rolling over on each slash
  const k = filmAt(lt), co = { size: G.hS, weight: 700, tracking: 0.22 };
  const tail = ' / 04', wT = measure(ctx, tail, co), w0 = measure(ctx, '00', co);
  const xr = W - G.mx, x0 = xr - wT - w0 - co.tracking * G.hS;
  const cr = seg(lt, 0.76, 1.16);
  text(ctx, S, tail, xr, G.yH, { ...co, align: 'right', color: PAL.faint, reveal: cr, mask: true, window: 0.5 });
  const f = seg(lt, CUT[k], CUT[k] + 0.42, outExpo), lh = G.hS * 1.5;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 - G.hS, G.yH - G.hS * 1.05, w0 + 2 * G.hS, G.hS * 1.35); ctx.clip();
  if (k > 0 && f < 1) text(ctx, S, '0' + k, x0, G.yH - f * lh, { ...co, color: PAL.ink });
  text(ctx, S, '0' + (k + 1), x0, G.yH + (1 - f) * lh, { ...co, color: PAL.ink, alpha: k ? 1 : cr });
  ctx.restore();
}

// ── the opening: the rest line leans into a blade with the heading riding it ─
function openingAngle(G, lt) { return G.cut[0].a * tiltE(seg(lt, IN, 0.44)); }

function drawOpening(ctx, S, G, lt) {
  const c = G.cut[0].c, a = openingAngle(G, lt), H = S.H, B = G.Lb;
  ctx.save();
  ctx.translate(c.x, c.y); ctx.rotate(a);
  // above the blade: the heading climbs out of the thread
  ctx.save(); ctx.beginPath(); ctx.rect(-B, -H, 2 * B, H - S.lw * 0.6); ctx.clip();
  text(ctx, S, 'Four more cuts.', 0, -G.hdS * 0.3, {
    size: G.hdS, weight: 800, tracking: -0.018, align: 'center', color: PAL.ink,
    reveal: seg(lt, 0.12, 0.42), window: 0.42, rise: G.hdS * 0.95
  });
  ctx.restore();
  // below it: the eyebrow drops out of the thread
  ctx.save(); ctx.beginPath(); ctx.rect(-B, S.lw * 0.6, 2 * B, H); ctx.clip();
  text(ctx, S, 'BRAND FILMS', 0, G.ebS * 2.2, {
    size: G.ebS, weight: 700, tracking: 0.34, align: 'center', color: PAL.gold,
    reveal: seg(lt, 0.2, 0.46), window: 0.5, rise: -G.ebS * 2.4
  });
  ctx.restore();
  ctx.restore();
}

// ── the thread: rest line → blade → rule → blade … → rest line ────────────
const BLADE = { w: 1.45, glow: 1.8 }, RULE = { w: 1.0, glow: 0.7 };
function bladePts(G, j, a = G.cut[j].a, L = G.Lb) {
  const c = G.cut[j].c, ca = Math.cos(a), sa = Math.sin(a);
  return [[c.x - ca * L, c.y - sa * L], [c.x, c.y], [c.x + ca * L, c.y + sa * L]];
}
function rulePts(S, G, k, ft) {
  const T = G.type[k], x = T.x + typeDrift(S, k, ft);
  return [[x, T.yR], [x + T.tW / 2, T.yR], [x + T.tW, T.yR]];
}
const lerpPts = (A, B, e) => A.map((p, i) => [lerp(p[0], B[i][0], e), lerp(p[1], B[i][1], e)]);

function threadState(S, G, lt) {
  const W = S.W, lw = S.lw;
  if (lt < IN || lt >= OUT) return { pts: bladePts(G, 0, 0, 0.52 * W), w: lw, glow: 1 };
  if (lt < CUT[0]) {
    const e = tiltE(seg(lt, IN, 0.44));
    const ten = seg(lt, 0.34, CUT[0], inOutCubic);
    return {
      pts: bladePts(G, 0, openingAngle(G, lt), lerp(0.52 * W, G.Lb, clamp(e))),
      w: lw * lerp(1, BLADE.w, ten), glow: lerp(1, BLADE.glow, ten),
      glint: lt > CUT[0] - 0.1 ? (lt - CUT[0] + 0.1) / 0.1 : null, gj: 0, fast: lt > 0.12 && lt < 0.42
    };
  }
  if (lt >= CUT[4]) {
    const e = settle(seg(lt, CUT[4] + 0.04, 9.86)), ec = clamp(e);
    return {
      pts: bladePts(G, 4, G.cut[4].a * (1 - e), lerp(G.Lb, 0.52 * W, ec)),
      w: lw * lerp(BLADE.w, 1, ec), glow: lerp(BLADE.glow, 1, ec), fast: lt < CUT[4] + 0.3
    };
  }
  const k = filmAt(lt), ft = lt - CUT[k], te = CUT[k + 1] - lt;
  const rule = rulePts(S, G, k, ft);
  let pts, w, gl, fast = false, glint = null, twist = false;
  // after the slash: the blade sheathes itself as the rule under the new title
  if (ft < 0.05) { pts = bladePts(G, k); w = BLADE.w; gl = BLADE.glow; }
  else if (ft < 0.62) {
    const e = outExpo(invlerp(0.05, 0.62, ft));
    pts = lerpPts(bladePts(G, k), rule, e); w = lerp(BLADE.w, RULE.w, e); gl = lerp(BLADE.glow, RULE.glow, e); fast = ft < 0.3;
  } else { pts = rule; w = RULE.w; gl = RULE.glow; twist = true; }
  // the last beat of the bar: the rule trembles, then whips out into the next blade
  if (te < 0.62 && te >= 0.26) {
    const A = 0.55 * S.u * seg(te, 0.62, 0.3);
    pts = [pts[0], [pts[1][0], pts[1][1] + A * Math.sin(lt * TAU * 13)], pts[2]];
    gl += 0.6 * seg(te, 0.62, 0.26);
  } else if (te < 0.26) {
    const e = whip(invlerp(0.26, 0.1, te));
    pts = lerpPts(rule, bladePts(G, k + 1), e); w = lerp(RULE.w, BLADE.w, e); gl = lerp(RULE.glow + 0.6, BLADE.glow, e);
    fast = te > 0.1; twist = false;
    if (te < 0.1) glint = (0.1 - te) / 0.1;
  }
  return { pts, w: w * lw, glow: gl, fast, glint, gj: k + 1, twist };
}

function drawThread(ctx, S, G, lt) {
  const st = threadState(S, G, lt);
  if (st.fast) {
    // a fast thread smears: a few ghosts where it just was
    for (let i = 3; i >= 1; i--) {
      const g = threadState(S, G, lt - i * 0.008);
      thread(ctx, S, g.pts, { width: g.w, glow: 0.4, alpha: 0.26 / i });
    }
  }
  thread(ctx, S, st.pts, { width: st.w, glow: st.glow, twist: st.twist, twistPhase: lt * 5 });
  if (st.glint != null) {
    // the glint running down the edge before the slash
    const g = clamp(st.glint), cu = G.cut[st.gj];
    const A = cu.dir > 0 ? st.pts[0] : st.pts[2], B = cu.dir > 0 ? st.pts[2] : st.pts[0];
    const g0 = Math.max(0, g - 0.24);
    thread(ctx, S, [A, B], { sharp: true, from: g0, progress: Math.max(g, g0 + 0.002), width: S.lw * 2.4, glow: 2.4, color: '#fffbef' });
  }
}

// ── the slash: the frame as it was, cut in two, sliding off itself ────────
const pool = [];
let tick = 0;   // recency for the two-slot cache only; never reaches a pixel
/** the frame just before slash j, frozen into an offscreen canvas (cached by size) */
function frozen(S, G, j) {
  const im = j === 0 ? 1 : (S.img(FILMS[j - 1].img) ? 1 : 0);
  const key = G.key + '|' + j + '|' + im;
  let slot = pool.find(s => s.key === key);
  if (slot) { slot.used = ++tick; return slot.cv; }
  if (pool.length < 2) { slot = { cv: document.createElement('canvas') }; pool.push(slot); }
  else slot = pool[0].used <= pool[1].used ? pool[0] : pool[1];
  slot.key = key; slot.used = ++tick;
  const cv = slot.cv;
  if (cv.width !== S.W || cv.height !== S.H) { cv.width = S.W; cv.height = S.H; }
  const o = cv.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
  o.fillStyle = PAL.bg; o.fillRect(0, 0, S.W, S.H);
  if (j === 0) drawOpening(o, S, G, CUT[0]);
  else {
    drawFilm(o, S, G, j - 1, CUT[j] - CUT[j - 1]);
    if (j === 4) overlays(o, S, G, CUT[4]);
  }
  return cv;
}

function halfOffset(S, G, j, fc, side) {
  const cu = G.cut[j];
  const p = SLIDE_E(clamp(fc / SLIDE));
  const gap = 1.1 * S.u * outExpo(clamp(fc / 0.12));
  const along = side * cu.dir * G.D * p, perp = side * (gap + 0.22 * G.D * p);
  return [cu.t.x * along + cu.n.x * perp, cu.t.y * along + cu.n.y * perp];
}

function halves(ctx, S, G, j, fc) {
  const cv = frozen(S, G, j), cu = G.cut[j], B = G.diag * 2, c = cu.c, t = cu.t, n = cu.n;
  const edge = 1 - seg(fc, 0.02, 0.32);
  for (const side of [-1, 1]) {
    for (const [lag, a] of [[0.022, 0.28], [0, 1]]) {
      if (lag && fc < lag) continue;
      const f = fc - lag, [ox, oy] = halfOffset(S, G, j, f, side);
      const rot = side * cu.dir * 0.035 * SLIDE_E(clamp(f / SLIDE));
      ctx.save();
      ctx.translate(ox + c.x, oy + c.y); ctx.rotate(rot); ctx.translate(-c.x, -c.y);
      ctx.beginPath();
      ctx.moveTo(c.x - t.x * B, c.y - t.y * B); ctx.lineTo(c.x + t.x * B, c.y + t.y * B);
      ctx.lineTo(c.x + t.x * B + side * n.x * B, c.y + t.y * B + side * n.y * B);
      ctx.lineTo(c.x - t.x * B + side * n.x * B, c.y - t.y * B + side * n.y * B);
      ctx.closePath(); ctx.clip();
      ctx.beginPath(); ctx.rect(0, 0, S.W, S.H); ctx.clip();   // the piece is only as big as the frame it was
      ctx.globalAlpha = a;
      ctx.drawImage(cv, 0, 0);
      if (a === 1 && edge > 0) {
        // the cut face, still hot
        ctx.beginPath(); ctx.moveTo(c.x - t.x * B, c.y - t.y * B); ctx.lineTo(c.x + t.x * B, c.y + t.y * B);
        ctx.globalAlpha = edge * 0.2; ctx.strokeStyle = PAL.gold; ctx.lineWidth = S.lw * 10; ctx.stroke();
        ctx.globalAlpha = edge; ctx.strokeStyle = PAL.goldHi; ctx.lineWidth = S.lw * 3; ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// ── the lens, only ever on the slashes and the landings ───────────────────
function lens(S, G, lt) {
  const fx = S.fx;
  if (lt < CUT[0]) {
    const g = seg(lt, CUT[0] - 0.1, CUT[0]);
    fx.ab = 0.3 * g;
    return;
  }
  const j = lt < CUT[4] ? filmAt(lt) : 4, fc = lt - CUT[j];
  if (fc < 0.03) fx.flash = 0.45 * (1 - fc / 0.03);
  fx.ab = 0.9 * (1 - outCubic(clamp(fc / 0.42)));
  fx.shake = 1.4 * S.u * Math.pow(1 - clamp(fc / 0.34), 2);
  if (j < 4) {
    const te = CUT[j + 1] - lt;
    if (te < 0.1) fx.ab = Math.max(fx.ab, 0.3 * (1 - te / 0.1));
    // the title's landing sends a ring through the glass
    if (fc > 0.34 && fc < 0.95) {
      const T = G.type[j];
      fx.warp = seg(fc, 0.34, 0.95, outCubic);
      fx.warpX = (T.x + T.tW / 2) / S.W;
      fx.warpY = (T.yT[T.yT.length - 1] - G.tS * 0.36) / S.H;
    }
  }
}

export default {
  id: 'cuts',
  title: 'Four more cuts',
  caption: 'The thread turns blade and slashes through four brand films on the downbeats: CCATS, OG10 Are Back, SKET and the Bounty Board, each made by one person.',
  assets: FILMS.map(f => f.img),
  models: [],
  still: 6.8,
  draw(ctx, S) {
    const lt = S.lt;
    if (lt < IN || lt >= OUT) { rest(ctx, S); return; }
    const G = geo(ctx, S);
    if (lt < CUT[0]) {
      drawOpening(ctx, S, G, lt);
      drawThread(ctx, S, G, lt);
      lens(S, G, lt);
      return;
    }
    const k = lt < CUT[4] ? filmAt(lt) : 4, fc = lt - CUT[k];
    if (k < 4 && CUT[k + 1] - lt < 0.45) frozen(S, G, k + 1);   // paint the next slash's frame ahead of it
    if (k < 4) drawFilm(ctx, S, G, k, fc);
    if (fc < SLIDE + 0.06) halves(ctx, S, G, k, fc);
    if (k < 4) overlays(ctx, S, G, lt);
    drawThread(ctx, S, G, lt);
    lens(S, G, lt);
  }
};
