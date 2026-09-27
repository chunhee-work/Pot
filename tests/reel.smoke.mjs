/* The reel's full test: every chapter's gate, the seams between chapters and
   around the loop, the transport, reduced motion, the phone layout, and that
   the rest of the site was left alone.

   node tests/reel.smoke.mjs        (exit code 1 on any failure) */
import { serve, browser } from './lib.mjs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

// 1 · each chapter's own gate
const here = path.dirname(fileURLToPath(import.meta.url));
for (const id of process.env.SKIP_CHAPTERS ? [] : ['needle', 'medium', 'landofhope', 'cast', 'cuts', 'product', 'operator']) {
  let out = '', pass = true;
  try { out = execFileSync('node', [path.join(here, 'check-chapter.mjs'), id], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); pass = false; }
  const fails = [...out.matchAll(/"fails": \[([^\]]*)\]/g)].map(m => m[1].replace(/\s+/g, ' ').trim()).filter(Boolean);
  check(`chapter ${id}: gate`, pass, fails.join(' | '));
}

const { server, url } = await serve();
const b = await browser();

async function open(vw, vh, dpr = 1, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, reducedMotion: opts.reducedMotion || 'no-preference', hasTouch: !!opts.touch });
  const page = await ctx.newPage();
  const errors = [], failedReq = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('requestfailed', r => failedReq.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) failedReq.push(`${r.status()} ${r.url()}`); });
  await page.goto(`${url}${opts.path || '/reel'}`);
  if (!opts.noReady) await page.evaluate(() => window.__reel.allReady);
  return { page, ctx, errors, failedReq };
}

