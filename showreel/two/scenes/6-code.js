/* 6 — Code. Gacha, the live game at gacha.thechillgallery.com: its UI/UX
   designed and prototyped with Claude Code, then adopted by engineering as
   the working spec.

   One dolly down +z through four stations, each a formation of the game's
   real screens around a word, each landing on a bar line:
     bar 1  out of the teal: the chrome G spins in over GACHA, the address types on
     bar 2  through the counter of the C onto a design canvas — DESIGNED. — the
            screens snap into artboards on the beat, guides draw, a selection hops
     bar 3  the word splits, the grid parts and the camera flies through it onto a
            prototype flow — PROTOTYPED. — linked screen to screen on the beats
     bar 4  through the O onto the live pack — SHIPPED. — the screens fan out of
            it like pulled cards, the I is painted butter and the camera dives
            into it until butter is all there is.
   Type is ink on the teal, the accents paper. The screens are rendered once
   into rounded device panels and drawn as images. */
import {
  FONT, clamp, lerp, seg, rng, noise1, TAU,
  linear, outExpo, outCubic, inQuad, inOutCubic, inOutQuad, outBack, whip,
  cover, rrect, layout
} from '../../kit.js';
import { camera, list } from '../../space.js';
import { BLOCK, BEAT, BAR } from '../palette.js';
import { nextColour } from '../timeline.js';

const TEAL = BLOCK.teal, INK = BLOCK.ink, PAPER = BLOCK.paper, BUTTER = BLOCK.butter;
const B = BEAT;

// ── the world ─────────────────────────────────────────────────────────────
const ZOOM = 0.9, D = 100 * ZOOM;              // at distance D one world unit is one S.u
const Z1 = 0, Z2 = 230, Z3 = 460, Z4 = 690;    // the four stations down the dolly
const FOG = { near: D * 1.5, far: D * 4.2 };

// ── the clock, in local seconds ───────────────────────────────────────────
const T = {
  open: 0.1,                                    // pure teal until here
  lock: B,                                      // GACHA locks
  cGo: 1.26, cPass: BAR - 0.14, land2: BAR + 0.24,   // into the C, through it, brake onto the bar
  snap: [BAR + B / 2, BAR + B],                 // the artboards snap in, two groups
  guides: BAR + B,
  sel: [BAR + 1.5 * B, BAR + 2 * B, BAR + 2.5 * B],   // the selection hops
  part: 2 * BAR - 0.66, dPass: 2 * BAR - 0.14, land3: 2 * BAR + 0.24,
  flow: 2 * BAR + 0.04,                         // the flow's screens rise in, a 16th apart
  link: [2 * BAR + B, 2 * BAR + 2 * B, 2 * BAR + 3 * B],  // the three prototype links
  oGo: 3 * BAR - 0.62, oPass: 3 * BAR - 0.14, land4: 3 * BAR + 0.24,
  fan: 3 * BAR + B / 2,                         // the screens fan out of the pack
  paint: 3 * BAR + B,                           // the I is painted butter
  dive: 3 * BAR + 2 * B,                        // and the camera goes for it
  cover: 7.4                                    // butter is all there is
};

// ── the screens ───────────────────────────────────────────────────────────
const SHOT = k => `assets/g-${k}.jpg`;
const KEYS = ['home', 'packs', 'reveal', 'vault', 'battle', 'leaderboard', 'codex', 'skills', 'forge', 'ledger', 'settings', 'guide'];
const PACK = 'assets/gameui/pack2-f7d2ed7b.webp';
const PACK_SRC = [505, 195, 270, 340];          // the pack with its "tap to open" and its line
const PACK_AR = PACK_SRC[2] / PACK_SRC[3];
const AR = { l: 1.31, p: 0.78 };                // a panel on a monitor, a panel on a phone
const FOCUS = { guide: [[0.79, 0.5], [0.735, 0.5]] };   // crop focus [landscape, portrait]
const HOT = { home: 0.275, packs: 0.392, reveal: 0.468 };  // their real buttons, down the panel
const FLOW = ['home', 'packs', 'reveal', 'vault'];
const FAN = ['vault', 'battle', 'leaderboard', 'codex', 'skills', 'ledger'];
const URL = 'gacha.thechillgallery.com';

// ── small helpers ─────────────────────────────────────────────────────────
const pin = a => s => Math.pow(s, a);                    // ease in, power a
const pout = b => s => 1 - Math.pow(1 - s, b);           // ease out, power b
const step = s => (s > 0 ? 1 : 0);
const hit = (lt, t0, len) => (lt >= t0 && lt < t0 + len ? Math.pow(1 - (lt - t0) / len, 2) : 0);
/** a value driven through [t0, t1, target, ease] segments in order — continuous, exact at each end */
function run(v, segs, lt) {
  for (const [t0, t1, to, e] of segs) { if (lt <= t0) break; v = lerp(v, to, e(seg(lt, t0, t1))); }
  return v;
}
const REFO = { size: 100, weight: 900, tracking: -0.02 };
const capsW = (ctx, str, o = REFO) => layout(ctx, str, o).width / 72;
/** a word set in the world: its glyph centres and advances, for aiming the camera and moving glyphs */
function word(ctx, str, c, x, y, z) {
  const L = layout(ctx, str, REFO), n = L.chars.length, s = c / 72, tr = -2;
  const edge = i => (i < n ? L.xs[i] : L.width - tr);
  const adv = Array.from({ length: n }, (_, i) => edge(i + 1) - tr - edge(i));
  const gx = i => x + (-L.width / 2 + edge(i) + adv[i] / 2) * s;
  return { str, c, x, y, z, s, n, adv, gx, w: L.width * s, x0ref: -L.width / 2, xs: L.xs };
}
/** per-glyph pop from scale `from` to 1 about the glyph's centre */
const pop = (W, from, ak = 3) => (i, p) => {
  const k = lerp(from, 1, p);
  return { sx: k, sy: k, dx: W.adv[i] / 2 * (1 - k), dy: -36 * (1 - k), alpha: Math.min(1, p * ak) };
};

