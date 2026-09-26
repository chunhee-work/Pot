/* 2 — Medium · 0:06–0:11 · one phrase, eight beats.

   The answer to chapter 1's "from needle & thread," — "to camera & code."
   The craft changes medium, and so does the thread:

   b0 0.08  the rest line splits into the two rails of a film strip. The
            split opens from the centre out, the strip unfolding from edge-on,
            so for a few frames its perforations are a double row of stitch
            holes along the line — then the strip runs, kicked forward again
            on every beat, the work flashing past in its frames.
   b1 0.625 "to" slams in.
   b2 1.25  "camera" slams in out of focus; the thread leaps off the top rail
            and traces a viewfinder round it, which snaps tight as the word
            racks into focus.
   b3 1.875 a strand drops from the bottom rail and gathers into the caret;
            "&" slams, and "code." is typed on sixteenth triplets,
   b4 2.5   the full stop landing on the bar. 2025 — THE PIVOT rises on the
            film's edge (an eyebrow over the words on a phone). Hold; the
            caret blinks on the beat.
   3.85     the type dives into the strip through the rails, the strip whips,
   b7 4.375 and the rails slam shut into one thread, which twangs itself
            still — pure rest from 4.9. */
import {
  PAL, BEAT, clamp, lerp, seg, TAU, bezier,
  outCubic, inOutCubic, inOutQuad, inQuart, outQuart, outExpo, inBack, outBack,
  cover, rrect, thread, rest, text, layout, measure, label, along, polyLength
} from '../kit.js';

/* the frames on the strip — the work, in the order the pivot happened:
   boards, a turnaround, the series, the films, then the product's screens */
const FRAMES = [
  { src: 'assets/p-storyboard.jpg' },
  { src: 'assets/p-zeyo-turn.jpg', fy: 0.3 },
  { src: 'assets/ep1.jpg', fx: 0.35 },
  { src: 'assets/og10.jpg' },
  { src: 'assets/sket.jpg', fx: 0.3 },
  { src: 'assets/g-home.jpg', fy: 0.06, zoom: 1.7 },
  { src: 'assets/ccats.jpg', fx: 0.3 },
  { src: 'assets/gameui/pack2-f7d2ed7b.webp', fy: 0.5, zoom: 1.35 }
];

// ── the clock ─────────────────────────────────────────────────────────────
const B = k => k * BEAT;
const T0 = 0.08;                        // first motion, after the required rest
const T_TO = B(1), T_CAM = B(2), T_AMP = B(3), T_STOP = B(4), T_CAP = B(4) + 0.06, T_SHUT = B(7);
const OPEN_FRONT = 0.14, OPEN_DUR = 0.3, OPEN_END = T0 + OPEN_FRONT * 1.05 + OPEN_DUR;
const TRACE = [1.27, 1.5], LOCK = [1.5, 1.7];
const DROP = 1.71;                      // the caret's strand leaves the bottom rail
const TYPE_T = i => B(4) - (4 - i) * BEAT / 6;    // c o d e . on sixteenth triplets, the stop on b4
const EXIT = 3.85;                      // the type dives into the strip
const SHUT0 = 4.06;                     // the rails start to close
const T_REST = 4.9;                     // pure rest from here to the cut

const BASE = '#15140f';                 // the film base, a lifted black
const CAPTION = '2025 — THE PIVOT';

// ── small helpers ─────────────────────────────────────────────────────────
const mod = (a, n) => ((a % n) + n) % n;
/** a decaying accent that starts at t0 and is gone after dur */
const hit = (lt, t0, dur, pw = 2) => (lt < t0 || lt > t0 + dur ? 0 : Math.pow(1 - (lt - t0) / dur, pw));
const traceE = bezier(0.5, 0.05, 0.3, 1);
const kickE = bezier(0.28, 0, 0.22, 1);

/** the film's travel, in frames — a kick on the downbeat, a pull on every
   beat after, a slow drift underneath, and a whip into the close */
function filmPos(lt) {
  let p = 1.35 + 0.16 * lt + 4.4 * kickE(seg(lt, T0 + 0.09, 0.95));
  for (let k = 1; k <= 6; k++) p += outQuart(seg(lt, B(k), B(k) + 0.45));
  p += 6 * inQuart(seg(lt, EXIT - 0.05, T_SHUT));
  return p;
}

