/* 1 — One person (0–7.5 s). The cold open, and the frame the loop lands on.

   The thesis as a cold open: ONE PERSON. → A WHOLE STUDIO. Paper-white
   Archivo 900 the size of buildings, standing on an unseen floor in Klein blue.
   Every letter is a plane in the world (set by the little engine below), so
   words can drop, topple flat, stand up, and be flown between and over.

   Time map (local s; beats every 0.46875, bars at 0, 1.875, 3.75, 5.625)
     0.00–0.09   Klein
     0.09–0.40   ONE slams in out of the depth toward the lens, overshoots, settles
     0.47        eyebrow CHUN HEE — SHOWREEL TWO types on
     0.94–1.10   PERSON. rains down letter by letter onto the floor (beat 2)
     1.41        the full stop drops (beat 3) — ONE PERSON. held and read to 1.9
     1.875       bar 2: PERSON. topples backward flat onto the floor, domino-wise;
                 the camera kicks, cranes up and looks down on it
     2.34        it lands flat (beat) — the camera swoops down and skims over it
     2.60–3.08   ONE's letters part; the camera threads between N and E (the canyon)
     3.08–3.75   out the other side into a corridor floored with type
     3.75–5.39   the departments slam in and stream past, tiny then colossal, the
                 camera whip-panning to each: BRAND, ANIMATION, VOICES (quarters),
                 FILMS, CODE, TOOLS (eighths)
     5.26–5.68   A WHOLE STUDIO. stands up out of the floor, row by row; the camera
                 passes under TOOLS, whips round and brakes — it lands on bar 4
     5.70–6.90   held and read; the I of STUDIO floods signal orange on 6.09
     6.56–7.38   the camera drives into the orange I until it is all there is
     7.38–7.50   signal orange (chapter 2's colour)                                   */
import { clamp, lerp, seg, outExpo, outCubic, inOutCubic, inQuad, whip, layout, text, FONT } from '../../kit.js';
import { mix, fogAt } from '../../space.js';
import { BLOCK, BEAT, BAR } from '../palette.js';
import { nextColour } from '../timeline.js';

const INK = BLOCK.paper, BG = BLOCK.klein, HOT = BLOCK.signal;
const REFPX = 100, CAP = 0.688;                  // glyphs are set at 100px; an Archivo 900 capital is 0.688 of that
const STEM = { a0: 7.4, a1: 29.5, h: 68.8 };     // the I at 100px: a plain rectangle, so it can be drawn exactly
const B = BEAT;

// key instants
const T_ONE = 0.09, T_PER = 2 * B, T_DOT = 3 * B, T_BAR2 = BAR, T_FLAT = 5 * B, T_THREAD = 3.08;
const T_BAR3 = 2 * BAR, T_BAR4 = 3 * BAR, T_ORANGE = 13 * B, T_DRIVE = 14 * B, T_FILL = 7.38;
const HITS = [T_BAR3, 9 * B, 10 * B, 10.5 * B, 11 * B, 11.5 * B];
const DEPTS = ['BRAND', 'ANIMATION', 'VOICES', 'FILMS', 'CODE', 'TOOLS'];
const FOG = { near: 40, far: 125 };

// ── a small perspective type engine ─────────────────────────────────────────
/* A camera with yaw, pitch and roll. World: x right, y down, z forward. */
function makeCam(S, c) {
  const cyw = Math.cos(c.yaw), syw = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
  const K = {
    F: c.F, cx: S.W / 2, cy: S.H / 2, cr: Math.cos(c.roll), sr: Math.sin(c.roll),
    near: 0.06, X: c.x, Y: c.y, Z: c.z, W: S.W, H: S.H
  };
  K.rot = (dx, dy, dz, o) => {
    const x1 = dx * cyw - dz * syw, z1 = dx * syw + dz * cyw;
    o[0] = x1; o[1] = dy * cp - z1 * sp; o[2] = dy * sp + z1 * cp;
    return o;
  };
  K.cam = (x, y, z, o) => K.rot(x - K.X, y - K.Y, z - K.Z, o);
  return K;
}
/* the affine map that best stands in for the projection around one point of a
   plane: plane coords (a, b) → frame px, for a point Pc (camera space) with
   plane axes Uc, Vc (camera space, per plane unit) */
function affineAt(K, Pc, Uc, Vc, a, b, out) {
  const k = K.F / Pc[2], rx = Pc[0] / Pc[2], ry = Pc[1] / Pc[2];
  const jax = k * (Uc[0] - rx * Uc[2]), jay = k * (Uc[1] - ry * Uc[2]);
  const jbx = k * (Vc[0] - rx * Vc[2]), jby = k * (Vc[1] - ry * Vc[2]);
  const m11 = jax * K.cr - jay * K.sr, m12 = jax * K.sr + jay * K.cr;
  const m21 = jbx * K.cr - jby * K.sr, m22 = jbx * K.sr + jby * K.cr;
  const px = Pc[0] * k, py = Pc[1] * k;
  const sx = K.cx + px * K.cr - py * K.sr, sy = K.cy + px * K.sr + py * K.cr;
  out[0] = m11; out[1] = m12; out[2] = m21; out[3] = m22;
  out[4] = sx - m11 * a - m21 * b; out[5] = sy - m12 * a - m22 * b;
  return m11 * m22 - m12 * m21;                     // > 0 when seen from the front
}
function project(K, x, y, z, out) {
  const k = K.F / z, px = x * k, py = y * k;
  out[0] = K.cx + px * K.cr - py * K.sr; out[1] = K.cy + px * K.sr + py * K.cr;
  return out;
}

/* Archivo 900 outlines of the letters this chapter sets, in font units (y up,
   1000/em), taken from assets/fonts/archivo-latin.woff2 at wght 900 — the same
   letters the kit sets, here as contours so every point can be projected and a
   word can lie on the floor, stand up, or be flown into with true perspective. */
