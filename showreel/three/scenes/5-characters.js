/* Station 04 — Character (Higgsfield).

   The seam's straight thread is an orbit seen exactly edge-on, from inside:
   the camera rises out of its plane and backs out of the ring, so the line
   arches, closes and opens into an ellipse — and a second orbit peels off
   the first. The six-position character sheets fold out of the thread and
   ride the orbits like satellites, facing outward — holograms, so the near
   side shows them, the far side shows them mirrored and dim, and the flanks
   catch a glint of edge.
   The rings index on the beat: every beat a sheet eases to a stop at the
   front, facing the lens (a satellite docking), then moves on. Twice, one
   sheet keeps coming — the same character on their planet, then on Earth —
   and docks close enough to read all six positions. At the end the sheets
   fold back into the thread and the camera sinks back into the orbit's
   plane until the ellipse is a straight line again.

   Everything is a function of S.lt; the orbits are real circles projected
   through space.js's camera and drawn back to front with its list. */
import { clamp, lerp, seg, TAU, rrect, text, layout, cover, outExpo, outCubic, outBack, inCubic, inOutCubic, inOutQuad } from '../../kit.js';
import { camera, list } from '../../space.js';
import { seam, space, metal, chip, numeral, mono, stamp, readPx, UI, MONO } from '../kit3.js';
import { BEAT } from '../palette.js';

const T_IN = 0.1, T_OUT = 7.4;                 // the seam holds before and after these
const DOCK1 = 2 * BEAT;                         // 1.25 — the first sheet docks
const HERO_A_AT = 4 * BEAT;                     // 2.5  — bar 2: the planet sheet docks close
const HERO_B_AT = 8 * BEAT;                     // 5.0  — bar 3: the same face, on Earth
const RELEASE = 10 * BEAT;                      // 6.25 — the last dock lets go

/* Docking. A move glides out of rest and meets its dock exactly on the beat with
   some speed still on it (not a long ease-out that has stopped a fifth of a second
   early); the contact carries it a hair past, and a stiff spring (≈2.6 Hz) takes
   it back: the overshoot peaks ~0.06 s after contact and is gone by ~0.28 s. */
const SPR_W = TAU * 2.6, SPR_Z = 12;
/** cubic Hermite 0 → 1 leaving with slope s0 and arriving with slope s1 */
const herm = (x, s0, s1) => (((s0 + s1 - 2) * x + (3 - 2 * s0 - s1)) * x + s0) * x;
/** how far past its dock a move arriving at speed v (units / s) has carried, dt after contact */
const overshoot = (dt, v) => (dt <= 0 ? 0 : v / SPR_W * Math.exp(-SPR_Z * dt) * Math.sin(SPR_W * dt));
const ARRIVE = 0.8;                              // a ring's speed into each dock, as a share of an even glide's
const P = id => `assets/process/img-${id}.webp`;

/* the orbits. Ring A is the thread itself; B peels off it.
   The two heroes are one character: on their planet (A) and on Earth (B). */
const RING_A = ['b7f278e1e3', '0c13a2f4d1', 'f5482cf5c2', '840afa3051', '5358d41623', 'e2023d0fd6', 'e627966d3b', 'b5b6e7524b', '68739592b7', '57e539fe39'];
const RING_B = ['f4eba29837', '04c5d2f593', '1705e9b48e', '34434613df', 'e8a1948a26'];
const HERO_A = 2, HERO_B = 6;                   // indices on ring A (ring A steps one slot a beat)
const HEROES = [
  { i: HERO_A, from: HERO_A_AT - BEAT, at: HERO_A_AT, back: HERO_B_AT - 0.8, home: HERO_B_AT - 0.2, v: 0.95, tags: 1.5 * BEAT, tag: 'ONCE ON THEIR PLANET' },
  { i: HERO_B, from: HERO_B_AT - 0.55, at: HERO_B_AT, back: RELEASE, home: RELEASE + 0.5, v: 0.7, tags: 0.75 * BEAT, tag: 'ONCE ON EARTH' }
];
/* the six positions on each hero sheet, as fractions of the sheet [x, y, w, h] */
const SIX = {
  f5482cf5c2: [[0, 0, 0.318, 1], [0.318, 0, 0.244, 0.56], [0.562, 0, 0.158, 0.56], [0.72, 0, 0.28, 0.56], [0.318, 0.56, 0.37, 0.44], [0.688, 0.56, 0.312, 0.44]],
  e627966d3b: [[0, 0, 0.25, 0.493], [0.25, 0, 0.25, 0.493], [0.5, 0, 0.25, 0.493], [0.75, 0, 0.25, 0.493], [0.25, 0.493, 0.44, 0.507], [0.69, 0.493, 0.31, 0.507]]
};
const ASPECT = 0.558;                            // the sheets are 1000 × 558
/** readPx, rounded up to a whole device px: fonts are set at whole px, and where the backing
    is capped (S.dpr fractional) rounding to nearest could land a hair under 10 CSS px */
const rpx = (S, k, min) => Math.ceil(readPx(S, k, min) - 1e-6);

// world: the ring's centre sits Z0 ahead of the resting camera
const R = 10, Z0 = 20, CAM_IN = 13;             // CAM_IN is inside the ring: the seam's view
const PUSH = 1.4;                               // the slow push-in while a hero is docked
const SW_A = 3.2, SW_B = 2.4;                   // sheet widths (world)

// ── time ──────────────────────────────────────────────────────────────────
const hitAt = (t, t0, len) => { const x = (t - t0) / len; return x < 0 || x > 1 ? 0 : (1 - x) * (1 - x); };

/** the orbit's tilt out of edge-on: leads the opening, trails the closing */
function tiltOf(t) {
  if (t < 4) return inOutQuad(seg(t, T_IN, 0.8));
  return 1 - inOutCubic(seg(t, 6.86, T_OUT));
}
/** the camera backing out of the ring (0: inside it, the seam's view) */
function backOf(t) {
  if (t < 4) return inOutCubic(seg(t, 0.3, 1.2));
  return 1 - inOutCubic(seg(t, 6.74, 7.3));
}