/** a rail pulled away by a strand at tOn, let go at tOff, ringing out */
function tug(lt, tOn, tOff, amp) {
  if (lt < tOn) return 0;
  if (lt < tOff) return amp * outCubic(seg(lt, tOn, tOn + 0.07));
  const k = lt - tOff;
  return k > 0.8 ? 0 : amp * Math.exp(-8 * k) * Math.cos(TAU * 5 * k);
}
/** a small standing wave along a rail when something lands next to it */
function ring(lt, t0, amp, xn) {
  const k = lt - t0;
  if (k < 0 || k > 0.7) return 0;
  return amp * Math.sin(Math.PI * xn) * Math.sin(TAU * 6.5 * k) * Math.exp(-7 * k);
}

// ── geometry, cached per frame size ────────────────────────────────────────
/** the layout at one type size and strip height */
function build(ctx, S, stacked, size, hh) {
  const { W, H, u } = S;
  const cy = H / 2;
  const Lt = { size, weight: 200 }, Hv = { size, weight: 800 };
  const capH = layout(ctx, 'camera', Hv).ascent;
  const sp = 0.27 * size, lead = capH + 0.5 * size;   // word space, line pitch
  const wTo = measure(ctx, 'to', Lt), wCam = measure(ctx, 'camera', Hv);
  const wAmp = measure(ctx, '&', Lt), wCode = measure(ctx, 'code.', Hv);
  const railT = cy - hh, railB = cy + hh;
  const gap = 0.46 * size;                        // type to rail
  const yA = railT - gap;                         // "camera" baseline
  const yAmp = railB + gap + capH;                // "&" baseline
  let xL, xTo, yTo, xCam, xAmp, xCode, yCode, cap;
  const capSize = (stacked ? 2.9 : 2) * u;
  if (!stacked) {
    // a Z: the first line hangs left above the strip, the answer right below
    // it; "to" stands clear of the viewfinder
    xL = W * 0.12; xTo = xL; yTo = yA; xCam = xL + wTo + 0.5 * size;
    xAmp = W - xL - (wAmp + sp + wCode); xCode = xAmp + wAmp + sp; yCode = yAmp;
    // the dateline, printed along the film's edge: over the top rail at the
    // right, or — if the viewfinder leaves no room there — under the bottom
    // rail at the left
    const wCap = measure(ctx, CAPTION, { size: capSize, weight: 600, tracking: 0.18 });
    const x1 = xCam + wCam + 0.2 * size + 0.17 * size;
    if (W - xL - wCap > x1 + 2 * u) cap = { x: W - xL, y: railT - 2.3 * u, align: 'right', side: 'top' };
    else cap = { x: xL, y: railB + 2.3 * u + capSize * 0.72, align: 'left', side: 'bottom' };
  } else {
    // on the phone the words stack on one left edge, light over heavy either
    // side of the strip: to / camera / — / & / code.
    xL = 9.5 * u; xTo = xL + 0.02 * size; xCam = xL; yTo = yA - lead;
    xAmp = xL + 0.02 * size; xCode = xL; yCode = yAmp + lead;
    cap = { x: xL, y: yTo - capH - 0.62 * size, align: 'left', side: 'top' };
  }
  const padX = 0.2 * size, padY = 0.2 * size;
  const brk = { x0: xCam - padX, x1: xCam + wCam + padX, y0: yA - capH - padY, y1: yA + padY };
  const g = {
    cy, hh, size, Lt, Hv, capH, sp, railT, railB,
    xTo, yTo, wTo, xCam, yA, wCam, xAmp, yAmp, xCode, yCode, wAmp, wCode,
    codeL: layout(ctx, 'code.', Hv), cap, capSize, brk, arm: 0.27 * size,
    inflX: (stacked ? 0.07 : 0.17) * size       // how loose the viewfinder is before it locks
  };
  // does it sit inside the safe area?
  const top = Math.min(brk.y0, yTo - capH, cap.y - capSize), bottom = yCode + 0.02 * size;
  const left = Math.min(brk.x0, xTo), right = Math.max(brk.x1, xCode + wCode + 0.2 * size, stacked ? 0 : cap.x);
  g.fits = top >= 0.08 * H && bottom <= 0.86 * H && left >= 0.05 * W && right <= 0.95 * W;
  return g;
}
let geo = null;
function geometry(ctx, S) {
  const key = S.W + 'x' + S.H;
  if (geo && geo.key === key) return geo;
  // the words stack on a phone-tall frame; anything squarer takes the Z. If a
  // frame is too tight for the type, the type and the strip come down together.
  const stacked = S.H > S.W * 1.3, u = S.u;
  let size = (stacked ? 20 : 17) * u, hh = (stacked ? 19 : 14) * u, g;
  for (let i = 0; i < 14; i++) {
    g = build(ctx, S, stacked, size, hh);
    if (g.fits) break;
    size *= 0.93; hh *= 0.96;
  }
  g.key = key;
  geo = g;
  return geo;
}