const OUTLINE = {
  'A': 'M10 0L261 688L518 688L769 0L535 0L506 97L265 97L236 0ZM311 251L461 251L428 361Q424 373 419 390Q414 407 409 426Q404 445 399 464Q394 482 390 496L382 496Q378 478 372 455Q365 432 358 408Q351 383 344 361Z',
  'B': 'M74 0L74 688L532 688Q584 688 627 666Q670 645 696 607Q722 569 722 519Q722 469 706 437Q690 405 664 386Q638 368 607 359L607 355Q643 347 672 328Q702 308 720 273Q738 238 738 183Q738 128 711 87Q684 46 639 23Q594 0 538 0ZM295 160L463 160Q486 160 500 176Q514 192 514 224Q514 239 508 252Q501 264 490 271Q478 278 463 278L295 278ZM295 420L447 420Q463 420 474 428Q485 435 492 449Q498 463 498 484Q498 506 483 522Q468 537 447 537L295 537Z',
  'C': 'M402 -12Q285 -12 206 28Q126 68 86 148Q45 227 45 344Q45 520 136 610Q226 700 402 700Q502 700 576 666Q651 633 692 567Q733 501 733 405L522 405Q522 445 508 474Q494 503 468 519Q441 535 401 535Q354 535 326 515Q297 495 284 459Q271 423 271 376L271 312Q271 265 284 229Q298 193 326 173Q354 153 399 153Q443 153 472 168Q500 183 514 212Q529 240 529 279L733 279Q733 185 694 120Q655 55 581 22Q507 -12 402 -12Z',
  'D': 'M74 0L74 688L372 688Q490 688 570 651Q650 614 692 538Q733 462 733 344Q733 227 692 150Q650 74 570 37Q490 0 372 0ZM295 165L368 165Q404 165 430 175Q457 185 474 204Q491 223 499 251Q507 279 507 314L507 374Q507 409 499 437Q491 465 474 484Q457 503 430 513Q404 523 368 523L295 523Z',
  'E': 'M77 0L77 688L672 688L672 523L298 523L298 428L618 428L618 270L298 270L298 165L679 165L679 0Z',
  'F': 'M74 0L74 688L630 688L630 523L295 523L295 405L583 405L583 247L295 247L295 0Z',
  'H': 'M74 0L74 688L295 688L295 437L538 437L538 688L759 688L759 0L538 0L538 261L295 261L295 0Z',
  'I': 'M74 0L74 688L295 688L295 0Z',
  'L': 'M74 0L74 688L295 688L295 176L648 176L648 0Z',
  'M': 'M74 0L74 688L382 688L445 446Q449 433 456 403Q464 373 472 338Q481 303 488 273L496 273Q501 295 508 326Q516 356 524 388Q532 420 538 446L601 688L898 688L898 0L687 0L687 248Q687 288 688 330Q688 373 688 411Q689 449 689 474L681 474Q678 454 672 427Q667 400 661 374Q655 347 649 327L560 0L395 0L305 327Q300 347 294 374Q287 400 282 427Q277 454 273 473L265 473Q266 448 267 410Q268 372 268 330Q269 288 269 248L269 0Z',
  'N': 'M74 0L74 688L262 688L476 441Q485 431 500 412Q515 393 530 374Q546 354 554 342L559 344Q558 372 558 400Q558 427 558 441L558 688L759 688L759 0L572 0L331 275Q314 295 302 312Q290 328 279 343L274 341Q275 322 275 303Q275 284 275 275L275 0Z',
  'O': 'M416 -12Q299 -12 216 28Q133 68 89 148Q45 227 45 344Q45 462 89 541Q133 620 216 660Q299 700 416 700Q534 700 617 660Q700 620 744 541Q788 462 788 344Q788 227 744 148Q700 68 617 28Q534 -12 416 -12ZM416 153Q452 153 480 164Q507 176 526 197Q544 218 553 248Q562 277 562 312L562 376Q562 411 553 440Q544 470 526 491Q507 512 480 524Q452 535 416 535Q380 535 352 524Q325 512 307 491Q289 470 280 440Q271 411 271 376L271 312Q271 277 280 248Q289 218 307 197Q325 176 352 164Q380 153 416 153Z',
  'P': 'M74 0L74 688L480 688Q545 688 594 658Q644 629 672 577Q700 525 700 456Q700 385 672 332Q643 280 594 251Q544 222 480 222L295 222L295 0ZM295 383L406 383Q441 383 458 401Q476 419 476 454Q476 478 468 494Q461 509 446 517Q430 525 406 525L295 525Z',
  'R': 'M74 0L74 688L505 688Q582 688 634 657Q685 626 711 576Q737 526 737 468Q737 402 706 350Q675 299 622 268L757 0L509 0L404 231L295 231L295 0ZM295 384L450 384Q476 384 494 404Q512 425 512 459Q512 480 504 496Q496 512 482 522Q468 531 450 531L295 531Z',
  'S': 'M383 -12Q312 -12 250 -2Q189 9 142 34Q96 60 70 106Q43 151 43 220Q43 222 43 226Q43 229 44 233L253 233Q252 229 252 226Q252 222 252 219Q252 189 266 173Q280 157 306 152Q331 146 363 146Q375 146 388 146Q402 147 414 150Q427 152 438 157Q448 162 454 170Q460 179 460 192Q460 211 443 222Q426 233 397 241Q368 249 332 256Q296 263 257 272Q218 282 182 297Q146 312 117 336Q88 359 71 394Q54 430 54 480Q54 540 79 582Q104 624 148 650Q191 676 246 688Q302 700 363 700Q425 700 480 688Q534 675 576 649Q618 623 642 583Q666 543 667 488L667 476L460 476L460 480Q460 498 451 514Q442 530 422 540Q403 550 371 550Q341 550 320 544Q300 538 290 528Q280 517 280 505Q280 486 297 474Q314 462 343 454Q372 446 408 439Q444 432 483 424Q522 415 558 401Q594 387 623 364Q652 342 669 309Q686 276 686 228Q686 143 646 90Q607 37 538 12Q470 -12 383 -12Z',
  'T': 'M249 0L249 512L23 512L23 688L695 688L695 512L470 512L470 0Z',
  'U': 'M417 -12Q309 -12 232 20Q156 53 115 118Q74 182 74 277L74 688L295 688L295 280Q295 225 325 189Q355 153 416 153Q477 153 508 189Q538 225 538 280L538 688L759 688L759 277Q759 182 718 118Q678 53 602 20Q525 -12 417 -12Z',
  'V': 'M261 0L17 688L253 688L348 370Q352 357 359 332Q366 307 374 279Q383 251 389 228L397 228Q403 249 411 276Q419 303 426 328Q434 354 438 370L534 688L760 688L517 0Z',
  'W': 'M166 0L5 688L235 688L295 394Q297 386 300 370Q303 353 307 334Q311 314 314 298L318 298Q320 307 322 320Q325 332 328 345Q330 358 332 371Q335 384 337 394L396 688L614 688L677 394Q679 384 682 367Q686 350 690 332Q694 313 697 298L701 298Q703 308 706 320Q708 333 710 346Q712 359 714 372Q717 384 719 394L775 688L995 688L834 0L591 0L523 322Q521 335 517 352Q513 370 509 388Q505 406 502 419L498 419Q495 407 492 390Q488 372 484 354Q480 337 477 322L409 0Z',
  '.': 'M61 0L61 199L273 199L273 0Z'
};
const GL = {};
for (const ch in OUTLINE) {
  const ops = [], xy = [];
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const m of OUTLINE[ch].matchAll(/([MLQZ])([^MLQZ]*)/g)) {
    ops.push('MLQZ'.indexOf(m[1]));
    const v = m[2].trim() ? m[2].trim().split(/\s+/).map(Number) : [];
    for (let i = 0; i < v.length; i += 2) {
      xy.push(v[i], v[i + 1]);
      x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i]); y0 = Math.min(y0, v[i + 1]); y1 = Math.max(y1, v[i + 1]);
    }
  }
  GL[ch] = { ops, xy, x0, x1, y0, y1 };
}

