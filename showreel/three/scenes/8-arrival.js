/* 8 — Arrival. The edit's warp has already dropped the ship at the film
   itself; this chapter opens calm, on the thread at rest, and the thread
   bends into the horizon of Aurea. The chrome LAND OF HOPE lockup rises over
   it like a sunrise, and the four episodes flash past, one to a beat. Then
   the cockpit closes back into the nav pill it opened from in chapter 1 —
   the sign-off sits around it — and the pill opens out into the straight
   thread: the seam, and the loop point back into the launch.

   Local clock (s), 96 bpm, beats at k × 0.625:
     0.00  seam (chapter 7 owns the warp and its collapse: no burst here)
     0.08  the thread bends into the planet's limb as the ship glides in and
           brakes; Aurea fills in beneath it
     0.38  the lockup rises from behind the horizon into a gold sunrise
     0.98  '4 EPISODES · 17 MIN …' types on under it (whole 1.48–1.60)
     1.58  the lockup docks to the top, and steps back (dims) for the cards
     1.875 · 2.50 · 3.125 · 3.75   one episode card per beat, out of the sun;
           each title is whole ≥ 0.42 s, the last ~0.7 s before the close
     4.62  the instruments go dark (the view's type fades before it recedes) and
           the cockpit glass closes — the viewport's rounded window narrows, then
           shuts top to bottom (chapter 1's opening, reversed) and lands as
           the nav pill on the downbeat, 5.00
     5.00  the sign-off: CHUN HEE, the role, the address (all legible 5.44–7.00)
     7.00  it is drawn back into the pill, which opens out into the thread
     7.42  seam

   Type meant to be read (THE FILM, the film line, the episode labels, titles
   and runtimes, the HUD labels, the nav links, the role and the address)
   never falls under 10 CSS px: readPx() from kit3. */
import { clamp, lerp, seg, TAU, rrect, text, layout, cover, outExpo, outCubic, inQuad, inCubic, inOutQuad, inOutCubic, bezier, whip } from '../../kit.js';
import { camera, list } from '../../space.js';
import { seam, space, wire, metal, navLinks, NAV, numeral, mono, stamp, readPx, UI, MONO } from '../kit3.js';
import { BEAT } from '../palette.js';

const AUREA = 'assets/process/img-86e21caec4.webp';
const PL = { cx: 708, r: 278, y: 128 };               // the planet in that plate, source px (y: the row laid at the apex)
const EPS = [
  { img: 'assets/ep1.jpg', ep: 'EP 01 · PILOT', title: 'The World & the Relic', rt: '2:31' },
  { img: 'assets/ep2.jpg', ep: 'EP 02', title: 'The Corruption Spreads', rt: '2:33' },
  { img: 'assets/ep3.jpg', ep: 'EP 03', title: 'The Squad & the Fall', rt: '3:41' },
  { img: 'assets/ep4.jpg', ep: 'EP 04', title: 'Hope, Restored', rt: '3:52' }
];
const LINE = '4 EPISODES · 17 MIN OF ORIGINAL ANIMATION';
const NAME = ['CHUN', 'HEE'];
const ROLE = 'AI-Native Web3 Marketer & Content Creator — Kuala Lumpur';
const MAIL = 'chunhee437@gmail.com';
const HOT = NAV.indexOf('Process');

// ── the clock ─────────────────────────────────────────────────────────────
const IN = 0.08, END = 7.42;                  // seam until IN, and again from END
const BEND = [IN, 0.95];                      // straight out of the resting thread
const RISE = [0.38, 1.78];
const TYPE = [0.98, 1.48];
const DOCK = [1.58, 1.96];
const CARD = [0, 1, 2, 3].map(k => 3 * BEAT + k * BEAT);   // beats 3–6: the last title holds into the close
const DIM = [1.8, 2.22];                      // the docked lockup steps back for the cards
const CLOSE = [4.62, 5.0];
const SIGN = 5.0;
const OUT = [7.0, 7.42];

// the lockup is rendered at one fixed size and scaled on draw. The render
// keeps room around it for the widest pose it reaches (yaw −0.32 on the rise,
// plus the turn of the wrist at the dock): FIT is the camera's margin, and
// the drawn rect is grown by GROW so the lockup itself keeps the size the
// layout gives it (w × h below is the lockup's box, FIT0 = 1.06 of it)
const FIT0 = 1.06, FIT = 1.3, GROW = FIT / FIT0;
const LOGO = { w: 1376, h: 430 };                        // 1120 × 350 at FIT0, grown by GROW
const LOGO_AR = LOGO.w / LOGO.h;
const logoAt = (S, yaw, pitch, exposure) => S.logo3d('landofhope', { w: LOGO.w, h: LOGO.h, yaw, pitch, fit: FIT, exposure });
const rise = bezier(0.3, 0, 0.15, 1);
const glide = bezier(0.42, 0, 0.22, 1);                  // off the rest frame: a soft start, a long brake

