/* 3 — Land of Hope. The flagship original series.

   The thread lifts off the rest line into a gateway arch; a window onto the
   world opens inside it and the chrome lockup rises through the horizon like
   a sun, its reflection sinking into the lake below. Then the line becomes
   the series' rail: the arch is pulled flat and away, the lockup docks as the
   channel bug, and four episodes ride in along the thread like frames on a
   strip — each landing on a beat and sending a pulse down the line — while a
   counter rolls to 17 minutes. At the end the frames fold down into the line
   and stream off it, and the thread lies flat again. */
import {
  PAL, clamp, lerp, invlerp, seg, smoothstep, TAU,
  inQuad, inCubic, outCubic, inOutCubic, inOutQuad, outExpo, outBack,
  bezier, spring, rrect, thread, rest, text, measure
} from '../kit.js';

const PLATE = 'assets/voices-bg.jpg';
const EPS = [
  { img: 'assets/ep1.jpg', ep: 'EP 01 · PILOT', title: 'The World & the Relic', rt: '2:31', fx: 0.2, fy: 0.5 },
  { img: 'assets/ep2.jpg', ep: 'EP 02', title: 'The Corruption Spreads', rt: '2:33', fx: 0.02, fy: 0.55 },
  { img: 'assets/ep3.jpg', ep: 'EP 03', title: 'The Squad & the Fall', rt: '3:41', fx: 0.06, fy: 0.25 },
  { img: 'assets/ep4.jpg', ep: 'EP 04', title: 'Hope, Restored', rt: '3:52', fx: 0.3, fy: 0.62 }
];

/* the clock (local seconds; beats fall at k × 0.625) */
const ARCH_UP = 0.625;                    // beat 1: the thread lifts into the arch
const LAND = [4.375, 6.25, 8.125, 10.0];  // each episode lands on a beat; EP 04 on the phrase turn
const MOVE = [[3.66, 4.58], [5.79, 6.45], [7.66, 8.33], [9.53, 10.2]];
const STREAM = [11.25, 12.12];            // everything streams off along the thread
const STEP = bezier(0.64, -0.09, 0.2, 1.045);    // a small wind-up, a whip, a hair of overshoot
const OUT = bezier(0.55, -0.08, 0.95, 0.55);     // the stream-off: leans back, then goes

// ── layout, per frame size ────────────────────────────────────────────────
let LY = null;
function lay(S) {
  const key = S.W + 'x' + S.H;
  if (LY && LY.key === key) return LY;
  const { W, H, u } = S, P = S.portrait;
  const L = { key, P };
  if (!P) {
    Object.assign(L, {
      R1: Math.min(0.42 * W, 80 * u), A1: 36 * u,
      heroW: 100 * u, heroLift: 13 * u,
      bugW: 30 * u, bugY: 0.125 * H,
      drop: 7.5 * u,                                  // the rail sinks a little while the episodes run
      ph: 47 * u, pw: 37.6 * u, sp: 50 * u, D0: 108 * u, gap: 1.2 * u, side: 0.7,
      refl: 12 * u,
      eyeDy: 12 * u, eyeS: 2.2 * u,
      labDy: 8.8 * u, labS: 2.05 * u, titDy: 17.6 * u, titS: 5.1 * u, rtDy: 24.4 * u,
      cntS: 7.4 * u, cntMin: 2.1 * u, cntLab: 1.7 * u
    });
    L.bugX = 0.055 * W + L.bugW / 2;
    L.cntX = 0.945 * W; L.cntY = 0.165 * H; L.cntAlign = 'right';
  } else {
    Object.assign(L, {
      R1: 0.45 * W, A1: 66 * u,
      heroW: 86 * u, heroLift: 13 * u,
      bugW: 44 * u, bugY: H / 2 - 84 * u,
      drop: 0,
      ph: 66 * u, pw: 52.8 * u, sp: 56 * u, D0: 110 * u, gap: 1.4 * u, side: 0.74,
      refl: 26 * u,
      eyeDy: 14 * u, eyeS: 2.7 * u,
      labDy: 12 * u, labS: 2.7 * u, titDy: 24 * u, titS: 6.6 * u, rtDy: 33 * u,
      cntS: 13 * u, cntMin: 3.4 * u, cntLab: 2.5 * u
    });
    L.bugX = W / 2;
    L.cntX = W / 2; L.cntY = H / 2 + 62 * u; L.cntAlign = 'center';
  }
  // the 3D lockup renders into one fixed-size canvas (resizing the renderer is
  // what costs), which is then drawn at hero size and scaled down for the bug
  L.rw = Math.round(L.heroW * 1.12); L.rh = Math.round(L.rw / 3.3);
  LY = L;
  return L;
}

