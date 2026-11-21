// Home, About and CV must show the same work history: all three render from experience.js.
// Run: node tests/experience.mjs [baseUrl]   (default http://localhost:8080)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const { chromium } = pw;
const base = process.argv[2] || 'http://localhost:8080';
const pick = {
  '/': () => [...document.querySelectorAll('#skills .sk-exp li')].map(l => l.innerText),
  '/about': () => [...document.querySelectorAll('#about .wk-list li')].map(l => l.innerText),
  '/cv': () => [...document.querySelectorAll('[data-exp] .item, [data-exp="cv-edu"] p')].map(l => l.innerText),
};
const need = ['Product Manager', 'Creative Lead', 'Social Media Manager', 'Fortifi Sdn Bhd', 'OwnershipCoin',
  'The Chill Gallery & Gacha', 'oeru', 'Designer & Production Assistant', 'Phyn Studio', '2023 — 2024',
  'Purchasing & Merchandising', 'Citychemo Manufacturing Sdn Bhd', '2018 — 2019', 'Fashion & Apparel Design', 'SML Academy', '2019 — 2022'];
const b = await chromium.launch();
let fail = 0;
for (const [path, fn] of Object.entries(pick)) {
  const pg = await b.newPage();
  await pg.goto(base + path + '?impact=0', { waitUntil: 'load' });
  await pg.waitForTimeout(1200);
  const txt = (await pg.evaluate(fn)).join('\n');
  const miss = need.filter(n => !txt.includes(n) && !(path === '/' && /OwnershipCoin|The Chill Gallery|^oeru$/.test(n)));
  const eduOk = /Education[\s\S]*SML Academy|SML Academy[\s\S]*Education/.test(txt) || path === '/cv';
  console.log(path, miss.length || !eduOk ? 'FAIL missing: ' + miss.join(', ') + (eduOk ? '' : ' (education label)') : 'ok');
  if (miss.length || !eduOk) fail++;
  await pg.close();
}
await b.close();
process.exit(fail ? 1 : 0);
