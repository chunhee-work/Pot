/* 3 — Animation. LAND OF HOPE, the original animated universe.

   A tunnel of type in the dark. The corridor is built of portals: every
   three metres a frame of huge words — ANIMATION, EPISODE 01…04, 17 MIN,
   AN ORIGINAL SERIES, 4 EPISODES — set solid and in outline around the
   flight path, each backed in ink so the nearer frames hide the farther ones
   the way walls do. The four episode cards hang in it as billboards on
   alternating sides. The camera slaloms: it swings toward a card, all but
   stops while its title reads, then whips past — on a three-beat grid
   (beats 3, 6, 9, 12), so the passes pull against the bar and resolve on the
   downbeat of bar 4. The last portal, LAND OF HOPE, opens into a dark
   chamber: the runtime counter that has been rolling at the far end since
   the lights came on lunges at the lens and stamps 17 MIN; the camera ducks
   beneath it, the O of HOPE is painted pink, and the camera dives into the
   O's stroke until pink is all there is.

   Portrait keeps the same world turned to the long axis: the long walls and
   the slalom run vertically, the cards hang above and below the path.

   Time map (local s; a beat is 0.469)
     0.00–0.09  ink — out of the previous chapter's letter
     0.09–0.70  the lights come on down the tunnel, near to far
     0.00–1.41  EP 01 swings in on the left; its title reads ~0.4–1.3;
                whip past on beat 3 (whoosh)
     1.41–2.81  EP 02 on the right; past on beat 6
     2.81–4.22  EP 03 on the left; past on beat 9
     4.22–5.63  EP 04 on the right, the counter rolling on toward 17 ahead
     5.63       bar 4: EP 04 goes by as 17 MIN lunges off the back wall and
                stamps (impact + sub, flash, shock ring)
     5.63–6.56  through the LAND OF HOPE portal; hold on 17 MIN /
                OF ORIGINAL ANIMATION over LAND OF HOPE
     6.56       beat 14: the O of HOPE is painted pink (tick)
     6.56–7.25  the dive: under the counter, into the O, a quarter roll
     7.25–7.50  the O's stroke fills the frame — pink (riser into the seam) */
import { FONT, clamp, lerp, seg, smoothstep, outExpo, inOutCubic, inCubic, outCubic, spring } from '../../kit.js';
import { camera, list, rgb } from '../../space.js';
import { BLOCK, BEAT } from '../palette.js';
import { nextColour } from '../timeline.js';

const INK = BLOCK.ink, PAPER = BLOCK.paper, BUTTER = BLOCK.butter;

// ── the beat grid ─────────────────────────────────────────────────────────
const PASS = [3 * BEAT, 6 * BEAT, 9 * BEAT, 12 * BEAT];   // the camera passes each card
const SLAM = PASS[3];                                      // bar 4 downbeat: 17 MIN
const DIVE = 14 * BEAT;                                    // the O goes pink, the dive begins
const DIVE_END = 7.42;
const FILL = 7.4;                                          // from here the frame is the next colour

// ── the world (screen-aligned: +x right, +y down, +z into the frame) ──────
const ZC = [9, 20, 31, 42];          // the card planes
const SIDE = [-1, 1, -1, 1];         // cards alternate along the long axis (first: left / top)
const RING0 = 2.4, RING_DZ = 3.1, RING_LAST = 45.9;
const HOLD_D = 2.8;                  // how close the camera settles to the counter
const Z_COUNT = 50;                  // where the counter lands
const Z_END = 51.5;                  // LAND OF HOPE
const Z_BACK = 58;                   // where the counter rolls until it lunges
const Z_STAMP = 46.8;                // how close it comes to the lens on the downbeat
const FAR = 25;                      // fog: the portals are gone by this depth