const RIGHT = [1, 0, 0], UP = [0, -1, 0];

/** lay a word out on a plane: o.at = baseline anchor, o.U reading direction,
    o.V the letters' up, o.size = world cap height; o.per(g) may move or turn a glyph */
function word(Q, ctx, K, str, o) {
  const L = layout(ctx, str, { size: REFPX, weight: 900, tracking: -0.02 });
  const sc = o.size / (REFPX * CAP);
  const x0 = o.align === 'left' ? 0 : o.align === 'right' ? -L.width : -L.width / 2;
  const U = o.U || RIGHT, V = o.V || UP;
  for (let i = 0; i < L.chars.length; i++) {
    const ch = L.chars[i];
    if (ch === ' ') continue;
    const a = (x0 + L.xs[i]) * sc;
    const g = {
      ch, i, n: L.chars.length, a,
      x: o.at[0] + U[0] * a, y: o.at[1] + U[1] * a, z: o.at[2] + U[2] * a,
      U, V, sc, sx: 1, sy: 1, color: o.color || INK, alpha: o.alpha ?? 1, stem: false, flood: 0
    };
    if (o.per) o.per(g, i, ch);
    if (g.alpha > 0.003) (g.stem ? stemQuad : glyph)(Q, K, g);
  }
}

const _a = [0, 0], _b = [0, 0];
/* a glyph goes on the queue with its plane in camera space (per font unit) */
function glyph(Q, K, g) {
  const G = GL[g.ch];
  if (!G) return;
  const su = g.sc * 0.1 * g.sx, sv = g.sc * 0.1 * g.sy;        // world per font unit
  const Uc = K.rot(g.U[0] * su, g.U[1] * su, g.U[2] * su, [0, 0, 0]);
  const Vc = K.rot(g.V[0] * sv, g.V[1] * sv, g.V[2] * sv, [0, 0, 0]);
  const Oc = K.cam(g.x, g.y, g.z, [0, 0, 0]);
  let dmin = 1e9, dmax = -1e9, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let c = 0; c < 4; c++) {
    const u = c & 1 ? G.x1 : G.x0, v = c & 2 ? G.y1 : G.y0;
    const X = Oc[0] + Uc[0] * u + Vc[0] * v, Y = Oc[1] + Uc[1] * u + Vc[1] * v, Z = Oc[2] + Uc[2] * u + Vc[2] * v;
    if (Z < dmin) dmin = Z; if (Z > dmax) dmax = Z;
    if (Z > 0.12) {
      project(K, X, Y, Z, _a);
      if (_a[0] < x0) x0 = _a[0]; if (_a[0] > x1) x1 = _a[0]; if (_a[1] < y0) y0 = _a[1]; if (_a[1] > y1) y1 = _a[1];
    }
  }
  if (dmax <= 0.12) return;
  if (dmin > 0.12) {
    if (x1 < 0 || x0 > K.W || y1 < 0 || y0 > K.H) return;       // off the frame
    if (x1 - x0 < 0.7 && y1 - y0 < 0.7) return;                  // too small to see
  }
  Q.push({ kind: 0, d: (dmin + dmax) / 2, g, G, Oc, Uc, Vc, dmin, dmax });
}

/* the I of STUDIO is a rectangle: drawn as an exact quad so the fly-in can be checked */
function stemQuad(Q, K, g) {
  const su = g.sc * g.sx, sv = g.sc * g.sy;
  const P = (a, b) => [g.x + g.U[0] * a * su - g.V[0] * b * sv, g.y + g.U[1] * a * su - g.V[1] * b * sv, g.z + g.U[2] * a * su - g.V[2] * b * sv];
  const quad = (bTop, color, dd) => {
    const pts = [P(STEM.a0, bTop), P(STEM.a1, bTop), P(STEM.a1, 0), P(STEM.a0, 0)].map(p => K.cam(p[0], p[1], p[2], [0, 0, 0]));
    const poly = clipNear(pts, 0.1);
    if (poly.length < 3) return null;
    const scr = poly.map(p => project(K, p[0], p[1], p[2], [0, 0]));
    const d = (pts[0][2] + pts[1][2] + pts[2][2] + pts[3][2]) / 4 - dd;
    const it = { kind: 1, d, scr, color, alpha: g.alpha };
    Q.push(it);
    return it;
  };
  if (g.flood < 1) quad(-STEM.h, g.color, 0);
  if (g.flood > 0) { const it = quad(-STEM.h * g.flood, HOT, 1e-4); if (it) it.hot = g.flood >= 1; }
}