// ── the strip, pre-rendered once per size into one long canvas ─────────────
let film = null;
function filmStrip(S, g) {
  let loaded = 0;
  for (const f of FRAMES) if (S.img(f.src)) loaded++;
  const key = `${S.W}x${S.H}:${loaded}`;
  if (film && film.key === key) return film;
  const u = S.u, hh = g.hh, N = FRAMES.length;
  const fh = hh * 1.25, fw = fh * 16 / 9;
  const pitch = Math.round(fw + hh * 0.23);
  const loopW = pitch * N, pad = pitch * 3, margin = Math.ceil(pitch / 2);
  const cw = pad + loopW + S.W + 4, ch = Math.round(hh * 2);
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const c = cv.getContext('2d');
  c.fillStyle = BASE; c.fillRect(0, 0, cw, ch);
  const cy = ch / 2;
  for (let i = -3; i * pitch < cw; i++) {
    const f = FRAMES[mod(i, N)];
    const x = pad + i * pitch + (pitch - fw) / 2, y = cy - fh / 2;
    c.save();
    rrect(c, x, y, fw, fh, 0.6 * u); c.clip();
    c.fillStyle = '#201e19'; c.fillRect(x, y, fw, fh);
    const im = S.img(f.src);
    if (im) cover(c, im, x, y, fw, fh, f);
    // a filmic falloff at each frame's top and bottom
    const gr = c.createLinearGradient(0, y, 0, y + fh);
    gr.addColorStop(0, 'rgba(10,10,9,.42)'); gr.addColorStop(0.16, 'rgba(10,10,9,0)');
    gr.addColorStop(0.84, 'rgba(10,10,9,0)'); gr.addColorStop(1, 'rgba(10,10,9,.42)');
    c.fillStyle = gr; c.fillRect(x, y, fw, fh);
    c.restore();
    c.strokeStyle = 'rgba(245,245,240,.07)'; c.lineWidth = Math.max(1, 0.12 * u);
    rrect(c, x, y, fw, fh, 0.6 * u); c.stroke();
  }
  // perforations: eight to a frame, light through the base
  const hp = pitch / 8, hw = hh * 0.165, hH = hh * 0.108, rowY = hh * 0.815;
  c.fillStyle = 'rgba(236,230,214,.84)';
  for (let k = -4; k * hp < cw; k++) {
    const x = pad + k * hp + (hp - hw) / 2;
    rrect(c, x, cy - rowY - hH / 2, hw, hH, hH * 0.32); c.fill();
    rrect(c, x, cy + rowY - hH / 2, hw, hH, hH * 0.32); c.fill();
  }
  film = { key, cv, pitch, loopW, pad, margin, ch };
  return film;
}

// ── the rails ─────────────────────────────────────────────────────────────
/** how far open the strip is (1 = full height) at x during the opening */
function openAt(S, lt, x) {
  const d = Math.abs(x - S.W / 2) / (S.W / 2);
  const t = (lt - T0 - d * OPEN_FRONT) / OPEN_DUR;
  return t <= 0 ? 0 : t >= 1 ? 1 : outBack(t, 1.5);
}
/** how far open, once the opening is done: an inhale as the type dives in,
   then the slam shut */
function openUniform(lt) {
  const inhale = 0.07 * Math.sin(Math.PI * seg(lt, EXIT, SHUT0 + 0.06));
  return (1 + inhale) * (1 - inQuart(seg(lt, SHUT0, T_SHUT)));
}

