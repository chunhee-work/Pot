/* The player. It owns the clock, the canvases and the transport; the
   chapters own everything that is drawn. See kit.js for the rule they keep. */
import * as K from './kit.js';
import { createPost } from './post.js';
import { loadModels, renderModel } from './logo3d.js';
import { CHAPTERS, DURATION } from './timeline.js';
import { createSound } from './sound.js';

const qs = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const body = document.body;
const stage = $('stage'), glc = $('gl'), c2d = $('c2d');
const ctx = c2d.getContext('2d', { alpha: false });
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

let post = null;
try { post = createPost(glc); } catch (e) { post = null; }
if (!post) { c2d.removeAttribute('data-hidden'); glc.setAttribute('data-hidden', ''); }

/* ?solo=<chapter id> loops one chapter; ?t=<seconds> starts there;
   ?paused holds the first frame; ?debug draws the safe frame and the clock */
const soloCh = CHAPTERS.find(c => c.scene.id === qs.get('solo'));
const T0 = soloCh ? soloCh.start : 0, T1 = soloCh ? soloCh.end : DURATION;
const debug = qs.has('debug');

// ── the per-frame state handed to chapters ────────────────────────────────
const images = new Map();
const S = {
  W: 0, H: 0, u: 1, lw: 2, dpr: 1, portrait: false,
  t: 0, lt: 0, d: 1, fx: null, chapter: null,
  img: p => images.get(p),
  logo3d: (name, o) => renderModel(name, o)
};

function fxReset() {
  return { ab: 0, flash: 0, warp: 0, warpX: 0.5, warpY: 0.5, shake: 0, grain: 1, vignette: 1, exposure: 1 };
}

function chapterAt(t) {
  for (const c of CHAPTERS) if (t < c.end) return c;
  return CHAPTERS[CHAPTERS.length - 1];
}

const failed = new Set();
function drawFrame(t) {
  const c = chapterAt(t);
  S.t = t; S.lt = t - c.start; S.d = c.end - c.start; S.fx = fxReset(); S.chapter = c;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = K.PAL.bg; ctx.fillRect(0, 0, S.W, S.H);
  ctx.save();
  try { c.scene.draw(ctx, S); }
  catch (e) { if (!failed.has(c.scene.id)) { failed.add(c.scene.id); console.error('[reel] chapter', c.scene.id, e); } }
  ctx.restore();
  if (debug) drawDebug(c);
  return c;
}

function drawDebug(c) {
  const { W, H, u } = S;
  ctx.save();
  ctx.strokeStyle = 'rgba(78,205,196,.55)'; ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
  // the transport and the top labels cover these bands while the chrome shows
  ctx.strokeRect(W * 0.05, H * 0.08, W * 0.9, H * 0.78);
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, 44 * u, 4 * u);
  ctx.fillStyle = '#4ecdc4'; ctx.font = `600 ${2 * u}px ui-monospace, monospace`;
  ctx.fillText(`t ${S.t.toFixed(2)}  lt ${S.lt.toFixed(2)}/${S.d}  ${c.scene.id}`, u, 2.8 * u);
  ctx.restore();
}

// ── sizing ────────────────────────────────────────────────────────────────
const MAX_PX = 1920 * 1200;
function size() {
  const r = stage.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = Math.max(2, Math.round(r.width * dpr)), H = Math.max(2, Math.round(r.height * dpr));
  if (W * H > MAX_PX) { const k = Math.sqrt(MAX_PX / (W * H)); W = Math.round(W * k); H = Math.round(H * k); }
  setBacking(W, H, W / Math.max(1, r.width));
}
function setBacking(W, H, dpr) {
  if (c2d.width !== W || c2d.height !== H) { c2d.width = W; c2d.height = H; }
  if (post) post.resize(W, H);
  S.W = W; S.H = H; S.dpr = dpr; S.portrait = H > W;
  S.u = Math.min(W, H) / 100;
  S.lw = Math.max(1.5 * dpr, 0.26 * S.u);
  dirty = true;
}

// ── clock and loop ────────────────────────────────────────────────────────
let t = T0, playing = false, dirty = true, raf = 0, last = 0, dragging = false, frames = 0, started = false;
const start = parseFloat(qs.get('t'));
if (isFinite(start)) t = K.clamp(start, T0, T1 - 0.001);

const sound = createSound({ duration: DURATION, chapters: CHAPTERS });

function wrap(x) { return x >= T1 || x < T0 ? T0 + ((((x - T0) % (T1 - T0)) + (T1 - T0)) % (T1 - T0)) : x; }

