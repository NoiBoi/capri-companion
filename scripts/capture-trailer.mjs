// Captures frame-perfect footage of the real Capri rig for the trailer.
// The renderer runs in deterministic "manual" mode: every frame advances exactly 1/30 s
// of the real animation system (behavior, clips, postures, teleport FX, lip-sync) and is
// exported as a transparent WebP. Runs off-screen. Usage:
//   node scripts/capture-trailer.mjs full   (full-body shots)
//   node scripts/capture-trailer.mjs face   (high-res face close-ups)
import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const mode = process.argv[2] ?? 'full';
const outRoot = path.join(root, 'trailer', 'public', 'cap');
const only = process.argv[3]?.split(',');
const FPS = 30;

const FULL = [
  { name: 'reveal_in', frames: 96, at: { 0: "fx('in')", 17: "clip('reveal_spread')" } },
  { name: 'tp_out', frames: 16, at: { 0: "fx('out')" } },
  { name: 'tp_in', frames: 54, at: { 0: "fx('in')", 17: "clip('tilt_grin')" } },
  { name: 'sit_idle', frames: 150, setup: "posture('sit_edge')" },
  { name: 'sit_smug', frames: 84, setup: "posture('sit_edge')", at: { 8: "clip('smug')" } },
  { name: 'perch_look', frames: 120, setup: "posture('sit_edge'); d.setPointer(0.3, 0.7)", each: 'd.setPointer(0.3 - i / 200, 0.7)' },
  { name: 'peek', frames: 96, setup: "surface('edge_left'); posture('peek_left')" },
  { name: 'dash', frames: 48, setup: 'd.setDashing(1)' },
  { name: 'recline', frames: 120, setup: "surface('air'); posture('recline')", at: { 40: "clip('yawn')" } },
  { name: 'air_sit', frames: 90, setup: "surface('air'); posture('air_sit')" },
  { name: 'power', frames: 96, setup: "posture('power_stance')", at: { 10: "clip('many_eyes')" } },
  { name: 'contra_wave', frames: 84, setup: "posture('contrapposto')", at: { 6: "clip('wave_big')" } },
  { name: 'talk_sit', frames: 150, setup: "posture('sit_edge'); d.setPhase('speaking'); d.lips(true)" },
  { name: 'watch', frames: 96, setup: "posture('contrapposto')", each: 'd.setPointer(-1 + i / 48, -0.1 + 0.2 * Math.sin(i / 15))' },
  { name: 'menace_full', frames: 66, at: { 4: "clip('menace')" } },
  { name: 'reach', frames: 66, at: { 4: "clip('reach_claw')" } },
];
const FACE = [
  { name: 'f_menace', frames: 60, at: { 4: "clip('menace')" } },
  { name: 'f_tilt', frames: 78, at: { 4: "clip('tilt_grin')" } },
  { name: 'f_smug', frames: 66, at: { 4: "clip('smug')" } },
  { name: 'f_maniac', frames: 60, at: { 4: "clip('maniac_grin')" } },
  { name: 'f_wink', frames: 42, at: { 4: "clip('wink')" } },
  { name: 'f_blank', frames: 54, at: { 4: "clip('blank_stare')" } },
  { name: 'f_many', frames: 60, at: { 4: "clip('many_eyes')" } },
  { name: 'f_surprise', frames: 42, at: { 2: "clip('surprise_flinch')" } },
  { name: 'f_talk', frames: 120, setup: "d.setPhase('speaking'); d.lips(true)" },
  { name: 'f_idle', frames: 90, each: 'd.setPointer(0.15 * Math.sin(i / 20), 0.05)' },
];
const clips = (mode === 'face' ? FACE : FULL).filter((c) => !only || only.includes(c.name));

const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-cap-'));
fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({
  firstRunComplete: true, ai: { provider: 'offline' }, voice: { ttsEnabled: false }, teleport: { auto: false },
  character: { scale: 2.5, glitchEffects: true, animationIntensity: 1, fpsCap: 60 },
}));
const app = await electron.launch({
  args: [root],
  env: { ...process.env, CAPRI_TEST: '1', CAPRI_OFFSCREEN: '1', CAPRI_NO_DEV_KEY: '1', CAPRI_USER_DATA: ud, ...(mode === 'face' ? { CAPRI_CAPTURE_SCALE: '7' } : {}) },
});
const page = await app.firstWindow();
await page.waitForFunction(() => window.__capriDebug);
await page.waitForTimeout(800);
const [cw, ch] = await page.evaluate(() => window.__capriDebug.canvasSize());
// face crop: rig box x 70..270, y 92..242 (head + crown + mask), 4:3
const k = cw / 340;
const faceCrop = { x: Math.round(70 * k), y: Math.round(92 * k), w: Math.round(200 * k), h: Math.round(150 * k) };
console.log(`canvas ${cw}x${ch}  ${mode === 'face' ? `face crop ${faceCrop.w}x${faceCrop.h}` : 'full frame'}`);

// page-side helpers
await page.evaluate(() => {
  const d = window.__capriDebug;
  window.__cap = {
    d,
    reset() {
      d.force(null); d.setPhase('idle'); d.setPointer(null); d.setDashing(0); d.lips(false); d.setSurface('taskbar'); d.setIdle(0);
      d.behavior.clip = null; d.behavior.state = 'idle'; d.behavior.setPosture('stand');
      d.fx.phase = null; d.fx.hidden = false;
    },
    run(code, i) { const d = window.__capriDebug; const fx = (ph) => d.teleportFx(ph, 7); const clip = (n) => d.behavior.playClip(n); const posture = (n) => d.behavior.setPosture(n); const surface = (s) => d.setSurface(s); void fx; void clip; void posture; void surface; void i; eval(code); },
  };
  d.manual(true);
});

for (const c of clips) {
  const dir = path.join(outRoot, c.name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  await page.evaluate((setup) => { window.__cap.reset(); if (setup) window.__cap.run(setup, 0); window.__cap.d.step(1 / 30, 75); }, c.setup ?? null); // settle 2.5 s
  if (c.setup) await page.evaluate((setup) => window.__cap.run(setup, 0), c.setup); // re-assert after settle
  const t0 = Date.now();
  for (let i = 0; i < c.frames; i++) {
    const data = await page.evaluate(({ i, at, each, crop }) => {
      if (each) window.__cap.run(each, i);
      if (at && at[i]) window.__cap.run(at[i], i);
      window.__cap.d.step(1 / 30);
      return window.__cap.d.grab(crop ?? undefined, 0.9);
    }, { i, at: c.at ?? null, each: c.each ?? null, crop: mode === 'face' ? faceCrop : null });
    fs.writeFileSync(path.join(dir, `${String(i).padStart(4, '0')}.webp`), Buffer.from(data.split(',')[1], 'base64'));
  }
  const size = fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
  console.log(`${c.name.padEnd(12)} ${c.frames} frames  ${(size / 1048576).toFixed(1)} MB  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
// manifest for the trailer (frame counts + pixel size per clip)
const manifestFile = path.join(outRoot, 'manifest.json');
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
for (const c of clips) manifest[c.name] = { frames: c.frames, width: mode === 'face' ? faceCrop.w : cw, height: mode === 'face' ? faceCrop.h : ch, fps: FPS };
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
await app.close();
try { fs.rmSync(ud, { recursive: true, force: true, maxRetries: 5 }); } catch { /* */ }
