/* 7 — The edit. Station 06 of the flight: CapCut — me. Editing, music and
   sound effects: three crafts, one seat.

   The thread at rest becomes the edit's ruler. Ticks sprout from it, and a
   chrome playhead rides it one page (one bar) per sweep, so every beat tick
   passes under the playhead exactly on the beat. Behind it the three real
   CapCut timelines open out of the thread as the ship's displays, a
   wraparound console in depth rimmed in the nav's liquid metal. The HUD's
   three lanes light on the beats in the metal's own triplet: VIDEO white,
   MUSIC its cold glint, SFX its warm one.

   Local clock (s), 96 bpm, beats at k × 0.625, bars at 0 · 2.5 · 5:
     0.00  seam
     0.10  the thread turns ruler: ticks and timecodes sprout left to right,
           the playhead grows out of it and starts its first page
     0.14  STAGE 06 OF 06 types on; the outlined 06 surfaces
     0.28  the three displays open out of the thread, centre first
     0.625 VIDEO lights · CapCut rises · chips ME + EDITING · the caption
           'THREE CRAFTS, ONE SEAT. THESE ARE THE REAL TIMELINES.' (held to 2.24)
     1.25  MUSIC lights · chip MUSIC
     1.875 SFX lights · chip SOUND EFFECTS
     2.24  the ident and caption drop away (gone by 2.42); 2.32 the page turns
     2.42  NO HANDOFF. rises out of its sill, seated on the downbeat
     2.50  the hit: the words settle from their slam scale, punch-in, a shock
           ring, every lane flashes
     2.72  a glass pane drops from the thread
     3.125 · 3.75 · 4.375  the playhead razors the video clip on the beat and
           a sound effect lands in the cut, one at a time
     3.125 I DIRECTED IT, SO I KNOW HOW TO CUT IT.  (readable 3.35–5.10)
     3.40  chapterAt() from the player (showreel/main.js 52–55, verbatim)
           types into the pane (3.40–4.25); live telemetry under it by 4.30
     5.00  third page; the stars begin to stretch
     5.625 SFX lane, the code pane and the right display go back into the thread
     6.25  MUSIC and the left display
     6.875 VIDEO, the centre display, the ruler and the playhead; the warp's bow
           wave rolls out from the centre, past the frame's edge by 7.0
     7.06  the warp peaks and falls away       7.40  seam
*/
import {
  clamp, lerp, seg, rng, noise1,
  outExpo, outCubic, outBack, inQuad, inCubic, inOutQuad, inOutCubic, navE, siteE,
  cover, rrect, text, layout
} from '../../kit.js';
import { camera } from '../../space.js';
import { seam, space, wireAcross, metal, chip, numeral, glass, mono, stamp, UI, MONO } from '../kit3.js';
import { BEAT, BAR } from '../palette.js';

const B = BEAT;
const IN = 0.1, OUT = 7.4;                      // the seam holds outside these

// the three real timelines, as displays: left, centre, right
const SHOTS = [
  'assets/process/img-3f4314c6c9.jpg',
  'assets/process/img-2e74a67371.jpg',
  'assets/process/img-9751199664.jpg'
];
const TW = 840, TH = 525;                       // display textures, 16:10

// the player's own code (showreel/main.js, lines 52–55), verbatim
const CODE_FILE = 'showreel/main.js', CODE_FROM = 52;
const CODE = [
  '  function chapterAt(t) {',
  '    for (const c of CHAPTERS) if (t < c.end) return c;',
  '    return CHAPTERS[CHAPTERS.length - 1];',
  '  }'
];
const CODE_COLS = Math.max(...CODE.map(l => l.length));
const KEYWORDS = /^(function|for|const|of|if|return)$/;
const HIT_REF = { size: 100, weight: 900, tracking: -0.01 };

// ── the clock, local seconds ──────────────────────────────────────────────
const T = {
  label: [0.14, 0.62],
  numeral: 0.26,
  open: [0.40, 0.28, 0.52], openLen: 0.9,       // left, centre, right
  close: [2 * BAR + 2 * B, 2 * BAR + 3 * B, 2 * BAR + B], closeLen: 0.42,
  title: B,
  lanes: [B, 2 * B, 3 * B],                     // VIDEO, MUSIC, SFX light
  retract: [2 * BAR + 3 * B, 2 * BAR + 2 * B, 2 * BAR + B],
  cap: [B, B + 0.35],                           // the caption comes in with the VIDEO lane
  identOut: [BAR - 0.26, BAR - 0.08],           // clear before the hit's words start up
  hit: BAR, hitIn: [BAR - 0.08, BAR + 0.12],    // the words are seated on the downbeat
  line: BAR + B,
  razor: [BAR + B, BAR + 2 * B, BAR + 3 * B],
  pane: BAR + 0.22, type: [BAR + 0.9, BAR + 1.75], paneOut: 2 * BAR + B,   // types once the line has seated
  textOut: 2 * BAR + 0.1,
  stageOut: 2 * BAR + 2 * B - 0.1,
  rulerOut: 2 * BAR + 3 * B,
  warp: [2 * BAR, 7.06, 7.36], warpRing: [2 * BAR + 3 * B, 7.3]
};
// the edit on the timeline, in content time (= local time)
const VIDEO_CUTS = [0, 0.3125, 0.9375, 1.25, 1.875, 2.1875, 2.5, 5, 5.3125, 5.625, 6.25, 6.5625, 6.875, 7.5];
const SFX_AT = [B, 2 * B, 3 * B, BAR, BAR + B, BAR + 2 * B, BAR + 3 * B, 2 * BAR, 2 * BAR + B, 2 * BAR + 2 * B];
const LANES = [
  { name: 'VIDEO', color: [245, 244, 240] },
  { name: 'MUSIC', color: [174, 203, 255] },
  { name: 'SFX', color: [255, 217, 174] }
];
const CHIPS = [['ME', 0, true], ['EDITING', 0], ['MUSIC', 1], ['SOUND EFFECTS', 2]];