const EPS = [
  { src: 'assets/ep1.jpg', no: 'EPISODE 01', title: ['The World &', 'the Relic'] },
  { src: 'assets/ep2.jpg', no: 'EPISODE 02', title: ['The Corruption', 'Spreads'] },
  { src: 'assets/ep3.jpg', no: 'EPISODE 03', title: ['The Squad &', 'the Fall'] },
  { src: 'assets/ep4.jpg', no: 'EPISODE 04', title: ['Hope, Restored'] }
];

// ── type ──────────────────────────────────────────────────────────────────
const REF = 100, CAP = 70;           // fonts are set at 100px; a capital is 70px in both faces
const F900 = `900 ${REF}px ${FONT.sans}`, F800 = `800 ${REF}px ${FONT.sans}`, FSERIF = `700 ${REF}px ${FONT.serif}`;
const widths = new Map();
// metrics are cached only once both faces are in, so a fallback font can never stick
let fontsIn = false;
const fontsReady = () => fontsIn || (fontsIn = typeof document === 'undefined' || !document.fonts ||
  (document.fonts.check(F900) && document.fonts.check(FSERIF)));
function textW(ctx, font, str) {
  const key = font + '|' + str;
  let w = widths.get(key);
  if (w === undefined) {
    ctx.save(); ctx.font = font; ctx.letterSpacing = '0px'; w = ctx.measureText(str).width; ctx.restore();
    if (widths.size > 400) widths.clear();
    if (fontsReady()) widths.set(key, w);
  }
  return w;
}
/** width of `str` in capitals (so width = this × cap height) */
const perCap = (ctx, str, font = F900, track = 0) => (textW(ctx, font, str) + track * REF * ([...str].length - 1)) / CAP;
/** a word whose capitals are `cap` px tall, centred on (x, y) (or aligned left/right), optionally turned */
function word(ctx, str, x, y, cap, o) {
  if (cap < 0.6) return;
  const s = cap / CAP, font = o.font || F900, tr = (o.track || 0) * REF;
  const w = textW(ctx, font, str) + tr * ([...str].length - 1);
  const x0 = o.align === 'left' ? 0 : o.align === 'right' ? -w : -w / 2;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(s, s);
  ctx.font = font;
  ctx.letterSpacing = tr + 'px';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.lw || 2.6; ctx.strokeStyle = o.color; ctx.strokeText(str, x0, CAP / 2); }
  else { ctx.fillStyle = o.color; ctx.fillText(str, x0, CAP / 2); }
  ctx.restore();
}

