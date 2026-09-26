/* 4 — The Cast   (global 23.5–36 s: five bars, starting halfway through a phrase)

   The thread becomes a voice line — an oscilloscope trace that swells when
   somebody speaks. Twelve voices arrive on the beat: the line parts like a
   pair of lips around a window onto the character, a burst runs out along
   the wire, and the name rises on the same hit. The arrivals accelerate — a
   half-bar apart, then one a beat — and the cast builds up along the line
   (an accordion: the newest speaker wide, the rest standing by as bars)
   until all twelve stand together: a strip of twelve on a wide frame, a
   3 × 4 grid on a phone. Then the voices close back into the line, left to
   right, and it falls flat and taut.

   time map (local seconds; a beat every 0.625, phrase turns at 2.5 / 7.5)
   0.00  rest
   0.10  the line starts to hum
   0.63  "A world that speaks." — the line mouths each word
   1.25  ZEYO   the line opens (hero)
   2.50  FOT    on the phrase turn (hero)
   3.75  SKET   (hero)
   4.38  CCATS … one a beat … 9.38 OLD KEEPER — the cast takes the whole line
   9.72  the strip evens out (phone: the speaking window shuts)
   10.0  "12 voices" · CAST & DIRECTED WITH ELEVENLABS — the hold (still at 11.1)
   11.58 the voices close into the line, left to right
   12.40 flat — pure rest to the end */
import {
  PAL, clamp, lerp, invlerp, seg, noise1,
  outCubic, inCubic, inOutCubic, siteE, spring,
  thread, rest, text, measure
} from '../kit.js';

// fx, fy: the face, as a fraction of the image; nx: right edge of the name
// lettered into the image (px of 900) — crops stay right of it
const CAST = [
  { v: 'zeyo',     name: 'ZEYO',       img: 'assets/char-zeyo.jpg',     fx: 0.64, fy: 0.50, nx: 398, tone: '#e6b45c' },
  { v: 'fot',      name: 'FOT',        img: 'assets/char-fot.jpg',      fx: 0.70, fy: 0.49, nx: 278, tone: '#b48cf2' },
  { v: 'sket',     name: 'SKET',       img: 'assets/char-sket.jpg',     fx: 0.56, fy: 0.54, nx: 328, tone: '#6fd8cc' },
  { v: 'ccats',    name: 'CCATS',      img: 'assets/char-ccats.jpg',    fx: 0.63, fy: 0.43, nx: 322, tone: '#e9a64c' },
  { v: 'ketdonut', name: 'KETDONUT',   img: 'assets/char-ketdonut.jpg', fx: 0.62, fy: 0.48, nx: 452, tone: '#f28cbc' },
  { v: 'gst',      name: 'GST',        img: 'assets/char-gst.jpg',      fx: 0.63, fy: 0.46, nx: 362, tone: '#5e98ff' },
  { v: 'hearta',   name: 'HEARTA',     img: 'assets/char-hearta.jpg',   fx: 0.62, fy: 0.56, nx: 418, tone: '#d98cf2' },
  { v: 'ecox',     name: 'ECOX',       img: 'assets/char-ecox.jpg',     fx: 0.62, fy: 0.54, nx: 408, tone: '#5fe0dc' },
  { v: 'froak',    name: 'FROAK',      img: 'assets/char-froak.jpg',    fx: 0.62, fy: 0.42, nx: 400, tone: '#93d68c' },
  { v: 'lychee',   name: 'LYCHEE',     img: 'assets/char-lychee.jpg',   fx: 0.54, fy: 0.53, nx: 356, tone: '#ea5a48' },
  { v: 'wick',     name: 'WICK',       img: 'assets/v-wick.jpg',        fx: 0.66, fy: 0.48, nx: 418, tone: '#f2a64a', npc: true },
  { v: 'keeper',   name: 'OLD KEEPER', img: 'assets/v-keeper.jpg',      fx: 0.62, fy: 0.36, nx: 428, tone: '#ead08a', npc: true }
];

// every arrival sits on a beat: two half-bars, then one a beat
const ARR = [1.25, 2.5, 3.75, 4.375, 5, 5.625, 6.25, 6.875, 7.5, 8.125, 8.75, 9.375];
const HEROES = 3, LAST = ARR.length - 1;
const EVEN = [9.72, 10.12];    // wide: the strip evens out
const SHUTP = [9.74, 9.98];    // phone: the speaking window closes
const SLAM = 10;               // "12 voices"
const TXT_OUT = 11.5;           // the hold's type leaves
const SHUT = 11.58;            // voices close into the line, left to right
const TAUT = 12.06, FLAT = 12.4;

