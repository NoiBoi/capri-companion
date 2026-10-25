import fs from 'node:fs';
import path from 'node:path';
import {
  app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut, screen, safeStorage, shell, dialog,
  Notification, powerMonitor, session, type IpcMainInvokeEvent, type MenuItemConstructorOptions,
} from 'electron';
import { z } from 'zod';
import type { ActionRequest, CharacterCue, Diagnostics, InvokeChannel } from '../shared/ipc';
import type { Settings } from '../shared/settings';
import { IDLE_REMARKS, mayInterrupt } from '../shared/behaviorRules';
import { Logger } from './log';
import { SettingsStore } from './store/settingsStore';
import { SecretStore, type Cipher } from './store/secrets';
import { HistoryStore, MemoryStore, NotesStore, ReminderStore } from './store/dataStores';
import { createProvider, httpFetch, type LLMProvider } from './ai/providers';
import { OfflineProvider } from './ai/offline';
import { ConnectionMonitor } from './ai/connection';
import { TeleportController } from './desktop/teleportController';
import { SEAT_RATIO, TELEPORT_TARGETS, type TeleportTarget } from './desktop/teleport';
import { displayFor, type Rect as DRect } from './desktop/displays';
import { Conversation } from './ai/conversation';
import type { ActionContext } from './actions/registry';
import { createCharacterWindow, createPanelWindow, characterSize, displaysNow, DragController, OFFSCREEN, reveal, conceal, shown } from './windows';
import { clampToDisplays } from './desktop/displays';
import { foregroundRect, handleToBigint, isOtherAppFullscreen, loadWin32, win32Status } from './desktop/win32';
import { probeWindowsRecognizer, transcribeOpenAI, transcribeWindows, WakeWordListener } from './voice/speech';

const T0 = performance.timeOrigin;
const TEST = process.env.CAPRI_TEST === '1';
if (process.env.CAPRI_USER_DATA) app.setPath('userData', path.resolve(process.env.CAPRI_USER_DATA));
// test/capture only: render at a fixed device scale (crisp high-res frames for the trailer harness)
if (process.env.CAPRI_TEST === '1' && process.env.CAPRI_DPR) app.commandLine.appendSwitch('force-device-scale-factor', process.env.CAPRI_DPR);
app.setAppUserModelId('dev.capri.companion');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => openPanel('chat'));
  app.whenReady().then(init).catch((e) => {
    dialog.showErrorBox('Capri failed to start', String(e?.stack || e));
    app.exit(1);
  });
}

// ---------------------------------------------------------------- state
let log: Logger;
let settings: SettingsStore;
let secrets: SecretStore;
let history: HistoryStore;
let memory: MemoryStore;
let notes: NotesStore;
let reminders: ReminderStore;
let convo: Conversation;
let offline: LLMProvider;
let charWin: BrowserWindow | null = null;
let panelWin: BrowserWindow | null = null;
let tray: Tray | null = null;
let drag: DragController;
let wake: WakeWordListener;
let startupMs = 0;
let monitor: ConnectionMonitor;
let teleporter: TeleportController;
let perchRect: DRect | null = null;
/** Active app window in DIP. Tests may substitute a fake window so they never depend on the user's real desktop. */
function fgRectDip(): DRect | null {
  const o = TEST ? (globalThis as { __capriFgOverride?: DRect | null }).__capriFgOverride : undefined;
  if (o !== undefined) return o;
  const r = foregroundRect(ownHandles());
  return r ? screen.screenToDipRect(null, r) : null;
}
let lastSurface = '';
/** Where she is on the desktop → which postures make sense (sitting on a ledge, peeking from an edge, floating). */
function computeSurface(b: DRect): 'taskbar' | 'window' | 'air' | 'edge_left' | 'edge_right' {
  if (perchRect && Math.abs(b.y + b.height * SEAT_RATIO - perchRect.y) < 14) return 'window';
  const a = displayFor(b, displaysNow()).workArea;
  if (b.x < a.x - 10) return 'edge_left';
  if (b.x + b.width > a.x + a.width + 10) return 'edge_right';
  if (Math.abs(b.y + b.height - (a.y + a.height)) <= 12) return 'taskbar';
  return 'air';
}
function sendSurface(force = false) {
  if (!charWin || charWin.isDestroyed()) return;
  const s = computeSurface(charWin.getBounds());
  if (s !== lastSurface || force) { lastSurface = s; cue({ type: 'surface', surface: s }); }
}
let devGeminiKey: string | undefined;
let lastCrash: string | null = null;
let userHidden = false;
let fullscreenHidden = false;
let interactUntil = 0;
let lastFps = 0;
let recording = false;
let quitting = false;
let charRestarts: number[] = [];
const intervals: NodeJS.Timeout[] = [];
const pendingConfirms = new Map<string, (ok: boolean) => void>();
let lastInteraction = Date.now();
let lastRemark = Date.now();

const preloadPath = () => path.join(__dirname, '..', 'preload', 'preload.js');
const markerFile = () => path.join(app.getPath('userData'), 'session.lock');

/**
 * Gemini key precedence: key saved in the app (DPAPI) > GEMINI_API_KEY env var >
 * .env.local next to the sources (development builds only; never packaged).
 */
function loadDevKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  if (app.isPackaged) return undefined;
  try {
    const m = /^GEMINI_API_KEY=(.+)$/m.exec(fs.readFileSync(path.join(app.getAppPath(), '.env.local'), 'utf8'));
    return m?.[1].trim() || undefined;
  } catch { return undefined; }
}
const secretFor = (k: 'openai' | 'anthropic' | 'gemini') => (k === 'gemini' ? secrets.get('gemini') ?? devGeminiKey : secrets.get(k));
const geminiKeySource = () => (secrets.get('gemini') ? 'secure-store' : devGeminiKey ? 'environment' : 'none') as 'secure-store' | 'environment' | 'none';
function makeProvider(): LLMProvider {
  return createProvider(settings.get().ai, secretFor, offline, {
    onModelUsed: (model, fallback) => monitor?.reportSuccess('gemini', model, fallback),
    geminiServerUrl: TEST ? process.env.CAPRI_GEMINI_SERVER_URL : undefined,
  });
}

// ---------------------------------------------------------------- init
async function init() {
  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  settings = new SettingsStore(dir);
  log = new Logger(path.join(dir, 'logs'), settings.get().privacy.logLevel, undefined, undefined, TEST);
  log.info('starting', { version: app.getVersion(), electron: process.versions.electron, test: TEST });
  if (settings.repairedOnLoad.length) log.warn('settings repaired', { fields: settings.repairedOnLoad });

  // crash detection: a marker that only a clean shutdown removes
  if (fs.existsSync(markerFile())) {
    lastCrash = fs.readFileSync(markerFile(), 'utf8').slice(0, 200);
    log.warn('previous session did not shut down cleanly', { marker: lastCrash });
  }
  fs.writeFileSync(markerFile(), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));

  const cipher: Cipher = {
    available: () => safeStorage.isEncryptionAvailable(),
    encrypt: (s) => safeStorage.encryptString(s),
    decrypt: (b) => safeStorage.decryptString(b),
  };
  secrets = new SecretStore(dir, cipher);
  const s0 = settings.get();
  history = new HistoryStore(dir, () => settings.get().memory.historyRetentionDays, () => settings.get().privacy.saveHistory);
  memory = new MemoryStore(dir);
  notes = new NotesStore(dir);
  reminders = new ReminderStore(dir);
  offline = new OfflineProvider();
  loadWin32(log);
  devGeminiKey = TEST && process.env.CAPRI_NO_DEV_KEY === '1' ? undefined : loadDevKey();
  wake = new WakeWordListener(log);
  wake.on('wake', onWake);
  wake.on('error', (e: Error) => { log.warn('wake word disabled', { error: e }); toPanel('chat:phase', { phase: 'error', detail: e.message }); });

  const actionCtx: ActionContext = {
    settings: () => settings.get(),
    openExternal: (u) => shell.openExternal(u),
    openPath: (p) => shell.openPath(p),
    notes, reminders, memory,
    now: () => Date.now(),
    teleport: (where) => teleporter.go(where as TeleportTarget, 'ai'),
    emote: (name) => { cue({ type: 'clip', name }); return true; },
  };
  convo = new Conversation({
    settings: () => settings.get(),
    provider: makeProvider,
    history, memories: () => (settings.get().memory.enabled ? memory.approved() : []),
    actionCtx,
    emit: (ch, p) => toPanel(ch, p),
    cue,
    confirm: requestConfirmation,
    log,
    onProviderResult: (ok, _name, err) => { if (!ok) monitor.reportFailure(err); },
  });
  monitor = new ConnectionMonitor(makeProvider, geminiKeySource, log);
  monitor.on('changed', (st) => { toPanel('connection:status', st); cue({ type: 'connection', state: st.state }); updateTrayMenu(); });
  teleporter = new TeleportController({
    settings: () => settings.get(),
    bounds: () => (charWin && !charWin.isDestroyed() ? charWin.getBounds() : null),
    move: (r) => { if (charWin && !charWin.isDestroyed()) charWin.setBounds(r); },
    moved: (dest) => {
      // remember the window she's sitting on so she can react if it moves or closes
      perchRect = dest.kind === 'perch' ? fgRectDip() : null;
      savePosition();
      sendSurface();
    },
    displays: displaysNow,
    cursor: () => screen.getCursorScreenPoint(),
    activeWindow: fgRectDip,
    cue,
    aiConnected: () => monitor.connected,
    blocked: () => (convo.busy ? 'conversation in progress' : recording ? 'listening' : drag.active ? 'being dragged' : fullscreenHidden ? 'fullscreen app' : userHidden ? 'hidden'
      : !mayInterrupt(settings.get(), { fullscreen: fullscreenHidden, hidden: userHidden }) ? 'do not disturb / quiet hours' : null),
    userIdleSec: () => powerMonitor.getSystemIdleTime(),
    log,
  });

  setupPermissions();
  registerIpc();
  createCharacter();
  if (!OFFSCREEN) { createTray(); registerShortcuts(); } // off-screen test runs never touch the user's tray or hotkeys
  applyStartup(s0);
  if (s0.voice.wakeWord && s0.voice.micPermission) wake.start();

  settings.on('changed', onSettingsChanged);
  memory.on('changed', () => toPanel('memory:changed', null));
  reminders.on('fired', onReminder);
  reminders.start();

  monitor.start();
  teleporter.startAuto();
  intervals.push(setInterval(fullscreenTick, 2000));
  intervals.push(setInterval(presenceTick, 30_000));
  screen.on('display-removed', reclampCharacter);
  screen.on('display-added', reclampCharacter);
  screen.on('display-metrics-changed', reclampCharacter);
  powerMonitor.on('resume', () => { reminders.tick(); reclampCharacter(); void monitor.check('resume'); });

  if (!s0.firstRunComplete) setTimeout(() => openPanel('welcome'), 800);
  if (TEST) (globalThis as Record<string, unknown>).__capri = { get teleporter() { return teleporter; }, get monitor() { return monitor; }, settings, convo, history, memory, notes, reminders, secrets, get charWin() { return charWin; }, get panelWin() { return panelWin; }, get startupMs() { return startupMs; }, pendingConfirms, log };
}

