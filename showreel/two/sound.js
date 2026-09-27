/* The second reel's sound — a score synthesised in the browser, 128 bpm.

   Nothing here is a recording except the cast's voices: the kick, the clap,
   the hats, the bass, the pluck, the pad, the crashes and every effect are
   oscillators and noise. The score is plain data (arrange()), a function of
   time, and a look-ahead scheduler turns the next fifth of a second of it
   into nodes on the audio thread. So any instant can be played from: a seek
   (or a pause, or a play) ends the current "take" — every node it started or
   has queued fades out in 12 ms and stops, its reverb and delay tails with it
   — and a fresh take starts at the new time, where the long sounds already
   under way (a pad, a crash, a riser, the filter sweep) join partway through.

   Off until someone asks for it: no AudioContext and no fetch before
   setOn(true). While it plays, the audio clock is the reel's clock — clock()
   is the reel time now leaving the speakers (AudioContext.getOutputTimestamp,
   so it allows for the output latency) — and the picture follows the music.
   At the loop point the player seeks to ≈ 0; that seek lands where the score
   already is, so the take simply carries on across the wrap: the downbeat at
   0 was queued before the wrap, once.

   The arrangement — 32 bars, eight chapters of four, one chord a chapter
   (A minor: Am F C G | Am F Dm E, the E pulling back round into the loop):
     bar 1        filtered intro: the whole groove under a lowpass opening
                  320 Hz → 2.6 kHz, the pad fading in, a swell into…
     bar 2        the drop: filter open, crash, full kit
     ch 1–8       kick every beat, clap on 2 and 4, 16th hats (velocity
                  pattern + a little variation), off-beat sub bass on the
                  chapter's root, a syncopated pluck on the chord (motif A in
                  chapters 1–4, motif B in 5–8, a turnaround run on each
                  chapter's 4th bar), a sidechained pad, open hats on the
                  off-beats in chapters 2, 3, 5–8; a clap pickup at the end of
                  every chapter, a crash on every chapter downbeat and a
                  two-beat noise swell into every seam
     ch 4         (Voices) thinner: eighth hats, no pluck until the 4th bar,
                  the music ducks ~4 dB under each voice line
     ch 6         (Code) 32nd-note hat stutters at the end of bars 2 and 4
     ch 7 bar 3   breakdown: drums and bass out, pad + pluck, the filter
                  dips to 1.1 kHz and a lift pad swells
     ch 7 bar 4   build: clap roll (8ths → 16ths), rising hats, the filter
                  opening, a two-bar riser into…
     ch 8         full, the pluck doubled an octave up
     ch 8 bar 4   the ending: beats 1–2 full, a held E7 stab with the kick on
                  3, the filter closing over the tail, a tiny swell into the
                  loop's downbeat

   The chapters' sound effects (`sfx: [{ at, type, gain?, len? }]`, local
   seconds) and the Voices chapter's `cues: [{ at, voice }]` are read from the
   scenes when sound is first turned on. */
import { BEAT, BAR } from './palette.js';

