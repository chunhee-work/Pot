/* 6 — Environments. Station 05 on the flight path: ENVIRONMENT, made in
   Higgsfield — "locations built as set plates, so a place looks like the
   same place every time we return to it".

   Planet Aurea (the stage's own plate, env-aurea 25) rises huge from below
   the thread while the camera drifts past it; the thread stays put in front
   of it — it is our line — and a thin chrome orbit draws itself over the
   planet's face with a bead running at its head. A reticle locks onto the
   lit hemisphere and the HUD tags it AUREA.
   On the third beat the stars stretch into trails, the planet sinks to a
   glowing horizon and the plates come out of the thread's vanishing point:
   glass-and-metal viewport windows strung on the same line, near ones in
   front of it, far ones behind, trucking past one hero at a time. The
   stream brakes onto the plaza on bar 3's downbeat and holds, and the same
   place comes back twice more behind the glass — dusk, day, snow — each
   return wiped in by a chrome scan bar. Then the camera pulls straight back
   down the line: the windows fall into the vanishing point, the planet sets
   below the frame, and the thread lies still.

   The thread is always at eye level (camera y = 0), so it projects onto the
   frame's middle at every depth — the world slides along it and it never
   moves, which is what lets the chapter leave and rejoin the seam cleanly.

   Time map (local s; a beat is 0.625, bars at 0 / 2.5 / 5)
     0.00–0.10  the seam
     0.10–2.10  AUREA rises from below the thread (crest over the line ~0.7);
                the camera drifts right — planet slides left, stars parallax
     0.32–0.92  the station lockup: 05, STAGE 05 OF 06 types, Environment
                rises out of its sill (settled ~0.79), HIGGSFIELD chip 0.62–0.9
     0.50–1.75  the orbit draws itself across the planet's face, bead leading
     1.25       beat 2: the reticle locks on; the leader and rule draw
                (1.25–1.49), AUREA types 1.30–1.53, the coordinates roll and
                lock by ~1.65
     1.875      beat 3: title and chip retract; the orbit fades — the tag is
                the one headline left
     1.90–2.62  the jump: star trails, the planet drops to a horizon whose
                night side dissolves into the dark above the frame's edge;
                the tag clears in order — the leader draws back into the
                reticle 1.95–2.08, the text untypes 2.0–2.18, the reticle lets
                go 2.04–2.2 — before the windows show (~2.15) coming out of
                the vanishing point along the thread
     2.50       bar 2: arrival on AUREA 06 (a shock ring that rolls across
                the stars, a touch of aberration); the camera carries ~2.5 %
                past the hero and settles by 2.95; the viewfinder shuts on it
                with a 1.6 % snap
     2.55–4.72  LOCATIONS BUILT AS SET PLATES (readable ~2.9–4.7)
     2.50–5.00  the truck, a window a beat: AUREA 12 (3.125), OG10 03 (3.75),
                AUREA 22 (4.375), the finder snapping shut on each; the label
                flips on each half-beat
     5.00       bar 3: brakes onto the plaza, AUREA 15 (dusk) — runs 2.5 % of a
                spacing past it (5.1) and settles back by ~5.33; slow push in
     4.98–6.92  THE SAME PLACE, EVERY TIME (readable ~5.25–6.66)
     5.625      beat: scan wipe to AUREA 18 (day)
     6.25       beat: scan wipe to AUREA 20 (snow)
     6.62–7.02  the HUD leaves; the eyebrow untypes
     6.78       the gather: a short push in (0.3 units) that peaks on the beat
     6.875      beat: pull back from that apex — the windows fall into the
                vanishing point, the planet sets (6.72–7.32), the stars settle;
                nothing moves after 7.32
     7.40–7.50  the seam */
import { clamp, lerp, seg, smoothstep, outExpo, outCubic, inCubic, inOutCubic, inOutQuad, bezier, rrect, text, layout, rng, TAU, cover } from '../../kit.js';
import { camera } from '../../space.js';
import { seam, space, wireAcross, metal, glass, chip, numeral, mono, stamp, UI, MONO } from '../kit3.js';
import { BEAT } from '../palette.js';

// ── the plates (numbered as on /process: env-aurea 1–29, env-og10 1–8) ────
const DIR = 'assets/process/';
const PLANET = DIR + 'img-86e21caec4.webp';                       // env-aurea 25
const HEROES = [
  { src: DIR + 'img-79e906f563.webp', set: 'AUREA', n: 6, of: 29, fx: 0.5, fy: 0.6 },
  { src: DIR + 'img-b139e0b5bf.webp', set: 'AUREA', n: 12, of: 29, fx: 0.42, fy: 0.5 },
  { src: DIR + 'img-c8153d6292.webp', set: 'OG10', n: 3, of: 8, fx: 0.5, fy: 0.45 },
  { src: DIR + 'img-9c233bfc2d.webp', set: 'AUREA', n: 22, of: 29, fx: 0.38, fy: 0.5 }
];
// the same place, three returns: the plaza with the paw seal — dusk, day, snow
const SAME = [
  { src: DIR + 'img-24d535d893.webp', n: 15, fx: 0.5, fy: 0.62 },
  { src: DIR + 'img-8f542747ea.webp', n: 18, fx: 0.5, fy: 0.62 },
  { src: DIR + 'img-81cd216913.webp', n: 20, fx: 0.5, fy: 0.62 }
];
const FAR = [DIR + 'img-bd4381467e.webp', DIR + 'img-2baad14b96.webp', DIR + 'img-98ab2beeec.webp'];

// ── time ──────────────────────────────────────────────────────────────────
const T_IN = 0.1, T_OUT = 7.4;                  // the seam holds outside these
const LOCK = 2 * BEAT, RETRACT = 3 * BEAT;      // 1.25, 1.875
const JUMP0 = 1.95, ARRIVE = 4 * BEAT;          // the jump; bar 2's downbeat
const LAND = 8 * BEAT;                          // bar 3: the plaza
const WIPES = [9 * BEAT, 10 * BEAT];            // 5.625, 6.25
const AWAY = 11 * BEAT, GONE = 7.32;            // 6.875 → the windows are gone
const GATHER = 0.3;                             // the push in (world units) that anticipates the pull back