function clipNear(pts, n) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const pin = p[2] >= n, qin = q[2] >= n;
    if (pin) out.push(p);
    if (pin !== qin) {
      const t = (n - p[2]) / (q[2] - p[2]);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, n]);
    }
  }
  return out;
}

/* project a glyph's contours: curves stay curves while the glyph is shallow in
   depth; deep or lens-grazing glyphs are flattened, clipped at the near plane,
   then projected point by point */
function outline(ctx, K, it) {
  const { G, Oc, Uc, Vc } = it, xy = G.xy;
  const at = (u, v, o) => project(K, Oc[0] + Uc[0] * u + Vc[0] * v, Oc[1] + Uc[1] * u + Vc[1] * v, Oc[2] + Uc[2] * u + Vc[2] * v, o);
  ctx.beginPath();
  let p = 0;
  if (it.dmin > 0.12 && it.dmax / it.dmin < 1.25) {
    for (const op of G.ops) {
      if (op === 3) { ctx.closePath(); continue; }
      if (op === 2) {
        at(xy[p], xy[p + 1], _a); at(xy[p + 2], xy[p + 3], _b);
        ctx.quadraticCurveTo(_a[0], _a[1], _b[0], _b[1]); p += 4;
      } else {
        at(xy[p], xy[p + 1], _a);
        if (op === 0) ctx.moveTo(_a[0], _a[1]); else ctx.lineTo(_a[0], _a[1]);
        p += 2;
      }
    }
  } else {
    const cam = (u, v) => [Oc[0] + Uc[0] * u + Vc[0] * v, Oc[1] + Uc[1] * u + Vc[1] * v, Oc[2] + Uc[2] * u + Vc[2] * v];
    let poly = [], cx = 0, cy = 0;
    const flush = () => {
      const c = poly.length > 2 ? clipNear(poly, 0.12) : [];
      c.forEach((q, i) => { project(K, q[0], q[1], q[2], _a); if (i) ctx.lineTo(_a[0], _a[1]); else ctx.moveTo(_a[0], _a[1]); });
      if (c.length) ctx.closePath();
      poly = [];
    };
    for (const op of G.ops) {
      if (op === 3) { flush(); continue; }
      if (op === 2) {
        const qx = xy[p], qy = xy[p + 1], ex = xy[p + 2], ey = xy[p + 3];
        for (let k = 1; k <= 8; k++) {
          const s = k / 8, r = 1 - s;
          poly.push(cam(r * r * cx + 2 * r * s * qx + s * s * ex, r * r * cy + 2 * r * s * qy + s * s * ey));
        }
        cx = ex; cy = ey; p += 4;
      } else { cx = xy[p]; cy = xy[p + 1]; poly.push(cam(cx, cy)); p += 2; }
    }
    flush();
  }
  ctx.fill();
}

function drawQueue(ctx, K, Q) {
  Q.sort((p, q) => q.d - p.d);
  ctx.save();
  for (const it of Q) {
    const f = fogAt(it.d, FOG.near, FOG.far);
    if (f >= 0.995) continue;
    const g = it.g || it;
    ctx.globalAlpha = g.alpha;
    ctx.fillStyle = f > 0.002 ? mix(g.color, BG, f) : g.color;
    if (it.kind === 1) {
      ctx.beginPath();
      it.scr.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath(); ctx.fill();
    } else outline(ctx, K, it);
  }
  ctx.restore();
}

const _m = [0, 0, 0, 0, 0, 0], _p = [0, 0, 0];

/* the corridor's floor: two long runs of small type, laid flat either side of
   the path, drawn from one pre-set strip in depth-spaced pieces */
let ROWTEX = null;
function rowTex() {
  if (ROWTEX) return ROWTEX;
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.check(`800 96px Archivo`)) return null;
  const c = document.createElement('canvas'), x = c.getContext('2d');
  const size = 96, font = `800 ${size}px ${FONT.sans}`, tr = 0.16 * size;
  const chars = [...(DEPTS.join('  —  ') + '  —  ')];
  x.font = font;
  const xs = [];
  let w = 0;
  for (const ch of chars) { xs.push(w); w += x.measureText(ch).width + tr; }
  c.width = Math.ceil(w); c.height = Math.ceil(size * 0.95);
  x.font = font; x.fillStyle = INK; x.textBaseline = 'alphabetic';
  chars.forEach((ch, i) => x.fillText(ch, xs[i], Math.round(size * 0.82)));
  ROWTEX = { c, w: c.width, h: c.height, capPx: size * CAP };
  return ROWTEX;
}
function drawRow(ctx, K, row, alpha) {
  const T = rowTex();
  if (!T || alpha <= 0) return;
  const s = row.cap / T.capPx;
  const Uc = K.rot(row.U[0] * s, row.U[1] * s, row.U[2] * s, [0, 0, 0]);
  const Vc = K.rot(row.V[0] * s, row.V[1] * s, row.V[2] * s, [0, 0, 0]);
  const Oc = K.cam(row.O[0], row.O[1], row.O[2], [0, 0, 0]);
  const vm = T.h / 2, base = Oc[2] + Vc[2] * vm;
  let u0 = 0, u1 = row.len / s;
  if (Math.abs(Uc[2]) < 1e-9) return;
  const ua = (0.5 - base) / Uc[2], ub = (FOG.far - base) / Uc[2];
  u0 = Math.max(u0, Math.min(ua, ub)); u1 = Math.min(u1, Math.max(ua, ub));
  if (u1 <= u0) return;
  const za = base + Uc[2] * u0, zb = base + Uc[2] * u1, il = 1 / za, ih = 1 / zb;
  const n = Math.min(40, Math.max(2, Math.ceil(Math.abs(Math.log(zb / za)) * 7)));
  const at = j => u0 + (1 / lerp(il, ih, j / n) - za) / (zb - za) * (u1 - u0);
  const q = [0, 0];
  ctx.save();
  let a = u0;
  for (let j = 0; j < n; j++) {
    const bEnd = at(j + 1);
    while (a < bEnd - 1e-6) {
      const k = Math.floor(a / T.w), b = Math.min(bEnd, (k + 1) * T.w), uc = (a + b) / 2;
      _p[0] = Oc[0] + Uc[0] * uc + Vc[0] * vm; _p[1] = Oc[1] + Uc[1] * uc + Vc[1] * vm; _p[2] = Oc[2] + Uc[2] * uc + Vc[2] * vm;
      if (_p[2] > 0.3) {
        // skip pieces that land off the frame
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (let c = 0; c < 4; c++) {
          const u = c & 1 ? b : a, v = c & 2 ? T.h : 0;
          project(K, Oc[0] + Uc[0] * u + Vc[0] * v, Oc[1] + Uc[1] * u + Vc[1] * v, Oc[2] + Uc[2] * u + Vc[2] * v, q);
          if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1];
        }
        if (!(x1 < 0 || x0 > K.W || y1 < 0 || y0 > K.H) && affineAt(K, _p, Uc, Vc, uc, vm, _m) > 0) {
          ctx.setTransform(_m[0], _m[1], _m[2], _m[3], _m[4], _m[5]);
          ctx.globalAlpha = alpha * (1 - fogAt(_p[2], FOG.near, FOG.far));
          const sa = a - k * T.w, sw = Math.min(T.w - sa, b - a + 0.6);
          ctx.drawImage(T.c, sa, 0, sw, T.h, a, 0, sw, T.h);
        }
      }
      a = b;
    }
  }
  ctx.restore();
}