// ── the device panels, rendered once per screen and orientation ───────────
const PANELS = new Map();
function panelArt(S, key, P) {
  const o = key === 'pack' ? 'k' : P ? 'p' : 'l', id = key + o;
  let c = PANELS.get(id);
  if (c) return c;
  const img = S.img(key === 'pack' ? PACK : SHOT(key));
  if (!img || !img.width) return null;
  const ar = o === 'k' ? PACK_AR : AR[o];
  const pw = o === 'l' ? 640 : 460, ph = Math.round(pw / ar);
  const so = Math.round(pw * 0.03), r = pw * 0.06, b = Math.round(pw * 0.022);
  const cv = document.createElement('canvas');
  cv.width = pw + so; cv.height = ph + so;
  const x = cv.getContext('2d');
  x.fillStyle = 'rgba(11,11,14,.24)'; rrect(x, so, so, pw, ph, r); x.fill();      // a hard shadow
  x.fillStyle = INK; rrect(x, 0, 0, pw, ph, r); x.fill();                           // the device
  x.save(); rrect(x, b, b, pw - 2 * b, ph - 2 * b, r - b); x.clip();
  if (o === 'k') { const [sx, sy, sw, sh] = PACK_SRC; x.drawImage(img, sx, sy, sw, sh, b, b, pw - 2 * b, ph - 2 * b); }
  else { const f = (FOCUS[key] || [])[P ? 1 : 0] || [0.5, 0]; cover(x, img, b, b, pw - 2 * b, ph - 2 * b, { fx: f[0], fy: f[1] }); }
  x.restore();
  const lw = Math.max(1.5, pw * 0.004);
  x.strokeStyle = 'rgba(244,243,238,.3)'; x.lineWidth = lw;
  rrect(x, lw / 2, lw / 2, pw - lw, ph - lw, r); x.stroke();
  c = { cv, pw, ph };
  PANELS.set(id, c);
  return c;
}
/** a panel in the world: o = { x, y, z, w (world width), rot, alpha, sc } */
function addPanel(L, S, key, P, o) {
  const c = panelArt(S, key, P), al = o.alpha ?? 1;
  if (!c || al <= 0.003) return;
  L.custom(o.z, (ctx, p, f) => {
    const a = al * (1 - f);
    if (a <= 0.003) return;
    const k = p.k * o.w * (o.sc ?? 1) / c.pw, pw = c.pw * k;
    if (pw < 2 || pw > S.W * 8) return;
    ctx.globalAlpha *= a;
    ctx.drawImage(c.cv, -pw / 2, -c.ph * k / 2, c.cv.width * k, c.cv.height * k);
  }, { x: o.x, y: o.y, rotZ: o.rot || 0 });
}