// ---------------------------------------------------------------- windows
function createCharacter() {
  const s = settings.get();
  charWin = createCharacterWindow(s, preloadPath(), log);
  drag = new DragController(() => charWin, (moved) => {
    if (moved) { perchRect = null; savePosition(); sendSurface(); }
    else { lastInteraction = Date.now(); cue({ type: 'react', reaction: 'happy' }); }
  });
  // At fractional DPI Windows shifts new frameless windows by a few px; without this
  // correction the saved position creeps a little on every launch.
  const intended = charWin.getBounds();
  const target = { ...intended };
  const s0 = settings.get();
  if (s0.character.position) { target.x = s0.character.position.x; target.y = s0.character.position.y; }
  let settled = false;
  charWin.once('ready-to-show', () => {
    if (!charWin) return;
    const size = characterSize(s0.character.scale);
    charWin.setBounds(clampToDisplays({ ...target, ...size }, displaysNow()));
    setTimeout(() => { settled = true; }, 500);
    if (!userHidden && charWin) reveal(charWin);
    setTimeout(() => sendSurface(true), 600);
    startupMs = Math.round(Date.now() - T0);
    log.info('character ready', { startupMs });
  });
  // 'moved' only fires for user moves on Windows; also persist programmatic/snap moves (debounced)
  let moveTimer: NodeJS.Timeout | null = null;
  charWin.on('move', () => {
    if (drag.active || !settled) return;
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(savePosition, 300);
  });
  charWin.webContents.on('render-process-gone', (_e, details) => {
    log.error('character renderer crashed', { reason: details.reason, exitCode: details.exitCode });
    if (quitting) return;
    const now = Date.now();
    charRestarts = charRestarts.filter((t) => now - t < 5 * 60_000);
    charRestarts.push(now);
    charWin?.destroy();
    charWin = null;
    if (charRestarts.length <= 3) setTimeout(createCharacter, 1000);
    else dialog.showErrorBox('Capri', 'The character view keeps crashing. Open Diagnostics from the tray menu for details.');
  });
  charWin.on('closed', () => { charWin = null; });
}

function savePosition() {
  if (!charWin || charWin.isDestroyed()) return;
  const b = charWin.getBounds();
  const d = screen.getDisplayMatching(b);
  settings.update({ character: { position: { x: b.x, y: b.y, displayId: d.id } } });
}

function reclampCharacter() {
  if (!charWin || charWin.isDestroyed()) return;
  const b = charWin.getBounds();
  const c = clampToDisplays(b, displaysNow());
  if (c.x !== b.x || c.y !== b.y) { charWin.setBounds(c); savePosition(); }
}

function openPanel(tab: string = 'chat') {
  if (panelWin && !panelWin.isDestroyed()) {
    panelWin.webContents.send('panel:tab', tab);
    if (panelWin.isMinimized()) panelWin.restore();
    reveal(panelWin, true);
    if (!OFFSCREEN) panelWin.focus();
    return;
  }
  const near = charWin?.getBounds() ?? screen.getPrimaryDisplay().workArea;
  panelWin = createPanelWindow(near, preloadPath(), log, tab);
  panelWin.on('closed', () => {
    panelWin = null;
    for (const [, resolve] of pendingConfirms) resolve(false); // never leave an action dangling
    pendingConfirms.clear();
  });
}

function toPanel(channel: string, payload: unknown) {
  if (panelWin && !panelWin.isDestroyed()) panelWin.webContents.send(channel, payload);
}
function cue(c: CharacterCue) {
  if (charWin && !charWin.isDestroyed()) charWin.webContents.send('cue', c);
}

function setCharacterVisible(visible: boolean) {
  if (!charWin) return;
  if (visible) { reveal(charWin); if (settings.get().character.alwaysOnTop) charWin.setAlwaysOnTop(true, 'floating'); }
  else conceal(charWin);
  cue({ type: 'pause', paused: !visible });
  updateTrayMenu();
}

// ---------------------------------------------------------------- confirmation
function requestConfirmation(req: ActionRequest): Promise<boolean> {
  openPanel('chat');
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => { pendingConfirms.delete(req.id); resolve(false); }, 120_000);
    pendingConfirms.set(req.id, (ok) => { clearTimeout(timer); pendingConfirms.delete(req.id); resolve(ok); });
    const send = () => toPanel('action:confirm', req);
    if (panelWin?.webContents.isLoading()) panelWin.webContents.once('did-finish-load', send);
    else send();
    cue({ type: 'react', reaction: 'curious' });
  });
}