// ── cached pieces ─────────────────────────────────────────────────────────
let GLOW = null;
function glow() {
  if (GLOW) return GLOW;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,236,190,1)'); r.addColorStop(0.22, 'rgba(236,196,120,.55)');
  r.addColorStop(0.55, 'rgba(216,160,90,.16)'); r.addColorStop(1, 'rgba(216,160,90,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return (GLOW = c);
}
/* gradients are built relative to the rail (y = 0) and drawn translated */
let GR = null;
function grads(ctx, L) {
  if (GR && GR.key === L.key) return GR;
  const fade = ctx.createLinearGradient(0, 0, 0, L.refl);        // the lake: reflections sink into black
  fade.addColorStop(0, 'rgba(10,10,9,0.25)'); fade.addColorStop(1, 'rgba(10,10,9,1)');
  const dim = ctx.createLinearGradient(0, -L.A1 * 1.15, 0, 0);   // the sky: darker toward the horizon
  dim.addColorStop(0, 'rgba(10,10,9,0.2)'); dim.addColorStop(0.55, 'rgba(10,10,9,0.42)'); dim.addColorStop(1, 'rgba(10,10,9,0.8)');
  return (GR = { key: L.key, fade, dim });
}

// ── time → the strip ──────────────────────────────────────────────────────
function stripIdx(t) {
  let i = 0;
  for (const [a, b] of MOVE) i += STEP(invlerp(a, b, t));
  return i;
}
const slotPos = (L, k) => (k === 0 ? 0 : L.D0 + (k - 1) * L.sp);
const posAt = (L, i) => (i <= 1 ? i * L.D0 : L.D0 + (i - 1) * L.sp);
const streamAt = (S, t) => OUT(invlerp(STREAM[0], STREAM[1], t)) * S.W * 1.35;
const itemX = (S, L, k, t) => S.W / 2 + slotPos(L, k) - posAt(L, stripIdx(t)) - streamAt(S, t);
const railY = (S, L, t) => S.H / 2 + L.drop * (inOutCubic(invlerp(3.66, 4.5, t)) - inOutCubic(invlerp(11.3, 12.15, t)));

// ── the arch ──────────────────────────────────────────────────────────────
function archGeom(S, L, t, y) {
  const up = invlerp(ARCH_UP, ARCH_UP + 1.05, t);
  const flat = inCubic(invlerp(3.6, 4.1, t));     // the arch drops like a curtain as the strip pulls it away
  return {
    cx: itemX(S, L, 0, t), y,
    R: lerp(0.08 * S.W, L.R1, outExpo(up)) * (1 + 0.12 * flat),
    A: L.A1 * outBack(up, 1.5) * (1 - flat),
    open: up, flat
  };
}
function archShape(ctx, S, g, closed) {
  const { cx, R, A, y } = g;
  const f = Math.min(1.8 * S.u, A * 0.45, R * 0.3), th = Math.asin(f / A);
  if (closed) ctx.moveTo(cx - R - f, y);
  else { ctx.moveTo(-0.02 * S.W, y); ctx.lineTo(cx - R - f, y); }
  ctx.quadraticCurveTo(cx - R, y, cx - R * Math.cos(th), y - f);
  ctx.ellipse(cx, y, R, A, 0, Math.PI + th, TAU - th);
  ctx.quadraticCurveTo(cx + R, y, cx + R + f, y);
  if (closed) ctx.closePath(); else ctx.lineTo(1.02 * S.W, y);
}