// 2 · desktop: loads clean, plays, the transport works
{
  const { page, ctx, errors, failedReq } = await open(1280, 720);
  check('served at /reel (rewrite) and loads with no console errors', errors.length === 0, errors.join(' | '));
  check('every request succeeds', failedReq.length === 0, failedReq.join(' | '));
  const lens = await page.evaluate(() => window.__reel.post);
  check('the WebGL lens is active', lens);

  const t0 = await page.evaluate(() => window.__reel.t);
  await page.waitForTimeout(1200);
  const s1 = await page.evaluate(() => ({ t: window.__reel.t, playing: window.__reel.playing, frames: window.__reel.frames }));
  check('autoplays (muted) on load', s1.playing && s1.t > t0 + 0.2 && s1.frames > 5, `t ${t0.toFixed(2)} → ${s1.t.toFixed(2)}, ${s1.frames} frames`);
  check('sound is off by default', !(await page.evaluate(() => window.__reel.soundOn)));

  await page.mouse.move(640, 360);
  await page.click('#playBtn');
  const p1 = await page.evaluate(() => window.__reel.t);
  await page.waitForTimeout(600);
  const p2 = await page.evaluate(() => ({ t: window.__reel.t, playing: window.__reel.playing }));
  check('pause button stops the clock', !p2.playing && Math.abs(p2.t - p1) < 0.02, `${p1.toFixed(3)} → ${p2.t.toFixed(3)}`);
  check('pause button label flips to Play', (await page.getAttribute('#playBtn', 'aria-label')) === 'Play');

  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  check('space toggles play', await page.evaluate(() => window.__reel.playing));
  await page.keyboard.press('Space');

  // scrub: click at 50 % of the track
  const box = await page.locator('#scrub .track').boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
  const ts = await page.evaluate(() => window.__reel.t);
  check('clicking the scrubber seeks', Math.abs(ts - 30.5) < 0.4, `t = ${ts.toFixed(2)} (want ≈ 30.5)`);
  // drag from 25 % to 75 %
  await page.mouse.move(box.x + box.width * 0.25, box.y + 1);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + 1, { steps: 6 });
  await page.mouse.up();
  const td = await page.evaluate(() => window.__reel.t);
  check('dragging the scrubber seeks', Math.abs(td - 45.75) < 0.4, `t = ${td.toFixed(2)} (want ≈ 45.75)`);

  await page.keyboard.press('3');
  const t3 = await page.evaluate(() => window.__reel.t);
  check('number keys jump to chapters', Math.abs(t3 - 11) < 0.01, `t = ${t3.toFixed(3)}`);
  await page.keyboard.press('ArrowRight');
  const tr = await page.evaluate(() => window.__reel.t);
  check('→ skips forward 5 s', Math.abs(tr - 16) < 0.01, `t = ${tr.toFixed(3)}`);
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  const tl = await page.evaluate(() => window.__reel.t);
  check('← skips back 5 s', Math.abs(tl - 6) < 0.01, `t = ${tl.toFixed(3)}`);

  await page.locator('#chapters button').nth(5).click();
  await page.waitForTimeout(150);
  const tc = await page.evaluate(() => window.__reel.t);
  check('chapter labels jump', Math.abs(tc - 46) < 0.01, `t = ${tc.toFixed(3)}`);
  const label = await page.textContent('#chapterLabel');
  check('chapter label follows the playhead', /06 \/ 07/.test(label), label);

  await page.keyboard.press('m');
  await page.waitForTimeout(400);
  const snd = await page.evaluate(() => window.__reel.soundOn);
  check('M turns sound on', snd);
  check('sound button reflects it', (await page.getAttribute('#soundBtn', 'aria-pressed')) === 'true');
  // the score follows the picture through play, seek and a scrub
  await page.evaluate(() => { window.__reel.seek(20); window.__reel.play(); });
  await page.waitForTimeout(1500);
  const a1 = await page.evaluate(() => ({ t: window.__reel.sync.t, a: window.__reel.sync.audio }));
  check('sound: the score plays in step with the picture', a1.a !== null && a1.a > 20.5 && Math.abs(a1.a - a1.t) < 0.1, `picture ${a1.t.toFixed(3)} · score ${a1.a && a1.a.toFixed(3)}`);
  await page.evaluate(() => window.__reel.seek(40));
  await page.waitForTimeout(1200);
  const a2 = await page.evaluate(() => ({ t: window.__reel.sync.t, a: window.__reel.sync.audio }));
  check('sound: after a seek the score is within 0.1 s of the picture', Math.abs(a2.a - a2.t) < 0.1, `picture ${a2.t.toFixed(3)} · score ${a2.a.toFixed(3)}`);
  // on a slow network the playhead holds for the score — it never runs backwards
  await page.route('**/bgm-*.mp3', async r => { await new Promise(res => setTimeout(res, 700)); r.continue(); });
  const mono = await page.evaluate(() => new Promise(res => {
    window.__reel.jump(4);
    const seen = [window.__reel.t], t0 = performance.now();
    (function f() { seen.push(window.__reel.t); if (performance.now() - t0 < 2500) requestAnimationFrame(f); else res(seen); })();
  }));
  const back = mono.reduce((w, v, i) => (i && mono[i - 1] - v > w ? mono[i - 1] - v : w), 0);
  check('sound: after a jump on a slow network the playhead never runs backwards', back < 0.001, `largest backward step ${back.toFixed(3)} s over ${mono.length} frames, ${mono[0].toFixed(2)} → ${mono[mono.length - 1].toFixed(2)}`);
  await page.unroute('**/bgm-*.mp3');
  const voices = await page.evaluate(() => window.__reel.audio.voices);
  const wantVoices = await page.evaluate(() => window.__reel.cueCount);
  check('sound: the cast voices are loaded once sound is on', wantVoices > 0 && voices >= Math.min(wantVoices, 12), `${voices} voice buffers for ${wantVoices} cues`);
  const f0 = await page.evaluate(() => window.__reel.audio.fired);
  await page.evaluate(() => { window.__reel.seek(24.2); window.__reel.play(); });
  await page.waitForTimeout(2600);
  const f1 = await page.evaluate(() => ({ fired: window.__reel.audio.fired, t: window.__reel.t }));
  check('sound: voice lines fire as the cast arrives', f1.fired - f0 >= 1, `${f1.fired - f0} fired, playhead 24.2 → ${f1.t.toFixed(2)}`);
  await page.keyboard.press('m');
  await page.evaluate(() => window.__reel.pause());

  // idle chrome
  await page.evaluate(() => window.__reel.play());
  await page.mouse.move(10, 10);
  await page.waitForTimeout(3000);
  check('controls hide after 2.5 s of stillness while playing', await page.evaluate(() => document.body.hasAttribute('data-idle')));
  await page.mouse.move(400, 300);
  await page.waitForTimeout(100);
  check('moving the pointer brings them back', !(await page.evaluate(() => document.body.hasAttribute('data-idle'))));

  // seams: every boundary, and the loop, look like the rest frame
  const seams = await page.evaluate(() => {
    const R = window.__reel;
    const diff = (a, rest) => a.reduce((s, v, i) => s + Math.abs(v - rest[i]), 0) / a.length;
    const at = [[0.0005, 0], ...R.chapters.slice(1).flatMap(c => [[c.start - 0.0005, c.start], [c.start + 0.0005, c.start]]), [R.duration - 0.0005, R.duration]];
    return at.map(([t, seam]) => ({ t: +t.toFixed(4), d: +diff(R.sample(t), R.sampleRest(seam)).toFixed(2) }));
  });
  const worst = seams.reduce((a, s) => (s.d > a.d ? s : a), { d: -1 });
  check('every chapter seam and the loop seam match the rest frame', worst.d <= 1.5, `worst ${worst.d} at t=${worst.t}`);

  // wrap: playing past the end comes back to the start
  await page.evaluate(() => { window.__reel.seek(60.6); window.__reel.play(); });
  await page.waitForTimeout(900);
  const tw = await page.evaluate(() => window.__reel.t);
  check('playback loops from the end back to the start', tw < 2, `t = ${tw.toFixed(2)}`);

  const perf = await page.evaluate(() => window.__reel.perf(240));
  check('draw cost across the reel (headless, CPU)', perf.mean < 12, `mean ${perf.mean.toFixed(2)} ms, worst ${perf.max.toFixed(1)} ms at t=${perf.worst.toFixed(2)}`);
  await ctx.close();
}

