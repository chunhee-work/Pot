/* The reel's full test: every chapter's gate, the seams between chapters and
   around the loop, the transport, reduced motion, the phone layout, and that
   the rest of the site was left alone.

   node tests/reel.smoke.mjs        (exit code 1 on any failure) */
import { serve, browser } from './lib.mjs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

// 1 · each chapter's own gate
const here = path.dirname(new URL(import.meta.url).pathname);
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
  if (!opts.noReady) await page.evaluate(() => window.__reel.ready);
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
  check('autoplays (muted) on load', s1.playing && s1.t > t0 + 0.5 && s1.frames > 10, `t ${t0.toFixed(2)} → ${s1.t.toFixed(2)}, ${s1.frames} frames`);
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
  const a1 = await page.evaluate(() => ({ t: window.__reel.t, a: window.__reel.audio.position }));
  check('sound: the score plays in step with the picture', a1.a !== null && a1.a > 20.5 && Math.abs(a1.a - a1.t) < 0.1, `picture ${a1.t.toFixed(3)} · score ${a1.a && a1.a.toFixed(3)}`);
  await page.evaluate(() => window.__reel.seek(40));
  await page.waitForTimeout(1200);
  const a2 = await page.evaluate(() => ({ t: window.__reel.t, a: window.__reel.audio.position }));
  check('sound: after a seek the score is within 0.1 s of the picture', Math.abs(a2.a - a2.t) < 0.1, `picture ${a2.t.toFixed(3)} · score ${a2.a.toFixed(3)}`);
  const voices = await page.evaluate(() => window.__reel.audio.voices);
  const wantVoices = await page.evaluate(() => window.__reel.cueCount);
  check('sound: the cast voices are loaded once sound is on', wantVoices > 0 && voices >= Math.min(wantVoices, 12), `${voices} voice buffers for ${wantVoices} cues`);
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
    const R = window.__reel, rest = R.sampleRest();
    const diff = a => a.reduce((s, v, i) => s + Math.abs(v - rest[i]), 0) / a.length;
    const at = [0.0005, ...R.chapters.slice(1).flatMap(c => [c.start - 0.0005, c.start + 0.0005]), R.duration - 0.0005];
    return at.map(t => ({ t: +t.toFixed(4), d: +diff(R.sample(t)).toFixed(2) }));
  });
  const worst = seams.reduce((a, s) => (s.d > a.d ? s : a), { d: 0 });
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

// 3 · phone
{
  const { page, ctx, errors } = await open(390, 844, 2, { touch: true });
  check('phone: no console errors', errors.length === 0, errors.join(' | '));
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, playBtn: document.getElementById('playBtn').getBoundingClientRect().toJSON() }));
  check('phone: no horizontal scroll', m.sw <= m.cw, `${m.sw} vs ${m.cw}`);
  check('phone: play button is a 44 px target inside the screen', m.playBtn.width >= 44 && m.playBtn.height >= 44 && m.playBtn.left >= 0 && m.playBtn.bottom <= 844, JSON.stringify(m.playBtn));
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
  const diff = execFileSync('git', ['diff', '--name-only', 'origin/claude/chun-hee-portfolio-8ptzy9', '--', 'Chun Hee - Portfolio.dc.html', 'process.dc.html', 'work.dc.html', 'gameui-staging.html', 'support.js'], { encoding: 'utf8' }).trim();
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
