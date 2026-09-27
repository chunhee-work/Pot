/* A reel's full test: every chapter's gate, the seams between chapters and
   around the loop, the transport, the sound, progressive loading, reduced
   motion, the phone layout, and that the rest of the site was left alone.

   Every expectation is read from the page itself: window.__reel (the cut,
   its length, its cues) and the reel's own timeline module (which chapters
   wait for pictures or a 3D model, and when the voices come in). So the same
   suite runs on every reel the player serves.

   node tests/reel.smoke.mjs [--page reel|reel2]   (default reel; exit code 1 on any failure)
   node tests/run-all.mjs                           (both reels) */
import { serve, browser } from './lib.mjs';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const PAGE = argv.includes('--page') ? argv[argv.indexOf('--page') + 1] : 'reel';
if (!PAGE || !/^[\w-]+$/.test(PAGE)) { console.error('usage: node tests/reel.smoke.mjs [--page reel|reel2]'); process.exit(2); }
const PATH = `/${PAGE}`;

const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
/** a check that does not apply to this reel (it declares nothing for it to test) */
const skip = (name, why) => { results.push({ name, skip: true, detail: why }); console.log(`SKIP  ${name}  — ${why}`); };

const here = path.dirname(fileURLToPath(import.meta.url));
const { server, url } = await serve();
const b = await browser();

// 0 · the cut, as the page has it
let meta;
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  try {
    await page.goto(`${url}${PATH}?paused`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__reel, null, { timeout: 20000 });
    meta = await page.evaluate(async () => {
      const R = window.__reel;
      /* what each chapter waits on (assets, models) and its voice cues live on
         the chapter modules; the page's entry module imports them from its
         timeline, and importing that same URL again hands back the instance
         already running */
      let tl = null;
      for (const s of document.querySelectorAll('script[type="module"][src]')) {
        const src = await (await fetch(s.src)).text();
        const m = src.match(/import\s*\{[^}]*\bCHAPTERS\b[^}]*\}\s*from\s*['"]([^'"]+)['"]/);
        if (m) { tl = await import(new URL(m[1], s.src).href); break; }
      }
      if (!tl) throw new Error('found no timeline module the page imports its CHAPTERS from');
      const scenes = tl.CHAPTERS.map(c => c.scene);
      return {
        duration: R.duration,
        cueCount: R.cueCount,
        chapters: R.chapters.map((c, i) => ({
          ...c, index: i, sceneId: scenes[i] && scenes[i].id,
          assets: [...((scenes[i] && scenes[i].assets) || [])],
          models: [...((scenes[i] && scenes[i].models) || [])],
          cues: ((scenes[i] && scenes[i].cues) || []).map(q => ({ at: q.at, voice: q.voice ?? null }))
        }))
      };
    });
  } catch (e) {
    check(`${PATH} exposes its cut (window.__reel and its timeline)`, false, [String(e.message || e).split('\n')[0], ...errors].join(' | '));
    await b.close(); server.close();
    process.exit(1);
  } finally { await ctx.close().catch(() => {}); }
  const off = meta.chapters.filter(c => c.sceneId !== c.id);
  if (off.length) {
    check(`${PATH} exposes its cut (window.__reel and its timeline)`, false, `timeline and window.__reel disagree at ${off.map(c => c.id).join(', ')}`);
    await b.close(); server.close();
    process.exit(1);
  }
}