// ── layout (by frame size) ────────────────────────────────────────────────
let LAY = null;
function lay(ctx, S) {
  const { W, H, u } = S, key = W + 'x' + H + '@' + S.dpr;       // (type floors depend on dpr)
  if (LAY && LAY.key === key) return LAY;
  const L = { key };
  const wide = W / H >= 1.2;
  L.wide = wide;
  // the HUD row (clock, place): its baseline sits inside the text-safe band
  L.hudM = (wide ? 3.2 : 3.6) * u; L.hudFs = readPx(S, wide ? 1.2 : 1.7);
  L.hudY = Math.max(L.hudM + 1.2 * u + L.hudFs, 0.08 * H + 0.9 * L.hudFs);
  L.hudX = Math.max(L.hudM + 1.2 * u, 0.055 * W);
  if (wide) {
    L.R = 0.8 * W; L.apex = 0.71 * H;
    L.heroW = Math.min(0.56 * W, 1.02 * H); L.heroY = 0.435 * H;
    L.dockW = 0.2 * W; L.dockY = 0.14 * H;
    L.cardW = Math.min(0.38 * W, 0.62 * H); L.cardX = 0.4 * W; L.cardY = 0.47 * H;
    L.vp = [0.5, 0.66];
    L.mono = readPx(S, 1.45); L.cap = readPx(S, 3.1, 12); L.micro = readPx(S, 1.2);
  } else {
    L.R = 1.3 * W; L.apex = 0.68 * H;
    L.heroW = Math.min(0.86 * W, 0.64 * H); L.heroY = 0.5 * H;     // (room for the yawed rise inside the frame)
    L.dockW = Math.min(0.46 * W, 0.36 * H); L.dockY = 0.12 * H;
    L.cardW = Math.min(0.86 * W, 0.52 * H); L.cardX = 0.5 * W; L.cardY = 0.4 * H;
    L.vp = [0.5, 0.64];
    L.mono = readPx(S, 2.1); L.cap = readPx(S, 4.3, 12); L.micro = readPx(S, 1.75);
  }
  L.heroH = L.heroW / LOGO_AR; L.dockH = L.dockW / LOGO_AR;   // the lockup's own box (drawn GROW× larger)
  // docked, the lockup shares the top with the HUD row: where the clock and the
  // place label leave too little room beside it (a phone), it sits under them
  ctx.save(); ctx.font = `500 ${Math.round(L.hudFs)}px ${MONO}`;
  const hudW = Math.max(ctx.measureText('AUREA · ARRIVAL').width, ctx.measureText('T+00:00.00').width);
  ctx.restore();
  if (L.dockW / 2 + 1.5 * u > W / 2 - L.hudX - hudW) L.dockY = Math.max(L.dockY, L.hudY + 1.4 * u + L.dockH / 2);
  // the film line, docked with it: still ≥ 10 px
  L.monoDock = Math.max(L.mono * (wide ? 0.82 : 0.86), readPx(S, 0));
  L.cardH = L.cardW * 9 / 16;
  if (!wide) {
    // the caption under the card: its label clears the card at its fullest push (×1.06)
    const off = 0.53 * L.cardH + 2.2 * u + 1.25 * L.cap + 0.75 * L.micro;
    // and its tick row stays clear of the sun on the horizon (768×1024)
    const ticks = L.cardY + off + 1.5 * L.cap, room = L.apex - 5 * u;
    if (ticks > room) L.cardY -= Math.min(ticks - room, 0.04 * H);
    L.capY = L.cardY + off;
  }
  L.texS = L.R / PL.r;
  // the nav pill: chapter 1's pill exactly (this close is its opening, reversed) —
  // the site's nav at the reel's scale; on an upright frame the pill runs at
  // 0.92 W and its strip is scrolled, as the site's phone nav is, to bring
  // Process toward the centre (as far as it can scroll)
  const tall = H > W;
  const size = readPx(S, tall ? 2.75 : 2.05);
  const widths = NAV.map(s => layout(ctx, s, { size, weight: 600, tracking: 0.02 }).width);
  const gap = size * 1.9;
  const strip = widths.reduce((a, b) => a + b, 0) + gap * (NAV.length - 1);
  const rel = []; let lx = -strip / 2;
  widths.forEach(w => { rel.push(lx + w / 2); lx += w + gap; });
  const pad = size * 1.6, natural = strip + 2 * pad, maxW = W * (tall ? 0.92 : 0.86);
  L.tall = tall; L.link = size; L.widths = widths; L.rel = rel;
  L.scroll = natural > maxW;
  L.pw = Math.min(natural, maxW); L.ph = size * 4.8; L.rim = Math.max(2, 0.42 * u);
  L.strip0 = L.scroll ? -L.pw / 2 + pad + strip / 2 : 0;       // About at the left end
  L.stripEnd = L.scroll ? L.pw / 2 - pad - strip / 2 : 0;      // Contact at the right end
  L.shift = L.scroll ? Math.max(-rel[HOT], L.stripEnd) : 0;
  // the cockpit window it closes from: chapter 1's viewport corner, just outside the frame
  L.r0 = (tall ? 3.2 : 2.6) * u;
  // sign-off
  L.name = wide ? 7.6 * u : Math.min(10.5 * u, 0.13 * W);
  L.role = readPx(S, wide ? 1.75 : 2.45);
  L.mail = readPx(S, wide ? 1.6 : 2.3);
  LAY = L;
  return L;
}

// ── helpers ───────────────────────────────────────────────────────────────
const bump = (t, a, k) => (t < a ? 0 : Math.exp(-(t - a) * k));

/** the horizon: a circle's top arc, bent out of the straight thread by k */
function horizon(S, L, t) {
  const k = inOutCubic(seg(t, BEND[0], BEND[1]));
  const curv = k / L.R;                                        // 1/radius; 0 is the straight thread
  const apex = lerp(S.H / 2, L.apex, k);
  const n = 48, pts = [];
  for (let i = 0; i <= n; i++) {
    const x = lerp(-0.02 * S.W, 1.02 * S.W, i / n), dx = x - S.W / 2;
    // y of a circle of curvature `curv` whose top is at apex (exact at the ends of k)
    const y = curv > 1e-7 ? apex + (1 / curv - Math.sqrt(Math.max(0, 1 / (curv * curv) - dx * dx))) : apex;
    pts.push([x, y]);
  }
  return { k, apex, pts };
}
function curvePath(c, pts) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); }

// ── the view through the cockpit (everything before the close) ─────────────
function zoomAt(t) {
  // no burst: chapter 7's warp has already collapsed onto the seam. The ship
  // glides in off the resting frame and brakes over the world, then drifts;
  // a push on every episode beat (no streaks: the warp is chapter 7's)
  let zoom = 1 + 0.3 * glide(seg(t, IN, 1.9)) + 0.04 * seg(t, 1.9, 2.8);
  for (let k = 0; k < 4; k++) {
    const b = CARD[k];
    zoom += 0.075 * outExpo(seg(t, b - 0.05, b + 0.4));
  }
  return zoom;
}