// ── small helpers ─────────────────────────────────────────────────────────
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a)})`;
const decay = (lt, t0, k = 7) => (lt >= t0 ? Math.exp(-(lt - t0) * k) : 0);
const pad2 = n => String(n).padStart(2, '0');
/** NLE timecode at 24 fps: mm:ss:ff */
function tcode(t) {
  const f = Math.floor(t * 24 + 1e-6);
  return `${pad2(Math.floor(f / 1440))}:${pad2(Math.floor(f / 24) % 60)}:${pad2(f % 24)}`;
}
/** how far a display's shutter is open */
function shutter(lt, i) {
  return navE(seg(lt, T.open[i], T.open[i] + T.openLen)) * (1 - inOutCubic(seg(lt, T.close[i], T.close[i] + T.closeLen)));
}
/** the view's left edge in content time: the page turns on each bar line, landing on the downbeat */
function viewStart(lt) {
  let v = 0;
  for (const b of [BAR, 2 * BAR]) v += BAR * inOutCubic(seg(lt, b - 0.18, b));
  return v;
}
/** monospace, letter-spaced, typed on (the /process stage index) */
function spaced(ctx, str, x, y, size, o = {}) {
  const n = o.reveal === undefined ? str.length : Math.floor(clamp(o.reveal) * str.length);
  if (n <= 0 || (o.alpha ?? 1) <= 0) return 0;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.font = `${o.weight || 600} ${Math.round(size)}px ${MONO}`;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const cw = ctx.measureText('0').width, step = cw + (o.tracking ?? 0.3) * size;
  const W = str.length * step - (o.tracking ?? 0.3) * size;
  let x0 = o.align === 'right' ? x - W : o.align === 'center' ? x - W / 2 : x;
  ctx.fillStyle = o.color || UI.muted;
  for (let i = 0; i < n; i++) ctx.fillText(str[i], x0 + i * step, y);
  ctx.restore();
  return W;
}
/** one line of type rising out of its own sill; pOut slides it back up and away */
function sill(ctx, S, str, x, y, o, pIn, pOut = 0) {
  if (pIn <= 0 || pOut >= 1) return;
  const L = layout(ctx, str, o);
  const x0 = o.align === 'center' ? x - L.width / 2 : o.align === 'right' ? x - L.width : x;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 - o.size, y - L.ascent * 1.3, L.width + o.size * 2, (L.ascent + L.descent) * 1.45); ctx.clip();
  if (pOut > 0) ctx.translate(0, -pOut * L.ascent * 1.45);
  text(ctx, S, str, x, y, { ...o, reveal: pIn, rise: L.ascent * 1.3, window: o.window ?? 0.55, ease: outExpo });
  ctx.restore();
}

// ── geometry for the frame's shape ────────────────────────────────────────
const geoCache = new Map();
function geo(S) {
  const key = `${S.W}x${S.H}`;
  let g = geoCache.get(key);
  if (g) return g;
  const { W, H, u, portrait } = S, mid = H / 2;
  if (!portrait) {
    const tx = 0.07 * W;
    g = {
      tx, label: 11.6 * u, labelSize: 1.45 * u,
      title: 20.6 * u, titleSize: 7.4 * u, chipY: 23.3 * u, chipSize: 1.2 * u,
      hit: 22.4 * u, hitSize: 10.4 * u,
      lines: [['I DIRECTED IT, SO I KNOW HOW TO CUT IT.', 29 * u]], lineSize: 2.55 * u,
      numX: 0.93 * W, numY: 22.8 * u, numSize: 17 * u,
      lx: tx, xa: tx + 9.6 * u, xb: 0.6 * W,
      lane: [mid + 4.4 * u, mid + 8 * u, mid + 11.6 * u], laneH: 1.8 * u,
      laneLabel: 1.1 * u, rulerLabel: 1.15 * u, band: [mid - 5.6 * u, mid + 14 * u], bandFill: 0.74,
      pane: { x: 0.645 * W, y: mid + 2.2 * u, w: 0.285 * W, size: 1.36 * u },
      cap: ['THREE CRAFTS, ONE SEAT. THESE ARE THE REAL TIMELINES.'], capY: mid + 35 * u, capSize: 1.7 * u,
      disp: { top: 37 * u, bot: mid + 31 * u, maxW: 0.35 * W, yaw: 0.5, side: 0.66, gap: 2.4 * u, strips: 20 }
    };
  } else {
    /* a centred stack: the ident, the console, the timeline on the thread, the code under it.
       The thread is fixed at the middle, so the stack is balanced around it as far as the
       frame's height allows; on squat frames the console and the code shrink first. */
    const tx = 0.07 * W, hu = H / u;
    const short = hu < 150, tall = hu > 200;
    const dispBot = mid + 13 * u;
    const y0 = Math.max(0.08 * H + 11 * u, Math.min(0.44 * H - 38 * u, dispBot - 83 * u));   // the stage index's baseline
    const dispTop = y0 + 33 * u;
    let paneSize = clamp((0.86 * H - (mid + 19 * u)) / 13.8, 1.7 * u, 2.35 * u);
    let paneY = Math.min(mid + 25 * u, 0.86 * H - paneSize * 13.4 - 0.8 * u);
    // a tall phone has room below the thread: the pane sits lower and larger, so bar 2 fills the frame
    if (tall) { paneSize = 2.5 * u; paneY = Math.max(mid + 30 * u, 0.82 * H - paneSize * 13.6 - 0.8 * u); }
    g = {
      tx, label: y0, labelSize: 2.0 * u,
      title: y0 + 11 * u, titleSize: 9.6 * u, chipY: y0 + 14 * u, chipSize: 1.5 * u,
      hit: y0 + 14.2 * u, hitSize: 12.6 * u,
      lines: [['I DIRECTED IT,', y0 + 21 * u], ['SO I KNOW HOW TO CUT IT.', y0 + 25.6 * u]], lineSize: 3.3 * u,
      numX: 0.93 * W, numY: y0 + 1.2 * u, numSize: 14 * u,
      lx: tx, xa: tx + 12 * u, xb: 0.93 * W,
      lane: [mid + 5 * u, mid + 9.2 * u, mid + 13.4 * u], laneH: 2.1 * u,
      laneLabel: 1.55 * u, rulerLabel: 1.6 * u, band: [mid - 6.4 * u, mid + 16.2 * u], bandFill: 0.74,
      pane: tall ? { x: 0.06 * W, y: paneY, w: 0.88 * W, size: paneSize, lh: 1.72 } : { x: 0.07 * W, y: paneY, w: 0.86 * W, size: paneSize },
      // bar 1's caption: under the timeline, or anchoring the lower third of a tall phone
      cap: ['THREE CRAFTS, ONE SEAT.', 'THESE ARE THE REAL TIMELINES.'], capY: tall ? 0.7 * H : paneY + 4 * u, capSize: (tall ? 2.7 : 2.4) * u,
      disp: { top: Math.min(dispTop, dispBot - 24 * u), bot: dispBot, maxW: 0.8 * W, yaw: 0.55, side: 0.66, gap: 2.2 * u, strips: 16 },
      short
    };
    if (short) {
      /* a squat upright frame (a tablet): the line goes on one line, and the console rises above
         the timeline's glass instead of sitting behind it; only its foot tucks under the glass */
      g.lines = [['I DIRECTED IT, SO I KNOW HOW TO CUT IT.', y0 + 20.6 * u]];
      g.lineSize = 2.45 * u;
      g.disp = { ...g.disp, top: y0 + 25.4 * u, bot: mid + 1 * u };
      g.bandFill = 0.6;
    }
  }
  if (geoCache.size > 6) geoCache.clear();
  geoCache.set(key, g);
  return g;
}

// ── the displays ──────────────────────────────────────────────────────────
const ZOOM = 0.9, D = 100;                      // displays sit at depth D; the camera starts behind z = 0
const textures = new Map();                     // one per timeline, fixed size
function texture(S, i) {
  const p = SHOTS[i];
  let c = textures.get(p);
  if (c) return c;
  const img = S.img(p);
  if (!img || !img.width) return null;
  c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0c10'; g.fillRect(0, 0, TW, TH);
  cover(g, img, 0, 0, TW, TH, { fx: 0.5, fy: 0.45 });
  // the display's glass: a cool dark cast, a sheen across the top left, darker edges
  g.fillStyle = 'rgba(6,8,14,.30)'; g.fillRect(0, 0, TW, TH);
  const sh = g.createLinearGradient(0, 0, TW * 0.55, TH);
  sh.addColorStop(0, 'rgba(255,255,255,.10)'); sh.addColorStop(0.42, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.fillRect(0, 0, TW, TH);
  const vg = g.createRadialGradient(TW / 2, TH / 2, TH * 0.3, TW / 2, TH / 2, TW * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)');
  g.fillStyle = vg; g.fillRect(0, 0, TW, TH);
  // a fine raster, as a panel has
  g.fillStyle = 'rgba(0,0,0,.16)';
  for (let y = 0; y < TH; y += 3) g.fillRect(0, y, TW, 1);
  textures.set(p, c);
  return c;
}

/** the console in world space: centre display flat, the sides yawed toward the seat */
function consoleOf(S, G) {
  const F = ZOOM * Math.min(S.W, S.H), k0 = F / D, d = G.disp;
  const hs = Math.min(d.bot - d.top, d.maxW / 1.6);
  const cyS = (d.top + d.bot) / 2 - S.H / 2;
  const h = hs / k0, w = h * 1.6, gap = d.gap / k0, cy = cyS / k0, a = d.yaw;
  const ws = w * d.side, hsd = h * d.side, ca = Math.cos(a), sa = Math.sin(a);
  return [
    { c: [-w / 2 - gap - ca * ws / 2, cy, D - sa * ws / 2], r: [ca, 0, sa], w: ws, h: hsd, n: d.strips },
    { c: [0, cy, D], r: [1, 0, 0], w, h, n: 1 },
    { c: [w / 2 + gap + ca * ws / 2, cy, D - sa * ws / 2], r: [ca, 0, -sa], w: ws, h: hsd, n: d.strips }
  ];
}
function panelPoint(cam, P, s, v) {
  return cam.project(P.c[0] + P.r[0] * (s - 0.5) * P.w, P.c[1] + (v - 0.5) * P.h, P.c[2] + P.r[2] * (s - 0.5) * P.w);
}
/** a display: its picture mapped strip by strip (true perspective across a yawed panel), its rows v0..v1 */
function drawDisplay(ctx, S, cam, P, src, v0, v1, o) {
  const quad = [panelPoint(cam, P, 0, v0), panelPoint(cam, P, 1, v0), panelPoint(cam, P, 1, v1), panelPoint(cam, P, 0, v1)];
  if (quad.some(q => !q)) return;
  const path = () => { ctx.beginPath(); quad.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); };
  const kAvg = (quad[0].k + quad[1].k) / 2, kScale = kAvg / (ZOOM * Math.min(S.W, S.H) / D);
  const rim = Math.max(1.2, 0.5 * S.u * kScale);
  ctx.save();
  ctx.globalAlpha *= o.alpha;
  // a faint halo, then the dark bezel behind the glass
  path();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(245,244,240,.045)'; ctx.lineWidth = rim * 6; ctx.stroke();
  ctx.strokeStyle = '#0c0c0e'; ctx.lineWidth = rim * 3.2; ctx.stroke();
  // the picture
  if (src && v1 - v0 > 0.002) {
    const SW = src.width, SH = src.height, n = P.n;
    for (let i = 0; i < n; i++) {
      const s0 = i / n, s1 = (i + 1) / n;
      const a = panelPoint(cam, P, s0, v0), b = panelPoint(cam, P, s1, v0), c = panelPoint(cam, P, s0, v1);
      if (!a || !b || !c) continue;
      const sx = s0 * SW, sw = SW / n, sy = v0 * SH, sh = Math.max(0.5, (v1 - v0) * SH);
      ctx.setTransform((b.x - a.x) / sw, (b.y - a.y) / sw, (c.x - a.x) / sh, (c.y - a.y) / sh, a.x, a.y);
      ctx.drawImage(src, sx, sy, Math.min(sw + 1.5, SW - sx), sh, 0, 0, Math.min(sw + 1.5, SW - sx), sh);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // dim for focus, and the cold flash of a display powering up
    path();
    if (o.dim > 0) { ctx.fillStyle = `rgba(5,6,10,${o.dim})`; ctx.fill(); }
    if (o.flash > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(174,203,255,${0.1 * o.flash})`; ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    // light catching the glass: a diagonal glint that crosses the display once
    if (o.glint > 0 && o.glint < 1) {
      ctx.save(); ctx.clip();
      const xs = quad.map(q => q.x), ys = quad.map(q => q.y);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const w = x1 - x0, cx = lerp(x0 - 0.5 * w, x1 + 0.5 * w, o.glint), sk = (y1 - y0) * 0.6;
      const g = ctx.createLinearGradient(cx - 0.2 * w, 0, cx + 0.2 * w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.13)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - 0.2 * w + sk, y0); ctx.lineTo(cx + 0.2 * w + sk, y0); ctx.lineTo(cx + 0.2 * w - sk, y1); ctx.lineTo(cx - 0.2 * w - sk, y1);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  // the chrome rim
  path();
  ctx.strokeStyle = metal(ctx, quad[0].x, quad[0].y, quad[2].x, quad[2].y, o.phase, Math.max(60, 40 * S.u * kScale));
  ctx.lineWidth = rim; ctx.stroke();
  ctx.restore();
  return quad;
}

