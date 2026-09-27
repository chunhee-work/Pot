/* The second reel's colour blocks and its tempo. */

// colour blocking: every chapter is one full-bleed block
export const BLOCK = {
  klein: '#1f2bff',   // electric blue
  signal: '#ff4d1a',  // signal orange
  ink: '#0b0b0e',
  paper: '#f4f3ee',
  pink: '#ff7ac6',
  teal: '#4ecdc4',    // the Gacha product's own accent
  butter: '#ffd23f'
};

/* 128 bpm: a beat is 0.46875 s, a bar 1.875 s, and each chapter is four bars
   (7.5 s) — so inside a chapter the beats fall at lt = k · BEAT, the bars at
   k · BAR, and the reel's 60 s is exactly 32 bars. */
export const BPM = 128, BEAT = 60 / BPM, BAR = 4 * BEAT, CH = 4 * BAR;