function loop(now) {
  raf = requestAnimationFrame(loop);
  const dt = last ? Math.min(0.1, Math.max(0, (now - last) / 1000)) : 0;
  last = now;
  if (playing && !dragging) {
    const at = sound.clock();
    const next = at != null ? at : t + dt;
    if (next >= T1) { t = wrap(next); sound.seek(t); } else t = next;
    sound.tick(t);
    dirty = true;
  }
  if (!dirty) return;
  dirty = false;
  const c = drawFrame(t);
  present(now);
  frames++;
  updateUI(c);
}

function present(now) {
  if (!post) return;
  const fx = S.fx;
  if (fx.shake) { fx.shakeX = K.noise1(S.t * 24, 7) * fx.shake; fx.shakeY = K.noise1(S.t * 24, 13) * fx.shake; }
  post.draw(c2d, fx, (now || 0) / 1000);
}

function run() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
function halt() { cancelAnimationFrame(raf); raf = 0; }

// ── transport ─────────────────────────────────────────────────────────────
const playBtn = $('playBtn'), soundBtn = $('soundBtn'), fsBtn = $('fsBtn');
const scrub = $('scrub'), fill = $('fill'), knob = $('knob'), timeEl = $('time');
const chapterLabel = $('chapterLabel'), chaptersNav = $('chapters'), live = $('live');

const fmt = s => { s = Math.max(0, Math.floor(s + 1e-6)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

CHAPTERS.forEach((c, i) => {
  const tick = document.createElement('i');
  tick.className = 'tick'; tick.style.left = (c.start / DURATION * 100) + '%';
  if (i) $('ticks').appendChild(tick);
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = c.scene.title;
  b.style.left = (c.start / DURATION * 100) + '%';
  b.style.width = ((c.end - c.start) / DURATION * 100) + '%';
  b.setAttribute('aria-label', `Chapter ${i + 1}: ${c.scene.title}`);
  b.addEventListener('pointerdown', e => e.stopPropagation());
  b.addEventListener('click', e => { e.stopPropagation(); jump(i); });
  chaptersNav.appendChild(b);
});

let lastSec = -1, lastCh = null;
function updateUI(c) {
  const p = t / DURATION;
  fill.style.transform = `scaleX(${p})`;
  knob.style.left = (p * 100) + '%';
  const sec = Math.floor(t);
  if (sec !== lastSec) {
    lastSec = sec;
    timeEl.innerHTML = `<b>${fmt(t)}</b> / ${fmt(DURATION)}`;
    scrub.setAttribute('aria-valuenow', t.toFixed(1));
    scrub.setAttribute('aria-valuetext', `${sec} seconds, ${c.scene.title}`);
  }
  if (c !== lastCh) {
    lastCh = c;
    const i = CHAPTERS.indexOf(c);
    chapterLabel.textContent = `${String(i + 1).padStart(2, '0')} / ${String(CHAPTERS.length).padStart(2, '0')} · ${c.scene.title}`;
    [...chaptersNav.children].forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
  }
}

function setPlaying(p) {
  playing = p;
  $('icoPause').style.display = p ? '' : 'none';
  $('icoPlay').style.display = p ? 'none' : '';
  playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play');
  if (p) sound.play(t); else sound.pause();
  wake();
}
function play() { if (!playing) setPlaying(true); run(); }
function pause() { if (playing) setPlaying(false); dirty = true; }
function toggle() { playing ? pause() : play(); }

function seek(x, announce) {
  t = wrap(K.clamp(x, T0, T1 - 1e-3));
  sound.seek(t);
  dirty = true; run();
  if (announce) live.textContent = `${chapterAt(t).scene.title}, ${fmt(t)}`;
}
function jump(i) { const c = CHAPTERS[K.clamp(i, 0, CHAPTERS.length - 1)]; seek(c.start + 1e-3, true); }

function setSound(on) {
  sound.setOn(on, t, playing);
  const now = sound.on;
  soundBtn.setAttribute('aria-pressed', String(now));
  soundBtn.setAttribute('aria-label', now ? 'Turn sound off' : 'Turn sound on');
  $('icoMute').style.display = now ? 'none' : '';
  $('icoSound').style.display = now ? '' : 'none';
}

function flashPulse() {
  const el = $('pulse');
  el.querySelector('svg').innerHTML = playing
    ? '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>'
    : '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>';
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
}

playBtn.addEventListener('click', toggle);
soundBtn.addEventListener('click', () => setSound(!sound.on));

const fsOK = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
if (!fsOK) fsBtn.style.display = 'none';
function toggleFS() {
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
}
fsBtn.addEventListener('click', toggleFS);

// scrubbing
let wasPlaying = false;
function scrubTo(e) {
  const r = scrub.querySelector('.track').getBoundingClientRect();
  seek(K.clamp((e.clientX - r.left) / r.width) * DURATION);
}
scrub.addEventListener('pointerdown', e => {
  dragging = true; wasPlaying = playing; scrub.setAttribute('data-drag', '');
  try { scrub.setPointerCapture(e.pointerId); } catch (_) {}
  sound.pause();
  scrubTo(e);
});
scrub.addEventListener('pointermove', e => { if (dragging) scrubTo(e); });
const endDrag = () => {
  if (!dragging) return;
  dragging = false; scrub.removeAttribute('data-drag');
  if (wasPlaying) sound.play(t);
  live.textContent = `${chapterAt(t).scene.title}, ${fmt(t)}`;
};
scrub.addEventListener('pointerup', endDrag);
scrub.addEventListener('pointercancel', endDrag);
scrub.addEventListener('keydown', e => {
  // ←/→ are handled for the whole page (±5 s); ↑/↓ nudge by a second on the focused slider
  if (e.key === 'ArrowDown') { seek(t - 1, true); e.preventDefault(); }
  if (e.key === 'ArrowUp') { seek(t + 1, true); e.preventDefault(); }
});

// clicking the picture plays and pauses; a tap on a sleeping phone only wakes the controls
stage.addEventListener('pointerup', e => {
  if (e.pointerType !== 'mouse' && body.hasAttribute('data-idle')) { wake(); return; }
  toggle(); flashPulse();
});

addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (body.hasAttribute('data-still')) return;
  const k = e.key;
  if (k === ' ' || k === 'k' || k === 'K') {
    if (e.target && e.target.tagName === 'BUTTON' && k === ' ') return;   // the focused button handles it
    toggle(); flashPulse(); e.preventDefault();
  } else if (k === 'ArrowLeft' || k === 'j' || k === 'J') { seek(t - 5, true); e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'l' || k === 'L') { seek(t + 5, true); e.preventDefault(); }
  else if (k === 'm' || k === 'M') setSound(!sound.on);
  else if ((k === 'f' || k === 'F') && fsOK) toggleFS();
  else if (k === 'Home') seek(0, true);
  else if (/^[1-9]$/.test(k) && +k <= CHAPTERS.length) jump(+k - 1);
  else return;
  wake();
});

