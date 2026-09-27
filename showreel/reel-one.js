/* /reel — the first reel: one unbroken gold thread. */
import { startReel } from './main.js';
import { CHAPTERS, DURATION } from './timeline.js';
import { createSound } from './sound.js';
import { rest, PAL } from './kit.js';

startReel({
  chapters: CHAPTERS,
  duration: DURATION,
  createSound,
  rest: (ctx, S) => rest(ctx, S),     // every seam: black, the thread flat across the middle
  fill: () => PAL.bg,
  loadingText: 'Threading the needle'
});
