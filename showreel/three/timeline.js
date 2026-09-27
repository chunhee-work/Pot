/* The third reel: the making of Land of Hope as a flight through space. The
   nav pill opens into a cockpit, and the chrome thread that joins the stages
   on /process becomes the flight path from station to station — story, shot
   list, storyboard, characters, environments, the edit — to the film itself,
   and back into the pill. Every seam is the same frame: deep space, a fixed
   starfield, the thread at rest across the middle. */
import { CH } from './palette.js';
import launch from './scenes/1-launch.js';
import story from './scenes/2-story.js';
import shots from './scenes/3-shots.js';
import boards from './scenes/4-boards.js';
import characters from './scenes/5-characters.js';
import worlds from './scenes/6-worlds.js';
import edit from './scenes/7-edit.js';
import arrival from './scenes/8-arrival.js';

const ORDER = [launch, story, shots, boards, characters, worlds, edit, arrival];
export const DURATION = ORDER.length * CH;   // 60 s
export const CHAPTERS = ORDER.map((scene, i) => ({ scene, start: i * CH, end: (i + 1) * CH }));
