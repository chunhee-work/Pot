/* /reel2 — the second reel: one take through a city of type, in colour blocks. */
import { startReel } from './main.js';
import { CHAPTERS, DURATION, seamColour } from './two/timeline.js';
import { createSound } from './two/sound.js';

startReel({
  chapters: CHAPTERS,
  duration: DURATION,
  createSound,
  // every seam is a full frame of the colour of the chapter that starts there
  rest: (ctx, S, at) => { ctx.fillStyle = seamColour(at); ctx.fillRect(0, 0, S.W, S.H); },
  fill: c => c.scene.bg,
  // bright colour blocks want a lighter lens than black and gold does
  fx: { vignette: 0.3, grain: 0.6 },
  loadingText: 'Setting the type'
});