const NR = 48;
function railPoints(S, g, lt) {
  const W = S.W, cy = g.cy, hh = g.hh, u = S.u;
  const opening = lt < OPEN_END, ou = openUniform(lt);
  const sig = 7 * u;
  // the strand that draws the viewfinder pulls the top rail up; the caret's
  // strand pulls the bottom rail down
  const tx = g.brk.x0 - g.inflX, bx = g.xAmp - 0.07 * g.size;
  const tA = tug(lt, TRACE[0] - 0.01, LOCK[0] + 0.03, 1.9 * u);
  const bA = tug(lt, DROP, T_AMP - 0.02, 1.9 * u);
  const top = [], bot = [];
  for (let i = 0; i <= NR; i++) {
    const x = -0.02 * W + (i / NR) * 1.04 * W, xn = clamp(x / W);
    const o = opening ? openAt(S, lt, x) : ou;
    let yt = cy - hh * o, yb = cy + hh * o;
    if (tA) yt -= tA * Math.exp(-(((x - tx) / sig) ** 2));
    if (bA) yb += bA * Math.exp(-(((x - bx) / sig) ** 2));
    yt -= ring(lt, T_TO, 0.5 * u, xn) + ring(lt, T_CAM, 0.8 * u, xn);
    yb += ring(lt, T_AMP, 0.6 * u, xn);
    top.push([x, yt]); bot.push([x, yb]);
  }
  return { top, bot, opening, ou };
}

// ── the strip's content ───────────────────────────────────────────────────
/* two scratch canvases, rewritten in full every frame they are used (the
   first copy drawn into each is opaque), so nothing carries between frames */
const scratch = [null, null];
function buffer(i, w, h) {
  let b = scratch[i];
  if (!b || b.width !== w || b.height !== h) {
    b = document.createElement('canvas'); b.width = w; b.height = h;
    scratch[i] = b;
  }
  return b;
}
/** the strip's window at film position P, smeared over `blur` px of travel.
   Two passes: a comb of n1 copies, then n2 copies of the comb spread across
   one tooth — n1·n2 samples for n1 + n2 draws, so the smear reads smooth. */
function smeared(S, st, P, blur) {
  const W = S.W, ch = st.ch, u = S.u;
  const sx = st.pad + mod(P * st.pitch, st.loopW);
  if (blur < 0.5 * u) return { cv: st.cv, x: sx };
  const n1 = clamp(Math.ceil(blur / (2.2 * u)), 2, 8), sp = blur / n1;
  const n2 = clamp(Math.ceil(sp / (0.3 * u)), 1, 8);
  const M = st.margin;
  const A = buffer(0, W + M, ch), a = A.getContext('2d');
  a.globalCompositeOperation = 'source-over';
  for (let j = 0; j < n1; j++) {
    a.globalAlpha = 1 / (j + 1);
    a.drawImage(st.cv, sx - M - j * sp, 0, W + M, ch, 0, 0, W + M, ch);
  }
  if (n2 === 1) return { cv: A, x: M };
  const B = buffer(1, W, ch), b = B.getContext('2d');
  for (let k = 0; k < n2; k++) {
    b.globalAlpha = 1 / (k + 1);
    b.drawImage(A, M - (sp * k) / n2, 0, W, ch, 0, 0, W, ch);
  }
  return { cv: B, x: 0 };
}

function drawStrip(ctx, S, g, lt, R) {
  const st = filmStrip(S, g);
  const W = S.W, cy = g.cy, hh = g.hh, ch = st.ch;
  // clip to the space between the rails
  ctx.save();
  ctx.beginPath();
  R.top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  for (let i = R.bot.length - 1; i >= 0; i--) ctx.lineTo(R.bot[i][0], R.bot[i][1]);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = BASE;
  ctx.fillRect(0, cy - hh * 1.3, W, hh * 2.6);
  // motion blur: the film's travel over the last 1/60 s
  const P = filmPos(lt), blur = Math.min(st.pitch * 2, (P - filmPos(lt - 1 / 60)) * st.pitch);
  const win = smeared(S, st, P, blur);
  ctx.globalAlpha = 1;
  if (R.opening) {
    // the strip unfolds from edge-on, a column at a time from the centre out
    const nS = 72, sw = W / nS;
    for (let s = 0; s < nS; s++) {
      const x0 = s * sw, o = openAt(S, lt, x0 + sw / 2);
      if (o < 0.004) continue;
      const dh = ch * o;
      ctx.drawImage(win.cv, win.x + x0, 0, sw, ch, x0, cy - dh / 2, sw + 1, dh);
    }
  } else {
    const dh = ch * R.ou;
    ctx.drawImage(win.cv, win.x, 0, W, ch, 0, cy - dh / 2, W, dh);
  }
  ctx.restore();
}