/** an orbit that indexes one slot every `period` from t0: it rests a moment after
    each contact, glides to the next dock and meets it on time (plus the settle) */
function indexed(t, t0, period, move) {
  const x = (t - t0) / period, k = Math.floor(x), tau = (x - k) * period;
  return k + herm(clamp((tau - (period - move)) / move), 0, ARRIVE) + overshoot(tau, ARRIVE / move);
}
/** spinning in from `from` slots back, arriving at t1 with the docking speed v */
const spinIn = (t, t1, from, v) => -from * (1 - herm(seg(t, T_IN, t1), 3, v * (t1 - T_IN) / from));

/** ring A's continuous slot count: 0 at the first dock, +1 on every beat —
    and through bar 3, while the second hero is out, the whole orbit holds */
const MOVE_A = 0.8 * BEAT, V_A = ARRIVE / MOVE_A;
function stepsA(t) {
  if (t <= DOCK1) return spinIn(t, DOCK1, 3.4, V_A);
  if (t <= HERO_B_AT) return indexed(t, DOCK1, BEAT, MOVE_A);
  const n = (HERO_B_AT - DOCK1) / BEAT;
  if (t <= RELEASE) return n + overshoot(t - HERO_B_AT, V_A);
  return n + 3.4 * inCubic(seg(t, RELEASE, T_OUT));
}
/** ring B counter-rotates and docks every other beat, off the bar lines */
const MOVE_B = 0.88 * 2 * BEAT, V_B = ARRIVE / MOVE_B;
function stepsB(t) {
  const d0 = 3 * BEAT, d1 = 9 * BEAT;          // 1.875 … 5.625
  if (t <= d0) return spinIn(t, d0, 2.6, V_B);
  if (t <= d1) return indexed(t, d0, 2 * BEAT, MOVE_B);
  return (d1 - d0) / (2 * BEAT) + overshoot(t - d1, V_B) + 2.4 * inCubic(seg(t, d1, T_OUT));
}

/** a hero's pull: 0 in its slot, 1 docked close. It gathers, comes forward, meets
    the dock on the beat still moving (90 % of the way only ~0.07 s out) and the
    contact settles it: a little past (bigger, and a touch low) and back by +0.28 s */
function heroPull(h, t) {
  if (t < h.from || t > h.home) return 0;
  if (t < h.at) return herm(seg(t, h.from, h.at), 0, h.v);
  if (t < h.back) return 1 + overshoot(t - h.at, h.v / (h.at - h.from));
  return 1 - inOutCubic(seg(t, h.back, h.home));
}
/** how much the frame is given over to a hero (camera framing, dimming) */
function heroStage(t) {
  return inOutCubic(seg(t, HERO_A_AT - BEAT, HERO_A_AT)) * (1 - inOutCubic(seg(t, RELEASE, RELEASE + 0.6)));
}

// ── layout ────────────────────────────────────────────────────────────────
/* Type meant to be read never drops under 10 CSS px (readPx): on a phone, or a phone
   held sideways, k·u alone lands at 4–7 px. So the landscape column is built top down
   from the sizes it actually gets (a sideways phone's is ~1.8× a laptop's, relative to
   the frame) and centred on the hero, rather than pinned at fixed fractions of H. */
