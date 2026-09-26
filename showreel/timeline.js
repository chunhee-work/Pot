/* The cut. Every boundary sits on a bar line of the score (96 bpm, the
   phrase turning every five seconds from the intro's first downbeat at 6s),
   and at every boundary the frame is the same: the thread at rest, flat
   across the middle of black. That shared frame is what lets seven chapters
   made separately play as one unbroken shot. */
import needle from './scenes/1-needle.js';
import medium from './scenes/2-medium.js';
import landofhope from './scenes/3-landofhope.js';
import cast from './scenes/4-cast.js';
import cuts from './scenes/5-cuts.js';
import product from './scenes/6-product.js';
import operator from './scenes/7-operator.js';

export const DURATION = 61;

export const CHAPTERS = [
  { scene: needle,     start: 0,    end: 6 },
  { scene: medium,     start: 6,    end: 11 },
  { scene: landofhope, start: 11,   end: 23.5 },
  { scene: cast,       start: 23.5, end: 36 },
  { scene: cuts,       start: 36,   end: 46 },
  { scene: product,    start: 46,   end: 56 },
  { scene: operator,   start: 56,   end: 61 }
];