const STEP = BEAT / 4;     // a 16th
const LOOK = 0.2;          // seconds of score queued ahead of the audio clock
const EVERY = 25;          // ms between scheduler passes
const LEAD = 0.04;         // a take starts this far ahead, so its first downbeat is never late
const SNIP = 0.42;         // seconds of each voice line (a beat is 0.47)
const DUCK = 0.62;         // music level under a voice (≈ −4 dB)
const VLEVEL = 1.3;        // a voice line's level into the master
const OUT = 0.46;          // master gain, after the compressor (music peaks ≈ −6 dBFS)
const VOICE = n => `assets/voice-${n}.mp3`;

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const mod = (x, m) => ((x % m) + m) % m;
function hash(i) { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

// one chord a chapter: the bass root, and the triad the pluck plays over it
const ROOT = [33, 29, 36, 31, 33, 29, 38, 40];                       // A1 F1 C2 G1 A1 F1 D2 E2
const CHORD = [[69, 72, 76], [69, 72, 77], [67, 72, 76], [67, 71, 74],   // Am F C G
               [69, 72, 76], [69, 72, 77], [69, 74, 77], [68, 71, 76]];  // Am F Dm E
const OPEN_HATS = [0, 1, 1, 0, 1, 1, 1, 1];
// the pluck: [16th, chord tone (0–2 the triad, 3–4 its lower two an octave up), velocity]
const MOTIF_A = [[0, 3, 1], [3, 2, 0.75], [6, 4, 0.9], [10, 3, 0.7], [12, 1, 0.8]];
const MOTIF_B = [[0, 4, 1], [2, 3, 0.7], [6, 2, 0.85], [8, 3, 0.7], [11, 1, 0.8], [14, 2, 0.75]];
const TURN = [[0, 3, 1], [3, 2, 0.75], [6, 4, 0.9], [8, 3, 0.7], [10, 2, 0.75], [12, 1, 0.8], [14, 0, 0.85]];
const HATS = [0.5, 0.22, 0.9, 0.3];                                  // 16ths within a beat
const OPENF = 20000;                                                 // the music filter, open

/* ── the score, as data ──────────────────────────────────────────────────────
   Every event is { t (start, reel seconds), k (kind), len, v, j (joinable: a
   long sound a take may start partway through), …params }, sorted by t. The
   music filter's sweeps are 'seg' events on the same list. */
function arrange(D, chapters) {
  const ev = [];
  const put = (t, k, o) => { ev.push(Object.assign({ t: mod(t, D), k, len: 0.3, v: 1, j: 0 }, o)); };
  const nCh = chapters.length, nBars = Math.round(D / BAR), last = nBars - 1;
  const chOf = t => { for (let i = 0; i < nCh; i++) if (t < chapters[i].end - 1e-6) return i; return nCh - 1; };
  const full = nCh >= 8;                                   // the breakdown lives in chapter 7
  const stabAt = last * BAR + 2 * BEAT;

  for (let b = 0; b < nBars; b++) {
    const t0 = b * BAR, ci = chOf(t0 + 1e-6), c8 = ci % 8;
    const lb = b - Math.round(chapters[ci].start / BAR);   // bar within the chapter
    const intro = b === 0, tail = b === last;
    const breakdown = full && ci === 6 && lb === 2, build = full && ci === 6 && lb === 3;
    const quiet = ci === 3, code = ci === 5, turn = lb === 3;
    const drums = !breakdown && !build;
    const f = mtof(ROOT[c8]);
    const tones = CHORD[c8].concat(CHORD[c8][0] + 12, CHORD[c8][1] + 12);

    for (let k = 0; k < 4; k++) {
      const tb = t0 + k * BEAT, over = tail && k === 3;
      if (drums && !over) put(tb, 'kick', { len: 0.45 });
      if (drums && (k & 1) && !over) put(tb, 'clap', { len: 0.25 });
      if (drums && !(tail && k >= 2)) put(tb + 2 * STEP, 'bass', { f: turn && k === 3 && !tail ? f * 2 : f, len: 0.2 });
      for (let s = 0; s < 4; s++) {
        if (breakdown || (tail && k >= 2)) break;
        if (intro && s !== 2) continue;
        if (quiet && (s & 1)) continue;
        if (code && (lb & 1) && k === 3 && s >= 2) continue;        // the stutter takes these
        const n = b * 16 + k * 4 + s;
        const v = build ? 0.12 + 0.55 * (k * 4 + s) / 15 : HATS[s] * (0.82 + 0.36 * hash(n));
        put(tb + s * STEP, 'hat', { v, open: s === 2 && OPEN_HATS[c8] && !build && !intro ? 1 : 0, n });
      }
    }
    if (code && (lb & 1)) for (let i = 0; i < 4; i++) put(t0 + (14 + i / 2) * STEP, 'hat', { v: 0.3 + 0.12 * i, n: b * 16 + 20 + i });
    if (turn && drums && !tail) put(t0 + 15 * STEP, 'clap', { v: 0.45, len: 0.25 });
    if (build) [0, 2, 4, 6, 8, 9, 10, 11, 12, 13, 14, 15].forEach(s => put(t0 + s * STEP, 'clap', { v: 0.22 + 0.6 * s / 15, len: 0.25 }));

    let motif = ci >= 4 ? MOTIF_B : MOTIF_A;
    if (turn && !build) motif = TURN;
    if (quiet && !turn) motif = null;
    if (tail) motif = MOTIF_A.filter(m => m[0] < 8);
    if (motif) for (const [s, n, v] of motif) {
      put(t0 + s * STEP, 'pluck', { f: mtof(tones[n]), v, len: 0.4 });
      if (c8 === 7 && !tail) put(t0 + s * STEP, 'pluck', { f: mtof(tones[n] + 12), v: v * 0.3, len: 0.4 });
    }
    if (tail) {
      // the button: an E7 held on beat 3, the root under it
      put(stabAt, 'stab', { notes: [68, 71, 74, 76].map(mtof), len: 1.6 });
      put(stabAt, 'bass', { f, len: 0.5 });
    }
  }

  // per chapter: the pad, the crash on the downbeat, the swell into the next seam
  for (let ci = 0; ci < nCh; ci++) {
    const cs = chapters[ci].start, ce = chapters[ci].end, c8 = ci % 8;
    const lastCh = ci === nCh - 1;
    put(cs, 'pad', { notes: CHORD[c8].map(m => mtof(m - 12)), len: (lastCh ? stabAt : ce) - cs, att: ci === 0 ? BAR * 0.8 : 0.03, j: 1 });
    put(cs, 'crash', { v: ci === 0 ? 0.45 : 1, len: 2, j: 1 });
    if (full && ci === 6) put(ce - 2 * BAR, 'swell', { len: 2 * BAR, v: 1.7, big: 1, j: 1 });
    else if (lastCh) put(ce - BEAT, 'swell', { len: BEAT, v: 0.45, j: 1 });
    else put(ce - 2 * BEAT, 'swell', { len: 2 * BEAT, v: 1, j: 1 });
  }
  put(0, 'swell', { len: BAR, v: 1.15, j: 1 });                    // into the drop
  put(BAR, 'crash', { v: 1, len: 2, j: 1 });                       // the drop
  if (full) put(chapters[6].start + 2 * BAR, 'pad', { notes: CHORD[6].map(mtof), len: 2 * BAR, att: 2 * BAR * 0.9, v: 0.8, j: 1 });

  // the music filter: segments covering the whole loop (c: 0 hold, 2 exponential)
  const seg = (t, len, v0, v1, c) => put(t, 'seg', { len, v0, v1, c, j: 1 });
  seg(0, BAR, 320, 2600, 2);
  if (full) {
    const lift = chapters[6].start + 2 * BAR;
    seg(BAR, lift - BAR, OPENF, OPENF, 0);
    seg(lift, 2 * BAR, 1100, 15000, 2);
    seg(lift + 2 * BAR, stabAt - lift - 2 * BAR, OPENF, OPENF, 0);
  } else seg(BAR, stabAt - BAR, OPENF, OPENF, 0);
  seg(stabAt, D - stabAt, OPENF, 700, 2);

  // the chapters' own hits, and the cast's lines
  for (const c of chapters) {
    for (const s of c.scene.sfx || []) {
      const at = c.start + (+s.at || 0), v = s.gain != null ? +s.gain : 1;
      if (s.type === 'impact') put(at, 'impact', { v, len: 1.1, j: 1 });
      else if (s.type === 'whoosh') { const L = +s.len || 0.7; put(at - L / 2, 'whoosh', { v, len: L, j: 1 }); }
      else if (s.type === 'riser') { const L = +s.len || 1.6; put(at - L, 'riser', { v, len: L, j: 1 }); }
      else if (s.type === 'glitch') put(at, 'glitch', { v, len: 0.34, n: Math.round(at * 1000) });
      else if (s.type === 'tick') put(at, 'tick', { v, len: 0.06 });
      else if (s.type === 'sub') put(at, 'sub', { v, len: 1.5, j: 1 });
    }
    for (const q of c.scene.cues || []) put(c.start + q.at, 'voice', { name: q.voice, len: SNIP });
  }
  ev.sort((a, b) => a.t - b.t);
  return ev;
}

/* ── per context: noise, a room, a soft clipper; the master chain ────────── */
function makeKit(ac) {
  const sr = ac.sampleRate;
  let s = 0x9e3779b9;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296 * 2 - 1; };
  // a second of stereo noise, looped, read from a different point for every hit
  const noise = ac.createBuffer(2, sr, sr);
  for (let c = 0; c < 2; c++) { const d = noise.getChannelData(c); for (let i = 0; i < sr; i++) d[i] = rnd(); }
  // a small bright room: 1.3 s of noise falling ~55 dB, darker as it fades
  const m = Math.round(sr * 1.3), ir = ac.createBuffer(2, m, sr), k = Math.pow(0.002, 1 / m), pre = sr * 0.01;
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c); let lp = 0, a = 1;
    for (let i = 0; i < m; i++) { lp += (rnd() - lp) * (0.9 - 0.8 * i / m); a *= k; d[i] = i < pre ? 0 : lp * a; }
  }
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
  return { noise, ir, curve };
}