// ---------------------------------------------------------------- settings side-effects
let lastAiSig = '';
let lastTpSig = '';
function onSettingsChanged(s: Settings) {
  const sig = JSON.stringify([s.ai.provider, s.ai.gemini, s.ai.ollama, s.ai.openai, s.ai.anthropic]);
  if (sig !== lastAiSig) { lastAiSig = sig; void monitor.check('settings changed'); }
  const tsig = JSON.stringify(s.teleport);
  if (tsig !== lastTpSig) { lastTpSig = tsig; teleporter?.rearm(); }
  log.setLevel(s.privacy.logLevel);
  if (charWin && !charWin.isDestroyed()) {
    const size = characterSize(s.character.scale);
    const b = charWin.getBounds();
    if (b.width !== size.width || b.height !== size.height) {
      // keep her feet planted: anchor bottom-centre
      const nb = { x: Math.round(b.x + b.width / 2 - size.width / 2), y: b.y + b.height - size.height, ...size };
      charWin.setBounds(clampToDisplays(nb, displaysNow()));
    }
    charWin.setOpacity(s.character.opacity);
    charWin.setAlwaysOnTop(s.character.alwaysOnTop, 'floating');
    applyMouseMode(false);
    charWin.webContents.send('settings:changed', s);
  }
  toPanel('settings:changed', s);
  applyStartup(s);
  if (s.voice.wakeWord && s.voice.micPermission) wake.start(); else wake.stop();
  updateTrayMenu();
}

function applyStartup(s: Settings) {
  if (TEST || !app.isPackaged) return; // never register dev builds to run at login
  const cur = app.getLoginItemSettings().openAtLogin;
  if (cur !== s.startup.launchOnLogin) app.setLoginItemSettings({ openAtLogin: s.startup.launchOnLogin });
}

let lastHit = false;
function applyMouseMode(hit: boolean) {
  lastHit = hit;
  if (!charWin || charWin.isDestroyed()) return;
  const s = settings.get();
  const passThrough = (s.character.clickThrough && Date.now() > interactUntil) || !hit;
  charWin.setIgnoreMouseEvents(passThrough, { forward: true });
}

function toggleInteract() {
  const s = settings.get();
  if (!s.character.clickThrough) { settings.update({ character: { clickThrough: true } }); cue({ type: 'interact', enabled: false }); return; }
  // temporary interaction window while click-through stays enabled
  interactUntil = Date.now() > interactUntil ? Date.now() + 15_000 : 0;
  cue({ type: 'interact', enabled: interactUntil > 0 });
  applyMouseMode(lastHit);
  if (interactUntil) setTimeout(() => { if (Date.now() >= interactUntil) { interactUntil = 0; cue({ type: 'interact', enabled: false }); applyMouseMode(lastHit); } }, 15_100);
}

// ---------------------------------------------------------------- voice
function startRecording(): boolean {
  const s = settings.get();
  if (!s.voice.micPermission) { openPanel('voice'); toPanel('chat:phase', { phase: 'error', detail: 'Microphone is off. Enable it in Voice settings first.' }); return false; }
  if (recording) return true;
  convo.stop(); // interrupt speech/generation when the user starts talking
  recording = true;
  wake.suppress(60_000);
  lastInteraction = Date.now();
  cue({ type: 'mic', command: 'start' });
  toPanel('chat:phase', { phase: 'listening' });
  updateTrayMenu();
  return true;
}
function stopRecording(cancel = false) {
  if (!recording) return;
  cue({ type: 'mic', command: cancel ? 'cancel' : 'stop' });
  if (cancel) { recording = false; toPanel('chat:phase', { phase: 'idle' }); updateTrayMenu(); }
}
function onWake() {
  const s = settings.get();
  if (s.behavior.doNotDisturb || recording || convo.busy) return;
  log.info('wake word');
  cue({ type: 'wake' });
  startRecording();
}
async function onAudio(wav: Uint8Array, durationMs: number) {
  recording = false;
  wake.suppress(3000);
  updateTrayMenu();
  if (durationMs < 300 || wav.byteLength < 2000) { toPanel('chat:phase', { phase: 'idle', detail: 'Didn’t catch that.' }); cue({ type: 'phase', phase: 'idle' }); return; }
  toPanel('chat:phase', { phase: 'transcribing' });
  cue({ type: 'phase', phase: 'transcribing' });
  const s = settings.get();
  try {
    const text = s.voice.sttEngine === 'openai'
      ? await transcribeOpenAI(wav, s.voice.openaiStt.baseUrl, s.voice.openaiStt.model, secrets.get('openaiVoice') ?? secrets.get('openai'))
      : await transcribeWindows(wav);
    toPanel('transcript', { text, final: true });
    if (!text) { toPanel('chat:phase', { phase: 'idle', detail: 'Didn’t catch that — try again or type.' }); cue({ type: 'phase', phase: 'idle' }); return; }
    await convo.send(text, { viaVoice: true });
  } catch (e) {
    log.warn('transcription failed', { error: e as Error });
    toPanel('chat:phase', { phase: 'error', detail: `Speech-to-text failed: ${(e as Error).message}. You can type instead.` });
    cue({ type: 'phase', phase: 'error' });
  }
}

