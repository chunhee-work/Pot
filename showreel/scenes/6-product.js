/* 6 — The Product. Gacha, screen by screen.

   The thread starts as the split on the old pack screen: the exact line where
   its content stopped and 45% of dead black began. Then it coils into the
   thing that replaced that dead space — the ring of ten refill bolts around
   the pack — landing on the ring of the live screen. The camera pushes into
   the ring, the bolts charge one per eighth note, and each one deals a real
   screen of the game out of the pack like a pulled card. At full charge the
   cards fly home, the pack folds into the line and the ring pulls straight. */
import {
  PAL, BEAT, clamp, lerp, invlerp, seg, TAU, noise1,
  inCubic, outCubic, inOutCubic, outQuad, outExpo, outBack, bezier, siteE,
  cover, rrect, thread, rest, restPoints, text, measure, counter
} from '../kit.js';

const BEFORE = 'assets/gameui/packs-before-f95c9a88a9.jpg';
const AFTER = 'assets/gameui/packs-after-210a9a6933.webp';
// dealt in the order the bolts charge: bottom-left, over the top, bottom-right
const SCREENS = [
  'assets/g-home.jpg', 'assets/g-battle.jpg', 'assets/g-codex.jpg', 'assets/g-skills.jpg', 'assets/g-vault.jpg',
  'assets/g-leaderboard.jpg', 'assets/g-forge.jpg', 'assets/g-reveal.jpg', 'assets/g-ledger.jpg', 'assets/g-settings.jpg'
];

/* the after screen in its own pixels: the ring of bolts (centre, radius), the
   pack inside it, and the panel that now fills the old dead half */
const AI = { w: 1240, h: 1204, rx: 620, ry: 456, rr: 237, pack: [503, 243, 738, 660], panel: [380, 712, 862, 1070] };
const DEAD = 0.55;           // the before screen's content stops 55% of the way down

const E8 = BEAT / 2;         // eighth note
const T = {
  start: 0.1, end: 9.86,
  unfold: [0.625, 1.25],     // the before screen opens out of the line
  dead: 1.25,                // the dead 45% is marked
  coil: [2.5, 3.125],        // the line coils into the ring
  reveal: [3.125, 3.7],      // the after screen, out from the ring
  push: [4.375, 5.0],        // camera into the ring
  light0: 4.6875,            // first bolt; the tenth lands on the bar at 7.5
  full: 7.5,
  ret: 8.75,                 // the cards fly home
  fold: [8.95, 9.4],         // the pack folds into the line
  unwind: [9.0, 9.84]        // the ring pulls straight
};
const ANG = Array.from({ length: 10 }, (_, k) => (135 + 30 * k) * Math.PI / 180);
const lightAt = k => T.light0 + k * E8;

const unfoldE = bezier(0.2, 0.9, 0.25, 1);
const pushE = bezier(0.62, 0, 0.1, 1);

// ── layout, per frame size ─────────────────────────────────────────────────
let G = null;
function geo(S) {
  const key = S.W + 'x' + S.H;
  if (G && G.key === key) return G;
  const { W, H, u } = S, P = S.portrait, cy = H / 2;
  const g = { key, P, cy };
  /* tuned for 16:9 and a 9:19.5 phone; squarer frames (16:10, 4:3, a tablet
     held upright, a 9:16 phone) scale the pieces down until they fit */
  const wu = W / u, hu = H / u;
  const k = P ? Math.min(1, hu / 205) : Math.min(1, 0.855 * wu / 136.2);
  const kx = P ? k : Math.min(1, (wu - 15) / 162);
  if (P) {
    g.ph = Math.min(85.4, (0.42 * hu - 25) / 0.55, (0.36 * hu - 21) / 0.45) * u;
    g.pw = g.ph * AI.w / AI.h; g.px = (W - g.pw) / 2;
  } else {
    g.ph = 80 * u * k; g.pw = g.ph * AI.w / AI.h; g.px = W * 0.925 - g.pw;
  }
  g.py = cy - DEAD * g.ph;
  g.sA = g.pw / AI.w;
  g.ringA = { x: g.px + AI.rx * g.sA, y: g.py + AI.ry * g.sA, r: AI.rr * g.sA };
  g.ringB = P ? { x: W / 2, y: (hu > 190 ? 0.44 : 0.42) * H, r: 31 * u * k } : { x: W / 2, y: 0.42 * H, r: 27 * u };
  g.sB = g.ringB.r / AI.rr;
  // type
  g.colX = P ? W / 2 : 0.07 * W;
  g.align = P ? 'center' : 'left';
  g.hs = P ? 9.4 * u : 8.4 * u * k;
  g.ls = P ? 2.7 * u : 1.75 * u;
  g.bs = P ? 4.7 * u : 4.4 * u * Math.max(0.85, k);
  g.h2 = cy - 3 * u; g.h1 = g.h2 - g.hs * 1.06; g.he = g.h1 - g.hs * 0.9;
  g.headShift = P ? (g.py - 6.5 * u) - g.h2 : 0;
  if (P) { const b = g.py + g.ph; g.le = b + 8.5 * u; g.l1 = g.le + 7.5 * u; g.l2 = g.l1 + g.bs * 1.18; }
  else { g.le = cy + 7.5 * u; g.l1 = g.le + 6.8 * u; g.l2 = g.l1 + g.bs * 1.18; }
  // the product stage
  const R = g.ringB.r;
  g.pillY = g.ringB.y + R + (P ? 6.8 * k : 4.9) * u;
  if (P) { g.c2 = 0.835 * H; g.c1 = g.c2 - 6.2 * u; g.ce = g.c1 - 7.6 * u; g.cs = 4.4 * u; }
  else { g.ce = 0.79 * H; g.c1 = g.ce + 5.3 * u; g.c2 = null; g.cs = 3.3 * u; }
  const kc = Math.max(0.85, kx);
  g.card = P ? { w: 26 * u * k, h: 32 * u * k, rx: 34 * u * k, ry: 66 * u * k }
    : { w: 30 * u * kc, h: 22.9 * u * kc, rx: 64 * u * kx, ry: 29.5 * u };
  g.slots = ANG.map(a => ({
    x: g.ringB.x + Math.cos(a) * g.card.rx, y: g.ringB.y + Math.sin(a) * g.card.ry,
    rot: Math.cos(a) * (P ? 0.09 : 0.11), dx: Math.cos(a), dy: Math.sin(a)
  }));
  // higher cards sit behind lower ones, so each keeps its header in view
  g.zorder = g.slots.map((s, k) => k).sort((a, b) => g.slots[a].y - g.slots[b].y);
  g.cardPad = Math.ceil(2.4 * u);
  g.cards = null; g.nodes = null; g.hatch = null;
  G = g;
  return g;
}