// ── layout, per frame size (world units: 1 = S.u at distance D) ──────────
let G = null;
function geo(S, ctx) {
  const key = S.W + 'x' + S.H;
  if (G && G.key === key) return G;
  const P = S.portrait, A = Math.max(S.W, S.H) / Math.min(S.W, S.H);
  const hx = P ? 50 : 50 * A, hy = P ? 50 * A : 50;
  const mid = P ? -0.06 * hy : -3;                  // the middle of the safe band
  const ar = P ? AR.p : AR.l;
  const g = { key, P, A, hx, hy, ar };

  // bar 1 — the chrome G over GACHA over the address
  {
    const c = P ? Math.min(17, 80 / capsW(ctx, 'GACHA')) : Math.min(25, 0.7 * 2 * hx / capsW(ctx, 'GACHA'));
    const gs = P ? Math.min(46, 0.4 * hy) : 33, cap = P ? 3.1 : 2.8, g1 = P ? 7 : 5, g2 = P ? 6.5 : 6;
    const top = mid - (gs + g1 + c + g2 + cap) / 2;
    g.gm = { y: top + gs / 2, s: gs, z: Z1 + 40 };
    g.w1 = word(ctx, 'GACHA', c, 0, top + gs + g1 + c / 2, Z1);
    g.url1 = { y: g.w1.y + c / 2 + g2 + cap / 2, size: cap, L: layout(ctx, URL, { size: 100, weight: 600, tracking: 0.16 }) };
  }

  // bar 2 — artboards on a grid around a band that carries DESIGNED.
  {
    const c = P ? Math.min(12, 88 / capsW(ctx, 'DESIGNED.')) : Math.min(19, 0.84 * 2 * hx / capsW(ctx, 'DESIGNED.'));
    const bh = c / 2 + (P ? 5 : 6);
    const cols = P ? 3 : 6, side = P ? 2 : 1, gap = P ? 3 : 3.2, lab = P ? 4.4 : 3.8, lift = 1.6;
    let pw = P ? (90 - (cols - 1) * gap) / cols : Math.min(26, (0.86 * 2 * hx - (cols - 1) * gap) / cols);
    const maxPh = ((P ? 0.8 : 0.86) * hy - bh - lift - side * lab - (side - 1) * 1) / side;
    const ph = Math.min(pw / ar, maxPh); pw = ph * ar;
    const cells = [];
    let n = 0;
    const gridW = cols * pw + (cols - 1) * gap;
    for (let s = -1; s <= 1; s += 2) for (let ring = 0; ring < side; ring++) for (let ci = 0; ci < cols; ci++) {
      const x = -gridW / 2 + pw / 2 + ci * (pw + gap);
      const slot = ring * (ph + lab + 1);
      const y = s < 0 ? -(bh + lift + slot + ph / 2) : bh + lab + slot + ph / 2;
      cells.push({ key: KEYS[n], x, y, ly: y - ph / 2 - lab * 0.48, group: (ci + ring + (s > 0 ? 1 : 0)) % 2, i: n });
      n++;
    }
    // artboard names: small, and never wider than their board
    const labFit = 0.94 * pw / capsW(ctx, 'LEADERBOARD', { size: 100, weight: 700, tracking: 0.14 });
    g.s2 = { c, bh, pw, ph, lab: Math.min(P ? 1.75 : 1.45, labFit), cells, gridW };
    g.w2 = word(ctx, 'DESIGNED.', c, 0, 0, Z2 - 0.01);
    g.eye2 = { x: g.w2.x - g.w2.w / 2 + 0.3, y: -c / 2 - (P ? 2.9 : 3.1), size: P ? 2.1 : 1.9 };
    g.sel = [0, P ? 4 : 3, P ? 7 : 8].map(i => cells[i]);
  }

  // bar 3 — PROTOTYPED. over a flow of four screens, linked on the beats
  {
    const cap = P ? 2.3 : 1.9;
    if (!P) {
      const c = Math.min(16, 0.86 * 2 * hx / capsW(ctx, 'PROTOTYPED.'));
      const y = mid - 12;
      g.w3 = word(ctx, 'PROTOTYPED.', c, 0, y, Z3 - 0.01);
      g.cap3 = { x: g.w3.x + g.w3.w / 2 - 0.4, y: y + c / 2 + 3.6, size: cap, align: 'right' };
      const gap = Math.min(15, 0.085 * 2 * hx), pw = Math.min(30, (0.8 * 2 * hx - 3 * gap) / 4), ph = pw / ar;
      const fy = g.cap3.y + 12 + ph / 2;
      g.flow = FLOW.map((key, k) => ({ key, x: (k - 1.5) * (pw + gap), y: fy }));
      g.links = [0, 1, 2].map(k => ({ from: k, to: k + 1, dir: [1, 0] }));
      g.s3 = { pw, ph };
      g.O = { x: g.w3.gx(4), y };
    } else {
      const c = Math.min(18, 86 / capsW(ctx, 'TYPED.'));
      const gx = 12, gy = 13, lead = c * 1.16;
      let pw = Math.min(38, (90 - gx) / 2), ph = pw / ar;
      const room = 1.52 * hy - (c + lead + 4.5 + cap + 10) - gy;
      if (2 * ph > room) { ph = room / 2; pw = ph * ar; }
      const total = c + lead + 4.5 + cap + 10 + 2 * ph + gy;
      const top = mid - total / 2;
      g.w3a = word(ctx, 'PROTO', c, 0, top + c / 2, Z3 - 0.01);
      g.w3b = word(ctx, 'TYPED.', c, 0, top + c / 2 + lead, Z3 - 0.01);
      g.cap3 = { x: 0, y: g.w3b.y + c / 2 + 4.5 + cap / 2, size: cap, align: 'center' };
      const y0 = g.cap3.y + cap / 2 + 10 + ph / 2, dx = (pw + gx) / 2;
      // a snake: home → packs, down to reveal, back to vault
      g.flow = [
        { key: 'home', x: -dx, y: y0 }, { key: 'packs', x: dx, y: y0 },
        { key: 'reveal', x: dx, y: y0 + ph + gy }, { key: 'vault', x: -dx, y: y0 + ph + gy }
      ];
      g.links = [{ from: 0, to: 1, dir: [1, 0] }, { from: 1, to: 2, dir: [0, 1] }, { from: 2, to: 3, dir: [-1, 0] }];
      g.s3 = { pw, ph };
      g.O = { x: g.w3a.gx(2), y: g.w3a.y };
    }
  }

  // bar 4 — SHIPPED. over the live pack, the screens fanned behind it
  {
    const c = P ? Math.min(14, 88 / capsW(ctx, 'SHIPPED.')) : Math.min(20, 0.84 * 2 * hx / capsW(ctx, 'SHIPPED.'));
    const cap = P ? 2.3 : 1.9, capLines = P ? 2 : 1, capGap = P ? 3.4 : 0;
    const ph = P ? Math.min(64, 0.62 * hy) : 36, pw = ph * PACK_AR;
    const total = c + 5 + capLines * cap + capGap + 7 + ph + 2;
    const top = mid - total / 2;
    g.w4 = word(ctx, 'SHIPPED.', c, 0, top + c / 2, Z4 - 0.01);
    const cy = top + c + 5 + cap / 2;
    g.cap4 = P
      ? [{ str: 'ADOPTED BY ENGINEERING', y: cy }, { str: 'AS THE WORKING SPEC', y: cy + cap + capGap }]
      : [{ str: 'ADOPTED BY ENGINEERING AS THE WORKING SPEC', y: cy }];
    g.cap4size = cap;
    g.pack = { x: 0, y: top + c + 5 + capLines * cap + capGap + 7 + ph / 2, w: pw, h: ph };
    const us = P ? 2.6 : 2.1;
    const UL = layout(ctx, URL, { size: 100, weight: 600, tracking: 0.1 });
    const LL = layout(ctx, 'LIVE', { size: 100, weight: 800, tracking: 0.14 });
    const uw = UL.width / 72 * us, lw = LL.width / 72 * us, dot = us * 0.8;
    const pillW = dot + us * 0.9 + lw + us * 1.4 + uw + us * 2.4;
    g.pill = { y: g.pack.y + ph / 2, h: us * 2.5, w: pillW, size: us, dot, lw, uw, UL };
    // the fan: three a side, behind the pack
    const spread = P ? 1 : Math.min(1, hx / 89);
    const fw = P ? pw * 0.62 : 27;
    g.fan = FAN.map((key, j) => {
      const sd = j % 2 ? 1 : -1, rank = j >> 1;
      return P
        ? { key, x: sd * (pw * 0.42 + rank * 7), y: g.pack.y + (rank - 1) * ph * 0.24, rot: sd * (0.16 + rank * 0.09), w: fw * (1 - rank * 0.06), rank }
        : { key, x: sd * (pw * 0.5 + 12 + rank * 23) * spread, y: g.pack.y - 1 + rank * 3.2, rot: sd * (0.08 + rank * 0.08), w: fw * (1 - rank * 0.07), rank };
    });
    g.I = { x: g.w4.gx(2), y: g.w4.y };
    // how close the camera must be for the I's stem to cover the whole frame (a conservative stem)
    g.dCover = Math.min(0.13 * c * D / (hx * 1.02), 0.46 * c * D / hy);
  }

  g.C = { x: g.w1.gx(2), y: g.w1.y };
  g.gap = { x: (g.w2.gx(4) + g.w2.gx(5)) / 2, y: 0 };

  // ── the camera: one dolly, four stations ─────────────────────────────
  const sw2 = P ? [[0, -3], [0, 3]] : [[-4, 0], [4, 0]];
  const sw3 = P ? [[-3, -5], [3, 6]] : [[-7, 0], [7, 0]];
  g.camZ = [
    [T.open, 1.0, Z1 - D - 12, outExpo],            // the rush out of the teal
    [0.3, T.cGo, Z1 - D + 2, linear],               // GACHA holds, a slow push
    [T.cGo, T.cPass, Z1, pin(3)],                   // into the C
    [T.cPass, T.land2, Z2 - D - 8, pout(5)],        // through it, brake hard on the canvas
    [T.land2 - 0.12, T.part, Z2 - D + 6, linear],
    [T.part, T.dPass, Z2, pin(3)],                  // through the parting grid
    [T.dPass, T.land3, Z3 - D - 8, pout(5)],
    [T.land3 - 0.12, T.oGo, Z3 - D + 6, linear],
    [T.oGo, T.oPass, Z3, pin(3)],                   // through the O
    [T.oPass, T.land4, Z4 - D - 6, pout(5)],
    [T.land4 - 0.12, T.dive, Z4 - D + 2, linear]
  ];
  g.camX = [
    [T.open, 1.1, 0, outCubic],
    [T.cGo + 0.05, T.cPass - 0.08, g.C.x, inOutCubic],
    [T.cPass, T.land2, sw2[0][0], outCubic],
    [T.land2, T.part, sw2[1][0], inOutQuad],
    [T.part, T.dPass - 0.08, g.gap.x, inOutCubic],
    [T.dPass, T.land3, sw3[0][0], outCubic],
    [T.land3, T.oGo, sw3[1][0], inOutQuad],
    [T.oGo + 0.03, T.oPass - 0.08, g.O.x, inOutCubic],
    [T.oPass, T.land4, 0, outCubic],
    [T.dive, T.dive + 0.5, g.I.x, inOutCubic]
  ];
  g.camY = [
    [T.open, 1.1, 0, outCubic],
    [T.cGo + 0.05, T.cPass - 0.08, g.C.y, inOutCubic],
    [T.cPass, T.land2, sw2[0][1], outCubic],
    [T.land2, T.part, sw2[1][1], inOutQuad],
    [T.part, T.dPass - 0.08, g.gap.y, inOutCubic],
    [T.dPass, T.land3, sw3[0][1], outCubic],
    [T.land3, T.oGo, sw3[1][1], inOutQuad],
    [T.oGo + 0.03, T.oPass - 0.08, g.O.y, inOutCubic],
    [T.oPass, T.land4, 0, outCubic],
    [T.dive, T.dive + 0.5, g.I.y, inOutCubic]
  ];
  g.camR = [
    [T.open, 1.1, 0, outCubic],
    [T.cGo, T.cPass, 0.26, inQuad],
    [T.cPass, T.land2 + 0.1, 0, outCubic],
    [T.part, T.dPass, -0.2, inQuad],
    [T.dPass, T.land3 + 0.1, 0, outCubic],
    [T.oGo, T.oPass, 0.3, inQuad],
    [T.oPass, T.land4 + 0.1, 0, outCubic]
  ];
  g.start = { x: P ? 0 : 22, y: P ? 14 : 0, z: Z1 - D - 310, r: -0.16 };
  G = g;
  return g;
}