// ---------------------------------------------------------------- periodic
function ownHandles(): bigint[] {
  return [charWin, panelWin].filter((w): w is BrowserWindow => !!w && !w.isDestroyed()).map((w) => handleToBigint(w.getNativeWindowHandle()));
}
function isFullscreenNow() { return settings.get().character.hideOnFullscreen && win32Status() === 'active' && isOtherAppFullscreen(ownHandles()); }
function perchTick() {
  if (!perchRect || !charWin || teleporter.active || drag.active) return;
  const now = fgRectDip();
  const same = now && Math.abs(now.x - perchRect.x) < 8 && Math.abs(now.y - perchRect.y) < 8 && Math.abs(now.width - perchRect.width) < 8;
  if (same) return;
  // her seat moved or vanished: she startles and jumps somewhere safe
  perchRect = null;
  cue({ type: 'react', reaction: 'surprised' });
  setTimeout(() => void teleporter.go('corner', 'manual'), 350);
}
function fullscreenTick() {
  perchTick();
  if (!charWin || userHidden) return;
  const fs_ = isFullscreenNow();
  if (fs_ && !fullscreenHidden) { fullscreenHidden = true; setCharacterVisible(false); log.info('hidden for fullscreen app'); }
  else if (!fs_ && fullscreenHidden) { fullscreenHidden = false; setCharacterVisible(true); }
}
function presenceTick() {
  const s = settings.get();
  const idleSec = powerMonitor.getSystemIdleTime();
  const quiet = !mayInterrupt(s, { fullscreen: fullscreenHidden, hidden: userHidden });
  cue({ type: 'presence', idleSec, quiet });
  // idle remarks: only when enabled, allowed, user is present, and nothing happened recently
  const due = Date.now() - Math.max(lastRemark, lastInteraction) > s.behavior.remarkIntervalMinutes * 60_000;
  if (s.behavior.idleRemarks && !quiet && due && idleSec < 120 && !convo.busy && !recording) {
    lastRemark = Date.now();
    const text = IDLE_REMARKS[Math.floor(Math.random() * IDLE_REMARKS.length)];
    cue({ type: 'remark', text });
    if (s.voice.ttsEnabled) cue({ type: 'speak', utteranceId: `remark:${Date.now()}`, text });
  }
}
function onReminder(r: { text: string; kind: string }) {
  const s = settings.get();
  log.info('reminder fired', { kind: r.kind });
  toPanel('reminder:fired', r);
  if (s.notifications.reminders && Notification.isSupported() && !OFFSCREEN) {
    const icon = app.isPackaged ? path.join(process.resourcesPath, 'icon.png') : path.join(app.getAppPath(), 'build', 'icon.png');
    new Notification({ title: r.kind === 'timer' ? 'Capri · timer done' : 'Capri · reminder', body: r.text, icon: fs.existsSync(icon) ? icon : undefined, silent: !s.notifications.sound || s.behavior.doNotDisturb }).show();
  }
  cue({ type: 'react', reaction: 'wave' });
  if (s.voice.ttsEnabled && !s.behavior.doNotDisturb && !fullscreenHidden) {
    cue({ type: 'speak', utteranceId: `rem:${Date.now()}`, text: r.kind === 'timer' ? `Timer's up, choom. ${r.text}.` : `Hey — reminder: ${r.text}.` });
  }
}