// ── geometry for a frame size (cached) ────────────────────────────────────
let GEO = null;
function geometry(S, ctx) {
  if (GEO && GEO.W === S.W && GEO.H === S.H) return GEO;
  const port = S.H > S.W;
  const aspect = clamp(Math.max(S.W, S.H) / Math.min(S.W, S.H), 1.25, 2.2);
  const LONG = 1.7, SHORT = LONG / aspect;
  const X = port ? SHORT : LONG, Y = port ? LONG : SHORT;
  const G = { W: S.W, H: S.H, port, X, Y };

  // ── the portals
  const solid = { stroke: false, color: PAPER }, outline = { stroke: true, color: PAPER };
  const butterS = { stroke: false, color: BUTTER }, butterO = { stroke: true, color: BUTTER };
  const longAxis = port ? 'v' : 'h', shortAxis = port ? 'h' : 'v', gap = 0.07;
  G.rings = [];
  for (let r = 0; RING0 + r * RING_DZ <= RING_LAST; r++) {
    const z = RING0 + r * RING_DZ, last = RING0 + (r + 1) * RING_DZ > RING_LAST;
    const thin = !last && r % 4 === 3;
    const k = ZC.findIndex(zc => z < zc);
    const ep = 'EPISODE 0' + (k < 0 ? 4 : k + 1);
    const sides = [];
    const put = (str, along, pos, style, capMax) => {
      // along 'h': top / bottom, upright; 'v': left / right, turned to read along the wall
      const len = along === 'h' ? 2 * X : 2 * Y;
      const cap = Math.min(capMax, 0.95 * len / perCap(ctx, str));
      const off = (along === 'h' ? Y : X) + gap + cap / 2;
      sides.push({ str, cap, x: along === 'h' ? 0 : pos * off, y: along === 'h' ? pos * off : 0,
        rot: along === 'h' ? 0 : pos * Math.PI / 2, ...style });
    };
    if (last) {
      // the gateway into the chamber
      put('LAND OF HOPE', longAxis, -1, butterS, 0.5); put('LAND OF HOPE', longAxis, 1, butterS, 0.5);
      put('4 EPISODES', shortAxis, -1, outline, 0.3); put('4 EPISODES', shortAxis, 1, outline, 0.3);
    } else if (thin) {
      put('AN ORIGINAL SERIES', longAxis, -1, solid, 0.21); put('AN ORIGINAL SERIES', longAxis, 1, solid, 0.21);
      put('4 EPISODES', shortAxis, -1, butterO, 0.21); put('4 EPISODES', shortAxis, 1, butterO, 0.21);
    } else {
      const odd = r % 2 === 1;
      put(odd ? ep : 'ANIMATION', longAxis, -1, odd ? outline : (r % 4 === 0 ? butterS : solid), 0.5);
      put(odd ? 'ANIMATION' : ep, longAxis, 1, odd ? solid : outline, 0.5);
      put('17 MIN', shortAxis, -1, r % 4 === 1 ? butterS : butterO, 0.5);
      put('17 MIN', shortAxis, 1, butterO, 0.5);
    }
    const T = Math.max(...sides.map(s => s.cap)) + 2 * gap;
    G.rings.push({ z, T, sides, r });
  }

  // ── the cards: a 16:9 image over its caption (EPISODE nn, then the title in Cinzel)
  const cw = port ? Math.min(2 * X * 0.94, 1.5) : 2.0, ch = cw * 506 / 900;
  const widest = Math.max(...EPS.flatMap(e => e.title).map(l => perCap(ctx, l, FSERIF)));
  const tcap = Math.min(0.085 * cw, 0.94 * cw / widest), lcap = 0.038 * cw;
  const capH = 0.07 * cw + lcap + 0.05 * cw + 2 * tcap * 1.45;
  const block = ch + capH;
  G.card = { w: cw, h: ch, tcap, lcap, capH };
  G.cards = EPS.map((e, i) => {
    const s = SIDE[i];
    const bx = port ? 0 : s * (X - cw / 2 - 0.05);
    const by = port ? s * (Y - block / 2 - 0.12) : 0;
    return { ...e, i, z: ZC[i], x: bx, y: by - block / 2 + ch / 2 };   // (x, y): the image centre
  });
  G.sway = port ? 0.55 : 0.58;

  // ── the chamber: laid out for the frame the camera holds on, so the counter
  // (near) and LAND OF HOPE (behind it) sit where they should despite parallax
  const F = 1.1 * Math.min(S.W, S.H), hw = 0.5 * S.W / F, hh = 0.5 * S.H / F;   // half frame, in units of F
  const dC = HOLD_D, dE = HOLD_D + (Z_END - Z_COUNT);
  if (!port) {
    const hy = -0.3;
    const c1 = Math.min(0.5 * hh * dC, 0.8 * 2 * hw * dC / perCap(ctx, '00 MIN'));
    const y1 = hy - 0.4 * hh * dC;
    const sub = Math.min(0.068 * hh * dC, 0.9 * 2 * hw * dC / perCap(ctx, 'OF ORIGINAL ANIMATION', F800, 0.26));
    G.hold = { x: 0, y: hy };
    G.count = { stack: false, y: y1, cap1: c1 };
    G.sub = { cap: sub, lines: ['OF ORIGINAL ANIMATION'], dy: c1 * 0.72 + sub / 2 };
    G.hope = { cap: Math.min(0.28 * hh * dE, 0.7 * 2 * hw * dE / perCap(ctx, 'HOPE')), y: hy + 0.5 * hh * dE };
    G.land = { cap: 0.066 * hh * dE, y: hy + 0.285 * hh * dE };
  } else {
    const hy = -0.35;
    const c1 = Math.min(0.3 * hh * dC, 0.8 * 2 * hw * dC / perCap(ctx, '00'));
    const c2 = Math.min(0.55 * c1, 0.8 * 2 * hw * dC / perCap(ctx, 'MIN'));
    const y1 = hy - 0.5 * hh * dC;
    const sub = Math.min(0.036 * hh * dC, 0.9 * 2 * hw * dC / perCap(ctx, 'OF ORIGINAL', F800, 0.26));
    G.hold = { x: 0, y: hy };
    G.count = { stack: true, y: y1, cap1: c1, cap2: c2, dy2: c1 * 0.65 + c2 * 0.5 };
    G.sub = { cap: sub, lines: ['OF ORIGINAL', 'ANIMATION'], dy: c1 * 0.65 + c2 + 0.3 * c2 + sub / 2 };
    G.hope = { cap: Math.min(0.13 * hh * dE, 0.8 * 2 * hw * dE / perCap(ctx, 'HOPE')), y: hy + 0.38 * hh * dE };
    G.land = { cap: 0.036 * hh * dE, y: hy + 0.25 * hh * dE };
  }
  // the O of HOPE, where the camera ends: the centre of its left stroke
  const hc = G.hope.cap;
  G.hope.x0 = -perCap(ctx, 'HOPE') * hc / 2;
  G.hope.xO = G.hope.x0 + perCap(ctx, 'H') * hc;
  G.hope.xPE = G.hope.x0 + perCap(ctx, 'HO') * hc;
  // measured on Archivo 900: the O's left stroke is centred 0.224 caps in from
  // the glyph's origin and is 0.32 caps thick at mid-height (kept inside that)
  G.target = { x: G.hope.xO + 0.224 * hc, y: G.hope.y, hw: 0.13 * hc, hh: 0.22 * hc };
  if (fontsReady()) GEO = G;
  return G;
}