const numStr = i => String(i + 1).padStart(2, '0');
const role = c => (c.npc ? 'STORY NPC' : 'OG10 COLLECTIBLE');

/** a voice's attack: a short pre-roll into the beat, then a fast decay */
function burst(tau) {
  if (tau < -0.1) return 0;
  if (tau < 0) return (tau + 0.1) / 0.1;
  return Math.exp(-tau / 0.22);
}

// ── the voice line ────────────────────────────────────────────────────────
/* The thread's displacement at x: a low murmur that travels along it, plus
   a packet for every voice that runs outward from where it spoke. */
function makeWave(S, lt, src) {
  const { u, W } = S;
  const taut = 1 - seg(lt, TAUT, FLAT, inOutCubic);
  const hum = u * taut * (1.0 * seg(lt, 0.1, 0.75, outCubic) - 0.45 * seg(lt, 1.6, 4.4, inOutCubic)
    + 0.15 * seg(lt, 9.8, 10.4) - 0.7 * seg(lt, 11.3, 12.1, inOutCubic));
  const B = [];
  const add = (t0, x, amp) => { const tau = lt - t0; if (tau > 0 && tau < 1.5) B.push(x, tau, amp * taut); };
  // a first breath, then the title mouthed a word at a time
  add(0.3, W * 0.5, 1.3 * u);
  const tx = S.portrait ? 0.07 * W : 0.055 * W, sc = S.portrait ? 1.35 : 1;
  add(0.625, tx + 2 * u * sc, 1.6 * u); add(0.74, tx + 13 * u * sc, 1.9 * u);
  add(0.86, tx + 6 * u * sc, 1.5 * u); add(0.98, tx + 20 * u * sc, 2.1 * u);
  for (let i = 0; i < ARR.length; i++) if (src[i] != null) add(ARR[i], src[i], (i < HEROES ? 3.0 : 2.1) * u * (S.portrait ? 0.8 : 1));
  add(SLAM, W / 2, 3.2 * u);
  if (!S.portrait) for (let j = 0; j < 12; j++) add(SHUT + j * 0.038 + 0.2, lerp(0.09, 0.91, j / 11) * W, 1.1 * u);
  else add(SHUT + 0.3, W / 2, 1.6 * u);
  const n = B.length;
  return x => {
    const xu = x / u;
    let y = 0;
    if (hum > 0.005) {
      const m = 0.55 + 0.45 * noise1(xu * 0.05 - lt * 0.8, 8);
      y += hum * m * (Math.sin(xu * 0.42 - lt * 7.5) * 0.55 + Math.sin(xu * 1.13 + lt * 4.3) * 0.25
        + noise1(xu * 0.7 - lt * 11, 4) * 0.4);
    }
    for (let k = 0; k < n; k += 3) {
      const tau = B[k + 1], d = Math.abs(x - B[k]) / u;
      const q = (d - tau * 150) / (6 + tau * 18);
      const e = Math.exp(-q * q) + Math.exp(-(d * d) / 36 - tau / 0.12);
      if (e < 0.003) continue;
      y += B[k + 2] * (1 - Math.exp(-tau / 0.02)) * Math.exp(-tau / 0.5) * e * Math.sin(d * 0.9 - tau * 38);
    }
    return y;
  };
}

function drawLine(ctx, S, wave) {
  const { W, H, u } = S, cy = H / 2;
  const step = 0.6 * u, x0 = -0.02 * W, n = Math.ceil((1.04 * W) / step);
  thread(ctx, S, c => {
    c.beginPath();
    for (let j = 0; j <= n; j++) { const x = x0 + j * step, y = cy + wave(x); if (j) c.lineTo(x, y); else c.moveTo(x, y); }
  });
}

// ── windows: where the line parts around a voice ──────────────────────────
/* A window is a lens on the line: its half-height follows a profile with
   rounded caps (r, k: k = 1 pinches to the thread, a small k is a rounded
   bar), rides the wave, and — while the voice is loud — breaks into bars
   whose heights jump like a meter. */
function prof(w, x) {
  const e = Math.min(x - w.x0, w.x1 - x);
  if (e <= 0) return w.h * (1 - w.k);
  if (e >= w.r) return w.h;
  const q = 1 - e / w.r, v = 1 - q * q;
  return w.h * (1 - w.k + w.k * (w.g ? Math.pow(v, w.g) : Math.sqrt(v)));
}
function flutter(w, x, lt) {
  return w.chat ? 1 + w.chat * noise1(((x - w.x0) / (w.x1 - w.x0)) * 3 + lt * 4.5, w.seed) : 1;
}

