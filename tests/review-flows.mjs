// Review flows that must hold on every build. Clicks like a visitor, in a full browser.
// Run: node tests/review-flows.mjs [baseUrl]   (default http://localhost:8080)
//   1. Contact in the nav lands on "Let's build something next." from every page
//   2. "Open the production line" on /land-of-hope goes to /process (fresh, and again after Back)
//   3. /#films and /#gameui (old CV links) land on Land of Hope films / The Chill Gallery game UI,
//      on a fresh load and on a same-page hash change
//   4. Escape closes every dialog: The Chill Gallery before/after, Land of Hope episode player,
//      /projects film player, including after a click inside the YouTube player
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const base = (process.argv[2] || 'http://localhost:8080').replace(/\/+$/, '');
const browser = await pw.chromium.launch({ channel: 'chromium', args: ['--use-gl=swiftshader'] }).catch(() => pw.chromium.launch());
const WIDTHS = [1280, 390];
const rows = [];
const log = (ok, name, detail) => { rows.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + detail : '')); };
const ctxFor = (w) => browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 800 }, isMobile: w < 500, hasTouch: w < 500 });
async function press(p, w, loc) {
  const bb = await loc.boundingBox();
  if (!bb) throw new Error('not on screen');
  const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
  if (w < 500) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y);
}
async function waitUrl(p, re, ms = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (re.test(new URL(p.url()).pathname)) return Date.now() - t0; await p.waitForTimeout(100); }
  return -1;
}

/* 1. Contact */
for (const w of WIDTHS) for (const path of ['/', '/about', '/land-of-hope', '/the-chill-gallery', '/oeru', '/projects', '/process', '/cv', '/no-such-page']) {
  const ctx = await ctxFor(w); const p = await ctx.newPage();
  try {
    await p.goto(base + path, { waitUntil: 'load' }); await p.waitForTimeout(800);
    if (path === '/') { // home: the capsule nav stays hidden over the first screen, so scroll past it (then nudge up so the nav shows)
      await p.mouse.wheel(0, 0); await p.evaluate(() => scrollTo(0, innerHeight * 1.6)); await p.waitForTimeout(500);
      await p.evaluate(() => scrollBy(0, -120)); await p.waitForTimeout(700);
    }
    await press(p, w, p.locator('nav[data-metal] a:has-text("Contact"), header.bar a:has-text("Contact")').first());
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => {
      const h = [...document.querySelectorAll('h2,h3')].find((e) => /build something next/i.test(e.textContent) && e.getClientRects().length);
      if (!h) return null; const b = h.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), vh: innerHeight };
    });
    log(!!r && r.top >= 0 && r.bottom <= r.vh, `Contact from ${path} @${w}`, r ? `heading at ${r.top}px, ${new URL(p.url()).pathname}${new URL(p.url()).hash}` : 'heading not found');
  } catch (e) { log(false, `Contact from ${path} @${w}`, e.message.split('\n')[0]); }
  await ctx.close();
}

/* 2. Production line */
for (const w of WIDTHS) {
  const ctx = await ctxFor(w); const p = await ctx.newPage();
  try {
    await p.goto(base + '/land-of-hope', { waitUntil: 'load' }); await p.waitForTimeout(800);
    const label = p.getByText(/Open the production line/i);
    await label.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    await press(p, w, label);
    const ms = await waitUrl(p, /^\/process$/);
    log(ms >= 0, `Production line → /process @${w}`, ms >= 0 ? `arrived in ${ms}ms` : 'stayed on ' + new URL(p.url()).pathname);
    if (ms >= 0) {
      await p.waitForTimeout(800); await p.goBack({ waitUntil: 'load' }); await p.waitForTimeout(1000);
      const l2 = p.getByText(/Open the production line/i);
      await l2.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
      await press(p, w, l2);
      const ms2 = await waitUrl(p, /^\/process$/);
      log(ms2 >= 0, `Production line again after Back @${w}`, ms2 >= 0 ? `arrived in ${ms2}ms` : 'stayed on ' + new URL(p.url()).pathname);
    }
  } catch (e) { log(false, `Production line @${w}`, e.message.split('\n')[0]); }
  await ctx.close();
}

/* 3. Old CV anchors */
const ANCH = [['/#films', '/land-of-hope', 'films'], ['/#gameui', '/the-chill-gallery', 'gacha']];
async function where(p) {
  return p.evaluate(() => { const id = location.hash.slice(1); const e = id && document.getElementById(id);
    const b = e && e.getClientRects().length ? e.getBoundingClientRect() : null;
    return { at: location.pathname + location.hash, top: b ? Math.round(b.top) : null, vh: innerHeight }; });
}
for (const w of WIDTHS) for (const [from, page, id] of ANCH) for (const how of ['fresh load', 'hash change on home']) {
  const ctx = await ctxFor(w); const p = await ctx.newPage();
  try {
    if (how !== 'fresh load') { await p.goto(base + '/', { waitUntil: 'load' }); await p.waitForTimeout(800); }
    await p.goto(base + from, { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const r = await where(p);
    const ok = r.at === page + '#' + id && r.top !== null && r.top >= 0 && r.top < r.vh * 0.5;
    log(ok, `${from} (${how}) @${w}`, `${r.at}, section top ${r.top}px`);
  } catch (e) { log(false, `${from} (${how}) @${w}`, e.message.split('\n')[0]); }
  await ctx.close();
}

/* 4. Escape closes every dialog */
const DIALOGS = [
  ['The Chill Gallery before/after', '/the-chill-gallery', '[data-lb-no="BEFORE"]', '[data-lightbox]'],
  ['Land of Hope episode player', '/land-of-hope', '[data-lb-yt]', '[data-lightbox]'],
  ['/projects film player', '/projects', '[data-yt]', '#lb'],
];
const isOpen = (p, box) => p.evaluate((sel) => { const d = document.querySelector(sel); if (!d) return false;
  return !d.hidden && getComputedStyle(d).visibility !== 'hidden' && getComputedStyle(d).display !== 'none'; }, box);
for (const w of WIDTHS) for (const [name, page, trigger, box] of DIALOGS) for (const how of ['as opened', 'after clicking inside it']) {
  const ctx = await ctxFor(w); const p = await ctx.newPage();
  try {
    await p.goto(base + page, { waitUntil: 'load' }); await p.waitForTimeout(800);
    const t = p.locator(trigger).first(); await t.scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    await press(p, w, t); await p.waitForTimeout(1200);
    if (!(await isOpen(p, box))) { log(false, `Esc closes ${name} (${how}) @${w}`, 'dialog did not open'); await ctx.close(); continue; }
    if (how !== 'as opened') {
      const inner = p.locator(box + ' iframe[src], ' + box + ' img[src]').first();
      const bb = await inner.boundingBox().catch(() => null);
      if (bb) await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); else await p.mouse.click(w / 2, 300);
      await p.waitForTimeout(1200);
    }
    const focus = await p.evaluate(() => document.activeElement.tagName);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    const still = await isOpen(p, box);
    log(!still, `Esc closes ${name} (${how}) @${w}`, `focus was on ${focus}, ${still ? 'still open' : 'closed'} 300ms after Esc`);
  } catch (e) { log(false, `Esc closes ${name} (${how}) @${w}`, e.message.split('\n')[0]); }
  await ctx.close();
}

await browser.close();
const fails = rows.filter((x) => !x).length;
console.log(`\n${rows.length - fails}/${rows.length} passed against ${base}`);
process.exit(fails ? 1 : 0);