function frame(S) {
  const { W, H, u } = S;
  if (!S.portrait) {
    const hw = Math.min(0.45 * W, 0.5 * H / ASPECT);
    const hero = { cx: 0.64 * W, cy: 0.47 * H, w: hw, h: hw * ASPECT };
    const ts = Math.min(7.6 * u, 0.056 * W);
    const x = 0.075 * W;
    const labSize = rpx(S, 1.5), ms = rpx(S, 1.65), chipSize = rpx(S, 1.2);
    // the sentence is the chapter's thesis: on a sideways phone it would land at 12 px, where
    // Archivo's word spaces close up ("everyshot"), so it holds 15
    const ss = Math.max(Math.min(3.1 * u, 0.024 * W), rpx(S, 0, 15));
    // the column's baselines, from its top: index / name, the title, the chip, the rule and
    // the readout, the sentence
    const stage = labSize * 0.74, name = stage + labSize * 1.8;
    const t1 = name + 2.8 * u + ts * 0.74, t2 = t1 + ts * 0.98;
    const chipY = t2 + 2.2 * u;
    const tel1 = chipY + chipSize * 2.6 + 2 * u + ms * 1.9, tel2 = tel1 + ms * 1.6;
    const sentY = tel2 + 2.8 * u + ss, end = sentY + ss * 1.52;
    const top = clamp(hero.cy - end / 2, 0.12 * H, Math.max(0.12 * H, 0.8 * H - end));
    // the wreath behind the hero: its front dock tucked half behind the hero's lower edge
    // (never tangent to it, never cut by the frame), as steep as the frame's top allows
    const fit = fitWreath(S, 1.1, hero.cy + hero.h / 2, 0.06 * H, 0.9 * H, 0.62);
    return {
      land: true, x, stageY: top + stage, nameY: top + name, ts, t1: top + t1, t2: top + t2, chipY: top + chipY,
      ms, tel1: top + tel1, tel2: top + tel2, sentY: top + sentY, sentSize: ss,
      clockSize: rpx(S, 1.5), clockY: 0.84 * H,
      hero, numSize: 9 * u, labSize, chipSize,
      zoom: 1.25, heroZoom: 1.1, alpha: 0.24, heroAlpha: fit.al, heroBack: 0, bTilt: -0.56, bTiltHero: 0.06 - fit.al,
      ringY: 0.47 * H, heroRingY: fit.cy
    };
  }
  // portrait: index, name and title anchored at the top, the readouts at the bottom,
  // the hero and its orbit in the space between
  const x = 0.07 * W;
  const ts = Math.min(11 * u, 0.068 * H);
  const labSize = rpx(S, 2.3), chipSize = rpx(S, 2);
  const stageY = 0.1 * H + 1.2 * u, nameY = stageY + labSize * 1.75;
  const t1 = nameY + 3.2 * u + ts * 0.74, t2 = t1 + ts * 0.97;
  const chipY = t2 + 2.2 * u, topEnd = chipY + chipSize * 2.6;
  const ss = Math.max(4.6 * u, rpx(S, 0)), ms = rpx(S, 2.5);
  const sent2 = 0.84 * H, sentY = sent2 - ss * 1.22;
  const tel2 = sentY - ss - 2 * u, tel1 = tel2 - ms * 1.6;
  const bottomTop = tel1 - ms * 1.9 - 1.5 * u;            // clear of the chrome rule (drawn at tel1 - 1.9 ms)
  const G = bottomTop - topEnd;
  const hw = Math.min(0.88 * W, (G - 6 * u) / ASPECT);     // at least 3u of air above and below the hero
  const hero = { cx: 0.5 * W, cy: (topEnd + bottomTop) / 2, w: hw, h: hw * ASPECT };
  const zH = 1.0, fit = fitOrbit(S, zH, topEnd + 1.2 * u, bottomTop - 1.2 * u, 1);
  // before the hero, the open orbit sits between the numeral and 0.88 H, front dock and its
  // ticks included: a squarer frame (768 × 1024) zooms out rather than cut the front sheet
  const top0 = t2 + 1.5 * u, bot0 = 0.88 * H - 0.8 * u, ALPHA = 0.86;
  const [h1, l1] = orbitSpan(Math.min(W, H), ALPHA, Z0);  // at zoom 1; the span scales with zoom
  const zoom = Math.min(1.05, (bot0 - top0) / (l1 - h1));
  const ringY = clamp(hero.cy, top0 - h1 * zoom, bot0 - l1 * zoom);
  return {
    land: false, x, stageY, nameY, ts, t1, t2, chipY, ms, tel1, tel2, sentY, sentSize: ss,
    clockSize: rpx(S, 2.1), clockY: stageY,
    hero, numSize: 16 * u, labSize, chipSize,
    zoom, heroZoom: zH, alpha: ALPHA, heroAlpha: fit.al, heroBack: 0, bTilt: -1.1, bTiltHero: -fit.al,
    ringY, heroRingY: fit.cy
  };
}

/** ring A tilted al, its centre Z ahead of the camera, focal Fp px: the back sheet's
    top and the front sheet's bottom, in px from the projected centre */
function orbitSpan(Fp, al, Z) {
  const s = Math.sin(al), c = Math.cos(al), yc = -1.2, hh = SW_A * ASPECT / 2;
  const dF = Z - R * c, dB = Z + R * c, yC = yc * Fp / Z;
  return [(yc - R * s - hh) * Fp / dB - yC, (yc + R * s + hh) * Fp / dF - yC];
}

/* Landscape: the steepest tilt (≤ alMax) at which the ring, placed so its front
   sheet's centre sits on the hero's lower edge (at half the push), keeps its back
   sheets below `top` and its front sheet above `bottom` even at the closest push. */
function fitWreath(S, zoom, edge, top, bottom, alMax) {
  const Fp = zoom * Math.min(S.W, S.H), hh = SW_A * ASPECT / 2, Zm = Z0 - 0.5 * PUSH, Zc = Z0 - PUSH;
  let al = 0.12, cy = edge;
  for (let k = Math.round(alMax * 50); k >= 6; k--) {
    al = k / 50;
    cy = edge - (orbitSpan(Fp, al, Zm)[1] - hh * Fp / (Zm - R * Math.cos(al)));
    const [hi, lo] = orbitSpan(Fp, al, Zc);
    if (cy + hi >= top && cy + lo <= bottom) break;
  }
  return { al, cy };
}

/* The hero's orbit has to fit its band of the frame (on a phone, between the
   title block and the readout): the steepest tilt (≤ alMax) whose front sheets
   stay above `bottom` and back sheets below `top`, measured at the closest push,
   and where to centre it. If none fits, the flattest, centred on the gap. */
function fitOrbit(S, zoom, top, bottom, alMax) {
  const Fp = zoom * Math.min(S.W, S.H), Z = Z0 - PUSH;
  for (let k = Math.round(alMax * 50); k >= 6; k--) {
    const al = k / 50, [hi, lo] = orbitSpan(Fp, al, Z);
    if (lo - hi <= bottom - top || k === 6) return { al, cy: (top + bottom) / 2 - (hi + lo) / 2 };
  }
}

// ── the rig ───────────────────────────────────────────────────────────────
function rig(S, F, t) {
  const tilt = tiltOf(t), back = backOf(t), hs = heroStage(t);
  const al = F.alpha * tilt + (F.heroAlpha - F.alpha) * hs;
  const yc = -1.2 * tilt * back;                   // the ring rises once the camera is out of it (0 at the seam)
  const camZ = lerp(CAM_IN, 0, back) - F.heroBack * hs + PUSH * hs * inOutQuad(seg(t, HERO_A_AT - BEAT, RELEASE));
  const zoom = lerp(F.zoom, F.heroZoom, hs), Fpx = zoom * Math.min(S.W, S.H);
  // pan so the ring centres on the hero …
  const camX = -((F.hero.cx - S.W / 2) * hs) * (Z0 - camZ) / Fpx;
  // … and lift the vanishing point so the ring sits where the frame wants it (at rest: dead centre)
  // a slight dutch angle while the orbit is the subject; level for the heroes and at the seam
  const roll = -0.06 * tilt * back * (1 - hs);
  const c0 = camera(S, { x: camX, z: camZ, zoom, roll });
  const q = c0.project(0, yc, Z0);
  const shift = q ? (lerp(F.ringY, F.heroRingY, hs) - q.y) * tilt * back : 0;
  const cam = camera(S, { x: camX, z: camZ, zoom, roll, cy: 0.5 + shift / S.H });
  return { cam, tilt, back, O: back, hs, al, yc, camZ, bTilt: lerp(F.bTilt, F.bTiltHero, hs) };
}

