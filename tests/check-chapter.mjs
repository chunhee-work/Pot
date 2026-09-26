/* One chapter's gate: no errors, both ends match the rest frame, the lens is
   quiet at the ends, the middle is not blank, and drawing stays cheap —
   in landscape and on a phone.

   node tests/check-chapter.mjs <chapter id>      (exit code 1 on failure) */
import { serve, browser } from './lib.mjs';

const id = process.argv[2];
if (!id) { console.error('usage: node tests/check-chapter.mjs <chapter id>'); process.exit(2); }
const SIZES = [[1280, 720, 1], [390, 844, 2]];

const { server, url } = await serve();
const b = await browser();
let ok = true;
const report = { id };
for (const [w, h, dpr] of SIZES) {
  const page = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${url}/reel.html?paused`);
  await page.evaluate(() => window.__reel.ready);
  const r = await page.evaluate(id => {
    const R = window.__reel, c = R.chapters.find(c => c.id === id);
    if (!c) return { missing: true };
    const rest = R.sampleRest();
    const diff = a => a.reduce((s, v, i) => s + Math.abs(v - rest[i]), 0) / a.length;
    const ends = { start: diff(R.sample(c.start + 0.001)), end: diff(R.sample(c.end - 0.001)) };
    const fxq = f => Math.max(f.ab, f.flash, f.warp, f.shake / 10, Math.abs(f.exposure - 1));
    const fx = { start: fxq(R.fxAt(c.start + 0.001)), end: fxq(R.fxAt(c.end - 0.001)) };
    const mids = [];
    for (let k = 1; k <= 7; k++) {
      const s = R.sample(c.start + (c.end - c.start) * k / 8);
      const m = s.reduce((a, v) => a + v, 0) / s.length;
      const v = s.reduce((a, x) => a + (x - m) * (x - m), 0) / s.length;
      mids.push({ at: +(((c.end - c.start) * k / 8).toFixed(2)), diffFromRest: +diff(s).toFixed(2), sd: +Math.sqrt(v).toFixed(1) });
    }
    const perf = R.perf(60, c.start, c.end);
    return { ends, fx, mids, perf };
  }, id);
  await page.close();
  if (r.missing) { console.error(`no chapter "${id}"`); process.exit(2); }
  const key = `${w}x${h}`;
  const fails = [];
  if (errors.length) fails.push('console errors: ' + errors.join(' | '));
  if (r.ends.start > 1.5) fails.push(`start frame differs from rest by ${r.ends.start.toFixed(2)} (max 1.5)`);
  if (r.ends.end > 1.5) fails.push(`end frame differs from rest by ${r.ends.end.toFixed(2)} (max 1.5)`);
  if (r.fx.start > 0.02 || r.fx.end > 0.02) fails.push(`lens effects not at rest at an end (start ${r.fx.start}, end ${r.fx.end})`);
  if (r.mids.filter(m => m.diffFromRest < 1).length > 2) fails.push('more than two of seven mid-chapter frames look like the bare rest frame');
  if (r.perf.mean > 12) fails.push(`draw cost ${r.perf.mean.toFixed(2)}ms mean in headless (max 12)`);
  report[key] = { ...r, perf: { mean: +r.perf.mean.toFixed(2), max: +r.perf.max.toFixed(2), worst: +r.perf.worst.toFixed(2) }, fails };
  if (fails.length) ok = false;
}
console.log(JSON.stringify(report, null, 1));
console.log(ok ? 'PASS' : 'FAIL');
await b.close(); server.close();
process.exit(ok ? 0 : 1);