// ── the camera ────────────────────────────────────────────────────────────
// depth: Hermite keys (t, z, speed) — fast through each pass, nearly still
// while a title reads; then a dive into the O, eased in log-distance
const READ = 0.62, RD = 2.6;
const KEYS = [[0, 0, 8]];
PASS.forEach((t, i) => KEYS.push([t - READ, ZC[i] - RD, 1.3], [t, ZC[i], 10.5]));
KEYS.push([DIVE, Z_COUNT - HOLD_D, 1.1]);
const D0 = Z_END - (Z_COUNT - HOLD_D), D1 = 0.004;
const A_LIN = 1.1 * (DIVE_END - DIVE) / (D0 * Math.log(D0 / D1));

function depth(t) {
  if (t >= DIVE) {
    const u = clamp((t - DIVE) / (DIVE_END - DIVE));
    const e = A_LIN * u + (1 - A_LIN) * u * u * u;
    return { z: Z_END - D0 * Math.pow(D1 / D0, e), v: 0, u };
  }
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, z0, v0] = KEYS[i], [t1, z1, v1] = KEYS[i + 1];
  const h = t1 - t0, s = clamp((t - t0) / h), s2 = s * s, s3 = s2 * s;
  return {
    z: (2 * s3 - 3 * s2 + 1) * z0 + (s3 - 2 * s2 + s) * h * v0 + (-2 * s3 + 3 * s2) * z1 + (s3 - s2) * h * v1,
    v: (6 * s2 - 6 * s) * (z0 - z1) / h + (3 * s2 - 4 * s + 1) * v0 + (3 * s2 - 2 * s) * v1,
    u: 0
  };
}

// the slalom across the long axis: on the far side of each card as it passes
const SWAY = [[0, -0.3], [PASS[0], 1], [PASS[1], -1], [PASS[2], 1], [PASS[3], -1], [PASS[3] + 0.7, 0]];
const sine = t => 0.5 - 0.5 * Math.cos(Math.PI * t);
function sway(t) {
  let i = 0;
  while (i < SWAY.length - 2 && t > SWAY[i + 1][0]) i++;
  const [t0, a] = SWAY[i], [t1, b] = SWAY[i + 1];
  return lerp(a, b, sine(clamp((t - t0) / (t1 - t0))));
}

