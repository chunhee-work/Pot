/* placeholder — replaced by the chapter's own build */
import { rest, text, PAL, seg, outExpo } from '../kit.js';

export default {
  id: 'product',
  title: 'The Product',
  caption: 'The Product.',
  assets: [],
  models: [],
  still: 2,
  draw(ctx, S) {
    rest(ctx, S);
    const a = Math.min(seg(S.lt, 0.2, 0.8, outExpo), 1 - seg(S.lt, S.d - 0.8, S.d - 0.2));
    text(ctx, S, 'The Product'.toUpperCase(), S.W / 2, S.H / 2 - 4 * S.u, { size: 5 * S.u, weight: 800, align: 'center', color: PAL.ink, alpha: a });
  }
};