function camAt(g, lt) {
  let z = run(g.start.z, g.camZ, lt);
  if (lt > T.dive) {
    // the dive: distance to the I shrinks exponentially, faster and faster
    const d0 = Z4 - run(g.start.z, g.camZ, T.dive), dEnd = g.dCover * 0.85;
    z = Z4 - d0 * Math.pow(dEnd / d0, Math.pow(seg(lt, T.dive, T.cover), 2.3));
  }
  return { x: run(g.start.x, g.camX, lt), y: run(g.start.y, g.camY, lt), z, roll: run(g.start.r, g.camR, lt) };
}

// ── bar 1: GACHA ──────────────────────────────────────────────────────────
function gacha(L, S, g, lt) {
  const gm = g.gm, k = (D + gm.z - Z1) / D;        // world scale: reads at gm.s from the landed pose
  const spin = 1 - outExpo(seg(lt, T.open, 2 * B + 0.1));
  const lift = seg(lt, T.cGo, T.cPass, inQuad);
  const yaw = 0.34 - TAU * spin + 0.1 * Math.sin((lt - 1.05) * 2.2) * seg(lt, 1.0, 1.3) + 0.9 * lift;
  L.custom(gm.z, (ctx, p, f) => {
    const a = 1 - f;
    if (a <= 0.01) return;
    const px = gm.s * k * p.k * 1.14;
    if (px < 4 || px > S.W * 3) return;
    const cv = S.logo3d('gacha', { w: Math.min(560, px), h: Math.min(560, px), yaw, pitch: 0.12, fit: 1.14 });
    if (!cv) return;
    ctx.globalAlpha *= a;
    ctx.drawImage(cv, -px / 2, -px / 2, px, px);
  }, { x: 0, y: gm.y * k - 70 * lift });

  const w = g.w1;
  L.text('GACHA', { x: w.x, y: w.y, z: w.z, size: w.c, color: INK, baseline: 'middle', reveal: seg(lt, 0.12, T.lock), window: 0.5, mask: true, ease: outExpo });

  // the address types on, a cursor blinking after it
  const u = g.url1, ty = seg(lt, 0.66, 1.16), s = u.size / 72;
  L.text(URL, { x: 0, y: u.y, z: Z1, size: u.size, weight: 600, tracking: 0.16, color: INK, baseline: 'middle', reveal: ty, window: 0.04, ease: step, rise: 0 });
  if (lt > 0.62 && (ty < 1 || Math.floor((lt - 1.16) / (B / 2)) % 2 === 1)) {
    const n = u.L.chars.length, m = Math.round(ty * n);
    const cx = (-u.L.width / 2 + (m < n ? u.L.xs[m] : u.L.width + 16)) * s + 0.5 * u.size;
    L.rect({ x: cx, y: u.y + 0.05 * u.size, z: Z1, w: 0.62 * u.size, h: 1.25 * u.size, color: INK });
  }
}