const E_RISE = bezier(0.3, 0, 0.12, 1);         // eases off the seam, long settle
const E_JUMP = bezier(0.5, 0, 0.14, 1);         // gathers, then brakes hard
const inOutSine = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
const bump = (t, a, b, c) => (t <= a || t >= c ? 0 : t < b ? inOutSine((t - a) / (b - a)) : inOutSine((c - t) / (c - b)));

// ── the fixed starfield, as kit3 lays it out — so the trails can grow out of the very same stars
const STARS = [];
for (let i = 0; i < 700; i++) STARS.push({ x: rng(i, 1) * 2 - 1, y: rng(i, 2) * 2 - 1, z: 0.15 + 0.85 * rng(i, 3), b: 0.35 + 0.65 * rng(i, 4) ** 2 });

/** motion trails on space()'s stars: `amt` 0..1 (length as a fraction of the way to the vanishing point), `dir` +1 flying in, −1 backing out */
function trails(ctx, S, o, amt, dir) {
  if (amt <= 0.002) return;
  const { W, H } = S, R = Math.max(W, H) * 0.62, zoom = o.zoom ?? 1, ox = (o.x ?? 0) * W, oy = (o.y ?? 0) * H;
  const cx = W / 2, cy = H / 2, px = Math.max(1, 0.16 * S.u);
  ctx.save();
  ctx.lineCap = 'round';
  // four brightness buckets × two widths — eight strokes, not seven hundred
  for (let bucket = 0; bucket < 4; bucket++) {
    for (let wz = 0; wz < 2; wz++) {
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < STARS.length; i++) {
        const s = STARS[i];
        if (s.b < 0.5) continue;                       // only the brighter stars streak — a hint, not a screensaver
        if (Math.min(3, Math.floor((s.b - 0.5) / 0.125)) !== bucket || (s.z > 0.58 ? 1 : 0) !== wz) continue;
        const k = lerp(1, zoom, s.z);
        const x = cx + (s.x * R + ox * s.z) * k, y = cy + (s.y * R + oy * s.z) * k;
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        const len = amt * (0.25 + 0.75 * s.z) * dir;
        ctx.moveTo(x, y); ctx.lineTo(x - (x - cx) * len, y - (y - cy) * len);
        any = true;
      }
      if (!any) continue;
      ctx.strokeStyle = `rgba(232,236,255,${(0.4 + bucket * 0.15) * 0.7})`;
      ctx.lineWidth = px * (wz ? 1.0 : 0.7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── the planet: the plate's own disc, cut out once ─────────────────────────
let SPR = null;
function planetSprite(S) {
  const img = S.img(PLANET);
  if (!img || !img.width) return null;
  if (SPR && SPR.img === img) return SPR;
  // measured on the 1000×565 plate: the limb is a circle at (700.8, 300.2), r 271.7
  const k = img.width / 1000, pcx = 700.8 * k, pcy = 300.2 * k, pr = 270.5 * k;
  const pad = Math.ceil(pr * 0.09), size = Math.ceil(2 * (pr + pad)), m = size / 2;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  // a thin atmosphere past the limb, cold on the night side
  const halo = g.createRadialGradient(m, m, pr * 0.97, m, m, pr + pad);
  halo.addColorStop(0, 'rgba(174,203,255,0.30)'); halo.addColorStop(0.3, 'rgba(174,203,255,0.12)'); halo.addColorStop(1, 'rgba(174,203,255,0)');
  g.fillStyle = halo; g.fillRect(0, 0, size, size);
  g.save();
  g.beginPath(); g.arc(m, m, pr, 0, TAU); g.clip();
  g.fillStyle = '#0b1017'; g.fillRect(0, 0, size, size);        // the plate stops 7px short of the bottom limb
  // the source square around the disc, clipped to the plate
  const sx0 = pcx - m, sy0 = pcy - m, ix0 = Math.max(0, sx0), iy0 = Math.max(0, sy0);
  const ix1 = Math.min(img.width, sx0 + size), iy1 = Math.min(img.height, sy0 + size);
  g.drawImage(img, ix0, iy0, ix1 - ix0, iy1 - iy0, ix0 - sx0, iy0 - sy0, ix1 - ix0, iy1 - iy0);
  // a whisper of rim light, so the limb reads as a sphere at any size
  const rim = g.createRadialGradient(m, m, pr * 0.9, m, m, pr);
  rim.addColorStop(0, 'rgba(174,203,255,0)'); rim.addColorStop(1, 'rgba(174,203,255,0.22)');
  g.fillStyle = rim; g.fillRect(0, 0, size, size);
  g.restore();
  SPR = { img, c, r: pr, size };
  return SPR;
}

// ── geometry for a frame size ─────────────────────────────────────────────
let GEO = null;
function geo(S) {
  if (GEO && GEO.W === S.W && GEO.H === S.H) return GEO;
  const { W, H, u } = S, port = H > W;
  const G = { W, H, port };
  // the planet: radius, and where its crest sits as it rises, holds, sinks and sets
  if (port) {
    G.R = Math.min(0.86 * W, 0.44 * H);
    G.crestHold = 0.4 * H; G.crestLow = 0.85 * H; G.cx0 = 0.68 * W; G.cx1 = 0.5 * W;
  } else {
    G.R = 0.8 * H;
    G.crestHold = 0.27 * H; G.crestLow = 0.87 * H; G.cx0 = 0.72 * W; G.cx1 = 0.58 * W;
  }
  G.crestOff = H + G.R * 0.14 + 4;                 // clear of the frame, halo and all
  // the windows: world units scaled so the hero plane (z = ZH) is a known size on screen
  G.zoom = 1.1; G.F = G.zoom * Math.min(W, H);
  G.ZH = 7; G.ZT = 10.5;                            // hero plane; the thread's depth
  G.aspect = port ? 1.22 : 1.6;
  let hw = port ? Math.min(0.8 * W, 0.42 * H * G.aspect) : Math.min(0.47 * H * G.aspect, 0.5 * W);
  G.hw = hw; G.hh = hw / G.aspect;
  const toWorld = G.ZH / G.F;
  G.ww = hw * toWorld; G.wh = G.hh * toWorld;
  G.DX = (port ? 0.92 * W : 0.62 * W) * toWorld;   // one hero at a time: the next waits just off the edge
  // the far windows: two layers strung on the same line, behind the thread
  G.far = [];
  const layers = [{ z: 16, gap: 0.64 }, { z: 25, gap: 0.5 }];
  layers.forEach((L, li) => {
    const span = (W / 2) * L.z / G.F, x0 = -span - G.ww, x1 = 4 * G.DX + span + G.ww;
    const step = G.DX * (L.z / G.ZH) * L.gap;
    for (let x = x0 + step * (li ? 0.35 : 0.72), j = 0; x < x1; x += step, j++) {
      const r = rng(j + 1, li + 3);
      const spread = (rng(j + 1, li + 7) - 0.5) * G.wh * (port ? 0.5 : 0.7);
      G.far.push({ x: x + (r - 0.5) * step * 0.25, y: spread, z: L.z + (r - 0.5) * 2,
        // the near layer carries its own three plates; the deep one is too far to read, so it borrows
        src: li ? HEROES[(j * 3 + 1) % 4].src : FAR[j % 3], fx: 0.5, fy: 0.5 });
    }
  });
  // type
  G.x0 = (port ? 0.075 : 0.06) * W;
  G.num = (port ? 17 : 14.5) * u;
  G.eb = (port ? 2.5 : 1.55) * u;                   // eyebrow
  G.title = (port ? 6.4 : 5.4) * u;
  G.copy = (port ? 5.6 : 4.3) * u;
  G.copyLines = port
    ? [['LOCATIONS BUILT', 'AS SET PLATES'], ['THE SAME PLACE,', 'EVERY TIME']]
    : [['LOCATIONS BUILT AS SET PLATES'], ['THE SAME PLACE, EVERY TIME']];
  G.top = (port ? 0.085 : 0.1) * H;
  G.chip = (port ? 1.9 : 1.35) * u;
  G.mono = (port ? 2.35 : 1.4) * u;
  G.tag = (port ? 3.6 : 2.6) * u;
  GEO = G;
  return G;
}

// ── pieces ────────────────────────────────────────────────────────────────
/** a line of type that rises out of its own sill and leaves up through its lid */
function sill(ctx, S, str, x, y, o, pin, pout) {
  if (pin <= 0 || pout >= 1) return;
  const L = layout(ctx, str, o);
  const top = y - L.ascent * 1.2, h = (L.ascent + L.descent) * 1.35;
  ctx.save();
  ctx.beginPath(); ctx.rect(x - o.size, top, L.width + o.size * 2, h); ctx.clip();
  text(ctx, S, str, x, y - pout * h, { ...o, reveal: pin, rise: h, window: 0.45, ease: outExpo, glyph: () => ({ alpha: 1 }) });
  ctx.restore();
}

/** monospace, tracked like /process's stage index */
function tracked(ctx, S, str, x, y, size, o = {}) {
  ctx.save();
  ctx.letterSpacing = `${(size * (o.track ?? 0.22)).toFixed(2)}px`;
  if (o.align === 'right') {
    ctx.font = `${o.weight || 600} ${Math.round(size)}px ${MONO}`;
    x -= ctx.measureText(str).width;
  }
  if (o.keyline && (o.alpha ?? 1) > 0) {
    // a dark keyline under the ink (as the reticle has), so it holds over bright cloud
    const shown = o.reveal === undefined ? str : str.slice(0, Math.floor(clamp(o.reveal) * str.length));
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.font = `${o.weight || 600} ${Math.round(size)}px ${MONO}`;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(5,6,10,.5)'; ctx.lineWidth = o.keyline;
    ctx.strokeText(shown, x, y);
    ctx.restore();
  }
  mono(ctx, S, str, x, y, { size, weight: o.weight || 600, color: o.color || UI.muted, alpha: o.alpha, reveal: o.reveal, cursor: o.cursor });
  ctx.restore();
}

/**
 * A viewport window: a liquid-metal rim, the plate behind glass, the glass's
 * own sheen sliding as the window moves. (x, y) centre, (w, h) the glass.
 *   o.plates [{img, fx, fy}], o.wipe (a b→c scan: {from, to, p}), o.fog 0..1, o.alpha, o.phase
 */
function pane(ctx, S, x, y, w, h, o) {
  if (w < 2) return;
  const r = h * 0.17, t = Math.max(1.5, h * 0.024), x0 = x - w / 2, y0 = y - h / 2;
  // small and far: the same window, drawn plainly (the dark has most of it anyway)
  const lod = w < S.W * 0.16 && !o.wipe;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  // the rim — the nav pill's metal, bright on top and dark underneath
  rrect(ctx, x0 - t, y0 - t, w + 2 * t, h + 2 * t, r + t);
  if (lod) {
    ctx.fillStyle = '#8f8d86'; ctx.fill();
    ctx.save(); rrect(ctx, x0, y0, w, h, r); ctx.clip();
    const A = o.plates[0];
    if (A && A.img) cover(ctx, A.img, x0, y0, w, h, { fx: A.fx, fy: A.fy, zoom: o.zoom ?? 1.04 });
    ctx.restore();
    if (o.fog > 0.003) {
      ctx.globalAlpha = (o.alpha ?? 1) * clamp(o.fog);
      ctx.fillStyle = UI.space;
      rrect(ctx, x0 - t - 1, y0 - t - 1, w + 2 * t + 2, h + 2 * t + 2, r + t + 1); ctx.fill();
    }
    ctx.restore();
    return;
  }
  ctx.fillStyle = metal(ctx, x0 - t, y0 - t, x0 + w + t, y0 + h * 0.6, o.phase || 0, Math.max(40, (w + h) * 0.45));
  ctx.fill();
  const sh = ctx.createLinearGradient(0, y0 - t, 0, y0 + h + t);
  sh.addColorStop(0, 'rgba(255,255,255,.12)'); sh.addColorStop(0.4, 'rgba(0,0,0,.12)'); sh.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = sh; ctx.fill();
  // the plate behind the glass
  ctx.save();
  rrect(ctx, x0, y0, w, h, r); ctx.clip();
  const A = o.plates[0];
  const zoom = o.zoom ?? 1.04;
  if (A && A.img) cover(ctx, A.img, x0, y0, w, h, { fx: A.fx, fy: A.fy, zoom });
  else { ctx.fillStyle = UI.panel; ctx.fillRect(x0, y0, w, h); }
  if (o.wipe && o.wipe.p > 0) {
    // the next return, revealed left to right behind a chrome scan bar
    const B = o.wipe.to, wx = x0 + w * o.wipe.p;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, wx - x0, h); ctx.clip();
    if (B && B.img) cover(ctx, B.img, x0, y0, w, h, { fx: B.fx, fy: B.fy, zoom });
    ctx.restore();
    if (o.wipe.p < 1) {
      const bw = Math.max(2, w * 0.006);
      const glow = ctx.createLinearGradient(wx - w * 0.08, 0, wx + w * 0.02, 0);
      glow.addColorStop(0, 'rgba(245,244,240,0)'); glow.addColorStop(0.8, 'rgba(245,244,240,.16)'); glow.addColorStop(1, 'rgba(245,244,240,0)');
      ctx.fillStyle = glow; ctx.fillRect(wx - w * 0.08, y0, w * 0.1, h);
      ctx.fillStyle = metal(ctx, wx, y0, wx + bw * 0.2, y0 + h, o.phase || 0, h * 0.7);
      ctx.fillRect(wx - bw / 2, y0, bw, h);
    }
  }
  // the inside of a porthole is darker at its edges
  const vg = ctx.createRadialGradient(x, y, h * 0.35, x, y, Math.hypot(w, h) * 0.58);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = vg; ctx.fillRect(x0, y0, w, h);
  // a reflection that slides across the glass as the window travels
  const s = clamp(0.5 + (x - S.W / 2) / S.W * 0.9, -0.3, 1.3);
  const gl = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h * 1.4);
  const a0 = clamp(s - 0.14, 0, 1), a1 = clamp(s, 0, 1), a2 = clamp(s + 0.05, 0, 1);
  if (a2 > a0) {
    gl.addColorStop(0, 'rgba(255,255,255,0)');
    gl.addColorStop(a0, 'rgba(255,255,255,0)'); gl.addColorStop(a1, 'rgba(255,255,255,.10)'); gl.addColorStop(a2, 'rgba(255,255,255,0)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(x0, y0, w, h);
  }
  ctx.restore();
  glass(ctx, S, x0, y0, w, h, { r });
  // the gasket between glass and rim
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = Math.max(1, t * 0.35);
  rrect(ctx, x0, y0, w, h, r); ctx.stroke();
  // distance: the far ones sink into the dark (opaque — they hide what is behind them)
  if (o.fog > 0.003) {
    ctx.globalAlpha = (o.alpha ?? 1) * clamp(o.fog);
    ctx.fillStyle = UI.space;
    rrect(ctx, x0 - t - 1, y0 - t - 1, w + 2 * t + 2, h + 2 * t + 2, r + t + 1); ctx.fill();
  }
  ctx.restore();
}

/** a length along a half ellipse, for the orbit's bead */
function arcPoint(cx, cy, a, b, rot, f) {
  const N = 48, cr = Math.cos(rot), sr = Math.sin(rot);
  const pts = [];
  let L = 0, prev = null;
  for (let i = 0; i <= N; i++) {
    const th = Math.PI + Math.PI * i / N, ex = a * Math.cos(th), ey = b * Math.sin(th);
    const p = [cx + ex * cr - ey * sr, cy + ex * sr + ey * cr];
    if (prev) L += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    pts.push([p[0], p[1], L]); prev = p;
  }
  const want = L * clamp(f);
  for (let i = 1; i <= N; i++) {
    if (pts[i][2] >= want) {
      const q = pts[i - 1], p = pts[i], k = (want - q[2]) / Math.max(1e-6, p[2] - q[2]);
      return { x: lerp(q[0], p[0], k), y: lerp(q[1], p[1], k), L };
    }
  }
  return { x: pts[N][0], y: pts[N][1], L };
}

/** corner brackets closing on a point */
function reticle(ctx, S, x, y, s, a) {
  if (a <= 0) return;
  const l = s * 0.42;
  ctx.save();
  ctx.globalAlpha *= a;
  const lw = Math.max(1, 0.16 * S.u);
  ctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ctx.moveTo(x + sx * s, y + sy * (s - l)); ctx.lineTo(x + sx * s, y + sy * s); ctx.lineTo(x + sx * (s - l), y + sy * s);
  }
  // a dark keyline under the ink, so it holds on bright cloud
  ctx.lineCap = 'square';
  ctx.strokeStyle = 'rgba(5,6,10,.45)'; ctx.lineWidth = lw * 3; ctx.stroke();
  ctx.strokeStyle = UI.ink; ctx.lineWidth = lw; ctx.stroke();
  const d = Math.max(1.5, 0.32 * S.u);
  ctx.fillStyle = 'rgba(5,6,10,.45)'; ctx.fillRect(x - d, y - d, 2 * d, 2 * d);
  ctx.fillStyle = UI.ink; ctx.fillRect(x - d / 2, y - d / 2, d, d);
  ctx.restore();
}

/** digits that roll before they lock (deterministic — keyed to time buckets) */
function rolling(str, p, seed) {
  if (p >= 1) return str;
  const bucket = Math.floor(p * 24);
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const locked = p > 0.35 + 0.6 * (i / str.length);
    out += /[0-9]/.test(c) && !locked ? String(Math.floor(rng(bucket * 31 + i, seed) * 10)) : c;
  }
  return out;
}

