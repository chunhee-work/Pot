/* A 2.5D camera for the canvas: points in a 3D world, projected with a
   pinhole camera, drawn back to front, fading into the frame's colour with
   distance. Everything stays vector — type is drawn by the kit at a fixed
   reference size and scaled by the projection — so the camera can fly right
   up to a letter and its edges stay sharp.

   World units are arbitrary; the camera looks down +z. A thing of height h
   at distance d from the camera is h·F/d pixels tall, where F (the focal
   length) is `zoom` × the frame's short side. Frame is still a pure function
   of time: build the camera and the draw list from S each frame. */
import { text as kitText, cover, clamp, lerp } from './kit.js';

const REF = 100;   // type is laid out at this size and scaled by the projection

// ── colour ────────────────────────────────────────────────────────────────
const parsed = new Map();
export function rgb(hex) {
  let v = parsed.get(hex);
  if (v) return v;
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  parsed.set(hex, v);
  return v;
}
/** a colour between a and b (hex strings), as an rgb() string */
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b), k = clamp(t);
  return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(lerp(A[2], B[2], k))})`;
}

// ── camera ────────────────────────────────────────────────────────────────
/**
 * camera(S, { x, y, z, roll, zoom, cx, cy, near })
 *   x, y, z   position (y is down, as on screen)
 *   roll      rotation about the view axis, radians
 *   zoom      focal length in short sides (default 1.1)
 *   cx, cy    the vanishing point in frame fractions (default 0.5, 0.5)
 * Returns { project(x, y, z) → { x, y, k, d } | null } — k is pixels per world unit.
 */
export function camera(S, o = {}) {
  const F = (o.zoom ?? 1.1) * Math.min(S.W, S.H);
  const cx = (o.cx ?? 0.5) * S.W, cy = (o.cy ?? 0.5) * S.H;
  const cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0);
  const X = o.x || 0, Y = o.y || 0, Z = o.z || 0, near = o.near ?? 0.05;
  return {
    F, x: X, y: Y, z: Z, roll: o.roll || 0, near,
    project(x, y, z) {
      const d = z - Z;
      if (d <= near) return null;
      const k = F / d, px = (x - X) * k, py = (y - Y) * k;
      return { x: cx + px * cr - py * sr, y: cy + px * sr + py * cr, k, d };
    }
  };
}

/** Catmull-Rom through [[x,y,z],…] at f in 0..1 — for camera paths */
export function spline3(pts, f) {
  const n = pts.length - 1, u = clamp(f) * n, i = Math.min(n - 1, Math.floor(u)), t = u - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t * t + (-a + 3 * b - 3 * c2 + d) * t * t * t);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1]), c(p0[2], p1[2], p2[2], p3[2])];
}

/** fog 0..1 for a depth: 0 nearer than `near`, 1 at `far` */
export function fogAt(d, near, far) { return clamp((d - near) / (far - near)); }

// ── the draw list ─────────────────────────────────────────────────────────
/**
 * A depth-sorted draw list. Add items in any order; draw() paints them far to near.
 *   list.text(str, { x, y, z, size (world height of a capital), color, weight,
 *                     tracking, align, rotZ, squash (0..1 — fakes a turn about
 *                     the vertical axis), alpha, reveal, …any kit.text option })
 *   list.image(img, { x, y, z, w, h, fx, fy, zoom, rotZ, alpha, radius })
 *   list.rect({ x, y, z, w, h, color, rotZ, alpha })
 *   list.custom(z, (ctx, p) => …)   draw anything at a projected point p
 * draw(ctx, S, cam, { fog: colour, near, far, maxPx }) — fog blends each
 * item toward the fog colour with distance; items nearer than the camera's
 * near plane, or larger on screen than maxPx (default 40 frame widths), are skipped.
 */
export function list() {
  const items = [];
  const add = (kind, z, a, b) => { items.push({ kind, z, a, b }); return api; };
  const api = {
    text: (str, o) => add('text', o.z, str, o),
    image: (img, o) => add('image', o.z, img, o),
    rect: o => add('rect', o.z, null, o),
    custom: (z, fn, o = {}) => add('custom', z, fn, o),
    get size() { return items.length; },
    draw(ctx, S, cam, o = {}) {
      const near = o.near ?? 4, far = o.far ?? 60, fog = o.fog, maxPx = (o.maxPx ?? 40) * S.W;
      items.sort((p, q) => q.z - p.z);
      for (const it of items) {
        const B = it.b || {};
        const p = cam.project(B.x || 0, B.y || 0, it.z);
        if (!p) continue;
        const f = fog ? fogAt(p.d, near, far) : 0;
        if (f >= 1) continue;
        const alpha = (B.alpha ?? 1);
        if (alpha <= 0) continue;
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.translate(p.x, p.y);
        const rot = (cam.roll || 0) + (B.rotZ || 0);
        if (rot) ctx.rotate(rot);
        if (it.kind === 'text') {
          const px = B.size * p.k;
          if (px > maxPx || px < 0.5) { ctx.restore(); continue; }
          // a capital is ~0.72 of the font size in Archivo
          const s = px / (REF * 0.72);
          ctx.scale(s * (B.squash ?? 1), s);
          const color = fog && f > 0 ? mix(B.color || '#ffffff', fog, f) : (B.color || '#ffffff');
          kitText(ctx, S, it.a, 0, B.baseline === 'middle' ? REF * 0.36 : 0, { weight: 900, tracking: -0.02, align: 'center', ...B, alpha: 1, size: REF, color });
        } else if (it.kind === 'image') {
          const w = B.w * p.k, h = B.h * p.k;
          if (w > maxPx || w < 1) { ctx.restore(); continue; }
          if (B.radius) { roundClip(ctx, -w / 2, -h / 2, w, h, B.radius * p.k); }
          cover(ctx, it.a, -w / 2, -h / 2, w, h, { fx: B.fx, fy: B.fy, zoom: B.zoom });
          if (fog && f > 0) { ctx.globalAlpha *= f; ctx.fillStyle = fog; ctx.fillRect(-w / 2, -h / 2, w, h); }
        } else if (it.kind === 'rect') {
          const w = B.w * p.k, h = B.h * p.k;
          if (w > maxPx) { ctx.restore(); continue; }
          ctx.fillStyle = fog && f > 0 ? mix(B.color || '#ffffff', fog, f) : (B.color || '#ffffff');
          ctx.fillRect(-w / 2, -h / 2, w, h);
        } else {
          it.a(ctx, p, f);
        }
        ctx.restore();
      }
    }
  };
  return api;
}

function roundClip(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  ctx.clip();
}
