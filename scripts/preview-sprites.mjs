// Renders the real-footage poses through the app's own renderer (off-screen) into PNGs for review.
// Usage: node scripts/preview-sprites.mjs <outDir>
import { _electron as electron } from 'playwright-core';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const out = process.argv[2] ?? 'docs/previews/sprites';
fs.mkdirSync(out, { recursive: true });
const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-spr-'));
fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({ firstRunComplete: true, ai: { provider: 'offline' }, voice: { ttsEnabled: false }, teleport: { auto: false }, character: { glitchEffects: true } }));
const app = await electron.launch({ args: [process.cwd()], env: { ...process.env, CAPRI_TEST: '1', CAPRI_OFFSCREEN: '1', CAPRI_NO_DEV_KEY: '1', CAPRI_USER_DATA: ud } });
const page = await app.firstWindow();
await page.waitForFunction(() => window.__capriDebug?.sprite?.ready);
await page.evaluate(() => window.__capriDebug.manual(true));
const shots = [
  ['stand_air', "d.setSurface('air'); d.behavior.setPosture('stand')"],
  ['sit_taskbar', "d.setSurface('taskbar'); d.behavior.setPosture('sit_edge')"],
  ['recline_taskbar', "d.setSurface('taskbar'); d.behavior.setPosture('recline')"],
  ['sleep_window', "d.setSurface('window'); d.behavior.setPosture('sit_edge'); d.behavior.state = 'sleeping'"],
  ['glitch_burst', "d.setSurface('air'); d.behavior.state = 'idle'; d.behavior.setPosture('stand'); d.sprite.glitchNow('tear')"],
  ['shatter', "d.sprite.glitchNow('shatter')"],
  ['turned_left', "d.sprite.glitchNow('slice'); d.force({ turn: -1 })"],
];
for (const [name, code] of shots) {
  const data = await page.evaluate((code) => { const d = window.__capriDebug; d.force(null); eval(code); d.step(1 / 30, name === 'glitch_burst' || name === 'shatter' ? 3 : 40); return d.grab(); }, code).catch(async () => page.evaluate((code) => { const d = window.__capriDebug; eval(code); d.step(1 / 30, 20); return d.grab(); }, code));
  fs.writeFileSync(path.join(out, `${name}.webp`), Buffer.from(data.split(',')[1], 'base64'));
  console.log(name, await page.evaluate(() => window.__capriDebug.spritePose));
}
await app.close();