// everything the checks expect, derived from the cut
const D = meta.duration, CH = meta.chapters, N = CH.length;
const pad = n => String(n).padStart(2, '0');
const tagOf = c => `${pad(c.index + 1)} / ${pad(N)}`;                        // "06 / 07"
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = n => WORDS[n] || String(n);
const clampT = x => Math.min(Math.max(x, 0), D - 1e-3);                     // where a seek lands
const pathOf = p => new URL(p, url + '/').pathname;
const declared = new Set(CH.flatMap(c => c.assets).map(p => decodeURIComponent(pathOf(p))));
// the voices, in the order they come in
const cues = CH.flatMap(c => c.cues.map((q, k) => ({ t: c.start + q.at, voice: q.voice ?? `${c.id}#${k}` }))).sort((a, b) => a.t - b.t);
const voiceNames = new Set(cues.map(q => q.voice)).size;
// the chapter a slow network holds on: the first after the opening one that waits for a 3D model (the slowest thing to land), else for pictures
const holdCh = CH.slice(1).find(c => c.models.length) || CH.slice(1).find(c => c.assets.length);
// the first chapter with a 3D model
const modelCh = CH.find(c => c.models.length);
// the first chapter after the opening one with a picture the chapter before it does not also need: holding that one picture back holds the reel on its seam
const picCh = CH.slice(1).find(c => c.assets.some(a => !CH[c.index - 1].assets.includes(a)));
const gatePic = picCh && picCh.assets.find(a => !CH[picCh.index - 1].assets.includes(a));

// 1 · each chapter's own gate
const run = promisify(execFile);
for (const id of process.env.SKIP_CHAPTERS ? [] : CH.map(c => c.id)) {
  let out = '', pass = true;
  try { out = (await run('node', [path.join(here, 'check-chapter.mjs'), id, '--page', PAGE], { encoding: 'utf8', maxBuffer: 64 << 20 })).stdout; }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); pass = false; }
  const fails = [...out.matchAll(/"fails": \[([^\]]*)\]/g)].map(m => m[1].replace(/\s+/g, ' ').trim()).filter(Boolean);
  check(`chapter ${id}: gate`, pass, fails.join(' | '));
}

async function open(vw, vh, dpr = 1, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, reducedMotion: opts.reducedMotion || 'no-preference', hasTouch: !!opts.touch });
  const page = await ctx.newPage();
  const errors = [], failedReq = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('requestfailed', r => failedReq.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) failedReq.push(`${r.status()} ${r.url()}`); });
  await page.goto(`${url}${opts.path || PATH}`);
  if (!opts.noReady) await page.evaluate(() => window.__reel.allReady);
  return { page, ctx, errors, failedReq };
}

