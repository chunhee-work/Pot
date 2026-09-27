/* 4 — Voices   (global 22.5–30 s · pink)

   Twelve speakers switched on, one a beat. The camera flies a zig-zag
   through a stack of posters standing in depth: each is a speech bubble
   (dark — a speaker that is off) with the character's name. On the beat
   the name punches toward the lens letter by letter, the bubble snaps and
   turns on like a tube (a line of white that opens into the picture) and
   sound-rings run out of it into depth; then the camera lunges past it,
   onto the next. On a phone the stack runs downward instead of side to side.
   After the twelfth the camera lands on "12 VOICES" filling the frame with
   the credit in a paper bubble; the I of VOICES fills up paper-white like a
   level meter, and the camera dives into it until paper is all there is.

   time map (local s; a beat every 0.469, bars at 1.875 / 3.75 / 5.625)
   0.00  pink — the camera is still coming out of the last letter, at speed
   0.08  through a cone of paper rings; the first bubble brakes in out of the pink
   0.47  ZEYO      (a voice on every beat from here: `cues` below)
         each: whip 0.28 s before the beat, dolly in, name punches, bubble on
   0.94  FOT · 1.41 SKET · 1.88 CCATS (bar) · 2.34 KETDONUT · 2.81 GST
   3.28  HEARTA · 3.75 ECOX (bar) · 4.22 FROAK · 4.69 LYCHEE · 5.16 WICK
   5.63  OLD KEEPER (bar)
   6.09  "12 VOICES" slams in, credit bubble pops (phone: the cast grid too) — held to ~7.2
   6.56  the I of VOICES fills paper-white, rings run out of it
   6.95  a breath back, then 7.03 the dive into the I
   7.38  paper covers the frame; pure paper to the end */
import { clamp, lerp, invlerp, seg, noise1, outExpo, outCubic, outQuad, inOutQuad, inOutCubic, inCubic, bezier, layout, FONT, TAU } from '../../kit.js';
import { camera, list, mix } from '../../space.js';
import { BLOCK, BEAT, BAR } from '../palette.js';
import { nextColour } from '../timeline.js';

const PINK = BLOCK.pink, INK = BLOCK.ink, PAPER = BLOCK.paper;

// fx, fy: the face as a fraction of the image; nx: right edge of the name
// lettered into the picture (px of 900) — crops stay right of it
const CAST = [
  { v: 'zeyo',     name: 'ZEYO',     img: 'assets/char-zeyo.jpg',     fx: 0.64, fy: 0.50, nx: 398 },
  { v: 'fot',      name: 'FOT',      img: 'assets/char-fot.jpg',      fx: 0.70, fy: 0.49, nx: 278 },
  { v: 'sket',     name: 'SKET',     img: 'assets/char-sket.jpg',     fx: 0.56, fy: 0.54, nx: 328 },
  { v: 'ccats',    name: 'CCATS',    img: 'assets/char-ccats.jpg',    fx: 0.63, fy: 0.43, nx: 322 },
  { v: 'ketdonut', name: 'KETDONUT', img: 'assets/char-ketdonut.jpg', fx: 0.62, fy: 0.48, nx: 452 },
  { v: 'gst',      name: 'GST',      img: 'assets/char-gst.jpg',      fx: 0.63, fy: 0.46, nx: 362 },
  { v: 'hearta',   name: 'HEARTA',   img: 'assets/char-hearta.jpg',   fx: 0.62, fy: 0.56, nx: 418 },
  { v: 'ecox',     name: 'ECOX',     img: 'assets/char-ecox.jpg',     fx: 0.62, fy: 0.54, nx: 408 },
  { v: 'froak',    name: 'FROAK',    img: 'assets/char-froak.jpg',    fx: 0.62, fy: 0.42, nx: 400 },
  { v: 'lychee',   name: 'LYCHEE',   img: 'assets/char-lychee.jpg',   fx: 0.54, fy: 0.53, nx: 356 },
  { v: 'wick',     name: 'WICK',     img: 'assets/v-wick.jpg',        fx: 0.66, fy: 0.48, nx: 418 },
  { v: 'keeper',   name: 'OLD KEEPER', lines: ['OLD', 'KEEPER'], img: 'assets/v-keeper.jpg', fx: 0.62, fy: 0.36, nx: 428 }
];
const N = CAST.length;

// ── time ─────────────────────────────────────────────────────────────────
const ARR = CAST.map((_, i) => (i + 1) * BEAT);   // one voice a beat, 0.47 … 5.63
const FINAL = 13 * BEAT;     // 6.094  "12 VOICES"
const SWITCH = 14 * BEAT;    // 6.563  the I fills paper-white
const FLY = 15 * BEAT;       // 7.031  the dive
const FILL = 7.38;           // paper covers the frame by here
const LUNGE = 0.28;          // the camera's run onto each poster ends on the beat
const DRIFT = 0.045;         // the share of each step spent pushing in on the poster just landed