// the chrome sleeps while the reel plays untouched
let idleTimer = 0;
function wake() {
  body.removeAttribute('data-idle');
  clearTimeout(idleTimer);
  if (playing) idleTimer = setTimeout(() => { if (playing && !dragging) body.setAttribute('data-idle', ''); }, 2500);
}
['pointermove', 'pointerdown', 'focusin'].forEach(n => addEventListener(n, wake, { passive: true }));

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { halt(); sound.pause(); }
  else if (started && !body.hasAttribute('data-still')) { if (playing) sound.play(t); dirty = true; run(); }
});

new ResizeObserver(() => { size(); if (started) run(); }).observe(stage);

// ── loading ───────────────────────────────────────────────────────────────
const loadBar = $('loadBar'), loadText = $('loadText');
async function load() {
  const paths = [...new Set(CHAPTERS.flatMap(c => c.scene.assets || []))];
  const models = [...new Set(CHAPTERS.flatMap(c => c.scene.models || []))];
  const total = paths.length + models.length + 1;
  let done = 0;
  const bump = () => {
    done++;
    const p = done / total;
    loadBar.style.transform = `scaleX(${p})`;
    loadText.textContent = `Threading the needle · ${Math.round(p * 100)}%`;
  };
  const fonts = Promise.all(['400', '600', '700', '800', '900'].map(w => document.fonts.load(`${w} 40px Archivo`)).concat(document.fonts.load('700 40px Cinzel')))
    .catch(() => {}).then(bump);
  const imgs = paths.map(p => new Promise(res => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => { images.set(p, im); bump(); res(); }); };
    im.onerror = () => { console.error('[reel] image failed', p); bump(); res(); };
    im.src = p;
  }));
  const mods = loadModels(models, bump).catch(e => { console.error('[reel]', e.message); models.forEach(bump); });
  await Promise.all([fonts, mods, ...imgs]);
}

