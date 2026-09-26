/* Frame grabber: renders the reel at given instants, exactly as a viewer sees
   it (lens and all), and writes PNGs.

   node tests/shoot.mjs <outDir> <t1,t2,…> [--size 1280x720] [--debug] [--chrome]
   Times are global seconds; prefix with a chapter id to make them local,
   e.g. landofhope:3.5  */
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser } from './lib.mjs';

const args = process.argv.slice(2);
const out = args[0], times = (args[1] || '0').split(',');
const sizeArg = (args[args.indexOf('--size') + 1] || '1280x720');
const [vw, vh] = (args.includes('--size') ? sizeArg : '1280x720').split('x').map(Number);
const debug = args.includes('--debug'), chrome = args.includes('--chrome');
fs.mkdirSync(out, { recursive: true });

const { server, url } = await serve();
const b = await browser();
const page = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: vw < 600 ? 2 : 1 });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`${url}/reel.html?paused${debug ? '&debug' : ''}`);
await page.evaluate(() => window.__reel.ready);
if (!chrome) await page.addStyleTag({ content: '.chrome,#pulse{display:none!important}' });
for (const spec of times) {
  let at = spec;
  if (spec.includes(':')) {
    const [id, lt] = spec.split(':');
    at = await page.evaluate(([id, lt]) => window.__reel.chapters.find(c => c.id === id).start + lt, [id, parseFloat(lt)]);
  } else at = parseFloat(spec);
  await page.evaluate(t => window.__reel.show(t), at);
  const file = path.join(out, `t${String(at.toFixed(2)).padStart(6, '0')}-${vw}x${vh}.png`);
  await page.screenshot({ path: file });
  console.log(file);
}
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.join('\n'));
await b.close(); server.close();