// ── bar 2: DESIGNED ───────────────────────────────────────────────────────
function designed(L, S, g, lt, cz) {
  const s2 = g.s2, P = g.P;
  const open = inOutCubic(seg(lt, T.part, T.dPass - 0.04));      // the grid parts for the camera
  // the word splits along the camera's path: its halves ride the frame's edges right up to the pass
  const fhw = (g.P ? 50 : g.hx) * Math.max(0, Z2 - cz) / D;
  const sp = open * Math.min(g.hx * 0.3, 0.8 * fhw + 1);
  for (const cell of s2.cells) {
    const tS = T.snap[cell.group], i = cell.i;
    const q = whip(seg(lt, tS - 0.34, tS + 0.04));
    if (q <= 0) continue;
    const sx = cell.x * 1.7 + (rng(i, 1) - 0.5) * 40, sy = cell.y * 1.7 + (rng(i, 2) - 0.5) * 20;
    const sz = Z2 + 150 + rng(i, 3) * 110, sr = (rng(i, 4) - 0.5) * 0.9;
    const land = hit(lt, tS + 0.04, 0.22);
    const fl = seg(lt, tS + 0.1, tS + 0.6) * (1 - open);
    const x = lerp(sx, cell.x, q) + cell.x * open * 0.35;
    const y = lerp(sy, cell.y, q) + Math.sign(cell.y) * open * g.hy * 0.45 + 0.35 * noise1(lt * 0.9, i) * fl;
    addPanel(L, S, cell.key, P, {
      x, y, z: lerp(sz, Z2, q), w: s2.pw, sc: 1 + 0.06 * land,
      rot: lerp(sr, 0, q) + Math.sign(cell.x) * Math.sign(cell.y) * open * 0.18, alpha: seg(q, 0, 0.25)
    });
    // the artboard's name, above it
    const la = seg(lt, tS + 0.02, tS + 0.2) * (1 - seg(lt, T.part, T.part + 0.15));
    if (la > 0) L.text(cell.key.toUpperCase(), {
      x: x - s2.pw / 2, y: cell.ly + (y - cell.y), z: Z2, size: s2.lab, weight: 700, tracking: 0.14,
      color: INK, align: 'left', baseline: 'middle', alpha: la, reveal: seg(lt, tS + 0.02, tS + 0.3), window: 0.2, ease: step, rise: 0
    });
  }

  // layout guides, paper, drawn out from the middle; a selection that hops on the beats
  const gd = outCubic(seg(lt, T.guides, T.guides + 0.5)) * (1 - seg(lt, T.part, T.part + 0.2));
  const selA = seg(lt, T.sel[0] - 0.06, T.sel[0]) * (1 - seg(lt, T.part, T.part + 0.12));
  if (gd > 0 || selA > 0) {
    L.custom(Z2 + 0.02, (ctx, p, f) => {
      const a = 1 - f, k = p.k;
      if (a <= 0.01 || gd <= 0) return;
      ctx.globalAlpha *= a * 0.9;
      ctx.strokeStyle = PAPER; ctx.lineWidth = Math.max(1, 0.16 * k);
      const ext = g.hx * 1.25 * gd, ey = g.hy * 1.1 * gd, hw = s2.gridW / 2 + 1.6;
      ctx.beginPath();
      for (const y of [-s2.bh, s2.bh]) { ctx.moveTo(-ext * k, y * k); ctx.lineTo(ext * k, y * k); }
      for (const x of [-hw, hw]) { ctx.moveTo(x * k, -ey * k); ctx.lineTo(x * k, ey * k); }
      ctx.stroke();
      // the centre line, dashed
      ctx.setLineDash([0.9 * k, 0.9 * k]);
      ctx.beginPath(); ctx.moveTo(0, -ey * k); ctx.lineTo(0, ey * k); ctx.stroke();
      ctx.setLineDash([]);
    });
    L.custom(Z2 - 0.02, (ctx, p, f) => {
      const a = (1 - f) * selA;
      if (a <= 0.01) return;
      // hop from artboard to artboard
      let x = g.sel[0].x, y = g.sel[0].y;
      for (let j = 1; j < 3; j++) {
        const h = whip(seg(lt, T.sel[j] - 0.13, T.sel[j]));
        x = lerp(x, g.sel[j].x, h); y = lerp(y, g.sel[j].y, h);
      }
      const k = p.k, pad = 0.9, w = (s2.pw + 2 * pad) * k, h = (s2.ph + 2 * pad) * k;
      const X = x * k - w / 2, Y = y * k - h / 2, hs = Math.max(4, 1.3 * k);
      ctx.globalAlpha *= a;
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, 0.3 * k);
      ctx.strokeRect(X, Y, w, h);
      ctx.fillStyle = PAPER;
      for (const [hx, hy] of [[X, Y], [X + w, Y], [X, Y + h], [X + w, Y + h]]) {
        ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs); ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
      }
    });
  }

  // DESIGNED. — pops in as the camera breaks through the C; splits for it at the end
  const w = g.w2, spRef = sp / w.s, popG = pop(w, 1.7, 4);
  L.text(w.str, {
    x: w.x, y: w.y, z: w.z, size: w.c, color: INK, baseline: 'middle',
    reveal: seg(lt, T.cPass - 0.02, BAR + 0.04), window: 0.45, ease: outExpo, rise: 0,
    glyph: (i, p) => { const o = popG(i, p); o.dx += i < 5 ? -spRef : spRef; return o; }
  });
  const ea = seg(lt, BAR + 0.12, BAR + 0.36) * (1 - open);
  if (ea > 0) L.text('UI/UX', {
    x: g.eye2.x - sp, y: g.eye2.y, z: Z2 - 0.01, size: g.eye2.size, weight: 800, tracking: 0.22, color: INK,
    align: 'left', baseline: 'middle', alpha: ea, reveal: seg(lt, BAR + 0.12, BAR + 0.4), window: 0.3, mask: true
  });
}

