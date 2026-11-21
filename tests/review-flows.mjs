// Review flows that must hold on every build. Clicks like a visitor, in a full browser.
// Run: node tests/review-flows.mjs [baseUrl]   (default http://localhost:8080)
//   1. Contact in the nav opens /contact (its own page, nothing above it) from every page
//   5. footer/badge contrast, skyline behind contact, /about clear of nav, home has no script errors
//   6. KL skyline never crosses the contact rows while scrolling (pixel check, home + /about, 5 widths)
//   1b. Home first screen: portrait visible, capsule nav hidden, role line not covered, at 390/768/1024/1440
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

/* 1. Contact is its own page (Chun Hee, 2026-11-21): Contact in the nav opens /contact, the heading is on screen,
      and there is nothing above it to scroll back into */
for (const w of WIDTHS) for (const path of ['/', '/about', '/land-of-hope', '/the-chill-gallery', '/oeru', '/projects', '/process', '/cv', '/no-such-page']) {
  const ctx = await ctxFor(w); const p = await ctx.newPage();
  try {
    await p.goto(base + path, { waitUntil: 'load' }); await p.waitForTimeout(800);
    if (path === '/') { // home: the capsule nav stays hidden over the first screen, so scroll past it (then nudge up so the nav shows)
      await p.mouse.wheel(0, 0); await p.evaluate(() => scrollTo(0, innerHeight * 1.6)); await p.waitForTimeout(500);
      await p.evaluate(() => scrollBy(0, -120)); await p.waitForTimeout(700);
    }
    await press(p, w, p.locator('nav[data-metal] a:has-text("Contact"), header.bar a:has-text("Contact")').first());
    await waitUrl(p, /^\/contact$/); await p.waitForTimeout(1500);
    await p.mouse.wheel(0, -800); await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const h = [...document.querySelectorAll('h2,h3')].find((e) => /build something next/i.test(e.textContent) && e.getClientRects().length);
      const b = h && h.getBoundingClientRect();
      return { at: location.pathname, top: b ? Math.round(b.top) : null, bottom: b ? Math.round(b.bottom) : null, vh: innerHeight,
        above: [...document.querySelectorAll('main>section')].filter((s) => s.id !== 'contact' && s.getClientRects().length).map((s) => s.id), y: scrollY };
    });
    const ok = r.at === '/contact' && r.top !== null && r.top >= 0 && r.bottom <= r.vh && r.above.length === 0 && r.y === 0;
    log(ok, `Contact from ${path} @${w}`, `${r.at}, heading at ${r.top}px, ${r.above.length ? 'sections above: ' + r.above.join(',') : 'nothing above it'}`);
  } catch (e) { log(false, `Contact from ${path} @${w}`, e.message.split('\n')[0]); }
  await ctx.close();
}

/* 1b. Home first screen (Chun Hee's restored hero): the round portrait is visible between CHUN and HEE,
       the capsule nav is hidden, and the role line at the top is not covered. Checked right after first paint and once settled. */
for (const w of [390, 768, 1024, 1440]) for (const when of ['first paint', 'settled']) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : (w < 900 ? 1024 : 800) }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage();
  try {
    await p.goto(base + '/', { waitUntil: when === 'first paint' ? 'domcontentloaded' : 'load' });
    await p.waitForTimeout(when === 'first paint' ? 150 : 2000);
    const r = await p.evaluate(() => {
      const pill = document.querySelector('.hx-pill'), img = pill && pill.querySelector('img'), nav = document.querySelector('nav[data-metal]');
      const pb = pill && pill.getBoundingClientRect(), ps = pill && getComputedStyle(pill);
      const tag = [...document.querySelectorAll('#hero *')].find((e) => /product\s*&\s*creative lead/i.test(e.textContent) && !e.children.length);
      const tb = tag && tag.getBoundingClientRect();
      const ns = nav && getComputedStyle(nav), nb = nav && nav.getBoundingClientRect();
      const navShown = !!nav && ns.display !== 'none' && ns.visibility !== 'hidden' && +ns.opacity > 0.05 && nb.height > 0;
      const covered = navShown && tb && !(tb.bottom <= nb.top || tb.top >= nb.bottom || tb.right <= nb.left || tb.left >= nb.right);
      return { pill: !!pill && pb.width > 20 && pb.height > 20 && pb.top >= 0 && pb.bottom <= innerHeight && +ps.opacity > 0.9 && ps.visibility !== 'hidden' && !!img && img.complete !== undefined,
        pillBox: pb ? `${Math.round(pb.width)}x${Math.round(pb.height)} at ${Math.round(pb.top)}px` : 'missing', navShown, covered: !!covered };
    });
    log(r.pill && !r.navShown && !r.covered, `Home hero @${w} (${when})`, `portrait ${r.pill ? 'visible' : 'NOT visible'} (${r.pillBox}), capsule ${r.navShown ? 'SHOWING' : 'hidden'}${r.covered ? ', role line covered' : ''}`);
  } catch (e) { log(false, `Home hero @${w} (${when})`, e.message.split('\n')[0]); }
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