// ── curves ─────────────────────────────────────────────────────────────────
/* Hermite through keys [t, v, slope?, slopeIn?] — Catmull-Rom slopes unless
   given; a key with a separate slopeIn makes a kick (a velocity step) on it. */
function curve(keys) {
  const n = keys.length;
  const out = keys.map((k, i) => (k[2] !== undefined ? k[2]
    : i === 0 || i === n - 1 ? 0 : (keys[i + 1][1] - keys[i - 1][1]) / (keys[i + 1][0] - keys[i - 1][0])));
  const inn = keys.map((k, i) => (k[3] !== undefined ? k[3] : out[i]));
  return t => {
    if (t <= keys[0][0]) return keys[0][1] + out[0] * (t - keys[0][0]);
    if (t >= keys[n - 1][0]) return keys[n - 1][1] + inn[n - 1] * (t - keys[n - 1][0]);
    let i = 0;
    while (t > keys[i + 1][0]) i++;
    const t0 = keys[i][0], h = keys[i + 1][0] - t0, s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * keys[i][1] + (s3 - 2 * s2 + s) * h * out[i]
      + (-2 * s3 + 3 * s2) * keys[i + 1][1] + (s3 - s2) * h * inn[i + 1];
  };
}
/** a decaying hit: 0 before t0, jumps to 1, dies out over `len` */
const hit = (t, t0, len) => (t < t0 ? 0 : Math.max(0, 1 - (t - t0) / len) ** 2);