function drawWorld(ctx, S, L, g, t) {
  if (g.A < 0.5) return;
  const img = S.img(PLATE), y = g.y, G = grads(ctx, L);
  const bw = L.R1 * 2.1, bh = L.A1 * 1.15;
  const px = S.W / 2 + (g.cx - S.W / 2) * 0.55;          // the plate drifts slower than its window
  const kb = seg(t, 0.6, 4.4);
  const plate = () => {
    if (img) cover(ctx, img, px - bw / 2, y - bh, bw, bh, lerp(0.5, 0.62, kb), lerp(0.3, 0.42, kb), 1.06 + 0.1 * kb);
    ctx.save(); ctx.translate(0, y); ctx.fillStyle = G.dim; ctx.fillRect(px - bw / 2, -bh, bw, bh); ctx.restore();
  };
  const a = clamp(g.open * 3) * (1 - g.flat * g.flat);
  ctx.save(); ctx.globalAlpha = a;
  ctx.beginPath(); archShape(ctx, S, g, true); ctx.save(); ctx.clip();
  plate();
  // a sunrise on the horizon, behind where the lockup will rise
  const gl = glow(), sw = g.R * 2.4, sh = g.A * 0.95;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a * 0.55 * smoothstep(0.1, 0.8, g.open);
  ctx.drawImage(gl, g.cx - sw / 2, y - sh / 2, sw, sh);
  ctx.restore();
  // the lake: the same window, mirrored under the line
  ctx.beginPath(); ctx.rect(0, y, S.W, L.refl); ctx.clip();
  ctx.translate(0, 2 * y); ctx.scale(1, -1);
  ctx.globalAlpha = a * 0.5;
  ctx.beginPath(); archShape(ctx, S, g, true); ctx.clip();
  plate();
  ctx.restore();
}

// ── images ────────────────────────────────────────────────────────────────
/** like the kit's cover(), with focus and zoom passed flat */
function cover(ctx, img, x, y, w, h, fx, fy, zoom) {
  const c = crop(img, w / h, fx, fy, zoom);
  ctx.drawImage(img, c[0], c[1], c[2], c[3], x, y, w, h);
}
function crop(img, r, fx, fy, zoom) {
  const ir = img.width / img.height;
  let sw, sh;
  if (ir > r) { sh = img.height; sw = sh * r; } else { sw = img.width; sh = sw / r; }
  sw /= zoom; sh /= zoom;
  return [clamp((img.width - sw) * fx, 0, img.width - sw), clamp((img.height - sh) * fy, 0, img.height - sh), sw, sh];
}