function masterChain(ac) {
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 3;
  comp.attack.value = 0.004; comp.release.value = 0.2;
  const out = ac.createGain(); out.gain.value = OUT;
  const guard = ac.createGain();
  comp.connect(out); out.connect(guard); guard.connect(ac.destination);
  return { input: comp, guard };
}

/* each voice line opens on 0.1–0.3 s of air: start at the first syllable so it lands on the beat */
function onset(buf) {
  const d = buf.getChannelData(0); let peak = 0;
  for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
  let i = 0; while (i < d.length && Math.abs(d[i]) < peak * 0.08) i++;
  return Math.max(0, i / buf.sampleRate - 0.015);
}

/* An envelope from breakpoints relative to `when`: [[dt, value, curve]] with
   curve 0 = step, 1 = linear, 2 = exponential, the first point a step at 0.
   `j` > 0 starts it that far in: the value there is set at when + j and only
   the later points are scheduled — which is how a take joins a sound (or the
   filter's sweep) already under way. */
function env(p, when, pts, j) {
  let i = 0;
  while (i + 1 < pts.length && pts[i + 1][0] <= j) i++;
  let v = pts[i][1];
  const nx = pts[i + 1];
  if (j > 0 && nx && nx[2]) {
    const f = (j - pts[i][0]) / (nx[0] - pts[i][0]);
    v = nx[2] === 2 ? Math.max(1e-4, v) * Math.pow(Math.max(1e-4, nx[1]) / Math.max(1e-4, v), f) : v + (nx[1] - v) * f;
  }
  p.setValueAtTime(v, when + j);
  for (let k = i + 1; k < pts.length; k++) {
    const q = pts[k];
    if (q[2] === 0) p.setValueAtTime(q[1], when + q[0]);
    else if (q[2] === 1) p.linearRampToValueAtTime(q[1], when + q[0]);
    else p.exponentialRampToValueAtTime(Math.max(1e-4, q[1]), when + q[0]);
  }
}

/* ── the instruments ─────────────────────────────────────────────────────────
   engine() binds them to one context. take(r0, a0) builds the bus a stretch of
   uninterrupted playback runs through (reel time r0 at context time a0);
   schedule() plays the score's events in a span of reel time into it; end()
   fades it and stops every node it holds. */
