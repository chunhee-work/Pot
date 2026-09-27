/* Runs the full reel test on every reel, one after the other (they share the
   machine's CPU, and several checks time real playback), and fails if any
   reel fails.

   node tests/run-all.mjs            (exit code 1 if any reel fails)
   SKIP_CHAPTERS=1 node tests/run-all.mjs   (skip the per-chapter gates) */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGES = ['reel', 'reel2', 'reel3'];
const here = path.dirname(fileURLToPath(import.meta.url));

const summary = [];
for (const page of PAGES) {
  console.log(`\n━━ /${page} ━━`);
  let tail = '';
  const code = await new Promise(res => {
    const child = spawn(process.execPath, [path.join(here, 'reel.smoke.mjs'), '--page', page], { stdio: ['ignore', 'pipe', 'inherit'] });
    child.stdout.on('data', d => { process.stdout.write(d); tail = (tail + d).slice(-400); });
    child.on('error', e => { console.error(e); res(1); });
    child.on('close', c => res(c ?? 1));
  });
  const line = (tail.match(/[^\n]*passed[^\n]*/g) || []).pop() || `/${page}: did not finish`;
  summary.push({ page, code, line });
}

console.log('\n━━ all reels ━━');
for (const s of summary) console.log(`${s.code === 0 ? 'PASS' : 'FAIL'}  ${s.line.trim()}`);
process.exit(summary.every(s => s.code === 0) ? 0 : 1);