// 2b · progressive loading: on a slow network the reel starts before its pictures arrive
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route(/\.(jpg|webp|png|glb)$|three-/, async r => { await new Promise(res => setTimeout(res, 2500)); r.continue(); });
  const t0 = Date.now();
  // (JS-started image loads hold back the window load event, so don't wait for it)
  await page.goto(`${url}/reel`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__reel);
  await page.evaluate(() => window.__reel.ready);
  const firstFrameMs = Date.now() - t0;
  await page.waitForTimeout(400);
  const early = await page.evaluate(() => ({ t: window.__reel.t, playing: window.__reel.playing }));
  check('slow network: playback starts before the pictures arrive', firstFrameMs < 2000 && early.playing && early.t > 0.1, `first frame after ${firstFrameMs} ms, t = ${early.t.toFixed(2)}`);
  // jump to Land of Hope before its pictures are in: it holds on the rest frame, then plays once they land
  await page.evaluate(() => window.__reel.seek(12));
  await page.waitForTimeout(300);
  const held = await page.evaluate(() => { const R = window.__reel, rest = R.sampleRest(11), s = R.sample(R.t); return { t: R.t, label: document.getElementById('chapterLabel').textContent, d: s.reduce((a, v, i) => a + Math.abs(v - rest[i]), 0) / s.length }; });
  await page.evaluate(() => window.__reel.allReady);
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => window.__reel.t);
  check('slow network: an unloaded chapter holds on the rest frame, then plays', Math.abs(held.t - 12) < 0.05 && held.d < 1.5 && /Loading/.test(held.label) && after > 12.2, `held at ${held.t.toFixed(2)} (“${held.label}”, diff ${held.d.toFixed(2)}), then ${after.toFixed(2)}`);
  check('slow network: no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// 2c · a 3D model that fails to load does not stall the reel
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.route(/\.glb$/, r => r.abort());
  await page.goto(`${url}/reel?t=10`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__reel);
  await page.evaluate(() => window.__reel.allReady);
  // it must get past the 11 s seam into Land of Hope rather than wait there for good
  const passed = await page.waitForFunction(() => window.__reel.t > 11.6, null, { timeout: 8000 }).then(() => true, () => false);
  const t = await page.evaluate(() => window.__reel.t);
  check('a failed 3D model: Land of Hope plays on without it', passed, `t = ${t.toFixed(2)}`);
  await ctx.close();
}

// 2d · while a chapter waits for its pictures the score waits too, even through pause and play
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  let release;
  const gate = new Promise(r => (release = r));
  await page.route(/p-storyboard\.jpg$/, async r => { await gate; r.continue(); });
  await page.goto(`${url}/reel?t=5`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__reel);
  await page.evaluate(() => window.__reel.ready);
  await page.keyboard.press('m');
  // let the picture reach the seam and start waiting, then pause and play (which restarts the score)
  await page.waitForFunction(() => /Loading · Medium/.test(document.getElementById('chapterLabel').textContent), null, { timeout: 8000 });
  await page.keyboard.press('Space'); await page.waitForTimeout(150); await page.keyboard.press('Space');
  const seen = [];
  for (let i = 0; i < 10; i++) { await page.waitForTimeout(150); seen.push(await page.evaluate(() => ({ t: window.__reel.t, a: window.__reel.audio.position, label: document.getElementById('chapterLabel').textContent }))); }
  release();
  const as = seen.map(x => x.a || 0), maxT = Math.max(...seen.map(x => x.t));
  const spread = Math.max(...as) - Math.min(...as);
  // the score is muted on the seam from the audio thread and paused on the next frame; it must not run on or loop
  check('waiting for pictures: picture and score both hold at the seam', maxT < 6.001 && Math.max(...as) < 7 && spread < 0.3 && seen.every(x => /Loading · Medium/.test(x.label)), `playhead ≤ ${maxT.toFixed(3)}, score ${Math.min(...as).toFixed(3)}–${Math.max(...as).toFixed(3)} over 1.5 s, label “${seen[seen.length - 1].label}”`);
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({ t: window.__reel.t, label: document.getElementById('chapterLabel').textContent }));
  check('waiting for pictures: playback resumes once they land', after.t > 6.3 && /02 \/ 07/.test(after.label), `t = ${after.t.toFixed(2)}, label “${after.label}”`);
  await ctx.close();
}

