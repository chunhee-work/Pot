/* 1 — Launch (0–7.5 s). The opening, and the loop's first beat.

   The site's own nav pill is the ship. It is pinched out of the chrome thread
   the seam leaves lying across the frame, the highlight walks its links the
   way a pointer would and Process lights; then the pill opens out — its rim
   stretching into the frame of a cockpit viewport — the mission title types
   in, and the ship jumps to warp and drops back out onto the still thread.

   Time map (local s; 96 bpm — beats every 0.625, bars at 0, 2.5, 5)
     0.00–0.10  the seam: still stars, the thread at rest across the middle
     0.10–0.63  beat 1: three highlights run in along the thread from both ends,
                accelerating, and gather into a flare at the centre
     0.63–0.98  beat 2: the thread pinches — its ends pulled in to the pill's length
     0.78–1.16  the pill opens top to bottom like an eyelid: a slit of plate
                widening between two rims — the site's nav, floating in space
     0.95–1.20  the links come up: About · Work · Series · World & Voices ·
                Game UI · Process · Contact
     1.09–1.88  the highlight walks them on sixteenths — the site's hover
                underline sliding link to link, each lighting and cooling —
                and lands on Process on beat 4 (1.875): hot, the rim flares
     2.19       the pill is pressed (the site's .97 press)
     2.50–3.13  bar 2: it opens out — width first, then height; the plate
                clears to space, the rim thins and stretches into the frame of
                a viewport, the ship's dark interior closes in around it and
                a pane of glass catches a faint sheen. The links' row spreads
                with the rim (the type keeps its shape) and fades
     2.72–3.13  Process, the one that was chosen, lifts off and docks in the
                viewport's lower right, tracking out and turning to capitals
                a letter at a time: the value of HEADING · PROCESS
     3.125      beat 6, the lock: the ticks close on their corners and flash,
                a highlight runs round the frame; the clock and heading tape
                come on, HEADING types out leftward from PROCESS, ORIGIN ·
                KUALA LUMPUR and NEXT · STAGE 01 OF 06 type on (done by 3.38)
     3.13–3.44  MISSION · 6 STAGES · 1 OPERATOR types on (mono)
     3.44–3.96  LAND OF HOPE — HOW IT'S MADE types on alone, each glyph arriving hot
     4.06–4.38  CHUN HEE tracks in between two chrome rules, settling on beat 7 —
                the card is complete
     3.96–5.60  held and read (still at 4.95); the stars drift toward us
     5.00–6.25  bar 3: warp spools up — the stars streak, the lens shivers
     5.60–6.35  the HUD streaks away: the title rushes past along its own
                zoom, the labels are flung to their corners, the frame and
                the cockpit blow outward past the edges of the picture
     6.25       the jump: a shock ring, an exposure punch, the streaks at full length
     6.45–7.25  dropping out: the streaks collapse back into stars while the
                thread shoots out from the centre, bright heads riding its
                ends, and its highlights slide to rest
     7.30–7.50  the seam, exactly

   Portrait: the pill runs at the site's phone size and scrolls its links under
   a fade (as the site's nav does below 620px), bringing Process to the centre;
   the title stacks LAND OF HOPE over — HOW IT'S MADE, and each corner label
   stacks its key over its value (HEADING types out right to left above PROCESS).
   Every word meant to be read is set at 10 CSS px or more at any size (readPx):
   where that floor lifts the HUD's labels, the card's small type and its gaps
   grow with them, and the labels hold a margin inside the text-safe area. */
import { clamp, lerp, seg, bezier, navE, siteE, outCubic, outQuad, inQuad, inCubic, inOutQuad, inOutCubic, outExpo, smoothstep, rng, text, layout, FONT } from '../../kit.js';
import { seam, space, wire, metal, pill, NAV, mono, stamp, readPx, UI, MONO } from '../kit3.js';
import { BEAT, BAR } from '../palette.js';

const B = BEAT, Q = BEAT / 4;                 // a beat, a sixteenth
// ── key instants ───────────────────────────────────────────────────────────
const T_LEAVE = 0.1;                          // the seam holds until here
const ARRIVE = [0.36, 0.49, B];               // the three highlights reach the centre
const RUN = 0.3;                              // …each after a run of this long
const T_PINCH = B, T_PILL = 0.98;             // the thread's ends pulled in
const T_EYE = [0.78, 1.16];                   // the pill opens top to bottom
const T_LINKS = [0.95, 1.2];
const HOT = 5;                                // Process
const T_WALK = 3 * B - HOT * Q;               // About, then a link a sixteenth…
const T_HOT = 3 * B;                          // …Process on beat 4
const T_PRESS = 3.5 * B;
const T_OPEN = BAR;                           // the pill opens into the viewport
const T_FLY = 2.72;                           // Process lifts off the opening pill…
const T_LOCK = 5 * B;                         // …and lands as the heading as the frame locks, beat 6 (3.125)
const T_EYEBROW = [T_LOCK, 5.5 * B];          // the HUD boots on the lock…
const T_TYPE = 5.5 * B, CPS = 52;             // …then the title types alone, 3.44–3.96
const T_NAME = 6.5 * B, T_NAMED = 7 * B;      // 4.06, settled on beat 7 (4.375): the card is whole
const T_WARP = 2 * BAR, T_JUMP = 10 * B;      // 5.0 spool-up, 6.25 the jump
const T_AWAY = [5.6, 6.35];                  // the HUD streaks away
const T_BACK = [6.45, 7.25];                  // the thread re-forms
const T_SETTLE = 7.3;                         // phase and length at rest
const T_REST = 7.32;                          // the exact seam from here

const TITLE_A = 'LAND OF HOPE', TITLE_B = '— HOW IT’S MADE';
const EYEBROW = 'MISSION · 6 STAGES · 1 OPERATOR';
const NAME = 'CHUN HEE';
const LABELS = [['ORIGIN', 'KUALA LUMPUR'], ['HEADING', 'PROCESS'], ['NEXT', 'STAGE 01 OF 06']];

const PINCH_E = bezier(0.5, 0, 0.1, 1);
const OPEN_E = bezier(0.3, 0, 0, 1);
const EYE_E = bezier(0.45, 0, 0.12, 1);
const FLY_E = bezier(0.5, 0, 0.25, 1);

// ── the type must be in before anything is measured or cached ──────────────
/* Every cache here (and kit's layout cache) holds glyph positions, so nothing
   is measured into a cache until Cinzel and Archivo are in: measured in the
   fallback serif, LAND OF HOPE would keep the fallback's spacing for good. */
const FACES = ['700 40px Cinzel', '300 40px Archivo', '600 40px Archivo', '700 40px Archivo'];
let facesSettled = false;                     // the loads finished (or failed): cache what we have
function fontsIn() {
  if (facesSettled || typeof document === 'undefined' || !document.fonts) return true;
  try { return FACES.every(f => document.fonts.check(f)); } catch (e) { return true; }
}
/** a string's width, through kit's cached layout once the faces are in, measured raw (uncached) before */
function widthOf(ctx, str, o) {
  if (fontsIn()) return layout(ctx, str, o).width;
  const fam = o.font === 'serif' ? FONT.serif : FONT.sans, weight = o.font === 'serif' ? 700 : (o.weight ?? 700);
  ctx.save(); ctx.font = `${weight} ${Math.round(o.size)}px ${fam}`;
  const w = ctx.measureText(str).width + Math.max(0, [...str].length - 1) * (o.tracking ?? 0) * o.size;
  ctx.restore();
  return w;
}