// ── the lockup ────────────────────────────────────────────────────────────
function lockupState(S, L, t, g) {
  if (t < 0.95 || t > STREAM[0] + 0.75) return null;
  const rise = seg(t, 1.0, 2.45, bezier(0.2, 0.7, 0.25, 1));
  const dock = seg(t, 3.42, 4.4, inOutCubic);
  const leave = seg(t, STREAM[0] + 0.05, STREAM[0] + 0.7, inCubic);
  let yaw = lerp(-0.3, -0.04, inOutCubic(seg(t, 1.0, 3.6)));
  yaw += 0.34 * Math.sin(Math.PI * dock);                   // a turn of the wrist as it flies up
  yaw = lerp(yaw, 0.1 * Math.sin((t - 4.45) * 1.25), seg(t, 4.2, 4.9));
  const pitch = lerp(0.2, 0, seg(t, 1.0, 2.6, outCubic)) - 0.12 * Math.sin(Math.PI * dock);
  const heroH = L.heroW / 3.3;
  const hy = lerp(S.H / 2 + heroH * 0.62, S.H / 2 - L.heroLift, rise);
  const w = lerp(L.heroW, L.bugW, dock);
  // fly by the left edge so the shrinking lockup never leaves the frame
  const hx = S.W / 2 + (g.cx - S.W / 2) * 0.25;
  const left = lerp(hx - L.heroW / 2, L.bugX - L.bugW / 2, outCubic(dock));
  return {
    opts: { w: L.rw, h: L.rh, yaw, pitch, fit: 1.2, exposure: lerp(0.55, 1.08, seg(t, 1.0, 2.8, outCubic)) },
    x: left + w / 2 - streamAt(S, t) * 0.35,
    y: lerp(hy, L.bugY, inOutCubic(dock)),
    w, h: w / 3.3, a: 1 - leave,
    ra: 0.32 * (1 - smoothstep(0, 0.35, dock))
  };
}
let BUF = null;
/** the reflection pass: renders the lockup, draws it mirrored into the lake, keeps a copy for the front pass */
function drawLockupReflection(ctx, S, L, st, y) {
  if (!st || st.ra <= 0.01) return;
  const cv = S.logo3d('landofhope', st.opts);
  if (!cv) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y, S.W, L.refl); ctx.clip();
  ctx.translate(0, 2 * y); ctx.scale(1, -1);
  ctx.globalAlpha = st.ra;
  ctx.drawImage(cv, st.x - st.w / 2, st.y - st.h / 2, st.w, st.h);
  ctx.restore();
  if (!BUF) BUF = document.createElement('canvas');
  if (BUF.width !== cv.width || BUF.height !== cv.height) { BUF.width = cv.width; BUF.height = cv.height; }
  const b = BUF.getContext('2d');
  b.clearRect(0, 0, BUF.width, BUF.height); b.drawImage(cv, 0, 0);
  st.buf = BUF;
}
function drawLockup(ctx, S, L, st, y) {
  if (!st || st.a <= 0.005) return;
  const cv = st.buf || S.logo3d('landofhope', st.opts);
  if (!cv) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, S.W, y); ctx.clip();     // it rises out of the line
  ctx.globalAlpha = st.a;
  ctx.drawImage(cv, st.x - st.w / 2, st.y - st.h / 2, st.w, st.h);
  ctx.restore();
}

// ── the episodes ──────────────────────────────────────────────────────────
function posterState(S, L, k, t) {
  const x = itemX(S, L, k + 1, t), d = x - S.W / 2;
  const nd = smoothstep(0, 1, Math.abs(d) / L.sp);
  const sc = lerp(1, L.side, nd);
  const fold = 1 - seg(t, STREAM[0] + 0.12, STREAM[1] - 0.1, inCubic);   // they fold down into the line
  const x1 = itemX(S, L, k + 1, t - 1 / 60);
  return { x, d, nd, sc, w: L.pw * sc, h: L.ph * sc * fold, v: (x - x1) * 60 };
}

function drawPosters(ctx, S, L, t, y, pass) {
  if (t < MOVE[0][0] - 0.05 || t > STREAM[1]) return;
  const y0 = y - L.gap, r = 0.7 * S.u;
  // far ones first so the frame in focus sits on top
  const order = [0, 1, 2, 3].map(k => [k, posterState(S, L, k, t)]).sort((a, b) => Math.abs(b[1].d) - Math.abs(a[1].d));
  for (const [k, p] of order) {
    const e = EPS[k], img = S.img(e.img);
    if (!img || p.h < 0.5 || p.x + p.w / 2 < -S.W * 0.05 || p.x - p.w / 2 > S.W * 1.05) continue;
    const zoom = 1.1 + 0.06 * seg(t, LAND[k] - 0.6, LAND[k] + 2.2);
    // crop for the unfolded frame (folding squashes, it does not re-crop); the image
    // slides inside its frame against the direction of travel
    const c = crop(img, p.w / (L.ph * p.sc), clamp(e.fx - (p.d / S.W) * 0.16), e.fy, zoom);
    const x = p.x - p.w / 2, top = y0 - p.h;
    if (pass === 'refl') {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, y, S.W, L.refl); ctx.clip();
      ctx.translate(0, 2 * y); ctx.scale(1, -1);
      ctx.globalAlpha = 0.34 * (1 - p.nd * 0.5);
      ctx.drawImage(img, c[0], c[1], c[2], c[3], x, top, p.w, p.h);
      ctx.restore();
      continue;
    }
    // smear: a fast frame leaves ghosts along the rail behind it
    const sp = Math.abs(p.v) / S.u;
    if (sp > 50) {
      const n = 6, gA = clamp((sp - 50) / 150) * 0.2;
      for (let i = n; i >= 1; i--) {
        ctx.globalAlpha = gA * (1 - i / (n + 1));
        ctx.drawImage(img, c[0], c[1], c[2], c[3], x - p.v * i * 0.0045, top, p.w, p.h);
      }
      ctx.globalAlpha = 1;
    }
    ctx.save();
    rrect(ctx, x, top, p.w, p.h, r); ctx.clip();
    ctx.drawImage(img, c[0], c[1], c[2], c[3], x, top, p.w, p.h);
    const dark = 0.62 * p.nd;
    if (dark > 0.01) { ctx.fillStyle = `rgba(10,10,9,${dark})`; ctx.fillRect(x, top, p.w, p.h); }
    ctx.restore();
    // a hairline edge that catches the gold on the frame in focus
    rrect(ctx, x + 0.5, top + 0.5, p.w - 1, p.h - 1, r);
    ctx.lineWidth = Math.max(1, 0.12 * S.u);
    ctx.strokeStyle = `rgba(243,223,168,${0.5 * (1 - p.nd)})`;
    ctx.stroke();
  }
}