// ── the timeline HUD ──────────────────────────────────────────────────────
/** the glass the timeline sits in: it opens out of the thread, and its floor follows the lanes home */
function drawBand(ctx, S, G, lt) {
  const { u } = S, mid = S.H / 2;
  const open = navE(seg(lt, 0.3, 1.05)) * (1 - inOutCubic(seg(lt, T.rulerOut, T.rulerOut + 0.36)));
  if (open <= 0.002) return;
  // the floor rides up as the SFX, then the MUSIC lane go back into the thread
  const floor = lerp(G.band[1], G.lane[0] + (G.band[1] - G.lane[2]), inOutCubic(seg(lt, T.retract[2], T.retract[1] + 0.34)));
  const x0 = G.lx - 2 * u, x1 = G.xb + 1.6 * u;
  const y0 = lerp(mid, G.band[0], open), y1 = lerp(mid, floor, open);
  ctx.save();
  ctx.fillStyle = `rgba(5,6,10,${G.bandFill * open})`;
  rrect(ctx, x0, y0, x1 - x0, y1 - y0, 0.8 * u); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.03 * open})`; ctx.fill();
  // HUD corner ticks instead of a full frame
  const L = 1.6 * u;
  ctx.strokeStyle = `rgba(245,244,240,${0.42 * open})`; ctx.lineWidth = Math.max(1, 0.12 * u);
  ctx.beginPath();
  for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x1, y1, -1, -1], [x0, y1, 1, -1]]) {
    ctx.moveTo(cx + sx * L, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * L);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRulerAndLanes(ctx, S, G, lt) {
  const { u } = S, mid = S.H / 2, { xa, xb } = G;
  const span = xb - xa, vs = viewStart(lt);
  const X = tau => xa + ((tau - vs) / BAR) * span;
  const tStart = S.t - S.lt;
  const out = inOutCubic(seg(lt, T.rulerOut, T.rulerOut + 0.36));
  const ph = X(lt);                             // the playhead

  ctx.save();
  ctx.beginPath(); ctx.rect(xa - 0.6 * u, 0, span + 1.2 * u, S.H); ctx.clip();
  // ── ruler: sixteenths on the thread, beats taller and labelled
  const j0 = Math.floor(vs / (B / 4)) - 1, j1 = Math.ceil((vs + BAR) / (B / 4)) + 1;
  ctx.lineWidth = Math.max(1, 0.12 * u);
  const lf = G.rulerLabel;
  ctx.font = `500 ${Math.round(lf)}px ${MONO}`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const TICK = [[2.3, 'rgba(245,244,240,.75)'], [1.5, 'rgba(245,244,240,.5)'], [0.65, 'rgba(245,244,240,.26)']];
  for (let pass = 0; pass < 3; pass++) {           // one stroke per kind of tick
    ctx.beginPath();
    for (let j = j0; j <= j1; j++) {
      const kind = j % 16 === 0 ? 0 : j % 4 === 0 ? 1 : 2;
      if (kind !== pass) continue;
      const x = X(j * B / 4);
      if (x < xa - 1 || x > xb + 1) continue;
      const f = (x - xa) / span;
      const grow = outCubic(seg(lt, IN + 0.36 * f, IN + 0.36 * f + 0.3)) * (1 - out);
      if (grow <= 0) continue;
      ctx.moveTo(x, mid - 0.5 * u); ctx.lineTo(x, mid - 0.5 * u - TICK[kind][0] * u * grow);
    }
    ctx.strokeStyle = TICK[pass][1]; ctx.stroke();
  }
  for (let j = j0; j <= j1; j++) {
    const tau = j * B / 4, x = X(tau);
    if (x < xa - 1 || x > xb + 1) continue;
    const f = (x - xa) / span;
    const grow = outCubic(seg(lt, IN + 0.36 * f, IN + 0.36 * f + 0.3)) * (1 - out);
    if (grow <= 0) continue;
    if (j % 4 === 0) {
      // a beat just passed under the playhead burns a moment brighter; the head never sits on a label
      const k = decay(lt, tau, 6);
      const lx = x + 0.45 * u, clear = clamp((Math.max(ph - (lx + 4.9 * lf), lx - ph) - 0.6 * u) / (1.2 * u), 0.15, 1);
      ctx.fillStyle = `rgba(245,244,240,${(0.5 + 0.5 * k) * grow * clear})`;
      ctx.fillText(tcode(tStart + tau), x + 0.45 * u, mid - 1.3 * u - lf * 0.2);
    }
  }
  ctx.restore();

  // ── lanes
  const st = { bright: [] };
  for (let k = 0; k < 3; k++) {
    const lit = lt >= T.lanes[k] ? 1 : 0;
    const back = inOutCubic(seg(lt, T.retract[k], T.retract[k] + 0.34));
    if (back >= 1) continue;
    const y = lerp(G.lane[k], mid, back), a = 1 - back;
    const flash = decay(lt, T.lanes[k], 6) + 0.55 * decay(lt, T.hit, 5);
    const bright = lit * (0.62 + 0.38 * Math.min(1, flash));
    st.bright[k] = bright;
    const col = LANES[k].color, h = G.laneH * (1 - back * 0.8);
    // the lane's name and its swatch
    const ghost = 0.3 * outCubic(seg(lt, 0.35 + k * 0.08, 0.8 + k * 0.08));
    const la = Math.max(ghost, lit * (0.7 + 0.3 * Math.min(1, flash))) * a;
    ctx.save();
    ctx.globalAlpha = la;
    ctx.fillStyle = rgba(col, 1);
    ctx.fillRect(G.lx, y - 0.3 * u, 0.6 * u, 0.6 * u);
    text(ctx, S, LANES[k].name, G.lx + 1.4 * u, y + G.laneLabel * 0.36, { size: G.laneLabel, weight: 700, tracking: 0.2, color: lit ? UI.ink : UI.muted });
    ctx.restore();
    // the empty track before it lights: a hairline
    ctx.save();
    ctx.beginPath(); ctx.rect(xa, y - h, xb - xa, h * 2); ctx.clip();
    if (!lit) {
      ctx.globalAlpha = ghost * a;
      ctx.strokeStyle = 'rgba(245,244,240,.35)'; ctx.lineWidth = Math.max(1, 0.1 * u);
      ctx.setLineDash([0.5 * u, 0.5 * u]);
      ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      continue;
    }
    ctx.globalAlpha = a;
    if (k === 0) drawVideo(ctx, S, G, lt, X, y, h, bright);
    else if (k === 1) drawMusic(ctx, S, G, lt, X, y, h, bright, vs);
    else drawSfx(ctx, S, G, lt, X, y, h, bright);
    // the light arriving: a hairline scan across the lane, fired on its beat
    const sw = seg(lt, T.lanes[k], T.lanes[k] + 0.26);
    if (sw > 0 && sw < 1) {
      const gx = lerp(xa, xb, outCubic(sw)), tail = 7 * u;
      const gr = ctx.createLinearGradient(gx - tail, 0, gx, 0);
      gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, 0.28 * (1 - sw)));
      ctx.fillStyle = gr; ctx.fillRect(gx - tail, y - h / 2, tail, h);
      ctx.fillStyle = rgba([255, 255, 255], 0.9 * (1 - sw));
      ctx.fillRect(gx - 0.1 * u, y - h * 0.9, 0.2 * u, h * 1.8);
    }
    ctx.restore();
  }
  return st;
}

function drawVideo(ctx, S, G, lt, X, y, h, bright) {
  const { u } = S;
  // the cut list: fixed cuts, plus the razor cuts made on the playhead in bar 2
  const cuts = VIDEO_CUTS.map(t => ({ t, g: 1 }));
  for (const t of T.razor) if (lt >= t) cuts.push({ t, g: outExpo(seg(lt, t, t + 0.2)) });
  cuts.sort((a, b) => a.t - b.t);
  const gap = 0.32 * u, hair = Math.max(1, 0.1 * u);
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], b = cuts[i + 1];
    const x0 = X(a.t) + (gap * a.g) / 2, x1 = X(b.t) - (gap * b.g) / 2;
    if (x1 < G.xa || x0 > G.xb || x1 - x0 < 1) continue;
    // the clip under the playhead is the selected one
    const on = lt >= a.t && lt < b.t ? 1 : 0;
    ctx.fillStyle = `rgba(245,244,240,${0.07 + 0.09 * bright + 0.2 * on})`;
    rrect(ctx, x0, y - h / 2, x1 - x0, h, 0.26 * u); ctx.fill();
    ctx.strokeStyle = `rgba(245,244,240,${0.22 + 0.3 * bright + 0.35 * on})`; ctx.lineWidth = hair; ctx.stroke();
    // a lit top edge, and the clip's head frame
    ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * bright})`;
    ctx.fillRect(x0 + 0.3 * u, y - h / 2 + hair, Math.max(0, x1 - x0 - 0.6 * u), hair);
    ctx.fillStyle = `rgba(245,244,240,${0.3 + 0.45 * bright})`;
    ctx.fillRect(x0 + 0.25 * u, y - h / 2 + 0.3 * u, Math.min(0.9 * u, (x1 - x0) * 0.3), h - 0.6 * u);
  }
  // the razor's spark
  for (const t of T.razor) {
    const k = decay(lt, t, 11);
    if (k < 0.02) continue;
    const x = X(t);
    ctx.fillStyle = `rgba(255,255,255,${k})`;
    ctx.fillRect(x - 0.1 * u, y - h * 1.3, 0.2 * u, h * 2.6);
    ctx.fillStyle = `rgba(255,217,174,${0.35 * k})`;
    ctx.fillRect(x - 0.9 * u * k, y - h / 2, 1.8 * u * k, h);
  }
}