// ── space ────────────────────────────────────────────────────────────────
/* One unit is a tenth of the frame's short side at the reading distance D,
   so a landscape frame is 17.8 × 10 units there and a phone 10 × 21.6. */
const D = 11, DZ = 13, ZOOM = 1.1;
const FOG = { near: 14, far: 42 };

// where each poster stands (x, y); z = i · DZ. The camera lands square on each.
const WIDE = [[0, 0], [11, -3], [1.5, -9.5], [-10, -4], [-2.5, 5], [9, 6.5], [17, 0.5], [8, -6.5], [-3, -8], [-13, -2], [-4, 6.5], [6.5, 4.5], [0, 0]];
const TALL = [[0, 0], [1.2, 9], [-1.2, 18], [0.8, 27], [-0.8, 36], [1.2, 45], [-1.2, 54], [0.8, 63], [-0.8, 72], [1.2, 81], [-1.2, 90], [0.8, 99], [0, 108]];
// each poster's own tilt, and how the name sits against the bubble
const TILT = [0, -0.035, 0.03, 0, -0.03, 0.035, 0, 0.03, -0.035, 0, 0.03, -0.02];
const WIDE_FORM = ['C', 'A', 'B', 'C', 'A', 'B', 'C', 'A', 'B', 'C', 'A', 'B'];
const TALL_FORM = ['C', 'T', 'U', 'C', 'T', 'U', 'C', 'T', 'U', 'C', 'T', 'U'];

// ── easing ───────────────────────────────────────────────────────────────
const PRE = bezier(0.12, 0.55, 0.3, 1.03);    // the opening: still at speed out of the last letter, braking onto ZEYO
const PUNCH = bezier(0.45, 0, 0.3, 1.3);      // a glyph punching at the lens, overshooting
const hit = (x, d) => (x >= 0 && x < d ? (1 - x / d) ** 2 : 0);

// ── measurement (fonts are in before any chapter draws) ──────────────────
const TR = -0.012;
let MET = null;
function metrics(ctx) {
  if (MET) return MET;
  ctx.save();
  ctx.font = `900 100px ${FONT.sans}`;
  const m = ctx.measureText('I');
  ctx.restore();
  const iL = -(m.actualBoundingBoxLeft || -7), iR = m.actualBoundingBoxRight || 29, iA = m.actualBoundingBoxAscent || 69;
  MET = { iL, iR, iA };
  return MET;
}
function inkBox(ctx, str, o) {
  ctx.save();
  ctx.font = `${o.weight} 100px ${FONT.sans}`;
  const m = ctx.measureText(str);
  ctx.restore();
  return { l: -(m.actualBoundingBoxLeft || 0), r: m.actualBoundingBoxRight || m.width };
}

/** a line of glyphs laid out in world units: [{ ch, dx }], left edge at x, baseline y */
function line(ctx, str, cap, weight = 900) {
  const L = layout(ctx, str, { size: 100, weight, tracking: TR });
  const k = cap / 72, ink = inkBox(ctx, str, { weight });
  const glyphs = [];
  L.chars.forEach((ch, j) => { if (ch !== ' ') glyphs.push({ ch, dx: L.xs[j] * k }); });
  return { str, cap, glyphs, width: L.width * k, inkL: ink.l * k, inkR: ink.r * k };
}
/** the cap height at which a string's ink is `w` wide */
function capFor(ctx, str, w, weight = 900) {
  const ink = inkBox(ctx, str, { weight });
  return (w * 72) / Math.max(1, ink.r - ink.l);
}
/** place a line so its ink starts / ends / centres on x */
function anchor(ln, x, align) {
  if (align === 'left') ln.x = x - ln.inkL;
  else if (align === 'right') ln.x = x - ln.inkR;
  else ln.x = x - (ln.inkL + ln.inkR) / 2;
  return ln;
}

// ── the posters' forms (poster-local units, cached per orientation) ──────
const FORMS = new Map();
function forms(ctx, portrait) {
  let F = FORMS.get(portrait);
  if (F) return F;
  F = CAST.map((c, i) => (portrait ? tallForm : wideForm)(ctx, c, i));
  F.push(finalForm(ctx, portrait));
  FORMS.set(portrait, F);
  return F;
}

