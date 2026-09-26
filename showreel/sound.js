/* Sound — off until someone asks for it, and nothing is fetched before then.

   The score is the /process page's own track, streamed through an audio
   element (decoding five minutes of it up front would cost ~100MB). Once it
   is playing it is the clock: the picture follows the music, so a stalled
   network holds the picture rather than letting the two drift apart. The
   reel's 0s is the song's 0s — the intro under the needle, the first
   downbeat on the cut to "to camera & code." at 6s.

   The cast's voices are short one-shots decoded into buffers, fired as each
   character arrives (the Cast chapter lists them as `cues`) while the score
   ducks under them. They fire only in forward playback, never on a seek. */

const SCORE = 'assets/process/bgm-0ac7bdea7b.mp3';
const VOICE = n => `assets/voice-${n}.mp3`;
const SNIP = 1.7;          // seconds of each voice line
const DUCK = 0.42;         // score level under a voice
const LOOP_FADE = 0.55;    // the score fades out over the reel's last half-second

export function createSound({ duration, chapters }) {
  const cues = chapters
    .flatMap(c => (c.scene.cues || []).map(q => ({ t: c.start + q.at, voice: q.voice })))
    .sort((a, b) => a.t - b.t);
  const names = [...new Set(cues.map(q => q.voice))];

  let on = false, playing = false;
  let el = null, ac = null, master = null, scoreGain = null;
  let lastT = null, duckUntil = 0;
  const buffers = {};
  let voicesLoading = null;

  function ensure() {
    if (el) return;
    el = new Audio();
    el.preload = 'auto';
    el.src = SCORE;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ac = new AC();
      master = ac.createGain(); master.connect(ac.destination);
      scoreGain = ac.createGain(); scoreGain.gain.value = 0; scoreGain.connect(master);
      ac.createMediaElementSource(el).connect(scoreGain);
    } catch (e) { console.warn('[reel] web audio unavailable', e); ac = null; }
  }

  function loadVoices() {
    if (voicesLoading || !ac) return;
    voicesLoading = Promise.all(names.map(async n => {
      try {
        const r = await fetch(VOICE(n));
        if (!r.ok) throw new Error(r.status);
        const data = await r.arrayBuffer();
        buffers[n] = await new Promise((res, rej) => ac.decodeAudioData(data, res, rej));
      } catch (e) { console.warn('[reel] voice', n, e); }
    }));
  }

  function level(t) {
    // out at the loop point; the song's own intro brings it back in
    const loop = Math.min(1, Math.max(0, (duration - t) / LOOP_FADE));
    const duck = ac && ac.currentTime < duckUntil ? DUCK : 1;
    return loop * duck;
  }
  function setLevel(t, fast) {
    if (!scoreGain) { if (el) el.volume = Math.min(1, level(t)); return; }
    scoreGain.gain.setTargetAtTime(level(t), ac.currentTime, fast ? 0.015 : 0.06);
  }

  function start(t) {
    ensure();
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    if (Math.abs(el.currentTime - t) > 0.04) el.currentTime = t;
    if (scoreGain) { scoreGain.gain.cancelScheduledValues(ac.currentTime); scoreGain.gain.setValueAtTime(0, ac.currentTime); }
    setLevel(t);
    const p = el.play();
    if (p && p.catch) p.catch(e => console.warn('[reel] score', e.message));
    lastT = t;
  }

  function fire(voice) {
    const buf = buffers[voice];
    if (!buf || !ac) return;
    const now = ac.currentTime;
    const src = ac.createBufferSource(); src.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.95, now + 0.02);
    g.gain.setValueAtTime(0.95, now + SNIP - 0.25);
    g.gain.linearRampToValueAtTime(0, now + SNIP);
    src.connect(g); g.connect(master);
    src.start(now, 0, SNIP);
    duckUntil = now + SNIP;
  }

  return {
    get on() { return on; },
    /** the score's position while it is audibly playing, else null */
    clock() {
      if (!on || !playing || !el || el.paused || el.seeking || el.readyState < 3) return null;
      return el.currentTime;
    },
    /** where the score actually is (for the tests) */
    get position() { return el ? el.currentTime : null; },
    get voicesReady() { return Object.keys(buffers).length; },
    setOn(v, t, isPlaying) {
      on = !!v;
      if (on) { ensure(); loadVoices(); if (isPlaying) { playing = true; start(t); } }
      else if (el) el.pause();
    },
    play(t) { playing = true; if (on) start(t); },
    pause() { playing = false; if (el) el.pause(); lastT = null; },
    seek(t) {
      lastT = null;
      if (!el || !on) return;
      el.currentTime = t;
      if (scoreGain) { scoreGain.gain.cancelScheduledValues(ac.currentTime); scoreGain.gain.setValueAtTime(0, ac.currentTime); }
      setLevel(t);
    },
    tick(t) {
      if (!on || !playing || !el) { lastT = t; return; }
      // voices: only for cues crossed by ordinary forward playback
      if (lastT !== null && t > lastT && t - lastT < 0.25) {
        for (const q of cues) if (q.t > lastT && q.t <= t) fire(q.voice);
      }
      // keep the score with the picture if something (a stall, a seek it missed) pulls them apart
      if (!el.seeking && el.readyState >= 3 && !el.paused && Math.abs(el.currentTime - t) > 0.15) el.currentTime = t;
      setLevel(t);
      lastT = t;
    }
  };
}