/* 2b. Production line card is a plain link: one real mouse click on the sphere itself, nothing on the page cancels it */
for (const w of WIDTHS) for (const spot of ['sphere', 'label']) {
  const ctx = await ctxFor(w); const p = await ctx.newPage();
  try {
    await p.goto(base + '/land-of-hope', { waitUntil: 'load' }); await p.waitForTimeout(800);
    const card = p.locator('a[data-sphere-portal]').first();
    const target = spot === 'sphere' ? card.locator('process-sphere') : p.getByText(/Open the production line/i);
    await target.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
    const bb = await target.boundingBox(); const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
    const info = await p.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y), a = el && el.closest('a');
      window.__prevented = null; addEventListener('click', (e) => { window.__prevented = e.defaultPrevented; }, { once: true });
      return { href: a && a.getAttribute('href'), tag: el && el.tagName };
    }, [x, y]);
    if (w < 500) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y);
    const prevented = await p.evaluate(() => window.__prevented).catch(() => false);
    const ms = await waitUrl(p, /^\/process$/, 4000);
    log(info.href === '/process' && ms >= 0 && !prevented, `Production line, one click on the ${spot} @${w}`,
      `hit ${info.tag} in <a href="${info.href}">, ${prevented ? 'click was cancelled' : 'not cancelled'}, ${ms >= 0 ? 'on /process in ' + ms + 'ms' : 'stayed on ' + new URL(p.url()).pathname}`);
  } catch (e) { log(false, `Production line, one click on the ${spot} @${w}`, e.message.split('\n')[0]); }
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