function nameBlock(ctx, c, budget, capMax) {
  const strs = c.lines || [c.name];
  let cap = capMax;
  for (const s of strs) cap = Math.min(cap, capFor(ctx, s, budget));
  return { cap, lines: strs.map(s => line(ctx, s, cap)) };
}
/** stack the lines of a name: the last baseline at yb, aligned on x */
function stack(block, x, yb, align) {
  const n = block.lines.length, lh = block.cap * 1.1;
  block.lines.forEach((ln, j) => { anchor(ln, x, align); ln.y = yb - (n - 1 - j) * lh; });
  block.top = yb - (n - 1) * lh - block.cap * 0.97;
  return block;
}
const heightOf = block => block.cap * (0.97 + 1.1 * (block.lines.length - 1));
/** the voice's number, 01 … 12, in paper — the bubble's tail points at it */
const index = (i, x, y, cap, align) => ({ str: String(i + 1).padStart(2, '0'), x, y, cap, align });

/* Landscape, at the reading distance: text stays inside x ±7.3, y −3.8…3.25
   so the push-in that follows each landing keeps it inside the safe frame. */
function wideForm(ctx, c, i) {
  const kind = WIDE_FORM[i], rot = TILT[i];
  if (kind === 'C') {
    const name = stack(nameBlock(ctx, c, 13.2, 3.0), 0, 3.25, 'center');
    const left = i % 2 === 0;
    return { kind, rot, name, idx: index(i, left ? -7.3 : 7.3, -2.75, 1.05, left ? 'left' : 'right'),
      bub: { x: 0, y: -0.85, w: 6.9, h: 6.0, round: true, tail: { tx: left ? -4.6 : 4.6, ty: -1.55 } } };
  }
  const left = kind === 'A', sg = left ? 1 : -1;
  const name = stack(nameBlock(ctx, c, 12.8, 3.0), -7.3 * sg, 3.25, left ? 'left' : 'right');
  return { kind, rot, name, idx: index(i, -7.3 * sg, -2.75, 1.05, left ? 'left' : 'right'),
    bub: { x: 3.3 * sg, y: -0.8, w: 7.4, h: 6.0, round: false,
      tail: { side: left ? 'l' : 'r', at: -0.3, tx: -5.3 * sg, ty: -1.85, bw: 1.1 } } };
}

/* Phone: stacked. Text inside x ±4.1, y −7.4…6.3 (of a 10 × 19 box). */
function tallForm(ctx, c, i) {
  const kind = TALL_FORM[i], rot = TILT[i] * 0.7;
  const name = nameBlock(ctx, c, 8.2, 3.0);
  if (kind === 'T') {             // name on top, bubble below, number at the foot
    stack(name, 0, -7.1 + heightOf(name), 'center');
    return { kind, rot, name, idx: index(i, -4.1, 6.3, 0.85, 'left'),
      bub: { x: 0.4, y: 1.0, w: 8.4, h: 8.4, round: false, tail: { side: 'b', at: -0.5, tx: -3.0, ty: 5.25, bw: 1.0 } } };
  }
  if (kind === 'U') {             // number, bubble, name at the foot
    stack(name, 0, 6.2, 'center');
    return { kind, rot, name, idx: index(i, -4.1, -6.5, 0.85, 'left'),
      bub: { x: 0.4, y: -0.9, w: 8.4, h: 8.4, round: false, tail: { side: 't', at: -0.5, tx: -3.0, ty: -5.3, bw: 1.0 } } };
  }
  stack(name, 0, 6.2, 'center'); // a round bubble, the name across its foot
  return { kind, rot, name, idx: index(i, 4.1, -6.5, 0.85, 'right'),
    bub: { x: 0, y: -1.1, w: 8.8, h: 8.6, round: true, tail: { tx: 3.7, ty: -5.2 } } };
}