// 3 · phone
{
  const { page, ctx, errors } = await open(390, 844, 2, { touch: true });
  check('phone: no console errors', errors.length === 0, errors.join(' | '));
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, playBtn: document.getElementById('playBtn').getBoundingClientRect().toJSON() }));
  check('phone: no horizontal scroll', m.sw <= m.cw, `${m.sw} vs ${m.cw}`);
  check('phone: play button is a 44 px target inside the screen', m.playBtn.width >= 44 && m.playBtn.height >= 44 && m.playBtn.left >= 0 && m.playBtn.bottom <= 844, JSON.stringify(m.playBtn));
  await ctx.close();
}

// 3b · shorter upright frames (Safari with its bars showing, a tablet held upright) keep everything inside the frame
for (const [w, h, dpr] of [[390, 664, 2], [768, 1024, 1]]) {
  const { page, ctx } = await open(w, h, dpr);
  const edges = await page.evaluate(() => {
    const R = window.__reel, out = [];
    for (const t of [8.5, 17, 21.7, 34.6, 42.8, 54.3, 59.9]) {
      const s = R.sample(t, 64, 96), row = y => Math.max(...s.slice(y * 64, y * 64 + 64));
      out.push({ t, top: Math.max(row(0), row(1), row(2)), bottom: Math.max(row(93), row(94), row(95)) });
    }
    return out;
  });
  const bad = edges.filter(e => e.top > 40 || e.bottom > 40);
  check(`${w}×${h}: nothing runs off the top or bottom edge`, bad.length === 0, bad.map(e => `t=${e.t} top ${e.top} bottom ${e.bottom}`).join(', '));
  await ctx.close();
}

// 4 · reduced motion shows the stills and runs no loop
{
  const { page, ctx, errors } = await open(1280, 720, 1, { reducedMotion: 'reduce' });
  const st = await page.evaluate(() => ({ still: document.body.hasAttribute('data-still'), figs: document.querySelectorAll('#stillList canvas').length, playing: window.__reel.playing }));
  const f0 = await page.evaluate(() => window.__reel.frames);
  await page.waitForTimeout(800);
  const f1 = await page.evaluate(() => window.__reel.frames);
  check('reduced motion: shows the seven stills instead of playing', st.still && st.figs === 7 && !st.playing && f1 === f0, JSON.stringify({ ...st, frames: [f0, f1] }));
  const blank = await page.evaluate(() => [...document.querySelectorAll('#stillList canvas')].map(c => {
    const s = document.createElement('canvas'); s.width = 64; s.height = 36; const x = s.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, 64, 36);
    const d = x.getImageData(0, 0, 64, 36).data; let m = 0, v = 0; const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) m += d[i + 1]; m /= n; for (let i = 0; i < d.length; i += 4) v += (d[i + 1] - m) ** 2; return Math.sqrt(v / n);
  }));
  check('reduced motion: no still is blank', blank.every(s => s > 2), blank.map(s => s.toFixed(1)).join(', '));
  check('reduced motion: no console errors', errors.length === 0, errors.join(' | '));
  await page.click('#playAnyway');
  await page.waitForTimeout(800);
  check('reduced motion: "Play the reel with motion" plays it', await page.evaluate(() => window.__reel.playing && !document.body.hasAttribute('data-still')));
  await ctx.close();
}

// 5 · the rest of the site is untouched
{
  let diff;
  try {
    diff = execFileSync('git', ['diff', '--name-only', 'origin/claude/chun-hee-portfolio-8ptzy9', '--', 'Chun Hee - Portfolio.dc.html', 'process.dc.html', 'work.dc.html', 'gameui-staging.html', 'support.js'], { encoding: 'utf8', cwd: path.join(here, '..'), stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) { diff = 'could not compare: the production branch ref is not in this clone (git fetch origin claude/chun-hee-portfolio-8ptzy9)'; }
  check('home, /process, /work and the shared runtime are unchanged vs production', diff === '', diff);
  const { page, ctx } = await open(1280, 720, 1, { path: '/', noReady: true });
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /reel/.test(h)));
  check('the home page does not link to the reel', links.length === 0, links.join(', '));
  await ctx.close();
}

await b.close(); server.close();
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