/** crop the character around the face, always right of its lettered name */
function crop(ctx, img, c, x, y, w, h, zoom) {
  if (!img || !img.width) { ctx.fillStyle = PAL.panel; ctx.fillRect(x, y, w, h); return; }
  const iw = img.width, ih = img.height, a = w / h;
  let sw, sh;
  if (a > iw / ih) { sw = iw / zoom; sh = sw / a; } else { sh = ih / zoom; sw = sh * a; }
  const nx = (c.nx / 900) * iw, room = iw - nx;
  if (sw > room) { sh *= room / sw; sw = room; }
  const sx = clamp(c.fx * iw - sw / 2, nx, iw - sw);
  const sy = clamp(c.fy * ih - sh / 2, 0, ih - sh);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

let scrimG = null, scrimCtx = null;
function scrim(ctx) {
  if (scrimCtx !== ctx) {
    scrimCtx = ctx;
    scrimG = ctx.createLinearGradient(0, 0, 0, 1);
    scrimG.addColorStop(0, 'rgba(10,10,9,0)'); scrimG.addColorStop(1, 'rgba(10,10,9,0.78)');
  }
  return scrimG;
}

function drawWindow(ctx, S, lt, w, wave) {
  const W = w.x1 - w.x0;
  if (W < 1 || w.h < 0.4) return;
  const yc = x => w.cy + (w.ride ? w.ride * wave(x) : 0);
  const cols = w.gap > 0.015 || w.speak > 0.015 || w.multi;
  const groups = new Map();         // owner → its outline (fused) or its bars
  let top = null;
  if (!cols) {
    // fused: one smooth outline, sampled densely at the caps
    const n = clamp(Math.round(W / (1.4 * S.u)), 10, 72);
    const T = [], Bt = [];
    for (let j = 0; j <= n; j++) {
      const x = w.x0 + W * (0.5 - 0.5 * Math.cos((Math.PI * j) / n));
      const y = yc(x), hh = prof(w, x) * flutter(w, x, lt);
      T.push([x, y - hh]); Bt.push([x, y + hh]);
    }
    groups.set(w.i, [T, Bt]);
    top = [T, Bt];
  } else {
    const n = clamp(Math.round(W / w.pitch), 5, 110), dx = W / n;
    const tops = [], bots = [];
    for (let j = 0; j < n; j++) {
      const xc = w.x0 + (j + 0.5) * dx, s = Math.abs((xc - (w.x0 + w.x1) / 2) / (W / 2));
      let gap = w.gap, hm = 1;
      if (w.speak > 0) hm = Math.max(0.08, 1 + w.speak * (0.65 * noise1(j * 0.91 + lt * 23, w.seed) + 0.35 * noise1(j * 0.21 - lt * 9, w.seed + 3)));
      let who = w.i;
      if (w.multi) { const r = w.multi(s, j, lt); who = r.who; hm *= r.hm; gap = Math.max(gap, r.gap); }
      const half = (dx * (1 - gap)) / 2, xa = xc - half, xb = xc + half;
      const fa = flutter(w, xa, lt) * hm, fb = flutter(w, xb, lt) * hm;
      const ya = yc(xa), yb = yc(xb), ha = prof(w, xa) * fa, hb = prof(w, xb) * fb;
      let g = groups.get(who); if (!g) groups.set(who, (g = []));
      g.push(xa, ya - ha, xb, yb - hb, xb, yb + hb, xa, ya + ha);
      if (w.lips > 0.01) {
        const ym = yc(xc), hc = prof(w, xc) * flutter(w, xc, lt) * hm;
        tops.push([xc, ym - hc]); bots.push([xc, ym + hc]);
      }
    }
    top = [tops, bots];
  }
  const bx = w.x0, by = w.cy - w.hImg, bw = W, bh = 2 * w.hImg;
  for (const [who, g] of groups) {
    ctx.save();
    ctx.beginPath();
    if (!cols) {
      const [T, Bt] = g;
      ctx.moveTo(T[0][0], T[0][1]);
      for (let j = 1; j < T.length; j++) ctx.lineTo(T[j][0], T[j][1]);
      for (let j = Bt.length - 1; j >= 0; j--) ctx.lineTo(Bt[j][0], Bt[j][1]);
      ctx.closePath();
    } else {
      for (let k = 0; k < g.length; k += 8) {
        ctx.moveTo(g[k], g[k + 1]); ctx.lineTo(g[k + 2], g[k + 3]);
        ctx.lineTo(g[k + 4], g[k + 5]); ctx.lineTo(g[k + 6], g[k + 7]); ctx.closePath();
      }
    }
    ctx.clip();
    const c = CAST[who];
    crop(ctx, S.img(c.img), c, bx, by, bw, bh, w.zoom);
    if (w.dim > 0.005) { ctx.fillStyle = `rgba(10,10,9,${w.dim})`; ctx.fillRect(bx, by, bw, bh); }
    if (w.scrim > 0.005) {
      ctx.save(); ctx.globalAlpha *= w.scrim;
      ctx.translate(bx, w.cy + w.h * 0.1); ctx.scale(bw, w.h * 0.95);
      ctx.fillStyle = scrim(ctx); ctx.fillRect(0, 0, 1, 1); ctx.restore();
    }
    if (w.label > 0.005) w.drawLabel(ctx, S, w);
    ctx.restore();
  }
  if (w.lips > 0.01 && top) {
    const o = { sharp: cols, glow: 0.55, alpha: w.lips, width: S.lw * 0.9 };
    thread(ctx, S, top[0], o); thread(ctx, S, top[1], o);
  }
}

// ── layouts ───────────────────────────────────────────────────────────────
/* wide: an accordion along the line. The newest voice is a wide lens, the
   others stand by as bars; the line fills from the right half, then the
   whole width, then evens out into the strip of twelve. */
function layoutWide(S, lt) {
  const { W, H, u } = S, cy = H / 2;
  const spread = seg(lt, 4.26, 4.86, siteE);        // CCATS pushes the cast across the line
  const X0 = lerp(0.5, 0.05, spread) * W, X1 = 0.95 * W;
  const even = seg(lt, EVEN[0], EVEN[1], siteE);
  const A = lerp(4.2, lerp(3.5, 3.0, invlerp(4.4, 9.4, lt)), spread);
  const Ha = 0.262 * H, Hi = 0.172 * H, Hf = 0.168 * H;
  const g = 0.9 * u, rho = 1.1 * u;
  const slots = [];
  let tot = 0, gsum = 0;
  for (let i = 0; i < ARR.length; i++) {
    const T = ARR[i], hero = i < HEROES;
    const op = seg(lt, T - 0.1, T + (hero ? 0.6 : 0.36), siteE);
    if (op <= 0) break;
    const act = (i < LAST ? 1 - seg(lt, ARR[i + 1] - 0.1, ARR[i + 1] + 0.32, siteE) : 1) * (1 - even);
    const wt = op * lerp(1, A, act), gp = slots.length ? g * op : 0;
    slots.push({ i, op, act, wt, gp });
    tot += wt; gsum += gp;
  }
  const avail = X1 - X0 - gsum, wins = [], src = new Array(12).fill(null);
  let x = X0;
  for (const s of slots) {
    x += s.gp;
    const w = (avail * s.wt) / tot, i = s.i, T = ARR[i], tau = lt - T, hero = i < HEROES;
    const lips = hero ? Math.max(0, spring(lt - (T - 0.08), 1.4, 6.5)) : seg(lt, T - 0.1, T + 0.3, outCubic);
    const d = 0.022 * Math.abs(i - 5.5), ks = lt - (SLAM + d);
    const lv = 1 + even * (0.05 * noise1(lt * 2.4 + i * 1.9, 21) + (ks > 0 ? 0.2 * (1 - Math.exp(-ks / 0.03)) * Math.exp(-ks / 0.2) : 0));
    const shut = 1 - seg(lt, SHUT + i * 0.038, SHUT + i * 0.038 + 0.22, inCubic);
    const hBase = lerp(lerp(Hi, Ha, s.act), Hf, even);
    const b = (hero ? burst(tau) : burst(tau * 1.4)) * (lt < EVEN[0] ? 1 : 0);
    // the thread zips each bar shut as it closes
    const zip = seg(lt, SHUT + i * 0.038 - 0.06, SHUT + i * 0.038 + 0.05) * (1 - seg(lt, SHUT + i * 0.038 + 0.18, SHUT + i * 0.038 + 0.24));
    const h = hBase * lips * shut * lv;
    const nameIn = seg(lt, SLAM + 0.1 + i * 0.035, SLAM + 0.45 + i * 0.035, outCubic) * (1 - seg(lt, TXT_OUT - 0.05, TXT_OUT + 0.15));
    wins.push({
      i, x0: x, x1: x + w, cy, ride: 1, h, hImg: hBase * 1.12,
      r: lerp(rho, 0.4 * w, s.act), k: lerp(Math.min(1, rho / Math.max(1, hBase)), 1, s.act), g: lerp(0.5, 0.85, s.act),
      gap: (hero ? 0.42 : 0.34) * b, speak: (hero ? 0.52 : 0.46) * b, chat: 0.05 * s.act, seed: 3 + i * 7,
      pitch: 1.25 * u, lips: Math.max(s.act * clamp(lips), zip), zoom: 1.08 + 0.06 * s.act * seg(lt, T, T + 2.5, outCubic),
      dim: 0.4 * (1 - s.act) * (1 - even), scrim: nameIn * 0.9, label: nameIn,
      drawLabel: barName
    });
    src[i] = x + w / 2;
    x += w;
  }
  return { wins, src };
}

function barName(ctx, S, w) {
  const c = CAST[w.i], size = 2.1 * S.u;
  ctx.save();
  ctx.translate(w.x0 + 2.8 * S.u, w.cy + w.h - 1.6 * S.u + (1 - w.label) * 1.5 * S.u);
  ctx.rotate(-Math.PI / 2);
  text(ctx, S, c.name, 0, 0, { size, weight: 800, tracking: 0.1, color: PAL.ink, alpha: w.label });
  ctx.restore();
}
function cellName(ctx, S, w) {
  const c = CAST[w.i], size = 2.5 * S.u;
  text(ctx, S, c.name, w.x0 + 1.5 * S.u, w.cy + w.h - 1.5 * S.u + (1 - w.label) * S.u, { size, weight: 800, tracking: 0.06, color: PAL.ink, alpha: w.label });
}

/* phone: one speaking window on the line; each new voice runs out from its
   centre as a pulse of bars and leaves the next face behind it. At the hold
   the line breathes out a 3 × 4 grid. */
function layoutTall(S, lt) {
  const { W, H, u } = S, cy = H / 2;
  const wins = [], src = new Array(12).fill(null);
  const x0 = 0.07 * W, x1 = 0.93 * W;
  const lips = Math.max(0, spring(lt - (ARR[0] - 0.08), 1.3, 6.5));
  const shut = 1 - seg(lt, SHUTP[0], SHUTP[1], inCubic);
  if (lt > ARR[0] - 0.1 && shut > 0) {
    let bump = 0;
    const fr = ARR.map((T, i) => (i === 0 ? 9 : seg(lt, T - 0.06, T + 0.32, outCubic) * 1.18));
    let live = false;
    for (let i = 1; i < ARR.length; i++) {
      const k = lt - ARR[i];
      if (k > -0.05 && k < 0.6) bump = Math.max(bump, 0.045 * Math.exp(-Math.max(0, k) / 0.14) * seg(k, -0.05, 0));
      if (fr[i] > 0 && fr[i] < 1.18) live = true;
    }
    const b0 = burst(lt - ARR[0]);
    let cur = 0; for (let i = 1; i < ARR.length; i++) if (fr[i] >= 1.18) cur = i;
    const hF = 0.19 * H, h = hF * lips * shut * (1 + bump);
    wins.push({
      i: cur, x0, x1, cy, ride: 1, h, hImg: hF * 1.1, r: 0.24 * (x1 - x0), k: 1,
      gap: 0.42 * b0, speak: 0.48 * b0, chat: 0.045, seed: 5 + cur * 7, pitch: 1.45 * u,
      lips: clamp(lips) * shut, zoom: 1.12, dim: 0, scrim: 0, label: 0,
      multi: live ? (s, j, t) => {
        let who = 0, hm = 1, gap = 0;
        for (let i = LAST; i >= 1; i--) if (fr[i] > s) { who = i; break; }
        for (let i = 1; i < ARR.length; i++) {
          const f = fr[i];
          if (f <= 0 || f >= 1.18) continue;
          const q = (s - f) / 0.085, p = Math.exp(-q * q) * (1 - seg(f, 0.95, 1.18));
          hm *= 1 + 0.42 * p * (0.6 + 0.4 * noise1(j * 0.9 + t * 20, i));
          gap = Math.max(gap, 0.5 * p);
        }
        return { who, hm, gap };
      } : null
    });
    for (let i = 0; i < ARR.length; i++) if (lt > ARR[i] - 0.1) src[i] = W / 2;
  }
  // the hold: a grid of twelve that breathes out of the line
  if (lt > SLAM - 0.1) {
    const gx0 = 0.06 * W, gx1 = 0.94 * W, cg = 1.8 * u, cw = (gx1 - gx0 - 2 * cg) / 3;
    const top = 0.205 * H, bot = 0.795 * H, mid = 0.032 * H, rg = 1.8 * u;
    const rh = (bot - top - mid - 2 * rg) / 4;
    const rowY = [top, top + rh + rg, cy + mid / 2, cy + mid / 2 + rh + rg];
    // inner rows breathe out of the line; outer rows unfold from behind them
    const cells = [];
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(c - 1) * 0.045;
      const qi = seg(lt, SLAM - 0.02 + d, SLAM + 0.45 + d, siteE);
      const zi = seg(lt, SHUT + 0.14 + c * 0.05, SHUT + 0.4 + c * 0.05, inCubic);
      const qo = seg(lt, SLAM + 0.14 + d, SLAM + 0.64 + d, siteE);
      const zo = seg(lt, SHUT + c * 0.05, SHUT + 0.24 + c * 0.05, inCubic);
      const ei = qi * (1 - zi), eo = qo * (1 - zo);
      const zip = seg(lt, SHUT + 0.3 + c * 0.05, SHUT + 0.36 + c * 0.05) * (1 - seg(lt, SHUT + 0.4 + c * 0.05, SHUT + 0.46 + c * 0.05));
      for (const [ri, ro] of [[1, 0], [2, 3]]) {
        const ciy = lerp(cy, rowY[ri] + rh / 2, ei), hi = (rh / 2) * ei;
        cells.push({ k: ro * 3 + c, c, cyk: lerp(ciy, rowY[ro] + rh / 2, eo), h: hi, ride: 0, e: ei * eo, zip: 0, outer: true });
        cells.push({ k: ri * 3 + c, c, cyk: ciy, h: hi, ride: 1 - ei, e: ei, zip, outer: false });
      }
    }
    cells.sort((a, b) => a.outer === b.outer ? 0 : a.outer ? -1 : 1);
    for (const q of cells) {
      if (q.h <= 0.4) continue;
      const k = q.k, c = q.c;
      const nameIn = seg(lt, SLAM + 0.36 + k * 0.03, SLAM + 0.66 + k * 0.03, outCubic) * (1 - seg(lt, TXT_OUT - 0.05, TXT_OUT + 0.15));
      wins.push({
        i: k, x0: gx0 + c * (cw + cg), x1: gx0 + c * (cw + cg) + cw, cy: q.cyk, ride: q.ride, h: q.h,
        hImg: rh / 2, r: 1.3 * u, k: Math.min(1, (1.3 * u) / Math.max(1, q.h)), gap: 0, speak: 0, chat: 0, seed: k,
        pitch: 2 * u, lips: q.zip, zoom: 1.28, dim: 0.35 * (1 - q.e), scrim: nameIn * 0.9, label: nameIn, drawLabel: cellName
      });
    }
  }
  return { wins, src };
}