// 2 · desktop: loads clean, plays, the transport works
{
  const { page, ctx, errors, failedReq } = await open(1280, 720);
  check(`served at ${PATH} (rewrite) and loads with no console errors`, errors.length === 0, errors.join(' | '));
  check('every request succeeds', failedReq.length === 0, failedReq.join(' | '));
  const lens = await page.evaluate(() => window.__reel.post);
  check('the WebGL lens is active', lens);

  const t0 = await page.evaluate(() => window.__reel.t);
  // (the first frames after load can be very slow in a software-rendered browser, so give it a few seconds to show it is moving)
  await page.waitForFunction(t0 => window.__reel.t > t0 + 0.2 && window.__reel.frames > 5, t0, { timeout: 8000 }).catch(() => {});
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
  check('clicking the scrubber seeks', Math.abs(ts - D * 0.5) < 0.4, `t = ${ts.toFixed(2)} (want ≈ ${+(D * 0.5).toFixed(2)})`);
  // drag from 25 % to 75 %
  await page.mouse.move(box.x + box.width * 0.25, box.y + 1);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + 1, { steps: 6 });
  await page.mouse.up();
  const td = await page.evaluate(() => window.__reel.t);
  check('dragging the scrubber seeks', Math.abs(td - D * 0.75) < 0.4, `t = ${td.toFixed(2)} (want ≈ ${+(D * 0.75).toFixed(2)})`);

  // number keys: the third chapter (a jump lands a millisecond in); then ±5 s from there
  const kc = CH[Math.min(3, N) - 1];
  await page.keyboard.press(String(kc.index + 1));
  const t3 = await page.evaluate(() => window.__reel.t);
  check('number keys jump to chapters', Math.abs(t3 - kc.start) < 0.01, `t = ${t3.toFixed(3)} (want ${kc.start})`);
  const wantR = clampT(kc.start + 1e-3 + 5), wantL = clampT(clampT(wantR - 5) - 5);
  await page.keyboard.press('ArrowRight');
  const tr = await page.evaluate(() => window.__reel.t);
  check('→ skips forward 5 s', Math.abs(tr - wantR) < 0.01, `t = ${tr.toFixed(3)} (want ${wantR.toFixed(3)})`);
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  const tl = await page.evaluate(() => window.__reel.t);
  check('← skips back 5 s', Math.abs(tl - wantL) < 0.01, `t = ${tl.toFixed(3)} (want ${wantL.toFixed(3)})`);

  // the sixth chapter's label on the transport
  const lc = CH[Math.min(5, N - 1)];
  await page.locator('#chapters button').nth(lc.index).click();
  await page.waitForTimeout(150);
  const tc = await page.evaluate(() => window.__reel.t);
  check('chapter labels jump', Math.abs(tc - lc.start) < 0.01, `t = ${tc.toFixed(3)} (want ${lc.start})`);
  const label = await page.textContent('#chapterLabel');
  check('chapter label follows the playhead', label.includes(tagOf(lc)), `${label} (want “${tagOf(lc)}”)`);

  await page.keyboard.press('m');
  await page.waitForTimeout(400);
  const snd = await page.evaluate(() => window.__reel.soundOn);
  check('M turns sound on', snd);
  check('sound button reflects it', (await page.getAttribute('#soundBtn', 'aria-pressed')) === 'true');
  // the score follows the picture through play, seek and a scrub
  const T1 = Math.floor(D / 3), T2 = Math.floor(2 * D / 3);
  await page.evaluate(t => { window.__reel.seek(t); window.__reel.play(); }, T1);
  await page.waitForTimeout(1500);
  const a1 = await page.evaluate(() => ({ t: window.__reel.sync.t, a: window.__reel.sync.audio }));
  check('sound: the score plays in step with the picture', a1.a !== null && a1.a > T1 + 0.5 && Math.abs(a1.a - a1.t) < 0.1, `picture ${a1.t.toFixed(3)} · score ${a1.a && a1.a.toFixed(3)}`);
  await page.evaluate(t => window.__reel.seek(t), T2);
  await page.waitForTimeout(1200);
  const a2 = await page.evaluate(() => ({ t: window.__reel.sync.t, a: window.__reel.sync.audio }));
  check('sound: after a seek the score is within 0.1 s of the picture', a2.a !== null && Math.abs(a2.a - a2.t) < 0.1, `picture ${a2.t.toFixed(3)} · score ${a2.a === null ? 'none' : a2.a.toFixed(3)}`);
  // on a slow network the playhead holds for the score — it never runs backwards
  const slowAudio = async r => {
    const q = r.request();
    if (q.resourceType() === 'media' || /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)$/i.test(new URL(q.url()).pathname)) await new Promise(res => setTimeout(res, 700));
    r.continue();
  };
  await page.route('**/*', slowAudio);
  const jc = CH[Math.min(4, N - 1)];
  const sndOn = await page.evaluate(() => window.__reel.soundOn);
  const mono = await page.evaluate(i => new Promise(res => {
    window.__reel.jump(i);
    const seen = [window.__reel.t], t0 = performance.now();
    (function f() { seen.push(window.__reel.t); if (performance.now() - t0 < 2500) requestAnimationFrame(f); else res(seen); })();
  }), jc.index);
  const back = mono.reduce((w, v, i) => (i && mono[i - 1] - v > w ? mono[i - 1] - v : w), 0);
  check('sound: after a jump on a slow network the playhead never runs backwards', sndOn && back < 0.001, `${sndOn ? '' : 'sound is off, so nothing was tested; '}largest backward step ${back.toFixed(3)} s over ${mono.length} frames, ${mono[0].toFixed(2)} → ${mono[mono.length - 1].toFixed(2)}`);
  await page.unroute('**/*', slowAudio);
  if (meta.cueCount > 0) {
    const voices = await page.evaluate(() => window.__reel.audio.voices);
    const wantVoices = await page.evaluate(() => window.__reel.cueCount);
    check('sound: the cast voices are loaded once sound is on', wantVoices > 0 && voices >= Math.min(wantVoices, voiceNames), `${voices} voice buffers for ${wantVoices} cues (${voiceNames} voices)`);
    // play into the first cue from a little over half a second before it
    const from = Math.max(0, +(cues[0].t - 0.55).toFixed(3));
    const f0 = await page.evaluate(() => window.__reel.audio.fired);
    await page.evaluate(t => { window.__reel.seek(t); window.__reel.play(); }, from);
    await page.waitForTimeout(2600);
    const f1 = await page.evaluate(() => ({ fired: window.__reel.audio.fired, t: window.__reel.t }));
    check('sound: voice lines fire as the cast arrives', f1.fired - f0 >= 1, `${f1.fired - f0} fired, playhead ${from} → ${f1.t.toFixed(2)} (first cue at ${+cues[0].t.toFixed(3)})`);
  } else {
    skip('sound: the cast voices are loaded once sound is on', 'no chapter declares voice cues (cueCount 0)');
    skip('sound: voice lines fire as the cast arrives', 'no chapter declares voice cues (cueCount 0)');
  }
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

  // seams: every boundary, and the loop, look like that boundary's seam frame
  const seams = await page.evaluate(() => {
    const R = window.__reel;
    const diff = (a, rest) => a.reduce((s, v, i) => s + Math.abs(v - rest[i]), 0) / a.length;
    const at = [[0.0005, 0], ...R.chapters.slice(1).flatMap(c => [[c.start - 0.0005, c.start], [c.start + 0.0005, c.start]]), [R.duration - 0.0005, R.duration]];
    return at.map(([t, seam]) => ({ t: +t.toFixed(4), d: +diff(R.sample(t), R.sampleRest(seam)).toFixed(2) }));
  });
  const worst = seams.reduce((a, s) => (s.d > a.d ? s : a), { d: -1 });
  check('every chapter seam and the loop seam match the rest frame', worst.d <= 1.5, `worst ${worst.d} at t=${worst.t}`);

  // wrap: playing past the end comes back to the start
  await page.evaluate(t => { window.__reel.seek(t); window.__reel.play(); }, D - 0.4);
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
  // every picture a chapter declares, any other picture or 3D model, and the three.js bundle
  const slow = u => { const p = decodeURIComponent(u.pathname); return declared.has(p) || /\.(jpe?g|webp|png|gif|avif|glb|gltf)$/i.test(p) || /three-/.test(p); };
  await page.route(slow, async r => { await new Promise(res => setTimeout(res, 2500)); r.continue(); });
  const t0 = Date.now();
  // (JS-started image loads hold back the window load event, so don't wait for it)
  await page.goto(`${url}${PATH}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__reel);
  await page.evaluate(() => window.__reel.ready);
  const firstFrameMs = Date.now() - t0;
  await page.waitForTimeout(400);
  const early = await page.evaluate(() => ({ t: window.__reel.t, playing: window.__reel.playing }));
  check('slow network: playback starts before the pictures arrive', firstFrameMs < 2000 && early.playing && early.t > 0.1, `first frame after ${firstFrameMs} ms, t = ${early.t.toFixed(2)}`);
  // jump into a chapter before its pictures (or model) are in: it holds on its seam frame, then plays once they land
  const holdName = 'slow network: an unloaded chapter holds on the rest frame, then plays';
  if (holdCh) {
    const at = holdCh.start + Math.min(1, (holdCh.end - holdCh.start) / 2);
    await page.evaluate(t => window.__reel.seek(t), at);
    await page.waitForTimeout(300);
    const held = await page.evaluate(seam => { const R = window.__reel, rest = R.sampleRest(seam), s = R.sample(R.t); return { t: R.t, label: document.getElementById('chapterLabel').textContent, d: s.reduce((a, v, i) => a + Math.abs(v - rest[i]), 0) / s.length }; }, holdCh.start);
    await page.evaluate(() => window.__reel.allReady);
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => window.__reel.t);
    check(holdName, Math.abs(held.t - at) < 0.05 && held.d < 1.5 && /Loading/.test(held.label) && after > at + 0.2, `${holdCh.title}: held at ${held.t.toFixed(2)} (“${held.label}”, diff ${held.d.toFixed(2)}), then ${after.toFixed(2)}`);
  } else check(holdName, false, 'nothing to wait for: no chapter after the opening one declares pictures or a 3D model');
  check('slow network: no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// 2c · a 3D model that fails to load does not stall the reel
if (modelCh) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.route(/\.(glb|gltf)$/, r => r.abort());
  await page.goto(`${url}${PATH}?t=${Math.max(0, modelCh.start - 1)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__reel);
  await page.evaluate(() => window.__reel.allReady);
  // it must get past the seam into the chapter rather than wait there for good
  const passed = await page.waitForFunction(t => window.__reel.t > t, modelCh.start + 0.6, { timeout: 8000 }).then(() => true, () => false);
  const t = await page.evaluate(() => window.__reel.t);
  check(`a failed 3D model: ${modelCh.title} plays on without it`, passed, `t = ${t.toFixed(2)}`);
  await ctx.close();
} else skip('a failed 3D model: the reel plays on without it', 'no chapter declares a 3D model');