// ── type ──────────────────────────────────────────────────────────────────
/** a slam: the word falls in from big, accelerating, and lands on t0 */
const PICK = 0.12;
function slam(lt, t0, amp = 1.2) {
  if (lt < t0 - PICK) return null;
  if (lt < t0) {
    const q = (lt - (t0 - PICK)) / PICK;
    return { s: 1 + amp * (1 - q * q), v: 2 * amp * q, a: Math.min(1, q * 2.5), pre: true };
  }
  const k = lt - t0;
  return { s: 1 - 0.05 * Math.exp(-13 * k) * Math.cos(TAU * 5 * k), a: 1, pre: false };
}
function scaled(ctx, cx, cy, s, fn) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); fn(); ctx.restore();
}
/** draw a slammed word: a zoom smear of where it was a moment ago */
function slammed(ctx, sl, cx, cy, draw) {
  if (!sl) return;
  if (sl.pre) {
    // ghosts at the scales it has just fallen through: a short streak toward the lens
    const back = 0.012 * sl.v * 1.2;
    for (let j = 3; j >= 1; j--) scaled(ctx, cx, cy, sl.s + back * j, () => draw(sl.a * 0.16));
  }
  scaled(ctx, cx, cy, sl.s, () => draw(sl.a));
}

/** the dive into the strip at the end: glyph i of a group falls `dist` */
function dive(lt, i, dist, delay = 0) {
  const t0 = EXIT + delay + i * 0.018;
  const q = seg(lt, t0, t0 + 0.24);
  // once through, it stays through (the rails close after it)
  return q <= 0 ? 0 : q >= 1 ? dist * 40 : dist * inBack(q, 1.4);
}

/** "camera", out of focus until the viewfinder locks */
function focusBlur(lt, u) {
  if (lt >= LOCK[1]) return 0;
  const r = lerp(1.5, 0.75, outCubic(seg(lt, T_CAM, LOCK[0])));
  return u * r * (1 - inOutCubic(seg(lt, LOCK[0], LOCK[1] - 0.02)));
}

function drawTop(ctx, S, g, lt) {
  const u = S.u;
  const distCam = g.railT - (g.yA - g.capH) + 0.15 * g.size;
  const distTo = g.railT - (g.yTo - g.capH) + 0.15 * g.size;
  // "to"
  const s1 = slam(lt, T_TO);
  slammed(ctx, s1, g.xTo + g.wTo / 2, g.yTo - g.capH / 2, a =>
    text(ctx, S, 'to', g.xTo, g.yTo, { ...g.Lt, color: PAL.ink, alpha: a, glyph: i => ({ dy: dive(lt, i, distTo) }) }));
  // "camera"
  const s2 = slam(lt, T_CAM, 0.7);
  const r = focusBlur(lt, u);
  const drawCam = a => {
    const o = { ...g.Hv, color: PAL.ink, glyph: i => ({ dy: dive(lt, i + 2, distCam) }) };
    if (r < 0.04 * u) { text(ctx, S, 'camera', g.xCam, g.yA, { ...o, alpha: a }); return; }
    // a soft focus: the word drawn round a small circle of confusion
    text(ctx, S, 'camera', g.xCam, g.yA, { ...o, alpha: a * 0.25 });
    for (let k = 0; k < 8; k++) {
      const an = (k / 8) * TAU + 0.3;
      text(ctx, S, 'camera', g.xCam + Math.cos(an) * r, g.yA + Math.sin(an) * r, { ...o, alpha: a * 0.2 });
    }
  };
  slammed(ctx, s2, g.xCam + g.wCam / 2, g.yA - g.capH / 2, drawCam);
  drawBrackets(ctx, S, g, lt, dive(lt, 4.5, g.railT - g.brk.y0 + 0.1 * g.size));
}