// ── bar 3: PROTOTYPED ─────────────────────────────────────────────────────
function linkPath(g, l) {
  const A = g.flow[l.from], Bp = g.flow[l.to], s3 = g.s3;
  const p0 = [A.x, A.y - s3.ph / 2 + HOT[A.key] * s3.ph];
  const d = l.dir, p3 = [Bp.x - d[0] * (s3.pw / 2 + 0.7), Bp.y - d[1] * (s3.ph / 2 + 0.7)];
  // leave the button upward (or outward), arrive along `dir`
  const out = d[1] ? [s3.pw * 0.75, 0] : d[0] < 0 ? [0, s3.ph * 0.62] : [s3.pw * 0.2, -s3.ph * 0.78];
  const p1 = [p0[0] + out[0], p0[1] + out[1]], p2 = [p3[0] - d[0] * 11, p3[1] - d[1] * 11];
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28, u = 1 - t;
    pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return { pts, p0, p3, d };
}
function prototyped(L, S, g, lt) {
  const P = g.P, s3 = g.s3;
  // the flow's screens rise into place, a sixteenth apart
  g.flow.forEach((f, k) => {
    const t0 = T.flow + k * B / 4, q = seg(lt, t0, t0 + 0.42);
    if (q <= 0) return;
    const arrive = k > 0 ? T.link[k - 1] + 0.3 : -9;
    const bump = hit(lt, arrive, 0.3);
    addPanel(L, S, f.key, P, {
      x: f.x, y: f.y + (1 - outBack(q, 1.5)) * 46, z: Z3 + (1 - outCubic(q)) * 40,
      w: s3.pw, sc: 1 + 0.07 * bump, rot: (1 - outCubic(q)) * (k % 2 ? 0.2 : -0.2), alpha: seg(q, 0, 0.2)
    });
  });
  // the links: a tap on the real button, a paper line drawn to the next screen
  if (lt > T.link[0] - 0.02) {
    const paths = g.links.map(l => linkPath(g, l));
    L.custom(Z3 - 0.03, (ctx, p, f) => {
      const a = 1 - f, k = p.k;
      if (a <= 0.01) return;
      ctx.globalAlpha *= a;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      paths.forEach((pa, j) => {
        const t0 = T.link[j];
        if (lt < t0) return;
        const pr = outCubic(seg(lt, t0 + 0.02, t0 + 0.3));
        // the tap
        const tr = seg(lt, t0, t0 + 0.4);
        if (tr < 1) {
          ctx.save(); ctx.globalAlpha *= 1 - tr;
          ctx.strokeStyle = PAPER; ctx.lineWidth = Math.max(1.5, 0.35 * k);
          ctx.beginPath(); ctx.arc(pa.p0[0] * k, pa.p0[1] * k, (1.2 + 5.5 * outCubic(tr)) * k, 0, TAU); ctx.stroke();
          ctx.restore();
        }
        // the line
        const n = pa.pts.length - 1, m = pr * n, mi = Math.floor(m);
        ctx.strokeStyle = PAPER; ctx.lineWidth = Math.max(1.5, 0.42 * k);
        ctx.beginPath(); ctx.moveTo(pa.pts[0][0] * k, pa.pts[0][1] * k);
        for (let i = 1; i <= mi; i++) ctx.lineTo(pa.pts[i][0] * k, pa.pts[i][1] * k);
        let ex = pa.pts[mi][0], ey = pa.pts[mi][1];
        if (mi < n) { const fr = m - mi; ex = lerp(ex, pa.pts[mi + 1][0], fr); ey = lerp(ey, pa.pts[mi + 1][1], fr); ctx.lineTo(ex * k, ey * k); }
        ctx.stroke();
        // its start: a paper dot ringed in ink
        ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, 0.25 * k);
        ctx.beginPath(); ctx.arc(pa.p0[0] * k, pa.p0[1] * k, 1.1 * k, 0, TAU); ctx.fill(); ctx.stroke();
        // its end: an arrowhead, once it lands
        if (pr > 0.96) {
          const [dx, dy] = pa.d, ax = pa.p3[0] * k, ay = pa.p3[1] * k, s = 1.7 * k;
          ctx.fillStyle = PAPER;
          ctx.beginPath(); ctx.moveTo(ax + dx * s * 0.4, ay + dy * s * 0.4);
          ctx.lineTo(ax - dx * s + dy * s * 0.7, ay - dy * s - dx * s * 0.7);
          ctx.lineTo(ax - dx * s - dy * s * 0.7, ay - dy * s + dx * s * 0.7); ctx.closePath(); ctx.fill();
        }
      });
    });
  }

  // PROTOTYPED. — clicks in glyph by glyph, like keys
  const r = seg(lt, T.dPass - 0.02, 2 * BAR + 0.06);
  const words = P ? [g.w3a, g.w3b] : [g.w3];
  words.forEach((w, j) => {
    const popG = pop(w, 0.55, 5);
    L.text(w.str, {
      x: w.x, y: w.y, z: w.z, size: w.c, color: INK, baseline: 'middle',
      reveal: P ? seg(lt, T.dPass - 0.02 + j * 0.04, 2 * BAR + 0.02 + j * 0.04) : r, window: 0.22, ease: t => outBack(t, 2.2), rise: 0,
      glyph: (i, p) => popG(i, Math.min(p, 1.2))
    });
  });
  const c3 = g.cap3, ca = seg(lt, 2 * BAR + 0.16, 2 * BAR + 0.42);
  if (ca > 0) L.text('WITH CLAUDE CODE', {
    x: c3.x, y: c3.y, z: Z3 - 0.01, size: c3.size, weight: 700, tracking: 0.24, color: INK, align: c3.align,
    baseline: 'middle', reveal: ca, window: 0.3, mask: true
  });
}