// ── the chapter ───────────────────────────────────────────────────────────
export default {
  id: 'worlds',
  title: 'Environments',
  caption: 'Planet Aurea rises under the flight path, then the set plates built for it slide past as ship windows — the same place, every time.',
  assets: [PLANET, ...HEROES.map(h => h.src), ...SAME.map(s => s.src), ...FAR],
  models: [],
  still: 3.75,
  sfx: [
    { at: 0.12, type: 'sub', gain: 0.8 },
    { at: LOCK, type: 'tick', gain: 0.7 },
    { at: JUMP0, type: 'whoosh' },
    { at: ARRIVE, type: 'impact', gain: 0.8 },
    { at: 5 * BEAT, type: 'tick', gain: 0.35 },
    { at: 6 * BEAT, type: 'tick', gain: 0.35 },
    { at: 7 * BEAT, type: 'tick', gain: 0.35 },
    { at: LAND, type: 'sub', gain: 0.7 },
    { at: WIPES[0], type: 'glitch', gain: 0.35 },
    { at: WIPES[1], type: 'glitch', gain: 0.35 },
    { at: AWAY, type: 'whoosh', gain: 0.8 }
  ],
  prepare(S) { planetSprite(S); geo(S); },

  draw(ctx, S) {
    const t = S.lt;
    if (t < T_IN || t > T_OUT) { seam(ctx, S); return; }
    const G = geo(S), { W, H, u } = S, port = G.port;

    // ── the camera, as the things it moves ─────────────────────────────────
    const rise = E_RISE(seg(t, T_IN, 2.1));                   // AUREA comes up
    const sink = inOutCubic(seg(t, 1.9, 2.5));              // …and drops to a horizon on the jump
    const set = inCubic(seg(t, 6.72, GONE));                  // …and sets at the end
    const approach = E_JUMP(seg(t, JUMP0, 2.62));             // flying down the line to the windows
    const away = inCubic(seg(t, AWAY, GONE));                 // and backing out of them
    const drift = inOutQuad(seg(t, T_IN, 7.3));
    const sky = {
      x: -0.028 * Math.sin(Math.PI * drift),
      y: -0.022 * (rise - sink) + 0.012 * bump(t, 6.6, 7.0, 7.34),
      zoom: 1 + 0.09 * approach - 0.09 * inOutCubic(seg(t, AWAY, GONE))   // the stars settle; the windows needn't
        + 0.012 * bump(t, 6.78, AWAY, AWAY + 0.2)                        // (and lean in with the gather)
    };
    space(ctx, S, sky);
    trails(ctx, S, sky, 0.3 * bump(t, JUMP0, 2.24, 2.56), 1);
    trails(ctx, S, sky, 0.16 * bump(t, AWAY, 7.05, GONE), -1);

    // ── Aurea ──────────────────────────────────────────────────────────────
    const R = G.R * (1 + 0.04 * rise);
    const crest = G.crestOff + (G.crestHold - G.crestOff) * rise + (G.crestLow - G.crestHold) * sink + (G.crestOff + R * 0.05 - G.crestLow) * set;
    const pdrift = 0.72 * outCubic(seg(t, T_IN, 2.9)) + 0.28 * seg(t, 2.9, 7.3);
    const pcx = lerp(G.cx0, G.cx1, pdrift), pcy = crest + R;
    const spr = planetSprite(S);
    if (spr && crest - R * 0.1 < H) {
      const k = R / spr.r, size = spr.size * k;
      ctx.drawImage(spr.c, pcx - size / 2, pcy - size / 2, size, size);
      // far and low: a horizon, not a subject — the face dims, the lit limb stays
      const dim = 0.3 * sink;
      if (dim > 0.004) {
        const g = ctx.createRadialGradient(pcx, pcy, R * 0.9, pcx, pcy, R * 1.004);
        g.addColorStop(0, `rgba(5,6,10,${dim.toFixed(3)})`); g.addColorStop(0.8, `rgba(5,6,10,${(dim * 0.8).toFixed(3)})`); g.addColorStop(1, 'rgba(5,6,10,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(pcx, pcy, R * 1.004, 0, TAU); ctx.fill();
      }
      // …and below its crest the night side dissolves into the dark before it reaches the frame's edge
      // (inside the disc only: the stars around it stay, and the bottom rows go back to the seam's space)
      if (sink > 0.004 && pcy - R < H) {
        ctx.save();
        ctx.beginPath(); ctx.arc(pcx, pcy, R * 1.006, 0, TAU); ctx.clip();
        ctx.globalAlpha = sink;
        const y0 = 0.9 * H, f = ctx.createLinearGradient(0, y0, 0, H);
        f.addColorStop(0, 'rgba(5,6,10,0)'); f.addColorStop(0.25, 'rgba(5,6,10,.3)'); f.addColorStop(0.5, 'rgba(5,6,10,.62)');
        f.addColorStop(0.75, 'rgba(5,6,10,.88)'); f.addColorStop(1, UI.space);
        ctx.fillStyle = f; ctx.fillRect(pcx - R * 1.01, y0, R * 2.02, H - y0 + 1);
        ctx.restore();
      }
    }

    // the orbit: a thin chrome ellipse over the planet's face, drawn on with a bead at its head
    const orbitIn = inOutCubic(seg(t, 0.5, 1.75)), orbitOut = seg(t, RETRACT, 2.3, inOutCubic);
    if (orbitIn > 0 && orbitOut < 1) {
      const a = R * (port ? 1.3 : 1.25), b = R * 0.62, rot = port ? -0.3 : -0.22;
      const pt = arcPoint(pcx, pcy, a, b, rot, orbitIn);
      const tw = Math.max(1, 0.2 * u);
      // a hairline of the thread's own metal: halo, then chrome — no dark core, it lies on the planet's face
      ctx.save();
      ctx.globalAlpha *= 1 - orbitOut;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(pcx, pcy, a, b, rot, Math.PI, TAU);
      ctx.setLineDash([pt.L * orbitIn, pt.L * 2]);
      ctx.strokeStyle = 'rgba(8,10,16,.28)'; ctx.lineWidth = tw * 3.2; ctx.stroke();
      ctx.strokeStyle = metal(ctx, 0, 0, W, H * 0.35, 0.35 * t, 18 * u); ctx.lineWidth = tw; ctx.stroke();
      ctx.restore();
      if (orbitIn < 1 || orbitOut <= 0) {
        const hb = 1 - orbitOut;
        ctx.save();
        ctx.globalAlpha = hb * (1 - 0.6 * smoothstep(0.9, 1, orbitIn));
        const gl = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 2.4 * u);
        gl.addColorStop(0, 'rgba(245,244,240,.55)'); gl.addColorStop(1, 'rgba(245,244,240,0)');
        ctx.fillStyle = gl; ctx.fillRect(pt.x - 2.4 * u, pt.y - 2.4 * u, 4.8 * u, 4.8 * u);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(1.2, 0.34 * u), 0, TAU); ctx.fill();
        ctx.restore();
      }
    }

    // ── the line, and the windows strung on it ─────────────────────────────
    const phase = 2 * (0.3 * seg(t, T_IN, JUMP0, x => x * x) + 0.3 * inOutCubic(seg(t, JUMP0, 2.75)) + 0.2 * seg(t, 2.75, AWAY) + 0.2 * inOutCubic(seg(t, AWAY, GONE)));
    const showWindows = t > JUMP0 && t < GONE;
    if (!showWindows) {
      wireAcross(ctx, S, H / 2, { phase });
    } else {
      // camera: in down the line, truck along it a window a beat, brake on the plaza, push, back out
      const camX = G.DX * truck(t);
      // …the arrival carries ~2.5 % past the hero and settles back (peak ~2.61, still by 2.95); before backing
      // out it gathers — a short push in over the last beat's tail — and the pull starts from that apex
      const camZ = -64 * (1 - approach) + 0.18 * bump(t, 2.44, 2.6, 2.95)
        + (port ? 0.4 : 0.9) * inOutSine(seg(t, LAND, AWAY)) + GATHER * bump(t, 6.78, AWAY, AWAY + 0.2) - 70 * away;
      const cam = camera(S, { x: camX, y: 0, z: camZ, zoom: G.zoom });
      const items = [];
      // the plates, with the plaza last
      const plaza = SAME.map(s => ({ img: S.img(s.src), fx: s.fx, fy: s.fy }));
      HEROES.forEach((h, i) => items.push({ x: i * G.DX, y: 0, z: G.ZH, hero: i, plates: [{ img: S.img(h.src), fx: h.fx, fy: h.fy }] }));
      items.push({ x: 4 * G.DX, y: 0, z: G.ZH, hero: 4, plates: plaza });
      for (const f of G.far) items.push({ x: f.x, y: f.y, z: f.z, plates: [{ img: S.img(f.src), fx: f.fx, fy: f.fy }] });
      items.push({ thread: true, z: G.ZT });
      items.sort((p, q) => q.z - p.z);
      for (const it of items) {
        if (it.thread) { wireAcross(ctx, S, H / 2, { phase }); continue; }
        const p = cam.project(it.x, it.y, it.z);
        if (!p) continue;
        const w = G.ww * p.k, h = G.wh * p.k;
        if (p.x + w / 2 < -w * 0.1 || p.x - w / 2 > W + w * 0.1) continue;
        // atmosphere: deep ones sink into the dark; those off-centre drop back a little
        // deep ones sink into the dark up to a point, then fade (never black blocks over the planet)
        const deep = it.hero === undefined ? (it.z > 20 ? 0.62 : 0.34) : 0;
        const fog = clamp(0.25 * smoothstep(G.ZH + 2, 30, p.d) + deep + (it.hero !== undefined ? 0.22 * smoothstep(0.18, 0.5, Math.abs(p.x - W / 2) / W) : 0), 0, 0.8);
        const alpha = 1 - smoothstep(22, 46, p.d);
        if (alpha <= 0.003) continue;
        let wipe = null, plates = it.plates;
        if (it.hero === 4) {
          const w1 = seg(t, WIPES[0], WIPES[0] + 0.42, inOutCubic), w2 = seg(t, WIPES[1], WIPES[1] + 0.42, inOutCubic);
          if (w2 > 0) { plates = [it.plates[1]]; wipe = { to: it.plates[2], p: w2 }; }
          else if (w1 > 0) { plates = [it.plates[0]]; wipe = { to: it.plates[1], p: w1 }; }
        }
        pane(ctx, S, p.x, p.y, w, h, { plates, wipe, fog, alpha, phase: phase * 0.5 + it.x * 0.03, zoom: 1.04 + 0.03 * (it.hero === 4 ? inOutSine(seg(t, LAND, AWAY)) : 0) });
      }
      // the viewfinder: fixed guides the windows slide through, tight when one is framed
      finder(ctx, S, G, t, camZ);
    }

    // ── the HUD ────────────────────────────────────────────────────────────
    hud(ctx, S, G, t, { pcx, pcy, R, phase });

    // ── the lens: seasoning on the hits only ───────────────────────────────
    const fx = S.fx;
    const ring = seg(t, ARRIVE - 0.04, ARRIVE + 0.5);    // starts already wider than the hero: it rolls across the stars, not through the glass
    if (ring > 0 && ring < 1) { fx.warp = 0.36 + 0.64 * ring; fx.warpX = 0.5; fx.warpY = 0.5; }
    fx.ab = 0.45 * Math.exp(-7 * Math.max(0, t - ARRIVE)) * smoothstep(ARRIVE - 0.12, ARRIVE, t)
      + 0.18 * bump(t, LAND - 0.1, LAND + 0.05, LAND + 0.45)
      + 0.22 * bump(t, AWAY, AWAY + 0.2, 7.3);
  }
};