// ---------------------------------------------------------------- tray & shortcuts
function trayIcon() {
  // 32×32 face icon drawn in code (black head, green mask, blue eyes) so the tray never lacks an asset
  const N = 32, buf = Buffer.alloc(N * N * 4);
  const put = (x: number, y: number, [r, g, b]: number[]) => { const i = (y * N + x) * 4; buf[i] = b; buf[i + 1] = g; buf[i + 2] = r; buf[i + 3] = 255; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x - 15.5, dy = y - 15.5;
    if (Math.abs(dx) + Math.abs(dy) * 0.8 < 16) put(x, y, [242, 21, 76]); // hair diamond
    if (Math.abs(dx) < 9 && dy > -6 && dy < 13 && Math.abs(dx) < 13 - dy * 0.5) put(x, y, [10, 7, 16]);
    if (dy > -4 && dy < 3 && Math.abs(dx) < 9 && Math.abs(dx) > 0.8) put(x, y, [34, 242, 122]);
    for (const ex of [-4.5, 4.5]) { const d = Math.hypot(x - 15.5 - ex, y - 15); if (d < 3) put(x, y, d < 1 ? [255, 255, 255] : [29, 108, 255]); }
  }
  return nativeImage.createFromBitmap(buf, { width: N, height: N });
}
function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip('Capri');
  tray.on('click', () => openPanel('chat'));
  updateTrayMenu();
}
function updateTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  const s = settings.get();
  const visible = shown(charWin);
  const items: MenuItemConstructorOptions[] = [
    { label: 'Chat…  (Ctrl+Alt+Space)', click: () => openPanel('chat') },
    { label: recording ? 'Stop listening' : 'Push to talk  (Ctrl+Alt+T)', enabled: s.voice.micPermission, click: () => (recording ? stopRecording() : startRecording()) },
    { type: 'separator' },
    { label: visible ? 'Hide Capri  (Ctrl+Alt+H)' : 'Show Capri  (Ctrl+Alt+H)', click: toggleHidden },
    { label: 'Teleport  (Ctrl+Alt+P)', enabled: visible, click: () => void teleporter.go('auto', 'manual') },
    { label: 'Teleport to cursor', enabled: visible, click: () => void teleporter.go('near_cursor', 'manual') },
    { label: 'Sit on the active window', enabled: visible, click: () => void teleporter.go('perch', 'manual') },
    { label: 'Peek in from the edge', enabled: visible, click: () => void teleporter.go('peek', 'manual') },
    { label: 'Click-through', type: 'checkbox', checked: s.character.clickThrough, click: (i) => settings.update({ character: { clickThrough: i.checked } }) },
    { label: 'Interact for 15s  (Ctrl+Alt+C)', enabled: s.character.clickThrough, click: toggleInteract },
    { label: 'Do not disturb', type: 'checkbox', checked: s.behavior.doNotDisturb, click: (i) => settings.update({ behavior: { doNotDisturb: i.checked } }) },
    { label: 'Reset position', click: () => { settings.update({ character: { position: null } }); charWin?.destroy(); createCharacter(); } },
    { type: 'separator' },
    { label: 'Settings…', click: () => openPanel('settings') },
    { label: 'Diagnostics…', click: () => openPanel('diagnostics') },
    { type: 'separator' },
    { label: 'Restart', click: restart },
    { label: 'Quit Capri', click: () => app.quit() },
  ];
  tray.setContextMenu(Menu.buildFromTemplate(items));
  tray.setToolTip(`Capri${recording ? ' — 🎙 listening' : wake.running ? ' — wake word on' : ''}${s.behavior.doNotDisturb ? ' — DND' : ''}`);
}
function toggleHidden() {
  userHidden = shown(charWin);
  setCharacterVisible(!userHidden);
}
/** Contextual move: summoned from far away (e.g. another monitor) → teleport beside the cursor. */
function summonNearCursor() {
  const b = charWin?.getBounds();
  if (!b || teleporter.active || !shown(charWin)) return;
  const c = screen.getCursorScreenPoint();
  const far = Math.hypot(c.x - (b.x + b.width / 2), c.y - (b.y + b.height / 2)) > 1100 || screen.getDisplayNearestPoint(c).id !== screen.getDisplayMatching(b).id;
  if (far) void teleporter.go('near_cursor', 'manual');
}
const shortcutStatus: Record<string, string> = {};
function registerShortcuts() {
  // [preferred, fallback] — another app may already own the preferred combo
  const map: [string[], string, () => void][] = [
    [['Control+Alt+Space', 'Control+Alt+K'], 'Open chat', () => { summonNearCursor(); openPanel('chat'); }],
    [['Control+Alt+T', 'Control+Alt+Y'], 'Push-to-talk', () => (recording ? stopRecording() : startRecording())],
    [['Control+Alt+H', 'Control+Alt+J'], 'Hide / show', toggleHidden],
    [['Control+Alt+C', 'Control+Alt+V'], 'Interact (click-through)', toggleInteract],
    [['Control+Alt+X', 'Control+Alt+Z'], 'Stop / cancel', () => { convo.stop(); stopRecording(true); }],
    [['Control+Alt+P', 'Control+Alt+O'], 'Teleport', () => void teleporter.go('auto', 'manual')],
  ];
  for (const [accs, label, fn] of map) {
    shortcutStatus[label] = 'unavailable';
    for (const acc of accs) {
      try {
        if (globalShortcut.register(acc, fn)) { shortcutStatus[label] = acc.replace('Control', 'Ctrl'); break; }
        log.warn('shortcut in use by another app', { acc });
      } catch (e) { log.warn('shortcut failed', { acc, error: e as Error }); }
    }
  }
}

function charMenu() {
  const s = settings.get();
  Menu.buildFromTemplate([
    { label: 'Chat', click: () => openPanel('chat') },
    { label: 'Push to talk', enabled: s.voice.micPermission, click: () => startRecording() },
    { label: 'Stop talking', click: () => convo.stop() },
    { label: 'Teleport', click: () => void teleporter.go('auto', 'manual') },
    { label: 'Sit on this window', click: () => void teleporter.go('perch', 'manual') },
    { label: 'Pose', submenu: [['Sit', 'sit'], ['Stand', 'stand'], ['Recline', 'recline'], ['Curl up', 'curl_up'], ['Power stance', 'power_stance']].map(([label, name]) => ({ label, click: () => cue({ type: 'clip', name }) })) },
    { label: 'Teleport to other monitor', enabled: screen.getAllDisplays().length > 1, click: () => void teleporter.go('other_monitor', 'manual') },
    { type: 'separator' },
    { label: 'Click-through', type: 'checkbox', checked: s.character.clickThrough, click: (i) => settings.update({ character: { clickThrough: i.checked } }) },
    { label: 'Do not disturb', type: 'checkbox', checked: s.behavior.doNotDisturb, click: (i) => settings.update({ behavior: { doNotDisturb: i.checked } }) },
    { label: 'Hide', click: toggleHidden },
    { label: 'Settings…', click: () => openPanel('settings') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]).popup({ window: charWin ?? undefined });
}

// ---------------------------------------------------------------- permissions
function setupPermissions() {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((wc, permission, cb, details) => {
    const isChar = !!charWin && wc.id === charWin.webContents.id;
    const audioOnly = 'mediaTypes' in details && Array.isArray(details.mediaTypes) && details.mediaTypes.length > 0 && details.mediaTypes.every((t) => t === 'audio');
    const ok = permission === 'media' && isChar && audioOnly && settings.get().voice.micPermission;
    if (!ok) log.info('permission denied', { permission });
    cb(ok);
  });
  ses.setPermissionCheckHandler((wc, permission) => permission === 'media' && !!charWin && wc?.id === charWin.webContents.id && settings.get().voice.micPermission);
}

// ---------------------------------------------------------------- IPC
type Origin = 'char' | 'panel' | 'any';
function fromOrigin(e: IpcMainInvokeEvent, origin: Origin) {
  const id = e.sender.id;
  const isChar = !!charWin && !charWin.isDestroyed() && charWin.webContents.id === id;
  const isPanel = !!panelWin && !panelWin.isDestroyed() && panelWin.webContents.id === id;
  if (origin === 'char') return isChar;
  if (origin === 'panel') return isPanel;
  return isChar || isPanel;
}
function handle<S extends z.ZodTypeAny>(ch: InvokeChannel, origin: Origin, schema: S, fn: (arg: z.infer<S>) => unknown) {
  ipcMain.handle(ch, async (e, raw) => {
    if (!fromOrigin(e, origin)) throw new Error(`IPC ${ch}: unauthorized sender`);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) throw new Error(`IPC ${ch}: invalid payload`);
    return fn(parsed.data);
  });
}
const none = z.any().optional();
const str = (max: number) => z.string().max(max);