// ── bar 4: SHIPPED ────────────────────────────────────────────────────────
function shipped(L, S, g, lt) {
  const P = g.P, pk = g.pack;
  // the fan: the screens burst out from behind the pack like pulled cards
  g.fan.forEach((f, j) => {
    const t0 = T.fan + f.rank * B / 8, q = seg(lt, t0, t0 + 0.34);
    if (q <= 0) return;
    const e = outBack(q, 1.6), zf = Z4 + 26 + f.rank * 6, kz = (D + zf - Z4) / D;
    addPanel(L, S, f.key, P, {
      x: lerp(0, f.x, e) * kz, y: lerp(pk.y, f.y, e) * kz, z: zf, w: f.w * kz * lerp(0.6, 1, outCubic(q)),
      rot: lerp(0, f.rot, e), alpha: seg(q, 0, 0.15)
    });
  });
  // the pack rises onto its mark
  const pq = seg(lt, T.oPass - 0.05, T.oPass + 0.5);
  if (pq > 0) {
    const e = outBack(pq, 1.3), fl = Math.sin((lt - T.oPass) * 2.4) * 0.5 * seg(lt, T.oPass + 0.4, T.oPass + 0.9);
    const py = pk.y + (1 - e) * 30 + fl;
    addPanel(L, S, 'pack', P, { x: pk.x, y: py, z: Z4 + (1 - outCubic(pq)) * 20, w: pk.w, alpha: seg(pq, 0, 0.2) });
    // once it has landed, a paper glint crosses it
    const gl = seg(lt, T.fan - 0.02, T.fan + 0.34, inOutCubic);
    if (gl > 0 && gl < 1) L.custom(Z4 - 0.04, (ctx, p, f) => {
      const k = p.k, w = pk.w * k, h = pk.h * k;
      ctx.globalAlpha *= (1 - f) * 0.34;
      rrect(ctx, -w / 2, -h / 2, w, h, w * 0.06); ctx.clip();
      const x = lerp(-w * 1.1, w * 1.1, gl), b = w * 0.22;
      ctx.fillStyle = PAPER;
      ctx.beginPath(); ctx.moveTo(x - b, h / 2); ctx.lineTo(x, h / 2); ctx.lineTo(x + h * 0.45, -h / 2); ctx.lineTo(x + h * 0.45 - b, -h / 2); ctx.closePath(); ctx.fill();
    }, { x: pk.x, y: py });
    // its address, on a paper pill across its foot: LIVE, and where
    const pl = g.pill, pa = outCubic(seg(lt, T.fan + 0.05, T.fan + 0.3));
    if (pa > 0) {
      const y = pl.y + fl, us = pl.size;
      const tr = seg(lt, T.fan + 0.14, T.fan + 0.44);
      const x0 = -pl.w / 2 + us * 1.2 + pl.dot + us * 0.9, xu = x0 + pl.lw + us * 1.4;
      // the pill's right end follows the last typed character
      const n = pl.UL.chars.length, m = tr >= 1 ? n : Math.min(n, Math.floor(tr / 0.96 * (n - 1)) + (tr > 0 ? 1 : 0));
      const wNow = (m >= n ? pl.w : xu + (pl.UL.xs[m] / 72) * us + us * 1.3 + pl.w / 2);
      L.custom(Z4 - 0.05, (ctx, p, f) => {
        // anchored at its left end, it grows as the address types
        const k = p.k, left = -pl.w / 2 * k, w = wNow * k, h = pl.h * k * lerp(0.4, 1, pa);
        ctx.globalAlpha *= (1 - f) * Math.min(1, pa * 2);
        ctx.fillStyle = PAPER; rrect(ctx, left, -h / 2, w, h, h / 2); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, 0.22 * k); ctx.stroke();
        // the live dot, beating
        const ph = ((lt - 3 * BAR) % B + B) % B, beat = ph < 0.3 ? Math.pow(1 - ph / 0.3, 2) : 0;
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.arc(left + (us * 1.2 + pl.dot / 2) * k, 0, pl.dot / 2 * (1 + 0.25 * beat) * k, 0, TAU); ctx.fill();
      }, { x: 0, y });
      L.text('LIVE', { x: x0, y, z: Z4 - 0.06, size: us, weight: 800, tracking: 0.14, color: INK, align: 'left', baseline: 'middle', alpha: Math.min(1, pa * 2) });
      L.text(URL, {
        x: xu, y: y + 0.08 * us, z: Z4 - 0.06, size: us, weight: 600, tracking: 0.1, color: INK,
        align: 'left', baseline: 'middle', reveal: tr, window: 0.04, ease: step, rise: 0
      });
    }
  }

  // SHIPPED. — slams from above the camera; its I painted butter on the beat
  const w = g.w4, popG = pop(w, 2.3, 3), paint = seg(lt, T.paint, T.paint + 0.2);
  L.text(w.str, {
    x: w.x, y: w.y, z: w.z, size: w.c, color: INK, baseline: 'middle',
    reveal: seg(lt, T.oPass - 0.02, 3 * BAR + 0.04), window: 0.6, order: 'center', ease: outExpo, rise: 0,
    glyph: (i, p) => { const o = popG(i, p); if (i === 2 && paint >= 1) o.alpha = 0; return o; }
  });
  if (paint > 0) {
    const iw = w.adv[2], ix = w.x0ref + w.xs[2];
    L.custom(Z4 - 0.02, (ctx, p, f) => {
      const s = w.c * p.k / 72;
      ctx.scale(s, s);
      ctx.font = `900 100px ${FONT.sans}`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      ctx.fillStyle = BUTTER;
      if (paint < 1) { ctx.beginPath(); ctx.rect(ix - iw, 36 - 76 * outCubic(paint), iw * 3, 80); ctx.clip(); }
      ctx.fillText('I', ix, 36);
    }, { x: w.x, y: w.y });
  }
  const ca = seg(lt, 3 * BAR + 0.14, 3 * BAR + 0.4) * (1 - seg(lt, T.dive + 0.1, T.dive + 0.3));
  if (ca > 0) g.cap4.forEach((c, j) => L.text(c.str, {
    x: 0, y: c.y, z: Z4 - 0.01, size: g.cap4size, weight: 700, tracking: 0.24, color: INK, baseline: 'middle',
    reveal: seg(lt, 3 * BAR + 0.14 + j * 0.1, 3 * BAR + 0.46 + j * 0.1), window: 0.3, mask: true, alpha: ca
  }));
}