function drawEpType(ctx, S, L, t, y) {
  if (t < LAND[0] - 0.4 || t > STREAM[1]) return;
  const u = S.u;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y + S.lw * 1.6, S.W, S.H); ctx.clip();   // the type hangs from the rail
  for (let k = 0; k < 4; k++) {
    const rv = seg(t, LAND[k] - 0.3, LAND[k] + 0.5);
    if (rv <= 0) continue;
    const p = posterState(S, L, k, t);
    const a = 1 - smoothstep(0.04 * L.sp, (L.P ? 0.22 : 0.4) * L.sp, Math.abs(p.d));
    if (a <= 0.01) continue;
    const x = S.W / 2 + p.d * 1.45;                                 // type rides a layer nearer than the frames
    const e = EPS[k];
    ctx.globalAlpha = a;
    // the label drops out of the line …
    text(ctx, S, e.ep, x, y + L.labDy, { size: L.labS, weight: 700, tracking: 0.22, align: 'center', color: PAL.gold,
      reveal: seg(rv, 0, 0.5), window: 0.55, rise: -L.labDy - 0.6 * u });
    // … the title rises from its own sill, a glyph at a time …
    const lines = titleLines(ctx, S, L, e.title);
    lines.forEach((ln, i) => {
      text(ctx, S, ln, x, y + L.titDy + i * L.titS * 1.2, { font: 'serif', size: L.titS, tracking: 0.02, align: 'center',
        color: PAL.ink, reveal: seg(rv, 0.1 + i * 0.12, 0.8 + i * 0.12), window: 0.3, mask: true });
    });
    // … and the runtime slides in behind a small play mark
    const rt = seg(rv, 0.4, 1, outCubic);
    if (rt > 0) {
      const ry = y + L.rtDy + (lines.length - 1) * L.titS * 1.2, s = L.labS;
      const tw = measure(ctx, e.rt, { size: s * 1.1, weight: 600, tracking: 0.12 });
      const bx = x - (tw + s * 1.5) / 2 - (1 - rt) * 3 * u;
      ctx.globalAlpha = a * rt;
      ctx.fillStyle = PAL.gold;
      ctx.beginPath(); ctx.moveTo(bx, ry - s * 0.8); ctx.lineTo(bx + s * 0.72, ry - s * 0.4); ctx.lineTo(bx, ry); ctx.closePath(); ctx.fill();
      text(ctx, S, e.rt, bx + s * 1.5, ry, { size: s * 1.1, weight: 600, tracking: 0.12, color: PAL.dim });
    }
  }
  ctx.restore();
}
const LINES = new Map();
function titleLines(ctx, S, L, str) {
  const key = L.key + str;
  let v = LINES.get(key);
  if (v) return v;
  const max = S.W * (L.P ? 0.86 : 0.6);
  if (measure(ctx, str, { font: 'serif', size: L.titS, tracking: 0.02 }) <= max) v = [str];
  else {
    const w = str.split(' '), h = Math.ceil(w.length / 2);
    v = [w.slice(0, h).join(' '), w.slice(h).join(' ')];
  }
  LINES.set(key, v);
  return v;
}