function registerIpc() {
  handle('settings:get', 'any', none, () => settings.get());
  handle('settings:set', 'panel', z.record(z.string(), z.unknown()), (patch) => {
    const r = settings.update(patch);
    return r;
  });
  handle('settings:reset', 'panel', none, () => settings.reset());
  handle('secrets:status', 'panel', none, () => ({ ...secrets.status(), _persistent: secrets.persistent }));
  handle('secrets:set', 'panel', z.object({ key: str(40), value: str(500) }), ({ key, value }) => {
    if (!SecretStore.isKey(key)) throw new Error('unknown key');
    secrets.set(key, value);
    void monitor.check('key updated');
    return true;
  });
  handle('secrets:delete', 'panel', str(40), (key) => { if (SecretStore.isKey(key)) secrets.delete(key); void monitor.check('key removed'); return true; });

  handle('chat:send', 'panel', z.object({ text: str(20_000), viaVoice: z.boolean().optional() }), async ({ text }) => {
    lastInteraction = Date.now();
    return { messageId: await convo.send(text) };
  });
  handle('chat:stop', 'any', none, () => convo.stop());
  handle('chat:history', 'panel', z.object({ limit: z.number().int().min(1).max(2000).optional() }).optional(), (a) => history.recent(a?.limit ?? 200));
  handle('chat:clear', 'panel', none, () => history.clear());

  handle('memory:list', 'panel', none, () => memory.list());
  handle('memory:add', 'panel', str(300), (t) => memory.add(t, 'user'));
  handle('memory:approve', 'panel', str(64), (id) => memory.approve(id));
  handle('memory:delete', 'panel', str(64), (id) => memory.delete(id));
  handle('memory:clear', 'panel', none, () => memory.clear());
  handle('notes:list', 'panel', none, () => notes.list());
  handle('notes:delete', 'panel', str(64), (id) => notes.delete(id));
  handle('reminders:list', 'panel', none, () => reminders.list());
  handle('reminders:cancel', 'panel', str(64), (id) => { reminders.cancel(id); });

  handle('action:respond', 'panel', z.object({ id: str(64), approved: z.boolean(), remember: z.boolean().optional() }), ({ id, approved }) => {
    pendingConfirms.get(id)?.(approved);
  });

  handle('provider:test', 'panel', none, async () => { const r = await makeProvider().test(); void monitor.check('test'); return r; });
  handle('provider:models', 'panel', none, async () => { try { return await makeProvider().listModels(); } catch { return []; } });
  handle('connection:get', 'any', none, () => monitor.status);
  handle('teleport:now', 'any', z.enum(TELEPORT_TARGETS as [TeleportTarget, ...TeleportTarget[]]).optional(), (t) => teleporter.go(t ?? 'auto', 'manual'));
  handle('char:teleport', 'char', z.object({ id: z.number().int(), phase: z.enum(['out', 'in']) }), ({ id, phase }) => teleporter.ack(id, phase));
  handle('connection:check', 'panel', none, async () => { await monitor.check('manual'); return monitor.status; });
  handle('diagnostics:get', 'panel', none, diagnostics);
  handle('logs:tail', 'panel', z.number().int().min(1).max(2000), (n) => log.tail(n));
  handle('app:openDataFolder', 'panel', none, () => shell.openPath(app.getPath('userData')));
  handle('app:resetAll', 'panel', none, resetAll);
  handle('app:quit', 'panel', none, () => app.quit());
  handle('app:restart', 'panel', none, restart);
  handle('apps:pick', 'panel', none, async () => {
    const r = await dialog.showOpenDialog(panelWin!, { title: 'Approve an application for Capri to launch', properties: ['openFile'], filters: [{ name: 'Programs & shortcuts', extensions: ['exe', 'lnk', 'url', 'appref-ms'] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    const p = r.filePaths[0];
    return { name: path.basename(p).replace(/\.(exe|lnk|url|appref-ms)$/i, ''), path: p };
  });
  handle('folders:pick', 'panel', none, async () => {
    const r = await dialog.showOpenDialog(panelWin!, { title: 'Authorize a folder for file search', properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0] ?? null;
  });
  handle('panel:open', 'any', str(30).optional(), (tab) => openPanel(tab || 'chat'));
  handle('panel:close', 'panel', none, () => panelWin?.close());
  handle('voice:ptt', 'any', z.enum(['start', 'stop', 'cancel']), (cmd) => { if (cmd === 'start') startRecording(); else stopRecording(cmd === 'cancel'); });

  // character renderer
  handle('char:hit', 'char', z.boolean(), (hit) => applyMouseMode(hit));
  handle('char:drag', 'char', z.enum(['start', 'end']), (c) => (c === 'start' ? drag.begin() : drag.end()));
  handle('char:click', 'char', none, () => { lastInteraction = Date.now(); openPanel('chat'); });
  handle('char:menu', 'char', none, charMenu);
  handle('char:speechState', 'char', z.object({ utteranceId: str(100), state: z.enum(['start', 'end', 'error']) }), ({ state }) => convo.onSpeechEvent(state));
  handle('char:audio', 'char', z.object({ wav: z.instanceof(Uint8Array), durationMs: z.number().min(0).max(120_000) }), ({ wav, durationMs }) => {
    if (wav.byteLength > 8 * 1024 * 1024) throw new Error('audio too large');
    void onAudio(wav, durationMs);
  });
  handle('char:micError', 'char', str(300), (msg) => {
    recording = false;
    updateTrayMenu();
    log.warn('microphone error', { msg });
    toPanel('chat:phase', { phase: 'error', detail: `Microphone error: ${msg}` });
  });
  handle('char:fps', 'char', z.number().min(0).max(1000), (fps) => { lastFps = fps; });
  handle('tts:fetch', 'char', str(4000), async (text) => {
    const v = settings.get().voice;
    const key = secrets.get('openaiVoice') ?? secrets.get('openai');
    const res = await httpFetch(`${v.openaiTts.baseUrl.replace(/\/+$/, '')}/audio/speech`, {
      method: 'POST', timeoutMs: 30_000,
      headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({ model: v.openaiTts.model, voice: v.openaiTts.voice, input: text, response_format: 'mp3' }),
    });
    return new Uint8Array(await res.arrayBuffer());
  });
}

async function diagnostics(): Promise<Diagnostics> {
  const s = settings.get();
  const provider = makeProvider();
  const [prov, rec, gpuInfo] = await Promise.all([
    provider.test().catch((e) => ({ ok: false, detail: String(e) })),
    probeWindowsRecognizer(),
    app.getGPUInfo('basic').catch(() => undefined),
  ]);
  const metrics = app.getAppMetrics();
  return {
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    platform: `${process.platform} ${process.getSystemVersion()} ${process.arch}`,
    userData: app.getPath('userData'),
    gpu: { status: app.getGPUFeatureStatus() as unknown as Record<string, string>, info: gpuInfo },
    safeStorage: safeStorage.isEncryptionAvailable(),
    fullscreenWatcher: s.character.hideOnFullscreen ? win32Status() : 'disabled',
    speechRecognizer: rec,
    provider: { name: provider.name, ...prov },
    connection: monitor.status,
    teleport: teleporter.status(),
    settingsRepaired: settings.repairedOnLoad,
    shortcuts: { ...shortcutStatus },
    lastCrash,
    perf: {
      startupMs,
      mainRssMB: Math.round(process.memoryUsage().rss / 1048576),
      processes: metrics.map((m) => ({ type: m.type, cpu: Math.round(m.cpu.percentCPUUsage * 10) / 10, memMB: Math.round(m.memory.workingSetSize / 1024) })),
      fps: lastFps,
    },
    displays: screen.getAllDisplays().map((d) => ({ id: d.id, bounds: d.bounds, scaleFactor: d.scaleFactor, primary: d.id === screen.getPrimaryDisplay().id })),
  };
}

// ---------------------------------------------------------------- lifecycle
function cleanup() {
  if (quitting) return;
  quitting = true;
  for (const t of intervals) clearInterval(t);
  reminders?.stop();
  monitor?.stop();
  teleporter?.stopAuto();
  wake?.stop();
  convo?.stop();
  drag?.end();
  settings?.flush();
  globalShortcut.unregisterAll();
  tray?.destroy();
  tray = null;
  try { fs.rmSync(markerFile(), { force: true }); } catch { /* */ }
  log?.info('clean shutdown');
}
function restart() { cleanup(); app.relaunch(); app.exit(0); }
async function resetAll() {
  convo.stop();
  history.clear(); memory.clear(); notes.clear(); reminders.clear(); secrets.clear();
  settings.reset();
  settings.update({ firstRunComplete: false });
  settings.flush();
  log.info('all data reset by user');
  restart();
}

app.on('before-quit', cleanup);
app.on('window-all-closed', () => { /* tray app: keep running until Quit */ });
process.on('uncaughtException', (e) => { log?.error('uncaught exception', { error: e }); });
process.on('unhandledRejection', (e) => { log?.error('unhandled rejection', { error: e as Error }); });
app.on('child-process-gone', (_e, d) => log?.warn('child process gone', { type: d.type, reason: d.reason }));
