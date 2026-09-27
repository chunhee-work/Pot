/* The third reel's tempo: 96 bpm, a bar every 2.5 s, and each chapter three
   bars (7.5 s) — eight chapters, exactly 60 s. Beats inside a chapter fall
   at lt = k · BEAT. */
export const BPM = 96, BEAT = 60 / BPM, BAR = 4 * BEAT, CH = 3 * BAR;
export { UI, MONO } from './kit3.js';