// ── the world, laid out for this frame's shape ─────────────────────────────
let WC = null;
function world(S, ctx) {
  const key = S.W + 'x' + S.H;
  if (WC && WC.key === key) return WC;
  const P = S.portrait, F = 1.1 * Math.min(S.W, S.H), short = Math.min(S.W, S.H);
  const fit = P ? Math.min(1, (S.H / S.W) / 1.9) : Math.min(1, (16 / 9) / (S.W / S.H));
  const tanW = S.W / (2 * F), tanH = S.H / (2 * F);
  const FLOOR = 6;                   // the camera starts 6 above the floor (eye at y = 0)
  const w100 = str => layout(ctx, str, { size: REFPX, weight: 900, tracking: -0.02 }).width;
  /* compose in the frame, place in the world: a word standing on the floor whose
     baseline falls at frame height sy, capital capU short-sides tall (but no
     wider than wmax of the frame), seen from camera c */
  const place = (c, str, sy, capU, wmax) => {
    const yc = (sy * S.H - S.H / 2) / F, cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    const dy = yc * cp + sp, dz = -yc * sp + cp;
    const t = (FLOOR - c.y) / dy;
    const w = w100(str);
    const capPx = Math.min(capU * short * fit, wmax * S.W * REFPX * CAP / w);
    return { str, z: c.z + t * dz, cap: capPx * t / F, depth: t, w: capPx * t / F * w / (REFPX * CAP) };
  };
  const W = { key, P, F, FLOOR };

  // the opening lockup, composed from where the camera holds in bar 1
  const hold = { y: 0, z: 0, pitch: P ? 0.34 : 0.13 };
  if (P) {
    W.one = place(hold, 'ONE', 0.40, 0.24, 0.84);
    W.rows = [place(hold, 'PER', 0.55, 0.205, 0.8), place(hold, 'SON.', 0.695, 0.205, 0.86)];
  } else {
    W.one = place(hold, 'ONE', 0.535, 0.275, 0.6);
    W.rows = [place(hold, 'PERSON.', 0.755, 0.2, 0.82)];
  }
  // ONE's letters, and the gap between N and E the camera threads
  {
    const L = layout(ctx, 'ONE', { size: REFPX, weight: 900, tracking: -0.02 });
    const sc = W.one.cap / (REFPX * CAP), x0 = -L.width / 2;
    W.gapX = sc * ((x0 + L.xs[1] + GL.N.x1 / 10) + (x0 + L.xs[2] + GL.E.x0 / 10)) / 2;
  }
  // looking down on the fallen word(s): crane up until they lie whole in frame
  const rNear = W.rows[W.rows.length - 1], rFar = W.rows[0], zO = W.one.z;
  const ly0 = rNear.z, ly1 = rFar.z + rFar.cap, lyW = Math.max(...W.rows.map(r => r.w));
  const al = P ? 0.8 : 0.66;
  const dd = Math.max(lyW / (2 * tanW * 0.84), (ly1 - ly0) / (2 * tanH * 0.5));
  const crane = { y: FLOOR - dd * Math.sin(al), z: (ly0 + ly1) / 2 - dd * Math.cos(al), pitch: al };

  // the corridor: a straight run, speeding up, that brakes into the last lockup
  const eyeC = FLOOR - (P ? 3.0 : 2.6);
  const v0 = P ? 52 : 56, v1 = P ? 88 : 96;
  const zH0 = zO + 34, zH5 = zH0 + (HITS[5] - T_BAR3) * (v0 + v1) / 2;
  const zF = zH5 + 17;
  const holdF = { y: FLOOR - (P ? 5.2 : 4.6), z: zF, pitch: P ? 0.33 : 0.15 };
  W.holdF = holdF;
  if (P) W.fin = [place(holdF, 'A', 0.415, 0.14, 0.9), place(holdF, 'WHOLE', 0.515, 0.14, 0.9), place(holdF, 'STUDIO.', 0.615, 0.14, 0.9)];
  else W.fin = [place(holdF, 'A WHOLE', 0.47, 0.205, 0.86), place(holdF, 'STUDIO.', 0.72, 0.215, 0.8)];
  // the I in STUDIO. — its stem's centre is where the camera ends up
  {
    const st = W.fin[W.fin.length - 1];
    const L = layout(ctx, 'STUDIO.', { size: REFPX, weight: 900, tracking: -0.02 });
    const sc = st.cap / (REFPX * CAP), x0 = -L.width / 2;
    W.stem = {
      x: sc * (x0 + L.xs[4] + (STEM.a0 + STEM.a1) / 2), y: FLOOR - sc * STEM.h / 2, z: st.z,
      w: sc * (STEM.a1 - STEM.a0), h: sc * STEM.h
    };
    W.dEnd = F / (Math.max(S.W / W.stem.w, S.H / W.stem.h) * 1.15);   // close enough that it overfills the frame
  }
  // the floor of type, either side of the corridor
  {
    const lane = P ? 2.8 : 4.6, cap = P ? 0.55 : 0.8, z0 = zO - 1, z1 = zF - 3;
    const hw = cap / CAP * 0.95 / 2;               // half the strip's width
    W.floorRows = [
      { O: [-lane - hw, FLOOR, z0], U: [0, 0, 1], V: [1, 0, 0], cap, len: z1 - z0 },
      { O: [lane + hw, FLOOR, z1], U: [0, 0, -1], V: [-1, 0, 0], cap, len: z1 - z0 }
    ];
    W.floorZ = [z0, z1];
  }

  const gx = W.gapX;
  W.cx = curve([[0, 0], [T_BAR2, 0, 0], [T_FLAT, gx * 0.1], [2.72, gx * 0.55], [T_THREAD, gx, 0], [3.45, gx * 0.15], [T_BAR3, 0, 0], [T_BAR4, 0, 0]]);
  W.cy = curve([
    [0, 0, -0.06], [T_BAR2, -0.12, -2, -0.06],
    [T_FLAT, crane.y], [2.72, FLOOR - (P ? 1.35 : 1.3)], [T_THREAD, FLOOR - (P ? 1.7 : 1.6), 0],
    [T_BAR3, eyeC, 0], [HITS[5], eyeC, 0], [T_BAR4, holdF.y, -0.5], [T_DRIVE, holdF.y + 0.12, 0.2]
  ]);
  W.cz = curve([
    [0, -1.5, 0.8], [T_BAR2, 0, 9, 0.8],
    [T_FLAT, crane.z], [2.72, ly1 + (P ? 1.4 : 1.8)], [T_THREAD, zO, 46],
    [T_BAR3, zH0, v0], [HITS[5], zH5, v1],
    [T_BAR4, zF - 2.2, 9], [T_DRIVE, zF + 0.9, 1.2]
  ]);
  W.pos = t => [W.cx(t), W.cy(t), W.cz(t)];
  W.pOpen = curve([
    [0, hold.pitch], [T_BAR2, hold.pitch + 0.015, 0.4, 0], [T_FLAT + 0.04, crane.pitch, 0], [2.72, P ? 0.2 : 0.15], [T_THREAD, -0.05], [3.3, 0, 0]
  ]);

  // the departments: each set square to the lens at its hit
  W.depts = DEPTS.map((str, i) => {
    const big = i % 2 === 1, th = HITS[i];
    const C = W.pos(th);
    const w = w100(str);
    const side = i === 3 ? 1 : i % 4 === 0 ? -1 : 1;     // alternate: left, up, right, down, left, up
    let yaw = 0, pitch = 0, D, cap;
    if (!P) {
      if (big) {
        D = i === 5 ? 12 : 22;
        cap = 0.9 * 2 * tanW * D * REFPX * CAP / w;
        pitch = (i === 3 ? 1 : -1) * Math.asin(clamp((cap * 0.6 + 1.4) / D, 0, 0.9));
      } else {
        D = 16;
        const wd = 0.34 * 2 * tanW * D; cap = wd * REFPX * CAP / w;
        yaw = side * Math.asin(clamp((wd * 0.55 + 3) / D, 0, 0.9));
      }
    } else {
      if (big) {
        D = i === 5 ? 12 : 22;
        cap = Math.min(0.78 * 2 * tanH * D * REFPX * CAP / w, 0.4 * 2 * tanW * D);
        yaw = (i === 3 ? 1 : -1) * Math.asin(clamp((cap * 0.6 + 1.2) / D, 0, 0.9));
      } else {
        D = 16;
        const wd = 0.74 * 2 * tanW * D; cap = wd * REFPX * CAP / w;
        pitch = side * Math.asin(clamp((cap * 0.6 + 3.2) / D, 0, 0.9));
      }
    }
    const f = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    const r = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const up = [Math.sin(yaw) * Math.sin(pitch), -Math.cos(pitch), Math.cos(yaw) * Math.sin(pitch)];
    const vertical = P && big;                          // on a phone the big ones stand up the frame
    const U = vertical ? up : r, V = vertical ? [-r[0], -r[1], -r[2]] : up;
    const ctr = [C[0] + f[0] * D, C[1] + f[1] * D, C[2] + f[2] * D];
    const at = [ctr[0] - V[0] * cap / 2, ctr[1] - V[1] * cap / 2, ctr[2] - V[2] * cap / 2];
    const lead = i === 0 ? 0.62 : Math.min(0.3, (th - HITS[i - 1]) * 0.9);
    return { str, th, yaw, pitch, U, V, f, at, cap, lead };
  });
  WC = W;
  return W;
}