function cameraAt(S, G, lt) {
  const D = depth(lt);
  const A = G.sway, L = A * sway(lt), dL = A * (sway(lt + 0.01) - sway(lt - 0.01)) / 0.02;
  const settle = smoothstep(PASS[3] - 0.1, PASS[3] + 0.7, lt);
  const bob = 0.07 * Math.sin(lt * 2.6);
  let x = G.port ? bob : L, y = G.port ? L : bob;
  // after the last card: settle under the counter, then line up on the O's stroke
  x = lerp(x, G.hold.x, settle); y = lerp(y, G.hold.y, settle);
  const aim = inOutCubic(clamp(D.u / 0.7));
  x = lerp(x, G.target.x, aim); y = lerp(y, G.target.y, aim);
  // bank into the slalom
  let roll = ((G.port ? 0.03 : -0.08) * dL + 0.03 * Math.sin(lt * 1.7)) * (1 - settle);
  // a wind-up the other way while the lockup holds, then a quarter roll through the dive
  roll -= 0.07 * inOutCubic(seg(lt, SLAM + 0.3, DIVE + 0.1));
  roll += (Math.PI / 2) * inOutCubic(clamp((D.u - 0.05) / 0.8));
  // the lens opens a touch as the speed builds
  const zoom = 1.1 - 0.15 * clamp(D.v / 10.5) * (1 - settle);
  return camera(S, { x, y, z: D.z, roll, zoom, near: 0.003 });
}

// ── light ─────────────────────────────────────────────────────────────────
// the tunnel switches on from the lens outward; each light overshoots to butter
function ignite(lt, z) {
  const t0 = 0.085 + Math.max(0, z - 3) * 0.0105;
  return { on: outExpo(seg(lt, t0, t0 + 0.12)), flare: lt < t0 ? 0 : 1 - seg(lt, t0 + 0.04, t0 + 0.38) };
}
/** the portals throb with the kick: a quick lift on every beat while the cards run */
function kick(lt) {
  if (lt < 0.4 || lt > SLAM) return 1;
  const q = (lt % BEAT) / BEAT;
  return 0.84 + 0.16 * Math.exp(-q * 9);
}
const fogAt = d => smoothstep(4, FAR, d);
/** a colour lit to `vis` (0 = lost in the ink), with a butter flare on top */
function lit(base, vis, flare) {
  const A = rgb(base), B = rgb(BUTTER), K = rgb(INK), f = flare > 0.01 ? flare * 0.8 : 0, v = clamp(vis);
  const ch = i => Math.round(lerp(K[i], lerp(A[i], B[i], f), v));
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}

// ── the pieces ────────────────────────────────────────────────────────────
function drawRing(ctx, S, G, ring, p, lt, frameR) {
  const k = p.k, { X, Y } = G, T = ring.T;
  // nothing to draw once its inner edge has cleared the frame
  if (Math.min(X, Y) * k - Math.hypot(p.x - S.W / 2, p.y - S.H / 2) > frameR) return;
  const ig = ignite(lt, ring.z);
  const vis = ig.on * (1 - fogAt(p.d)) * kick(lt);
  if (vis < 0.01) return;
  // the ink walls behind the words: nearer portals hide the farther ones
  ctx.fillStyle = INK;
  ctx.fillRect(-(X + T) * k, -(Y + T) * k, 2 * (X + T) * k, T * k);
  ctx.fillRect(-(X + T) * k, Y * k, 2 * (X + T) * k, T * k);
  ctx.fillRect(-(X + T) * k, -Y * k, T * k, 2 * Y * k);
  ctx.fillRect(X * k, -Y * k, T * k, 2 * Y * k);
  for (const s of ring.sides) {
    word(ctx, s.str, s.x * k, s.y * k, s.cap * k, { rot: s.rot, stroke: s.stroke, lw: 2.6, color: lit(s.color, vis, ig.flare) });
  }
}