// ── cached pieces ─────────────────────────────────────────────────────────
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

const BOLT = [[0.22, -0.66], [-0.36, 0.1], [-0.04, 0.1], [-0.22, 0.66], [0.36, -0.1], [0.04, -0.1]];
function boltPath(x, cx, cy, r) {
  x.beginPath();
  BOLT.forEach(([bx, by], i) => (i ? x.lineTo(cx + bx * r, cy + by * r) : x.moveTo(cx + bx * r, cy + by * r)));
  x.closePath();
}

/** the bolt node, dark and charged, drawn once at the size it has on the product stage */
function nodeSprites(g, S) {
  if (g.nodes) return g.nodes;
  const r = g.ringB.r * 0.068, s = Math.ceil(r * 9), c = s / 2;
  const off = canvas(s, s), on = canvas(s, s);
  let x = off.getContext('2d');
  let gr = x.createRadialGradient(c, c, r * 0.9, c, c, r * 2.4);
  gr.addColorStop(0, 'rgba(5,11,11,0.96)'); gr.addColorStop(1, 'rgba(5,11,11,0)');
  x.fillStyle = gr; x.fillRect(0, 0, s, s);
  x.fillStyle = '#0a1515'; x.beginPath(); x.arc(c, c, r, 0, TAU); x.fill();
  x.strokeStyle = 'rgba(78,205,196,0.5)'; x.lineWidth = Math.max(1, r * 0.1); x.stroke();
  x.fillStyle = 'rgba(78,205,196,0.42)'; boltPath(x, c, c, r * 0.6); x.fill();
  x = on.getContext('2d');
  gr = x.createRadialGradient(c, c, r * 0.5, c, c, r * 4.4);
  gr.addColorStop(0, 'rgba(78,205,196,0.6)'); gr.addColorStop(0.3, 'rgba(78,205,196,0.2)'); gr.addColorStop(1, 'rgba(78,205,196,0)');
  x.fillStyle = gr; x.fillRect(0, 0, s, s);
  gr = x.createRadialGradient(c - r * 0.35, c - r * 0.35, 0, c, c, r);
  gr.addColorStop(0, '#c8fffa'); gr.addColorStop(0.55, '#4ecdc4'); gr.addColorStop(1, '#1f8f88');
  x.fillStyle = gr; x.beginPath(); x.arc(c, c, r, 0, TAU); x.fill();
  x.strokeStyle = 'rgba(225,255,251,0.95)'; x.lineWidth = Math.max(1, r * 0.1); x.stroke();
  x.fillStyle = '#ffffff'; boltPath(x, c, c, r * 0.6); x.fill();
  g.nodes = { off, on, s, r };
  return g.nodes;
}

let GLOW = null;
function glowSprite() {
  if (GLOW) return GLOW;
  const s = 256, c = canvas(s, s), x = c.getContext('2d');
  const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(78,205,196,0.34)'); gr.addColorStop(0.4, 'rgba(78,205,196,0.12)'); gr.addColorStop(1, 'rgba(78,205,196,0)');
  x.fillStyle = gr; x.fillRect(0, 0, s, s);
  GLOW = c;
  return c;
}

function hatch(ctx, g, S) {
  if (g.hatch) return g.hatch;
  const s = Math.max(6, Math.round(1.5 * S.u)), c = canvas(s, s), x = c.getContext('2d');
  x.strokeStyle = 'rgba(78,205,196,1)'; x.lineWidth = Math.max(1, s * 0.14);
  x.beginPath();
  x.moveTo(-2, s + 2); x.lineTo(s + 2, -2);
  x.moveTo(-2, 2); x.lineTo(2, -2);
  x.moveTo(s - 2, s + 2); x.lineTo(s + 2, s - 2);
  x.stroke();
  g.hatch = ctx.createPattern(c, 'repeat');
  return g.hatch;
}