// ── the counter: 00 → 17 min, an odometer that lands on the phrase turn ──
function drawCounter(ctx, S, L, t) {
  const inn = seg(t, 4.05, 4.75, outExpo), out = seg(t, STREAM[0], STREAM[0] + 0.45, inCubic);
  if (inn <= 0 || out >= 1) return;
  const v = 17 * seg(t, 4.35, LAND[3]);
  const s = L.cntS;
  const dw = measure(ctx, '0', { size: s, weight: 800 }) * 1.04;
  const mw = measure(ctx, 'MIN', { size: L.cntMin, weight: 700, tracking: 0.16 });
  const gapW = 0.3 * s, total = dw * 2 + gapW + mw;
  const x0 = L.cntAlign === 'right' ? L.cntX - total : L.cntX - total / 2;
  const y = L.cntY - (1 - inn) * s * 0.35 - out * s * 0.3;
  const pop = t >= LAND[3] ? 1 + 0.13 * (1 - spring(t - LAND[3], 2.6, 6.5)) : 1;
  const hot = t >= LAND[3] ? Math.exp(-(t - LAND[3]) * 3.2) : 0;
  ctx.save();
  ctx.globalAlpha = inn * (1 - out);
  // the digits, each rolling in its own window
  ctx.save();
  const px = x0 + dw, py = y - s * 0.36;
  ctx.translate(px, py); ctx.scale(pop, pop); ctx.translate(-px, -py);
  ctx.beginPath(); ctx.rect(x0 - s * 0.2, y - s * 0.8, dw * 2 + s * 0.4, s * 0.86); ctx.clip();
  ctx.font = `800 ${Math.round(s)}px 'Archivo', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = hot > 0.02 ? mix(PAL.ink, PAL.goldHi, hot) : PAL.ink;
  const n = Math.floor(v), roll = smoothstep(0.45, 1, v - n), step = s * 0.84;
  const digit = (col, cur, nxt, r) => {
    const cx = x0 + dw * (col + 0.5);
    if (r > 0 && cur !== nxt) {
      ctx.fillText(String(cur), cx, y - r * step);
      ctx.fillText(String(nxt), cx, y + (1 - r) * step);
    } else ctx.fillText(String(cur), cx, y);
  };
  const ones = n % 10, tens = Math.floor(n / 10) % 10;
  digit(0, tens, (tens + 1) % 10, ones === 9 ? roll : 0);
  digit(1, ones, (ones + 1) % 10, n >= 17 ? 0 : roll);
  ctx.restore();
  text(ctx, S, 'MIN', x0 + dw * 2 + gapW, y, { size: L.cntMin, weight: 700, tracking: 0.16, color: PAL.gold });
  const lx = L.cntAlign === 'right' ? x0 + total : x0 + total / 2;
  text(ctx, S, 'ORIGINAL ANIMATION', lx, y + L.cntLab * 2.2, { size: L.cntLab, weight: 600, tracking: 0.2, color: PAL.dim,
    align: L.cntAlign, reveal: seg(t, 4.3, 5.1), window: 0.5, rise: L.cntLab * 0.8 });
  ctx.restore();
}
function mix(a, b, k) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`;
}

