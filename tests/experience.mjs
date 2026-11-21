// Home, About and CV must show the same work history: all three render from experience.js.
// Run: node tests/experience.mjs [baseUrl]   (default http://localhost:8080)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const { chromium } = pw;
const base = process.argv[2] || 'http://localhost:8080';
const pick = {
  '/': () => [...document.querySelectorAll('[data-exp="home"] li')].map(l => l.innerText.replace(/\s+/g, ' ').trim()),
  '/about': () => [...document.querySelectorAll('[data-exp="about"] li')].map(l => l.innerText.replace(/\s+/g, ' ').trim()),
  '/cv': () => [...document.querySelectorAll('[data-exp="cv"] .item')].map(l => l.innerText.replace(/\s+/g, ' ').trim()),
};
// every role, with its own dates, must appear on every page, in the same order
const roles = [['Sep 2026 — now', 'Product Manager', 'oeru'], ['Mar 2026 — Sep 2026', 'Creative Lead', 'The Chill Gallery & Gacha'],
  ['Mar 2025 — Mar 2026', 'Social Media Manager', 'OwnershipCoin'], ['2023 — 2024', 'Designer & Production Assistant', 'Phyn Studio'],
  ['2018 — 2019', 'Purchasing & Merchandising', 'Citychemo Manufacturing Sdn Bhd']];
const eduSel = { '/': '[data-exp="home-edu"]', '/about': '[data-exp="about-edu"]', '/cv': '[data-exp="cv-edu"]' };
const b = await chromium.launch();
let fail = 0;
for (const [path, fn] of Object.entries(pick)) {
  const pg = await b.newPage();
  await pg.goto(base + path + '?impact=0', { waitUntil: 'load' });
  await pg.waitForTimeout(1200);
  const rows = await pg.evaluate(fn);
  const bad = [];
  if (rows.length !== roles.length) bad.push(rows.length + ' rows, expected ' + roles.length);
  roles.forEach((r, i) => { if (!rows[i] || !r.every((x) => rows[i].toLowerCase().includes(x.toLowerCase()))) bad.push('row ' + (i + 1) + ' ≠ ' + r.join(' / ')); });
  if (rows.some((t) => /SML Academy|Fashion/.test(t))) bad.push('education inside the experience list');
  const edu = await pg.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText : ''; }, eduSel[path]);
  if (!/SML Academy/.test(edu) || !/2019 — 2022/.test(edu)) bad.push('education block');
  const imp = await pg.evaluate(() => document.querySelectorAll('.exp-imp,.wk-imp,.cv-imp,.imp-todo').length);
  if (imp) bad.push(imp + ' impact blocks rendered');
  console.log(path, bad.length ? 'FAIL ' + bad.join('; ') : 'ok');
  if (bad.length) fail++;
  await pg.close();
}
await b.close();
process.exit(fail ? 1 : 0);