const CREDIT = ['Cast, directed', 'and generated', 'with ElevenLabs.'];
function finalForm(ctx, portrait) {
  const m = metrics(ctx);
  const F = { rot: 0 };
  if (!portrait) {
    const cv = Math.min(3.0, capFor(ctx, 'VOICES', 14.6));
    const voices = anchor(line(ctx, 'VOICES', cv), -7.3, 'left'); voices.y = 3.25;
    const y12 = voices.y - cv * 0.97 - 0.45;
    const c12 = Math.min(4.3, (y12 + 3.8) / 0.97);
    const twelve = anchor(line(ctx, '12', c12), -7.3, 'left'); twelve.y = y12;
    const x0 = twelve.x + twelve.inkR + 1.0, top = y12 - c12 * 0.97;
    F.lines = [twelve, voices];
    F.bub = { x: (x0 + 7.3) / 2, y: top + (c12 * 0.97 - 0.5) / 2, w: 7.3 - x0, h: c12 * 0.97 - 0.5, r: 0.8 };
    F.bub.tail = { side: 'b', at: -0.7, tx: -F.bub.w / 2 - 0.3, ty: F.bub.h / 2 + 0.85, bw: 0.8 };
  } else {
    // the cast in a 6 × 2 grid, then 12 / VOICES, then the credit
    const cv = Math.min(2.0, capFor(ctx, 'VOICES', 8.2));
    const c12 = Math.min(4.6, capFor(ctx, '12', 8.2));
    const fd = 1.3, fg = 0.16, fh = 2 * fd + fg, bh = 3.4;
    const total = fh + 0.75 + c12 * 0.97 + 0.55 + cv * 0.97 + 1.0 + bh, top = -total / 2 - 0.2;
    F.faces = CAST.map((c, i) => ({ i, x: ((i % 6) - 2.5) * (fd + fg), y: top + fd / 2 + Math.floor(i / 6) * (fd + fg), r: fd / 2 }));
    const twelve = anchor(line(ctx, '12', c12), 0, 'center'); twelve.y = top + fh + 0.75 + c12 * 0.97;
    const voices = anchor(line(ctx, 'VOICES', cv), 0, 'center'); voices.y = twelve.y + 0.55 + cv * 0.97;
    F.lines = [twelve, voices];
    F.bub = { x: 0, y: voices.y + 1.0 + bh / 2, w: 8.2, h: bh, r: 0.8 };
    F.bub.tail = { side: 't', at: -0.5, tx: -2.7, ty: -bh / 2 - 0.85, bw: 0.8 };
  }
  // the credit, fitted inside its bubble
  const pad = 0.5, b = F.bub;
  let cc = 0.6;
  for (const s of CREDIT) cc = Math.min(cc, capFor(ctx, s, b.w - 2 * pad, 800));
  const lh = cc * 1.42, th = cc * 0.97 + lh * (CREDIT.length - 1);
  F.credit = CREDIT.map((s, j) => {
    const ln = line(ctx, s, cc, 800);
    anchor(ln, portrait ? b.x : b.x - b.w / 2 + pad, portrait ? 'center' : 'left');
    ln.y = b.y - th / 2 + cc * 0.97 + j * lh;
    return ln;
  });
  // the I of VOICES: its stroke, in poster units
  const v = F.lines[1], gI = v.glyphs.find(g => g.ch === 'I'), k = v.cap / 72;
  F.I = { x: v.x + gI.dx, y: v.y, cap: v.cap, cx: v.x + gI.dx + ((m.iL + m.iR) / 2) * k, cy: v.y - (m.iA / 2) * k,
    w: (m.iR - m.iL) * k, h: m.iA * k };
  return F;
}

// ── the camera ───────────────────────────────────────────────────────────
const STN = new Map();
function stations(portrait) {
  let s = STN.get(portrait);
  if (!s) STN.set(portrait, (s = (portrait ? TALL : WIDE).map(([x, y], i) => ({ x, y, z: i * DZ - D }))));
  return s;
}
const PRE_Z = 38;   // how far behind the first poster the chapter begins
// the speaker cone the camera comes in through: paper rings around the way in
const CONE = [-26.5, -24, -21.8, -19.8, -18, -16.4, -15];

/* The camera, as a sum of steps — one per poster. Each step is a whip
   sideways (h) overlapped by a dolly that accelerates into the beat and
   recoils a hair (DOLLY), after a slow push-in on the poster just landed. */
const DOLLY = bezier(0.55, 0, 0.3, 1.08);
function pose(lt, portrait) {
  const ST = stations(portrait);
  // out of the pink, straight onto the first poster
  const q = seg(lt, 0, ARR[0] + 0.03);
  let x = ST[0].x, y = lerp(portrait ? -5 : 0, ST[0].y, inOutCubic(q));
  let z = lerp(-D - PRE_Z, ST[0].z, PRE(q)), roll = -0.09 * (1 - outCubic(q));
  for (let k = 1; k <= 12; k++) {
    const T = k < N ? ARR[k] : FINAL, Tp = ARR[k - 1], a = ST[k - 1], b = ST[k];
    const h = inOutCubic(invlerp(T - LUNGE, T - 0.07, lt));
    const d = DRIFT * outQuad(invlerp(Tp + 0.04, T - LUNGE, lt)) + (1 - DRIFT) * DOLLY(invlerp(T - LUNGE + 0.07, T + 0.03, lt));
    x += (b.x - a.x) * h; y += (b.y - a.y) * h; z += (b.z - a.z) * d;
    if (h > 0 && h < 1) roll += (portrait ? (b.x - a.x) * 0.04 + (b.y - a.y) * 0.004 : (b.x - a.x) * 0.009 - (b.y - a.y) * 0.004) * Math.sin(Math.PI * h);
  }
  // the hold: a slow push, then a breath back before the dive
  z += DZ * (DRIFT * inOutQuad(invlerp(FINAL + 0.05, FLY - 0.1, lt)) - 0.045 * inOutCubic(invlerp(FLY - 0.12, FLY + 0.03, lt)));
  return { x, y, z, roll };
}

