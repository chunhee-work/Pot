/* /reel3 — the third reel: how it's made, as a flight through space. */
import { startReel } from './main.js';
import { CHAPTERS, DURATION } from './three/timeline.js';
import { createSound } from './three/sound.js';
import { seam, UI } from './three/kit3.js';

startReel({
  chapters: CHAPTERS,
  duration: DURATION,
  createSound,
  rest: (ctx, S) => seam(ctx, S),     // every seam: deep space, the thread at rest across the middle
  fill: () => UI.space,
  fx: { vignette: 0.8, grain: 0.7 },
  loadingText: 'Plotting the course'
});
