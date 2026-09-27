/* The third reel's sound — a score synthesised in the browser, 96 bpm.

   Nothing here is a recording: the pads, the arpeggio, the sub pulse, the
   kick, the hats, the crashes, the warp risers and every effect are
   oscillators and noise. The score is plain data (arrange()), a function of
   time, and a look-ahead scheduler turns the next few tenths of a second of
   it into nodes on the audio thread. So any instant can be played from: a
   seek (or a pause, or a play) ends the current "take" — every node it
   started or has queued fades out in 12 ms and stops, its reverb and echo
   tails with it — and a fresh take starts at the new time, where the long
   sounds already under way (a pad, a crash, a riser, a bell, the arpeggio's
   filter sweep) join partway through.

   Off until someone asks for it: no AudioContext, no buffer and no fetch
   before setOn(true). While it plays, the audio clock is the reel's clock —
   clock() is the reel time now leaving the speakers (the context's output
   timestamp, carried forward, so it allows for the output latency) — and the
   picture follows the music. At the loop point the player seeks to ≈ 0; that
   seek lands where the score already is, so the take simply carries on
   across the wrap: the downbeat at 0 was queued before the wrap, once.

   The arrangement — 24 bars, eight chapters of three, D minor, one chord a
   chapter, a slow cinematic pulse that climbs through 5–7 and lands in 8:
     every bar    a sub pulse on every beat (the chapter's root, a sine with
                  a little drive so small speakers hear it), shimmering hats
                  on the off-beats, a glassy 16th arpeggio on the chord through
                  a resonant lowpass that opens chapter by chapter, echoing
                  left–right in a dotted-8th ping-pong, and a wide detuned pad
                  (two saws a note, split hard left and right) whose own
                  filter sweeps slowly up and back over each chapter
     every seam   a warp riser over the chapter's last bar (noise swept up a
                  bandpass, two saws gliding up four octaves) into a crash on
                  the next chapter's downbeat (a falling boom, a thump, a
                  long bright wash into the hall)
     ch 1 Dm9     launch: no kick yet, the arpeggio still dark
     ch 2 B♭maj7  the kick comes in, on 1 and 3, restrained
     ch 3 Fmaj9   the arpeggio turns to a second figure
     ch 4 Cadd9   brighter
     ch 5 Gm9     the build: a glass-bell melody enters, ghost hats on the
                  last 16th of each beat
     ch 6 E♭maj7♯11  the pulse doubles to 8ths, a ghost kick on the and-of-4,
                  the arpeggio doubled an octave up on the beats
     ch 7 A7sus4 → A7  most intense: 16th hats, the arpeggio doubled
                  throughout, the chord resolving its suspension in bar 3
                  under a snare roll and a two-bar riser into…
     ch 8 D(add9)  the arrival, a Picardy third: the biggest crash, the bell
                  resolving down to D, the arpeggio's filter closing, the kick
                  and hats thinning in the last bar, a soft riser into the
                  loop, where chapter 1's crash picks it up again

   The master: a gentle glue compressor (2:1 above −16 dB), make-up gain, and
   a soft ceiling no sample can pass (−1.1 dBFS). Rendered offline the loop
   peaks at −2 dBFS with an RMS of −18 dBFS.

   The chapters' sound effects (`sfx: [{ at, type, gain?, len? }]`, local
   seconds; 'impact' | 'whoosh' | 'riser' | 'glitch' | 'tick' | 'sub') are
   read from the scenes when sound is first turned on. Voice cues
   (`cues: [{ at, voice }]`) are supported the way the second reel's are,
   but no chapter of this reel declares any, so nothing is fetched. */
import { BEAT, BAR } from './palette.js';