function engine(ac, score, D, dest, bank) {
  const kit = makeKit(ac), NYQ = ac.sampleRate * 0.45;
  const G = v => { const g = ac.createGain(); g.gain.value = v; return g; };
  const F = (type, f, q) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = Math.min(f, NYQ); if (q != null) b.Q.value = q; return b; };
  const O = (type, f, det) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; return o; };
  const N = () => { const s = ac.createBufferSource(); s.buffer = kit.noise; s.loop = true; return s; };
  const wire = (...n) => { for (let i = 0; i + 1 < n.length; i++) n[i].connect(n[i + 1]); };
  const pan = () => (ac.createStereoPanner ? ac.createStereoPanner() : null);

  /* start the sources (noise from a varied point in the buffer), stop them all at
     `stop`, and free the chain when they end */
  function go(T, srcs, nodes, at, stop, seed) {
    for (const s of srcs) {
      if (s.buffer) s.start(at, hash(seed + at) * 0.9); else s.start(at);
      s.stop(stop);
    }
    const rec = [srcs, nodes];
    T.live.add(rec);
    srcs[0].onended = () => { if (T.live.delete(rec)) free(rec); };
  }
  function free(rec) { for (const s of rec[0]) s.disconnect(); for (const n of rec[1]) n.disconnect(); }

  /* the room is a ConvolverNode, which is slow to build (it transforms the
     impulse), so a context keeps three and each take borrows the next behind
     gains of its own: a finished take's tail is cut off with its gains, and a
     room is only lent again two takes later, once its tail has died away */
  const rooms = [];
  let lent = 0;
  function room() {
    const i = lent++ % 3;
    if (!rooms[i]) { rooms[i] = ac.createConvolver(); rooms[i].buffer = kit.ir; }
    return rooms[i];
  }

  function take(r0, a0) {
    const out = G(1); out.connect(dest);
    const duck = G(1), filt = F('lowpass', OPENF, 1), music = G(1), pump = G(1), post = G(1), sfx = G(1), voice = G(1);
    wire(music, filt, duck, out); wire(pump, music); wire(post, duck); wire(sfx, out); wire(voice, out);
    // a short room and a dotted-8th echo, both fed from the instruments, both returning into the music bus
    const rev = room(), revIn = G(1), revOut = G(0.45);
    wire(revIn, rev, revOut, music);
    const dly = ac.createDelay(1); dly.delayTime.value = 3 * STEP;
    const dlyIn = G(0.5), fb = G(0.32), dlp = F('lowpass', 2600, 0.5), dlyOut = G(0.5);
    wire(dlyIn, dly, dlp, fb, dly); wire(dlp, dlyOut, music);
    return {
      r0, a0, to: r0, live: new Set(), said: [], speaking: null,
      out, duck, filt, music, pump, post, sfx, voice, revIn, dlyIn, rev, revOut,
      nodes: [out, duck, filt, music, pump, post, sfx, voice, revIn, revOut, dly, dlyIn, fb, dlp, dlyOut]
    };
  }

  function end(T) {
    const now = ac.currentTime, g = T.out.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(1, now); g.linearRampToValueAtTime(0, now + 0.012);
    for (const rec of T.live) for (const s of rec[0]) { try { s.stop(now + 0.015); } catch (_) {} }
    // lines queued but not yet begun were never heard
    for (const w of T.said) if (w > now) bank.fired--;
    setTimeout(() => {
      for (const rec of T.live) free(rec);
      T.live.clear();
      for (const n of T.nodes) n.disconnect();
      try { T.rev.disconnect(T.revOut); } catch (_) {}
    }, 60);
  }

  /* play the events whose start falls in [a, b) of (unbounded) reel time —
     the score repeats every D seconds. `now` (realtime only) drops a short
     sound that is already too late to land on time and joins a long one. */
  function schedule(T, a, b, now) {
    const ev = score;
    while (a < b - 1e-9) {
      const base = Math.floor(a / D) * D, hi = Math.min(b, base + D);
      let lo = 0, up = ev.length;
      while (lo < up) { const m = (lo + up) >> 1; if (ev[m].t < a - base) lo = m + 1; else up = m; }
      for (let i = lo; i < ev.length && ev[i].t < hi - base; i++) {
        const e = ev[i], when = T.a0 + (base + e.t - T.r0);
        let j = 0;
        if (now != null && when < now) {
          if (!e.j && now - when > 0.03) continue;
          if (e.j) j = now - when;
        }
        fire(T, e, when, j);
      }
      a = hi;
    }
  }

  /* at the start of a take: the long sounds already under way at reel time r */
  function join(T, r) {
    for (const e of score) {
      if (!e.j) continue;
      for (let base = 0; base >= -D; base -= D) {
        const x = base + e.t;
        if (x < r && x + e.len > r + (e.k === 'seg' ? 0 : 0.02)) fire(T, e, T.a0 - (r - x), r - x);
      }
    }
  }

  function fire(T, e, when, j) {
    switch (e.k) {
      case 'kick': return kick(T, when, j, e.v);
      case 'clap': return clap(T, when, j, e.v);
      case 'hat': return hat(T, when, j, e.v, e.open, e.n);
      case 'bass': return bass(T, when, j, e.f, e.len);
      case 'pluck': return pluck(T, when, j, e.v, e.f, 0.26, 1);
      case 'stab': for (const f of e.notes) pluck(T, when, j, 0.4, f, e.len, 2); return;
      case 'pad': return pad(T, when, j, e.v, e.notes, e.len, e.att);
      case 'crash': return crash(T, when, j, e.v);
      case 'swell': return swell(T, when, j, e.v, e.len, e.big);
      case 'seg': return env(T.filt.frequency, when, e.c ? [[0, Math.min(e.v0, NYQ), 0], [e.len, Math.min(e.v1, NYQ), e.c]] : [[0, Math.min(e.v0, NYQ), 0]], j);
      case 'impact': return impact(T, when, j, e.v);
      case 'whoosh': return whoosh(T, when, j, e.v, e.len);
      case 'riser': return riser(T, when, j, e.v, e.len);
      case 'glitch': return glitch(T, when, e.v, e.n);
      case 'tick': return tick(T, when, e.v);
      case 'sub': return sub(T, when, j, e.v);
      case 'voice': return voice(T, when, e.name);
    }
  }

  // ── the kit ──
  function kick(T, when, j, v) {
    const o = O('sine', 160), g = G(0), s = N(), hp = F('highpass', 3200, 0.7), cg = G(0);
    env(o.frequency, when, [[0, 170, 0], [0.04, 70, 2], [0.3, 45, 2]], j);
    env(g.gain, when, [[0, 0, 0], [0.002, 0.95 * v, 1], [0.07, 0.72 * v, 1], [0.44, 1e-4, 2]], j);
    env(cg.gain, when, [[0, 0, 0], [0.0008, 0.22 * v, 1], [0.012, 1e-4, 2]], j);
    wire(o, g, T.music); wire(s, hp, cg, T.music);
    go(T, [o, s], [g, hp, cg], when + j, when + 0.46, when);
    // the pad breathes with the kick
    env(T.pump.gain, when, [[0, 1, 0], [0.012, 0.4, 1], [0.15, 0.82, 1], [0.34, 1, 1]], j);
  }
  function clap(T, when, j, v) {
    const s = N(), hp = F('highpass', 700), bp = F('bandpass', 1250, 0.8), g = G(0), send = G(0.35);
    const a = 0.42 * v;
    env(g.gain, when, [[0, 0, 0], [0.001, a, 1], [0.008, a * 0.2, 2], [0.0095, a * 0.85, 1], [0.017, a * 0.2, 2],
      [0.0185, a * 0.75, 1], [0.21, 1e-4, 2]], j);
    wire(s, hp, bp, g, T.music); wire(g, send, T.revIn);
    const o = O('triangle', 220), og = G(0);
    env(o.frequency, when, [[0, 230, 0], [0.06, 175, 2]], j);
    env(og.gain, when, [[0, 0, 0], [0.002, 0.3 * a, 1], [0.09, 1e-4, 2]], j);
    wire(o, og, T.music);
    go(T, [s, o], [hp, bp, g, send, og], when + j, when + 0.24, when);
  }
  function hat(T, when, j, v, open, n) {
    const s = N(), hp = F('highpass', 7400, 0.6), g = G(0), d = open ? 0.2 : 0.045, a = 0.14 * v;
    env(g.gain, when, [[0, 0, 0], [0.0015, a, 1], [d, 1e-4, 2]], j);
    wire(s, hp, g, T.music);
    go(T, [s], [hp, g], when + j, when + d + 0.01, n);
  }
  function bass(T, when, j, f, len) {
    const o = O('sine', f), w = O('sawtooth', f), lp = F('lowpass', 500, 1.4), wg = G(0.55), g = G(0);
    env(lp.frequency, when, [[0, 900, 0], [0.12, 230, 2]], j);
    env(g.gain, when, [[0, 0, 0], [0.005, 0.3, 1], [len - 0.035, 0.25, 1], [len, 0, 1]], j);
    wire(o, g, T.music); wire(w, lp, wg, g);
    go(T, [o, w], [lp, wg, g], when + j, when + len + 0.01, when);
  }
  function pluck(T, when, j, v, f, dec, wet) {
    const a = O('sawtooth', f, -7), b = O('square', f, 7), lp = F('lowpass', 3000, 2.2), g = G(0);
    env(lp.frequency, when, [[0, Math.min(f * 8, 9000), 0], [Math.min(dec, 0.4) * 0.55, f * 1.6, 2]], j);
    env(g.gain, when, [[0, 0, 0], [0.003, 0.12 * v, 1], [dec, 1e-4, 2]], j);
    a.connect(lp); b.connect(lp); wire(lp, g, T.music);
    g.connect(T.dlyIn); if (wet > 1) g.connect(T.revIn);
    go(T, [a, b], [lp, g], when + j, when + dec + 0.01, when);
  }
  function pad(T, when, j, v, notes, len, att) {
    const lp = F('lowpass', 1300, 0.4), g = G(0), srcs = [];
    for (const f of notes) for (const d of [-9, 9]) { const o = O('sawtooth', f, d); o.connect(lp); srcs.push(o); }
    const a = 0.024 * v;
    env(g.gain, when, [[0, 0, 0], [att, a, 1], [Math.max(att, len - 0.12), a, 1], [len, 0, 1]], j);
    wire(lp, g, T.pump); g.connect(T.revIn);
    go(T, srcs, [lp, g], when + j, when + len + 0.01, when);
  }
  function crash(T, when, j, v) {
    const s = N(), hp = F('highpass', 3800, 0.5), pk = F('peaking', 8500, 1), g = G(0), send = G(0.3);
    pk.gain.value = 3;
    env(g.gain, when, [[0, 0, 0], [0.002, 0.11 * v, 1], [0.15, 0.042 * v, 2], [2, 1e-4, 2]], j);
    wire(s, hp, pk, g, T.post); wire(g, send, T.revIn);
    go(T, [s], [hp, pk, g, send], when + j, when + 2.01, when);
  }
  function swell(T, when, j, v, len, big) {
    const s = N(), bp = F('bandpass', 450, 1.1), g = G(0), a = 0.1 * v;
    env(bp.frequency, when, [[0, 450, 0], [len, 7000, 2]], j);
    env(g.gain, when, big ? [[0, 1e-4, 0], [len * 0.5, a * 0.2, 2], [len - 0.008, a, 2], [len, 0, 1]]
                          : [[0, 1e-4, 0], [len - 0.008, a, 2], [len, 0, 1]], j);
    wire(s, bp, g, T.post);
    const srcs = [s], nodes = [bp, g];
    if (big) {
      const o = O('sawtooth', 110), lp = F('lowpass', 1400, 0.7), og = G(0);
      env(o.frequency, when, [[0, 110, 0], [len, 880, 2]], j);
      env(og.gain, when, [[0, 0, 0], [len - 0.008, a * 0.3, 1], [len, 0, 1]], j);
      wire(o, lp, og, T.post); srcs.push(o); nodes.push(lp, og);
    }
    go(T, srcs, nodes, when + j, when + len + 0.005, when);
  }

  // ── the chapters' hits ──
  function impact(T, when, j, v) {
    const o = O('sine', 95), g = G(0), s = N(), lp = F('lowpass', 1800, 0.6), ng = G(0), send = G(0.4);
    env(o.frequency, when, [[0, 110, 0], [0.35, 38, 2]], j);
    env(g.gain, when, [[0, 0, 0], [0.003, 0.7 * v, 1], [0.12, 0.45 * v, 1], [1, 1e-4, 2]], j);
    env(ng.gain, when, [[0, 0, 0], [0.002, 0.3 * v, 1], [0.3, 1e-4, 2]], j);
    wire(o, g, T.sfx); wire(s, lp, ng, T.sfx); wire(ng, send, T.revIn);
    go(T, [o, s], [g, lp, ng, send], when + j, when + 1.02, when);
  }
  function whoosh(T, when, j, v, len) {
    const s = N(), bp = F('bandpass', 300, 2.2), g = G(0), p = pan();
    env(bp.frequency, when, [[0, 300, 0], [len / 2, 2800, 2], [len, 600, 2]], j);
    env(g.gain, when, [[0, 1e-4, 0], [len / 2, 0.42 * v, 2], [len, 1e-4, 2]], j);
    if (p) { env(p.pan, when, [[0, -0.7, 0], [len, 0.7, 1]], j); wire(s, bp, g, p, T.sfx); } else wire(s, bp, g, T.sfx);
    go(T, [s], p ? [bp, g, p] : [bp, g], when + j, when + len + 0.01, when);
  }
  function riser(T, when, j, v, len) {
    const s = N(), bp = F('bandpass', 300, 1.5), g = G(0), o = O('sine', 180), og = G(0);
    env(bp.frequency, when, [[0, 300, 0], [len, 6000, 2]], j);
    env(g.gain, when, [[0, 1e-4, 0], [len * 0.6, 0.05 * v, 2], [len - 0.005, 0.24 * v, 2], [len, 0, 1]], j);
    env(o.frequency, when, [[0, 180, 0], [len, 1400, 2]], j);
    env(og.gain, when, [[0, 0, 0], [len - 0.005, 0.05 * v, 1], [len, 0, 1]], j);
    wire(s, bp, g, T.sfx); wire(o, og, T.sfx);
    go(T, [s, o], [bp, g, og], when + j, when + len + 0.005, when);
  }
  function glitch(T, when, v, n) {
    // five 32nd-note bursts of a square at a new pitch each time, over gated noise
    const o = O('square', 400), og = G(0), s = N(), hp = F('highpass', 2500, 0.7), ng = G(0);
    const gate = [[0, 0, 0]], hiss = [[0, 0, 0]];
    [0, 1, 2, 4, 5].forEach((k, i) => {
      const at = k * STEP / 2, d = 0.02 + 0.018 * hash(n + i), a = (0.07 + 0.05 * hash(n + i + 9)) * v;
      o.frequency.setValueAtTime(180 * Math.pow(2, 4 * hash(n * 3 + i)), when + at);
      gate.push([at + 0.001, a, 1], [at + d, a * 0.6, 1], [at + d + 0.002, 0, 1]);
      hiss.push([at + 0.001, a * 0.8, 1], [at + d * 0.6, 0, 1]);
    });
    env(og.gain, when, gate, 0); env(ng.gain, when, hiss, 0);
    wire(o, og, T.sfx); wire(s, hp, ng, T.sfx);
    go(T, [o, s], [og, hp, ng], when, when + 0.34, n);
  }
  function tick(T, when, v) {
    const o = O('sine', 3000), g = G(0);
    env(o.frequency, when, [[0, 3000, 0], [0.03, 2300, 2]], 0);
    env(g.gain, when, [[0, 0, 0], [0.001, 0.16 * v, 1], [0.04, 1e-4, 2]], 0);
    wire(o, g, T.sfx);
    go(T, [o], [g], when, when + 0.05, when);
  }
  function sub(T, when, j, v) {
    // an 808: a pitched-down sine through a soft clipper, so small speakers hear its overtones
    const o = O('sine', 110), g = G(0), sh = ac.createWaveShaper(), og = G(0.5 * v);
    sh.curve = kit.curve; sh.oversample = '2x';
    env(o.frequency, when, [[0, 120, 0], [0.08, 56, 2], [1.3, 40, 2]], j);
    env(g.gain, when, [[0, 0, 0], [0.004, 1.3, 1], [0.3, 0.9, 1], [1.45, 1e-4, 2]], j);
    wire(o, g, sh, og, T.sfx);
    go(T, [o], [g, sh, og], when + j, when + 1.5, when);
  }

  // ── the cast ──
  function voice(T, when, name) {
    const buf = bank.buffers[name];
    // only lines crossed by forward playback: never one sitting on the point a take started from
    if (!buf || when <= T.a0 + 1e-6) return;
    const src = ac.createBufferSource(), g = G(0);
    src.buffer = buf;
    env(g.gain, when, [[0, 0, 0], [0.012, VLEVEL, 1], [SNIP - 0.04, VLEVEL, 0], [SNIP, 0, 1]], 0);
    wire(src, g, T.voice);
    src.start(when, bank.onsets[name] || 0);
    src.stop(when + SNIP + 0.01);
    // the next voice cuts the last one off, as in a roll call
    const p = T.speaking;
    if (p && when < p.end - 0.04 && when > p.when + 0.012) {
      p.g.gain.cancelScheduledValues(when); p.g.gain.setValueAtTime(VLEVEL, when); p.g.gain.linearRampToValueAtTime(0, when + 0.04);
      try { p.src.stop(when + 0.045); } catch (_) {}
    }
    T.speaking = { src, g, when, end: when + SNIP };
    // the music steps back while it speaks
    const d = T.duck.gain;
    d.cancelScheduledValues(when); d.setTargetAtTime(DUCK, when, 0.02); d.setTargetAtTime(1, when + SNIP, 0.07);
    const rec = [[src], [g]];
    T.live.add(rec);
    src.onended = () => { if (T.live.delete(rec)) free(rec); };
    T.said.push(when);
    if (T.said.length > 8) T.said.shift();   // only lines still ahead of the clock matter
    bank.fired++;
  }

  return { take, end, schedule, join };
}

