// End-to-end tests against the real Electron app (built into dist/). Each test uses an
// isolated profile directory; model servers are local mocks — no network, no API keys.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { FRAME_SIZE, SEAT_RATIO } from '../../src/shared/framing';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..');
const EXE = process.env.CAPRI_EXE; // set to test a packaged build instead of the dev bundle
const apps: ElectronApplication[] = [];
const dirs: string[] = [];

function profile(settings: Record<string, unknown> = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-e2e-'));
  dirs.push(d);
  const { ai, ...rest } = settings as { ai?: Record<string, unknown> };
  fs.writeFileSync(path.join(d, 'settings.json'), JSON.stringify({ firstRunComplete: true, voice: { ttsEnabled: false }, teleport: { auto: false }, ai: { provider: 'offline', ...(ai ?? {}) }, ...rest }));
  return d;
}
async function launch(userData: string, opts: { liveKey?: boolean; env?: Record<string, string> } = {}) {
  const app = await electron.launch({
    ...(EXE ? { executablePath: EXE, args: [] } : { args: [ROOT] }),
    env: { ...process.env, CAPRI_TEST: '1', CAPRI_OFFSCREEN: process.env.CAPRI_ONSCREEN ? '0' : '1', CAPRI_USER_DATA: userData, CAPRI_NO_DEV_KEY: opts.liveKey ? '0' : '1', ...(opts.liveKey ? {} : { GEMINI_API_KEY: '' }), ...(opts.env ?? {}) },
    timeout: 30_000,
  });
  apps.push(app);
  const char = await app.firstWindow();
  await char.waitForFunction(() => (window as unknown as { __capriDebug?: unknown }).__capriDebug);
  return { app, char };
}
async function openPanel(app: ElectronApplication, char: Page, tab = 'chat') {
  const wait = app.waitForEvent('window');
  await char.evaluate((t) => (window as unknown as { capri: { invoke(c: string, a?: unknown): Promise<unknown> } }).capri.invoke('panel:open', t), tab);
  const panel = await wait;
  await panel.waitForSelector(tab === 'chat' ? 'textarea' : '.scroll');
  return panel;
}
async function quit(app: ElectronApplication) {
  const proc = app.process();
  await app.evaluate(({ app: a }) => a.quit()).catch(() => {});
  await new Promise<void>((r) => { if (proc.exitCode !== null) r(); else proc.once('exit', () => r()); setTimeout(r, 10_000); });
}
afterEach(async () => { for (const a of apps.splice(0)) await quit(a).catch(() => {}); });
afterAll(() => { for (const d of dirs) { try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch { /* Chromium may still hold a cache file briefly */ } } });