const STEP = BEAT / 4;     // a 16th (0.156 s)
const LOOK = 0.3;          // seconds of score queued ahead of the audio clock
const EVERY = 25;          // ms between scheduler passes
const LEAD = 0.04;         // a take starts this far ahead, so its first downbeat is never late
const GRACE = 0.012;       // a take also plays the short hits this close behind its start (a jump to a chapter lands 1 ms in)
const SNIP = 0.6;          // seconds of a voice line
const DUCK = 0.62;         // music level under a voice (≈ −4 dB)
const VLEVEL = 1.2;        // a voice line's level into the master
const OUT = 0.75;          // master gain after the glue compressor
const CEIL = 0.88;         // the soft ceiling's limit (−1.1 dBFS): nothing leaves above it
const VOICE = n => `assets/voice-${n}.mp3`;

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const mod = (x, m) => ((x % m) + m) % m;
function hash(i) { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

/* ── the harmony ─────────────────────────────────────────────────────────────
   Per chapter: the pad's voicing for each bar, the arpeggio's eight tones for
   each bar (ascending), and the pulse's root. D minor: i – VI – III – VII –
   iv – ♭II – V – I (the ♭II a Neapolitan, the I a Picardy third). */
const DM9 = [50, 57, 60, 64, 65], BBM7 = [46, 53, 57, 62, 65], FM9 = [53, 57, 60, 64, 67], CADD9 = [48, 55, 62, 64, 67];
const GM9 = [43, 50, 57, 58, 65], EBM7 = [51, 58, 62, 67, 69], ASUS = [45, 52, 55, 62, 64], A7 = [45, 52, 55, 61, 64];
const DADD9 = [50, 57, 62, 64, 66];
const PAD = [[DM9, DM9, DM9], [BBM7, BBM7, BBM7], [FM9, FM9, FM9], [CADD9, CADD9, CADD9],
             [GM9, GM9, GM9], [EBM7, EBM7, EBM7], [ASUS, ASUS, A7], [DADD9, DADD9, DADD9]];
const ARP_DM = [62, 65, 69, 72, 74, 76, 77, 81], ARP_BB = [62, 65, 69, 70, 74, 77, 81, 82];
const ARP_F = [65, 67, 69, 72, 76, 77, 79, 81], ARP_C = [62, 64, 67, 72, 74, 76, 79, 84];
const ARP_GM = [62, 65, 67, 69, 70, 74, 77, 81], ARP_EB = [63, 67, 69, 70, 74, 75, 79, 81];
const ARP_AS = [62, 64, 67, 69, 74, 76, 79, 81], ARP_A7 = [61, 64, 67, 69, 73, 76, 79, 81];
const ARP_D = [62, 64, 66, 69, 74, 76, 78, 81];
const ARPS = [[ARP_DM, ARP_DM, ARP_DM], [ARP_BB, ARP_BB, ARP_BB], [ARP_F, ARP_F, ARP_F], [ARP_C, ARP_C, ARP_C],
              [ARP_GM, ARP_GM, ARP_GM], [ARP_EB, ARP_EB, ARP_EB], [ARP_AS, ARP_AS, ARP_A7], [ARP_D, ARP_D, ARP_D]];
const ROOT = [38, 34, 29, 36, 31, 39, 33, 38];                  // D2 B♭1 F1 C2 G1 E♭2 A1 D2
// the arpeggio's figures: an index into the bar's eight tones for each 16th
const FIG_A = [0, 2, 4, 2, 1, 3, 5, 3, 2, 4, 6, 4, 3, 5, 7, 5];
const FIG_B = [0, 4, 2, 5, 1, 5, 3, 6, 2, 6, 4, 7, 5, 3, 4, 1];
const FIG_C = [0, 2, 4, 6, 7, 5, 3, 1, 2, 4, 6, 7, 6, 4, 5, 3];
const FIGS = [FIG_A, FIG_A, FIG_B, FIG_B, FIG_C, FIG_C, FIG_C, FIG_A];
// the glass bell (chapters 5–8): [chapter, bar, beat, note, beats]
const BELL = [
  [4, 0, 0, 74, 3], [4, 0, 3, 77, 1], [4, 1, 0, 76, 4], [4, 2, 0, 74, 2], [4, 2, 2, 70, 2],
  [5, 0, 0, 79, 3], [5, 0, 3, 81, 1], [5, 1, 0, 82, 2], [5, 1, 2, 81, 2], [5, 2, 0, 79, 4],
  [6, 0, 0, 81, 3], [6, 0, 3, 86, 1], [6, 1, 0, 86, 4], [6, 2, 0, 85, 2], [6, 2, 2, 88, 2],
  [7, 0, 0, 86, 4], [7, 1, 0, 81, 2], [7, 1, 2, 78, 2], [7, 2, 0, 74, 4]
];
// the energy of each chapter, by part
const PULSEV = [0.72, 0.8, 0.82, 0.85, 0.9, 0.96, 1, 0.9];
const KICKV = [0, 0.7, 0.72, 0.75, 0.8, 0.86, 0.92, 0.85];
const HATV = [0.4, 0.55, 0.6, 0.66, 0.76, 0.85, 1, 0.7];
const ARPV = [0.5, 0.6, 0.68, 0.76, 0.86, 0.95, 1.1, 0.85];
const PADV = [0.8, 0.85, 0.88, 0.9, 0.95, 1, 1.05, 1];
const PADF = [[380, 1300], [420, 1500], [460, 1700], [520, 1900], [600, 2300], [680, 2800], [760, 3300], [620, 2500]];
const CRASHV = [0.75, 0.7, 0.72, 0.76, 0.85, 0.9, 0.95, 1.25];
const RISEV = [0.55, 0.6, 0.65, 0.7, 0.8, 0.9, 1.25, 0.5];
// the arpeggio's lowpass at each chapter's start (and the loop's end, back where it began)
const ARPF = [800, 1250, 1650, 2100, 2600, 3300, 4400, 7800, 800];

/* ── the score, as data ──────────────────────────────────────────────────────
   Every event is { t (start, reel seconds), k (kind), len, v, j (joinable: a
   long sound a take may start partway through), …params }, sorted by t. The
   arpeggio filter's sweeps are 'seg' events on the same list. */
function arrange(D, chapters) {
  const ev = [];
  const put = (t, k, o) => { ev.push(Object.assign({ t: mod(t, D), k, len: 0.3, v: 1, j: 0 }, o)); };
  const nCh = chapters.length, nBars = Math.round(D / BAR);
  const chOf = t => { for (let i = 0; i < nCh; i++) if (t < chapters[i].end - 1e-6) return i; return nCh - 1; };

  for (let b = 0; b < nBars; b++) {
    const t0 = b * BAR, ci = chOf(t0 + 1e-6), c8 = ci % 8, ch = chapters[ci];
    const bars = Math.max(1, Math.round((ch.end - ch.start) / BAR));
    const lb = Math.min(bars - 1, Math.round((t0 - ch.start) / BAR)), hb = Math.min(lb, 2);
    const lastBar = lb === bars - 1;
    const tail = c8 === 7 && lastBar;             // the loop's last bar: thinning into the wrap
    const build = c8 === 6 && lastBar;            // the bar before the arrival
    const root = mtof(ROOT[c8]);

    for (let k = 0; k < 4; k++) {
      const tb = t0 + k * BEAT;
      // the pulse, every beat; 8ths in chapters 6–7
      put(tb, 'pulse', { f: root, v: PULSEV[c8] * (k === 0 ? 1 : 0.86), len: 0.55 });
      if (c8 === 5 || c8 === 6) put(tb + 2 * STEP, 'pulse', { f: root, v: 0.42, len: 0.55 });
      // the kick on 1 and 3 from chapter 2; a ghost on the and-of-4 in 6–7; only the 1 in the loop's last bar
      if (ci >= 1 && (k === 0 || k === 2) && !(tail && k === 2)) put(tb, 'kick', { v: KICKV[c8], len: 0.45 });
      if ((c8 === 5 || c8 === 6) && k === 3) put(tb + 2 * STEP, 'kick', { v: 0.42 * KICKV[c8], len: 0.45 });
      // the hats: the off-beat, and ghosts as it builds
      for (let s = 0; s < 4; s++) {
        const n = b * 16 + k * 4 + s, pan = ((k + s) & 1) ? 0.3 : -0.3;
        if (tail && (k >= 2 || s !== 2)) continue;
        let v = 0;
        if (s === 2) v = HATV[c8] * (0.9 + 0.2 * hash(n));
        else if (build) v = 0.16 + 0.5 * (k * 4 + s) / 15;
        else if (c8 === 6) v = s === 0 ? 0.22 : 0.3;
        else if (c8 === 5 && s !== 0) v = 0.26;
        else if (c8 === 4 && s === 3) v = 0.24;
        if (v > 0) put(tb + s * STEP, 'hat', { v, n, open: s === 2 ? 1 : 0, pan, len: 0.14 });
      }
    }

    // the arpeggio
    const tones = ARPS[c8][hb], fig = FIGS[c8];
    for (let s = 0; s < 16; s++) {
      const n = b * 16 + s, acc = s % 4 === 0 ? 1 : s % 4 === 2 ? 0.74 : 0.56;
      let v = ARPV[c8] * acc * (0.92 + 0.16 * hash(n + 7));
      if (tail) v *= 1 - 0.55 * s / 15;
      const m = tones[fig[(s + (lastBar && c8 !== 7 ? 8 : 0)) % 16]];
      const pan = s & 1 ? 0.28 : -0.28;
      put(t0 + s * STEP, 'arp', { f: mtof(m), v, pan, len: 0.3 });
      if ((c8 === 5 && s % 4 === 0) || c8 === 6) put(t0 + s * STEP, 'arp', { f: mtof(m + 12), v: v * 0.34, pan: -pan, len: 0.3 });
    }
    // the roll under the last bar before the arrival
    if (build) for (let s = 0; s < 16; s++) put(t0 + s * STEP, 'roll', { v: 0.12 + 0.62 * Math.pow(s / 15, 1.6), len: 0.14 });
  }

  // per chapter: the pad (a span per chord), the crash on the downbeat, the warp riser into the next seam
  for (let ci = 0; ci < nCh; ci++) {
    const cs = chapters[ci].start, ce = chapters[ci].end, c8 = ci % 8, len = ce - cs;
    const bars = Math.max(1, Math.round(len / BAR));
    const [lo, hi] = PADF[c8];
    let b0 = 0;
    for (let b = 1; b <= bars; b++) {
      const cur = PAD[c8][Math.min(b0, 2)];
      if (b < bars && PAD[c8][Math.min(b, 2)] === cur) continue;
      const s0 = cs + b0 * BAR, s1 = cs + b * BAR, first = b0 === 0, L = s1 - s0 + 0.45;
      // the filter sweeps over the whole chapter: up to `hi` at 55 %, back down towards the end
      const at = x => { const p = (x - cs) / len; return p < 0.55 ? lo * Math.pow(hi / lo, p / 0.55) : hi * Math.pow((lo * 1.3) / hi, (p - 0.55) / 0.45); };
      const pk = cs + 0.55 * len, sweep = [[0, at(s0), 0]];
      if (pk > s0 + 0.01 && pk < s0 + L - 0.01) sweep.push([pk - s0, at(pk), 2]);
      sweep.push([L, at(s0 + L), 2]);
      put(s0, 'pad', { notes: cur, len: L, v: PADV[c8], att: first ? (ci === 0 ? 0.9 : 0.35) : 0.12, sweep, j: 1 });
      b0 = b;
    }
    put(cs, 'crash', { v: CRASHV[c8], len: 2.6, j: 1 });
    const rl = c8 === 6 ? 2 * BAR : BAR;
    put(ce - rl, 'warp', { v: RISEV[c8], len: rl, big: c8 === 6 ? 1 : 0, j: 1 });
    // the arpeggio's filter across the chapter
    put(cs, 'seg', { len, v0: ARPF[c8], v1: ARPF[c8 + 1], c: 2, j: 1 });
  }
  // the bell
  for (const [c8, bar, beat, m, beats] of BELL) {
    if (c8 >= nCh) continue;
    const at = chapters[c8].start + bar * BAR + beat * BEAT, L = beats * BEAT + 1.1;
    put(at, 'bell', { f: mtof(m), v: c8 === 7 && bar === 0 ? 1.15 : 1, len: L, j: 1 });
  }

  // the chapters' own hits, and voice lines if any chapter has them
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

/* ── per context: noise, a hall, the drive curve; the master chain ───────── */
function makeKit(ac) {
  const sr = ac.sampleRate;
  let s = 0x9e3779b9;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296 * 2 - 1; };
  // a second of stereo noise, looped, read from a different point for every hit
  const noise = ac.createBuffer(2, sr, sr);
  for (let c = 0; c < 2; c++) { const d = noise.getChannelData(c); for (let i = 0; i < sr; i++) d[i] = rnd(); }
  // a dark hall: 2.2 s of noise falling ~60 dB, the two sides decorrelated, darker as it fades
  const m = Math.round(sr * 2.2), ir = ac.createBuffer(2, m, sr), k = Math.pow(0.001, 1 / m), pre = Math.round(sr * 0.02);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c); let lp = 0, a = 1;
    for (let i = 0; i < m; i++) { lp += (rnd() - lp) * (0.7 - 0.62 * i / m); a *= k; d[i] = i < pre ? 0 : lp * a * 0.9; }
  }
  // a soft drive for the pulse (tanh)
  const drive = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; drive[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
  return { noise, ir, drive };
}