// ── the rail: ruler ticks and pulses along the thread ─────────────────────
function drawTicks(ctx, S, L, t, g, y) {
  const a = seg(t, 3.7, 4.4) * (1 - seg(t, STREAM[0] + 0.2, STREAM[1] - 0.1));
  if (a <= 0) return;
  const u = S.u, step = (L.P ? 3.4 : 2.6) * u;
  const off = posAt(L, stripIdx(t)) + streamAt(S, t);
  const i0 = Math.floor(off / step) - 1, n = Math.ceil(S.W / step) + 3;
  const minor = new Path2D(), major = new Path2D();
  for (let i = i0; i < i0 + n; i++) {
    const x = i * step - off;
    if (x < -step || x > S.W + step) continue;
    if (g.A > 0.5 && Math.abs(x - g.cx) < g.R + 2 * u) continue;
    const big = ((i % 5) + 5) % 5 === 0, hh = big ? 1.5 * u : 0.65 * u;
    const P = big ? major : minor;
    P.moveTo(x, y - hh); P.lineTo(x, y + hh);
  }
  ctx.save();
  ctx.lineWidth = Math.max(1, S.lw * 0.5);
  ctx.strokeStyle = PAL.gold;
  ctx.globalAlpha = a * 0.32; ctx.stroke(minor);
  ctx.globalAlpha = a * 0.6; ctx.stroke(major);
  ctx.restore();
}

/** a bright bead of light running along the line, with a tail */
function pulse(ctx, S, x, y, dir, len, a) {
  if (a <= 0.005) return;
  const gl = glow(), r = 4.5 * S.u;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.strokeStyle = PAL.goldHi;
  for (let i = 0; i < 4; i++) {
    ctx.globalAlpha = a * (0.55 - i * 0.12);
    ctx.lineWidth = S.lw * (1.6 - i * 0.25);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * len * (0.3 + i * 0.25), y); ctx.stroke();
  }
  ctx.globalAlpha = a * 0.9;
  ctx.drawImage(gl, x - r, y - r * 0.55, r * 2, r * 1.1);
  ctx.restore();
}

function drawPulses(ctx, S, L, t, y) {
  const u = S.u, cx = S.W / 2;
  // anticipation: two beads run in from the edges and meet where the arch will lift
  if (t > 0.1 && t < ARCH_UP + 0.35) {
    const p = seg(t, 0.12, ARCH_UP, inQuad);
    const a = smoothstep(0.1, 0.3, t) * (1 - seg(t, ARCH_UP - 0.05, ARCH_UP + 0.3));
    pulse(ctx, S, lerp(-0.02 * S.W, cx, p), y, 1, 14 * u * (0.4 + p), a);
    pulse(ctx, S, lerp(1.02 * S.W, cx, p), y, -1, 14 * u * (0.4 + p), a);
    const fl = Math.max(0, 1 - Math.abs(t - ARCH_UP) / 0.22);
    if (fl > 0) {
      const gl = glow(), r = 14 * u * fl;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fl * 0.8;
      ctx.drawImage(gl, cx - r, y - r * 0.5, r * 2, r); ctx.restore();
    }
  }
  // each landing sends a pulse both ways down the rail
  for (let k = 0; k < 4; k++) {
    const dt = t - LAND[k] + 0.06;
    if (dt < 0 || dt > 0.7) continue;
    const p = posterState(S, L, k, t), q = dt / 0.7;
    const d = p.w / 2 + outCubic(q) * S.W * 0.55, a = (1 - q) * (1 - q) * (k === 3 ? 1 : 0.8);
    pulse(ctx, S, p.x - d, y, -1, 10 * u, a);
    pulse(ctx, S, p.x + d, y, 1, 10 * u, a);
  }
  // the stream-off leaves a wake running left along the line
  if (t > STREAM[0] + 0.1 && t < STREAM[1] + 0.15) {
    const q = seg(t, STREAM[0] + 0.1, STREAM[1] + 0.15);
    pulse(ctx, S, lerp(S.W * 0.62, -0.08 * S.W, inOutQuad(q)), y, -1, 30 * u, Math.sin(Math.PI * q) * 0.85);
  }
}