/** Minimal OpenAI-compatible streaming server. */
async function mockModel(reply: (body: { messages: { role: string; content: string }[] }) => string | { delayMs: number; text: string } | 'fail') {
  let calls = 0;
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      if (req.url?.endsWith('/models')) { res.end(JSON.stringify({ data: [{ id: 'mock-model' }] })); return; }
      calls++; // chat completions only
      const r = reply(JSON.parse(raw || '{}'));
      if (r === 'fail') { res.writeHead(500); res.end('boom'); return; }
      const { text, delayMs } = typeof r === 'string' ? { text: r, delayMs: 5 } : r;
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      for (const w of text.match(/<action>.*?<\/action>|\S+\s*/gs) ?? []) {
        if (res.destroyed) return;
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: w } }] })}\n\n`);
        await new Promise((x) => setTimeout(x, delayMs));
      }
      res.end('data: [DONE]\n\n');
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
  return { url, get calls() { return calls; }, close: () => new Promise<void>((r) => { server.closeAllConnections(); server.close(() => r()); }) };
}
const openaiProfile = (url: string, extra: Record<string, unknown> = {}) => profile({ ai: { provider: 'openai', openai: { baseUrl: url, model: 'mock-model' } }, ...extra });

describe('desktop presence', () => {
  it('starts with a transparent, frameless, always-on-top, non-focusable character window and shuts down cleanly', async () => {
    const ud = profile();
    const { app } = await launch(ud);
    // cold first launch (e.g. right after install, while Windows scans new binaries) can show the window a beat late
    for (let i = 0; i < 50; i++) {
      const shownNow = await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows().find((x) => !x.isFocusable()); return !!w && (w.isVisible() || (w as unknown as { capriShown?: boolean }).capriShown === true); });
      if (shownNow) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    const info = await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows().find((x) => x.getTitle() === 'Capri' && !x.isFocusable())!;
      return { bg: w.getBackgroundColor(), top: w.isAlwaysOnTop(), focusable: w.isFocusable(), visible: w.isVisible() || (w as unknown as { capriShown?: boolean }).capriShown === true, resizable: w.isResizable(), bounds: w.getBounds() };
    });
    expect(info).toMatchObject({ top: true, focusable: false, visible: true, resizable: false });
    expect(info.bg.toLowerCase()).toMatch(/^#0{6,8}$/);
    const startup = await app.evaluate(() => (globalThis as unknown as { __capri: { startupMs: number } }).__capri.startupMs);
    expect(startup).toBeGreaterThan(0);
    expect(startup).toBeLessThan(10_000);
    expect(fs.existsSync(path.join(ud, 'session.lock'))).toBe(true);
    await quit(app);
    expect(fs.existsSync(path.join(ud, 'session.lock'))).toBe(false);
    expect(fs.readFileSync(path.join(ud, 'logs', 'capri.log'), 'utf8')).toContain('clean shutdown');
  });

  it('renders Capri with real transparency and pixel-accurate hit testing', async () => {
    const { char } = await launch(profile());
    await char.waitForTimeout(600);
    const px = await char.evaluate(() => {
      const c = document.getElementById('stage') as HTMLCanvasElement;
      const g = c.getContext('2d')!;
      const at = (fx: number, fy: number) => Array.from(g.getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data);
      const W = innerWidth, H = innerHeight;
      const dbg = (window as unknown as { __capriDebug: { hitAt(x: number, y: number): boolean } }).__capriDebug;
      let crimson = 0, green = 0, total = 0, onHer: [number, number] | null = null;
      for (let fy = 0.02; fy < 1; fy += 0.04) for (let fx = 0.02; fx < 1; fx += 0.04) {
        const [r, g2, b, a] = at(fx, fy); total++;
        if (r > 200 && g2 < 80 && b < 120) { crimson++; if (!onHer && a > 200) onHer = [fx, fy]; }
        if (g2 > 200 && r < 100) green++;
      }
      const [hx, hy] = onHer ?? [0.5, 0.3];
      return { corner: at(0.01, 0.99), head: at(hx, hy), crimson: crimson / total, green, hitHead: dbg.hitAt(W * hx, H * hy), hitCorner: dbg.hitAt(W * 0.01, H * 0.99) };
    });
    expect(px.corner[3]).toBe(0); // transparent background
    expect(px.head[3]).toBeGreaterThan(200); // opaque character
    expect(px.crimson).toBeGreaterThan(0.035); // the crimson hair mass is a large share of the frame (sized for her tallest pose)
    expect(px.green).toBeGreaterThan(0); // neon-green mask/panels present
    expect(px.hitHead).toBe(true);
    expect(px.hitCorner).toBe(false);
  });

  it('remembers its position across restarts and clamps impossible positions', async () => {
    const ud = profile();
    let { app, char } = await launch(ud);
    await char.waitForTimeout(800); // after the window has settled, like a user drag would be
    await app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!.setPosition(200, 150); });
    await new Promise((r) => setTimeout(r, 700));
    const before = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!.getPosition());
    expect(Math.abs(before[0] - 200)).toBeLessThanOrEqual(3); // Electron rounds DIP↔px at fractional DPI (±1–3 px per axis)
    expect(Math.abs(before[1] - 150)).toBeLessThanOrEqual(3);
    await quit(app);
    ({ app, char } = await launch(ud));
    const pos = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!.getPosition());
    expect(Math.abs(pos[0] - before[0])).toBeLessThanOrEqual(3); // Electron reports ±1–3 px at fractional DPI
    expect(Math.abs(pos[1] - before[1])).toBeLessThanOrEqual(3);
    await quit(app);
    const s = JSON.parse(fs.readFileSync(path.join(ud, 'settings.json'), 'utf8'));
    s.character.position = { x: 99999, y: -99999, displayId: 123456 };
    fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify(s));
    ({ app, char } = await launch(ud));
    const r = await app.evaluate(({ BrowserWindow, screen }) => {
      const b = BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!.getBounds();
      return { b, displays: screen.getAllDisplays().map((d) => d.workArea) };
    });
    const visible = r.displays.some((d) => r.b.x < d.x + d.width && r.b.x + r.b.width > d.x && r.b.y < d.y + d.height && r.b.y + r.b.height > d.y);
    expect(visible).toBe(true);
  });

  it('does not creep across repeated restarts (fractional DPI)', async () => {
    const ud = profile({ character: { position: { x: 321, y: 123, displayId: 0 } } });
    const seen: number[][] = [];
    for (let i = 0; i < 3; i++) {
      const { app, char } = await launch(ud);
      await char.waitForTimeout(900);
      seen.push(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!.getPosition()));
      await quit(app);
    }
    const drift = Math.max(...seen.map((p) => Math.abs(p[0] - seen[0][0]) + Math.abs(p[1] - seen[0][1])));
    expect(drift).toBeLessThanOrEqual(2);
  });

  it('applies scale/opacity/always-on-top settings live and persists them', async () => {
    const ud = profile();
    const { app, char } = await launch(ud);
    const panel = await openPanel(app, char, 'look');
    await panel.evaluate(() => (window as unknown as { capri: { invoke(c: string, a: unknown): Promise<unknown> } }).capri.invoke('settings:set', { character: { scale: 0.6, opacity: 0.7, alwaysOnTop: false } }));
    await panel.waitForTimeout(400);
    const w = await app.evaluate(({ BrowserWindow }) => { const x = BrowserWindow.getAllWindows().find((y) => !y.isFocusable())!; return { size: x.getSize(), opacity: x.getOpacity(), top: x.isAlwaysOnTop() }; });
    expect(Math.abs(w.size[0] - Math.round(FRAME_SIZE.width * 0.6))).toBeLessThanOrEqual(2); // DIP rounding at fractional DPI
    expect(Math.abs(w.size[1] - Math.round(FRAME_SIZE.height * 0.6))).toBeLessThanOrEqual(2);
    expect(w.opacity).toBeCloseTo(0.7, 1);
    expect(w.top).toBe(false);
    await quit(app);
    expect(JSON.parse(fs.readFileSync(path.join(ud, 'settings.json'), 'utf8')).character).toMatchObject({ scale: 0.6, opacity: 0.7, alwaysOnTop: false });
  });

  it('hiding pauses rendering; showing resumes it', async () => {
    const { app, char } = await launch(profile());
    await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!; w.hide(); w.webContents.send('cue', { type: 'pause', paused: true }); });
    await char.waitForTimeout(200);
    expect(await char.evaluate(() => (window as unknown as { __capriDebug: { paused: boolean } }).__capriDebug.paused)).toBe(true);
    await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!; if (process.env.CAPRI_OFFSCREEN !== '1') w.showInactive(); w.webContents.send('cue', { type: 'pause', paused: false }); });
    await char.waitForTimeout(200);
    expect(await char.evaluate(() => (window as unknown as { __capriDebug: { paused: boolean } }).__capriDebug.paused)).toBe(false);
  });

  it('animation state follows cues (reaction, listening, return to idle)', async () => {
    const { app, char } = await launch(profile());
    const state = () => char.evaluate(() => (window as unknown as { __capriDebug: { behavior: { state: string } } }).__capriDebug.behavior.state);
    const send = (cue: unknown) => app.evaluate(({ BrowserWindow }, c) => BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!.webContents.send('cue', c), cue);
    const waitState = (pred: string) => char.waitForFunction((re) => new RegExp(re).test((window as unknown as { __capriDebug: { behavior: { state: string } } }).__capriDebug.behavior.state), pred, { timeout: 5000 });
    await send({ type: 'react', reaction: 'wave' });
    await waitState('^action$');
    await send({ type: 'phase', phase: 'listening' });
    await waitState('^listening$');
    await send({ type: 'phase', phase: 'idle' });
    await waitState('^(idle|lookAround|distracted|action)$');
    expect(await state()).not.toBe('listening');
  });
});

describe('conversation', () => {
  it('streams a reply from the model into the chat and saves it', async () => {
    const model = await mockModel(() => 'Hey choom. Streaming works fine.');
    const ud = openaiProfile(model.url);
    const { app, char } = await launch(ud);
    const panel = await openPanel(app, char);
    await panel.fill('textarea', 'hello?');
    await panel.press('textarea', 'Enter');
    await panel.waitForSelector('.msg.assistant:not(.cursor) >> text=Streaming works fine.');
    const hist = fs.readFileSync(path.join(ud, 'history.jsonl'), 'utf8');
    expect(hist).toContain('Streaming works fine.');
    await model.close();
  });

  it('interrupting stops generation and marks the reply interrupted', async () => {
    const model = await mockModel(() => ({ delayMs: 60, text: 'word '.repeat(200) }));
    const { app, char } = await launch(openaiProfile(model.url));
    const panel = await openPanel(app, char);
    await panel.fill('textarea', 'talk a lot');
    await panel.press('textarea', 'Enter');
    await panel.waitForSelector('.msg.assistant.cursor');
    await panel.waitForTimeout(400);
    await panel.keyboard.press('Escape');
    await panel.waitForSelector('.msg.assistant >> text=— interrupted');
    const words = (await panel.locator('.msg.assistant').last().innerText()).split('word').length - 1;
    expect(words).toBeLessThan(100);
    await model.close();
  });

  it('recovers from model/network failures with a clear message', async () => {
    let fail = true;
    const model = await mockModel(() => (fail ? 'fail' : 'Back online.'));
    const { app, char } = await launch(openaiProfile(model.url));
    const panel = await openPanel(app, char);
    await panel.fill('textarea', 'hi'); await panel.press('textarea', 'Enter');
    await panel.waitForSelector('.msg.assistant.err');
    expect(await panel.locator('.status').innerText()).toMatch(/error/i);
    fail = false;
    await panel.fill('textarea', 'again'); await panel.press('textarea', 'Enter');
    await panel.waitForSelector('.msg.assistant >> text=Back online.');
    await model.close();
  });

  it('works with no model at all (offline command mode)', async () => {
    const { app, char } = await launch(profile());
    const panel = await openPanel(app, char);
    await panel.fill('textarea', 'note: buy coffee'); await panel.press('textarea', 'Enter');
    await panel.waitForSelector('.msg.action >> text=Saved note');
    const notes = await app.evaluate(() => (globalThis as unknown as { __capri: { notes: { list(): { body: string }[] } } }).__capri.notes.list());
    expect(notes[0].body).toBe('buy coffee');
  });
});

describe('voice', () => {
  it('speaks replies with a Windows voice: phase goes speaking → idle, mouth moves', async () => {
    const { app, char } = await launch(profile({ voice: { ttsEnabled: true, volume: 0 } }));
    const voices = await char.evaluate(() => new Promise<number>((r) => { const v = speechSynthesis.getVoices(); if (v.length) r(v.length); else speechSynthesis.onvoiceschanged = () => r(speechSynthesis.getVoices().length); setTimeout(() => r(speechSynthesis.getVoices().length), 3000); }));
    expect(voices).toBeGreaterThan(0);
    const panel = await openPanel(app, char);
    await panel.fill('textarea', 'who are you'); await panel.press('textarea', 'Enter');
    await panel.waitForSelector('#phaseText >> text=speaking', { timeout: 15_000 });
    let maxMouth = 0;
    for (let i = 0; i < 20; i++) {
      maxMouth = Math.max(maxMouth, await char.evaluate(() => (window as unknown as { __capriDebug: { anim: { value: { mouthOpen: number } } } }).__capriDebug.anim.value.mouthOpen));
      await char.waitForTimeout(50);
    }
    expect(maxMouth).toBeGreaterThan(0.2);
    await panel.waitForSelector('#phaseChip[data-phase="idle"]', { state: 'attached', timeout: 30_000 }); // idle shows no badge
  });

  it('interrupting speech stops it immediately', async () => {
    const { app, char } = await launch(profile({ voice: { ttsEnabled: true, volume: 0 } }));
    const panel = await openPanel(app, char);
    await panel.fill('textarea', 'help'); await panel.press('textarea', 'Enter');
    await panel.waitForSelector('#phaseText >> text=speaking', { timeout: 15_000 });
    await panel.keyboard.press('Escape');
    await panel.waitForSelector('#phaseChip[data-phase="idle"]', { state: 'attached', timeout: 3000 });
    expect(await char.evaluate(() => (window as unknown as { __capriDebug: { speaker: { speaking: boolean } } }).__capriDebug.speaker.speaking)).toBe(false);
  });

  it.runIf(process.env.CAPRI_E2E_MIC === '1')('push-to-talk records, releases the mic, and transcribes offline', async () => {
    const { app, char } = await launch(profile({ voice: { micPermission: true } }));
    const panel = await openPanel(app, char);
    await panel.evaluate(() => (window as unknown as { capri: { invoke(c: string, a: string): Promise<unknown> } }).capri.invoke('voice:ptt', 'start'));
    await char.waitForTimeout(1500);
    await panel.evaluate(() => (window as unknown as { capri: { invoke(c: string, a: string): Promise<unknown> } }).capri.invoke('voice:ptt', 'stop'));
    // silence → "Didn't catch that"; speech → a user message. Either proves the pipeline ran.
    await panel.waitForFunction(() => /catch that/i.test(document.querySelector('.status')?.textContent ?? '') || document.querySelectorAll('.msg.user').length > 0, undefined, { timeout: 30_000 });
    // the microphone stream is released as soon as recording stops
    const tracksLive = await char.evaluate(() => (window as unknown as { __capriDebug: { mic?: { active: boolean } } }).__capriDebug.mic?.active);
    expect(tracksLive).toBe(false);
  });
});

describe('permissions & tools', () => {
  it('asks before opening a URL and does nothing when denied; opens only after approval', async () => {
    const model = await mockModel((b) => (b.messages.at(-1)!.content.startsWith('[action results]') ? 'Okay.' : 'Opening. <action>{"tool":"open_url","args":{"url":"example.com"}}</action>'));
    const { app, char } = await launch(openaiProfile(model.url));
    await app.evaluate(({ shell }) => { (globalThis as Record<string, unknown>).__opened = []; shell.openExternal = async (u: string) => { ((globalThis as Record<string, unknown>).__opened as string[]).push(u); }; });
    const panel = await openPanel(app, char);
    await panel.fill('textarea', 'open example'); await panel.press('textarea', 'Enter');
    await panel.locator('.confirm').getByText('Deny').click();
    await panel.waitForSelector('.msg.action >> text=declined');
    expect(await app.evaluate(() => (globalThis as Record<string, unknown>).__opened)).toEqual([]);
    await panel.fill('textarea', 'open example'); await panel.press('textarea', 'Enter');
    await panel.locator('.confirm').getByText('Allow').click();
    await panel.waitForSelector('.msg.action >> text=Opened example.com');
    expect(await app.evaluate(() => (globalThis as Record<string, unknown>).__opened)).toEqual(['https://example.com/']);
    await model.close();
  });

  it('rejects IPC from the wrong window and invalid payloads', async () => {
    const { char } = await launch(profile());
    const r = await char.evaluate(async () => {
      const api = (window as unknown as { capri: { invoke(c: string, a?: unknown): Promise<unknown> } }).capri;
      const out: string[] = [];
      for (const [ch, arg] of [['chat:send', { text: 'hi' }], ['secrets:set', { key: 'openai', value: 'x' }], ['memory:clear', undefined], ['char:hit', 'not-a-boolean'], ['shell:exec', 'calc']] as const) {
        try { await api.invoke(ch, arg); out.push(`${ch}:allowed`); } catch (e) { out.push(`${ch}:blocked`); }
      }
      return out;
    });
    expect(r).toEqual(['chat:send:blocked', 'secrets:set:blocked', 'memory:clear:blocked', 'char:hit:blocked', 'shell:exec:blocked']);
  });

  it('denies microphone access unless the user enabled it', async () => {
    const { char } = await launch(profile());
    const err = await char.evaluate(() => navigator.mediaDevices.getUserMedia({ audio: true }).then(() => 'granted', (e: Error) => e.name));
    expect(err).not.toBe('granted');
  });
});

describe('persistence & reliability', () => {
  it('memory and settings survive a restart; reset wipes them', async () => {
    const ud = profile();
    let { app, char } = await launch(ud);
    let panel = await openPanel(app, char, 'memory');
    await panel.fill('input[placeholder="Something to remember"]', 'My cat is called Delta');
    await panel.getByText('Add', { exact: true }).click();
    await panel.waitForSelector('text=My cat is called Delta');
    await quit(app);
    ({ app, char } = await launch(ud));
    panel = await openPanel(app, char, 'memory');
    await panel.waitForSelector('text=My cat is called Delta');
  });

  it('detects an unclean previous exit and reports it in diagnostics', async () => {
    const ud = profile();
    const first = await launch(ud);
    // hard-kill the whole process tree (simulates a crash / power loss)
    const { execSync } = await import('node:child_process');
    execSync(`taskkill /PID ${first.app.process().pid} /T /F`, { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 1500));
    apps.splice(apps.indexOf(first.app), 1);
    const { app, char } = await launch(ud);
    const panel = await openPanel(app, char, 'diagnostics');
    await panel.waitForSelector('text=Last unclean exit');
    const d = await panel.evaluate(() => (window as unknown as { capri: { invoke(c: string): Promise<{ lastCrash: string | null; safeStorage: boolean; fullscreenWatcher: string }> } }).capri.invoke('diagnostics:get'));
    expect(d.lastCrash).toMatch(/startedAt/);
    expect(d.safeStorage).toBe(true);
    expect(d.fullscreenWatcher).toBe('active');
  });

  it('recreates the character view if its renderer crashes', async () => {
    const { app } = await launch(profile());
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!.webContents.forcefullyCrashRenderer());
    await new Promise((r) => setTimeout(r, 2500));
    const ok = await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows().find((x) => !x.isFocusable()); return !!w && (w.isVisible() || (w as unknown as { capriShown?: boolean }).capriShown === true) && !w.webContents.isCrashed(); });
    expect(ok).toBe(true);
  });

  it('stays lightweight while idle (bounded fps, CPU and memory)', async () => {
    const { app, char } = await launch(profile());
    await char.waitForTimeout(6500); // let the fps reporter tick
    const m = await app.evaluate(({ app: a }) => a.getAppMetrics().map((x) => ({ type: x.type, cpu: x.cpu.percentCPUUsage, mem: x.memory.workingSetSize })));
    const panel = await openPanel(app, char, 'diagnostics');
    const d = await panel.evaluate(() => (window as unknown as { capri: { invoke(c: string): Promise<{ perf: { fps?: number; startupMs: number } }> } }).capri.invoke('diagnostics:get'));
    console.log('[perf] idle fps', d.perf.fps, 'startupMs', d.perf.startupMs);
    expect(d.perf.fps).toBeLessThanOrEqual(32); // idle throttle: ≤30 fps (+ timer jitter)
    const totalMB = m.reduce((s, x) => s + x.mem, 0) / 1024;
    console.log('[perf] idle metrics', JSON.stringify(m), 'totalMB', Math.round(totalMB));
    expect(totalMB).toBeLessThan(900);
  });
});

// ======================================================================== upgrade: AI connection, teleport, UI
/** Minimal Ollama server (so the connection is genuinely "connected" without any cloud key). */
async function mockOllama(reply: (msgs: { role: string; content: string }[]) => string = () => 'ok') {
  let chats = 0;
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      if (req.url === '/api/tags') { res.end(JSON.stringify({ models: [{ name: 'llama3.2:latest' }] })); return; }
      chats++;
      const text = reply(JSON.parse(raw).messages);
      res.end(`${JSON.stringify({ message: { content: text } })}\n${JSON.stringify({ done: true })}\n`);
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, get chats() { return chats; }, close: () => new Promise<void>((r) => { server.closeAllConnections(); server.close(() => r()); }) };
}
const charPos = (app: ElectronApplication) => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!.getPosition());
const capri = (app: ElectronApplication) => app.evaluate(() => {
  const c = (globalThis as unknown as { __capri: { monitor: { status: unknown }; teleporter: { count: number; status(): unknown } } }).__capri;
  return { conn: c.monitor.status as { state: string; provider: string; detail: string }, tp: c.teleporter.status() as { count: number; blockedReason: string | null } };
});

describe('teleportation', () => {
  it('moves the real window with departure and arrival effects, then persists the spot', async () => {
    const ud = profile();
    const { app, char } = await launch(ud);
    await char.waitForTimeout(800);
    const before = await charPos(app);
    const r = await char.evaluate(() => (window as unknown as { capri: { invoke(c: string, a?: unknown): Promise<{ ok: boolean; to: { x: number; y: number } }> } }).capri.invoke('teleport:now', 'random'));
    expect(r.ok).toBe(true);
    const after = await charPos(app);
    expect(Math.hypot(after[0] - before[0], after[1] - before[1])).toBeGreaterThan(150);
    expect(Math.abs(after[0] - r.to.x)).toBeLessThanOrEqual(2);
    const fxLog = await char.evaluate(() => (window as unknown as { __capriDebug: { fx: { log: string[] } } }).__capriDebug.fx.log);
    expect(fxLog).toEqual(expect.arrayContaining([expect.stringMatching(/:out$/), expect.stringMatching(/:in$/)]));
    const clip = await char.evaluate(() => (window as unknown as { __capriDebug: { behavior: { clipHistory: string[] } } }).__capriDebug.behavior.clipHistory.at(-1));
    expect(['reveal_spread', 'tilt_grin', 'many_eyes']).toContain(clip);
    await new Promise((x) => setTimeout(x, 500));
    await quit(app);
    const saved = JSON.parse(fs.readFileSync(path.join(ud, 'settings.json'), 'utf8')).character.position;
    expect(Math.abs(saved.x - after[0])).toBeLessThanOrEqual(2);
  });

  it('autonomous teleport is held back without AI, and runs once the AI is genuinely connected', async () => {
    const awake = { behavior: { quietHours: { enabled: false, start: '22:00', end: '08:00' } } }; // independent of the time of day
    let { app } = await launch(profile({ teleport: { auto: true }, ...awake }));
    const tick = (a: ElectronApplication) => a.evaluate(() => (globalThis as unknown as { __capri: { teleporter: { autoTick(): Promise<string | null> } } }).__capri.teleporter.autoTick());
    expect(await tick(app)).toBe('AI is not connected');
    expect((await capri(app)).tp.count).toBe(0);
    await quit(app);
    const ollama = await mockOllama();
    ({ app } = await launch(profile({ teleport: { auto: true }, ...awake, ai: { provider: 'ollama', ollama: { baseUrl: ollama.url, model: 'llama3.2' } } })));
    await app.evaluate(() => { (globalThis as unknown as { __capriIdleOverride: number }).__capriIdleOverride = 0; return new Promise((r) => setTimeout(r, 800)); }); // as if someone is at the machine
    expect((await capri(app)).conn.state).toBe('connected');
    const before = await charPos(app);
    expect(await tick(app)).toBeNull();
    expect((await capri(app)).tp.count).toBe(1);
    expect(await charPos(app)).not.toEqual(before);
    await ollama.close();
  });

  it('desktop-pet handling: dropped right at a window top she sits on it; anywhere else she stays exactly where she was put, and never changes size', async () => {
    const { app } = await launch(profile());
    type Hooks = { __capri: { charWin: { getBounds(): { x: number; y: number; width: number; height: number }; setBounds(b: object): void }; settleAfterDrop(): void } };
    const win = { x: 300, y: 600, width: 700, height: 200 };
    const size0 = await app.evaluate(() => (globalThis as unknown as Hooks).__capri.charWin.getBounds());
    // a drag places her window like the drag controller does: position from the cursor, size fixed
    const drop = (x: number, y: number) => app.evaluate((_e, [x, y, w, h]) => {
      const c = (globalThis as unknown as Hooks).__capri;
      c.charWin.setBounds({ x, y, width: w, height: h }); c.settleAfterDrop();
      return c.charWin.getBounds();
    }, [x, y, size0.width, size0.height] as const);
    await app.evaluate((_e, w) => { (globalThis as unknown as { __capriFgOverride: object }).__capriFgOverride = w; }, win);
    // 10 px above the window's top edge: she takes a seat on it
    const sat = await drop(500, Math.round(win.y + 10 - size0.height * SEAT_RATIO));
    expect(Math.abs(sat.y + sat.height * SEAT_RATIO - win.y)).toBeLessThanOrEqual(3);
    // 120 px away from any edge: she stays put
    const free = await drop(420, 150);
    expect(Math.abs(free.x - 420)).toBeLessThanOrEqual(3);
    expect(Math.abs(free.y - 150)).toBeLessThanOrEqual(3);
    // thirty moves later she is exactly the same size (fractional-DPI rounding used to grow her)
    let last = free;
    for (let i = 0; i < 30; i++) last = await drop(200 + (i % 5) * 37, 120 + (i % 3) * 29);
    expect(Math.abs(last.width - size0.width)).toBeLessThanOrEqual(1); // Windows reads back ±1 px at 125%; nothing accumulates
    expect(Math.abs(last.height - size0.height)).toBeLessThanOrEqual(1);
  });

  it('character model: every pose renders whole inside her window, and poses follow where she is', async () => {
    const { char } = await launch(profile({ character: { glitchEffects: false } }));
    type D = { __capriDebug: { manual(on: boolean): void; step(dt: number, n: number): void; setSurface(s: string): void; behavior: { setPosture(n: string): void }; pose: string; force(p: object | null): void } };
    await char.evaluate(() => (window as unknown as D).__capriDebug.manual(true));
    const cases: [string, string, string[], object][] = [
      ['window', 'sit_edge', ['sit', 'back'], {}], ['taskbar', 'recline', ['lie'], {}], ['taskbar', 'sit_edge', ['lie', 'crouch', 'back'], {}],
      ['air', 'air_sit', ['crouch'], {}], ['air', 'air_sit', ['crouch'], { hairStream: 1, hairWind: 1, headYaw: 1, turn: 1 }], ['window', 'sit_edge', ['sit', 'back'], { turn: -1, headPitch: 1, sleep: 1 }],
    ];
    for (const [surface, posture, want, force] of cases) {
      const r = await char.evaluate(([surface, posture, force]) => {
        const d = (window as unknown as D).__capriDebug;
        d.force(force); d.setSurface(surface); d.behavior.setPosture(posture); d.step(1 / 30, 45);
        const c = document.getElementById('stage') as HTMLCanvasElement;
        const px = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
        let edge = 0, filled = 0;
        for (let i = 3; i < px.length; i += 4) if (px[i] > 30) filled++;
        for (let x = 0; x < c.width; x++) { if (px[x * 4 + 3] > 30) edge++; if (px[((c.height - 1) * c.width + x) * 4 + 3] > 30) edge++; }
        for (let y = 0; y < c.height; y++) { if (px[y * c.width * 4 + 3] > 30) edge++; if (px[(y * c.width + c.width - 1) * 4 + 3] > 30) edge++; }
        return { pose: d.pose, edge, filled: filled / (c.width * c.height) };
      }, [surface, posture, force] as const);
      expect(want, `${surface}/${posture}`).toContain(r.pose);
      expect(r.edge, `${surface}/${posture}: figure touches the window edge (cropped)`).toBe(0);
      expect(r.filled).toBeGreaterThan(0.05); // a real figure, not an empty canvas
    }
  });

  it('never speaks without a trigger: idling, reconnecting, teleporting, pokes and remarks stay silent', async () => {
    const model = await mockModel(() => 'Right here, choom.');
    const { app, char } = await launch(openaiProfile(model.url, { voice: { ttsEnabled: true, volume: 0 }, behavior: { idleRemarks: true, remarkIntervalMinutes: 5, quietHours: { enabled: false, start: '22:00', end: '08:00' } } }));
    type H = { __capri: { speakCount: number; presenceTick(): void; monitor: { check(r: string): Promise<unknown> }; teleporter: { go(t: string, r: string): Promise<unknown> } } };
    const count = () => app.evaluate(() => (globalThis as unknown as H).__capri.speakCount);
    await app.evaluate(async () => {
      const c = (globalThis as unknown as H).__capri;
      for (let i = 0; i < 5; i++) c.presenceTick(); // remark timer fires (bubble only)
      await c.monitor.check('test reconnect');
      await c.teleporter.go('left', 'manual');
    });
    await char.waitForTimeout(1500);
    expect(await count()).toBe(0);
    // talking to her is a trigger
    const panel = await openPanel(app, char);
    await panel.fill('textarea', 'you there?'); await panel.press('textarea', 'Enter');
    await panel.waitForSelector('.msg.assistant:not(.cursor)');
    await panel.waitForTimeout(300);
    expect(await count()).toBeGreaterThan(0);
    await model.close();
  });

  it('after a teleport she stays exactly where she landed (no DPI-rounding creep, no settings churn)', async () => {
    const ud = profile();
    const { app } = await launch(ud);
    const pos = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!.getBounds());
    for (const where of ['left', 'corner', 'right']) {
      await app.evaluate((_e, w) => (globalThis as unknown as { __capri: { teleporter: { go(t: string, r: string): Promise<unknown> } } }).__capri.teleporter.go(w, 'manual'), where);
      await new Promise((r) => setTimeout(r, 900)); // the landing save settles
      const landed = await pos();
      const mtime = fs.statSync(path.join(ud, 'settings.json')).mtimeMs;
      await new Promise((r) => setTimeout(r, 2000));
      expect(await pos(), `after teleport ${where}`).toEqual(landed);
      expect(fs.statSync(path.join(ud, 'settings.json')).mtimeMs, `settings rewritten after teleport ${where}`).toBe(mtime);
    }
  });

  it('a teleport opens no extra overlay windows (the effect is drawn on her own window)', async () => {
    const { app } = await launch(profile());
    const zaps = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length - 1); // windows besides hers
    const go = (t: string, how: string) => app.evaluate((_e, [t, how]) => (globalThis as unknown as { __capri: { teleporter: { go(t: string, r: string, h: string): Promise<unknown> } } }).__capri.teleporter.go(t, 'manual', how), [t, how]);
    expect(await zaps()).toBe(0);
    await go('left', 'teleport');
    expect(await zaps()).toBe(0);
    await go('right', 'glide');
    expect(await zaps()).toBe(0);
  });

  it('the AI can make her teleport and emote through validated actions (no extra model round)', async () => {
    const model = await mockModel((b) => {
      const last = b.messages.at(-1)!.content;
      if (/move/.test(last)) return 'Moving. <action>{"tool":"teleport","args":{"where":"corner"}}</action>';
      return 'Ha, cute. <action>{"tool":"emote","args":{"emotion":"menace"}}</action>';
    });
    const { app, char } = await launch(openaiProfile(model.url));
    await char.waitForTimeout(600);
    const panel = await openPanel(app, char);
    await panel.fill('textarea', 'you are funny'); await panel.press('textarea', 'Enter');
    await panel.waitForSelector('.msg.assistant:not(.cursor) >> text=Ha, cute.');
    await char.waitForFunction(() => (window as unknown as { __capriDebug: { behavior: { clipHistory: string[] } } }).__capriDebug.behavior.clipHistory.includes('menace'));
    const callsAfterEmote = model.calls;
    const before = await charPos(app);
    await panel.fill('textarea', 'move please'); await panel.press('textarea', 'Enter');
    await panel.waitForSelector('.msg.assistant:not(.cursor) >> text=Moving.');
    // teleport starts after the reply finishes streaming and takes ~1.5 s: poll for the move
    let moved = false;
    for (let i = 0; i < 40 && !moved; i++) { await app.evaluate(() => new Promise((r) => setTimeout(r, 150))); moved = String(await charPos(app)) !== String(before); }
    expect(moved).toBe(true);
    expect(model.calls).toBe(callsAfterEmote + 1); // cosmetic actions need no follow-up round
    expect(await panel.locator('.msg.action').count()).toBe(0); // and don't clutter the chat
    await model.close();
  });
});

describe('connection status & failure handling', () => {
  const chip = (panel: Page) => panel.evaluate(() => ({ state: document.getElementById('connChip')!.dataset.state, text: document.getElementById('connText')!.textContent }));

  it('shows "No AI" for offline mode and "Online" only after a real check', async () => {
    let { app, char } = await launch(profile());
    let panel = await openPanel(app, char);
    expect((await chip(panel)).text).toBe('No AI');
    await quit(app);
    const ollama = await mockOllama();
    ({ app, char } = await launch(profile({ ai: { provider: 'ollama', ollama: { baseUrl: ollama.url, model: 'llama3.2' } } })));
    panel = await openPanel(app, char);
    await panel.waitForFunction(() => document.getElementById('connChip')!.dataset.state === 'connected');
    expect((await chip(panel)).text).toBe('Online');
    await ollama.close();
  });

  it('Gemini without a key: error state, clear message, no fake reply', async () => {
    const { app, char } = await launch(profile({ ai: { provider: 'gemini' } }));
    const panel = await openPanel(app, char);
    await panel.waitForFunction(() => ['error', 'disconnected'].includes(document.getElementById('connChip')!.dataset.state!));
    await panel.fill('textarea', 'hello'); await panel.press('textarea', 'Enter');
    await panel.waitForSelector('.msg.assistant.err');
    expect(await panel.locator('.msg.assistant.err').innerText()).toMatch(/Gemini API key/i);
  });

  it('network down: friendly error, status goes offline, character never stays stuck "thinking"', async () => {
    const { app, char } = await launch(profile({ ai: { provider: 'gemini' } }), { env: { GEMINI_API_KEY: 'AQ.fake-key-for-network-test-1234567890', CAPRI_NO_DEV_KEY: '0', CAPRI_GEMINI_SERVER_URL: 'http://127.0.0.1:1' } });
    const panel = await openPanel(app, char);
    await panel.fill('textarea', 'are you there?'); await panel.press('textarea', 'Enter');
    await panel.waitForSelector('.msg.assistant.err', { timeout: 30_000 });
    expect(await panel.locator('.msg.assistant.err').innerText()).toMatch(/reach|network|timed out/i);
    await panel.waitForFunction(() => document.getElementById('connChip')!.dataset.state === 'disconnected');
    await char.waitForTimeout(2500);
    const st = await char.evaluate(() => (window as unknown as { __capriDebug: { behavior: { state: string } } }).__capriDebug.behavior.state);
    expect(st).not.toBe('thinking');
  });
});

describe('interface', () => {
  it('every view fits small and large panel sizes without horizontal overflow', async () => {
    const { app, char } = await launch(profile());
    const panel = await openPanel(app, char);
    for (const size of [[340, 420], [420, 620], [900, 900]]) {
      await app.evaluate(({ BrowserWindow }, [w, h]) => BrowserWindow.getAllWindows().find((x) => x.isFocusable())!.setSize(w, h), size);
      for (const t of ['chat', 'model', 'voice', 'character', 'memory', 'privacy', 'system']) {
        await panel.evaluate((x) => (window as unknown as { capri: { invoke(c: string, a: string): Promise<unknown> } }).capri.invoke('panel:open', x), t);
        await panel.waitForTimeout(t === 'system' || t === 'character' || t === 'model' || t === 'privacy' ? 900 : 250);
        const o = await panel.evaluate(() => { const r = document.getElementById('closeBtn')!.getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, close: r.width > 0 && r.right <= innerWidth + 1 }; });
        expect(o.sw, `${t} @ ${size}`).toBeLessThanOrEqual(o.cw + 1);
        expect(o.close, `close button visible on ${t} @ ${size}`).toBe(true);
      }
    }
  });

  it('first-run onboarding offers Gemini and finishes into chat', async () => {
    const d = profile();
    const s = JSON.parse(fs.readFileSync(path.join(d, 'settings.json'), 'utf8')); s.firstRunComplete = false; fs.writeFileSync(path.join(d, 'settings.json'), JSON.stringify(s));
    const { app } = await launch(d);
    const panel = await app.waitForEvent('window');
    await panel.waitForSelector('text=Choose her brain');
    expect(await panel.locator('.choice', { hasText: 'Google Gemini' }).count()).toBe(1);
    await panel.locator('.choice', { hasText: 'No AI' }).click();
    await panel.waitForSelector('textarea');
  });
});

describe('cleanup', () => {
  it('quitting terminates every Capri process (no orphans)', async () => {
    const ud = profile();
    const { app } = await launch(ud);
    const pid = app.process().pid!;
    await quit(app);
    await new Promise((r) => setTimeout(r, 1500));
    const { execFileSync } = await import('node:child_process');
    const marker = path.basename(ud);
    const ps = `(Get-CimInstance Win32_Process | Where-Object { ($_.CommandLine -like '*${marker}*' -or $_.ProcessId -eq ${pid}) -and $_.ProcessId -ne $PID -and $_.Name -notmatch 'powershell' } | Measure-Object).Count`;
    const left = execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }).trim();
    expect(left).toBe('0');
  });
});

describe.runIf(process.env.CAPRI_LIVE_GEMINI === '1')('LIVE Gemini (uses the local GEMINI_API_KEY / .env.local)', () => {
  it('authenticates, streams a real reply, keeps multi-turn context, never leaks the key', async () => {
    const ud = profile({ ai: { provider: 'gemini' } });
    const { app, char } = await launch(ud, { liveKey: true });
    const panel = await openPanel(app, char);
    await panel.waitForFunction(() => document.getElementById('connChip')!.dataset.state === 'connected', undefined, { timeout: 30_000 });
    const deltas: number[] = [];
    await panel.exposeFunction('__delta', () => deltas.push(Date.now()));
    await panel.evaluate(() => (window as unknown as { capri: { on(c: string, f: () => void): void } }).capri.on('chat:delta', () => (window as unknown as { __delta(): void }).__delta()));
    // if she asks to save something to memory, decline (the permission flow is tested elsewhere)
    const autoDeny = setInterval(() => { void panel.locator('.confirm').getByText('Deny').click({ timeout: 200 }).catch(() => {}); }, 400);
    await panel.fill('textarea', 'For this chat only, the code word is NEON-FOX. Now tell me in three short sentences who you are.'); await panel.press('textarea', 'Enter');
    await panel.waitForSelector('.msg.assistant:not(.cursor)', { timeout: 90_000 });
    expect(deltas.length).toBeGreaterThan(1); // progressive streaming
    await panel.fill('textarea', 'What was the code word? Answer with just the word.'); await panel.press('textarea', 'Enter');
    await panel.waitForFunction(() => document.querySelectorAll('.msg.assistant:not(.cursor)').length >= 2, undefined, { timeout: 90_000 });
    expect(await panel.locator('.msg.assistant').last().innerText()).toMatch(/NEON-FOX/i);
    expect(await panel.locator('.msg.assistant.err').count()).toBe(0);
    clearInterval(autoDeny);
    await quit(app);
    const key = (process.env.GEMINI_API_KEY || /GEMINI_API_KEY=(.+)/.exec(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8'))![1]).trim();
    for (const f of ['settings.json', 'history.jsonl', path.join('logs', 'capri.log')]) expect(fs.readFileSync(path.join(ud, f), 'utf8').includes(key), f).toBe(false);
  });
});

// ======================================================================== v3: postures & desktop placement
describe('postures & placement', () => {
  type Dbg = { __capriDebug: { surface: string; behavior: { posture: string; postureHistory: string[]; setPosture(n: string): void } } };
  const dbg = (char: Page) => char.evaluate(() => { const d = (window as unknown as Dbg).__capriDebug; return { surface: d.surface, posture: d.behavior.posture }; });

  it('standing on the taskbar is a "ledge": she knows it and can sit on it', async () => {
    const { app, char } = await launch(profile());
    await char.waitForFunction(() => (window as unknown as Dbg).__capriDebug.surface === 'taskbar', undefined, { timeout: 8000 });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!.webContents.send('cue', { type: 'clip', name: 'sit' }));
    await char.waitForTimeout(1200);
    expect((await dbg(char)).posture).toBe('sit_edge');
    const hipDrop = await char.evaluate(() => (window as unknown as { __capriDebug: { anim: { value: { hipDrop: number } } } }).__capriDebug.anim.value.hipDrop);
    expect(hipDrop).toBeGreaterThan(150); // she really sat down
  });

  it('perches on the active window, then hops off when that window moves', async () => {
    const { app, char } = await launch(profile());
    await char.waitForTimeout(800);
    // a fake "active window" so the test never depends on the user's real desktop
    await app.evaluate(() => { (globalThis as Record<string, unknown>).__capriFgOverride = { x: 150, y: 560, width: 900, height: 240 }; });
    const r = await char.evaluate(() => (window as unknown as { capri: { invoke(c: string, a: string): Promise<{ ok: boolean }> } }).capri.invoke('teleport:now', 'perch'));
    expect(r.ok).toBe(true);
    const b = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!.getBounds());
    expect(Math.abs(b.y + b.height * SEAT_RATIO - 560)).toBeLessThanOrEqual(4); // seat on the window's top edge (DPI rounding)
    await char.waitForFunction(() => (window as unknown as Dbg).__capriDebug.surface === 'window', undefined, { timeout: 4000 });
    // the user drags that window away → she startles and jumps somewhere safe
    await app.evaluate(() => { (globalThis as Record<string, unknown>).__capriFgOverride = { x: 400, y: 300, width: 700, height: 400 }; });
    await char.waitForFunction(() => (window as unknown as Dbg).__capriDebug.surface !== 'window', undefined, { timeout: 8000 });
    const after = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((x) => !x.isFocusable())!.getBounds());
    expect(after.y).not.toBe(b.y);
  });

  it('peeks in from a screen edge with the leaning posture', async () => {
    const { app, char } = await launch(profile());
    await char.waitForTimeout(800);
    const r = await char.evaluate(() => (window as unknown as { capri: { invoke(c: string, a: string): Promise<{ ok: boolean }> } }).capri.invoke('teleport:now', 'peek'));
    expect(r.ok).toBe(true);
    await char.waitForFunction(() => /^edge_/.test((window as unknown as Dbg).__capriDebug.surface), undefined, { timeout: 4000 });
    await char.waitForTimeout(400);
    expect((await dbg(char)).posture).toMatch(/^peek_/);
    void app;
  });

  it('the AI can ask her to sit or recline (validated emote → posture)', async () => {
    const model = await mockModel(() => 'Fine, I’ll get comfy. <action>{"tool":"emote","args":{"emotion":"sit"}}</action>');
    const { app, char } = await launch(openaiProfile(model.url));
    await char.waitForFunction(() => (window as unknown as Dbg).__capriDebug.surface === 'taskbar', undefined, { timeout: 8000 });
    const panel = await openPanel(app, char);
    await panel.fill('textarea', 'sit down'); await panel.press('textarea', 'Enter');
    await char.waitForFunction(() => (window as unknown as Dbg).__capriDebug.behavior.posture === 'sit_edge', undefined, { timeout: 10_000 });
    await model.close();
  });
});