function drawMusic(ctx, S, G, lt, X, y, h, bright, vs) {
  const { u } = S;
  const x0 = Math.max(G.xa, X(0)), x1 = Math.min(G.xb, X(7.5));
  ctx.fillStyle = `rgba(174,203,255,${0.07 + 0.07 * bright})`;
  rrect(ctx, x0, y - h / 2, x1 - x0, h, 0.28 * u); ctx.fill();
  ctx.strokeStyle = `rgba(174,203,255,${0.25 + 0.4 * bright})`; ctx.lineWidth = Math.max(1, 0.1 * u); ctx.stroke();
  // the waveform, fixed in content time: a kick on every beat, a swell on the bar
  // (what the playhead has already played burns brighter than what is still to come)
  const step = BAR / Math.round((G.xb - G.xa) / (0.4 * u));
  const j0 = Math.floor(vs / step), j1 = Math.ceil((vs + BAR) / step);
  const bw = Math.max(1, 0.18 * u);
  for (const past of [true, false]) {             // the played part, then what is to come: one colour each
    ctx.fillStyle = past ? `rgba(174,203,255,${0.5 + 0.5 * bright})` : `rgba(174,203,255,${0.28 + 0.22 * bright})`;
    ctx.beginPath();
    for (let j = j0; j <= j1; j++) {
      const tau = j * step, x = X(tau);
      if (x < G.xa || x > G.xb || (tau <= lt) !== past) continue;
      const inBeat = (tau % B) / B, inBar = (tau % BAR) / BAR;
      let a = 0.1 + 0.8 * Math.exp(-inBeat * 6) + 0.28 * Math.exp(-((inBeat + 0.5) % 1) * 9)
        + 0.14 * (0.5 + 0.5 * noise1(tau * 16, 3)) + 0.06 * rng(j, 9);
      a *= 0.82 + 0.18 * Math.sin(inBar * Math.PI);
      const hh = Math.max(bw, clamp(a) * (h - 0.4 * u));
      ctx.rect(x - bw / 2, y - hh / 2, bw, hh);
    }
    ctx.fill();
  }
}