function drawSunrise(ctx, S, L, g, t) {
  const s = seg(t, 0.3, 1.6) * g.k;
  if (s <= 0) return;
  const { W } = S, cx = W / 2, y = g.apex;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // a wide gold bloom behind the lockup, squashed to the horizon
  ctx.translate(cx, y); ctx.scale(1, 0.55);
  const r = (L.wide ? 0.62 : 0.95) * W;
  const bl = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  bl.addColorStop(0, `rgba(216,178,106,${0.34 * s})`);
  bl.addColorStop(0.35, `rgba(216,178,106,${0.12 * s})`);
  bl.addColorStop(1, 'rgba(216,178,106,0)');
  ctx.fillStyle = bl; ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
}

function drawGlint(ctx, S, L, g, t) {
  const s = seg(t, 0.38, 1.3) * g.k;
  if (s <= 0) return;
  const { W, u } = S, cx = W / 2, y = g.apex;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // the anamorphic streak along the limb
  const sw = (L.wide ? 0.46 : 0.7) * W * (0.6 + 0.4 * s), sh = 0.22 * u;
  const st = ctx.createLinearGradient(cx - sw, 0, cx + sw, 0);
  st.addColorStop(0, 'rgba(255,217,174,0)'); st.addColorStop(0.5, `rgba(255,236,205,${0.75 * s})`); st.addColorStop(1, 'rgba(255,217,174,0)');
  ctx.fillStyle = st; ctx.fillRect(cx - sw, y - sh, 2 * sw, 2 * sh);
  // the sun's core, just cresting
  const cr = 4.5 * u;
  const co = ctx.createRadialGradient(cx, y, 0, cx, y, cr);
  co.addColorStop(0, `rgba(255,248,232,${0.95 * s})`); co.addColorStop(0.25, `rgba(255,217,174,${0.45 * s})`); co.addColorStop(1, 'rgba(216,178,106,0)');
  ctx.fillStyle = co; ctx.fillRect(cx - cr, y - cr, 2 * cr, 2 * cr);
  ctx.restore();
}

/* The planet's surface, graded once per frame size: the Aurea plate cropped
   and scaled to the horizon, with the night side already falling away. Drawn
   each frame 1:1 (sliding a little as the world turns), so the big upscale and
   the first upload of the picture happen in prepare(), not on a frame. */
let BAND = null;
const DRIFT = 4;                                        // source px per second the world turns
function band(S, L) {
  const key = S.W + 'x' + S.H + '@' + S.dpr;            // as lay()'s: L's geometry is what it is drawn from
  if (BAND && BAND.key === key) return BAND;
  const img = S.img(AUREA);
  if (!img || !img.width) return null;
  const { W, H } = S, s = L.texS, pad = Math.ceil(DRIFT * 7.6 * s) + 2;
  const bw = W + pad, bh = Math.ceil(H / 2 + 4);
  const cv = document.createElement('canvas'); cv.width = bw; cv.height = bh;
  const x = cv.getContext('2d');
  x.fillStyle = UI.space; x.fillRect(0, 0, bw, bh);
  // band pixel (bx, by) shows source (PL.cx + (bx - pad - W/2)/s, PL.y + by/s)
  const dx = pad + W / 2 - PL.cx * s, dy = -PL.y * s;
  const sx0 = clamp(-dx / s, 0, img.width), sx1 = clamp((bw - dx) / s, 0, img.width);
  const sy0 = clamp(-dy / s, 0, img.height), sy1 = clamp((bh - dy) / s, 0, img.height);
  x.imageSmoothingQuality = 'high';
  if (sx1 > sx0 && sy1 > sy0) x.drawImage(img, sx0, sy0, sx1 - sx0, sy1 - sy0, dx + sx0 * s, dy + sy0 * s, (sx1 - sx0) * s, (sy1 - sy0) * s);
  // the night side: the surface falls away into the dark below the limb
  const sh = x.createLinearGradient(0, 0, 0, (H - L.apex) * 1.1);
  sh.addColorStop(0, 'rgba(5,6,10,0.05)'); sh.addColorStop(0.3, 'rgba(5,6,10,0.45)'); sh.addColorStop(1, 'rgba(5,6,10,0.92)');
  x.fillStyle = sh; x.fillRect(0, 0, bw, bh);
  BAND = { key, cv, pad, s };
  return BAND;
}