function ringOf(rg, t, which) {
  if (which === 0) return { cx: 0, cy: rg.yc, cz: Z0, R, al: rg.al, be: 0 };
  // ring B peels off A: same circle at first, then its own radius, tilt and roll
  const sep = inOutCubic(seg(t, 0.5, 1.45)) * (1 - inOutCubic(seg(t, 6.45, 6.95)));
  return { cx: 0, cy: rg.yc, cz: Z0, R: lerp(R, 0.72 * R, sep), al: rg.al + rg.bTilt * sep, be: -0.28 * sep, sep };
}

function ringPoint(r, th) {
  const s = Math.sin(th), c = Math.cos(th), sa = Math.sin(r.al), ca = Math.cos(r.al), sb = Math.sin(r.be), cb = Math.cos(r.be);
  const lx = r.R * s, ly = r.R * c * sa;
  return [r.cx + lx * cb - ly * sb, r.cy + lx * sb + ly * cb, r.cz - r.R * c * ca];
}
/** how squarely a sheet at ring angle th faces the camera (yaw only): 1 front, -1 back */
function facing(r, th, P, cam) {
  const s = Math.sin(th), c = Math.cos(th);
  const nx = s * Math.cos(r.be) - c * Math.sin(r.al) * Math.sin(r.be), nz = -c * Math.cos(r.al);
  const tx = cam.x - P[0], tz = cam.z - P[2];
  return (nx * tx + nz * tz) / (Math.hypot(nx, nz) * Math.hypot(tx, tz) || 1);
}

// ── caches: each sheet baked once, rounded, at a size for the frame ──────
const baked = new Map();
let bakedW = 0;
function bakeWidth(S) { return Math.round(clamp(0.4 * Math.min(S.W, S.H), 160, 520)); }
function bakedSheet(S, id) {
  const bw = bakeWidth(S);
  if (bw !== bakedW) { baked.clear(); bakedW = bw; }
  let c = baked.get(id);
  if (c) return c;
  const img = S.img(P(id));
  if (!img || !img.width) return null;
  c = document.createElement('canvas');
  c.width = bw; c.height = Math.round(bw * ASPECT);
  const x = c.getContext('2d');
  rrect(x, 0, 0, c.width, c.height, bw * 0.04); x.clip();
  cover(x, img, 0, 0, c.width, c.height);
  baked.set(id, c);
  return c;
}

// ── drawing ───────────────────────────────────────────────────────────────
const HAIR = 'rgba(245,244,240,.22)';

/** one orbiting sheet, at its projected centre (x, y), w × h before facing and fold.
    The sheets are holograms: from behind they show the same sheet, mirrored and dimmer. */
function drawSheet(ctx, S, it, grad) {
  const sx = Math.max(0.03, Math.abs(it.f));
  const ww = it.w * sx, hh = it.h * it.un;
  if (hh < 0.6 || ww < 0.6 || it.a <= 0) return;
  const x0 = it.x - ww / 2, y0 = it.y - hh / 2, r = Math.min(0.04 * it.w, ww / 2, hh / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = it.a;
  const back = it.f < 0;
  if (it.img) {
    if (back) { ctx.save(); ctx.translate(it.x, 0); ctx.scale(-1, 1); ctx.drawImage(it.img, -ww / 2, y0, ww, hh); ctx.restore(); }
    else ctx.drawImage(it.img, x0, y0, ww, hh);
  }
  rrect(ctx, x0, y0, ww, hh, r);
  const fog = Math.min(0.93, it.fog + (back ? 0.42 * (1 - it.fog) : 0));
  if (fog > 0.01) { ctx.fillStyle = `rgba(5,6,10,${fog.toFixed(3)})`; ctx.fill(); }
  ctx.lineWidth = Math.max(1, 0.09 * S.u);
  ctx.strokeStyle = HAIR; ctx.stroke();
  // on edge, a sheet catches the light along its rim
  const glint = 1 - sx / 0.34;
  if (glint > 0) {
    ctx.globalAlpha = it.a * glint * (1 - 0.7 * it.fog);
    ctx.strokeStyle = grad; ctx.lineWidth = Math.max(1.2, 0.26 * S.u);
    ctx.beginPath(); ctx.moveTo(it.x, y0); ctx.lineTo(it.x, y0 + hh); ctx.stroke();
  }
  // docked: four corner ticks snap in around it on the beat
  if (it.lock) {
    const pad = (0.8 + 2.4 * (1 - it.lock.close)) * S.u, L = Math.min(ww, hh) * 0.16;
    const bx = x0 - pad, by = y0 - pad, bw = ww + pad * 2, bh = hh + pad * 2;
    ctx.globalAlpha = it.a * it.lock.a * (1 - 0.6 * it.fog);
    ctx.strokeStyle = UI.ink; ctx.lineWidth = Math.max(1, 0.14 * S.u); ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(bx, by + L); ctx.lineTo(bx, by); ctx.lineTo(bx + L, by);
    ctx.moveTo(bx + bw - L, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + L);
    ctx.moveTo(bx + bw, by + bh - L); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - L, by + bh);
    ctx.moveTo(bx + L, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - L);
    ctx.stroke();
  }
}

/** a stretch of orbit: the dark tube and the flowing chrome, butt-ended so stretches join invisibly */
function drawArc(ctx, S, runs, w, a, grad) {
  if (a <= 0) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = a;
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const run of runs) { ctx.moveTo(run[0], run[1]); for (let i = 2; i < run.length; i += 2) ctx.lineTo(run[i], run[i + 1]); }
  ctx.strokeStyle = '#1b1b1e'; ctx.lineWidth = w * 1.6; ctx.stroke();
  ctx.strokeStyle = grad; ctx.lineWidth = w; ctx.stroke();
}