function drawBottom(ctx, S, g, lt) {
  const distAmp = -(g.yAmp - g.railB + 0.15 * g.size), dist = -(g.yCode - g.railB + 0.15 * g.size);
  // "&"
  const s3 = slam(lt, T_AMP);
  slammed(ctx, s3, g.xAmp + g.wAmp / 2, g.yAmp - g.capH / 2, a =>
    text(ctx, S, '&', g.xAmp, g.yAmp, { ...g.Lt, color: PAL.ink, alpha: a, glyph: i => ({ dy: dive(lt, i, distAmp, 0.03) }) }));
  // "code." — typed
  if (lt >= TYPE_T(0)) {
    const L = g.codeL;
    text(ctx, S, 'code.', g.xCode, g.yCode, {
      ...g.Hv, color: PAL.ink,
      glyph: i => {
        const t = TYPE_T(i);
        if (lt < t) return { alpha: 0 };
        // each key lands with a small pop; the full stop lands on the bar with weight
        const big = i === 4 ? 1.1 : 0.22;
        const p = clamp((lt - t) / (i === 4 ? 0.16 : 0.09)), s = 1 + big * (1 - outCubic(p));
        const gw = (L.xs[i + 1] ?? L.width) - L.xs[i];
        return { alpha: clamp((lt - t) / 0.03), sx: s, sy: s, dx: -(s - 1) * gw / 2, dy: dive(lt, i + 1, dist, 0.03) };
      }
    });
  }
  drawCaret(ctx, S, g, lt, dive(lt, 6, dist, 0.03));
}