// ── drawing ──────────────────────────────────────────────────────────────
/** a speech bubble centred on 0,0 (px): a rounded box with its tail on
    side t|r|b|l (`at` −1…1 along it), or an ellipse whose tail heads for the tip */
function bubblePath(ctx, w, h, b, k, tail = true) {
  const t = b.tail, tx = t.tx * k, ty = t.ty * k;
  ctx.beginPath();
  if (b.round) {
    const rx = w / 2, ry = h / 2;
    if (!tail) { ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); return; }
    const th = Math.atan2(ty / ry, tx / rx), g = 0.2;
    ctx.ellipse(0, 0, rx, ry, 0, th + g, th - g + TAU);
    ctx.lineTo(tx, ty);
    ctx.closePath();
    return;
  }
  const r = (b.r ?? Math.min(b.w, b.h) * 0.2) * k, x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2;
  const half = ((t.bw || 0) * k) / 2, side = tail ? t.side : null;
  const along = len => t.at * (len / 2 - r - half);
  ctx.moveTo(x0 + r, y0);
  if (side === 't') { const c = along(w); ctx.lineTo(c - half, y0); ctx.lineTo(tx, ty); ctx.lineTo(c + half, y0); }
  ctx.arcTo(x1, y0, x1, y1, r);
  if (side === 'r') { const c = along(h); ctx.lineTo(x1, c - half); ctx.lineTo(tx, ty); ctx.lineTo(x1, c + half); }
  ctx.arcTo(x1, y1, x0, y1, r);
  if (side === 'b') { const c = along(w); ctx.lineTo(c + half, y1); ctx.lineTo(tx, ty); ctx.lineTo(c - half, y1); }
  ctx.arcTo(x0, y1, x0, y0, r);
  if (side === 'l') { const c = along(h); ctx.lineTo(x0, c + half); ctx.lineTo(tx, ty); ctx.lineTo(x0, c - half); }
  ctx.arcTo(x0, y0, x1, y0, r);
  ctx.closePath();
}