/** project the ring between two angles into screen polylines, cut at the near plane */
const NEAR = 0.35;
function arcRuns(cam, r, a0, a1, out) {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.045));
  let run = null, pz = 0, pd = 0, px = 0, py = 0, zmax = -Infinity;
  for (let i = 0; i <= n; i++) {
    const [x, y, z] = ringPoint(r, a0 + (a1 - a0) * i / n);
    const d = z - cam.z;
    if (d > NEAR) {
      if (!run) {
        run = [];
        if (i > 0) { const k = (NEAR * 1.001 - pd) / (d - pd), q = cam.project(lerp(px, x, k), lerp(py, y, k), lerp(pz, z, k)); if (q) run.push(q.x, q.y); }
        out.push(run);
      }
      const q = cam.project(x, y, z); run.push(q.x, q.y);
      if (z > zmax) zmax = z;
    } else if (run) {
      const k = (NEAR * 1.001 - pd) / (d - pd), q = cam.project(lerp(px, x, k), lerp(py, y, k), lerp(pz, z, k));
      if (q) run.push(q.x, q.y);
      run = null;
    }
    px = x; py = y; pz = z; pd = d;
  }
  return zmax;
}

/** the whole ring as one path (for its faint halo) */
function haloPath(ctx, cam, r) {
  const runs = [];
  arcRuns(cam, r, 0, TAU, runs);
  ctx.beginPath();
  for (const run of runs) { ctx.moveTo(run[0], run[1]); for (let i = 2; i < run.length; i += 2) ctx.lineTo(run[i], run[i + 1]); }
}

/** a hero sheet, docked: the full-resolution sheet, a chrome rim, the six positions tagged */
function drawHero(ctx, S, img, x, y, w, h, o) {
  const r = Math.max(2, 0.035 * w * Math.min(1, h / (w * ASPECT)));
  const x0 = x - w / 2, y0 = y - h / 2;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = o.a;
  if (o.glow > 0) {
    for (let i = 3; i >= 1; i--) {
      ctx.fillStyle = `rgba(245,244,240,${(0.03 * o.glow).toFixed(3)})`;
      rrect(ctx, x0 - i * 0.8 * S.u, y0 - i * 0.8 * S.u, w + i * 1.6 * S.u, h + i * 1.6 * S.u, r + i * 0.8 * S.u); ctx.fill();
    }
  }
  ctx.save(); rrect(ctx, x0, y0, w, h, r); ctx.clip();
  if (o.front) cover(ctx, img, x0, y0, w, h);
  else { ctx.translate(x, 0); ctx.scale(-1, 1); cover(ctx, img, -w / 2, y0, w, h); }
  // docking: a band of light crosses the glass
  if (o.sheen > 0 && o.sheen < 1) {
    const sx = x0 - 0.35 * w + 1.7 * w * inOutQuad(o.sheen), k = 0.16 * w;
    const g = ctx.createLinearGradient(sx - k, y0, sx + k, y0 + h * 0.35);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.34)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
  }
  ctx.restore();
  rrect(ctx, x0, y0, w, h, r);
  const fog = Math.min(0.93, o.fog + (o.front ? 0 : 0.42 * (1 - o.fog)));
  if (fog > 0.01) { ctx.fillStyle = `rgba(5,6,10,${fog.toFixed(3)})`; ctx.fill(); }
  ctx.lineWidth = lerp(Math.max(1, 0.09 * S.u), Math.max(1.5, 0.22 * S.u), o.rim);
  ctx.strokeStyle = o.rim > 0.5 ? metal(ctx, x0, y0, x0 + w, y0 + h, o.phase, Math.max(80, (w + h) / 2.6)) : HAIR;
  ctx.stroke();
  // the six positions: a dark index tag on each panel, one per sixteenth
  if (o.six && o.tags > 0 && o.tagAlpha > 0) {
    const ts = rpx(S, 1.05 * Math.min(1.25, w / (40 * S.u)));
    ctx.font = `600 ${Math.round(ts)}px ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace`;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    o.six.forEach((b, i) => {
      const k = clamp(o.tags * 6 - i);
      if (k <= 0) return;
      const e = outCubic(k);
      const bx = x0 + b[0] * w, by = y0 + b[1] * h, bw = b[2] * w, bh = b[3] * h;
      const pad = ts * 0.55, tw = ts * 1.25 + pad * 2, th = ts * 1.75;
      // the panel's frame flashes as it is tagged
      const fl = (1 - e) * 0.7;
      if (fl > 0.05) { ctx.globalAlpha = o.a * fl * o.tagAlpha; ctx.strokeStyle = '#05060a'; ctx.lineWidth = Math.max(1, 0.1 * S.u); ctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6); }
      ctx.globalAlpha = o.a * e * 0.92 * o.tagAlpha;
      ctx.fillStyle = 'rgba(8,9,12,.86)';
      rrect(ctx, bx + ts * 0.6, by + ts * 0.6, tw, th, th / 2); ctx.fill();
      ctx.fillStyle = UI.ink;
      ctx.fillText(`0${i + 1}`, bx + ts * 0.6 + pad + ts * 0.02, by + ts * 0.6 + th * 0.68);
    });
  }
  ctx.restore();
}