// ── the lens ──────────────────────────────────────────────────────────────
function lens(S, g, lt) {
  const fx = S.fx;
  const imp = Math.max(hit(lt, BAR, 0.4), hit(lt, 2 * BAR, 0.4), hit(lt, 3 * BAR, 0.45));
  const tick = Math.max(hit(lt, T.snap[0], 0.14), hit(lt, T.snap[1], 0.14), ...T.link.map(t => hit(lt, t, 0.14)), hit(lt, T.paint, 0.16));
  const z0 = camAt(g, lt).z, z1 = camAt(g, Math.max(T.open, lt - 1 / 60)).z;
  const speed = lt < T.dive ? Math.abs(z0 - z1) * 60 : 0;
  const rush = clamp((speed - 250) / 2600) * seg(lt, 0.3, 0.5);
  const dive = seg(lt, T.dive + 0.3, T.cover - 0.04, inQuad) * (1 - seg(lt, T.cover - 0.04, T.cover));
  fx.ab = clamp(0.8 * imp + 0.28 * tick + 0.5 * rush + 0.45 * dive);
  fx.shake = S.u * (0.9 * Math.max(hit(lt, BAR, 0.3), hit(lt, 2 * BAR, 0.3), hit(lt, 3 * BAR, 0.36)) + 0.35 * hit(lt, T.lock, 0.22));
  fx.flash = 0.1 * hit(lt, 3 * BAR, 0.16) + 0.05 * hit(lt, BAR, 0.12);
  if (lt >= 3 * BAR && lt < 3 * BAR + 0.6) { fx.warp = (lt - 3 * BAR) / 0.6; fx.warpX = 0.5; fx.warpY = 0.5; }
}

const scene = {
  id: 'code',
  title: 'Code',
  caption: 'Gacha, the live game: its real screens snap into a design grid, a prototype flow and the live pack — UI/UX designed and prototyped with Claude Code, adopted by engineering as the working spec.',
  bg: BLOCK.teal,
  assets: [...KEYS.map(SHOT), PACK],
  models: ['gacha'],
  still: 6.35,
  sfx: [
    { at: T.lock, type: 'sub' },          // GACHA locks
    { at: BAR, type: 'impact' },          // through the C: DESIGNED.
    { at: T.snap[0], type: 'tick' },      // the artboards snap
    { at: T.snap[1], type: 'tick' },
    { at: 2 * BAR, type: 'impact' },      // through the parting grid: PROTOTYPED.
    { at: T.link[0], type: 'tick' },      // the first link
    { at: 3 * BAR, type: 'impact' },      // through the O: SHIPPED.
    { at: T.paint, type: 'tick' },        // the I painted butter
    { at: T.cover, type: 'riser' }        // into the I
  ],
  draw(ctx, S) {
    const lt = S.lt;
    if (lt < T.open) {
      // a teal frame; warm the chrome G's renderer so its first real frame doesn't stall
      if (lt < 0.07) S.logo3d('gacha', { w: 32, h: 32, yaw: 0, fit: 1.14 });
      return;
    }
    if (lt >= T.cover) { ctx.fillStyle = nextColour(scene); ctx.fillRect(0, 0, S.W, S.H); return; }
    const g = geo(S, ctx), c = camAt(g, lt);
    const cam = camera(S, { x: c.x, y: c.y, z: c.z, roll: c.roll, zoom: ZOOM });
    const L = list();
    if (c.z < Z1 - 0.5) gacha(L, S, g, lt);
    if (lt > T.cGo && c.z < Z2 - 0.5) designed(L, S, g, lt, c.z);
    if (lt > T.part && c.z < Z3 - 0.5) prototyped(L, S, g, lt);
    if (lt > T.oGo) shipped(L, S, g, lt);
    L.draw(ctx, S, cam, { fog: TEAL, near: FOG.near, far: FOG.far, maxPx: 60 });
    // once the I's stem is wider than the frame, the frame is butter
    if (lt > T.dive && Z4 - c.z <= g.dCover) { ctx.fillStyle = BUTTER; ctx.fillRect(0, 0, S.W, S.H); }
    lens(S, g, lt);
  }
};
export default scene;