// ── geometry, per frame size ───────────────────────────────────────────────
const GEO = new Map();
// keyed by everything the geometry reads: the frame and its pixel ratio (the type
// floor is 10 CSS px, so the same backing size at another dpr sets other sizes)
const sizeKey = S => S.W + 'x' + S.H + '@' + S.dpr;
function geo(ctx, S) {
  const key = sizeKey(S);
  let G = GEO.get(key);
  if (G) return G;
  const { W, H, u } = S, tall = H > W;
  // the pill: the site's nav (12.5px links in a 60px pill) at the reel's scale —
  // never under the 10 CSS px the reel reads at (a phone held sideways would set it at 8)
  const size = readPx(S, tall ? 2.75 : 2.05);
  const widths = NAV.map(s => widthOf(ctx, s, { size, weight: 600, tracking: 0.02 }));
  const gap = size * 1.9;
  const strip = widths.reduce((a, b) => a + b, 0) + gap * (NAV.length - 1);
  const rel = []; let x = -strip / 2;
  widths.forEach(w => { rel.push(x + w / 2); x += w + gap; });
  const pad = size * 1.6, natural = strip + 2 * pad;
  const maxW = W * (tall ? 0.92 : 0.86);
  const scroll = natural > maxW;
  const pw = Math.min(natural, maxW), ph = size * 4.8, rim = Math.max(2, 0.42 * u);
  // on a phone the strip starts with About at the left and scrolls Process toward
  // the centre — as far as the site's nav can scroll, and no further
  const stripEnd = pw / 2 - pad - strip / 2;
  const strip0 = scroll ? -pw / 2 + pad + strip / 2 : 0, strip1 = scroll ? Math.max(-rel[HOT], stripEnd) : 0;
  // the viewport the pill opens into
  const vx0 = W * (tall ? 0.05 : 0.042), vy0 = H * (tall ? 0.1 : 0.085);
  const vw = W - 2 * vx0, vh = H * (tall ? 0.765 : 0.79), vr = (tall ? 3.2 : 2.6) * u;
  // type. The HUD's micro-labels are the smallest copy meant to be read, so they
  // take the floor (10 CSS px); where the floor lifts them (a phone, a phone held
  // sideways) the rest of the small type and the gaps that set it grow with them
  // by the same factor `g`, so the card keeps its proportions instead of flattening
  // into one size. The title only needs to stay a clear step above them.
  const labK = tall ? 2.05 : 1.5;
  const lab = readPx(S, labK), g = lab / (labK * u);          // g = 1 wherever k·u already reads
  const monoS = (tall ? 2.3 : 1.7) * u * g;                   // the mission line
  const nameS = (tall ? 2.3 : 1.8) * u * g;                   // the operator
  let tA = tall ? 8.4 * u : Math.max(5.2 * u, 2.6 * lab), tB = tall ? 4.1 * u : tA;
  const fA = s => ({ font: 'serif', size: s, tracking: 0.05 });
  const fB = s => ({ size: s, weight: 300, tracking: tall ? 0.1 : 0.06 });
  let wA = widthOf(ctx, TITLE_A, fA(tA)), wB = widthOf(ctx, TITLE_B, fB(tB));
  const room = vw * (tall ? 0.84 : 0.8);
  if (tall) {
    if (wA > room) { const k = room / wA; tA *= k; wA *= k; }
    if (wB > room) { const k = room / wB; tB *= k; wB *= k; }
  } else {
    const sp = tA * 0.34, all = wA + sp + wB;
    if (all > room) { const k = room / all; tA *= k; tB *= k; wA *= k; wB *= k; }
  }
  const space_ = tall ? 0 : tA * 0.34;
  G = {
    tall, size, widths, gap, strip, rel, pad, pw, ph, rim, scroll, strip0, strip1, stripEnd,
    vx0, vy0, vw, vh, vr, lab, g, monoS, nameS, tA, tB, wA, wB, space: space_,
    fA: fA(tA), fB: fB(tB),
    // on an upright frame two corner labels side by side would all but meet, so
    // each stacks its key over its value
    stack: tall,
    eyeGap: (tall ? 4.2 : 3.6) * u * g, nameGap: (tall ? 6.2 : 5) * u * g,
    wire: Math.max(1.5, 0.32 * u)
  };
  if (!fontsIn()) return G;                   // measured in a fallback face: use it, never keep it
  if (GEO.size > 6) GEO.clear();
  GEO.set(key, G);
  return G;
}

// ── small helpers ──────────────────────────────────────────────────────────
/** a rounded-rect sub-path (no beginPath, so it can be combined) */
function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
/** a pulse: 0 before a, up by a+rise, back to 0 by b */
const pulse = (t, a, rise, b) => (t < a || t > b ? 0 : t < a + rise ? outQuad((t - a) / rise) : 1 - inOutQuad((t - a - rise) / (b - a - rise)));

/* The pill as it opens out: the kit's pill, stroke for stroke (a ring of metal
   `rim` wide, the same flow and shade), but with a plate that can clear to
   space, so the rim can become the frame of a window. */