/** the truck along the line, in hero spacings: a window a beat, braking onto the plaza */
const LAND_V = 0.39;                             // speed through the plaza's mark (hero spacings per beat)
const LAND_W = 8, LAND_D = 8;                    // its settle: a damped sine, ω and decay (1/s)
function truck(t) {
  if (t <= ARRIVE) return 0;
  if (t >= LAND) {
    // follow-through: it runs ~2.5 % of a spacing past the plaza (peak ~5.1) and settles back by ~5.33
    const s = t - LAND;
    return 4 + LAND_V / (BEAT * LAND_W) * Math.exp(-LAND_D * s) * Math.sin(LAND_W * s);
  }
  const n = (t - ARRIVE) / BEAT, k = Math.min(3, Math.floor(n)), f = n - k;
  // cubic Hermite per beat: at rest on bar 2, slowing (not stopping) past each window, and carrying
  // into bar 3 with the speed the settle above starts from (so the overshoot is continuous)
  const m = [0, 0.32, 0.32, 0.32, LAND_V];
  const m0 = m[k], m1 = m[k + 1];
  const f2 = f * f, f3 = f2 * f;
  return k + (f3 - 2 * f2 + f) * m0 + (-2 * f3 + 3 * f2) + (f3 - f2) * m1;
}

/** the viewfinder's grip: loose between windows, shutting (accelerating) into each one on its beat with a
 *  small overshoot — `ov` is a unit pulse, ~1 at its peak 0.07 s after the beat, gone by ~0.35 s */