// ── the chapter ───────────────────────────────────────────────────────────
export default {
  id: 'characters',
  title: 'Characters',
  caption: 'Station 04, Character: the six-position character sheets orbit on the chrome thread and dock one at a time — identity holds, so the same face survives every shot.',
  assets: [...RING_A, ...RING_B].map(P),
  models: [],
  still: 3.8,
  sfx: [
    { at: DOCK1, type: 'tick', gain: 0.5 },
    { at: 3 * BEAT, type: 'tick', gain: 0.5 },
    { at: 3 * BEAT + 0.05, type: 'whoosh', gain: 0.45 },
    { at: HERO_A_AT, type: 'impact' },
    { at: HERO_A_AT, type: 'sub', gain: 0.7 },
    { at: HERO_B_AT - BEAT + 0.05, type: 'whoosh', gain: 0.4 },
    { at: HERO_B_AT, type: 'impact', gain: 0.55 },
    { at: RELEASE + 0.1, type: 'whoosh', gain: 0.35 }
  ],
  prepare(S) { [...RING_A, ...RING_B].forEach(id => bakedSheet(S, id)); },

  draw(ctx, S) {
    const t = S.lt;
    if (t <= T_IN || t >= T_OUT) { seam(ctx, S); return; }
    const { W, H, u } = S;
    const F = frame(S);
    const rg = rig(S, F, t), cam = rg.cam, O = rg.O, hs = rg.hs;
    const phase = 4 * inOutQuad(seg(t, T_IN, T_OUT));           // the chrome flows, back to 0 mod 1 at the seam
    const w0 = Math.max(1.5, 0.32 * S.u);                         // wire()'s width

    // the lens: seasoning on the two docks only
    S.fx.ab = 0.42 * hitAt(t, HERO_A_AT, 0.4) + 0.22 * hitAt(t, HERO_B_AT, 0.35);
    S.fx.flash = 0.05 * hitAt(t, HERO_A_AT, 0.14);

    // stars: the rig's drift, at rest at both ends
    space(ctx, S, { x: -0.035 * hs, y: 0.02 * O - 0.015 * hs, zoom: 1 + 0.05 * hs });

    const grad = metal(ctx, 0, 0, W, H * 0.35, phase, 26 * S.u);
    const L = list();
    const zNear = Z0 - R - rg.camZ, zFar = Z0 + R - rg.camZ;
    const depthFog = d => O * clamp((d - zNear) / (zFar - zNear)) * 0.72;
    const dimAll = 0.72 * hs;

    const rings = [ringOf(rg, t, 0), ringOf(rg, t, 1)];
    const ringAlpha = [1, clamp(rings[1].sep * 8) * (1 - 0.45 * hs)];
    const phi = [-stepsA(t) * TAU / RING_A.length, stepsB(t) * TAU / RING_B.length];

    // the halos, faint and under everything
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    rings.forEach((r, k) => {
      const a = ringAlpha[k] * (1 - 0.6 * dimAll);
      if (a <= 0.01) return;
      ctx.globalAlpha = a;
      haloPath(ctx, cam, r);
      ctx.strokeStyle = 'rgba(245,244,240,.07)'; ctx.lineWidth = w0 * 5; ctx.stroke();
    });
    ctx.restore();

    const heroState = HEROES.map(h => ({ h, p: heroPull(h, t) }));
    // ring A's docks: on beat k (from the first dock) sheet k arrives at the front; its ticks close in
    // over the last of its approach, snap tight on the beat (outBack) and let go as it leaves.
    // Behind a hero the docks go quiet: no ticks while the frame belongs to the hero.
    const lockOf = i => {
      if (hs > 0.995) return null;
      for (let k = 0; k <= 5; k++) {
        if (k % RING_A.length !== i || k === HERO_A || k === HERO_B) continue;
        const b = DOCK1 + k * BEAT;
        const a = seg(t, b - 0.2, b - 0.08) * (1 - seg(t, b + 0.16, b + 0.46)) * (1 - hs);
        if (a > 0.005) return { a, close: outBack(seg(t, b - 0.2, b + 0.145), 1.7) };
      }
      return null;
    };
    const heroDraw = [];

    rings.forEach((r, k) => {
      const ids = k === 0 ? RING_A : RING_B, N = ids.length, sw = k === 0 ? SW_A : SW_B;
      if (ringAlpha[k] <= 0.001) return;
      const present = [];
      for (let i = 0; i < N; i++) {
        const th = phi[k] + i * TAU / N;
        // fold out of the thread, staggered around the ring; fold back in at the end
        const un = k === 0
          ? outExpo(seg(t, 0.6 + 0.05 * ((i + 5) % 10), 1.1 + 0.05 * ((i + 5) % 10))) * (1 - inCubic(seg(t, 6.5 + 0.022 * i, 6.8 + 0.022 * i)))
          : outExpo(seg(t, 0.95 + 0.06 * i, 1.45 + 0.06 * i)) * (1 - inCubic(seg(t, 6.3 + 0.03 * i, 6.58 + 0.03 * i)));
        const P3 = ringPoint(r, th), d = P3[2] - cam.z;
        const hero = k === 0 ? heroState.find(s => s.h.i === i) : null;
        const f = facing(r, th, P3, cam);
        if (d <= NEAR * 3) continue;
        const q = cam.project(P3[0], P3[1], P3[2]);
        const wpx = sw * q.k, hpx = wpx * ASPECT;
        // behind a hero the near side of the orbit fogs down too, so its docks stay background
        const fog = Math.min(0.9, depthFog(d) + 0.35 * dimAll + 0.3 * hs * (1 - clamp((d - zNear) / (zFar - zNear))));
        // sheets too close to the lens (only while the camera is still inside the ring) stay out
        const a = ringAlpha[k] * clamp((d - 5) / 4) * (1 - 0.62 * dimAll);
        if (hero && hero.p > 0.001) {
          heroDraw.push({ ...hero, slot: { x: q.x, y: q.y, w: wpx, h: hpx, f, fog, un, a }, zSlot: P3[2], id: ids[i] });
          continue;
        }
        if (un > 0.04 && a > 0.01) present.push(th);
        if (un <= 0.001 || a <= 0.001) continue;
        const it = { x: q.x, y: q.y, w: wpx, h: hpx, f, fog, un, a, img: bakedSheet(S, ids[i]), lock: k === 0 ? lockOf(i) : null };
        L.custom(P3[2], () => drawSheet(ctx, S, it, grad));
      }
      // the orbit between present sheets, each stretch drawn just behind its two sheets
      present.sort((p, q) => p - q);
      const arcs = [];
      if (present.length < 2) arcs.push([0, TAU]);
      else for (let j = 0; j < present.length; j++) arcs.push([present[j], j + 1 < present.length ? present[j + 1] : present[0] + TAU]);
      const aBase = ringAlpha[k] * (1 - 0.55 * dimAll);
      for (const [a0, a1] of arcs) {
        const runs = [];
        const zmax = arcRuns(cam, r, a0, a1, runs);
        if (!runs.length) continue;
        const mid = ringPoint(r, (a0 + a1) / 2), dm = Math.max(NEAR, mid[2] - cam.z);
        const wk = lerp(1, clamp(Math.pow((Z0 - cam.z) / dm, 0.75), 0.55, 1.7), O);
        const aa = aBase * (1 - depthFog(dm) * 0.9);
        const zkey = arcs.length === 1 ? zmax : Math.max(ringPoint(r, a0)[2], ringPoint(r, a1)[2]) + 0.02;
        L.custom(Math.max(zkey, cam.z + NEAR * 2), () => drawArc(ctx, S, runs, w0 * wk * (k === 1 ? 0.85 : 1), aa, grad));
      }
    });

    // the heroes: out of the ring toward the lens, into the depth order as they come
    for (const hd of heroDraw) {
      // p runs a little past 1 just after the dock (the contact): the sheet carries on
      // toward the lens a touch, bigger, and the arc term below dips it slightly
      const p = hd.p, s = hd.slot, T = F.hero, p1 = Math.min(1, p);
      const x = lerp(s.x, T.cx, p), y = lerp(s.y, T.cy, p) - Math.sin(Math.PI * p) * 3 * u;
      const fac = lerp(s.f, 1, inOutQuad(p1));            // it turns to face the lens as it comes
      const w = lerp(s.w, T.w, p) * Math.max(0.03, Math.abs(fac)), h = lerp(s.h * s.un, T.h, p);
      const front = fac > 0;
      const leaving = seg(t, hd.h.back, hd.h.back + 0.15);
      const o = {
        a: lerp(s.a, 1, Math.min(1, p * 3)), front, fog: s.fog * (1 - p1), rim: p1, phase, glow: p1 * (1 - leaving), sheen: seg(t, hd.h.at - 0.12, hd.h.at + 0.5),
        six: SIX[hd.id], tags: t >= hd.h.at ? clamp((t - hd.h.at - 0.06) / hd.h.tags) : 0, tagAlpha: 1 - leaving
      };
      const zk = lerp(hd.zSlot, cam.z + 1.5, Math.min(1, p * 3));
      L.custom(zk, () => drawHero(ctx, S, S.img(P(hd.id)), x, y, w, h, o));
    }

    L.draw(ctx, S, cam, { maxPx: 1e6 });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    drawCopy(ctx, S, F, t, phase);
  }
};