function drawCard(ctx, S, G, c, p, lt) {
  const k = p.k, C = G.card, w = C.w * k, h = C.h * k;
  if (w < 2 || w > S.W * 12) return;
  const ig = ignite(lt, c.z);
  const vis = ig.on * (1 - fogAt(p.d));
  if (vis < 0.01) return;
  const img = S.img(c.src);
  // whipping past: a smear of where it was a few milliseconds ago, like a shutter left open
  const q = PASS[c.i] - lt;
  if (img && img.width && q > 0 && q < 0.3) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let j = 5; j >= 1; j--) {
      const cam = cameraAt(S, G, lt - j * 0.0075), g = cam.project(c.x, c.y, c.z);
      if (!g) continue;
      const gw = C.w * g.k, gh = C.h * g.k;
      if (gw > S.W * 12) continue;
      ctx.setTransform(Math.cos(cam.roll), Math.sin(cam.roll), -Math.sin(cam.roll), Math.cos(cam.roll), g.x, g.y);
      ctx.globalAlpha = (0.3 - j * 0.05) * vis * (1 - q / 0.3);
      ctx.drawImage(img, -gw / 2, -gh / 2, gw, gh);
    }
    ctx.restore();
  }
  // the plate it hangs on, so the portals behind stop at its edge
  ctx.fillStyle = INK;
  ctx.fillRect(-w / 2, -h / 2, w, h + C.capH * k);
  if (img && img.width) ctx.drawImage(img, -w / 2, -h / 2, w, h);
  if (vis < 1) { ctx.globalAlpha = 1 - vis; ctx.fillStyle = INK; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.globalAlpha = 1; }
  ctx.strokeStyle = lit(PAPER, vis * 0.85, ig.flare);
  ctx.lineWidth = Math.max(1, 0.007 * k);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  // caption: EPISODE nn in butter, the title in Cinzel
  const y0 = h / 2 + 0.07 * C.w * k;
  word(ctx, c.no, 0, y0 + C.lcap * k / 2, C.lcap * k, { font: F800, track: 0.32, color: lit(BUTTER, vis, 0) });
  let y = y0 + C.lcap * k + 0.05 * C.w * k + C.tcap * k / 2;
  for (const line of c.title) {
    word(ctx, line, 0, y, C.tcap * k, { font: FSERIF, color: lit(PAPER, vis, 0) });
    y += C.tcap * 1.45 * k;
  }
}

/** the runtime counter: two rolling digits and MIN */
function drawCounter(ctx, S, G, k, v, solid, vis) {
  const Cn = G.count, col = lit(solid ? BUTTER : PAPER, vis, 0);
  const n = Math.floor(v + 1e-6), roll = smoothstep(0.45, 1, v - n);
  const digits = (cap, cx) => {
    const s = cap * k, dw = perCap(ctx, '0') * s, x0 = cx - dw;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 - s, -s * 0.62, dw * 2 + 2 * s, s * 1.24); ctx.clip();
    const tens = [Math.floor(n / 10) % 10, Math.floor((n + 1) / 10) % 10], ones = [n % 10, (n + 1) % 10];
    const tr = tens[0] !== tens[1] ? roll : 0;
    const one = (d, x, off) => word(ctx, String(d), x, off * s * 1.3, s, { color: col, stroke: !solid });
    one(tens[0], x0 + dw / 2, -tr); if (tr > 0) one(tens[1], x0 + dw / 2, 1 - tr);
    one(ones[0], x0 + dw * 1.5, -roll); if (roll > 0) one(ones[1], x0 + dw * 1.5, 1 - roll);
    ctx.restore();
  };
  if (Cn.stack) {
    digits(Cn.cap1, 0);
    word(ctx, 'MIN', 0, Cn.dy2 * k, Cn.cap2 * k, { color: col, stroke: !solid });
  } else {
    const s = Cn.cap1 * k, wd = perCap(ctx, '00') * s, wm = perCap(ctx, ' MIN') * s, x0 = -(wd + wm) / 2;
    digits(Cn.cap1, x0 + wd / 2);
    word(ctx, ' MIN', x0 + wd, 0, s, { align: 'left', color: col, stroke: !solid });
  }
}

