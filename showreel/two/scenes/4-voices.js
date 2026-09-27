/* placeholder — replaced by the chapter's own build */
import { text, seg, outExpo } from '../../kit.js';
import { BLOCK } from '../palette.js';
import { nextColour } from '../timeline.js';

const scene = {
  id: 'voices',
  title: 'Voices',
  caption: 'Voices.',
  bg: BLOCK.pink,
  assets: [],
  models: [],
  still: 3,
  draw(ctx, S) {
    const a = Math.min(seg(S.lt, 0.2, 0.8, outExpo), 1 - seg(S.lt, S.d - 1.2, S.d - 0.6));
    text(ctx, S, 'Voices'.toUpperCase(), S.W / 2, S.H / 2 + 5 * S.u, { size: 14 * S.u, weight: 900, tracking: -0.03, align: 'center', color: BLOCK.ink, alpha: a });
    // the last half second: the next colour takes the frame
    const k = seg(S.lt, S.d - 0.5, S.d - 0.08);
    if (k > 0) { ctx.fillStyle = nextColour(scene); ctx.globalAlpha = k; ctx.fillRect(0, 0, S.W, S.H); ctx.globalAlpha = 1; }
  }
};
export default scene;