/* the master's soft ceiling. A WaveShaper reads its curve over inputs −1…1 and
   holds the end values beyond, so the signal goes in at a quarter and the
   curve is drawn over x = 4u: linear to 0.6, then bending smoothly into CEIL,
   which it reaches (and holds) by ±4 — no sample can leave above CEIL. */
function ceiling() {
  const n = 8193, c = new Float32Array(n), K = 0.6, R = CEIL - K;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 8 - 4, a = Math.abs(x);
    c[i] = Math.sign(x) * (a <= K ? a : K + R * Math.tanh((a - K) / R));
  }
  return c;
}

function masterChain(ac) {
  // gentle glue, a make-up gain, then a soft ceiling no sample can pass
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 2;
  comp.attack.value = 0.01; comp.release.value = 0.3;
  const out = ac.createGain(); out.gain.value = OUT / 4;
  const lim = ac.createWaveShaper(); lim.curve = ceiling(); lim.oversample = 'none';
  const guard = ac.createGain();
  comp.connect(out); out.connect(lim); lim.connect(guard); guard.connect(ac.destination);
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
  const P = v => { if (!ac.createStereoPanner) return null; const p = ac.createStereoPanner(); p.pan.value = v; return p; };

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
  function free(rec) { for (const s of rec[0]) s.disconnect(); for (const n of rec[1]) if (n) n.disconnect(); }

  /* the hall is a ConvolverNode, which is slow to build (it transforms the
     impulse: tens of milliseconds on a busy machine), so a context keeps
     three, built one at a time while nothing else is happening (warm()), and
     each take borrows the next behind gains of its own: a finished take's
     tail is cut off with its gains, and a hall is only lent again two takes
     later, once its tail has died away */
  const ROOMS = 3, rooms = [];
  let lent = 0;
  function build(i) { if (!rooms[i]) { rooms[i] = ac.createConvolver(); rooms[i].buffer = kit.ir; } return rooms[i]; }
  function room() { return build(lent++ % ROOMS); }
  /** build the next hall not yet built; false once all are */
  function warm() { for (let i = 0; i < ROOMS; i++) if (!rooms[i]) { build(i); return true; } return false; }

  /* a take's bus; its clock (a0, the context time of reel time r0) is set by
     the caller once the bus is built, so the building never makes it late */
  function take(r0, a0) {
    const out = G(1); out.connect(dest);
    const duck = G(1), music = G(1), pump = G(1), post = G(1), sfx = G(1), voice = G(1);
    wire(music, duck, out); wire(pump, music); wire(post, duck); wire(sfx, out); wire(voice, out);
    // the pulse runs through one soft drive and a lowpass
    const bass = G(1), drv = ac.createWaveShaper(), blp = F('lowpass', 420, 0.5), bout = G(0.42);
    drv.curve = kit.drive; wire(bass, drv, blp, bout, music);
    // the arpeggio: its own resonant lowpass (the chapter-long sweeps), then dry and into the ping-pong
    const arp = G(1), arpF = F('lowpass', 800, 3.2);
    wire(arp, arpF, music);
    // the hall, fed from the instruments, returning into the music bus
    const rev = room(), revIn = G(1), revOut = G(0.5);
    wire(revIn, rev, revOut, music);
    // a dotted-8th ping-pong: left, then right, then left…
    const dlyIn = G(0.5), dlp = F('lowpass', 4200, 0.5), dL = ac.createDelay(1), dR = ac.createDelay(1);
    dlp.channelCount = 1; dlp.channelCountMode = 'explicit';
    dL.delayTime.value = 3 * STEP; dR.delayTime.value = 3 * STEP;
    const fbL = G(0.42), fbR = G(0.42), mer = ac.createChannelMerger(2), dlyOut = G(0.55);
    wire(dlyIn, dlp, dL); dL.connect(mer, 0, 0); wire(dL, fbL, dR); dR.connect(mer, 0, 1); wire(dR, fbR, dL);
    wire(mer, dlyOut, music);
    const toDly = G(0.55); wire(arpF, toDly, dlyIn);
    const arpRev = G(0.16); wire(arpF, arpRev, revIn);
    return {
      r0, a0, to: r0, live: new Set(), said: [], speaking: null,
      out, duck, music, pump, post, sfx, voice, bass, arp, arpF, revIn, dlyIn, rev, revOut,
      nodes: [out, duck, music, pump, post, sfx, voice, bass, drv, blp, bout, arp, arpF, revIn, revOut, dlyIn, dlp, dL, dR, fbL, fbR, mer, dlyOut, toDly, arpRev]
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

  /* at the start of a take: the long sounds already under way at reel time r
     (those starting less than `grace` before r are scheduled whole instead) */
  function join(T, r, grace) {
    for (const e of score) {
      if (!e.j) continue;
      for (let base = 0; base >= -D; base -= D) {
        const x = base + e.t;
        if (x < r - grace && x + e.len > r + (e.k === 'seg' ? 0 : 0.02)) fire(T, e, T.a0 - (r - x), r - x);
      }
    }
  }

  function fire(T, e, when, j) {
    switch (e.k) {
      case 'pulse': return pulse(T, when, e.v, e.f);
      case 'kick': return kick(T, when, e.v);
      case 'hat': return hat(T, when, e.v, e.n, e.pan);
      case 'arp': return arp(T, when, e.v, e.f, e.pan);
      case 'roll': return roll(T, when, e.v);
      case 'pad': return pad(T, when, j, e.v, e.notes, e.len, e.att, e.sweep);
      case 'bell': return bell(T, when, j, e.v, e.f, e.len);
      case 'crash': return crash(T, when, j, e.v);
      case 'warp': return warp(T, when, j, e.v, e.len, e.big);
      case 'seg': return env(T.arpF.frequency, when, [[0, Math.min(e.v0, NYQ), 0], [e.len, Math.min(e.v1, NYQ), e.c]], j);
      case 'impact': return impact(T, when, j, e.v);
      case 'whoosh': return whoosh(T, when, j, e.v, e.len);
      case 'riser': return riser(T, when, j, e.v, e.len);
      case 'glitch': return glitch(T, when, e.v, e.n);
      case 'tick': return tick(T, when, e.v);
      case 'sub': return sub(T, when, j, e.v);
      case 'voice': return voice(T, when, e.name);
    }
  }

  // ── the rhythm ──
  function pulse(T, when, v, f) {
    // a sine that drops into the root, through the take's soft drive
    const o = O('sine', f), g = G(0);
    env(o.frequency, when, [[0, f * 1.6, 0], [0.045, f, 2]], 0);
    env(g.gain, when, [[0, 0, 0], [0.006, 0.34 * v, 1], [0.14, 0.24 * v, 1], [0.52, 1e-4, 2]], 0);
    wire(o, g, T.bass);
    go(T, [o], [g], when, when + 0.53, when);
  }
  function kick(T, when, v) {
    const o = O('sine', 130), g = G(0), s = N(), hp = F('highpass', 2600, 0.7), cg = G(0);
    env(o.frequency, when, [[0, 140, 0], [0.05, 58, 2], [0.36, 42, 2]], 0);
    env(g.gain, when, [[0, 0, 0], [0.002, 0.48 * v, 1], [0.09, 0.33 * v, 1], [0.42, 1e-4, 2]], 0);
    env(cg.gain, when, [[0, 0, 0], [0.0008, 0.1 * v, 1], [0.01, 1e-4, 2]], 0);
    wire(o, g, T.music); wire(s, hp, cg, T.music);
    go(T, [o, s], [g, hp, cg], when, when + 0.44, when);
    // the pad leans back from the kick
    env(T.pump.gain, when, [[0, 1, 0], [0.015, 0.66, 1], [0.2, 0.9, 1], [0.45, 1, 1]], 0);
  }
  function hat(T, when, v, n, pan) {
    const s = N(), hp = F('highpass', 7800, 0.7), pk = F('peaking', 11500, 1.1), g = G(0), p = P(pan), send = G(0.22);
    pk.gain.value = 3;
    const d = 0.12 + 0.08 * hash(n + 3), a = 0.24 * v;
    env(g.gain, when, [[0, 0, 0], [0.003, a, 1], [d, 1e-4, 2]], 0);
    wire(s, hp, pk, g); if (p) wire(g, p, T.music); else g.connect(T.music);
    wire(g, send, T.revIn);
    go(T, [s], [hp, pk, g, p, send], when, when + d + 0.01, n);
  }
  function roll(T, when, v) {
    // a soft snare: bandpassed noise and a little body
    const s = N(), bp = F('bandpass', 1900, 0.8), g = G(0), o = O('triangle', 190), og = G(0), send = G(0.3);
    env(g.gain, when, [[0, 0, 0], [0.001, 0.4 * v, 1], [0.12, 1e-4, 2]], 0);
    env(og.gain, when, [[0, 0, 0], [0.002, 0.14 * v, 1], [0.07, 1e-4, 2]], 0);
    wire(s, bp, g, T.music); wire(g, send, T.revIn); wire(o, og, T.music);
    go(T, [s, o], [bp, g, og, send], when, when + 0.13, when);
  }

  // ── the harmony ──
  function arp(T, when, v, f, pan) {
    // a bright saw and a glassy triangle an octave up, a short pluck, into the arpeggio bus
    const a = O('sawtooth', f, -4), b = O('triangle', f * 2, 5), bg = G(0.55), g = G(0), p = P(pan);
    const peak = 0.34 * v;
    env(g.gain, when, [[0, 0, 0], [0.002, peak, 1], [0.06, peak * 0.6, 2], [0.26, 1e-4, 2]], 0);
    a.connect(g); wire(b, bg, g);
    if (p) wire(g, p, T.arp); else g.connect(T.arp);
    go(T, [a, b], [bg, g, p], when, when + 0.27, when);
  }
  function pad(T, when, j, v, notes, len, att, sweep) {
    // two saws a note, ±11 cents, one hard left and one hard right, each side through the sweeping lowpass
    const lpL = F('lowpass', 500, 0.8), lpR = F('lowpass', 500, 0.8), pL = P(-0.85), pR = P(0.85), g = G(0), send = G(0.55), srcs = [];
    for (const m of notes) {
      const f = mtof(m);
      const a = O('sawtooth', f, -11), b = O('sawtooth', f, 11);
      a.connect(lpL); b.connect(lpR); srcs.push(a, b);
    }
    const sub = O('sine', mtof(notes[0] - 12)), sg = G(0.45); wire(sub, sg, g); srcs.push(sub);
    env(lpL.frequency, when, sweep, j); env(lpR.frequency, when, sweep, j);
    const a = 0.05 * v, rel = Math.min(0.5, len * 0.3);
    env(g.gain, when, [[0, 0, 0], [att, a, 1], [Math.max(att, len - rel), a, 1], [len, 0, 1]], j);
    if (pL) { wire(lpL, pL, g); wire(lpR, pR, g); } else { lpL.connect(g); lpR.connect(g); }
    g.connect(T.pump); wire(g, send, T.revIn);
    go(T, srcs, [lpL, lpR, pL, pR, g, send, sg], when + j, when + len + 0.01, when);
  }
  function bell(T, when, j, v, f, len) {
    // FM glass: a sine carrier, a modulator at 3× whose depth dies away, a little octave shimmer
    const c = O('sine', f), m = O('sine', f * 3), mg = G(0), g = G(0), sh = O('sine', f * 2, 6), shg = G(0), send = G(0.6), echo = G(0.5);
    env(mg.gain, when, [[0, f * 1.5, 0], [0.9, f * 0.25, 2], [len, f * 0.08, 2]], j);
    env(g.gain, when, [[0, 0, 0], [0.01, 0.11 * v, 1], [0.6, 0.07 * v, 2], [len, 1e-4, 2]], j);
    env(shg.gain, when, [[0, 0, 0], [0.01, 0.025 * v, 1], [len * 0.6, 1e-4, 2]], j);
    wire(m, mg, c.frequency); c.connect(g); wire(sh, shg, g);
    g.connect(T.music); wire(g, send, T.revIn); wire(g, echo, T.dlyIn);
    go(T, [c, m, sh], [mg, g, shg, send, echo], when + j, when + len + 0.01, when);
  }

  // ── the seams ──
  function crash(T, when, j, v) {
    // a falling boom, a thump, and a long bright wash into the hall
    const o = O('sine', 72), og = G(0);
    env(o.frequency, when, [[0, 76, 0], [0.5, 36, 2], [1.8, 30, 2]], j);
    env(og.gain, when, [[0, 0, 0], [0.004, 0.45 * v, 1], [0.3, 0.25 * v, 2], [1.8, 1e-4, 2]], j);
    const s = N(), hp = F('highpass', 3300, 0.5), pk = F('peaking', 9000, 0.8), g = G(0), send = G(0.6);
    pk.gain.value = 4;
    env(g.gain, when, [[0, 0, 0], [0.003, 0.11 * v, 1], [0.25, 0.05 * v, 2], [2.6, 1e-4, 2]], j);
    const s2 = N(), lp = F('lowpass', 520, 0.7), g2 = G(0);
    env(g2.gain, when, [[0, 0, 0], [0.002, 0.3 * v, 1], [0.28, 1e-4, 2]], j);
    wire(o, og, T.post); wire(s, hp, pk, g, T.post); wire(g, send, T.revIn); wire(s2, lp, g2, T.post);
    go(T, [o, s, s2], [og, hp, pk, g, send, lp, g2], when + j, when + 2.61, when);
  }
  function warp(T, when, j, v, len, big) {
    // noise swept up a bandpass, two saws gliding up four octaves, both swelling into the seam and cut on it
    const s = N(), bp = F('bandpass', 220, 1.3), g = G(0);
    env(bp.frequency, when, [[0, 220, 0], [len, 9000, 2]], j);
    env(g.gain, when, [[0, 1e-4, 0], [len * 0.7, 0.07 * v, 2], [len - 0.012, 0.3 * v, 2], [len, 0, 1]], j);
    const a = O('sawtooth', 55, -14), b = O('sawtooth', 55, 14), lp = F('lowpass', 400, 2.5), og = G(0);
    const f1 = big ? 1320 : 880;
    env(a.frequency, when, [[0, 55, 0], [len, f1, 2]], j);
    env(b.frequency, when, [[0, 55, 0], [len, f1, 2]], j);
    env(lp.frequency, when, [[0, 400, 0], [len, 6500, 2]], j);
    env(og.gain, when, [[0, 0, 0], [len * 0.5, 0.012 * v, 1], [len - 0.012, 0.08 * v, 2], [len, 0, 1]], j);
    wire(s, bp, g, T.post); a.connect(lp); b.connect(lp); wire(lp, og, T.post);
    go(T, [s, a, b], [bp, g, lp, og], when + j, when + len + 0.005, when);
  }

  // ── the chapters' hits ──
  function impact(T, when, j, v) {
    const o = O('sine', 95), g = G(0), s = N(), lp = F('lowpass', 1800, 0.6), ng = G(0), send = G(0.4);
    env(o.frequency, when, [[0, 110, 0], [0.35, 38, 2]], j);
    env(g.gain, when, [[0, 0, 0], [0.003, 0.55 * v, 1], [0.12, 0.35 * v, 1], [1, 1e-4, 2]], j);
    env(ng.gain, when, [[0, 0, 0], [0.002, 0.24 * v, 1], [0.3, 1e-4, 2]], j);
    wire(o, g, T.sfx); wire(s, lp, ng, T.sfx); wire(ng, send, T.revIn);
    go(T, [o, s], [g, lp, ng, send], when + j, when + 1.02, when);
  }
  function whoosh(T, when, j, v, len) {
    const s = N(), bp = F('bandpass', 300, 2.2), g = G(0), p = P(0);
    env(bp.frequency, when, [[0, 300, 0], [len / 2, 2800, 2], [len, 600, 2]], j);
    env(g.gain, when, [[0, 1e-4, 0], [len / 2, 0.36 * v, 2], [len, 1e-4, 2]], j);
    if (p) { env(p.pan, when, [[0, -0.7, 0], [len, 0.7, 1]], j); wire(s, bp, g, p, T.sfx); } else wire(s, bp, g, T.sfx);
    go(T, [s], [bp, g, p], when + j, when + len + 0.01, when);
  }
  function riser(T, when, j, v, len) {
    const s = N(), bp = F('bandpass', 300, 1.5), g = G(0), o = O('sine', 180), og = G(0);
    env(bp.frequency, when, [[0, 300, 0], [len, 6000, 2]], j);
    env(g.gain, when, [[0, 1e-4, 0], [len * 0.6, 0.04 * v, 2], [len - 0.005, 0.2 * v, 2], [len, 0, 1]], j);
    env(o.frequency, when, [[0, 180, 0], [len, 1400, 2]], j);
    env(og.gain, when, [[0, 0, 0], [len - 0.005, 0.04 * v, 1], [len, 0, 1]], j);
    wire(s, bp, g, T.sfx); wire(o, og, T.sfx);
    go(T, [s, o], [bp, g, og], when + j, when + len + 0.005, when);
  }
  function glitch(T, when, v, n) {
    // five 32nd-note bursts of a square at a new pitch each time, over gated noise
    const o = O('square', 400), og = G(0), s = N(), hp = F('highpass', 2500, 0.7), ng = G(0);
    const gate = [[0, 0, 0]], hiss = [[0, 0, 0]];
    [0, 1, 2, 4, 5].forEach((k, i) => {
      const at = k * STEP / 2, d = 0.02 + 0.018 * hash(n + i), a = (0.06 + 0.04 * hash(n + i + 9)) * v;
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
    env(g.gain, when, [[0, 0, 0], [0.001, 0.14 * v, 1], [0.04, 1e-4, 2]], 0);
    wire(o, g, T.sfx);
    go(T, [o], [g], when, when + 0.05, when);
  }
  function sub(T, when, j, v) {
    // an 808: a pitched-down sine through the soft drive, so small speakers hear its overtones
    const o = O('sine', 110), g = G(0), sh = ac.createWaveShaper(), og = G(0.42 * v);
    sh.curve = kit.drive; sh.oversample = '2x';
    env(o.frequency, when, [[0, 120, 0], [0.08, 56, 2], [1.3, 40, 2]], j);
    env(g.gain, when, [[0, 0, 0], [0.004, 1.3, 1], [0.3, 0.9, 1], [1.45, 1e-4, 2]], j);
    wire(o, g, sh, og, T.sfx);
    go(T, [o], [g, sh, og], when + j, when + 1.5, when);
  }

  // ── voice lines (none in this reel; kept so a chapter could add them) ──
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
    const p = T.speaking;
    if (p && when < p.end - 0.04 && when > p.when + 0.012) {
      p.g.gain.cancelScheduledValues(when); p.g.gain.setValueAtTime(VLEVEL, when); p.g.gain.linearRampToValueAtTime(0, when + 0.04);
      try { p.src.stop(when + 0.045); } catch (_) {}
    }
    T.speaking = { src, g, when, end: when + SNIP };
    const d = T.duck.gain;
    d.cancelScheduledValues(when); d.setTargetAtTime(DUCK, when, 0.02); d.setTargetAtTime(1, when + SNIP, 0.07);
    const rec = [[src], [g]];
    T.live.add(rec);
    src.onended = () => { if (T.live.delete(rec)) free(rec); };
    T.said.push(when);
    if (T.said.length > 8) T.said.shift();
    bank.fired++;
  }

  return { take, end, schedule, join, warm };
}

export function createSound({ duration, chapters }) {
  const D = duration;
  const names = [...new Set(chapters.flatMap(c => (c.scene.cues || []).map(q => q.voice)))];
  const bank = { buffers: {}, onsets: {}, fired: 0 };

  let on = false, playing = false;
  let ac = null, eng = null, M = null, T = null, timer = 0;
  let pos = null, lastT = null, guardAt = null, lastResume = 0, voicesLoading = null;
  let tsC = 0, tsP = 0;   // the last output timestamp (context time, performance time), refreshed by the scheduler

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
  // the halls a seek will need, built one per pass while sound is on, off the seek's own path
  let warming = 0;
  function warmUp() {
    if (warming) return;
    warming = setTimeout(function next() { warming = 0; if (on && eng.warm()) warming = setTimeout(next, 120); }, 120);
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
    if (voicesLoading || !ac || !names.length) return;
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

  /* the context time now leaving the speakers: the last output timestamp
     carried forward to this instant (read by the scheduler, so a frame
     allocates nothing), or the render clock less the reported latency */
  function stamp() {
    tsC = 0;
    if (!ac.getOutputTimestamp) return;
    const ts = ac.getOutputTimestamp();
    if (ts && ts.contextTime > 0 && ts.performanceTime > 0) { tsC = ts.contextTime; tsP = ts.performanceTime; }
  }
  function heard() {
    const ct = ac.currentTime;
    if (tsC > 0) {
      const x = tsC + (performance.now() - tsP) / 1000;
      if (x > ct - 0.5 && x < ct + 0.05) return x < ct ? x : ct;
    }
    const lat = ac.outputLatency || ac.baseLatency || 0;
    return ct - (lat < 0.3 ? lat : 0.3);
  }
  const reelNow = () => T.r0 + (heard() - T.a0);

  function run() {
    if (!T || ac.state !== 'running') return;
    stamp();
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
    T = eng.take(r, 0);
    const now = ac.currentTime;
    T.a0 = now + LEAD;
    T.to = r - GRACE;
    const g = M.guard.gain; g.cancelScheduledValues(now); g.setValueAtTime(1, now); guardAt = null;
    eng.join(T, r, GRACE);
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
        warmUp();
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
      if (sec == null && guardAt === null) return;   // the usual frame: nothing to lift, nothing touched
      const g = M.guard.gain, now = ac.currentTime;
      if (sec == null) { guardAt = null; g.cancelScheduledValues(now); g.setValueAtTime(1, now); return; }
      const at = Math.max(now, T.a0 + ((lastT ?? reelNow()) + Math.max(0, sec) - T.r0));
      if (guardAt !== null && Math.abs(guardAt - at) < 0.03) return;
      if (guardAt !== null && guardAt > now) { g.cancelScheduledValues(now); g.setValueAtTime(1, now); }
      guardAt = at;
      if (at - 0.005 > now) { g.setValueAtTime(1, at - 0.005); g.linearRampToValueAtTime(0, at); }
      else g.setValueAtTime(0, at);
    },
    /** called every frame the player advances while it plays: allocates
        nothing (the scheduler's own timer queues the score) */
    tick(t) {
      lastT = t;
      if (!on || !ac) return;
      // the player only ticks while it plays and is not waiting on a chapter; a
      // seek that ended a wait did not say play again, so the tick does
      if (!playing) { playing = true; begin(t); return; }
      if (ac.state !== 'running') { resume(); return; }
      if (!T) { begin(t); return; }
      // the picture ran on without the score (a stall, an interruption): pull the score to it
      const h = heard(), lag = t - (T.r0 + (h - T.a0));
      if (lag > 0.35 + LEAD + (ac.currentTime - h) || lag < -0.35) begin(t);
    }
  };
}

/** Render `len` seconds of the score from reel time `from` offline — the same
    score, instruments and master chain, scheduled in one pass. `only` keeps
    just those kinds of event ('kick', 'arp', 'seg', 'crash', …); `voices`
    ({ name: AudioBuffer }) lets a cast speak too. Resolves to the
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
  eng.join(T, from, 0);
  eng.schedule(T, from, from + len, null);
  return ac.startRendering();
}