function subline(ctx, G, k, lt, vis) {
  const Sb = G.sub;
  let y = Sb.dy;
  G.sub.lines.forEach((line, i) => {
    const a = seg(lt, SLAM + 0.14 + i * 0.08, SLAM + 0.44 + i * 0.08, outCubic);
    if (a > 0) word(ctx, line, 0, (y + (1 - a) * Sb.cap * 0.8) * k, Sb.cap * k, { font: F800, track: 0.26, color: lit(PAPER, vis, 0), alpha: a });
    y += Sb.cap * 1.75;
  });
}

function drawEnd(ctx, S, G, p, lt, pink) {
  const k = p.k, Hp = G.hope, ig = ignite(lt, 30);
  const vis = ig.on * (1 - 0.7 * smoothstep(10, 55, p.d));
  if (vis < 0.01) return;
  word(ctx, 'LAND OF', 0, G.land.y * k, G.land.cap * k, { font: FSERIF, track: 0.34, color: lit(PAPER, vis, 0) });
  const cap = Hp.cap * k, y = Hp.y * k, col = lit(PAPER, vis, 0);
  word(ctx, 'H', Hp.x0 * k, y, cap, { align: 'left', color: col });
  word(ctx, 'PE', Hp.xPE * k, y, cap, { align: 'left', color: col });
  // the O: paper, painted pink from the bottom up on beat 14
  const paint = seg(lt, DIVE - 0.03, DIVE + 0.13, outCubic);
  if (paint < 1) word(ctx, 'O', Hp.xO * k, y, cap, { align: 'left', color: col });
  if (paint > 0) {
    ctx.save();
    const bottom = y + cap * 0.62, hgt = cap * 1.3 * paint;
    ctx.beginPath(); ctx.rect(Hp.xO * k - cap, bottom - hgt, cap * 3, hgt); ctx.clip();
    word(ctx, 'O', Hp.xO * k, y, cap, { align: 'left', color: pink });
    ctx.restore();
  }
}

// is the whole frame inside the O's stroke? (then the stroke is all there is)
function covered(S, G, cam) {
  const T = G.target, p = cam.project(T.x, T.y, Z_END);
  if (!p) return false;
  const hw = T.hw * p.k, hh = T.hh * p.k, c = Math.cos(cam.roll), s = Math.sin(cam.roll);
  for (const [fx, fy] of [[0, 0], [S.W, 0], [0, S.H], [S.W, S.H]]) {
    const dx = fx - p.x, dy = fy - p.y, u = dx * c + dy * s, v = -dx * s + dy * c;
    if (Math.abs(u) > hw || Math.abs(v) > hh) return false;
  }
  return true;
}

// ── the lens ──────────────────────────────────────────────────────────────
function lens(S, lt, at) {
  const fx = S.fx;
  if (lt < 0.2 || lt > 7.3) return;
  for (let i = 0; i < 3; i++) {
    const q = lt - PASS[i];
    if (q > -0.12 && q < 0.4) {
      const a = q < 0 ? smoothstep(-0.12, 0, q) : 1 - smoothstep(0, 0.4, q);
      fx.ab = Math.max(fx.ab, 0.45 * a);
      fx.shake = Math.max(fx.shake, 0.3 * S.u * a);
    }
  }
  const q = lt - SLAM;
  if (q >= 0 && q < 0.6) {
    fx.flash = Math.max(fx.flash, 0.07 * Math.pow(1 - seg(q, 0, 0.12), 2));
    fx.exposure = 1 + 0.55 * Math.pow(1 - seg(q, 0, 0.35), 2);
    fx.ab = Math.max(fx.ab, 0.7 * (1 - seg(q, 0, 0.5, outCubic)));
    fx.shake = Math.max(fx.shake, 1.0 * S.u * Math.pow(1 - seg(q, 0, 0.45), 2));
    fx.warp = lerp(0.1, 1, seg(q, 0, 0.6)); fx.warpX = at[0]; fx.warpY = at[1];
  }
  // the dive: the edges tear a little as it accelerates, calm again before the colour lands
  if (lt > DIVE + 0.2) fx.ab = Math.max(fx.ab, 0.3 * Math.sin(Math.PI * seg(lt, DIVE + 0.2, 7.26)));
}