function drawPlanet(ctx, S, L, g, t) {
  const a = seg(t, 0.2, 1.05) * g.k;
  const { W, H, u } = S;
  const ga = ctx.globalAlpha;                            // (relative: the closing glass fades this view)
  ctx.save();
  curvePath(ctx, g.pts); ctx.lineTo(1.02 * W, H + 10); ctx.lineTo(-0.02 * W, H + 10); ctx.closePath();
  // the night disc hides the stars as the world bends up out of the thread
  ctx.globalAlpha = ga * seg(g.k, 0, 0.3);
  ctx.fillStyle = UI.space; ctx.fill();
  ctx.globalAlpha = ga;
  ctx.clip();
  const B = a > 0 ? band(S, L) : null;
  if (B) {
    ctx.globalAlpha = ga * a;
    ctx.drawImage(B.cv, DRIFT * t * B.s - B.pad, g.apex - 1);
    ctx.globalAlpha = ga;
  }
  // on an upright frame the world runs off the bottom edge: below its lit crown
  // the night side dissolves into space before it reaches the frame's edge, so
  // the bottom rows are the seam's space again
  if (!L.wide) {
    const y0 = L.apex + 0.26 * (H - L.apex), f = ctx.createLinearGradient(0, y0, 0, H);
    f.addColorStop(0, 'rgba(5,6,10,0)'); f.addColorStop(0.35, 'rgba(5,6,10,.36)'); f.addColorStop(0.62, 'rgba(5,6,10,.74)');
    f.addColorStop(0.84, 'rgba(5,6,10,.95)'); f.addColorStop(1, UI.space);
    ctx.fillStyle = f; ctx.fillRect(-0.02 * W, y0, 1.04 * W, H - y0 + 12);
  }
  // and the sunrise catches the crown of the world
  const sun = seg(t, 0.38, 1.6) * g.k;
  if (sun > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(W / 2, g.apex); ctx.scale(1, 0.42);
    const r = (L.wide ? 0.34 : 0.6) * W;
    const wl = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    wl.addColorStop(0, `rgba(216,178,106,${0.22 * sun})`); wl.addColorStop(1, 'rgba(216,178,106,0)');
    ctx.fillStyle = wl; ctx.fillRect(-r, -r, 2 * r, 2 * r);
  }
  ctx.restore();
  // the atmosphere: a cold haze hugging the limb, soft on both sides of it
  if (a > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    curvePath(ctx, g.pts);
    for (const [wk, ak] of [[9, 0.018], [5, 0.024], [2.6, 0.035], [1.2, 0.05]]) {
      ctx.strokeStyle = `rgba(174,203,255,${ak * a})`; ctx.lineWidth = wk * u; ctx.stroke();
    }
    ctx.restore();
  }
}

function lockState(S, L, g, t) {
  if (t < RISE[0]) return null;
  const r = rise(seg(t, RISE[0], RISE[1]));
  const d = whip(seg(t, DOCK[0], DOCK[1]));
  const y0 = L.apex + L.heroH * 0.62;                 // fully below the horizon
  const w = lerp(L.heroW, L.dockW, d);
  const y = lerp(lerp(y0, L.heroY, r), L.dockY, d);
  let yaw = lerp(-0.32, 0.02, inOutCubic(seg(t, RISE[0], RISE[1] + 0.3)));
  yaw += 0.14 * Math.sin(Math.PI * d);                 // a turn of the wrist as it docks
  const pitch = lerp(0.3, 0.04, outCubic(seg(t, RISE[0], RISE[1]))) - 0.05 * Math.sin(Math.PI * d);
  let exposure = lerp(0.3, 1.1, outCubic(seg(t, RISE[0] + 0.1, RISE[1] - 0.2)));
  // docked, it steps back so each card is the one hero; the chrome flares
  // back up on every card's hit and settles again
  const dim = inOutCubic(seg(t, DIM[0], DIM[1]));
  let alpha = 1 - 0.56 * dim;
  for (const b of CARD) {
    const hit = bump(t, b, 7) * seg(t, b - 0.04, b);
    exposure += 0.3 * hit;
    alpha += 0.5 * dim * hit;
  }
  return { x: S.W / 2, y, w, h: w / LOGO_AR, yaw, pitch, exposure, d, dim, alpha: Math.min(1, alpha) };
}

function drawLockup(ctx, S, L, g, st) {
  if (!st) return;
  const cv = logoAt(S, st.yaw, st.pitch, st.exposure);
  if (!cv) return;
  ctx.save();
  if (st.d < 1) {
    // it rises from behind the planet: clip away everything under the limb
    ctx.beginPath(); ctx.rect(0, 0, S.W, S.H);
    g.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.lineTo(1.02 * S.W, S.H + 10); ctx.lineTo(-0.02 * S.W, S.H + 10); ctx.closePath();
    ctx.clip('evenodd');
  }
  ctx.globalAlpha *= st.alpha;
  // the render has room around the lockup for its widest pose: draw it GROW× the box
  const dw = st.w * GROW, dh = st.h * GROW;
  ctx.drawImage(cv, st.x - dw / 2, st.y - dh / 2, dw, dh);
  ctx.restore();
}

function drawTitleCopy(ctx, S, L, st, t) {
  if (!st) return;
  const { W, u } = S;
  const a = seg(t, TYPE[0] - 0.2, TYPE[0] + 0.1);
  if (a <= 0) return;
  // the eyebrow, over the lockup
  const ey = st.y - st.h * 0.36 - (L.wide ? 2.4 : 3.0) * u;
  const ea = seg(t, 0.88, 1.28);
  if (st.d < 0.5) text(ctx, S, 'THE FILM', W / 2, ey, { size: L.micro, weight: 700, tracking: 0.3, align: 'center', color: UI.gold, alpha: ea * (1 - seg(st.d, 0, 0.4)) });
  // the mono line, typed on under it
  const size = lerp(L.mono, L.monoDock, st.d);
  ctx.save();
  ctx.font = `500 ${Math.round(size)}px ${MONO}`;
  const lw = ctx.measureText(LINE).width;
  ctx.restore();
  const my = st.y + st.h * 0.5 + size * (L.wide ? 1.9 : 1.7);
  mono(ctx, S, LINE, W / 2 - lw / 2, my, { size, weight: 500, color: '#c9c4b6', reveal: seg(t, TYPE[0], TYPE[1]), cursor: t < TYPE[1] + 0.25, alpha: a * (1 - 0.62 * st.dim) });
}

// the episodes: each flies up out of the horizon, lands on its beat, and is
// thrown past the camera by the next one
function cardState(k, t) {
  const b = CARD[k];
  if (t < b - 0.08) return null;
  let s = lerp(0.1, 1, outExpo(seg(t, b - 0.08, b + 0.3)));
  s *= 1 + 0.06 * seg(t, b, b + BEAT + 0.3);                       // a slow push while it holds
  let a = seg(t, b - 0.08, b + 0.0);
  if (k < 3) {
    const o = seg(t, CARD[k + 1] - 0.04, CARD[k + 1] + 0.12);
    if (o >= 1) return null;
    s *= lerp(1, 3.0, inQuad(o));
    a *= 1 - seg(o, 0.05, 0.5);
  }
  const flash = 0.7 * bump(t, b, 14) * seg(t, b - 0.04, b);
  return { s, a, flash };
}