// 2d · while a chapter waits for its pictures the score waits too, even through pause and play
{
  const holdName = 'waiting for pictures: picture and score both hold at the seam', resumeName = 'waiting for pictures: playback resumes once they land';
  if (picCh) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    let release;
    const gate = new Promise(r => (release = r));
    const gated = decodeURIComponent(pathOf(gatePic));
    await page.route(u => decodeURIComponent(u.pathname) === gated, async r => { await gate; r.continue(); });
    const loading = `Loading · ${picCh.title}`;
    await page.goto(`${url}${PATH}?t=${Math.max(CH[picCh.index - 1].start, picCh.start - 1)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__reel);
    await page.evaluate(() => window.__reel.ready);
    await page.keyboard.press('m');
    // let the picture reach the seam and start waiting, then pause and play (which restarts the score)
    await page.waitForFunction(s => document.getElementById('chapterLabel').textContent.includes(s), loading, { timeout: 8000 });
    await page.keyboard.press('Space'); await page.waitForTimeout(150); await page.keyboard.press('Space');
    const seen = [];
    for (let i = 0; i < 10; i++) { await page.waitForTimeout(150); seen.push(await page.evaluate(() => ({ t: window.__reel.t, a: window.__reel.audio.position, label: document.getElementById('chapterLabel').textContent }))); }
    release();
    const as = seen.map(x => x.a || 0), maxT = Math.max(...seen.map(x => x.t));
    const spread = Math.max(...as) - Math.min(...as);
    const scored = seen.every(x => x.a !== null);
    // the score is muted on the seam from the audio thread and paused on the next frame; it must not run on or loop
    check(holdName, scored && maxT < picCh.start + 0.001 && Math.max(...as) < picCh.start + 1 && spread < 0.3 && seen.every(x => x.label.includes(loading)), `${picCh.title} (holding back ${gatePic}): playhead ≤ ${maxT.toFixed(3)}, ${scored ? `score ${Math.min(...as).toFixed(3)}–${Math.max(...as).toFixed(3)} over 1.5 s` : 'no score playing'}, label “${seen[seen.length - 1].label}”`);
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => ({ t: window.__reel.t, label: document.getElementById('chapterLabel').textContent }));
    check(resumeName, after.t > picCh.start + 0.3 && after.label.includes(tagOf(picCh)), `t = ${after.t.toFixed(2)}, label “${after.label}”`);
    await ctx.close();
  } else {
    check(holdName, false, 'nothing to wait for: no chapter after the opening one declares a picture of its own');
    check(resumeName, false, 'nothing to wait for: no chapter after the opening one declares a picture of its own');
  }
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

/* 3b · shorter upright frames (Safari with its bars showing, a tablet held
   upright) keep everything inside the frame: at each chapter's still and a
   quarter-second either side of it, the rows along the top and bottom edge
   show only the chapter's background — the colour of its seam frame's edges
   (black on the first reel, the chapter's own colour on the second). */
for (const [w, h, dpr] of [[390, 664, 2], [768, 1024, 1]]) {
  const { page, ctx } = await open(w, h, dpr);
  const edges = await page.evaluate(() => {
    const R = window.__reel, out = [];
    const rows = (s, ys) => ys.flatMap(y => s.slice(y * 64, y * 64 + 64));
    for (const c of R.chapters) {
      const d = c.end - c.start, inside = x => Math.min(Math.max(x, 0), d - 0.01);
      const still = inside(c.still ?? d / 2);   // as the reduced-motion stills pick it
      const e = rows(R.sampleRest(c.start, 64, 96), [0, 1, 2, 93, 94, 95]).sort((a, b) => a - b), bg = e[e.length >> 1];
      for (const lt of new Set([still, inside(still - 0.25), inside(still + 0.25)])) {
        const t = +(c.start + lt).toFixed(3), s = R.sample(t, 64, 96);
        const off = ys => Math.max(...rows(s, ys).map(v => Math.abs(v - bg)));
        out.push({ t, id: c.id, bg, top: off([0, 1, 2]), bottom: off([93, 94, 95]) });
      }
    }
    return out;
  });
  const bad = edges.filter(e => e.top > 30 || e.bottom > 30);
  check(`${w}×${h}: nothing runs off the top or bottom edge`, bad.length === 0, bad.map(e => `t=${e.t} (${e.id}) top ${e.top} bottom ${e.bottom} off its background (luma ${e.bg})`).join(', '));
  await ctx.close();
}

// 4 · reduced motion shows the stills and runs no loop
{
  const { page, ctx, errors } = await open(1280, 720, 1, { reducedMotion: 'reduce' });
  const st = await page.evaluate(() => ({ still: document.body.hasAttribute('data-still'), figs: document.querySelectorAll('#stillList canvas').length, playing: window.__reel.playing }));
  const f0 = await page.evaluate(() => window.__reel.frames);
  await page.waitForTimeout(800);
  const f1 = await page.evaluate(() => window.__reel.frames);
  check(`reduced motion: shows the ${word(N)} stills instead of playing`, st.still && st.figs === N && !st.playing && f1 === f0, JSON.stringify({ ...st, frames: [f0, f1] }));
  const blank = await page.evaluate(() => [...document.querySelectorAll('#stillList canvas')].map(c => {
    const s = document.createElement('canvas'); s.width = 64; s.height = 36; const x = s.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, 64, 36);
    const d = x.getImageData(0, 0, 64, 36).data; let m = 0, v = 0; const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) m += d[i + 1]; m /= n; for (let i = 0; i < d.length; i += 4) v += (d[i + 1] - m) ** 2; return Math.sqrt(v / n);
  }));
  check('reduced motion: no still is blank', blank.length === N && blank.every(s => s > 2), blank.map(s => s.toFixed(1)).join(', '));
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
  const links = [];
  for (const p of ['/', '/process', '/work']) {
    const { page, ctx } = await open(1280, 720, 1, { path: p, noReady: true });
    links.push(...(await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /reel/i.test(h)))).map(h => `${p}: ${h}`));
    await ctx.close();
  }
  check('the home page, /process and /work do not link to either reel', links.length === 0, links.join(', '));
}

await b.close(); server.close();
const skipped = results.filter(r => r.skip), ran = results.filter(r => !r.skip), failed = ran.filter(r => !r.pass);
console.log(`\n${PATH}: ${ran.length - failed.length}/${ran.length} passed${skipped.length ? `, ${skipped.length} skipped` : ''}`);
process.exit(failed.length ? 1 : 0);