// ── the chapter ───────────────────────────────────────────────────────────
const scene = {
  id: 'animation',
  title: 'Animation',
  caption: 'Land of Hope: a tunnel of giant type in the dark, the four episode cards whipping past as billboards, a counter stamping 17 MIN, and a dive into the pink O of HOPE.',
  bg: BLOCK.ink,
  assets: EPS.map(e => e.src),
  models: [],
  still: 0.95,
  sfx: [
    { at: PASS[0] - 0.03, type: 'whoosh' },
    { at: PASS[1] - 0.03, type: 'whoosh' },
    { at: PASS[2] - 0.03, type: 'whoosh' },
    { at: SLAM, type: 'impact' },
    { at: SLAM, type: 'sub' },
    { at: DIVE, type: 'tick' },
    { at: FILL, type: 'riser', gain: 0.4 }
  ],
  draw(ctx, S) {
    const lt = S.lt, pink = nextColour(scene);
    if (lt < 0.09) return;                               // the ink we came in on
    if (lt >= FILL) { ctx.fillStyle = pink; ctx.fillRect(0, 0, S.W, S.H); return; }
    const G = geometry(S, ctx);
    const cam = cameraAt(S, G, lt);
    const frameR = Math.hypot(S.W, S.H) / 2;

    const L = list();
    for (const ring of G.rings) {
      const d = ring.z - cam.z;
      if (d > 0.2 && d < FAR) L.custom(ring.z, (c, p) => drawRing(c, S, G, ring, p, lt, frameR));
    }
    for (const card of G.cards) {
      const d = card.z - cam.z;
      if (d > 0.04 && d < FAR) L.custom(card.z, (c, p) => drawCard(c, S, G, card, p, lt), { x: card.x, y: card.y });
    }
    L.custom(Z_END, (c, p) => drawEnd(c, S, G, p, lt, pink));
    // the counter rolls on the back wall, lunges at the lens on the downbeat, recoils
    const v = 17 * clamp(0.3 * seg(lt, 0.35, SLAM - 0.14) + 0.7 * seg(lt, 0.35, SLAM - 0.14, inCubic));
    const zc = lt < SLAM ? lerp(Z_BACK, Z_STAMP, seg(lt, SLAM - 0.2, SLAM, inCubic))
      : lerp(Z_STAMP, Z_COUNT, spring(lt - SLAM, 1.3, 7.5));
    let at = [0.5, 0.3];
    if (zc - cam.z > 0.2) {
      L.custom(zc, (c, p) => {
        const vis = ignite(lt, 30).on * (1 - 0.7 * smoothstep(10, 55, p.d));
        drawCounter(c, S, G, p.k, v, lt >= SLAM, vis);
        if (lt >= SLAM) subline(c, G, p.k, lt, vis);
        at = [clamp(p.x / S.W, 0.1, 0.9), clamp(p.y / S.H, 0.1, 0.9)];
      }, { x: 0, y: G.count.y });
    }
    L.draw(ctx, S, cam);

    // the O's stroke has swallowed the frame: from here it is only pink
    if (lt > DIVE && covered(S, G, cam)) { ctx.fillStyle = pink; ctx.fillRect(0, 0, S.W, S.H); return; }
    lens(S, lt, at);
  }
};
export default scene;
