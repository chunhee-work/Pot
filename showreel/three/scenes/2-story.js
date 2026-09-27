/* placeholder — replaced by the chapter's own build */
import { seg, outExpo, text } from '../../kit.js';
import { seam, UI } from '../kit3.js';

export default {
  id: 'story',
  title: 'Story',
  caption: 'Story.',
  assets: [],
  models: [],
  still: 3,
  draw(ctx, S) {
    seam(ctx, S);
    const a = Math.min(seg(S.lt, 0.3, 0.9, outExpo), 1 - seg(S.lt, S.d - 1, S.d - 0.4));
    text(ctx, S, 'Story'.toUpperCase(), S.W / 2, S.H / 2 - 4 * S.u, { size: 5 * S.u, weight: 800, align: 'center', color: UI.ink, alpha: a });
  }
};