// ── the camera ─────────────────────────────────────────────────────────────
function lookAt(W, t) {
  const pd = W.depts;
  if (t < 3.2) return [0, W.pOpen(t)];
  if (t < HITS[5] + 0.03) {
    // hold on a department, then whip to the next just as it lands
    let i = 0;
    while (i < pd.length - 1 && t > pd[i].th + 0.03) i++;
    const a = i === 0 ? { yaw: 0, pitch: 0 } : pd[i - 1], b = pd[i];
    const k = i === 0 ? inOutCubic(seg(t, 3.2, b.th - 0.02)) : whip(seg(t, b.th - Math.min(0.2, (b.th - a.th) * 0.75), b.th - 0.01));
    return [lerp(a.yaw, b.yaw, k), lerp(a.pitch, b.pitch, k)];
  }
  const a = pd[pd.length - 1], k = whip(seg(t, a.th + 0.06, T_BAR4 - 0.01));
  return [lerp(a.yaw, 0, k), lerp(a.pitch, W.holdF.pitch, k)];
}

function camAt(S, W, t) {
  let [x, y, z] = W.pos(t);
  let [yaw, pitch] = lookAt(W, t);
  // beat kicks in bar 1: the camera leans in on each hit
  if (t < T_BAR2) z += 0.2 * outExpo(seg(t, B, B + 0.3)) + 0.35 * outExpo(seg(t, T_PER, T_PER + 0.3)) + 0.25 * outExpo(seg(t, T_DOT, T_DOT + 0.3));
  let roll = 0.018 * Math.sin(t * 1.9)
    + 0.06 * Math.sin((t - T_BAR2) * 4.2) * seg(t, T_BAR2, 2.2) * (1 - seg(t, 2.8, 3.3))
    - 0.05 * inOutCubic(seg(t, 3.1, 3.6)) * (1 - seg(t, 5.2, 5.6));
  // corridor: bank into each whip
  if (t > 3.5 && t < T_BAR4) {
    for (let i = 1; i < W.depts.length; i++) {
      const a = W.depts[i - 1], b = W.depts[i], mid = b.th - 0.1;
      const dir = Math.sign((b.yaw - a.yaw) - (b.pitch - a.pitch) * 0.7) || 1;
      roll += 0.08 * dir * Math.exp(-(((t - mid) / 0.09) ** 2));
    }
  }
  roll *= 1 - seg(t, 5.45, T_BAR4 + 0.1);
  // the drive: into the stem of the I, in log-distance so it reads as one push
  if (t > T_DRIVE) {
    const s = seg(t, T_DRIVE, T_FILL), st = W.stem, C0 = W.pos(T_DRIVE);
    const dz0 = st.z - C0[2];
    const e = s * s * (1.4 - 0.4 * s);
    const dz = dz0 * Math.pow(W.dEnd / dz0, e);
    const q = inOutCubic(seg(s, 0, 0.7)), rem = (dz / dz0) * (1 - q);
    x = st.x - (st.x - C0[0]) * rem;
    y = st.y - (st.y - C0[1]) * rem;
    z = st.z - dz;
    pitch = W.holdF.pitch * (1 - q);
    yaw = 0;
    roll = 0;
  }
  return { x, y, z, yaw, pitch, roll, F: W.F };
}

// ── what stands in the world at time t ─────────────────────────────────────
const slam = u => 300 * Math.exp(-38 * u) - 3.2 * Math.sin(Math.PI * Math.min(u / 0.36, 1)) * Math.exp(-3 * u);

function build(ctx, W, K, t, Q) {
  // ONE: slams toward the lens out of the depth, overshoots, settles; later its letters part
  if (t >= T_ONE && t < 3.5) {
    const u = t - T_ONE, part = 1.9 * outCubic(seg(t, 2.5, 3.0)), one = W.one;
    const ghosts = u < 0.14 ? 3 : 0;
    for (let k = ghosts; k >= 0; k--) {
      const uu = u - k * 0.012;
      if (uu < 0) continue;
      word(Q, ctx, K, 'ONE', {
        at: [0, W.FLOOR, one.z + slam(uu)], size: one.cap, alpha: k ? 0.3 / k : 1,
        per: g => { g.x += (g.i < 2 ? -1 : 1) * part * (g.i === 0 ? 1.4 : 1); }
      });
    }
  }
  // PERSON. (on a phone PER / SON.): rains down, topples flat, is skimmed
  if (t >= T_PER - 0.2 && t < 3.3) {
    let gi = 0;
    for (const row of W.rows) {
      const base = gi;
      word(Q, ctx, K, row.str, {
        at: [0, W.FLOOR, row.z], size: row.cap,
        per: g => {
          const k = base + g.i, dot = g.ch === '.';
          const land = dot ? T_DOT : T_PER + k * 0.034;
          const fall = seg(t, land - 0.17, land);
          if (fall <= 0) { g.alpha = 0; return; }
          g.y -= 16 * (1 - fall * fall);
          const b = t - land;
          if (b > 0) g.sy = 1 - (dot ? 0.3 : 0.2) * Math.exp(-b * 18) * Math.cos(b * 32);
          // the topple: backward onto the floor, a letter at a time
          const t0 = T_BAR2 + k * 0.022, th = (Math.PI / 2) * inQuad(seg(t, t0, t0 + 0.32));
          const bb = t - t0 - 0.32;
          const a = th - (bb > 0 ? 0.07 * Math.exp(-bb * 16) * Math.sin(bb * 40) : 0);
          g.V = [0, -Math.cos(a), Math.sin(a)];
        }
      });
      gi += row.str.length;
    }
  }
  // the departments: each slams in out of the depth along its line of sight
  if (t > 3.0 && t < T_BAR4 + 0.3) {
    for (const d of W.depts) {
      const te = d.th - d.lead;
      if (t < te) continue;
      const push = 70 * (1 - outExpo(seg(t, te, d.th - 0.02)));
      word(Q, ctx, K, d.str, {
        at: [d.at[0] + d.f[0] * push, d.at[1] + d.f[1] * push, d.at[2] + d.f[2] * push], U: d.U, V: d.V, size: d.cap
      });
    }
  }
  // A WHOLE STUDIO. stands up out of the floor, row by row, letter by letter
  if (t > 5.0) {
    const rows = W.fin, nr = rows.length;
    rows.forEach((row, r) => {
      const r0 = T_BAR4 - 0.25 + (r - (nr - 1)) * 0.12;          // the last row lands on the bar
      word(Q, ctx, K, row.str, {
        at: [0, W.FLOOR, row.z], size: row.cap,
        per: g => {
          const t0 = r0 + g.i * 0.018, up = seg(t, t0, t0 + 0.2);
          if (up <= 0) { g.alpha = 0; return; }
          const bb = t - t0 - 0.2;
          const ang = (Math.PI / 2) * (1 - outCubic(up)) + (bb > 0 ? 0.1 * Math.exp(-bb * 12) * Math.sin(bb * 36) : 0);
          g.V = [0, -Math.cos(ang), Math.sin(ang)];
          if (g.ch === 'I') { g.stem = true; g.flood = inOutCubic(seg(t, T_ORANGE, T_ORANGE + 0.16)); }
        }
      });
    });
  }
}