function hull(ctx, S, cx, cy, w, h, r, rim, o) {
  if (w <= 0 || h <= 0) return;
  const x0 = cx - w / 2, y0 = cy - h / 2;
  r = Math.min(r, h / 2, w / 2);
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  if (o.glow > 0) halo(ctx, S, cx, cy, w, h, o.glow, r);
  if (o.plate > 0) {
    const plate = ctx.createLinearGradient(0, y0 + rim, 0, y0 + h - rim);
    plate.addColorStop(0, '#1d1d1b'); plate.addColorStop(1, '#0a0a09');
    ctx.save();
    ctx.fillStyle = plate; ctx.globalAlpha *= o.plate;
    ctx.beginPath(); rr(ctx, x0 + rim, y0 + rim, w - 2 * rim, h - 2 * rim, Math.max(0, r - rim)); ctx.fill();
    ctx.restore();
  }
  ctx.beginPath(); rr(ctx, x0 + rim / 2, y0 + rim / 2, w - rim, h - rim, Math.max(0, r - rim / 2));
  ctx.lineWidth = rim;
  ctx.strokeStyle = metal(ctx, x0, y0, x0 + w, y0 + h * 0.4, o.phase || 0, Math.max(40, w / 2.1)); ctx.stroke();
  const shade = ctx.createLinearGradient(0, y0, 0, y0 + h);
  shade.addColorStop(0, 'rgba(255,255,255,.16)'); shade.addColorStop(0.5, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.strokeStyle = shade; ctx.stroke();
  ctx.restore();
}

/** a soft light around the pill (the nav's shadow, turned to a glow in space) —
    only outside it, so it never hazes a plate that is clearing to space */
function halo(ctx, S, cx, cy, w, h, a, r = h / 2) {
  if (a <= 0.005) return;
  const u = S.u;
  ctx.save();
  for (let i = 4; i >= 1; i--) {
    const e = i * 0.75 * u;
    ctx.fillStyle = `rgba(200,212,240,${0.016 * a})`;
    ctx.beginPath();
    rr(ctx, cx - w / 2 - e, cy - h / 2 - e, w + 2 * e, h + 2 * e, r + e);
    rr(ctx, cx - w / 2, cy - h / 2, w, h, r);
    ctx.fill('evenodd');
  }
  ctx.restore();
}

/** the window itself: a depth of shadow inside the frame and a faint diagonal
    sheen across the glass — just enough to say there is a pane between us and space */
function glassPane(ctx, S, x0, y0, w, h, r, a) {
  if (a <= 0.01) return;
  const u = S.u;
  ctx.save();
  ctx.beginPath(); rr(ctx, x0, y0, w, h, r); ctx.clip();
  ctx.globalAlpha = a;
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  for (let i = 1; i <= 3; i++) {
    ctx.lineWidth = i * 1.4 * u;
    ctx.beginPath(); rr(ctx, x0, y0, w, h, r); ctx.stroke();
  }
  const g = ctx.createLinearGradient(x0, y0, x0 + w * 0.55, y0 + h);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.34, 'rgba(255,255,255,0)');
  g.addColorStop(0.42, 'rgba(220,230,255,.028)'); g.addColorStop(0.5, 'rgba(255,255,255,.012)');
  g.addColorStop(0.56, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
  ctx.restore();
}

/** the ship's interior around the viewport: everything but the window */
function interior(ctx, S, x0, y0, w, h, r, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  const g = ctx.createLinearGradient(0, 0, 0, S.H);
  g.addColorStop(0, '#11110f'); g.addColorStop(1, '#070706');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.rect(-2, -2, S.W + 4, S.H + 4); rr(ctx, x0, y0, w, h, r);
  ctx.fill('evenodd');
  ctx.restore();
}

// ── the thread's highlights gathering, and the pinch ───────────────────────
function gather(ctx, S, G, t) {
  const { W, H, u } = S, cx = W / 2, cy = H / 2, lw = G.wire;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const D = W * 0.52;
  for (let j = 0; j < ARRIVE.length; j++) {
    const p = seg(t, ARRIVE[j] - RUN, ARRIVE[j]);
    if (p <= 0 || p >= 1) continue;
    const e = inQuad(p);
    const a = (0.45 + 0.55 * p) * seg(p, 0, 0.18) * (0.75 + 0.25 * j / 2);
    const len = (3 + 15 * p) * u;                        // it smears as it speeds up
    for (const s of [-1, 1]) {
      // s is the side it comes from; it runs inward, so its tail trails on the outer side
      const x = cx + s * D * (1 - e), xt = x + s * len, xh = x - s * 0.6 * u;
      const g = ctx.createLinearGradient(xt, 0, xh, 0);
      g.addColorStop(0, 'rgba(174,203,255,0)');
      g.addColorStop(0.62, `rgba(174,203,255,${0.35 * a})`);
      g.addColorStop(0.86, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,217,174,0)');
      ctx.fillStyle = g;
      const x0 = Math.min(xt, xh), x1 = Math.max(xt, xh);
      ctx.fillRect(x0, cy - lw * 0.7, x1 - x0, lw * 1.4);
      ctx.globalAlpha = 0.22;
      ctx.fillRect(x0, cy - lw * 2.6, x1 - x0, lw * 5.2);
      ctx.globalAlpha = 1;
    }
  }
  // the gathered light: a small anamorphic flare at the centre
  let f = 0;
  for (let j = 0; j < ARRIVE.length; j++) f += 0.34 * seg(t, ARRIVE[j] - 0.03, ARRIVE[j] + 0.12, outQuad);
  f *= 1 - seg(t, T_PINCH + 0.1, T_EYE[0] + 0.2, inOutQuad);
  if (f > 0.004) {
    ctx.translate(cx, cy);
    ctx.save();
    ctx.scale(9, 1);
    const r = 1.9 * u;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(255,255,255,${0.75 * f})`); g.addColorStop(0.3, `rgba(174,203,255,${0.22 * f})`); g.addColorStop(1, 'rgba(174,203,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.restore();
    const r2 = 2.4 * u;
    const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, r2);
    g2.addColorStop(0, `rgba(255,255,255,${0.9 * f})`); g2.addColorStop(0.25, `rgba(255,236,214,${0.25 * f})`); g2.addColorStop(1, 'rgba(255,217,174,0)');
    ctx.fillStyle = g2; ctx.fillRect(-r2, -r2, 2 * r2, 2 * r2);
  }
  ctx.restore();
}

/** bright heads on the thread's two ends as it shoots back out */
function tips(ctx, S, G, cx, cy, half, a) {
  if (a <= 0.01) return;
  const u = S.u, lw = G.wire, len = 9 * u;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1]) {
    const x = cx + s * half;
    const g = ctx.createLinearGradient(x - s * len, 0, x, 0);
    g.addColorStop(0, 'rgba(174,203,255,0)'); g.addColorStop(0.7, `rgba(174,203,255,${0.35 * a})`);
    g.addColorStop(0.97, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,217,174,0)');
    ctx.fillStyle = g;
    const x0 = Math.min(x - s * len, x), x1 = Math.max(x - s * len, x);
    ctx.fillRect(x0, cy - lw * 0.7, x1 - x0, lw * 1.4);
    ctx.globalAlpha = 0.25; ctx.fillRect(x0, cy - lw * 2.6, x1 - x0, lw * 5.2); ctx.globalAlpha = 1;
    const r = 1.6 * u, rg = ctx.createRadialGradient(x, cy, 0, x, cy, r);
    rg.addColorStop(0, `rgba(255,255,255,${0.6 * a})`); rg.addColorStop(1, 'rgba(174,203,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(x - r, cy - r, 2 * r, 2 * r);
  }
  ctx.restore();
}

// ── the nav's links, the walking highlight ─────────────────────────────────
const stepAt = k => T_WALK + k * Q;
/** how lit link i is at t: up on arrival, cooling (the site's .35s colour ease) after the highlight leaves */
function lit(i, t) {
  if (i > HOT) return 0;
  const on = seg(t, stepAt(i), stepAt(i) + 0.05);
  if (i === HOT) return on;
  return on * (1 - seg(t, stepAt(i + 1), stepAt(i + 1) + 0.35, navE));
}
/** the underline's two ends, as link-index positions, and its scale-in */
function underline(t) {
  if (t < T_WALK) return null;
  const k = Math.min(HOT, Math.floor((t - T_WALK) / Q));
  if (k === 0) return { a: 0, b: 0, grow: seg(t, T_WALK, T_WALK + 0.12, navE) };
  const t0 = stepAt(k);
  const lead = navE(seg(t, t0, t0 + 0.11)), trail = navE(seg(t, t0 + 0.03, t0 + 0.15));
  return { a: k - 1 + trail, b: k - 1 + lead, grow: 1 };
}

/* The nav's links (kit3's navLinks, link by link). `o.spread` pulls their
   positions apart about the centre as the pill opens out: the row spreads,
   the type stays true. `o.trail` lays faint copies at earlier spreads. */
function links(ctx, S, G, cx, cy, t, alpha, shift, o = {}) {
  const hotAlpha = o.hot ?? alpha, plateA = o.plate ?? 1, spread = o.spread ?? 1;
  if (alpha <= 0 && hotAlpha <= 0) return;
  const size = G.size, sc = G.strip0 + (G.strip1 - G.strip0) * shift, pw = G.pw * spread;
  const centre = (i, sp = spread) => cx + (sc + G.rel[i]) * sp;
  const f = { size, weight: 600, tracking: 0.02, color: '#a19f97' };
  ctx.save();
  if (G.scroll) {                                   // the site's phone nav: a scrolling strip under a fade
    ctx.beginPath(); rr(ctx, cx - pw / 2 + G.rim, cy - G.ph / 2 + G.rim, pw - 2 * G.rim, G.ph - 2 * G.rim, G.ph / 2 - G.rim); ctx.clip();
  }
  const row = (sp, a) => {
    if (a <= 0.004) return;
    for (let i = 0; i < NAV.length; i++) text(ctx, S, NAV[i], centre(i, sp) - G.widths[i] / 2, cy + size * 0.36, { ...f, alpha: a });
  };
  for (const [sp, a] of o.trail || []) row(sp, alpha * a);
  row(spread, alpha);
  for (let i = 0; i <= HOT; i++) {
    const L = lit(i, t);
    if (L <= 0.01) continue;
    const x0 = centre(i) - G.widths[i] / 2;
    text(ctx, S, NAV[i], x0, cy + size * 0.36, { size, weight: 600, tracking: 0.02, color: UI.ink, alpha: (i === HOT ? hotAlpha : alpha) * L });
  }
  const U = underline(t);
  if (U) {
    const edge = (f, side) => {
      const i = Math.floor(f), j = Math.min(NAV.length - 1, i + 1), k = f - i;
      const e = i2 => centre(i2) + side * G.widths[i2] / 2;
      return lerp(e(i), e(j), k);
    };
    const xa = edge(U.a, -1), xb = edge(U.b, 1);
    const w = (xb - xa) * U.grow;
    ctx.fillStyle = UI.ink; ctx.globalAlpha = hotAlpha * (t >= T_HOT ? 1 : 0.9);
    ctx.fillRect(xa, cy + size * 1.3, w, Math.max(1, size * 0.12));
  }
  if (G.scroll) {                                    // fade the strip into the plate at its ends
    const plate = ctx.createLinearGradient(0, cy - G.ph / 2, 0, cy + G.ph / 2);
    plate.addColorStop(0, '#1d1d1b'); plate.addColorStop(1, '#0a0a09');
    ctx.fillStyle = plate; ctx.globalAlpha = 1;
    // the site's 56px mask at whichever ends still have links to scroll to
    const fw = G.pw * 0.16, n = 10, lx = cx - pw / 2, rx = cx + pw / 2;
    const scrolled = G.strip0 - sc, remain = sc - G.stripEnd;
    const veil = Math.min(plateA, Math.max(alpha, hotAlpha));   // never more solid than the plate it stands in for
    const leftOn = clamp(scrolled / fw) * veil, rightOn = clamp(remain / fw) * veil;
    for (let s = 0; s < n; s++) {
      const a = 1 - (s + 0.5) / n;
      if (leftOn > 0) { ctx.globalAlpha = a * leftOn; ctx.fillRect(lx + s * fw / n, cy - G.ph / 2, fw / n + 0.5, G.ph); }
      if (rightOn > 0) { ctx.globalAlpha = a * rightOn; ctx.fillRect(rx - (s + 1) * fw / n, cy - G.ph / 2, fw / n + 0.5, G.ph); }
    }
  }
  ctx.restore();
}

// ── the HUD ────────────────────────────────────────────────────────────────
/** corner ticks: they close in on their corners as they grow, and lock with a flash */
function ticks(ctx, S, x0, y0, w, h, p, alpha, flash = 0) {
  if (p <= 0 || alpha <= 0) return;
  const u = S.u, ins = (1.5 + 1.4 * (1 - p)) * u, arm = 2.4 * u * p;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = `rgba(245,244,240,${0.72 + 0.28 * flash})`; ctx.lineWidth = Math.max(1, (0.13 + 0.07 * flash) * u);
  ctx.beginPath();
  for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const x = sx ? x0 + w - ins : x0 + ins, y = sy ? y0 + h - ins : y0 + ins;
    const dx = sx ? -1 : 1, dy = sy ? -1 : 1;
    ctx.moveTo(x + dx * arm, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * arm);
  }
  ctx.stroke();
  // a hairline just inside the frame
  ctx.globalAlpha *= p;
  ctx.strokeStyle = `rgba(245,244,240,${0.07 + 0.12 * flash})`; ctx.lineWidth = Math.max(1, 0.1 * u);
  ctx.beginPath(); rr(ctx, x0 + 0.9 * u, y0 + 0.9 * u, w - 1.8 * u, h - 1.8 * u, 1.6 * u); ctx.stroke();
  ctx.restore();
}

/** a heading tape: fine ticks drifting past a fixed index */
function tape(ctx, S, cx, y, t, alpha) {
  if (alpha <= 0) return;
  const u = S.u, step = 1.1 * u, n = 16, half = n * step;
  const off = ((t * 0.9 * u) % step + step) % step;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = UI.ink;
  for (let i = -n - 1; i <= n + 1; i++) {
    const x = cx + i * step - off;
    const d = Math.abs(x - cx) / half;
    if (d >= 1) continue;
    const major = ((i + 1000) % 5) === 0;
    ctx.globalAlpha = alpha * (1 - d * d) * (major ? 0.5 : 0.25);
    ctx.fillRect(x - 0.5, y, Math.max(1, 0.1 * u), (major ? 0.9 : 0.5) * u);
  }
  // the index: a small chevron under the tape
  ctx.globalAlpha = alpha * 0.85;
  ctx.beginPath(); ctx.moveTo(cx - 0.45 * u, y + 1.6 * u); ctx.lineTo(cx + 0.45 * u, y + 1.6 * u); ctx.lineTo(cx, y + 1.05 * u); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** a HUD micro-label: a faint key, a brighter value — typed on left to right
    (`reveal`), or key and value separately (`o.key`, `o.val`; `o.order` for the key).
    (x, y) is the value's baseline; on an upright frame (G.stack) the key sits a
    line above it instead of before it, each line aligned on its own. */
const labelFont = G => ({ size: G.lab, weight: 700, tracking: 0.2 });
const labelLead = G => G.lab * 1.55;          // key line to value line, stacked
function label(ctx, S, G, [key, val], x, y, reveal, o = {}) {
  const f = labelFont(G);
  const k = G.stack ? key : key + ' · ', n = k.length + val.length, r = reveal * n;
  const rk = o.key ?? clamp(r / k.length), rv = o.val ?? clamp((r - k.length) / val.length);
  if (rk <= 0 && rv <= 0) return;
  const wk = layout(ctx, k, f).width + (G.stack ? 0 : G.lab * 0.2), wv = layout(ctx, val, f).width;
  const right = o.align === 'right';
  let kx, ky = y, vx;
  if (G.stack) { kx = right ? x - wk : x; ky = y - labelLead(G); vx = right ? x - wv : x; }
  else { kx = right ? x - wk - wv : x; vx = kx + wk; }
  const base = { ...f, window: 0.2, rise: 0, ease: outQuad, alpha: o.alpha ?? 1 };
  if (rk > 0) text(ctx, S, k, kx, ky, { ...base, color: '#85837b', reveal: rk, order: o.order });
  if (rv > 0) text(ctx, S, val, vx, y, { ...base, color: '#cfcdc6', reveal: rv });
  // a value that arrives hot cools to its colour (the site's .35s colour ease)
  if (o.hot > 0.004) text(ctx, S, val, vx, y, { ...base, color: UI.ink, alpha: (o.alpha ?? 1) * o.hot });
}

/* Where the HUD sits in the finished viewport: tucked into its corners, but
   never outside the frame's text-safe area (x 5–95 %, y 8–86 %) — held a margin
   inside it (x ≥ 6.8 %, cap line ≥ 10.5 %, baseline ≤ 84 %), whatever the size.
   `line` is the top edge's baseline (the clock, and the key of a stacked label);
   `top` and `bot` are the values' baselines. */
function hudGeo(S, G) {
  const { W, H, u } = S, x0 = W / 2 - G.vw / 2, y0 = G.vy0;
  const xl = Math.max(x0 + (G.tall ? 3.2 : 3.4) * u, 0.068 * W), cap = 0.72 * G.lab;
  const line = Math.max(y0 + 3.4 * u + cap, 0.105 * H + cap);
  const lead = G.stack ? labelLead(G) : 0;
  return {
    x0, y0, w: G.vw, h: G.vh, xl, xr: W - xl, line,
    top: line + lead, bot: Math.min(y0 + G.vh - (G.tall ? 3.8 : 3.2) * u, 0.84 * H)
  };
}

function monoWidth(ctx, str, size) {
  ctx.save(); ctx.font = `400 ${Math.round(size)}px ${MONO}`;
  const w = ctx.measureText(str).width; ctx.restore();
  return w;
}

/* The HUD inside the viewport. `k` is the streak-away (0 at rest): the labels
   are flung toward their corners, with a trail of fading copies behind. */
/* The HUD boots on the lock (beat 6): the ticks close on their corners and
   flash, the clock and the tape come on, ORIGIN and NEXT type on, and HEADING
   types out leftward from the value Process has just become. */
function hud(ctx, S, G, t, k) {
  const u = S.u, a = 1 - k;
  if (a <= 0) return;
  const { x0, y0, w, h, xl, xr, line, top, bot } = hudGeo(S, G), cx = x0 + w / 2;
  ticks(ctx, S, x0, y0, w, h, seg(t, T_LOCK - 0.12, T_LOCK, outCubic), a, pulse(t, T_LOCK, 0.02, T_LOCK + 0.45));
  if (!G.tall) tape(ctx, S, cx, y0 + 2.1 * u, t, seg(t, T_LOCK - 0.04, T_LOCK + 0.2) * a);
  const clock = stamp(S.t);
  const cw = monoWidth(ctx, 'T+00:00.00', G.lab * 1.08);
  const hk = seg(t, T_LOCK, T_LOCK + 0.14), hot = t < T_LOCK ? 0 : 1 - seg(t, T_LOCK, T_LOCK + 0.35, navE);
  const items = [
    [LABELS[0], xl, top, { reveal: seg(t, T_LOCK, T_LOCK + 0.2) }, -1, -1],
    [LABELS[2], xl, bot, { reveal: seg(t, T_LOCK + 0.05, T_LOCK + 0.25) }, -1, 1],
    [LABELS[1], xr, bot, { align: 'right', key: hk, val: t >= T_LOCK ? 1 : 0, order: 'reverse', hot }, 1, 1]
  ];
  const trail = k > 0 ? 3 : 1;
  for (let g = trail - 1; g >= 0; g--) {
    const kk = k * (1 - g * 0.2), ga = g ? 0.3 * (1 - g / trail) : 1;
    const fling = inCubic(kk) * 40 * u;
    for (const [s, x, y, o, dx, dy] of items) {
      label(ctx, S, G, s, x + dx * fling, y + dy * fling * 0.55, o.reveal ?? 1, { ...o, alpha: a * ga });
    }
    // the mission clock, top right, on the top edge's line
    const ca = seg(t, T_LOCK, T_LOCK + 0.06) * a * ga;
    if (ca > 0) {
      const cx2 = xr - cw + fling, cy2 = line - fling * 0.55;
      mono(ctx, S, clock, cx2, cy2, { size: G.lab * 1.08, color: UI.ink, alpha: ca });
      // a small live dot, pulsing on the beat
      const beat = 1 - ((S.t / B) % 1);
      ctx.save(); ctx.globalAlpha *= ca * (0.35 + 0.65 * beat * beat);
      ctx.fillStyle = UI.ember; ctx.beginPath(); ctx.arc(cx2 - 1.2 * u * G.g, cy2 - G.lab * 0.36, 0.32 * u * G.g, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

// ── bar 2: the pill opens out ──────────────────────────────────────────────
const SC0 = 1.03 * 0.975;                     // the pill's scale as it opens: the push-in, pressed
/** the opening viewport at t: width first, then height, locking on beat 6 */
function openAt(S, G, t) {
  const cy = S.H / 2;
  const ox = OPEN_E(seg(t, T_OPEN, T_OPEN + 0.5)), oy = OPEN_E(seg(t, T_OPEN + 0.1, T_LOCK));
  const k = seg(t, T_AWAY[0], T_AWAY[1]);                     // the streak-away
  const blow = 1 + 1.6 * inCubic(seg(t, T_AWAY[0] + 0.2, T_AWAY[1]));
  const w0 = lerp(G.pw * SC0, G.vw, ox);
  return {
    ox, oy, k, w: w0 * blow, h: lerp(G.ph * SC0, G.vh, oy) * blow,
    r: lerp(G.ph * SC0 / 2, G.vr, oy), rim: lerp(G.rim * SC0, Math.max(1.5, 0.2 * S.u), ox),
    fy: cy + (G.vy0 + G.vh / 2 - cy) * oy,                  // the viewport's centre
    spread: w0 / (G.pw * SC0)                               // how far the links' row has spread
  };
}
/** Process on the opening pill (its baseline centre, in frame px) */
function hotAt(S, G, t) {
  return { x: S.W / 2 + (G.strip1 + G.rel[HOT]) * openAt(S, G, t).spread * SC0, y: S.H / 2 + G.size * 0.36 * SC0 };
}

/* Process, the link that was chosen, does not let go with the others: it
   drops out of the opening pill and docks along the HUD's baseline as the
   value of HEADING · PROCESS, landing on the lock. On the way it tracks out
   from the site's link type to the HUD's spacing and turns to capitals a
   letter at a time (Process and PROCESS have the same seven letters); its
   underline retracts as it leaves. */
function flyer(ctx, S, G, t) {
  if (t < T_FLY || t >= T_LOCK) return;
  const p = seg(t, T_FLY, T_LOCK);
  const L0 = layout(ctx, NAV[HOT], { size: G.size, weight: 600, tracking: 0.02 });
  const L1 = layout(ctx, LABELS[1][1], labelFont(G));
  const V = hudGeo(S, G), P1 = { x: V.xr - L1.width / 2, y: V.bot };
  const P0 = hotAt(S, G, t), e = FLY_E(p), ie = 1 - e;
  const qx = lerp(P0.x, P1.x, 0.12), qy = P1.y;                // drop, then dock along the baseline
  const x = ie * ie * P0.x + 2 * ie * e * qx + e * e * P1.x;
  const y = ie * ie * P0.y + 2 * ie * e * qy + e * e * P1.y;
  // its size in frame px, from the link's (as the pill set it) to the label's; the
  // scales are taken against the whole-pixel sizes the fonts are actually set at,
  // so it never dips under either end
  const f0 = Math.round(G.size), f1 = Math.round(G.lab);
  const hs = lerp(f0 * SC0, f1, e);
  const s0 = hs / f0, s1 = hs / f1;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = UI.ink; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const n = L1.chars.length;
  for (let i = 0; i < n; i++) {
    // where this letter sits: in the link's spacing, drawn out to the label's
    const gx = lerp((L0.xs[i] - L0.width / 2) * SC0, L1.xs[i] - L1.width / 2, e);
    const m = seg(p, 0.3 + 0.045 * i, 0.4 + 0.045 * i, inOutQuad);   // lower case → capital
    if (m < 1) {
      ctx.save(); ctx.translate(gx, 0); ctx.scale(s0, s0);
      ctx.font = L0.font; ctx.globalAlpha = 1 - m; ctx.fillText(L0.chars[i], 0, 0);
      ctx.restore();
    }
    if (m > 0) {
      ctx.save(); ctx.translate(gx, 0); ctx.scale(s1, s1);
      ctx.font = L1.font; ctx.globalAlpha = m; ctx.fillText(L1.chars[i], 0, 0);
      ctx.restore();
    }
  }
  // the underline, retracting to its centre as the word leaves the pill
  const ul = 1 - navE(seg(p, 0, 0.45));
  if (ul > 0) {
    const w0 = L0.width * SC0;
    ctx.globalAlpha = ul;
    ctx.fillRect(-w0 / 2 * ul, G.size * 0.94 * SC0, w0 * ul, Math.max(1, G.size * 0.12 * SC0));
  }
  ctx.restore();
}

// ── the mission title ──────────────────────────────────────────────────────
/** chrome for the Land of Hope title: bright over the top, a cold-warm glint, a darker foot */
function chrome(ctx, y, cap) {
  const g = ctx.createLinearGradient(0, y - cap, 0, y);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.46, '#e9e7e0'); g.addColorStop(0.5, '#cfdcf5');
  g.addColorStop(0.55, '#b9b7b0'); g.addColorStop(1, '#8c8a83');
  return g;
}

/* Glyph-by-glyph type-on across runs of text: each glyph lands white-hot and
   cools to its colour; a thin caret leads, then blinks on the eighths. */
function typeRuns(ctx, S, runs, t, t0, cps) {
  let idx = 0, caret = null, last = null;
  for (const R of runs) {
    const L = layout(ctx, R.str, R.f);
    ctx.save();
    ctx.font = L.font; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    for (let i = 0; i < L.chars.length; i++, idx++) {
      const age = t - (t0 + idx / cps);
      if (age < 0) { if (!caret && age > -0.14) caret = [R.x + L.xs[i], R.y, R.f.size]; continue; }
      const ch = L.chars[i];
      if (ch === ' ') continue;
      const x = R.x + L.xs[i];
      ctx.globalAlpha = R.alpha * (age < 0.03 ? 0.6 : 1);
      ctx.fillStyle = R.fill; ctx.fillText(ch, x, R.y);
      const hot = 1 - seg(age, 0, 0.22, outQuad);
      if (hot > 0) { ctx.globalAlpha = R.alpha * hot * 0.9; ctx.fillStyle = '#ffffff'; ctx.fillText(ch, x, R.y); }
    }
    ctx.restore();
    last = [R.x + L.width + R.f.size * 0.12, R.y, R.f.size, R.alpha];
  }
  const done = t0 + idx / cps;
  if (!caret && last && t < done + 0.94) {
    const blink = Math.floor((t - done) / (B / 2)) % 2 === 0;
    if (blink) caret = last;
  }
  if (caret) {
    const [x, y, s] = caret, a = runs[0].alpha;
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = UI.ink;
    ctx.fillRect(x + s * 0.04, y - s * 0.74, Math.max(1, s * 0.06), s * 0.86);
    ctx.restore();
  }
}

function titleBlock(ctx, S, G, cx, cy, t, alpha) {
  if (alpha <= 0 || t < T_EYEBROW[0]) return;
  const u = S.u;
  // the title's lines
  const capA = G.tA * 0.7;
  let runs;
  if (G.tall) {
    const yA = cy - 0.6 * u, yB = yA + G.tB * 1.55;
    runs = [
      { str: TITLE_A, f: G.fA, x: cx - G.wA / 2, y: yA, fill: chrome(ctx, yA, capA), alpha },
      { str: TITLE_B, f: G.fB, x: cx - G.wB / 2, y: yB, fill: UI.ink, alpha }
    ];
  } else {
    const all = G.wA + G.space + G.wB, x0 = cx - all / 2, y = cy + capA * 0.5;
    runs = [
      { str: TITLE_A, f: G.fA, x: x0, y, fill: chrome(ctx, y, capA), alpha },
      { str: TITLE_B, f: G.fB, x: x0 + G.wA + G.space, y, fill: UI.ink, alpha }
    ];
  }
  typeRuns(ctx, S, runs, t, T_TYPE, CPS);
  // the eyebrow, typed in mono above
  const top = runs[0].y - capA - G.eyeGap;
  const mw = monoWidth(ctx, EYEBROW, G.monoS);
  const er = seg(t, T_EYEBROW[0], T_EYEBROW[1]);
  mono(ctx, S, EYEBROW, cx - mw / 2, top, { size: G.monoS, color: '#bdbbb3', alpha, reveal: er, cursor: er < 1 });
  // the operator, between two rules
  const last = runs[runs.length - 1];
  const ny = last.y + G.nameGap;
  const np = seg(t, T_NAME, T_NAMED, siteE);
  if (np > 0) {
    const trk = lerp(0.6, 0.32, np);
    const nw = layout(ctx, NAME, { size: G.nameS, weight: 700, tracking: trk }).width;
    text(ctx, S, NAME, cx, ny, { size: G.nameS, weight: 700, tracking: trk, color: UI.ink, align: 'center', alpha: alpha * seg(t, T_NAME, T_NAME + 0.25) });
    const gapx = nw / 2 + 2 * u * G.g, rl = (G.tall ? 7 : 5) * u * np;
    ctx.save();
    ctx.globalAlpha *= alpha * 0.9;
    const yl = ny - G.nameS * 0.36;
    ctx.fillStyle = metal(ctx, cx - gapx - rl, yl, cx + gapx + rl, yl, 0.35 + t * 0.08, 14 * u);
    ctx.fillRect(cx - gapx - rl, yl, rl, Math.max(1, 0.12 * u));
    ctx.fillRect(cx + gapx, yl, rl, Math.max(1, 0.12 * u));
    ctx.restore();
  }
}

// ── the stars ──────────────────────────────────────────────────────────────
/* kit3's field, seeded exactly as space() seeds it. space() draws a star as a
   streak whenever warp > 0.02, and a streak only a pixel or two long barely
   reads — so while the warp is low the same stars are laid over as points,
   fading out as the streaks grow long enough to carry them. */
const STARS = [];
for (let i = 0; i < 700; i++) {
  const b = 0.35 + 0.65 * rng(i, 4) ** 2;
  STARS.push({ x: rng(i, 1) * 2 - 1, y: rng(i, 2) * 2 - 1, z: 0.15 + 0.85 * rng(i, 3), b, fill: `rgba(232,236,255,${b})` });
}
function starPoints(ctx, S, zoom, alpha) {
  if (alpha <= 0.01) return;
  const { W, H } = S, R = Math.max(W, H) * 0.62, cx = W / 2, cy = H / 2, px = Math.max(1, 0.16 * S.u);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const s of STARS) {
    const k = lerp(1, zoom, s.z), x = cx + s.x * R * k, y = cy + s.y * R * k;
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20 || s.b * alpha <= 0.02) continue;
    ctx.fillStyle = s.fill;
    const r = px * (0.5 + s.z * 0.9);
    ctx.fillRect(x - r / 2, y - r / 2, r, r);
  }
  ctx.restore();
}
function stars(ctx, S, t) {
  const warp = starWarp(t), zoom = starZoom(t);
  if (warp < 0.06) { space(ctx, S, { zoom }); return; }       // streaks under a pixel: points read the same
  space(ctx, S, { zoom, warp });
  starPoints(ctx, S, zoom, 1 - smoothstep(0.06, 0.32, warp));
}

/* The finished title card, drawn once per frame size into an offscreen canvas
   (as it stands when the warp takes it), so the streak-away can lay a trail of
   copies without setting the type nine times a frame. */
const CARD = new Map();
function titleCard(S, G) {
  const key = sizeKey(S);
  let C = CARD.get(key);
  if (C) return C;
  const keep = fontsIn();                     // set in a fallback face, it is drawn for this frame only
  const u = S.u, even = x => 2 * Math.ceil(x / 2);
  const w = even(Math.min(S.W, G.vw * 0.96)), h = even((G.tall ? 44 : 26) * u * G.g);
  const tcy = G.vy0 + G.vh / 2;
  C = document.createElement('canvas');
  C.width = w; C.height = h;
  C.oy = tcy - Math.floor(tcy);                 // keep the type on the same sub-pixel as the live card
  const c = C.getContext('2d');
  titleBlock(c, S, G, w / 2, h / 2 + C.oy, T_AWAY[0], 1);
  if (!keep) return C;
  if (CARD.size > 3) CARD.clear();
  CARD.set(key, C);
  return C;
}

// ── time curves ────────────────────────────────────────────────────────────
function starWarp(t) {
  if (t < T_WARP) return 0;
  if (t < T_JUMP) return 0.95 * inQuad(seg(t, T_WARP, T_JUMP));
  if (t < T_BACK[0]) return 0.95;
  return 0.95 * (1 - outCubic(seg(t, T_BACK[0], T_BACK[1])));
}
function starZoom(t) {
  const drift = 0.05 * seg(t, T_OPEN, T_WARP, inOutQuad);
  const surge = 0.45 * inQuad(seg(t, T_WARP, T_JUMP + 0.1));
  const settle = 1 - outCubic(seg(t, T_BACK[0], T_BACK[1]));
  return 1 + (drift + surge) * (t < T_BACK[0] ? 1 : settle);
}

// ── the chapter ────────────────────────────────────────────────────────────
export default {
  id: 'launch',
  title: 'Launch',
  caption: 'The chrome thread pinches into the site’s nav pill, Process lights, and the pill opens into a cockpit viewport: Land of Hope — how it’s made. Then the jump to warp.',
  assets: [],
  models: [],
  still: 4.95,
  sfx: [
    { at: T_PINCH, type: 'whoosh', gain: 0.35, len: 0.5 },
    { at: stepAt(0), type: 'tick', gain: 0.25 },
    { at: stepAt(2), type: 'tick', gain: 0.25 },
    { at: stepAt(4), type: 'tick', gain: 0.25 },
    { at: T_HOT, type: 'tick', gain: 0.6 },
    { at: T_OPEN, type: 'sub', gain: 0.6 },
    { at: T_OPEN + 0.2, type: 'whoosh', gain: 0.3, len: 0.6 },
    { at: T_LOCK, type: 'tick', gain: 0.55 },
    { at: T_JUMP, type: 'riser', gain: 0.55, len: 1.25 },
    { at: T_JUMP, type: 'impact', gain: 0.75 },
    { at: T_BACK[0] + 0.25, type: 'whoosh', gain: 0.45, len: 0.9 }
  ],

  /* The player may call this before the type is in (this chapter needs no
     pictures), so the caches are built only once Cinzel and Archivo load. */
  prepare(S) {
    const build = () => {
      const c = document.createElement('canvas').getContext('2d');
      titleCard(S, geo(c, S));
    };
    if (!document.fonts || !document.fonts.load) { build(); return; }
    Promise.all(FACES.map(f => document.fonts.load(f)))
      .catch(() => {})
      .then(() => { facesSettled = true; build(); });
  },

  draw(ctx, S) {
    const t = S.lt;
    if (t < T_LEAVE || t >= T_REST) { seam(ctx, S); return; }
    const G = geo(ctx, S);
    const { W, H, u } = S, cx = W / 2, cy = H / 2;

    // ── deep space: still, then drifting, then warp ─────────────────────────
    stars(ctx, S, t);

    // ── bar 1: the thread gathers and pinches into the pill ──────────────────
    const pinch = PINCH_E(seg(t, T_PINCH, T_PILL));
    const hl = lerp(W * 0.52, G.pw / 2, pinch);
    const xf = seg(t, T_EYE[0], T_EYE[0] + 0.12);                  // thread → pill hand-over
    if (t < T_EYE[0] + 0.12) {
      wire(ctx, S, c => { c.beginPath(); c.moveTo(cx - hl, cy); c.lineTo(cx + hl, cy); }, { phase: 0, alpha: 1 - xf });
    }

    // the pill's own life: a slow push-in, the press, its metal flowing
    const push = 1 + 0.03 * seg(t, T_EYE[0], T_OPEN, inOutQuad);
    const press = 1 - 0.025 * seg(t, T_PRESS, T_PRESS + 0.09, outCubic);
    const flare = pulse(t, T_HOT, 0.08, T_HOT + 0.5);
    const phase = 0.16 * t + 0.35 * outCubic(seg(t, T_HOT, T_HOT + 0.9));

    if (t >= T_EYE[0] && t < T_OPEN) {
      const eye = EYE_E(seg(t, T_EYE[0], T_EYE[1]));
      const h = lerp(G.wire, G.ph, eye), w = 2 * hl;
      const sc = push * press;
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
      halo(ctx, S, cx, cy, w, h, 0.55 * eye + 0.9 * flare);
      pill(ctx, S, cx, cy, w, h, { rim: Math.min(G.rim, h / 2 - 0.01), phase });
      if (t >= T_LINKS[0]) {
        const la = seg(t, T_LINKS[0], T_LINKS[1], outCubic);
        ctx.save();
        ctx.beginPath(); rr(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.clip();
        links(ctx, S, G, cx, cy + (1 - la) * 0.5 * G.size, t, la, inOutCubic(seg(t, T_WALK, T_HOT + 0.1)), { plate: 1 });
        ctx.restore();
      }
      ctx.restore();
    }
    if (t < T_EYE[1]) gather(ctx, S, G, t);

    // ── bar 2: the pill opens out into the viewport ─────────────────────────
    if (t >= T_OPEN) {
      const O = openAt(S, G, t), { ox, k, w, h, r, rim, fy } = O;
      const plate = 1 - seg(t, T_OPEN + 0.05, T_OPEN + 0.45, inOutQuad);
      const x0 = cx - w / 2, y0 = fy - h / 2;
      const wallA = seg(t, T_OPEN + 0.1, T_OPEN + 0.8, outCubic);
      interior(ctx, S, x0, y0, w, h, Math.min(r, h / 2), 0.9 * wallA);
      glassPane(ctx, S, x0, y0, w, h, Math.min(r, h / 2), wallA * (1 - k));
      if (k < 1) {
        // a highlight runs round the frame as it locks
        const lockRun = 0.3 * outCubic(seg(t, T_LOCK, T_LOCK + 0.8));
        hull(ctx, S, cx, fy, w, h, r, rim, { plate, glow: 0.55 * plate, phase: phase + 0.4 * ox + lockRun, alpha: 1 - seg(t, T_AWAY[1] - 0.15, T_AWAY[1]) });
      }
      // the links ride out on the stretching rim and let go; the row spreads,
      // the type keeps its shape. Process, the one that was chosen, stays lit
      // until it lifts off to become the heading.
      const la = 1 - seg(t, T_OPEN, T_OPEN + 0.24, outQuad), lh = t < T_FLY ? 1 : 0;
      if (la > 0.004 || lh > 0) {
        const trail = [];
        // a sub-frame smear behind the spreading row (copies a quarter-frame apart)
        for (const [dt, a] of [[3 / 240, 0.07], [2 / 240, 0.14], [1 / 240, 0.26]]) if (t - dt > T_OPEN) trail.push([openAt(S, G, t - dt).spread, a]);
        ctx.save();
        ctx.beginPath(); rr(ctx, x0, y0, w, h, Math.min(r, h / 2)); ctx.clip();
        ctx.translate(cx, cy); ctx.scale(SC0, SC0); ctx.translate(-cx, -cy);
        links(ctx, S, G, cx, cy, t, la, 1, { hot: lh, plate, spread: O.spread, trail });
        ctx.restore();
      }
      if (t >= T_FLY && t < T_LOCK) flyer(ctx, S, G, t);
      // the HUD and the title card
      if (t >= T_LOCK - 0.12 && k < 1) {
        hud(ctx, S, G, t, k);
        const tcx = cx, tcy = G.vy0 + G.vh / 2;
        if (k <= 0) titleBlock(ctx, S, G, tcx, tcy, t, 1);
        else {
          // the title rushes past along its own zoom: the card as it stood, with a
          // close trail of fading, growing copies behind it
          const C = titleCard(S, G), ta = 1 - smoothstep(0.08, 0.8, k), zs0 = 1 + 0.9 * inCubic(k);
          const n = 8, spread = 0.012 + 0.03 * k;
          ctx.save();
          for (let g = n; g >= 0; g--) {
            const s = zs0 * (1 + spread * g);
            ctx.globalAlpha = g ? ta * 0.2 * (1 - g / (n + 1)) * Math.min(1, k * 6) : ta;
            ctx.drawImage(C, tcx - C.width / 2 * s, tcy - (C.height / 2 + C.oy) * s, C.width * s, C.height * s);
          }
          ctx.restore();
        }
      }
    }

    // ── bar 3: dropping out of warp onto the still thread ───────────────────
    if (t >= T_BACK[0]) {
      const p = seg(t, T_BACK[0], T_BACK[1] - 0.05, outExpo);
      const half = lerp(0, 0.52 * W, p);
      const ph = -1.4 * (1 - outCubic(seg(t, T_BACK[0], T_SETTLE)));
      const a = seg(t, T_BACK[0], T_BACK[0] + 0.12);
      if (t >= T_SETTLE) wire(ctx, S, c => { c.beginPath(); c.moveTo(-0.02 * W, cy); c.lineTo(1.02 * W, cy); }, { phase: 0 });
      else {
        wire(ctx, S, c => { c.beginPath(); c.moveTo(cx - half, cy); c.lineTo(cx + half, cy); }, { phase: ph, alpha: a });
        // the gathered light runs back out along it, riding the ends and spending itself at the edges
        tips(ctx, S, G, cx, cy, half, a * (1 - seg(p, 0.55, 0.97)));
      }
    }

    // ── the lens: seasoning on the jump only, at rest at both ends ──────────
    const fx = S.fx;
    const jump = t >= T_JUMP ? t - T_JUMP : -1;
    if (t >= T_WARP && t < T_BACK[1]) {
      fx.ab = 0.5 * seg(t, T_WARP + 0.6, T_JUMP, inQuad) * (1 - seg(t, T_JUMP + 0.05, T_JUMP + 0.7));
      fx.shake = 2.2 * seg(t, T_WARP + 0.4, T_JUMP, inQuad) * (1 - seg(t, T_JUMP, T_JUMP + 0.45));
    }
    if (jump >= 0 && jump < 0.7) {
      fx.warp = outQuad(jump / 0.7);
      fx.warpX = 0.5; fx.warpY = 0.5;
    }
    if (jump >= 0 && jump < 0.4) {
      fx.flash = 0.035 * Math.exp(-jump * 16) * (1 - jump / 0.4);
      fx.exposure = 1 + 0.4 * Math.exp(-jump * 9) * (1 - jump / 0.4);
    }
    // the press: a breath of aberration as Process is taken
    if (t >= T_HOT && t < T_OPEN + 0.5) fx.ab = Math.max(fx.ab, 0.12 * pulse(t, T_OPEN, 0.06, T_OPEN + 0.5));
  }
};