// ── the still version ─────────────────────────────────────────────────────
function buildStills() {
  const list = $('stillList');
  if (list.children.length) return;
  const keep = [S.W, S.H, S.dpr];
  setBacking(1600, 900, 1);
  CHAPTERS.forEach((c, i) => {
    const at = c.start + K.clamp(c.scene.still ?? (c.end - c.start) / 2, 0, c.end - c.start - 0.01);
    drawFrame(at);
    const cv = document.createElement('canvas');
    cv.width = 1600; cv.height = 900;
    cv.getContext('2d').drawImage(c2d, 0, 0);
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', `${c.scene.title}: ${c.scene.caption || ''}`);
    const li = document.createElement('li');
    li.innerHTML = `<figure><figcaption><time>${fmt(c.start)}–${fmt(c.end)}</time><b>${String(i + 1).padStart(2, '0')} ${c.scene.title}</b><span>${c.scene.caption || ''}</span></figcaption></figure>`;
    li.querySelector('figure').prepend(cv);
    list.appendChild(li);
  });
  setBacking(...keep);
}
function enterStill() { halt(); pause(); body.setAttribute('data-still', ''); buildStills(); }
function leaveStill() { body.removeAttribute('data-still'); size(); play(); }
$('playAnyway').addEventListener('click', leaveStill);

// ── boot ──────────────────────────────────────────────────────────────────
let resolveReady;
const ready = new Promise(r => (resolveReady = r));

(async () => {
  size();
  try { await load(); } catch (e) { console.error('[reel] load', e); }
  started = true;
  $('loader').setAttribute('data-done', '');
  if (reduced.matches) enterStill();
  else {
    if (qs.has('paused')) { setPlaying(false); dirty = true; run(); }
    else play();
  }
  resolveReady();
})();

// ── hooks for the tests and the frame grabber ─────────────────────────────
const probe = document.createElement('canvas');
/* sampling uses high-quality (mip-mapped) downscaling, so a hairline or a
   small caption still registers in a 64px-wide thumbnail */
function probeCtx(w, h) {
  probe.width = w; probe.height = h;
  const p = probe.getContext('2d', { willReadFrequently: true });
  p.imageSmoothingEnabled = true; p.imageSmoothingQuality = 'high';
  return p;
}
window.__reel = {
  duration: DURATION,
  chapters: CHAPTERS.map(c => ({ id: c.scene.id, title: c.scene.title, start: c.start, end: c.end, still: c.scene.still })),
  ready,
  get t() { return t; },
  get playing() { return playing; },
  get frames() { return frames; },
  get soundOn() { return sound.on; },
  get audio() { return { position: sound.position, voices: sound.voicesReady }; },
  cueCount: CHAPTERS.reduce((n, c) => n + (c.scene.cues || []).length, 0),
  get post() { return !!post; },
  play, pause, seek, jump, setSound,
  /** render the frame at `time` and return it as w×h luma (0..255), pre-lens */
  sample(time, w = 64, h = Math.round(64 * S.H / S.W)) {
    drawFrame(time);
    const p = probeCtx(w, h);
    p.drawImage(c2d, 0, 0, w, h);
    const d = p.getImageData(0, 0, w, h).data, out = new Array(w * h);
    for (let i = 0; i < w * h; i++) out[i] = Math.round(d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114);
    dirty = true;
    return out;
  },
  /** the frame every chapter boundary must match: black and the thread at rest */
  sampleRest(w = 64, h = Math.round(64 * S.H / S.W)) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = K.PAL.bg; ctx.fillRect(0, 0, S.W, S.H);
    K.rest(ctx, S);
    const p = probeCtx(w, h);
    p.drawImage(c2d, 0, 0, w, h);
    const d = p.getImageData(0, 0, w, h).data, out = new Array(w * h);
    for (let i = 0; i < w * h; i++) out[i] = Math.round(d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114);
    dirty = true;
    return out;
  },
  /** the lens settings a chapter asked for at `time` */
  fxAt(time) { drawFrame(time); dirty = true; return { ...S.fx }; },
  /** show the frame at `time` exactly as a viewer would (lens included), paused */
  show(time) { pause(); t = time; const c = drawFrame(t); present(performance.now()); updateUI(c); dirty = false; },
  /** mean and worst JS cost of drawing a frame, over n instants spread across the reel */
  perf(n = 120, from = 0, to = DURATION) {
    let sum = 0, max = 0, worst = 0;
    for (let i = 0; i < n; i++) {
      const at = from + (i + 0.5) / n * (to - from);
      const a = performance.now(); drawFrame(at); const b = performance.now() - a;
      sum += b; if (b > max) { max = b; worst = at; }
    }
    dirty = true;
    return { mean: sum / n, max, worst };
  }
};