export function createSound({ duration, chapters }) {
  const D = duration;
  const names = [...new Set(chapters.flatMap(c => (c.scene.cues || []).map(q => q.voice)))];
  const bank = { buffers: {}, onsets: {}, fired: 0 };

  let on = false, playing = false;
  let ac = null, eng = null, M = null, T = null, timer = 0;
  let pos = null, lastT = null, guardAt = null, lastResume = 0, voicesLoading = null;

  function ensure() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      // iOS: play through the ringer switch, as a video would
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) {}
      try { ac = new AC({ latencyHint: 'interactive' }); } catch (_) { ac = new AC(); }
      M = masterChain(ac);
      eng = engine(ac, arrange(D, chapters), D, M.input, bank);
      // a take waits for a running context (a new one, or one iOS interrupted)
      ac.onstatechange = () => { if (ac.state === 'running' && on && playing && !T) begin(lastT ?? pos ?? 0); };
      // unlock WebKit inside the gesture: one silent sample
      const s = ac.createBufferSource(); s.buffer = ac.createBuffer(1, 1, ac.sampleRate); s.connect(ac.destination); s.start(0);
    } catch (e) { console.warn('[reel] web audio unavailable', e); ac = null; return false; }
    return true;
  }
  function resume(force) {
    if (!ac || ac.state === 'running' || ac.state === 'closed') return;
    const n = performance.now();
    if (!force && n - lastResume < 400) return;
    lastResume = n;
    const p = ac.resume();
    if (p && p.catch) p.catch(() => {});
  }

  function loadVoices() {
    if (voicesLoading || !ac) return;
    voicesLoading = Promise.all(names.map(async n => {
      try {
        const r = await fetch(VOICE(n));
        if (!r.ok) throw new Error(r.status);
        const data = await r.arrayBuffer();
        const buf = await new Promise((res, rej) => { const p = ac.decodeAudioData(data, res, rej); if (p && p.catch) p.catch(rej); });
        bank.onsets[n] = onset(buf);
        bank.buffers[n] = buf;
      } catch (e) { console.warn('[reel] voice', n, e); }
    }));
  }

  /* the context time now leaving the speakers: the output timestamp carried
     forward to this instant, or the render clock less the reported latency */
  function heard() {
    const ct = ac.currentTime;
    if (ac.getOutputTimestamp) {
      const ts = ac.getOutputTimestamp();
      if (ts && ts.contextTime > 0 && ts.performanceTime > 0) {
        const x = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
        if (x > ct - 0.5 && x < ct + 0.05) return Math.min(x, ct);
      }
    }
    return ct - Math.min(0.3, ac.outputLatency || ac.baseLatency || 0);
  }
  const reelNow = () => T.r0 + (heard() - T.a0);

  function run() {
    if (!T || ac.state !== 'running') return;
    const now = ac.currentTime, until = T.r0 + (now + LOOK - T.a0);
    if (until > T.to) { eng.schedule(T, T.to, until, now); T.to = until; }
  }
  function halt() {
    if (T) { eng.end(T); T = null; }
    if (timer) { clearInterval(timer); timer = 0; }
  }
  function begin(r) {
    halt();
    pos = r = mod(r, D);
    if (ac.state !== 'running') { resume(); return; }
    const now = ac.currentTime;
    T = eng.take(r, now + LEAD);
    const g = M.guard.gain; g.cancelScheduledValues(now); g.setValueAtTime(1, now); guardAt = null;
    eng.join(T, r);
    run();
    timer = setInterval(run, EVERY);
  }

  return {
    get on() { return on; },
    /** the reel time now being heard while the score plays; NaN while it is
        meant to be playing but the audio context is not running yet (starting
        up, or interrupted); null when it is not the clock (sound off, or paused) */
    clock() {
      if (!on || !playing || !ac) return null;
      if (!T || ac.state !== 'running') return NaN;
      return reelNow();
    },
    /** where the score is (for the tests) */
    get position() {
      if (!ac) return null;
      return T && ac.state === 'running' ? reelNow() : pos;
    },
    get voicesReady() { return Object.keys(bank.buffers).length; },
    get voicesFired() { return bank.fired; },
    setOn(v, t, isPlaying) {
      on = !!v;
      if (on) {
        if (!ensure()) { on = false; return; }   // no Web Audio here: the button must not claim sound is on
        resume(true);
        loadVoices();
        playing = !!isPlaying;
        pos = lastT = t;
        if (playing) begin(t);
      } else {
        halt();
        // let the 12 ms fade play out, then let the context sleep
        if (ac) setTimeout(() => { if (!on && ac.state === 'running') ac.suspend().catch(() => {}); }, 80);
      }
    },
    play(t) {
      playing = true;
      pos = lastT = t;
      if (on && ac) { resume(true); begin(t); }
    },
    pause() {
      playing = false;
      if (lastT !== null) pos = lastT;
      halt();
    },
    seek(t) {
      lastT = t;
      if (on && playing && T && ac.state === 'running') {
        // the loop (or a seek to where the score already is): carry on, the wrap already queued
        const d = reelNow() - t, k = Math.round(d / D);
        if (Math.abs(d - k * D) < 0.1) { if (k) { T.r0 -= k * D; T.to -= k * D; } return; }
        begin(t);
        return;
      }
      pos = t;
      if (T) halt();
    },
    /** mute the master `sec` seconds of reel time from now — on the audio
        thread, so it lands on the seam even if the page is busy — because the
        chapter after it has not loaded and the picture will wait there; null lifts it */
    guard(sec) {
      if (!ac || !on || !playing || !T) { guardAt = null; return; }
      const g = M.guard.gain, now = ac.currentTime;
      if (sec == null) {
        if (guardAt !== null) { guardAt = null; g.cancelScheduledValues(now); g.setValueAtTime(1, now); }
        return;
      }
      const at = Math.max(now, T.a0 + ((lastT ?? reelNow()) + Math.max(0, sec) - T.r0));
      if (guardAt !== null && Math.abs(guardAt - at) < 0.03) return;
      if (guardAt !== null && guardAt > now) { g.cancelScheduledValues(now); g.setValueAtTime(1, now); }
      guardAt = at;
      if (at - 0.005 > now) { g.setValueAtTime(1, at - 0.005); g.linearRampToValueAtTime(0, at); }
      else g.setValueAtTime(0, at);
    },
    tick(t) {
      lastT = t;
      if (!on || !ac) return;
      // the player only ticks while it plays and is not waiting on a chapter; a
      // seek that ended a wait did not say play again, so the tick does
      if (!playing) { playing = true; begin(t); return; }
      if (ac.state !== 'running') { resume(); return; }
      if (!T) { begin(t); return; }
      run();
      // the picture ran on without the score (a stall, an interruption): pull the score to it
      const h = heard(), lag = t - (T.r0 + (h - T.a0));
      if (lag > 0.35 + LEAD + (ac.currentTime - h) || lag < -0.35) begin(t);
    }
  };
}

/** Render `len` seconds of the score from reel time `from` offline — the same
    score, instruments and master chain, scheduled in one pass. `only` keeps
    just those kinds of event ('kick', 'pluck', 'seg', 'voice', …); `voices`
    ({ name: AudioBuffer }) lets the cast speak too. Resolves to the
    AudioBuffer. For the tests. */
export function renderOffline({ duration, chapters }, from = 0, len = 16, rate = 44100, only = null, voices = null) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ac = new OAC(2, Math.ceil(len * rate), rate);
  const M = masterChain(ac);
  let score = arrange(duration, chapters);
  if (only) score = score.filter(e => only.includes(e.k));
  const bank = { buffers: {}, onsets: {}, fired: 0 };
  for (const n in voices || {}) { bank.buffers[n] = voices[n]; bank.onsets[n] = onset(voices[n]); }
  const eng = engine(ac, score, duration, M.input, bank);
  const T = eng.take(from, 0);
  eng.join(T, from);
  eng.schedule(T, from, from + len, null);
  return ac.startRendering();
}