/** the character, cropped round the face and right of the lettered name */
function crop(ctx, img, c, x, y, w, h, zoom) {
  if (!img || !img.width) return;
  const iw = img.width, ih = img.height, a = w / h;
  let sw, sh;
  if (a > iw / ih) { sw = iw / zoom; sh = sw / a; } else { sh = ih / zoom; sw = sh * a; }
  const nx = (c.nx / 900) * iw, room = iw - nx;
  if (sw > room) { sh *= room / sw; sw = room; }
  const sx = clamp(c.fx * iw - sw / 2, nx, iw - sw);
  const sy = clamp(c.fy * ih - sh / 2, 0, ih - sh);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function offscreen(S, p, r) {
  return p.x + r < 0 || p.x - r > S.W || p.y + r < 0 || p.y - r > S.H;
}

/** a character's bubble: off (ink) until its beat, then it snaps and turns on */
function bubble(S, b, c, tau, i) {
  return (ctx, p, f) => {
    const k = p.k;
    const snap = tau < 0 ? lerp(0.86, 1.1, seg(tau, -0.07, 0, inCubic)) : 1 + 0.1 * Math.exp(-tau / 0.07) * Math.cos(tau * 30);
    const talk = tau > 0.05 ? 1 + 0.012 * noise1(tau * 26, i) : 1;
    const s = snap * talk, w = b.w * k * s, h = b.h * k * s;
    if (w > S.W * 6 || offscreen(S, p, Math.hypot(w, h) * 0.6)) return;
    if (i > 0) ctx.globalAlpha *= seg(tau, -LUNGE + 0.03, -LUNGE + 0.1);
    const ink = f > 0 ? mix(INK, PINK, f) : INK;
    // the paper plate it stands off
    ctx.save(); ctx.translate(0.3 * k * s, 0.34 * k * s);
    bubblePath(ctx, w, h, b, k * s); ctx.fillStyle = f > 0 ? mix(PAPER, PINK, f) : PAPER; ctx.fill();
    ctx.restore();
    bubblePath(ctx, w, h, b, k * s); ctx.fillStyle = ink; ctx.fill();
    if (tau > -0.02) {
      // on: a line of light opens into the picture
      const rv = outExpo(seg(tau, -0.02, 0.11)), hh = h * Math.max(0.025, rv);
      ctx.save(); ctx.clip();
      ctx.beginPath(); ctx.rect(-w / 2 - 1, -hh / 2, w + 2, hh); ctx.clip();
      crop(ctx, S.img(c.img), c, -w / 2, -h / 2, w, h, 1.08 + 0.1 * (1 - outCubic(seg(tau, 0, 0.35))));
      const fl = 1 - seg(tau, 0.0, 0.085, outCubic);
      if (fl > 0) { ctx.globalAlpha *= fl; ctx.fillStyle = PAPER; ctx.fillRect(-w / 2, -hh / 2, w, hh); ctx.globalAlpha /= fl; }
      if (f > 0) { ctx.globalAlpha *= f; ctx.fillStyle = PINK; ctx.fillRect(-w / 2, -h / 2, w, h); }
      ctx.restore();
    }
    bubblePath(ctx, w, h, b, k * s);
    ctx.lineJoin = 'round'; ctx.lineWidth = 0.17 * k; ctx.strokeStyle = ink; ctx.stroke();
  };
}

/** sound-rings: the bubble's outline, running out of it into depth */
function rings(L, S, b, x, y, z, tau, rot, n = 3) {
  if (tau < 0 || tau > 0.7) return;
  for (let j = 0; j < n; j++) {
    const q = seg(tau, 0.03 * j, 0.03 * j + 0.6);
    const a = 1 - seg(tau, 0.08 + 0.05 * j, 0.62 + 0.03 * j);
    if (a <= 0) continue;
    const g = 1.08 + 0.1 * j + 0.75 * outExpo(q);
    L.custom(z + 0.6 + 1.1 * j, (ctx, p, f) => {
      const w = b.w * p.k * g, h = b.h * p.k * g;
      if (w > S.W * 5) return;
      ctx.globalAlpha *= a * (1 - f);
      bubblePath(ctx, w, h, b, p.k * g, false);
      ctx.lineWidth = Math.max(1, 0.09 * p.k * (1 + j * 0.3)); ctx.strokeStyle = PAPER; ctx.stroke();
    }, { x, y, rotZ: rot });
  }
}

/** a line of glyphs punching toward the lens, letter by letter: glyph gi
    lands at tau = gi · stagger − 0.02, having flown in from pz units deeper */
function punchLine(L, ln, place, z, tau, gi0, color, rot, o = {}) {
  const st = o.stagger ?? 0.022, dur = o.dur ?? 0.17, PZ = o.pz ?? 17;
  ln.glyphs.forEach((g, j) => {
    const gi = gi0 + j, q = clamp((tau - (gi * st - 0.02 - dur)) / dur);
    if (q <= 0 || (o.skip && o.skip(g))) return;
    const [x, y] = place(ln.x + g.dx, ln.y);
    L.text(g.ch, { x, y, z: z + PZ * (1 - PUNCH(q)), size: ln.cap, color, weight: 900, tracking: 0, align: 'left', rotZ: rot, alpha: clamp(q * 6) });
  });
  return gi0 + ln.glyphs.length;
}

function poster(L, S, lt, i, F, pos, cam) {
  const tau = lt - ARR[i], c = CAST[i];
  const { x: X, y: Y, z: Z } = pos;
  if (cam.z > Z + 0.5) return;                       // flown past
  if (i > 0 && tau < -LUNGE) return;               // not yet in the stack
  const cr = Math.cos(F.rot), sr = Math.sin(F.rot);
  const place = (lx, ly) => [X + lx * cr - ly * sr, Y + lx * sr + ly * cr];
  const [bx, by] = place(F.bub.x, F.bub.y);
  L.custom(Z + 0.3, bubble(S, F.bub, c, tau, i), { x: bx, y: by, rotZ: F.rot });
  rings(L, S, F.bub, bx, by, Z, tau, F.rot);
  // the name
  const n = F.name.lines.reduce((a, ln) => a + ln.glyphs.length, 0), stagger = Math.min(0.022, 0.09 / Math.max(1, n - 1));
  let gi = 0;
  for (const ln of F.name.lines) gi = punchLine(L, ln, place, Z - 0.25, tau, gi, INK, F.rot, { stagger });
  // its number, in paper, where the tail points
  const qi = seg(tau, 0.02, 0.2);
  if (qi > 0) {
    const [ix, iy] = place(F.idx.x, F.idx.y);
    L.text(F.idx.str, { x: ix, y: iy, z: Z - 0.15, size: F.idx.cap, color: PAPER, weight: 800, tracking: 0.02, align: F.idx.align, rotZ: F.rot, reveal: qi, window: 0.6, mask: true });
  }
}

/** the way in: rings of a speaker cone, rushing past */
function cone(L, S, cam, portrait) {
  const diag = Math.hypot(S.W, S.H);
  CONE.forEach((z, j) => {
    if (z < cam.z + 0.1) return;
    const R = (portrait ? 5.2 : 7.2) - j * 0.2;
    L.custom(z, (ctx, p, f) => {
      const r = R * p.k;
      if (r > diag * 1.2) return;
      ctx.globalAlpha *= 1 - 0.7 * f;
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * (portrait ? 1.5 : 0.82), 0, 0, TAU);
      ctx.lineWidth = Math.max(1.5, 0.17 * p.k); ctx.strokeStyle = PAPER; ctx.stroke();
    }, { x: 0, y: portrait ? -0.9 : -0.6 });
  });
}