/* 5. QA round (2026-11-21): readable footer + badge, skyline behind contact, About clear of the nav, no console errors on home */
const CONTRAST = () => {
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const [r, g, b] = m.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; const a = c.match(/[\d.]+/g); if (a && (a.length < 4 || +a[3] > 0.5)) return c; } return 'rgb(255,255,255)'; };
  window.__ratio = (e) => { const f = lum(getComputedStyle(e).color), b = lum(bgOf(e)); return (Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05); };
};
for (const w of [390, 1280]) for (const page of ['/projects', '/process']) {
  const ctx = await ctxFor(w); const p = await ctx.newPage();
  try {
    await p.goto(base + page, { waitUntil: 'load' }); await p.waitForTimeout(600); await p.evaluate(CONTRAST);
    const r = await p.evaluate(() => [...document.querySelectorAll('#contact .mono b, #contact .mail')].map((e) => [e.textContent.trim().slice(0, 28), +window.__ratio(e).toFixed(1)]));
    const low = r.filter((x) => x[1] < 4.5);
    log(r.length >= 4 && !low.length, `${page} footer text readable @${w}`, low.length ? 'low contrast: ' + low.map((x) => `${x[0]} ${x[1]}:1`).join(', ') : `${r.length} items, lowest ${Math.min(...r.map((x) => x[1]))}:1`);
    if (page === '/projects') {
      const f = await p.evaluate(() => { const b = [...document.querySelectorAll('.mp b')].find((e) => /fixed/i.test(e.textContent)); return b ? +window.__ratio(b).toFixed(1) : null; });
      log(f !== null && f >= 4.5, `/projects 'Fixed' badge readable @${w}`, f === null ? 'badge not found' : `${f}:1`);
    }
  } catch (e) { log(false, `${page} footer @${w}`, e.message.split('\n')[0]); }
  await ctx.close();
}
for (const w of [390, 768, 1024, 1440]) for (const page of ['/', '/about']) {
  const ctx = await ctxFor(w); const p = await ctx.newPage();
  try {
    await p.goto(base + page, { waitUntil: 'load' }); await p.waitForTimeout(600);
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight - innerHeight - 150)); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const z = (s) => +getComputedStyle(document.querySelector(s)).zIndex || 0; return { fg: z('#contact .ct-fg'), words: z('#contact .ct-in') }; });
    log(r.words > r.fg, `Skyline behind contact on ${page} @${w}`, `contact words layer ${r.words}, skyline layer ${r.fg}`);
  } catch (e) { log(false, `Skyline behind contact on ${page} @${w}`, e.message.split('\n')[0]); }
  await ctx.close();
}
for (const w of [390, 768, 1024, 1440]) {
  const ctx = await ctxFor(w); const p = await ctx.newPage();
  try {
    await p.goto(base + '/about', { waitUntil: 'load' }); await p.waitForTimeout(1000);
    const r = await p.evaluate(() => ({ nav: Math.round(document.querySelector('nav[data-metal]').getBoundingClientRect().bottom), card: Math.round(document.querySelector('#glance .gl-card').getBoundingClientRect().top) }));
    log(r.card >= r.nav + 8, `/about first card clear of the nav @${w}`, `nav ends ${r.nav}px, card starts ${r.card}px`);
  } catch (e) { log(false, `/about first card clear of the nav @${w}`, e.message.split('\n')[0]); }
  await ctx.close();
}
for (const w of [390, 768, 1024, 1280, 1440]) {
  const ctx = await ctxFor(w); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  try {
    await p.goto(base + '/', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    await p.evaluate(() => scrollTo(0, 2500)); await p.waitForTimeout(500); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
    const js = errs.filter((e) => !/Failed to load resource|youtube|ERR_/i.test(e));
    log(!js.length, `Home loads without script errors @${w}`, js.length ? js.slice(0, 2).join(' ; ') : 'none');
  } catch (e) { log(false, `Home loads without script errors @${w}`, e.message.split('\n')[0]); }
  await ctx.close();
}


/* 6. The KL skyline never crosses the contact rows (email, LinkedIn, Read the CV) at any scroll position, home and /about, 5 widths.
      Pixel check: the rows area is captured with the skyline shown and hidden; any visible difference means the towers reach it. */
const diffPage = await (await browser.newContext()).newPage();
async function pixelDiff(a, b) {
  return diffPage.evaluate(async ([a, b]) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const x = c.getContext('2d');
    x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
    x.clearRect(0, 0, c.width, c.height); x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 60) n++;
    return n;
  }, [a.toString('base64'), b.toString('base64')]);
}
for (const w of [390, 768, 1024, 1280, 1440]) for (const page of ['/', '/about']) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : (w < 900 ? 1024 : 800) }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage();
  try {
    await p.goto(base + page, { waitUntil: 'load' }); await p.waitForTimeout(800);
    const worst = [];
    for (const back of [600, 450, 300, 200, 100, 0]) {
      await p.evaluate((b) => scrollTo(0, document.documentElement.scrollHeight - innerHeight - b), back); await p.waitForTimeout(1500); // let the fade-in finish so only the skyline differs
      const box = await p.evaluate(() => { const r = document.querySelector('#contact .ct-acts').getBoundingClientRect();
        const t = Math.max(0, r.top - 4), btm = Math.min(innerHeight, r.bottom + 4); return btm - t > 4 ? { x: Math.max(0, r.left - 4), y: t, width: Math.min(innerWidth, r.right + 4) - Math.max(0, r.left - 4), height: btm - t } : null; });
      if (!box) continue;
      const shown = await p.screenshot({ clip: box });
      await p.evaluate(() => { document.querySelector('#contact .ct-fg').style.visibility = 'hidden'; });
      const hidden = await p.screenshot({ clip: box });
      await p.evaluate(() => { document.querySelector('#contact .ct-fg').style.visibility = ''; });
      const n = await pixelDiff(shown, hidden); if (n > 20) worst.push(`${n}px at ${back}px from the end`);
    }
    log(!worst.length, `Skyline clear of contact rows on ${page} @${w}`, worst.length ? 'towers cross the rows: ' + worst.join(', ') : 'clear at 6 scroll positions');
  } catch (e) { log(false, `Skyline clear of contact rows on ${page} @${w}`, e.message.split('\n')[0]); }
  await ctx.close();
}

await browser.close();
const fails = rows.filter((x) => !x).length;
console.log(`\n${rows.length - fails}/${rows.length} passed against ${base}`);
process.exit(fails ? 1 : 0);