// ── the viewfinder ────────────────────────────────────────────────────────
function head(ctx, S, x, y) {
  ctx.fillStyle = 'rgba(243,223,168,.2)';
  ctx.beginPath(); ctx.arc(x, y, S.lw * 3.4, 0, TAU); ctx.fill();
  ctx.fillStyle = PAL.goldHi;
  ctx.beginPath(); ctx.arc(x, y, S.lw * 1.15, 0, TAU); ctx.fill();
}
function drawBrackets(ctx, S, g, lt, dy) {
  if (lt < TRACE[0]) return;
  const t = g.brk, sz = g.size;
  const big = { x0: t.x0 - g.inflX, x1: t.x1 + g.inflX, y0: t.y0 - 0.1 * sz, y1: t.y1 + 0.08 * sz };
  if (lt < LOCK[0]) {
    // the thread leaves the rail and runs the frame's perimeter
    const p = traceE(seg(lt, TRACE[0], TRACE[1]));
    const pts = [[big.x0, g.railT], [big.x0, big.y1], [big.x0, big.y0], [big.x1, big.y0], [big.x1, big.y1], [big.x0, big.y1]];
    thread(ctx, S, pts, { sharp: true, progress: p, length: polyLength(pts), glow: 0.9 });
    const h = along(pts, p);
    head(ctx, S, h.x, h.y);
    return;
  }
  // lock: the frame closes on the word and its edges pull back into corners
  const q = seg(lt, LOCK[0], LOCK[1]);
  const kr = outBack(q, 2.2), ka = outExpo(q);
  const r = { x0: lerp(big.x0, t.x0, kr), x1: lerp(big.x1, t.x1, kr), y0: lerp(big.y0, t.y0, kr) + dy, y1: lerp(big.y1, t.y1, kr) + dy };
  const hw = (r.x1 - r.x0) / 2, hh = (r.y1 - r.y0) / 2;
  const aH = lerp(hw, g.arm, ka), aV = lerp(hh, Math.min(g.arm * 0.8, hh), ka);
  const conf = hit(lt, LOCK[1] - 0.05, 0.3, 1.5);     // focus confirmed: a brief flare
  thread(ctx, S, c => {
    c.beginPath();
    c.moveTo(r.x0, r.y0 + aV); c.lineTo(r.x0, r.y0); c.lineTo(r.x0 + aH, r.y0);
    c.moveTo(r.x1 - aH, r.y0); c.lineTo(r.x1, r.y0); c.lineTo(r.x1, r.y0 + aV);
    c.moveTo(r.x1, r.y1 - aV); c.lineTo(r.x1, r.y1); c.lineTo(r.x1 - aH, r.y1);
    c.moveTo(r.x0 + aH, r.y1); c.lineTo(r.x0, r.y1); c.lineTo(r.x0, r.y1 - aV);
  }, { glow: 0.9 + 1.6 * conf, width: S.lw * (1 + 0.5 * conf), color: conf > 0.02 ? mixGold(conf) : PAL.gold });
  // the strand back to the rail lets go and snaps up into the corner
  const f = outCubic(seg(lt, LOCK[0], LOCK[0] + 0.12));
  if (f < 1) {
    const pts = [[big.x0, g.railT], [r.x0, r.y1]];
    thread(ctx, S, pts, { sharp: true, from: f, progress: 1, length: polyLength(pts), glow: 0.9 });
  }
}
function mixGold(k) {
  const a = [0xd8, 0xb2, 0x6a], b = [0xf3, 0xdf, 0xa8];
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], clamp(k)))).join(',')})`;
}

// ── the caret ─────────────────────────────────────────────────────────────
/** where the caret stands (x, baseline): before "&", after it, (on the phone
   a new line,) then after each typed key */
function caretAt(g, lt) {
  const L = g.codeL, s = g.size, two = g.yCode !== g.yAmp;
  const st = [[DROP, g.xAmp - 0.07 * s, g.yAmp]];
  if (two) {
    st.push([T_AMP, g.xAmp + g.wAmp + 0.07 * s, g.yAmp]);
    st.push([T_AMP + BEAT / 6, g.xCode - 0.06 * s, g.yCode]);
  } else st.push([T_AMP, g.xCode - 0.06 * s, g.yCode]);
  for (let i = 0; i < 5; i++) st.push([TYPE_T(i), g.xCode + (i < 4 ? L.xs[i + 1] : L.width) + 0.05 * s, g.yCode]);
  let x = st[0][1], y = st[0][2];
  for (let i = 1; i < st.length; i++) {
    const e = outExpo(seg(lt, st[i][0], st[i][0] + 0.07));
    x += (st[i][1] - st[i - 1][1]) * e; y += (st[i][2] - st[i - 1][2]) * e;
  }
  return { x, y };
}
function drawCaret(ctx, S, g, lt, dy) {
  if (lt < DROP) return;
  const s = g.size, c = caretAt(g, lt), x = c.x;
  const top = c.y - g.capH - 0.09 * s, bot = c.y + 0.11 * s, cw = 0.085 * s;
  let y0, y1, w, a = 1;
  if (lt < T_AMP + 0.04) {
    // a strand drops from the rail and gathers itself into the bar
    y1 = lerp(g.railB, bot, outExpo(seg(lt, DROP, DROP + 0.1)));
    y0 = lerp(g.railB, top, outCubic(seg(lt, DROP + 0.07, T_AMP)));
    w = lerp(S.lw, cw, inOutCubic(seg(lt, T_AMP - 0.06, T_AMP + 0.04)));
  } else {
    y0 = top; y1 = bot; w = cw;
    // it blinks on the beat once the typing is done
    if (lt > TYPE_T(4) + 0.2) {
      const ph = mod(lt - T_STOP, BEAT) / BEAT;
      a = ph < 0.58 ? clamp(ph / 0.05) : 1 - clamp((ph - 0.58) / 0.05);
      a = Math.max(a, 0);
    }
  }
  if (a <= 0 || y1 - y0 < 0.5) return;
  y0 += dy; y1 += dy;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1);
  // a soft halo, built up in rounded layers so it has no hard edge
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(216,178,106,.05)'; ctx.lineWidth = w + S.lw * 6; ctx.stroke();
  ctx.strokeStyle = 'rgba(216,178,106,.07)'; ctx.lineWidth = w + S.lw * 3.6; ctx.stroke();
  ctx.strokeStyle = 'rgba(243,223,168,.1)'; ctx.lineWidth = w + S.lw * 1.6; ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = PAL.gold; ctx.lineWidth = w; ctx.stroke();
  ctx.strokeStyle = PAL.goldHi; ctx.globalAlpha *= 0.8; ctx.lineWidth = w * 0.38; ctx.stroke();
  ctx.restore();
}

// ── the caption ───────────────────────────────────────────────────────────
function drawCaption(ctx, S, g, lt) {
  if (lt < T_CAP) return;
  const c = g.cap;
  // it leaves through the rail it sits by (its mask keeps the fall short)
  const dist = c.side === 'top' ? g.railT - c.y + g.capSize * 1.2 : g.railB - c.y - g.capSize * 1.2;
  label(ctx, S, CAPTION, c.x, c.y, {
    size: g.capSize, align: c.align, color: PAL.dim, mask: true,
    reveal: seg(lt, T_CAP, T_CAP + 0.5), window: 0.45,
    glyph: i => ({ dy: dive(lt, i * 0.35, dist, -0.04) })
  });
}

// ── the close: the rails meet and the thread rings out ────────────────────
function twang(ctx, S, lt) {
  const k = lt - T_SHUT, u = S.u, W = S.W, H = S.H;
  const a1 = 2 * u * Math.exp(-7.5 * k) * Math.sin(TAU * 5.5 * k);
  const a3 = 0.5 * u * Math.exp(-11 * k) * Math.sin(TAU * 14 * k);
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const x = -0.02 * W + (i / 40) * 1.04 * W, xn = (i / 40);
    pts.push([x, H / 2 + a1 * Math.sin(Math.PI * xn) + a3 * Math.sin(3 * Math.PI * xn)]);
  }
  thread(ctx, S, pts, { glow: 1 + 0.8 * hit(lt, T_SHUT, 0.25) });
}

// ── the lens ──────────────────────────────────────────────────────────────
function lens(S, lt) {
  const fx = S.fx, u = S.u;
  fx.ab = Math.max(0.55 * hit(lt, T0, 0.34), 0.22 * hit(lt, T_TO, 0.16), 0.36 * hit(lt, T_CAM, 0.2),
    0.14 * hit(lt, LOCK[1] - 0.04, 0.12), 0.24 * hit(lt, T_AMP, 0.16), 0.18 * hit(lt, T_STOP, 0.14),
    0.5 * hit(lt, T_SHUT, 0.26));
  fx.shake = u * Math.max(0.9 * hit(lt, T0, 0.26), 0.3 * hit(lt, T_TO, 0.14), 0.5 * hit(lt, T_CAM, 0.16),
    0.3 * hit(lt, T_AMP, 0.14), 0.2 * hit(lt, T_STOP, 0.1), 0.7 * hit(lt, T_SHUT, 0.22));
  // one shock ring, on the song's first downbeat, riding out with the split
  if (lt > T0 && lt < T0 + 0.6) { fx.warp = seg(lt, T0, T0 + 0.6); fx.warpX = 0.5; fx.warpY = 0.5; }
  fx.exposure = 1 + 0.1 * hit(lt, T0, 0.16) + 0.07 * hit(lt, T_SHUT, 0.14);
}

export default {
  id: 'medium',
  title: 'Medium',
  caption: 'The thread splits into a running film strip and becomes a viewfinder and a caret: to camera & code.',
  assets: FRAMES.map(f => f.src),
  models: [],
  still: 3.45,
  draw(ctx, S) {
    const lt = S.lt;
    if (lt < T0 || lt >= T_REST) { rest(ctx, S); return; }
    lens(S, lt);
    if (lt >= T_SHUT) { twang(ctx, S, lt); return; }
    const g = geometry(ctx, S);
    const W = S.W, H = S.H;
    // a slow push in across the phrase
    const k = 1 + 0.03 * inOutQuad(seg(lt, T0, T_SHUT));
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
    const R = railPoints(S, g, lt);
    drawStrip(ctx, S, g, lt, R);
    if (lt > T_TO - PICK) {
      const ou = R.ou;
      const rt = g.cy - g.hh * ou, rb = g.cy + g.hh * ou;
      // the type lives outside the strip; at the end it dives through the rails
      ctx.save();
      ctx.beginPath(); ctx.rect(-W, -H, 3 * W, H + rt); ctx.clip();
      drawTop(ctx, S, g, lt);
      if (g.cap.side === 'top') drawCaption(ctx, S, g, lt);
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.rect(-W, rb, 3 * W, 2 * H); ctx.clip();
      drawBottom(ctx, S, g, lt);
      if (g.cap.side === 'bottom') drawCaption(ctx, S, g, lt);
      ctx.restore();
    }
    thread(ctx, S, R.top, { glow: 0.8 });
    thread(ctx, S, R.bot, { glow: 0.8 });
    ctx.restore();
  }
};