/** "12 VOICES" and the credit */
function finale(L, S, lt, F, pos, cam) {
  const tau = lt - FINAL;
  const { x: X, y: Y, z: Z } = pos;
  const place = (lx, ly) => [X + lx, Y + ly];
  const [twelve, voices] = F.lines;
  // the type punches in with the camera's last run
  const PO = { stagger: 0.02, dur: 0.22, pz: 18 };
  const gi = punchLine(L, twelve, place, Z - 0.2, tau, 0, INK, 0, PO);
  punchLine(L, voices, place, Z - 0.2, tau, gi, INK, 0, { ...PO, skip: g => g.ch === 'I' });
  // the I: a level meter that fills up paper-white
  const I = F.I, qI = clamp((tau - ((gi + 2) * PO.stagger - 0.02 - PO.dur)) / PO.dur);
  if (qI > 0) {
    const lvl = outExpo(seg(lt, SWITCH - 0.05, SWITCH + 0.16));
    const [ix, iy] = place(I.x, I.y), zI = Z - 0.2 + PO.pz * (1 - PUNCH(qI));
    L.custom(zI, (ctx, p, f) => {
      const s = (I.cap * p.k) / 72;
      ctx.globalAlpha *= clamp(qI * 6);
      ctx.scale(s, s);
      ctx.font = `900 100px ${FONT.sans}`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      ctx.fillStyle = f > 0 ? mix(INK, PINK, f) : INK;
      if (lvl < 1) ctx.fillText('I', 0, 0);
      if (lvl > 0) {
        const m = metrics(ctx), top = -m.iA * lvl - 2;
        ctx.save(); ctx.beginPath(); ctx.rect(m.iL - 4, top, m.iR - m.iL + 8, -top + 4); ctx.clip();
        ctx.fillStyle = PAPER; ctx.fillText('I', 0, 0); ctx.restore();
      }
    }, { x: ix, y: iy });
    const [cx, cy] = place(I.cx, I.cy);
    rings(L, S, { w: I.w * 1.6, h: I.h * 1.12, r: I.w * 0.5, round: false, tail: { tx: 0, ty: 0 } }, cx, cy, Z - 0.2, lt - SWITCH - 0.08, 0, 3);
  }
  // the phone's cast grid: twelve faces pop in, one after another
  if (F.faces) for (const fc of F.faces) {
    const q = seg(tau, -0.04 + fc.i * 0.018, 0.12 + fc.i * 0.018);
    if (q <= 0) continue;
    const c = CAST[fc.i], pop = outBackish(q), [fx, fy] = place(fc.x, fc.y);
    L.custom(Z + 0.05, (ctx, p, f) => {
      const r = fc.r * p.k * pop;
      if (r > S.W * 3 || offscreen(S, p, r)) return;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
      ctx.save(); ctx.clip();
      crop(ctx, S.img(c.img), c, -r, -r, 2 * r, 2 * r, 1.9);
      if (f > 0) { ctx.globalAlpha *= f; ctx.fillStyle = PINK; ctx.fillRect(-r, -r, 2 * r, 2 * r); }
      ctx.restore();
      ctx.lineWidth = 0.1 * p.k; ctx.strokeStyle = f > 0 ? mix(INK, PINK, f) : INK; ctx.stroke();
    }, { x: fx, y: fy });
  }
  // the credit, in a paper bubble
  const qb = seg(tau, 0.02, 0.18);
  if (qb > 0) {
    const b = F.bub, [bx, by] = place(b.x, b.y);
    const pop = qb < 1 ? outBackish(qb) : 1;
    L.custom(Z + 0.2, (ctx, p, f) => {
      const k = p.k * pop, w = b.w * k, h = b.h * k;
      if (w > S.W * 6) return;
      ctx.save(); ctx.translate(0.24 * p.k, 0.28 * p.k);
      bubblePath(ctx, w, h, b, k); ctx.fillStyle = f > 0 ? mix(INK, PINK, f) : INK; ctx.fill(); ctx.restore();
      bubblePath(ctx, w, h, b, k); ctx.fillStyle = f > 0 ? mix(PAPER, PINK, f) : PAPER; ctx.fill();
      ctx.lineJoin = 'round'; ctx.lineWidth = 0.14 * p.k; ctx.strokeStyle = f > 0 ? mix(INK, PINK, f) : INK; ctx.stroke();
    }, { x: bx, y: by });
    F.credit.forEach((ln, j) => {
      const rv = seg(tau, 0.06 + j * 0.05, 0.34 + j * 0.05);
      if (rv <= 0) return;
      const [x, y] = place(ln.x, ln.y);
      L.text(ln.str, { x, y, z: Z + 0.1, size: ln.cap, color: INK, weight: 800, tracking: TR, align: 'left', reveal: rv, window: 0.4, mask: true });
    });
  }
}
const outBackish = q => 1 + 2.4 * Math.pow(q - 1, 3) + 1.4 * Math.pow(q - 1, 2);