function grip(t) {
  const k = clamp(Math.round((t - ARRIVE) / BEAT), 0, 4), dt = t - (ARRIVE + k * BEAT);
  if (dt < 0) return { loose: (k ? 1 : 2.4) * (1 - seg(dt, -0.26, 0, x => x * x)), ov: 0 };
  return { loose: k < 4 ? smoothstep(0.1, BEAT / 2, dt) : 0, ov: Math.exp(-9 * dt) * Math.sin(TAU * 2.4 * dt) / 0.464 };
}

/** which window the label names, and when it last changed (on the half-beat, as the next one takes the frame) */
function framed(t) {
  if (t < LAND) {
    const k = clamp(Math.floor((t - ARRIVE) / BEAT + 0.5), 0, 4);
    return { k, since: k ? t - (ARRIVE + (k - 0.5) * BEAT) : t - (ARRIVE - 0.1) };
  }
  const r = t >= WIPES[1] + 0.21 ? 2 : t >= WIPES[0] + 0.21 ? 1 : 0;
  return { k: 4, r, since: r ? t - (WIPES[r - 1] + 0.21) : t - (ARRIVE + 3.5 * BEAT) };
}

function finder(ctx, S, G, t, camZ) {
  const { W, H, u } = S;
  const a = seg(t, 2.36, 2.5, outCubic) * (1 - seg(t, AWAY - 0.08, AWAY + 0.16));
  if (a <= 0.003) return;
  // the hero plane's size on screen right now (the arrival's follow-through and the push in bar 3 grow it)
  const s = G.ZH / Math.max(0.5, G.ZH - camZ);
  const { loose, ov } = grip(t);
  const m = (1.5 + 2.2 * loose) * u, kk = 1 - 0.016 * ov;       // the snap: 1.6 % inside the frame, and back
  const hw = G.hw * s / 2 * kk + m, hh = G.hh * s / 2 * kk + m;
  const cx = W / 2, cy = H / 2, l = 2.4 * u;
  ctx.save();
  ctx.globalAlpha *= a * (1 - 0.45 * Math.min(1, loose));
  ctx.strokeStyle = UI.ink; ctx.lineWidth = Math.max(1, 0.14 * u); ctx.lineCap = 'square';
  ctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ctx.moveTo(cx + sx * hw, cy + sy * (hh - l)); ctx.lineTo(cx + sx * hw, cy + sy * hh); ctx.lineTo(cx + sx * (hw - l), cy + sy * hh);
  }
  ctx.stroke();
  ctx.restore();
  // the label under the frame — fixed; the plates change behind it
  const F = framed(t), lab = heroLabel(F.k, F.r || 0);
  const la = a * seg(t, 2.5, 2.8);
  if (la <= 0) return;
  const pin = clamp(F.since / 0.22);
  // the label rides the brackets' margin but not their snap, so the type itself never jitters
  const lhw = G.hw * s / 2 + m, lhh = G.hh * s / 2 + m;
  const lx = cx - lhw, ly = cy + lhh + 2.8 * u;
  tracked(ctx, S, rolling(lab.left, pin, F.k * 7 + (F.r || 0)), lx, ly, G.mono, { color: UI.ink, alpha: la * 0.85, track: 0.16, reveal: 0.35 + 0.65 * pin });
  if (F.k === 4) {
    // three returns to one place, one lit
    const bw = 2.4 * u, gap = 0.7 * u, bx = cx + lhw - 3 * bw - 2 * gap, by = ly - 0.5 * G.mono;
    ctx.save(); ctx.globalAlpha = la;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === F.r ? UI.ink : 'rgba(245,244,240,.22)';
      ctx.fillRect(bx + i * (bw + gap), by, bw, Math.max(1.5, 0.24 * u));
    }
    ctx.restore();
  } else {
    tracked(ctx, S, lab.right, cx + lhw, ly, G.mono, { color: UI.muted, alpha: la * 0.8 * pin, track: 0.16, align: 'right' });
  }
}