const scene = {
  id: 'person',
  title: 'One person',
  caption: 'ONE PERSON. stands like buildings on Klein blue; the camera flies through the words into A WHOLE STUDIO. and dives into its orange I.',
  bg: BLOCK.klein,
  assets: [],
  models: [],
  still: 6.3,
  sfx: [
    { at: 0.12, type: 'impact' },
    { at: T_PER, type: 'impact' },
    { at: T_DOT, type: 'tick' },
    { at: T_FLAT, type: 'sub' },
    { at: T_THREAD, type: 'whoosh' },
    { at: HITS[3], type: 'whoosh' },
    { at: T_BAR4, type: 'impact' },
    { at: T_ORANGE, type: 'tick' },
    { at: 7.45, type: 'riser' }
  ],
  draw(ctx, S) {
    const t = S.lt;
    if (t < T_ONE) return;                                   // pure Klein on the downbeat
    const next = nextColour(scene);
    if (t >= T_FILL) { ctx.fillStyle = next; ctx.fillRect(0, 0, S.W, S.H); return; }
    const W = world(S, ctx);
    const K = makeCam(S, camAt(S, W, t));

    // the floor of type (under everything)
    if (t > 2.45 && t < 5.9) {
      const a = seg(t, 2.45, 2.75);
      for (const row of W.floorRows) drawRow(ctx, K, row, a);
    }
    const Q = [];
    build(ctx, W, K, t, Q);
    drawQueue(ctx, K, Q);

    // the orange takes the frame once the stem overfills it
    const stemItem = Q.find(q => q.hot);
    if (t > T_DRIVE && stemItem && covers(stemItem.scr, S.W, S.H)) { ctx.fillStyle = next; ctx.fillRect(0, 0, S.W, S.H); }

    // eyebrow
    const eIn = seg(t, B, B + 0.4), eOut = seg(t, T_BAR2 + 0.02, T_BAR2 + 0.25);
    if (eIn > 0 && eOut < 1) {
      const u = S.u, P = S.portrait;
      text(ctx, S, 'CHUN HEE — SHOWREEL TWO', P ? 7 * u : 5.2 * u, S.H * (P ? 0.115 : 0.125), {
        size: (P ? 3.2 : 2.2) * u, weight: 700, tracking: 0.2, color: INK, reveal: eIn, window: 0.3,
        alpha: 1 - eOut, rise: 0.8 * u
      });
    }

    // lens: seasoning on the hits only, at rest at both ends
    const fx = S.fx;
    const h1 = hit(t, 0.13, 0.4), h2 = hit(t, T_PER, 0.3), h3 = hit(t, T_DOT, 0.22), h4 = hit(t, T_FLAT - 0.02, 0.35);
    const h5 = hit(t, T_BAR4 - 0.02, 0.45), h6 = hit(t, T_ORANGE, 0.25);
    let hd = 0;
    for (const d of W.depts) hd += hit(t, d.th - 0.02, 0.18);
    fx.shake = S.u * (1.4 * h1 + 0.7 * h2 + 0.35 * h3 + 0.8 * h4 + 1.3 * h5 + 0.35 * hd);
    fx.ab = 0.55 * h1 + 0.25 * h2 + 0.3 * h4 + 0.5 * h5 + 0.25 * h6 + 0.25 * hd + 0.3 * Math.exp(-(((t - T_THREAD) / 0.09) ** 2));
    // the shock ring starts already open: at a zero radius the warp pinches the frame's centre
    const ring = (t0, len) => (t > t0 && t < t0 + len ? 0.16 + 0.84 * outCubic(seg(t, t0, t0 + len)) : 0);
    fx.warp = ring(0.13, 0.5) || ring(T_BAR4 - 0.01, 0.55);
    fx.ab += 0.4 * seg(t, T_DRIVE + 0.3, T_FILL - 0.14) * (1 - seg(t, T_FILL - 0.14, T_FILL - 0.03));
  }
};

function covers(poly, w, h) {
  const inside = (x, y) => {
    let sgn = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
      if (c !== 0) { if (sgn && Math.sign(c) !== sgn) return false; sgn = Math.sign(c); }
    }
    return true;
  };
  return inside(0, 0) && inside(w, 0) && inside(w, h) && inside(0, h);
}

export default scene;
export const __debug = { camAt, world };