function drawSfx(ctx, S, G, lt, X, y, h, bright) {
  const { u } = S;
  for (let i = 0; i < SFX_AT.length; i++) {
    const t = SFX_AT[i];
    // each effect lands when the playhead reaches it — the ones before the lane lit are already down
    const land = t <= T.lanes[2] ? 1 : outBack(seg(lt, t, t + 0.22), 2.2);
    if (land <= 0) continue;
    const long = t === T.hit ? 0.62 : 0.2;
    const x0 = X(t), x1 = X(t + long * B);
    if (x1 < G.xa || x0 > G.xb) continue;
    const yy = y - (1 - land) * 2.2 * u;
    ctx.globalAlpha = Math.min(1, land);
    ctx.fillStyle = `rgba(255,217,174,${0.18 + 0.2 * bright})`;
    rrect(ctx, x0, yy - h / 2, x1 - x0, h, 0.28 * u); ctx.fill();
    ctx.strokeStyle = `rgba(255,217,174,${0.4 + 0.5 * bright})`; ctx.lineWidth = Math.max(1, 0.1 * u); ctx.stroke();
    // its keyframe diamond
    const r = 0.42 * u;
    ctx.fillStyle = `rgba(255,217,174,${0.6 + 0.4 * bright})`;
    ctx.beginPath(); ctx.moveTo(x0, yy - r); ctx.lineTo(x0 + r, yy); ctx.lineTo(x0, yy + r); ctx.lineTo(x0 - r, yy); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawPlayhead(ctx, S, G, lt, phase) {
  const { u } = S, mid = S.H / 2;
  const grow = outCubic(seg(lt, IN, IN + 0.45)) * (1 - inOutCubic(seg(lt, T.rulerOut, T.rulerOut + 0.32)));
  if (grow <= 0.002) return;
  const vs = viewStart(lt), x = G.xa + ((lt - vs) / BAR) * (G.xb - G.xa);
  const top = mid - 3.4 * u * grow, bot = mid + (G.lane[2] - mid + G.laneH + 0.9 * u) * grow;
  ctx.save();
  // a soft column of light behind the head
  const glow = ctx.createLinearGradient(x - 1.6 * u, 0, x + 1.6 * u, 0);
  glow.addColorStop(0, 'rgba(174,203,255,0)'); glow.addColorStop(0.5, `rgba(174,203,255,${0.09 * grow})`); glow.addColorStop(1, 'rgba(174,203,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(x - 1.6 * u, top, 3.2 * u, bot - top);
  // the chrome line
  ctx.fillStyle = metal(ctx, x, top, x, bot, phase * 2, 9 * u);
  ctx.fillRect(x - 0.13 * u, top, 0.26 * u, bot - top);
  // its head: a small chrome shield on the ruler
  const hw = 1.15 * u * grow, hh = 2.1 * u * grow;
  ctx.beginPath();
  ctx.moveTo(x - hw, top - hh * 0.2); ctx.lineTo(x + hw, top - hh * 0.2); ctx.lineTo(x + hw, top + hh * 0.45);
  ctx.lineTo(x, top + hh); ctx.lineTo(x - hw, top + hh * 0.45); ctx.closePath();
  ctx.fillStyle = metal(ctx, x - hw, top, x + hw, top + hh, phase * 2 + 0.3, 3 * u); ctx.fill();
  ctx.strokeStyle = 'rgba(10,10,12,.8)'; ctx.lineWidth = Math.max(1, 0.1 * u); ctx.stroke();
  ctx.restore();
}

// ── the code pane ─────────────────────────────────────────────────────────
function drawPane(ctx, S, G, lt) {
  const { u } = S, P = G.pane, mid = S.H / 2;
  const open = siteE(seg(lt, T.pane, T.pane + 0.5)) * (1 - inOutCubic(seg(lt, T.paneOut, T.paneOut + 0.34)));
  if (open <= 0.002) return;
  const lf = P.lh || 1.62, padX = 1.6 * u;
  // the longest line (and its gutter) must fit inside the glass
  let size = P.size;
  for (let i = 0; i < 8; i++) {
    ctx.font = `400 ${Math.round(size)}px ${MONO}`;
    if (ctx.measureText('0').width * (CODE_COLS + 3) <= P.w - 2 * padX) break;
    size *= 0.96;
  }
  const lh = size * lf, head = size * 3.1;
  const fullH = head + CODE.length * lh + size * 3.6 + 0.8 * u;
  // it drops from the thread like a blind
  const y0 = lerp(mid, P.y, Math.min(1, open * 1.2)), h = fullH * open;
  ctx.save();
  ctx.fillStyle = `rgba(6,8,14,${0.7 * open})`;
  rrect(ctx, P.x, y0, P.w, h, 1.2 * u); ctx.fill();
  glass(ctx, S, P.x, y0, P.w, h, { r: 1.2 * u, alpha: open });
  // a cold edge along the top — the hologram's emitter
  const e = ctx.createLinearGradient(P.x, 0, P.x + P.w, 0);
  e.addColorStop(0, 'rgba(174,203,255,0)'); e.addColorStop(0.3, `rgba(174,203,255,${0.55 * open})`); e.addColorStop(0.7, `rgba(174,203,255,${0.55 * open})`); e.addColorStop(1, 'rgba(174,203,255,0)');
  ctx.fillStyle = e; ctx.fillRect(P.x + 1.2 * u, y0, P.w - 2.4 * u, Math.max(1, 0.12 * u));
  ctx.beginPath(); rrect(ctx, P.x, y0, P.w, h, 1.2 * u); ctx.clip();
  const ta = seg(lt, T.pane + 0.2, T.pane + 0.5);
  // header: the file, and where in it
  const hy = y0 + size * 2.1;
  ctx.globalAlpha = ta;
  ctx.font = `600 ${Math.round(size * 0.92)}px ${MONO}`; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = UI.muted; ctx.textAlign = 'left'; ctx.fillText(CODE_FILE, P.x + padX, hy);
  ctx.fillStyle = UI.faint; ctx.textAlign = 'right';
  ctx.fillText(`L${CODE_FROM}–${CODE_FROM + CODE.length - 1}`, P.x + P.w - padX, hy);
  ctx.fillStyle = 'rgba(245,244,240,.1)'; ctx.fillRect(P.x + padX, y0 + head - size * 0.4, P.w - 2 * padX, Math.max(1, 0.1 * u));
  // the code, typed on with the kit's mono(); then its keywords picked out in the metal's cold glint
  const reveal = seg(lt, T.type[0], T.type[1]);
  ctx.font = `400 ${Math.round(size)}px ${MONO}`; ctx.textAlign = 'left';
  const cw = ctx.measureText('0').width, gx = P.x + padX, cx = gx + cw * 3;
  const yl = i => y0 + head + lh * (i + 0.72);
  if (lt > T.type[1]) {
    // the running line — the loop that picks the chapter — lit on every beat once typed
    const k = 0.35 + 0.65 * decay(lt, Math.floor(lt / B) * B, 5);
    ctx.fillStyle = `rgba(174,203,255,${0.07 * k})`; ctx.fillRect(P.x + 0.5 * u, yl(1) - size * 1.05, P.w - u, lh);
  }
  ctx.fillStyle = UI.faint;
  for (let i = 0; i < CODE.length; i++) ctx.fillText(String(CODE_FROM + i), gx, yl(i));
  mono(ctx, S, CODE, cx, yl(0), { size, lh: lf, color: UI.muted, reveal, cursor: true });
  let left = Math.floor(clamp(reveal) * CODE.reduce((n, l) => n + l.length, 0));
  ctx.font = `400 ${Math.round(size)}px ${MONO}`;
  for (let i = 0; i < CODE.length && left > 0; i++) {
    const line = CODE[i], shown = line.slice(0, Math.min(line.length, left));
    left -= line.length;
    let col = 0;
    for (const m of shown.matchAll(/[A-Za-z_]\w*|\d+|\s+|./g)) {
      const tok = m[0];
      const c = KEYWORDS.test(tok) ? UI.ion : /^\d+$/.test(tok) ? UI.ember : tok === 'chapterAt' || tok === 'CHAPTERS' ? UI.ink : null;
      if (c) { ctx.fillStyle = c; ctx.fillText(tok, cx + col * cw, yl(i)); }
      col += tok.length;
    }
  }
  // once typed, the caret blinks in eighths for a beat and a half
  if (reveal >= 1 && lt < T.type[1] + 0.9 && Math.floor(lt / (B / 2)) % 2 === 0) {
    ctx.fillStyle = UI.ink;
    ctx.fillRect(cx + CODE[CODE.length - 1].length * cw + size * 0.1, yl(CODE.length - 1) - size * 0.8, size * 0.55, size * 0.95);
  }
  // live telemetry: where the clock is, and what chapterAt says about it
  const ry = y0 + head + CODE.length * lh + size * 2.1;
  const ra = seg(lt, T.type[1] - 0.2, T.type[1] + 0.05);
  if (ra > 0) {
    ctx.globalAlpha = ra;
    ctx.fillStyle = 'rgba(245,244,240,.1)'; ctx.fillRect(P.x + padX, ry - size * 1.5, P.w - 2 * padX, Math.max(1, 0.1 * u));
    ctx.font = `500 ${Math.round(size * 0.92)}px ${MONO}`;
    ctx.fillStyle = UI.muted; ctx.fillText(stamp(S.t), gx, ry);
    ctx.fillStyle = UI.ink; ctx.textAlign = 'right';
    ctx.fillText(`→ EDIT · ${(S.t - S.lt).toFixed(2)}–${(S.t - S.lt + S.d).toFixed(2)}`, P.x + P.w - padX, ry);
  }
  ctx.restore();
}

// ── the frame ─────────────────────────────────────────────────────────────
export default {
  id: 'edit',
  title: 'The edit',
  caption: 'Station 06, CapCut: the three real edit timelines become the ship\'s displays while video, music and sound-effect lanes light on the beat — no handoff.',
  assets: SHOTS,
  models: [],
  still: 4.3,
  sfx: [
    { at: 0.26, type: 'whoosh', gain: 0.45 },
    { at: B, type: 'tick', gain: 0.7 }, { at: 2 * B, type: 'tick', gain: 0.7 }, { at: 3 * B, type: 'tick', gain: 0.7 },
    { at: BAR - 0.18, type: 'whoosh', gain: 0.35 },
    { at: BAR, type: 'impact' }, { at: BAR, type: 'sub', gain: 0.7 },
    { at: BAR + B, type: 'tick', gain: 0.55 }, { at: BAR + 2 * B, type: 'tick', gain: 0.55 }, { at: BAR + 3 * B, type: 'tick', gain: 0.55 },
    { at: 2 * BAR + B, type: 'glitch', gain: 0.25 },
    { at: T.warpRing[0], type: 'whoosh', gain: 0.5 }
  ],
  prepare(S) { for (let i = 0; i < SHOTS.length; i++) texture(S, i); },
  draw(ctx, S) {
    const lt = S.lt;
    if (lt < IN || lt > OUT) { seam(ctx, S); return; }
    const { W, H, u } = S, mid = H / 2, G = geo(S);
    const p = seg(lt, IN, OUT);
    // the hit is set as large as the frame's width allows
    const hitSize = Math.min(G.hitSize, (S.portrait ? 0.86 : 0.6) * W / (layout(ctx, 'NO HANDOFF.', HIT_REF).width / 100));

    // ── the camera: a slow push through bar 1, a punch-in on the hit, then the pull into the warp
    const cz = -14 + 8 * outCubic(seg(lt, IN, BAR)) + 6 * outExpo(seg(lt, T.hit, T.hit + 0.4))
      + 4 * seg(lt, T.hit + 0.4, 2 * BAR) + 14 * inQuad(seg(lt, 2 * BAR, 7.3));
    const pc = seg(lt, IN, 7.3);                 // the camera's drift settles before the seam
    const cx = 3.2 * Math.sin(Math.PI * pc) * (1 - 0.5 * seg(lt, 2 * BAR, 7.3));
    const cam = camera(S, { x: cx, y: 0, z: cz, zoom: ZOOM });

    // ── the warp: stars stretch through the last bar and drop out onto the seam
    const wb = inQuad(seg(lt, T.warp[0], T.warp[1])) * (1 - inOutQuad(seg(lt, T.warp[1], T.warp[2])));
    const zoom = 1 + 0.03 * Math.sin(Math.PI * pc) + 0.05 * wb;
    space(ctx, S, { x: -cx * 0.0022, y: 0, zoom, warp: 0.78 * wb });

    // ── the lens
    const fx = S.fx;
    const hitK = decay(lt, T.hit, 8);
    fx.ab = 0.5 * hitK + 0.35 * wb;
    fx.exposure = 1 + 0.07 * decay(lt, T.hit, 10);
    if (lt >= T.hit && lt < T.hit + 0.42) {
      // a shock ring off the hit, already wide when it lands
      fx.warp = lerp(0.42, 1, outCubic(seg(lt, T.hit, T.hit + 0.42)));
      fx.warpX = (G.tx + 0.4 * hitSize * layout(ctx, 'NO HANDOFF.', HIT_REF).width / 100) / W;
      fx.warpY = (G.hit - hitSize * 0.36) / H;
    } else if (lt >= T.warpRing[0] && lt < T.warpRing[1]) {
      // the warp's bow wave: off the last beat, as the last lane goes home, and out past the
      // frame's edge within a few frames (it starts outside everything still on screen)
      fx.warp = lerp(S.portrait ? 0.3 : 0.45, 1, outCubic(seg(lt, T.warpRing[0], T.warpRing[1])));
      fx.warpX = 0.5; fx.warpY = 0.5;
    }

    // ── the displays
    const phase = 5 * smoother(Math.pow(p, 1.35));
    const con = consoleOf(S, G);
    const dimBase = 0.18 + 0.2 * seg(lt, T.hit - 0.1, T.hit + 0.3) * (1 - seg(lt, 2 * BAR, 2 * BAR + 0.5));
    const order = [0, 2, 1];
    const quads = [];
    for (const i of order) {
      const o = shutter(lt, i);
      if (o <= 0.001) continue;
      const P = con[i];
      const vt = clamp((0 - (P.c[1] - P.h / 2)) / P.h);   // where the thread (world y = 0) crosses the display
      const v0 = lerp(vt, 0, o), v1 = lerp(vt, 1, o);
      const flash = Math.sin(Math.PI * clamp(seg(lt, T.open[i] + 0.1, T.open[i] + 0.75))) * (1 - seg(lt, T.close[i], T.close[i] + 0.1));
      const q = drawDisplay(ctx, S, cam, P, texture(S, i), v0, v1, {
        alpha: 1, dim: dimBase + 0.12 * decay(lt, T.hit, 3), flash: flash * 0.8, phase: 0.35 * lt + i * 0.31,
        glint: inOutCubic(seg(lt, T.hit - 0.04 + 0.07 * [0, 1, 2][i], T.hit + 0.62 + 0.07 * [0, 1, 2][i]))
      });
      if (q) quads[i] = { q, o };
    }
    // their labels, under the bottom rims (landscape only — a phone sees just the centre)
    for (let i = 0; i < 3; i++) {
      const Q = quads[i];
      if (!Q || Q.o < 0.6) continue;
      if (S.portrait) break;
      const a = seg(Q.o, 0.6, 1) * (1 - seg(lt, T.hit - 0.2, T.hit + 0.2) * 0.4);
      const bl = Q.q[3], br = Q.q[2];
      const x = Math.max(bl.x, 0.06 * W) + 0.8 * u;
      if (x > W * 0.94 - 12 * u) continue;
      const y = lerp(bl.y, br.y, clamp((x - bl.x) / Math.max(1, br.x - bl.x))) + 2.4 * u;
      text(ctx, S, `CAPCUT TIMELINE ${i + 1}`, x, y, { size: (S.portrait ? 1.35 : 0.95) * u, weight: 700, tracking: 0.22, color: UI.faint, alpha: a });
    }

    // ── the timeline band, the thread, the ruler, the lanes, the playhead
    drawBand(ctx, S, G, lt);
    wireAcross(ctx, S, mid, { phase });
    drawRulerAndLanes(ctx, S, G, lt);
    drawPlayhead(ctx, S, G, lt, phase);
    // the reel's timecode in the lanes' header, where an editor keeps it
    const tcA = outCubic(seg(lt, IN + 0.1, IN + 0.5)) * (1 - inOutCubic(seg(lt, T.rulerOut, T.rulerOut + 0.3)));
    if (tcA > 0) {
      ctx.save(); ctx.globalAlpha = tcA;
      ctx.font = `600 ${Math.round(G.rulerLabel * 1.12)}px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = UI.ink; ctx.fillText(tcode(S.t), G.lx, mid - 1.3 * u - G.rulerLabel * 0.2);
      ctx.restore();
    }

    // ── the code pane, and before it arrives, what the displays are
    drawPane(ctx, S, G, lt);
    // bar 1 leaves with the page turn, clear of the hit's words
    const identOut = inCubic(seg(lt, T.identOut[0], T.identOut[1]));
    const capIn = outCubic(seg(lt, T.cap[0], T.cap[1]));
    const capA = capIn * (1 - identOut);
    if (capA > 0) {
      const cs = G.capSize, cy = G.capY + (1 - capIn) * 0.9 * u - identOut * 0.9 * u;
      ctx.save(); ctx.globalAlpha = capA;
      ctx.fillStyle = UI.muted; ctx.fillRect(G.tx, cy - cs * 0.4, 2.2 * u, Math.max(1, 0.1 * u));
      G.cap.forEach((str, i) => text(ctx, S, str, G.tx + 3.2 * u, cy + i * cs * 1.9, { size: cs, weight: 600, tracking: 0.2, color: UI.ink, alpha: 0.86 }));
      ctx.restore();
    }

    // ── the station's ident
    const stageA = 1 - seg(lt, T.stageOut, T.stageOut + 0.4);
    spaced(ctx, 'STAGE 06 OF 06', G.tx, G.label, G.labelSize, { reveal: seg(lt, T.label[0], T.label[1]), color: UI.muted, alpha: stageA, tracking: 0.32 });
    const nA = siteE(seg(lt, T.numeral, T.numeral + 0.9)) * stageA;
    if (nA > 0) numeral(ctx, S, '06', G.numX, G.numY + (1 - nA) * 1.5 * u, G.numSize, { alpha: nA, metal: true, phase: 0.2 * lt + 0.5 * outExpo(seg(lt, T.hit, T.hit + 0.6)) });

    // CapCut and its chips, for bar 1
    if (identOut < 1) {
      const tg = ctx.createLinearGradient(0, G.title - G.titleSize * 0.75, 0, G.title);
      tg.addColorStop(0, UI.ink); tg.addColorStop(1, '#bdbbb4');
      sill(ctx, S, 'CapCut', G.tx - 0.04 * G.titleSize, G.title, { size: G.titleSize, weight: 800, tracking: -0.02, color: tg }, seg(lt, T.title, T.title + 0.5), identOut);
      let x = G.tx;
      for (const [str, lane, solid] of CHIPS) {
        const tIn = T.lanes[lane];
        const pin = outExpo(seg(lt, tIn, tIn + 0.35));
        const w = chip(ctx, S, str, x, G.chipY + (1 - pin) * 0.8 * u - identOut * 1.5 * u, { size: G.chipSize, solid, alpha: pin * (1 - identOut) });
        // the chip catches its lane's light
        const k = solid ? 0 : decay(lt, tIn, 5);
        if (k > 0.02 && identOut < 1) {
          ctx.save();
          ctx.strokeStyle = rgba(LANES[lane].color, 0.9 * k * (1 - identOut));
          ctx.lineWidth = Math.max(1, 0.14 * u);
          rrect(ctx, x, G.chipY + (1 - pin) * 0.8 * u - identOut * 1.5 * u, w, G.chipSize * 2.6, G.chipSize * 1.3); ctx.stroke();
          ctx.restore();
        }
        x += w + 0.6 * u;
      }
    }

    // NO HANDOFF. — up out of its sill just ahead of the hit, seated on it, then settling from
    // its slam scale; the line under it
    const out = inOutCubic(seg(lt, T.textOut, T.textOut + 0.42));
    const hin = seg(lt, T.hitIn[0], T.hitIn[1]);
    if (hin > 0 && out < 1) {
      const sc = 1 + 0.09 * (1 - outExpo(seg(lt, T.hit, T.hit + 0.5)));
      ctx.save();
      // the slam scales about the words' centre, so the full-width phone setting stays in frame
      const ax = G.tx + 0.5 * hitSize * layout(ctx, 'NO HANDOFF.', HIT_REF).width / 100;
      ctx.translate(ax, G.hit); ctx.scale(sc, sc); ctx.translate(-ax, -G.hit);
      sill(ctx, S, 'NO HANDOFF.', G.tx - 0.05 * hitSize, G.hit, { ...HIT_REF, size: hitSize, color: UI.ink, window: 0.9 }, hin, out);
      ctx.restore();
    }
    G.lines.forEach(([str, y], i) => {
      const lin = seg(lt, T.line + 0.08 * i, T.line + 0.08 * i + 0.5);
      const lout = inOutCubic(seg(lt, T.textOut + 0.06 * i, T.textOut + 0.06 * i + 0.4));
      sill(ctx, S, str, G.tx, y, { size: G.lineSize, weight: 700, tracking: 0.14, color: UI.ink, window: 0.5 }, lin, lout);
    });
  }
};

function smoother(x) { return x * x * (3 - 2 * x); }