function heroLabel(i, r) {
  if (i < 4) {
    const h = HEROES[i];
    return { left: `${h.set} — PLATE ${String(h.n).padStart(2, '0')} / ${String(h.of).padStart(2, '0')}`, right: h.set === 'OG10' ? 'SHOPS & STREETS' : 'THE PLANET' };
  }
  return { left: `AUREA — PLATE ${SAME[r].n} / 29` };
}

function hud(ctx, S, G, t, P) {
  const { W, H, u } = S, port = G.port;
  const x0 = G.x0, top = G.top;

  // ── the station lockup: numeral | eyebrow / title / chip ────────────────
  const numIn = outCubic(seg(t, 0.32, 1.05)), hudOut = seg(t, 6.62, 7.02, inOutCubic);
  const numA = numIn * (1 - hudOut);
  ctx.save();
  ctx.font = `900 ${Math.round(G.num)}px 'Archivo', sans-serif`;
  const numW = ctx.measureText('05').width;
  ctx.restore();
  const numBase = top + 0.74 * G.num;
  if (numA > 0) numeral(ctx, S, '05', x0, numBase + (1 - numIn) * 1.2 * u, G.num, { align: 'left', alpha: numA, metal: true, phase: P.phase * 0.5 });
  const sx = x0 + numW + (port ? 2.6 : 2.2) * u;
  // eyebrow: types on, stays for the whole station, untypes on the way out
  const ebIn = seg(t, 0.36, 0.76), ebOut = seg(t, 6.6, 6.9);
  const ebY = top + G.eb * 1.02;
  if (ebIn > 0 && ebOut < 1) tracked(ctx, S, 'STAGE 05 OF 06', sx, ebY, G.eb, { reveal: ebIn * (1 - ebOut), cursor: ebIn < 1 || ebOut > 0, color: UI.muted });
  // the slot under it: Environment + chip, then the two lines of copy
  const slotY = ebY + 1.3 * u + (port ? 0.76 : 0.74) * G.title;
  const tIn = seg(t, 0.34, 0.92), tOut = seg(t, RETRACT, RETRACT + 0.35, inOutCubic);   // settled ~0.79: over a second whole
  // silver, top to bottom, as /process sets its stage titles
  const silver = ctx.createLinearGradient(0, slotY - 0.75 * G.title, 0, slotY);
  silver.addColorStop(0, '#f5f4f0'); silver.addColorStop(1, '#b9b7af');
  sill(ctx, S, 'Environment', sx, slotY, { size: G.title, weight: 800, tracking: -0.01, color: silver }, tIn, tOut);
  const chipA = seg(t, 0.62, 0.9, outCubic) * (1 - seg(t, RETRACT, RETRACT + 0.25));
  if (chipA > 0) chip(ctx, S, 'Higgsfield', sx, slotY + 1.5 * u + (1 - chipA) * 0.8 * u, { size: G.chip, alpha: chipA });
  // copy — each line held well past the 1.2 s it needs
  const lh = G.copy * 1.2;
  const copyY = ebY + 1.4 * u + 0.74 * G.copy;
  const c1In = seg(t, 2.55, 3.1), c1Out = seg(t, 4.72, 5.0, inOutCubic);
  const c2In = seg(t, 4.98, 5.5), c2Out = seg(t, 6.66, 6.92, inOutCubic);
  G.copyLines[0].forEach((s, i) => sill(ctx, S, s, sx, copyY + i * lh, { size: G.copy, weight: 800, tracking: 0.02, color: UI.ink }, clamp(c1In * 1.25 - i * 0.25), c1Out));
  G.copyLines[1].forEach((s, i) => sill(ctx, S, s, sx, copyY + i * lh, { size: G.copy, weight: 800, tracking: 0.02, color: UI.ink }, clamp(c2In * 1.25 - i * 0.25), c2Out));

  // ── the tag on the planet ──────────────────────────────────────────────
  // it types fast (a HUD readout, not a second headline) and is the only type left once the title retracts;
  // on the jump it clears in order — the leader draws back into the reticle, the text untypes, the reticle lets go —
  // all before the windows show (~2.15)
  const lockP = seg(t, LOCK - 0.08, LOCK + 0.32, outExpo);
  const tagIn = seg(t, LOCK + 0.05, LOCK + 0.28);
  const leadBack = seg(t, 1.95, 2.08, inOutCubic), tagOut = seg(t, 2.0, 2.18), retOut = seg(t, 2.04, 2.2, inOutCubic);
  if (lockP > 0 && retOut < 1) {
    const ax = P.pcx + (port ? 0.08 : 0.22) * P.R, ay = P.pcy - (port ? 0.9 : 0.9) * P.R;
    const s = (port ? 2.4 : 1.8) * u * (1 + 2.2 * (1 - lockP) + 0.5 * retOut);
    reticle(ctx, S, ax, ay, s, Math.min(1, lockP * 1.6) * (1 - retOut));
    // leader and rule
    const ruleY = port ? 0.285 * H : 0.2 * H;
    const ex = port ? 0.5 * W : 0.79 * W, rx1 = port ? x0 : 0.95 * W;
    const lead = seg(t, LOCK, LOCK + 0.24, outCubic) * (1 - leadBack);
    if (lead > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(245,244,240,.55)'; ctx.lineWidth = Math.max(1, 0.1 * u);
      const sx0 = ax + (ex - ax) * 0.0, sy0 = ay;
      const dx = ex - sx0, dy = ruleY - sy0, L = Math.hypot(dx, dy);
      const off = s * 1.25 / L;                       // start clear of the brackets
      ctx.beginPath();
      ctx.moveTo(sx0 + dx * off, sy0 + dy * off);
      const k1 = Math.min(1, lead * 1.6);
      ctx.lineTo(sx0 + dx * (off + (1 - off) * k1), sy0 + dy * (off + (1 - off) * k1));
      if (lead > 0.6) { const k2 = (lead - 0.6) / 0.4; ctx.moveTo(ex, ruleY); ctx.lineTo(lerp(ex, rx1, k2), ruleY); }
      ctx.stroke();
      ctx.restore();
    }
    const lx = port ? x0 : ex + 1.2 * u;
    if (tagIn > 0 && tagOut < 1) {
      // untyping runs the reveal backwards: the last glyph goes first
      text(ctx, S, 'AUREA', lx, ruleY - 1.1 * u, { size: G.tag, weight: 800, tracking: 0.24, color: UI.ink, reveal: tagIn * (1 - tagOut), window: 0.5 });
      const coords = rolling('05h 42m 18.6s  -02° 25′ 07″', seg(t, LOCK + 0.1, LOCK + 0.42), 3);   // locked by ~1.65
      mono(ctx, S, [coords, 'THE PLANET · ×29 PLATES'], lx, ruleY + 2.3 * u, { size: G.mono, color: UI.muted, reveal: seg(t, LOCK + 0.08, LOCK + 0.3) * (1 - tagOut) });
    }
  }

  // ── the mission clock ──────────────────────────────────────────────────
  const ca = seg(t, 0.4, 0.9) * (1 - hudOut);
  if (ca > 0) tracked(ctx, S, stamp(S.t), x0, 0.855 * H, G.mono, { color: UI.muted, alpha: ca * 0.8, track: 0.12, weight: 500, keyline: Math.max(2, 0.48 * u) });
}