// ── the words ─────────────────────────────────────────────────────────────
const IDX = 'STAGE 04 OF 06', NAME = 'CHARACTER';
/* the reel's stage index: monospace set glyph by glyph on a fixed advance, tracked wide
   (as /process sets "STAGE 04 OF 06"), typed on with a block caret while it moves */
const TRACK = 0.28;
function spacedAdv(ctx, size) {
  ctx.save(); ctx.font = `600 ${Math.round(size)}px ${MONO}`;
  const a = ctx.measureText('M').width + TRACK * size;
  ctx.restore();
  return a;
}
function spacedW(ctx, str, size) { return spacedAdv(ctx, size) * str.length - TRACK * size; }
function spaced(ctx, str, x, y, size, o = {}) {
  const r = clamp(o.reveal ?? 1), n = Math.floor(r * str.length + 1e-6);
  if (r <= 0) return;
  const adv = spacedAdv(ctx, size);
  ctx.save();
  ctx.font = `600 ${Math.round(size)}px ${MONO}`;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillStyle = o.color || UI.muted;
  let cx = x;
  for (let i = 0; i < n; i++) { if (str[i] !== ' ') ctx.fillText(str[i], cx, y); cx += adv; }
  if (r < 1) { ctx.fillStyle = UI.ink; ctx.fillRect(cx, y - size * 0.8, size * 0.55, size * 0.95); }
  ctx.restore();
}

