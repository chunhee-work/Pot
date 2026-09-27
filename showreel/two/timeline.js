/* The second reel's cut: eight colour blocks, four bars each, one take.
   A chapter begins on a full frame of its own colour and ends on a full
   frame of the next chapter's colour — the camera flies into a letter until
   that colour is all there is — so the seams are cuts on the downbeat that
   never show as cuts. */
import { CH } from './palette.js';
import person from './scenes/1-person.js';
import brands from './scenes/2-brands.js';
import animation from './scenes/3-animation.js';
import voices from './scenes/4-voices.js';
import films from './scenes/5-films.js';
import code from './scenes/6-code.js';
import toolbox from './scenes/7-toolbox.js';
import operator from './scenes/8-operator.js';

const ORDER = [person, brands, animation, voices, films, code, toolbox, operator];
export const DURATION = ORDER.length * CH;   // 60 s
export const CHAPTERS = ORDER.map((scene, i) => ({ scene, start: i * CH, end: (i + 1) * CH }));
/** the colour of the seam at time `at` — the colour of the chapter that starts there */
export function seamColour(at) {
  const i = Math.round(at / CH) % ORDER.length;
  return ORDER[i].bg;
}
/** the colour a chapter must end on */
export function nextColour(scene) {
  return ORDER[(ORDER.indexOf(scene) + 1) % ORDER.length].bg;
}