// ── type ─────────────────────────────────────────────────────────────────
/** masked kinetic type that rises in, and leaves upward (or down with o.drop) */
function swap(ctx, S, str, x, y, o, lt, tIn, dur, tOut, outDur = 0.16) {
  const rv = seg(lt, tIn, tIn + dur);
  if (rv <= 0) return;
  const ex = tOut == null ? 0 : seg(lt, tOut, tOut + outDur);
  if (ex >= 1) return;
  const size = o.size, spread = o.spread ?? 0.1;
  text(ctx, S, str, x, y, {
    ...o, mask: true, reveal: rv, window: o.window ?? 0.55,
    glyph: (gi, p, n) => {
      const q = ex > 0 ? clamp(ex * 1.6 - (0.6 * gi) / Math.max(1, n - 1)) : 0;
      return { dx: (1 - p) * (gi - (n - 1) / 2) * size * spread, dy: (o.drop ? 1.35 : -1.15) * q * q * size };
    }
  });
}

function nameStyle(S, size, align) { return { size, weight: 800, tracking: 0.01, align, color: PAL.ink }; }

/** the speaker's name, the rolling VOICE nn / 12 counter and the role */
function speakers(ctx, S, lt, o) {
  for (let i = 0; i < ARR.length; i++) {
    const tIn = ARR[i] - 0.05, tOut = i < LAST ? ARR[i + 1] - 0.12 : o.endAt;
    if (lt < tIn || lt > tOut + 0.2) continue;
    swap(ctx, S, CAST[i].name, o.x, o.y, nameStyle(S, o.size, o.align), lt, tIn, i < HEROES ? 0.5 : 0.34, tOut);
  }
  // counter row
  const st = { size: o.isize, weight: 700, tracking: 0.16 };
  const on = seg(lt, ARR[0] - 0.05, ARR[0] + 0.4), off = o.endAt;
  if (on <= 0 || lt > off + 0.25) return;
  const wV = measure(ctx, 'VOICE', st), wN = measure(ctx, '00', st), wS = measure(ctx, '/ 12', st), sp = o.isize * 0.7;
  const total = wV + sp + wN + sp * 0.6 + wS;
  const left = o.align === 'right' ? o.x - total : o.x;
  const y = o.iy;
  swap(ctx, S, 'VOICE', left, y, { ...st, color: PAL.dim }, lt, ARR[0] - 0.05, 0.4, off, 0.2);
  swap(ctx, S, '/ 12', left + wV + sp + wN + sp * 0.6, y, { ...st, color: PAL.dim }, lt, ARR[0] + 0.02, 0.4, off + 0.03, 0.2);
  for (let i = 0; i < ARR.length; i++) {
    const tIn = ARR[i] - 0.04, tOut = i < LAST ? ARR[i + 1] - 0.08 : off;
    if (lt < tIn || lt > tOut + 0.2) continue;
    swap(ctx, S, numStr(i), left + wV + sp + wN, y, { ...st, color: PAL.goldHi, align: 'right', spread: 0 }, lt, tIn, 0.26, tOut, 0.12);
  }
  // role, with the speaker's colour as a swatch
  const rx = o.align === 'right' ? left - 2.2 * o.isize : left + total + 2.2 * o.isize;
  for (const [a, b, str] of [[0, 9, role(CAST[0])], [10, 11, role(CAST[10])]]) {
    const tIn = ARR[a] - 0.02, tOut = b < LAST ? ARR[b + 1] - 0.1 : off;
    if (lt < tIn || lt > tOut + 0.25) continue;
    swap(ctx, S, str, rx, y, { ...st, color: PAL.dim, align: o.align }, lt, tIn, 0.4, tOut, 0.18);
  }
  let cur = -1; for (let i = 0; i < ARR.length; i++) if (lt >= ARR[i] - 0.05) cur = i;
  if (cur >= 0) {
    const a = on * (1 - seg(lt, off, off + 0.15));
    const sx = o.align === 'right' ? left - 1.1 * o.isize : left + total + 1.1 * o.isize;
    const pop = 1 + 0.6 * Math.exp(-Math.max(0, lt - ARR[cur]) / 0.12) * (lt >= ARR[cur] - 0.05 ? 1 : 0);
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = CAST[cur].tone;
    ctx.beginPath(); ctx.arc(sx, y - o.isize * 0.36, o.isize * 0.26 * pop, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}

function titleBlock(ctx, S, lt, o) {
  const { u } = S, out = o.out;
  swap(ctx, S, 'THE CHILL FARM — WORLD & VOICES', o.x, o.ey, { size: o.esize, weight: 600, tracking: 0.2, color: PAL.gold, spread: 0 }, lt, 0.45, 0.55, out, 0.25);
  swap(ctx, S, 'A world', o.x, o.y1, { size: o.dsize, weight: 800, tracking: -0.01, color: PAL.ink, drop: true }, lt, 0.6, 0.45, out + 0.06, 0.24);
  swap(ctx, S, 'that speaks.', o.x, o.y2, { size: o.dsize, weight: 800, tracking: -0.01, color: PAL.ink, drop: true }, lt, 0.8, 0.5, out, 0.24);
  swap(ctx, S, 'Press play. Meet the cast.', o.x, o.sy, { size: o.ssize, weight: 500, tracking: 0.01, color: PAL.dim, spread: 0 }, lt, 1.05, 0.6, out - 0.04, 0.22);
}

function holdType(ctx, S, lt, o) {
  const { W } = S;
  swap(ctx, S, 'TEN COLLECTIBLES · TWO STORY NPCS', W / 2, o.ey, { size: o.esize, weight: 600, tracking: 0.2, color: PAL.dim, align: 'center', spread: 0 }, lt, SLAM - 0.12, 0.5, TXT_OUT, 0.2);
  const st = { size: o.dsize, weight: 800, tracking: -0.01 };
  const w12 = measure(ctx, '12', st), wv = measure(ctx, ' voices', st), x = W / 2 - (w12 + wv) / 2;
  swap(ctx, S, '12', x, o.y, { ...st, color: PAL.goldHi, spread: 0.25, drop: true }, lt, SLAM - 0.04, 0.3, TXT_OUT + 0.02, 0.2);
  swap(ctx, S, ' voices', x + w12, o.y, { ...st, color: PAL.ink, spread: 0.12, drop: true }, lt, SLAM + 0.02, 0.32, TXT_OUT + 0.05, 0.2);
  swap(ctx, S, 'CAST & DIRECTED WITH ELEVENLABS', W / 2, o.cy, { size: o.csize, weight: 700, tracking: 0.22, color: PAL.gold, align: 'center', spread: 0 }, lt, SLAM + 0.12, 0.45, TXT_OUT + 0.08, 0.2);
}

// ── lens ─────────────────────────────────────────────────────────────────
function lens(S, lt, src) {
  const fx = S.fx, u = S.u;
  const hit = (t0, d) => { const x = lt - t0; return x >= 0 && x < d ? (1 - x / d) ** 2 : 0; };
  let ab = 0, shake = 0;
  for (let i = 0; i < ARR.length; i++) {
    const hero = i < HEROES, k = hit(ARR[i], hero ? 0.32 : 0.18);
    ab = Math.max(ab, k * (hero ? 0.4 : 0.14));
    shake = Math.max(shake, k * (hero ? 0.55 : 0.18) * u);
  }
  const ks = hit(SLAM, 0.4);
  ab = Math.max(ab, ks * 0.5); shake = Math.max(shake, ks * 0.8 * u);
  fx.ab = ab; fx.shake = shake;
  // shock rings: the phrase turns (FOT, FROAK) and the slam
  for (const [t0, i] of [[ARR[1], 1], [ARR[8], 8], [SLAM, -1]]) {
    const p = (lt - t0) / 0.65;
    if (p > 0 && p < 1) {
      fx.warp = 0.18 + 0.82 * p;         // born already clear of the face
      fx.warpX = i < 0 || src[i] == null ? 0.5 : clamp(src[i] / S.W, 0.1, 0.9);
      fx.warpY = 0.5;
    }
  }
}

export default {
  id: 'cast',
  title: 'The Cast',
  caption: 'Twelve voices — ten collectible characters plus two story NPCs — each cast, directed and generated with ElevenLabs.',
  assets: CAST.map(c => c.img),
  models: [],
  cues: ARR.map((at, i) => ({ at, voice: CAST[i].v })),
  still: 11.1,
  draw(ctx, S) {
    const lt = S.lt;
    if (lt < 0.09 || lt > FLAT + 0.02) { rest(ctx, S); return; }
    const L = S.portrait ? layoutTall(S, lt) : layoutWide(S, lt);
    const wave = makeWave(S, lt, L.src);
    drawLine(ctx, S, wave);
    for (const w of L.wins) drawWindow(ctx, S, lt, w, wave);
    const { W, H, u } = S;
    if (!S.portrait) {
      titleBlock(ctx, S, lt, { x: 0.055 * W, ey: 0.283 * H, esize: 1.8 * u, y1: 0.372 * H, y2: 0.455 * H, dsize: 7.2 * u, sy: 0.585 * H, ssize: 2.5 * u, out: 3.96 });
      speakers(ctx, S, lt, { x: 0.95 * W, y: 0.205 * H, size: 7.4 * u, align: 'right', iy: 0.838 * H, isize: 1.95 * u, endAt: 9.86 });
      holdType(ctx, S, lt, { ey: 0.128 * H, esize: 1.85 * u, y: 0.238 * H, dsize: 8.6 * u, cy: 0.8 * H, csize: 2.05 * u });
    } else {
      titleBlock(ctx, S, lt, { x: 0.07 * W, ey: 0.112 * H, esize: 2.3 * u, y1: 0.168 * H, y2: 0.212 * H, dsize: 8.6 * u, sy: 0.252 * H, ssize: 3.3 * u, out: 9.5 });
      speakers(ctx, S, lt, { x: 0.07 * W, y: 0.772 * H, size: 10.5 * u, align: 'left', iy: 0.818 * H, isize: 2.5 * u, endAt: 9.7 });
      holdType(ctx, S, lt, { ey: 0.1 * H, esize: 2.3 * u, y: 0.166 * H, dsize: 11 * u, cy: 0.85 * H, csize: 2.5 * u });
    }
    lens(S, lt, L.src);
  }
};