function drawCopy(ctx, S, F, t, phase) {
  const { u } = S;
  const sink = seg(t, RELEASE + 0.15, 6.62);               // the sentence sinks behind its sill once the title has split,
                                                           // gone before the returning orbit sweeps the text column
  const TT = { size: F.ts, weight: 800, tracking: -0.01 };
  const titleW = layout(ctx, 'IDENTITY', TT).width;
  // the station lockup, typed on as the orbit opens (the /process card's top row): the index
  // in the reel's spaced mono, the stage's name under it in ink, the outlined numeral beside
  // them. The name stays a mono label so IDENTITY HOLDS. is the only headline. Out, the name
  // un-types first, then the index.
  const idxR = seg(t, 0.62, 1.02) * (1 - seg(t, 6.52, 6.84));
  const nameR = seg(t, 0.9, 1.22) * (1 - seg(t, 6.4, 6.64));
  spaced(ctx, IDX, F.x, F.stageY, F.labSize, { reveal: idxR, color: UI.muted });
  spaced(ctx, NAME, F.x, F.nameY, F.labSize, { reveal: nameR, color: UI.ink });
  const na = seg(t, 0.8, 1.6, outCubic) * (1 - seg(t, 6.45, 6.9));
  if (na > 0) {
    // landscape: right of the index block (never over it), flush with the title's right edge
    // when there is room; portrait: beside the title, at the frame's right margin
    let nx = 0.93 * S.W, ny = F.t2;
    if (F.land) {
      ctx.save(); ctx.font = `900 ${Math.round(F.numSize)}px 'Archivo', sans-serif`;
      const nw = ctx.measureText('04').width;
      ctx.restore();
      nx = F.x + Math.max(titleW, spacedW(ctx, IDX, F.labSize) + Math.max(2.4 * u, 1.6 * F.labSize) + nw); ny = F.nameY;
    }
    numeral(ctx, S, '04', nx, ny + (1 - na) * 0.8 * u, F.numSize, { align: 'right', metal: true, phase: phase * 0.5, alpha: na });
  }
  // IDENTITY HOLDS. — the hit on bar 2: its cold and warm echoes lock into one on the beat
  if (t > HERO_A_AT - 0.34) {
    // in: two outlined echoes slide together and lock into the solid word on the beat
    // out: on the release beat it lets go — the echoes split off again and fade
    const lock = seg(t, HERO_A_AT - 0.34, HERO_A_AT), unlock = seg(t, RELEASE, RELEASE + 0.42);
    const spread = ((1 - inCubic(lock)) * 3.2 + outCubic(unlock) * 4.2) * u;
    const ghost = Math.max(
      seg(t, HERO_A_AT - 0.34, HERO_A_AT - 0.2) * (1 - seg(t, HERO_A_AT - 0.01, HERO_A_AT + 0.08)),
      Math.sin(Math.PI * Math.min(1, unlock * 1.4)) * (1 - unlock));
    const solid = seg(t, HERO_A_AT - 0.03, HERO_A_AT) * (1 - seg(t, RELEASE, RELEASE + 0.16));
    const g = ctx.createLinearGradient(0, F.t1 - F.ts * 0.8, 0, F.t2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#bdbbb4');
    const sw = Math.max(1, F.ts * 0.018);
    for (const [s, y] of [['IDENTITY', F.t1], ['HOLDS.', F.t2]]) {
      if (ghost > 0.005) {
        text(ctx, S, s, F.x - spread, y, { ...TT, color: UI.ion, alpha: 0.75 * ghost, stroke: true, strokeWidth: sw });
        text(ctx, S, s, F.x + spread, y, { ...TT, color: UI.ember, alpha: 0.75 * ghost, stroke: true, strokeWidth: sw });
      }
      if (solid > 0) text(ctx, S, s, F.x, y, { ...TT, color: g, alpha: solid });
    }
    const ca = seg(t, HERO_A_AT + 0.2, HERO_A_AT + 0.45, outCubic) * (1 - seg(t, 6.35, 6.6));
    if (ca > 0) chip(ctx, S, 'Higgsfield', F.x, F.chipY + (1 - ca) * 0.8 * u, { size: F.chipSize, alpha: ca });
  }
  // the readout: typed, and un-typed on the way out
  const tel = seg(t, HERO_A_AT + 0.4, HERO_A_AT + 0.95) * (1 - seg(t, 6.2, 6.45));
  if (tel > 0) {
    const cursor = tel < 1 || (t < HERO_A_AT + 2.2 && Math.floor((t - HERO_A_AT) * 3.2) % 2 === 1);
    mono(ctx, S, 'SIX POSITIONS · TWICE · EVERY SHOT', F.x, F.tel1, { size: F.ms, color: UI.ink, alpha: 0.86, reveal: tel, cursor });
  }
  // a chrome rule between the title block and the readout, drawn left to right
  const ru = seg(t, HERO_A_AT + 0.3, HERO_A_AT + 0.8, outCubic) * (1 - seg(t, 6.2, 6.5));
  if (ru > 0) {
    const ry = F.tel1 - F.ms * 1.9, rw = titleW * ru;
    ctx.save(); ctx.globalAlpha = 0.7;
    ctx.fillStyle = metal(ctx, F.x, ry, F.x + titleW, ry, phase, titleW / 1.3);
    ctx.fillRect(F.x, ry, rw, Math.max(1, 0.1 * u));
    ctx.restore();
  }
  // the mission clock (running telemetry, in the faint ink: quiet by colour, not by size)
  const ck = seg(t, 0.9, 1.4) * (1 - seg(t, 6.5, 6.85));
  if (ck > 0) {
    ctx.save(); ctx.font = `400 ${Math.round(F.clockSize)}px ${MONO}`;
    const str = stamp(S.t), cw = ctx.measureText(str).width;
    ctx.restore();
    mono(ctx, S, str, F.land ? F.x : 0.93 * S.W - cw, F.clockY, { size: F.clockSize, color: UI.faint, alpha: ck });
  }
  // which world the docked sheet is from
  for (const h of HEROES) {
    const a = seg(t, h.at + 0.25, h.at + 0.55) * (1 - seg(t, h.back - 0.05, h.back + 0.2));
    if (a > 0) mono(ctx, S, '› ' + h.tag, F.x, F.tel2, { size: F.ms, color: UI.muted, reveal: a });
  }
  // the /process sentence, rising with the Earth sheet's approach so it is settled by ~5.1 s
  // and holds, fully readable, to ~6.45 s
  const sa = seg(t, HERO_B_AT - 0.3, HERO_B_AT + 0.15);
  if (sa > 0) {
    const ss = F.sentSize;
    const o = { size: ss, weight: 500, tracking: -0.005, color: UI.ink, mask: true, window: 0.5 };
    const r1 = Math.min(sa, 1 - seg(sink, 0.2, 0.9)), r2 = Math.min(seg(t, HERO_B_AT - 0.22, HERO_B_AT + 0.25), 1 - seg(sink, 0.3, 1));
    if (r1 > 0) text(ctx, S, 'the same face', F.x, F.sentY, { ...o, reveal: r1 });
    if (r2 > 0) text(ctx, S, 'survives every shot.', F.x, F.sentY + ss * 1.22, { ...o, reveal: r2 });
  }
}