/** the real screens as device panels (a phone's proportions on a phone),
    built one at a time, cached per frame size */
function cardSprite(g, S, k) {
  if (!g.cards) g.cards = [];
  if (g.cards[k]) return g.cards[k];
  const im = S.img(SCREENS[k]);
  if (!im || !im.width) return null;
  const { w, h } = g.card, u = S.u, pad = g.cardPad, r = (g.P ? 2.4 : 1.3) * u;
  const bz = Math.max(1, (g.P ? 0.75 : 0.45) * u);
  const cv = canvas(w + pad * 2, h + pad * 2), x = cv.getContext('2d');
  x.save();
  x.shadowColor = 'rgba(0,0,0,0.8)'; x.shadowBlur = 1.8 * u; x.shadowOffsetY = 0.8 * u;
  x.fillStyle = '#161615'; rrect(x, pad, pad, w, h, r); x.fill();
  x.restore();
  x.save();
  rrect(x, pad + bz, pad + bz, w - 2 * bz, h - 2 * bz, Math.max(1, r - bz)); x.clip();
  const sc = { fx: 0.5, fy: 0, zoom: g.P ? 1 : 1.03 };
  cover(x, im, pad + bz, pad + bz, w - 2 * bz, h - 2 * bz, sc);
  x.globalCompositeOperation = 'lighter';     // lift the dark UI so it reads at thumbnail size
  cover(x, im, pad + bz, pad + bz, w - 2 * bz, h - 2 * bz, { ...sc, alpha: 0.45 });
  x.globalCompositeOperation = 'source-over';
  const gr = x.createLinearGradient(0, pad, 0, pad + h);
  gr.addColorStop(0, 'rgba(255,255,255,0.08)'); gr.addColorStop(0.3, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(pad, pad, w, h);
  if (g.P) { x.fillStyle = '#050505'; rrect(x, pad + w / 2 - 3.2 * u, pad + bz + 0.8 * u, 6.4 * u, 1.5 * u, 0.75 * u); x.fill(); }
  x.restore();
  x.strokeStyle = 'rgba(78,205,196,0.42)'; x.lineWidth = Math.max(1, 0.12 * u);
  rrect(x, pad + 0.5, pad + 0.5, w - 1, h - 1, r); x.stroke();
  g.cards[k] = cv;
  return cv;
}

// ── the thread's shapes ─────────────────────────────────────────────────────
/* a line bent at constant curvature either side of its lowest point (cx, yb),
   each arm of length L turning through th: th = 0 is the flat line, th = π on
   both arms closes it into a circle of radius L/π sitting on (cx, yb) */
function curl(cx, yb, thL, LL, thR, LR, n = 44) {
  const pts = [];
  const pt = (k, s) => (Math.abs(k) < 1e-9 ? [cx + s, yb] : [cx + Math.sin(k * s) / k, yb - (1 - Math.cos(k * s)) / k]);
  const kL = thL / LL, kR = thR / LR;
  for (let i = n; i >= 1; i--) pts.push(pt(kL, -LL * i / n));
  pts.push([cx, yb]);
  for (let i = 1; i <= n; i++) pts.push(pt(kR, LR * i / n));
  return pts;
}

/** where the after screen is drawn: on the panel, then pushed into the ring */
function cam(g, lt) {
  const e = seg(lt, T.push[0], T.push[1], pushE);
  const s = Math.exp(lerp(Math.log(g.sA), Math.log(g.sB), e));
  const cx = lerp(g.ringA.x, g.ringB.x, e), cy = lerp(g.ringA.y, g.ringB.y, e);
  return { e, s, cx, cy, r: AI.rr * s, x0: cx - AI.rx * s, y0: cy - AI.ry * s };
}

// ── type helpers ───────────────────────────────────────────────────────────
/** kinetic line with an entrance window and an exit window (glyphs lift out) */
function kt(ctx, S, str, x, y, o, tin, tout) {
  const lt = S.lt;
  const r = seg(lt, tin[0], tin[1]);
  if (r <= 0) return;
  const q = tout ? invlerp(tout[0], tout[1], lt) : 0;
  if (q >= 1) return;
  let glyph = o.glyph;
  if (q > 0) {
    const n = [...str].length, lift = o.size * 0.95;
    glyph = (i, p) => {
      const st = n > 1 ? (i / (n - 1)) * 0.4 : 0;
      const e = inCubic(clamp((q - st) / 0.6));
      return { dy: -e * lift, alpha: (o.solid || o.mask ? 1 : p) * (1 - e) };
    };
  } else if (o.solid) glyph = () => ({ alpha: 1 });
  text(ctx, S, str, x, y, { ...o, reveal: r, glyph });
}

/** two weights on one line, placed as one */
function duo(ctx, S, a, b, x, y, o, align, tin, tout) {
  const wa = measure(ctx, a, { ...o, weight: o.w1 }), wb = measure(ctx, b, { ...o, weight: o.w2 });
  const x0 = align === 'center' ? x - (wa + wb) / 2 : x;
  const span = tin[1] - tin[0];
  kt(ctx, S, a, x0, y, { ...o, weight: o.w1 }, [tin[0], tin[0] + span * 0.7], tout);
  kt(ctx, S, b, x0 + wa, y, { ...o, weight: o.w2 }, [tin[0] + span * 0.3, tin[1]], tout && [tout[0] + 0.04, tout[1] + 0.04]);
}

// ── the chapter ────────────────────────────────────────────────────────────
export default {
  id: 'product',
  title: 'The Product',
  caption: 'The thread marks the dead half of the old Gacha pack screen, then coils into the ring of ten refill bolts that replaced it; the bolts charge and deal the live game’s screens out of the pack like cards.',
  assets: [BEFORE, AFTER, ...SCREENS],
  models: [],
  still: 8.3,

  draw(ctx, S) {
    const lt = S.lt;
    if (lt <= T.start || lt >= T.end) { rest(ctx, S); return; }
    const g = geo(S), u = S.u, W = S.W, H = S.H, cy = g.cy;
    const before = S.img(BEFORE), after = S.img(AFTER);
    const c = cam(g, lt);
    const stage = seg(lt, 4.45, 4.95);                           // the product stage takes over
    const fold = seg(lt, T.fold[0], T.fold[1], inCubic);          // the pack folds away
    const packY = c.cy + ((AI.pack[1] + AI.pack[3]) / 2 - AI.ry) * c.s;

    // ── behind: the glow and the dealt screens ─────────────────────────────
    if (stage > 0 && fold < 1) {
      const gs = c.r * 3.4 * (1 + 0.06 * Math.sin(lt * 2.4));
      const flare = 1 + 0.6 * (1 - seg(lt, T.full, T.full + 0.8));
      ctx.save();
      ctx.globalAlpha = stage * (1 - fold) * (lt >= T.full ? flare : 1);
      ctx.drawImage(glowSprite(), c.cx - gs / 2, c.cy - gs / 2, gs, gs);
      ctx.restore();
    }
    // the cached pieces are built ahead of need, one screen per frame, so no frame stalls
    if (lt < T.light0) {
      nodeSprites(g, S); glowSprite(); hatch(ctx, g, S);
      for (let k = 0; k < 10; k++) if (!(g.cards && g.cards[k])) { cardSprite(g, S, k); break; }
    }
    if (lt > T.light0 && lt < T.ret + 0.7) drawCards(ctx, S, g, lt, c);

    // ── the pack screen: before, then after, then pushed into ─────────────
    const uf = seg(lt, T.unfold[0], T.unfold[1], unfoldE);
    const surround = 1 - stage;
    if (uf > 0 && surround > 0 && before && after) {
      const pr = { x: c.x0, y: c.y0, w: AI.w * c.s, h: AI.h * c.s };
      const rad = 1.8 * u * (c.s / g.sA);
      ctx.save();
      if (uf < 1) { ctx.translate(0, cy); ctx.scale(1, Math.max(0.002, uf)); ctx.translate(0, -cy); }
      ctx.globalAlpha = surround;
      ctx.save();
      rrect(ctx, pr.x, pr.y, pr.w, pr.h, rad); ctx.clip();
      ctx.fillStyle = '#0c0c0c'; ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
      let rv = 0;
      const maxR = Math.hypot(Math.max(c.cx - pr.x, pr.x + pr.w - c.cx), Math.max(c.cy - pr.y, pr.y + pr.h - c.cy)) + 2;
      if (lt >= T.reveal[0]) rv = seg(lt, T.reveal[0], T.reveal[1], outExpo) * maxR;
      if (rv < maxR) {
        ctx.drawImage(before, pr.x, pr.y, pr.w, pr.h);
        drawDead(ctx, S, g, lt, pr);
      }
      if (rv > 0) {
        ctx.save();
        if (rv < maxR) { ctx.beginPath(); ctx.arc(c.cx, c.cy, rv, 0, TAU); ctx.clip(); }
        ctx.drawImage(after, pr.x, pr.y, pr.w, pr.h);
        ctx.restore();
        const ea = 1 - seg(lt, T.reveal[0], T.reveal[1]);
        if (ea > 0 && rv < maxR) {
          ctx.strokeStyle = `rgba(78,205,196,${0.85 * ea})`; ctx.lineWidth = Math.max(1, 0.28 * u);
          ctx.beginPath(); ctx.arc(c.cx, c.cy, rv, 0, TAU); ctx.stroke();
        }
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = Math.max(1, 0.14 * u);
      rrect(ctx, pr.x, pr.y, pr.w, pr.h, rad); ctx.stroke();
      ctx.restore();
    }

    // ── the thread ─────────────────────────────────────────────────────────
    drawThread(ctx, S, g, lt, c);

    // ── the pack, in front of the ring ─────────────────────────────────────
    if (lt >= T.reveal[0] && fold < 1 && after) {
      const [x0, y0, x1, y1] = AI.pack;
      ctx.save();
      if (lt < T.reveal[1]) {
        const rv = seg(lt, T.reveal[0], T.reveal[1], outExpo) * c.r * 4;
        ctx.beginPath(); ctx.arc(c.cx, c.cy, rv, 0, TAU); ctx.clip();
      }
      if (fold > 0) {
        ctx.translate(c.cx, lerp(packY, cy, fold));
        ctx.scale(1 - 0.2 * fold, 1 - fold);
        ctx.translate(-c.cx, -packY);
        ctx.globalAlpha = 1 - fold * fold;
      }
      const X = c.x0 + x0 * c.s, Y = c.y0 + y0 * c.s, Wp = (x1 - x0) * c.s, Hp = (y1 - y0) * c.s;
      rrect(ctx, X, Y, Wp, Hp, 7 * c.s); ctx.clip();
      ctx.drawImage(after, x0, y0, x1 - x0, y1 - y0, X, Y, Wp, Hp);
      // a breath of light across the foil as each bolt lands
      const since = lt - lightAt(Math.max(0, Math.min(9, Math.floor((lt - T.light0) / E8))));
      if (lt >= T.light0 && lt < T.full + 0.6) {
        const k = lt >= T.full ? 1 - seg(lt, T.full, T.full + 0.6) : 0.35 * (1 - clamp(since / 0.3));
        if (k > 0) { ctx.fillStyle = `rgba(78,205,196,${0.14 * k})`; ctx.fillRect(X, Y, Wp, Hp); }
      }
      ctx.restore();
    }

    // ── the bolts ──────────────────────────────────────────────────────────
    drawNodes(ctx, S, g, lt, c);

    // ── the selection on the after screen: the old dead half, now working ──
    drawSelection(ctx, S, g, lt, c);

    // ── type ───────────────────────────────────────────────────────────────
    drawType(ctx, S, g, lt);
    drawPill(ctx, S, g, lt);

    // ── the lens, on the hits ──────────────────────────────────────────────
    const fx = S.fx;
    const h0 = invlerp(1.875, 2.15, lt);
    if (h0 > 0 && h0 < 1) { fx.ab = 0.16 * (1 - h0); fx.shake = 0.18 * u * (1 - h0); }
    const h1 = invlerp(T.coil[1], T.coil[1] + 0.6, lt);
    if (h1 > 0 && h1 < 1) {
      fx.warp = h1; fx.warpX = g.ringA.x / W; fx.warpY = g.ringA.y / H;
      fx.ab = Math.max(fx.ab, 0.3 * (1 - clamp(h1 * 2.5)));
    }
    const h2 = invlerp(T.push[1], T.push[1] + 0.25, lt);
    if (h2 > 0 && h2 < 1) fx.exposure = 1 + 0.05 * (1 - h2);
    const h3 = invlerp(T.full, T.full + 0.5, lt);
    if (h3 > 0 && h3 < 1) {
      fx.warp = h3; fx.warpX = g.ringB.x / W; fx.warpY = g.ringB.y / H;
      fx.ab = 0.34 * (1 - clamp(h3 * 2.2)); fx.shake = 0.35 * u * (1 - clamp(h3 * 3));
      fx.exposure = 1 + 0.07 * (1 - clamp(h3 * 3));
    }
  }
};

// ── pieces ─────────────────────────────────────────────────────────────────
function drawDead(ctx, S, g, lt, pr) {
  const a = seg(lt, T.dead, T.dead + 0.55, outCubic);
  if (a <= 0) return;
  const u = S.u, y0 = pr.y + DEAD * pr.h, hh = (1 - DEAD) * pr.h;
  ctx.save();
  ctx.beginPath(); ctx.rect(pr.x, y0, pr.w, hh * a); ctx.clip();
  ctx.fillStyle = 'rgba(78,205,196,0.06)'; ctx.fillRect(pr.x, y0, pr.w, hh);
  ctx.globalAlpha *= 0.3;
  ctx.fillStyle = hatch(ctx, g, S); ctx.fillRect(pr.x, y0, pr.w, hh);
  ctx.restore();
  // the region's edge, drawn round as it fills
  const inset = 1.2 * u, bx = pr.x + inset, by = y0 + inset, bw = pr.w - inset * 2, bh = hh - inset * 2;
  const per = 2 * (bw + bh), e = seg(lt, T.dead + 0.1, T.dead + 0.7, inOutCubic);
  if (e > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(78,205,196,0.75)'; ctx.lineWidth = Math.max(1, 0.15 * u);
    ctx.setLineDash([per * e, per]);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx, by + bh); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
  // 45%
  const cp = seg(lt, T.dead, T.dead + 0.625, outCubic);
  const size = (g.P ? 17 : 15) * u;
  const land = lt > 1.875 ? spring01(lt - 1.875) : 0;
  const sc = 1 + 0.07 * land;
  const mx = pr.x + pr.w / 2, my = y0 + hh * 0.5 + size * 0.36;
  const pw = measure(ctx, '%', { size: size * 0.62, weight: 800 });
  ctx.save();
  ctx.translate(mx, my - size * 0.36); ctx.scale(sc, sc); ctx.translate(-mx, -(my - size * 0.36));
  text(ctx, S, counter(45, cp), mx + pw * 0.35, my, { size, weight: 800, align: 'right', color: PAL.teal, tracking: -0.02 });
  text(ctx, S, '%', mx + pw * 0.35 + 0.3 * u, my, { size: size * 0.62, weight: 800, color: PAL.teal });
  ctx.restore();
}
/** a kick that decays: 1 at t = 0 back to 0, with one soft rebound */
function spring01(t) { return t < 0 ? 0 : Math.exp(-7 * t) * Math.cos(TAU * 2.2 * t); }

function drawThread(ctx, S, g, lt, c) {
  const { W } = S, cy = g.cy;
  if (lt < T.coil[0]) {
    rest(ctx, S);
    // a gleam runs along the line under the title, lifting it glyph by glyph
    if (lt > 0.1 && lt < 0.95) {
      const hw = measure(ctx, 'Gacha, screen', { size: g.hs, weight: 200, tracking: -0.02 });
      const x0 = g.P ? S.W / 2 - hw / 2 : g.colX;
      const gx = x0 + (lt - 0.14) / 0.34 * hw;
      const f = (gx + 0.02 * W) / (1.04 * W);
      const a = seg(lt, 0.1, 0.18) * (1 - seg(lt, 0.6, 0.95));
      if (f > 0 && a > 0) thread(ctx, S, restPoints(S), { sharp: true, from: Math.max(0, f - 0.06), progress: Math.min(1, f), color: PAL.goldHi, glow: 1.8, width: S.lw * 1.4, alpha: a });
    }
    // the split: the thread brightens across the width of the screen it cuts
    const sp = seg(lt, T.unfold[0] - 0.06, T.unfold[1], siteE);
    if (sp > 0) {
      const mid = g.px + g.pw / 2, half = g.pw / 2 * sp;
      const k = 1 - 0.6 * seg(lt, T.unfold[1], T.unfold[1] + 0.7);
      const fade = 1 - seg(lt, T.coil[0] - 0.2, T.coil[0]);
      thread(ctx, S, [[mid - half, cy], [mid + half, cy]], { sharp: true, color: PAL.goldHi, width: S.lw * 1.3, glow: 1.5 * k, alpha: k * fade });
    }
    return;
  }
  if (lt < T.coil[1]) {
    const p = invlerp(T.coil[0], T.coil[1], lt);
    const eL = outCubic(p), eT = inOutCubic(p), eY = inOutCubic(p);
    const r = g.ringA.r, cx = g.ringA.x;
    const LL = lerp(cx + 0.02 * W, Math.PI * r, eL), LR = lerp(1.02 * W - cx, Math.PI * r, eL);
    const th = Math.PI * eT;
    const yb = lerp(cy, g.ringA.y + r, eY);
    thread(ctx, S, curl(cx, yb, th, LL, th, LR));
    return;
  }
  if (lt < T.unwind[0]) {
    const fl = lt >= T.full ? 1 - seg(lt, T.full, T.full + 0.9, outCubic) : 0.7 * (1 - seg(lt, T.coil[1], T.coil[1] + 0.5, outCubic));
    const ring = x => { x.beginPath(); x.arc(c.cx, c.cy, c.r, 0, TAU); };
    thread(ctx, S, ring, { glow: 1 + fl * 1.5, width: S.lw * (1 + 0.5 * fl) });
    // each charged bolt lights its arc of the thread
    for (let k = 0; k < 10; k++) {
      const t0 = lightAt(k);
      if (lt < t0) break;
      const flash = 1 - seg(lt, t0, t0 + 0.55, outQuad);
      const a0 = ANG[k] - Math.PI / 12, a1 = ANG[k] + Math.PI / 12;
      const spread = seg(lt, t0, t0 + 0.18, outCubic);
      const am = ANG[k];
      const ends = 1 - seg(lt, 8.8, 9.0);
      thread(ctx, S, x => { x.beginPath(); x.arc(c.cx, c.cy, c.r, lerp(am, a0, spread), lerp(am, a1, spread)); },
        { color: PAL.goldHi, glow: 0.6 + 1.2 * flash, alpha: (0.45 + 0.55 * flash) * ends, width: S.lw * (1.1 + 0.3 * flash) });
    }
    return;
  }
  // unwind: the ring opens at the top and pulls straight
  const p = invlerp(T.unwind[0], T.unwind[1], lt);
  const R = g.ringB.r;
  const eT = inOutCubic(p), eL = inOutCubic(p), eY = inOutCubic(p);
  const L = lerp(Math.PI * R, 0.52 * W, eL);
  const th = Math.PI * (1 - eT);
  const yb = lerp(g.ringB.y + R, cy, eY);
  thread(ctx, S, curl(W / 2, yb, th, L, th, L));
}

function drawNodes(ctx, S, g, lt, c) {
  const show = seg(lt, 4.45, 4.8);
  if (show <= 0 || lt >= 9.05) return;
  const N = nodeSprites(g, S);
  const scale = c.r / g.ringB.r;
  for (let k = 0; k < 10; k++) {
    const a = ANG[k];
    const x = c.cx + Math.cos(a) * c.r, y = c.cy + Math.sin(a) * c.r;
    const gone = seg(lt, 8.8 + (9 - k) * 0.012, 8.95 + (9 - k) * 0.012, inCubic);
    if (gone >= 1) continue;
    const t0 = lightAt(k);
    const lp = seg(lt, t0, t0 + 0.24);
    const full = lt >= T.full ? 1 - seg(lt, T.full, T.full + 0.5) : 0;
    const base = scale * (1 - gone) * (0.85 + 0.15 * show);
    ctx.save();
    ctx.globalAlpha = show;
    if (lp < 1) {
      const s = N.s * base;
      ctx.globalAlpha = show * (1 - lp);
      ctx.drawImage(N.off, x - s / 2, y - s / 2, s, s);
    }
    if (lp > 0) {
      const pop = 0.55 + 0.45 * outBack(lp, 2.6) + 0.18 * full;
      const s = N.s * base * pop;
      ctx.globalAlpha = lp * (1 - gone);
      ctx.drawImage(N.on, x - s / 2, y - s / 2, s, s);
      // the ripple
      const q = seg(lt, t0, t0 + 0.5);
      if (q > 0 && q < 1) {
        ctx.globalAlpha = (1 - q) * 0.8;
        ctx.strokeStyle = PAL.teal; ctx.lineWidth = Math.max(1, 0.2 * S.u);
        ctx.beginPath(); ctx.arc(x, y, N.r * scale * (1.2 + 2.6 * outExpo(q)), 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawCards(ctx, S, g, lt, c) {
  const u = S.u, cw = g.card.w + g.cardPad * 2, ch = g.card.h + g.cardPad * 2;
  const place = (k, tt) => {
    const t0 = lightAt(k) + 0.02;
    const f = seg(tt, t0, t0 + 0.6, outExpo);
    const r0 = T.ret + (9 - k) * 0.02;
    const b = seg(tt, r0, r0 + 0.28, inCubic);
    const p = f * (1 - b);
    const sl = g.slots[k];
    const drift = clamp(tt - t0 - 0.3) * 0.9 * u * (1 - b);
    const fl = noise1(tt * 0.9 + k * 3.1, k) * 0.5 * u * p;
    return {
      p,
      x: lerp(c.cx, sl.x, p) + sl.dx * drift,
      y: lerp(c.cy, sl.y, p) + sl.dy * drift + fl,
      s: lerp(0.16, 1, p) * (1 + 0.05 * (lt >= T.full ? 1 - seg(tt, T.full, T.full + 0.5) : 0)),
      rot: lerp(sl.rot * 3, sl.rot, p) * (p > 0 ? 1 : 0)
    };
  };
  for (const k of g.zorder) {
    const q = place(k, lt);
    if (q.p <= 0.002) continue;
    const img = cardSprite(g, S, k);
    if (!img) continue;
    const t0 = lightAt(k) + 0.02, r0 = T.ret + (9 - k) * 0.02;
    const moving = (lt > t0 && lt < t0 + 0.32) || (lt > r0 && lt < r0 + 0.28);
    if (moving) {
      for (let j = 3; j >= 1; j--) {
        const gq = place(k, lt - j * 0.022);
        if (gq.p <= 0.002) continue;
        blit(ctx, img, gq, cw, ch, 0.22 / j);
      }
    }
    blit(ctx, img, q, cw, ch, clamp(q.p * 5));
  }
}
function blit(ctx, img, q, cw, ch, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(q.s, q.s);
  ctx.drawImage(img, -cw / 2, -ch / 2);
  ctx.restore();
}

function drawSelection(ctx, S, g, lt, c) {
  const a = seg(lt, 3.45, 3.95, inOutCubic);
  const out = seg(lt, 4.3, 4.5);
  if (a <= 0 || out >= 1) return;
  const u = S.u;
  const [ax0, ay0, ax1, ay1] = AI.panel;
  const x = c.x0 + ax0 * c.s, y = c.y0 + ay0 * c.s, w = (ax1 - ax0) * c.s, h = (ay1 - ay0) * c.s;
  const per = 2 * (w + h);
  ctx.save();
  ctx.globalAlpha = 1 - out;
  ctx.strokeStyle = PAL.teal; ctx.lineWidth = Math.max(1, 0.16 * u);
  ctx.setLineDash([per * a, per]);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.stroke();
  ctx.setLineDash([]);
  const hs = 0.95 * u;
  [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].forEach(([hx, hy], i) => {
    const p = seg(lt, 3.5 + i * 0.1, 3.75 + i * 0.1, outBack);
    if (p <= 0) return;
    const s = hs * p;
    ctx.fillStyle = PAL.bg; ctx.fillRect(hx - s / 2, hy - s / 2, s, s);
    ctx.strokeRect(hx - s / 2, hy - s / 2, s, s);
  });
  ctx.restore();
}

function drawType(ctx, S, g, lt) {
  const u = S.u, cy = g.cy, P = g.P, al = g.align, x = g.colX;
  // ── the title: each line rises off its own sill, the last one off the thread
  if (lt < 4.8) {
    const sh = g.headShift * seg(lt, T.unfold[0], T.unfold[1], unfoldE);
    kt(ctx, S, 'Gacha, screen', x, g.h1 + sh, { size: g.hs, weight: 200, tracking: -0.02, color: PAL.ink, align: al, mask: true, window: 0.5 }, [0.18, 0.86], [4.44, 4.72]);
    kt(ctx, S, 'by screen.', x, g.h2 + sh, { size: g.hs, weight: 800, tracking: -0.02, color: PAL.ink, align: al, mask: true, window: 0.5 }, [0.12, 0.8], [4.47, 4.75]);
    kt(ctx, S, 'THE PRODUCT \u2014 UI/UX I DESIGNED', x, g.he + sh, { size: g.ls, weight: 700, tracking: 0.22, color: PAL.teal, align: al, mask: true, window: 0.45 }, [0.5, 1.0], [4.4, 4.66]);
  }
  // ── before / after
  const bo = { size: g.bs, tracking: -0.01, color: PAL.ink, align: al };
  if (lt < 3.4) {
    kt(ctx, S, 'BEFORE \u2014 THE SHIPPED BUILD', x, g.le, { size: g.ls, weight: 700, tracking: 0.22, color: PAL.dim, align: al, mask: true }, [1.25, 1.65], [3.0, 3.24]);
    kt(ctx, S, '45% of the screen', x, g.l1, { ...bo, weight: 300, mask: true }, [1.33, 1.85], [3.02, 3.28]);
    kt(ctx, S, 'doing nothing', x, g.l2, { ...bo, weight: 800, mask: true }, [1.42, 1.95], [3.05, 3.32]);
  }
  if (lt > 3.1 && lt < 4.8) {
    kt(ctx, S, 'AFTER — LIVE NOW', x, g.le, { size: g.ls, weight: 700, tracking: 0.22, color: PAL.teal, align: al, mask: true }, [3.2, 3.55], [4.42, 4.66]);
    kt(ctx, S, 'every pixel', x, g.l1, { ...bo, weight: 300, mask: true }, [3.25, 3.7], [4.45, 4.7]);
    kt(ctx, S, 'given a job', x, g.l2, { ...bo, weight: 800, mask: true }, [3.33, 3.8], [4.48, 4.74]);
  }
  // ── the product stage: the decision, then where to find it
  const cx = S.W / 2;
  if (lt > 4.9 && lt < 7.7) {
    kt(ctx, S, 'REFILLS BECAME A RING', cx, g.ce, { size: g.ls, weight: 700, tracking: 0.22, color: PAL.teal, align: 'center', mask: true }, [4.95, 5.35], [7.3, 7.55]);
    const co = { size: g.cs, tracking: -0.01, color: PAL.ink, mask: true, w1: 300, w2: 700 };
    if (P) {
      kt(ctx, S, 'Ten bolts around the pack', cx, g.c1, { ...co, weight: 300, align: 'center' }, [5.05, 5.55], [7.32, 7.58]);
      kt(ctx, S, 'are something you spend.', cx, g.c2, { ...co, weight: 700, align: 'center' }, [5.15, 5.65], [7.36, 7.62]);
    } else {
      duo(ctx, S, 'Ten bolts around the pack are ', 'something you spend.', cx, g.c1, co, 'center', [5.05, 5.7], [7.32, 7.58]);
    }
  }
  if (lt > 7.55 && lt < 9.2) {
    kt(ctx, S, 'DESIGNED & PROTOTYPED WITH CLAUDE CODE', cx, g.ce, { size: g.ls, weight: 700, tracking: P ? 0.15 : 0.22, color: PAL.teal, align: 'center', mask: true }, [7.6, 8.0], [8.85, 9.1]);
    kt(ctx, S, 'gacha.thechillgallery.com', cx, g.c1, { size: g.cs * (P ? 1.02 : 1.2), weight: 700, tracking: -0.01, color: PAL.ink, align: 'center', mask: true }, [7.68, 8.1], [8.88, 9.14]);
  }
}

function drawPill(ctx, S, g, lt) {
  const a = seg(lt, 4.95, 5.25, outCubic) * (1 - seg(lt, 8.8, 9.0, inCubic));
  if (a <= 0) return;
  const u = S.u, P = g.P;
  let n = 0;
  for (let k = 0; k < 10; k++) if (lt >= lightAt(k)) n = k + 1;
  const fs = P ? 2.9 * u : 2.0 * u, h = fs * 2.3;
  const o1 = { size: fs, weight: 500 }, o2 = { size: fs, weight: 800 };
  const w1 = measure(ctx, 'Refills:', o1), w2 = measure(ctx, '10/10', o2);
  const iw = fs * 1.1, gap = fs * 0.55, padX = fs * 1.15;
  const w = padX * 2 + iw + gap + w1 + fs * 0.35 + w2;
  const cx = g.ringB.x, cyP = g.pillY;
  const full = lt >= T.full ? 1 - seg(lt, T.full, T.full + 0.7) : 0;
  const sc = (0.9 + 0.1 * outBack(seg(lt, 4.95, 5.3))) * (1 + 0.06 * full);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(cx, cyP); ctx.scale(sc, sc); ctx.translate(-cx, -cyP);
  const x = cx - w / 2, y = cyP - h / 2;
  rrect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = `rgba(78,205,196,${0.07 + 0.12 * full})`; ctx.fill();
  ctx.strokeStyle = `rgba(78,205,196,${0.7 + 0.3 * full})`; ctx.lineWidth = Math.max(1, 0.13 * u); ctx.stroke();
  ctx.fillStyle = PAL.teal; boltPath(ctx, x + padX + iw / 2, cyP, fs * 0.62); ctx.fill();
  const base = cyP + fs * 0.36;
  text(ctx, S, 'Refills:', x + padX + iw + gap, base, { ...o1, color: PAL.dim });
  // the count ticks up with each bolt: the new digit drops in
  const tk = n ? lightAt(n - 1) : 0;
  const tick = n ? seg(lt, tk, tk + 0.18, outCubic) : 1;
  const nx = x + padX + iw + gap + w1 + fs * 0.35;
  ctx.save();
  ctx.beginPath(); ctx.rect(nx - fs * 0.2, y, w2 + fs, h); ctx.clip();
  text(ctx, S, `${n}/10`, nx, base + (1 - tick) * fs * 0.9, { ...o2, color: n === 10 ? PAL.teal : PAL.ink });
  ctx.restore();
  ctx.restore();
}