function drawCards(ctx, S, L, t) {
  if (t < CARD[0] - 0.1) return;
  const { W, H, u } = S;
  const cam = camera(S, { zoom: 1.1, cx: L.vp[0], cy: L.vp[1] });
  const D = 10, F = cam.F;
  const X = (L.cardX - L.vp[0] * W) * D / F, Y = (L.cardY - L.vp[1] * H) * D / F;
  const cw = L.cardW * D / F, ch = L.cardH * D / F, r = 1.1 * u;
  const dl = list();
  const plate = (c, p, img, s, a, flash, k, rim) => {
    const w = cw * p.k, h = ch * p.k, rr = r * s;
    if (w > W * 5) return;
    c.globalAlpha *= a;
    c.save();
    rrect(c, -w / 2, -h / 2, w, h, rr); c.clip();
    if (img) cover(c, img, -w / 2, -h / 2, w, h, { zoom: 1.02 });
    if (flash > 0.01) { c.fillStyle = `rgba(245,244,240,${0.5 * flash})`; c.fillRect(-w / 2, -h / 2, w, h); }
    c.restore();
    if (!rim) return;
    // the rim: a hairline of flowing chrome
    c.lineWidth = Math.max(1, 0.14 * u);
    c.strokeStyle = metal(c, -w / 2, -h / 2, w / 2, h / 2, 0.3 + k * 0.17 + t * 0.2, Math.max(60, (w + h) / 2.5));
    rrect(c, -w / 2, -h / 2, w, h, rr); c.stroke();
  };
  for (let k = 0; k < 4; k++) {
    const st = cardState(k, t);
    if (!st || st.a <= 0) continue;
    const img = S.img(EPS[k].img);
    // a short trail of where it just was, while it moves fast: the shutter's smear
    for (let j = 3; j >= 1; j--) {
      const q = cardState(k, t - j * 0.016);
      if (!q || Math.abs(st.s - q.s) / st.s < 0.06 * j) continue;
      const ga = st.a * [0, 0.34, 0.18, 0.09][j];
      dl.custom(D / q.s, (c, p) => plate(c, p, img, q.s, ga, 0, k, false), { x: X, y: Y });
    }
    dl.custom(D / st.s, (c, p) => plate(c, p, img, st.s, st.a, st.flash, k, true), { x: X, y: Y });
  }
  dl.draw(ctx, S, cam);
}

function playMark(ctx, x, y, h) {
  ctx.beginPath(); ctx.moveTo(x, y - h / 2); ctx.lineTo(x + h * 0.86, y); ctx.lineTo(x, y + h / 2); ctx.closePath(); ctx.fill();
}