// ── the eyebrow under the horizon ─────────────────────────────────────────
function drawEyebrow(ctx, S, L, t, g, y) {
  const rv = seg(t, 1.85, 2.85), out = seg(t, 3.55, 4.05);
  if (rv <= 0 || out >= 1) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y + S.lw * 1.6, S.W, S.H); ctx.clip();
  // tracks in from wide, opening out from the centre as the horizon did
  const str = 'THE FLAGSHIP — ORIGINAL SERIES', n = str.length, sz = L.eyeS;
  text(ctx, S, str, g.cx + (g.cx - S.W / 2) * 0.4, y + L.eyeDy, {
    size: sz, weight: 600, tracking: 0.26, align: 'center', color: PAL.goldHi, alpha: 1 - out,
    reveal: rv, window: 0.55, order: 'center', rise: 0, ease: outCubic,
    glyph: (i, p) => ({ dx: (i - (n - 1) / 2) * (1 - p) * (L.P ? 0.4 : 0.8) * sz, alpha: p })
  });
  ctx.restore();
}

// ── the lens, on the hits ─────────────────────────────────────────────────
function lens(S, L, t, y) {
  const fx = S.fx;
  // the arch pops on beat 1
  const k0 = t - ARCH_UP;
  if (k0 > 0 && k0 < 0.4) { fx.ab = 0.25 * Math.exp(-k0 * 12); fx.shake = 0.2 * S.u * Math.exp(-k0 * 14); }
  for (let k = 0; k < 4; k++) {
    const dt = t - LAND[k];
    if (dt < 0 || dt > 0.6) continue;
    const e = Math.exp(-dt * 16), big = k === 3;
    fx.ab = Math.max(fx.ab, (big ? 0.55 : 0.32) * e);
    fx.shake = Math.max(fx.shake, (big ? 0.45 : 0.25) * S.u * e);
    if (big && dt < 0.45) { fx.warp = lerp(0.2, 1, dt / 0.45); fx.warpX = 0.5; fx.warpY = (y - L.ph / 2) / S.H; }
  }
  const s = seg(t, STREAM[0] + 0.2, STREAM[1]);
  if (s > 0 && s < 1) fx.ab = Math.max(fx.ab, 0.28 * Math.sin(Math.PI * s));
}

// ── the chapter ───────────────────────────────────────────────────────────
export default {
  id: 'landofhope',
  title: 'Land of Hope',
  caption: 'The flagship original series: the thread lifts into a gateway over the horizon, the chrome Land of Hope title rises through it, and four episodes ride in along the line — 17 minutes of original animation.',
  assets: [PLATE, ...EPS.map(e => e.img)],
  models: ['landofhope'],
  still: 3.1,
  draw(ctx, S) {
    const t = S.lt;
    const L = lay(S);
    // the renderer is shared, and resizing it stalls a frame: size it for the
    // lockup while the frame is still at rest, where a stall cannot be seen
    if (t < 0.9) S.logo3d('landofhope', { w: L.rw, h: L.rh, yaw: -0.3, pitch: 0.2, fit: 1.2 });
    if (t < 0.1 || t > S.d - 0.1) { rest(ctx, S); return; }
    const y = railY(S, L, t);
    const g = archGeom(S, L, t, y);
    const lk = lockupState(S, L, t, g);

    // behind the line: the world, and every reflection in the lake
    drawWorld(ctx, S, L, g, t);
    drawLockupReflection(ctx, S, L, lk, y);
    drawPosters(ctx, S, L, t, y, 'refl');
    if (t > ARCH_UP && t < STREAM[1]) {
      ctx.save(); ctx.translate(0, y); ctx.fillStyle = grads(ctx, L).fade; ctx.fillRect(0, 0, S.W, L.refl + 1); ctx.restore();
    }

    // the thread: lifted into the arch, or the rail
    if (g.A > 0.5) thread(ctx, S, c => { c.beginPath(); archShape(c, S, g, false); });
    else thread(ctx, S, [[-0.02 * S.W, y], [1.02 * S.W, y]], { sharp: true });
    drawTicks(ctx, S, L, t, g, y);

    drawLockup(ctx, S, L, lk, y);
    drawPosters(ctx, S, L, t, y, 'front');
    drawPulses(ctx, S, L, t, y);

    drawEyebrow(ctx, S, L, t, g, y);
    drawEpType(ctx, S, L, t, y);
    drawCounter(ctx, S, L, t);
    lens(S, L, t, y);
  }
};