// ── lens ─────────────────────────────────────────────────────────────────
function lens(S, lt, dive) {
  const fx = S.fx, u = S.u;
  let ab = 0, shake = 0;
  for (let i = 0; i < N; i++) {
    const bar = i % 4 === 3, k = hit(lt - ARR[i], bar ? 0.3 : 0.17);
    ab = Math.max(ab, k * (bar ? 0.42 : 0.2));
    shake = Math.max(shake, k * (bar ? 0.7 : 0.28) * u);
  }
  const ks = hit(lt - FINAL, 0.34);
  ab = Math.max(ab, ks * 0.55, hit(lt - SWITCH, 0.2) * 0.2, dive);
  shake = Math.max(shake, ks * 1.1 * u);
  fx.ab = ab; fx.shake = shake;
  fx.flash = hit(lt - FINAL, 0.12) * 0.2;
  for (const t0 of [ARR[3], ARR[7], ARR[11], FINAL]) {
    const p = (lt - t0) / 0.6;
    if (p > 0 && p < 1) { fx.warp = 0.16 + 0.84 * p; fx.warpX = 0.5; fx.warpY = 0.5; }
  }
}

// ── the chapter ──────────────────────────────────────────────────────────
const scene = {
  id: 'voices',
  title: 'Voices',
  caption: 'Twelve character voices, cast, directed and generated with ElevenLabs — each speaker switches on with a beat of the music.',
  bg: BLOCK.pink,
  assets: CAST.map(c => c.img),
  models: [],
  still: 6.75,
  // a line of each character's real voice, on its arrival beat
  cues: CAST.map((c, i) => ({ at: ARR[i], voice: c.v })),
  sfx: [
    { at: ARR[0], type: 'tick' },
    { at: BAR, type: 'tick' },
    { at: 2 * BAR, type: 'tick' },
    { at: 3 * BAR, type: 'sub' },
    { at: FINAL, type: 'impact' },
    { at: SWITCH, type: 'tick' },
    { at: 7.44, type: 'riser' }
  ],
  draw(ctx, S) {
    const lt = S.lt;
    if (lt < 0.08) return;                       // the frame is still the pink we flew in through
    const paper = nextColour(scene);
    if (lt >= FILL) { ctx.fillStyle = paper; ctx.fillRect(0, 0, S.W, S.H); return; }
    const portrait = S.portrait, F = forms(ctx, portrait);
    const short = Math.min(S.W, S.H);
    const fit = Math.min(1, (10 * S.W) / short / (portrait ? 10 : 17.8), (10 * S.H) / short / (portrait ? 19 : 10));
    const ST = stations(portrait), POS = ST.map(s => ({ x: s.x, y: s.y, z: s.z + D }));

    // camera: the run through the stack, then the dive into the I
    let c = pose(Math.min(lt, FLY), portrait), dive = 0, cover = false;
    if (lt > FLY) {
      const Fi = F[12].I, P12 = POS[12];
      const tx = P12.x + Fi.cx, ty = P12.y + Fi.cy, tz = P12.z - 0.2;
      const Fl = ZOOM * fit * short;
      const d0 = tz - c.z, dCov = Math.min((Fi.w * Fl) / S.W, (Fi.h * Fl) / S.H), dEnd = dCov * 0.55;
      const k = inCubic(seg(lt, FLY, FILL + 0.02));
      const d = d0 * Math.exp(k * Math.log(dEnd / d0)), q = (d / d0) ** 2;
      c = { x: tx + (c.x - tx) * q, y: ty + (c.y - ty) * q, z: tz - d, roll: c.roll * q };
      dive = 0.4 * Math.sin(Math.PI * k) * (1 - k);
      cover = d < dCov * 0.9;
    }
    if (cover) { ctx.fillStyle = paper; ctx.fillRect(0, 0, S.W, S.H); lens(S, lt, 0); return; }
    const cam = camera(S, { x: c.x, y: c.y, z: c.z, roll: c.roll, zoom: ZOOM * fit, near: 0.02 });

    const L = list();
    if (lt < ARR[0] + 0.1) cone(L, S, cam, portrait);
    for (let i = 0; i < N; i++) poster(L, S, lt, i, F[i], POS[i], cam);
    if (lt > FINAL - BEAT) finale(L, S, lt, F[12], POS[12], cam);
    ctx.save();
    ctx.globalAlpha = seg(lt, 0.08, 0.13);
    L.draw(ctx, S, cam, { fog: PINK, near: FOG.near, far: FOG.far, maxPx: 60 });
    ctx.restore();
    lens(S, lt, dive);
  }
};
export default scene;