function drawCaption(ctx, S, L, t) {
  // the current episode's title, changing on the beat
  let k = -1;
  for (let i = 0; i < 4; i++) if (t >= CARD[i] - 0.02) k = i;
  if (k < 0) return;
  const { W, u } = S, e = EPS[k], b = CARD[k];
  const rev = seg(t, b - 0.02, b + 0.18);                 // complete by b + 0.18: ~0.42 s held whole
  let x, y, align;
  if (L.wide) { x = L.cardX + L.cardW / 2 + 3.6 * u; y = L.cardY + 0.4 * u; align = 'left'; }
  else { x = W / 2; y = L.capY; align = 'center'; }
  if (L.wide) numeral(ctx, S, String(k + 1).padStart(2, '0'), x - 0.3 * u, y - L.cap * 2.3, 8.5 * u, { align: 'left', alpha: seg(t, b - 0.02, b + 0.12), metal: true, phase: 0.2 + t * 0.25 });
  text(ctx, S, e.ep, x, y - L.cap * 1.25, { size: L.micro, weight: 800, tracking: 0.22, color: UI.muted, align, reveal: rev, window: 0.4 });
  text(ctx, S, e.title, x, y + L.cap * 0.2, { size: L.cap, weight: 700, tracking: -0.01, color: UI.ink, align, reveal: rev, mask: true, window: 0.35 });
  // four ticks for where we are in the series, and the runtime
  const ty = y + L.cap * 1.5;
  const tw = (L.wide ? 2.6 : 3.4) * u, tg = 0.9 * u, th = Math.max(1, 0.28 * u), total = 4 * tw + 3 * tg;
  const rtW = L.micro * 1.15 * 0.6 * e.rt.length + L.micro * 1.6;
  let tx = align === 'left' ? x : x - (total + 2 * u + rtW) / 2;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i === k ? UI.gold : i < k ? 'rgba(245,244,240,.42)' : 'rgba(245,244,240,.16)';
    ctx.fillRect(tx, ty, tw * (i === k ? outExpo(seg(t, b, b + 0.3)) : 1), th);
    tx += tw + tg;
  }
  tx += 2 * u - tg;
  ctx.save();
  ctx.fillStyle = UI.muted;
  const fs = Math.round(L.micro * 1.15);
  playMark(ctx, tx, ty + th / 2, fs * 0.62);
  ctx.font = `500 ${fs}px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(e.rt, tx + fs * 1.0, ty + th / 2 + fs * 0.04);
  ctx.restore();
}

function drawHud(ctx, S, L, t) {
  const { W, H, u } = S;
  const a = seg(t, 0.4, 0.9);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  // the corner ticks of the cockpit glass
  const m = L.hudM, len = 2.2 * u;
  ctx.strokeStyle = 'rgba(245,244,240,.28)'; ctx.lineWidth = Math.max(1, 0.12 * u);
  ctx.beginPath();
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.moveTo(x, y + sy * len); ctx.lineTo(x, y); ctx.lineTo(x + sx * len, y);
  }
  ctx.stroke();
  // the mission clock and where we are, inside the title-safe frame
  const fs = L.hudFs, ty = L.hudY, tx = L.hudX;
  ctx.font = `500 ${Math.round(fs)}px ${MONO}`;
  ctx.fillStyle = UI.faint; ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left'; ctx.fillText(stamp(S.t), tx, ty);
  ctx.textAlign = 'right'; ctx.fillText('AUREA · ARRIVAL', W - tx, ty);
  ctx.restore();
}

function view(ctx, S, L, t, ta = 1) {
  space(ctx, S, { zoom: zoomAt(t) });
  const g = horizon(S, L, t);
  const st = lockState(S, L, g, t);
  drawSunrise(ctx, S, L, g, t);
  drawLockup(ctx, S, L, g, st);
  drawPlanet(ctx, S, L, g, t);
  // the thread is now the limb of the world; its highlights flow along it and settle
  wire(ctx, S, c => curvePath(c, g.pts), { phase: 1.2 * glide(seg(t, IN, 1.8)) });
  drawGlint(ctx, S, L, g, t);
  // (ta: the instruments go dark as the glass starts to close, before the view
  // recedes, so no line of type is ever read smaller than it was set)
  const typed = draw => { if (ta <= 0) return; ctx.save(); ctx.globalAlpha *= ta; draw(); ctx.restore(); };
  typed(() => drawTitleCopy(ctx, S, L, st, t));
  drawCards(ctx, S, L, t);
  typed(() => { drawCaption(ctx, S, L, t); drawHud(ctx, S, L, t); });
}

// ── the pill, the sign-off, and the way back to the thread ─────────────────
function drawSignoff(ctx, S, L, t, h, o) {
  const { W, H, u } = S;
  if (t < SIGN - 0.02) return;
  // on the way out everything is drawn back into the pill as it flattens into the thread
  const pull = inCubic(seg(o, 0, 0.42)), a = 1 - seg(o, 0.2, 0.42);
  if (a <= 0) return;
  const cy = H / 2, top = cy - h / 2, bot = cy + h / 2;
  // the name, heavy and light like the site's hero
  const n = L.name, w0 = layout(ctx, NAME[0], { size: n, weight: 900, tracking: -0.01 }).width;
  const sp = n * 0.28, w1 = layout(ctx, NAME[1], { size: n, weight: 300, tracking: -0.01 }).width;
  const x0 = W / 2 - (w0 + sp + w1) / 2, gap = (L.wide ? 4.2 : 4.8) * u;
  const ny = cy - L.ph / 2 - gap + pull * (gap + n * 0.8);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, top); ctx.clip();
  text(ctx, S, NAME[0], x0, ny, { size: n, weight: 900, tracking: -0.01, color: UI.ink, reveal: seg(t, SIGN - 0.02, SIGN + 0.34), mask: true, window: 0.55, alpha: a });
  text(ctx, S, NAME[1], x0 + w0 + sp, ny, { size: n, weight: 300, tracking: -0.01, color: UI.ink, reveal: seg(t, SIGN + 0.05, SIGN + 0.4), mask: true, window: 0.55, alpha: a });
  ctx.restore();
  // the role and the address under the pill
  const ry0 = cy + L.ph / 2 + L.role * 2.6, drop = ry0 + L.mail * 2.3 - cy + L.mail;
  const ry = ry0 - pull * drop;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, bot, W, H - bot); ctx.clip();
  text(ctx, S, ROLE, W / 2, ry, { size: L.role, weight: 500, tracking: 0.01, align: 'center', color: UI.muted, reveal: seg(t, SIGN + 0.08, SIGN + 0.42), window: 0.4, alpha: a });
  ctx.font = `500 ${Math.round(L.mail)}px ${MONO}`;
  const mw = ctx.measureText(MAIL).width;
  mono(ctx, S, MAIL, W / 2 - mw / 2, ry + L.mail * 2.3, { size: L.mail, weight: 500, color: UI.ink, reveal: seg(t, SIGN + 0.14, SIGN + 0.44), cursor: true, alpha: a });
  // once typed, the caret waits at the end of the address, blinking like the /process panes
  const since = t - (SIGN + 0.44);
  if (since > 0 && o <= 0 && Math.floor(since * 2.4) % 2 === 0) {
    ctx.globalAlpha *= a * 0.9; ctx.fillStyle = UI.ink;
    ctx.fillRect(W / 2 + mw / 2 + L.mail * 0.1, ry + L.mail * 2.3 - L.mail * 0.8, L.mail * 0.55, L.mail * 0.95);
  }
  ctx.restore();
}

/** pill() from kit3 with a free corner radius: the cockpit window on its way
    to becoming the pill (with r = h / 2 it draws exactly what pill() draws) */
function glassRim(ctx, S, x, y, w, h, r, o) {
  const rim = o.rim, a = o.alpha ?? 1;
  if (a <= 0 || w <= 0 || h <= 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.save();
  ctx.globalAlpha *= a;
  const x0 = x - w / 2, y0 = y - h / 2;
  if (o.glow) {
    ctx.fillStyle = `rgba(245,244,240,${0.06 * o.glow})`;
    rrect(ctx, x0 - rim * 3, y0 - rim * 3, w + rim * 6, h + rim * 6, r + rim * 3); ctx.fill();
  }
  ctx.fillStyle = metal(ctx, x0, y0, x0 + w, y0 + h * 0.4, o.phase || 0, Math.max(40, w / 2.1));
  rrect(ctx, x0, y0, w, h, r); ctx.fill();
  const shade = ctx.createLinearGradient(0, y0, 0, y0 + h);
  shade.addColorStop(0, 'rgba(255,255,255,.16)'); shade.addColorStop(0.5, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = shade; ctx.fill();
  const plate = ctx.createLinearGradient(0, y0 + rim, 0, y0 + h - rim);
  plate.addColorStop(0, '#1d1d1b'); plate.addColorStop(1, '#0a0a09');
  ctx.fillStyle = plate;
  rrect(ctx, x0 + rim, y0 + rim, w - 2 * rim, h - 2 * rim, Math.max(0, r - rim)); ctx.fill();
  ctx.restore();
}

/** the nav's links as chapter 1 leaves them: Process lit and underlined; on an
    upright frame the strip is scrolled inside the plate, under the site's end fades */
function pillLinks(ctx, S, L, w, h, rim, alpha, ul) {
  const { W, H } = S, cx = W / 2, cy = H / 2, size = L.link;
  ctx.save();
  if (L.scroll) { rrect(ctx, cx - w / 2 + rim, cy - h / 2 + rim, w - 2 * rim, h - 2 * rim, h / 2 - rim); ctx.clip(); }
  // they squash with the pill on the way out
  ctx.translate(0, cy); ctx.scale(1, clamp(h / L.ph, 0.05, 1.2)); ctx.translate(0, -cy);
  navLinks(ctx, S, cx + L.shift, cy, w, size, { hot: HOT, alpha });
  // the site marks the page you are on: Process, underlined as chapter 1 left it
  if (ul > 0) {
    const hx = cx + L.shift + L.rel[HOT], hw = L.widths[HOT] * ul;
    ctx.save();
    ctx.globalAlpha *= alpha; ctx.fillStyle = UI.ink;
    ctx.fillRect(hx - hw / 2, cy + size * 1.3, hw, Math.max(1, size * 0.12));
    ctx.restore();
  }
  if (L.scroll) {
    // the site's end fades, at whichever end still has links to scroll to
    const plate = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    plate.addColorStop(0, '#1d1d1b'); plate.addColorStop(1, '#0a0a09');
    ctx.fillStyle = plate;
    const fw = L.pw * 0.16, n = 10, lx = cx - w / 2, rx = cx + w / 2;
    const leftOn = clamp((L.strip0 - L.shift) / fw) * alpha, rightOn = clamp((L.shift - L.stripEnd) / fw) * alpha;
    for (let s = 0; s < n; s++) {
      const a = 1 - (s + 0.5) / n;
      if (leftOn > 0) { ctx.globalAlpha = a * leftOn; ctx.fillRect(lx + s * fw / n, cy - h / 2, fw / n + 0.5, h); }
      if (rightOn > 0) { ctx.globalAlpha = a * rightOn; ctx.fillRect(rx - (s + 1) * fw / n, cy - h / 2, fw / n + 0.5, h); }
    }
  }
  ctx.restore();
}

/** the cockpit glass: chapter 1's viewport window, from just outside the frame,
    narrows to the pill's width, then shuts top to bottom into the pill (the
    opening of chapter 1, reversed), both sides log-eased */
function glassAt(S, L, t) {
  const { W, H, u } = S;
  const m = L.r0 + 2;                                          // rim and corners just off the frame
  const w0 = W + 2 * m, h0 = H + 2 * m;
  const ew = inOutCubic(seg(t, CLOSE[0], CLOSE[0] + 0.27));
  const eh = Math.pow(seg(t, CLOSE[0] + 0.02, CLOSE[1]), 2.2);
  const land = t - CLOSE[1];
  const settle = land > 0 ? -0.07 * Math.sin(TAU * 2.2 * land) * Math.exp(-land * 8) : 0;
  const vw = Math.exp(lerp(Math.log(w0), Math.log(L.pw), ew) + settle * 0.5);
  const vh = Math.exp(lerp(Math.log(h0), Math.log(L.ph), eh) + settle);
  const r = lerp(L.r0, vh / 2, eh * eh);                       // the corners round up into the pill's ends
  const rim = Math.min(vh / 2, lerp(1.1 * u, L.rim, eh));
  return { vw, vh, r, rim, eh };
}

function drawPillPhase(ctx, S, L, t) {
  const { W, H } = S, cx = W / 2, cy = H / 2;
  const gl = glassAt(S, L, t);
  const { vw, vh } = gl;
  // then it opens out: a breath in, and it flattens and runs out to the edges as the thread
  const o = seg(t, OUT[0], OUT[1]);
  const breath = 1 - 0.035 * Math.sin(Math.PI * seg(o, 0, 0.3));
  const w = lerp(vw * breath, 1.06 * W, inOutCubic(seg(o, 0.16, 1)));
  const wireW = Math.max(1.5, 0.32 * S.u);
  const h = lerp(vh, wireW * 1.2, inOutCubic(seg(o, 0.05, 0.62)));
  const r = o > 0 ? h / 2 : gl.r;
  const rim = Math.min(h / 2, gl.rim);

  space(ctx, S);
  // the thread returns out of the pill's ends
  if (o > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - w / 2, 0, w, H); ctx.clip();
    wire(ctx, S, c => { c.beginPath(); c.moveTo(-0.02 * W, cy); c.lineTo(1.02 * W, cy); }, { phase: lerp(-0.5, 0, outCubic(o)), alpha: seg(o, 0.3, 0.72) });
    ctx.restore();
  }
  const pa = 1 - seg(o, 0.55, 0.92);
  if (pa <= 0) { drawSignoff(ctx, S, L, t, h, o); return; }
  glassRim(ctx, S, cx, cy, w, h, r, { rim, phase: 0.15 * Math.max(0, t - 4.6), glow: 0.45 * seg(t, 4.8, 5.3) * (1 - seg(o, 0, 0.4)), alpha: pa });
  // what the glass still shows as it closes: the view recedes inside it (the
  // whole picture kept in the window), its edges melting into the stars,
  // and dissolves into the plate as the pill shuts
  const mix = inOutQuad(seg(t, 4.84, 4.985));
  const ix = cx - vw / 2 + rim, iy = cy - vh / 2 + rim, iw = vw - 2 * rim, ih = vh - 2 * rim;
  if (mix < 1 && iw > 0 && ih > 0) {
    const sc = Math.min(1, vw / W, vh / H);
    ctx.save();
    rrect(ctx, ix, iy, iw, ih, Math.max(0, r - rim)); ctx.clip();
    if (sc < 1) space(ctx, S);
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    if (sc < 1) { ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); }   // nothing from past the frame's edge
    view(ctx, S, L, Math.min(t, CLOSE[1]), 1 - seg(t, CLOSE[0], CLOSE[0] + 0.08));
    ctx.restore();
    if (sc < 1) {
      // soft edges wherever the receding picture no longer reaches the glass
      const pw2 = W * sc / 2, ph2 = H * sc / 2;
      const gx = Math.min(ix + iw, W) - (cx + pw2), gy = Math.min(iy + ih, H) - (cy + ph2);
      const bx = 0.24 * W * sc, by = 0.2 * H * sc;
      const veil = (x0, y0, x1, y1, fx, fy, fw, fh, k) => {
        if (k <= 0) return;
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, `rgba(5,6,10,${k})`); g.addColorStop(1, 'rgba(5,6,10,0)');
        ctx.fillStyle = g; ctx.fillRect(fx, fy, fw, fh);
      };
      const k = clamp((1 - sc) / 0.04), kx = k * clamp(gx / (0.005 * W + 1)), ky = k * clamp(gy / (0.005 * H + 1));
      veil(cx - pw2, 0, cx - pw2 + bx, 0, cx - pw2 - 1, cy - ph2, bx + 1, 2 * ph2, kx);
      veil(cx + pw2, 0, cx + pw2 - bx, 0, cx + pw2 - bx, cy - ph2, bx + 1, 2 * ph2, kx);
      veil(0, cy - ph2, 0, cy - ph2 + by, cx - pw2, cy - ph2 - 1, 2 * pw2, by + 1, ky);
      veil(0, cy + ph2, 0, cy + ph2 - by, cx - pw2, cy + ph2 - by, 2 * pw2, by + 1, ky);
    }
    // and the pill's plate comes up over all of it
    if (mix > 0) {
      const pl = ctx.createLinearGradient(0, iy, 0, iy + ih);
      pl.addColorStop(0, '#1d1d1b'); pl.addColorStop(1, '#0a0a09');
      ctx.globalAlpha = mix; ctx.fillStyle = pl; ctx.fillRect(ix, iy, iw, ih);
    }
    ctx.restore();
  }
  // the links, as chapter 1 left them, with Process lit
  const la = seg(t, CLOSE[1] - 0.02, CLOSE[1] + 0.3) * (1 - seg(o, 0.1, 0.4));
  if (la > 0) pillLinks(ctx, S, L, w, h, rim, la, outExpo(seg(t, CLOSE[1] + 0.12, CLOSE[1] + 0.45)));
  drawSignoff(ctx, S, L, t, h, o);
}

function lens(S, t) {
  const fx = S.fx;
  // (no flash or aberration off the seam: the calm opening is the point; the
  // lens only answers the card hits and the pill's landing)
  for (let k = 0; k < 4; k++) {
    const d = t - CARD[k];
    if (d > -0.03 && d < 0.5) { fx.ab = Math.max(fx.ab, 0.3 * Math.exp(-Math.max(0, d) * 10)); }
  }
  const l = t - CLOSE[1];
  if (l > 0 && l < 0.6) {
    fx.ab = Math.max(fx.ab, 0.35 * Math.exp(-l * 10));
    fx.shake = 0.18 * S.u * Math.exp(-l * 16);
  }
}

// ── the chapter ───────────────────────────────────────────────────────────
export default {
  id: 'arrival',
  title: 'Arrival',
  caption: 'Arrival at the film itself: the thread bends into the horizon of Aurea, the chrome Land of Hope title rises over it, the four episodes flash past on the beat, and the cockpit closes back into the nav pill for the sign-off.',
  assets: [AUREA, ...EPS.map(e => e.img)],
  models: ['landofhope'],
  still: 1.56,
  sfx: [
    { at: RISE[0] + 0.05, type: 'sub', gain: 0.7 },
    { at: CARD[0], type: 'impact', gain: 0.45 },
    { at: CARD[1], type: 'tick', gain: 0.7 },
    { at: CARD[2], type: 'tick', gain: 0.7 },
    { at: CARD[3], type: 'tick', gain: 0.7 },
    { at: CLOSE[0] + 0.1, type: 'whoosh', gain: 0.6 },
    { at: CLOSE[1], type: 'impact', gain: 0.8 },
    { at: OUT[0] + 0.12, type: 'whoosh', gain: 0.45 }
  ],
  prepare(S) {
    // size the shared renderer once, off the frame loop
    logoAt(S, -0.32, 0.3, 0.3);
    const c = document.createElement('canvas'); c.width = 96; c.height = 54;
    const x = c.getContext('2d');
    band(S, lay(x, S));
    // decode the pictures and rasterise the type now, so none of it lands on a frame
    for (const p of EPS.map(e => e.img)) { const im = S.img(p); if (im && im.width) x.drawImage(im, 0, 0, 96, 54); }
    x.font = `500 12px ${MONO}`; x.fillText(LINE + MAIL, 0, 20);
    for (const w of [300, 500, 600, 700, 800, 900]) { x.font = `${w} 12px 'Archivo'`; x.fillText(ROLE + NAME.join(' ') + EPS.map(e => e.ep + e.title).join(''), 0, 40); }
  },
  draw(ctx, S) {
    const t = S.lt;
    if (t < IN || t >= END) {
      seam(ctx, S);
      if (t < IN) logoAt(S, -0.32, 0.3, 0.3);
      return;
    }
    const L = lay(ctx, S);
    if (t < CLOSE[0]) view(ctx, S, L, t);
    else drawPillPhase(ctx, S, L, t);
    lens(S, t);
  }
};
