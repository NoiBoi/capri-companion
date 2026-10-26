import fs from 'node:fs';
import path from 'node:path';
import {
  app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut, screen, safeStorage, shell, dialog,
  Notification, powerMonitor, session, desktopCapturer, type IpcMainInvokeEvent, type MenuItemConstructorOptions,
} from 'electron';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { runTask, type Screen } from './agent/computer';
import { findCodex, runCodex } from './ai/codexAccount';
import { claudeSignIn, claudeSignOut, claudeStatus, claudeSubmitCode } from './ai/claudeAccount';
import { newId } from './store/jsonFile';
import * as hands from './desktop/input';
import { z } from 'zod';
import type { ActionRequest, CharacterCue, Diagnostics, InvokeChannel, ChatMessage, AssistantPhase } from '../shared/ipc';
import { BuddyBubble } from './bubble';
import type { Settings } from '../shared/settings';
import { IDLE_REMARKS, mayInterrupt } from '../shared/behaviorRules';
import { speechAllowed, type SpeechReason } from '../shared/speechPolicy';
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
import { foregroundHandle, foregroundRect, handleToBigint, isOtherAppFullscreen, loadWin32, win32Status, externalWindows, windowRect, leftButtonDown } from './desktop/win32';
import { snapWindow, windowAttachment, HANG_RATIO, type PerchWindow } from './desktop/perch';
import { speechRequest } from './voice/tts';
import { probeWindowsRecognizer, transcribeOpenAI, transcribeWindows, WakeWordListener } from './voice/speech';

const T0 = performance.timeOrigin;
const TEST = process.env.CAPRI_TEST === '1';
if (process.env.CAPRI_USER_DATA) app.setPath('userData', path.resolve(process.env.CAPRI_USER_DATA));
// test/capture only: render at a fixed device scale (crisp high-res frames for the trailer harness)
if (process.env.CAPRI_TEST === '1' && process.env.CAPRI_DPR) app.commandLine.appendSwitch('force-device-scale-factor', process.env.CAPRI_DPR);
app.setAppUserModelId('dev.capri.buddy');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => { if (argv.includes('--quit')) app.quit(); else bubble?.open(); });
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
let bubble: BuddyBubble;
let panelWin: BrowserWindow | null = null;
let tray: Tray | null = null;
let drag: DragController;
let wake: WakeWordListener;
let startupMs = 0;
let characterReady: (() => void) | null = null;
let monitor: ConnectionMonitor;
let teleporter: TeleportController;
let perchRect: DRect | null = null;
let perchHandle: bigint | null = null;
let perchFraction = 0.5;
let perchPinned = false;
let pendingPerch: PerchWindow | null = null;
let perchMode: 'perch' | 'hang' = 'perch';
let perchMoving = false;
let perchChangedAt = 0;
function placement(w: PerchWindow, fraction?: number) {
  return windowAttachment(herBounds(), w.rect, SEAT_RATIO, displayFor(w.rect, displaysNow()).workArea.y, fraction, perchHandle === w.handle ? perchMode : undefined);
}

function windowsForPlacement(): PerchWindow[] {
  if (TEST && (globalThis as Record<string, unknown>).__capriWindowsOverride !== undefined) return (globalThis as unknown as { __capriWindowsOverride: PerchWindow[] }).__capriWindowsOverride;
  if (TEST && (globalThis as Record<string, unknown>).__capriFgOverride !== undefined) { const r = fgRectDip(); return r ? [{ handle: -1n, rect: r }] : []; }
  return externalWindows(ownHandles()).map((w) => ({ handle: w.handle, rect: screen.screenToDipRect(null, w.rect) }));
}
function trackedWindowFor(handle: bigint | null): DRect | null {
  if (TEST) return windowsForPlacement().find((w) => w.handle === handle)?.rect ?? null;
  const r = handle ? windowRect(handle) : null;
  return r ? screen.screenToDipRect(null, r) : null;
}
function detachPerch() { perchRect = null; perchHandle = null; perchPinned = false; perchMoving = false; cue({ type: 'attachment', mode: null }); }
function attachPerch(w: PerchWindow, pinned: boolean, fraction?: number) {
  if (!charWin) return;
  const a = placement(w, fraction);
  perchMode = a.mode; perchMoving = false;
  cue({ type: 'attachment', mode: perchMode });
  perchHandle = w.handle; perchRect = w.rect; perchFraction = a.fraction; perchPinned = pinned;
  charWin.setBounds(a.bounds);
}
function windowBesidePet(): PerchWindow | null {
  if (!charWin) return null;
  const ws = windowsForPlacement(), b = herBounds(), c = screen.getCursorScreenPoint();
  const fg = fgRectDip();
  const contains = (r: DRect, x: number, y: number) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height;
  return (perchHandle ? ws.find((w) => w.handle === perchHandle) : null)
    ?? snapWindow(ws, b, SEAT_RATIO, 80)
    ?? ws.find((w) => contains(w.rect, c.x, c.y))
    ?? ws.find((w) => contains(w.rect, b.x + b.width / 2, b.y + b.height * SEAT_RATIO))
    ?? ws.find((w) => w.handle === foregroundHandle())
    ?? (TEST && fg ? ws.find((w) => w.rect.x === fg.x && w.rect.y === fg.y && w.rect.width === fg.width) : null) ?? null;
}
async function sitOnWindow(w = windowBesidePet()) {
  if (teleporter.active) return { ok: false, detail: 'Already teleporting.' };
  if (!w) return { ok: false, detail: 'No window underneath Capri to sit on.' };
  pendingPerch = w;
  try {
    await teleporter.jumpTo(() => {
      const rect = trackedWindowFor(w.handle);
      if (!rect) { pendingPerch = null; return { ...herBounds(), kind: 'spot' as const }; }
      pendingPerch = { ...w, rect };
      return { ...placement(pendingPerch).bounds, kind: 'perch' as const };
    }, 'perch_glitch');
    return { ok: true, detail: 'Attached to window.' };
  } finally { pendingPerch = null; }
}
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
  if (perchMoving) return 'air';
  if (perchRect && Math.abs(b.y + b.height * (perchMode === 'hang' ? HANG_RATIO : SEAT_RATIO) - perchRect.y) < 14) return 'window';
  const a = displayFor(b, displaysNow()).workArea;
  if (b.x < a.x - 10) return 'edge_left';
  if (b.x + b.width > a.x + a.width + 10) return 'edge_right';
  if (Math.abs(b.y + b.height * SEAT_RATIO - (a.y + a.height)) <= 12) return 'taskbar';
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
  const freshProfile = !fs.existsSync(path.join(dir, 'settings.json'));
  settings = new SettingsStore(dir);
  if (freshProfile && !TEST && findCodex()) settings.update({ firstRunComplete: true, ai: { provider: 'codex', requestTimeoutSec: 120 }, character: { scale: 0.65, hideOnFullscreen: false }, voice: { ttsEnabled: false } });
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
  bubble = new BuddyBubble({ anchor: () => charWin && !charWin.isDestroyed() ? charWin.getBounds() : null, enabled: () => settings.get().character.speechBubbles && !userHidden && !fullscreenHidden, preload: preloadPath(), log });
  loadWin32(log);
  devGeminiKey = TEST && process.env.CAPRI_NO_DEV_KEY === '1' ? undefined : loadDevKey();
  wake = new WakeWordListener(log);
  wake.on('wake', onWake);
  wake.on('error', (e: Error) => { log.warn('wake word disabled', { error: e }); toPanel('chat:phase', { phase: 'error', detail: e.message }); });

  const actionCtx: ActionContext = {
    settings: () => settings.get(),
    openExternal: (u) => { raiseSoon(); return shell.openExternal(u); },
    openPath: (p) => { raiseSoon(); return shell.openPath(p); },
    notes, reminders, memory,
    now: () => Date.now(),
    teleport: (where) => teleporter.go(where as TeleportTarget, 'ai'),
    emote: (name) => { cue({ type: 'clip', name }); return true; },
    useComputer: (task) => useComputer(task),
  };
  convo = new Conversation({
    settings: () => settings.get(),
    provider: makeProvider,
    history, memories: () => (settings.get().memory.enabled ? memory.approved() : []),
    actionCtx,
    emit: (ch, p) => toPanel(ch, p),
    // replies are the only thing the conversation may voice
    cue: (c) => { if (c.type === 'speak') speak('reply', c.utteranceId, c.text); else cue(c); },
    confirm: requestConfirmation,
    log,
    onProviderResult: (ok, _name, err) => { if (!ok) monitor.reportFailure(err); },
  });
  monitor = new ConnectionMonitor(makeProvider, geminiKeySource, log);
  monitor.on('changed', (st) => { toPanel('connection:status', st); cue({ type: 'connection', state: st.state }); updateTrayMenu(); });
  teleporter = new TeleportController({
    settings: () => settings.get(),
    bounds: () => (charWin && !charWin.isDestroyed() ? herBounds() : null),
    move: (r, how) => {
      if (!charWin || charWin.isDestroyed()) return;
      charWin.setBounds({ ...r, ...herSize() });
      if (how === 'teleport') raiseCharacter(); // keep her above whatever is under her new spot
    },
    moved: (dest) => {
      // remember the window she's sitting on so she can react if it moves or closes
      if (dest.kind === 'perch') {
        const w = pendingPerch ?? windowsForPlacement().find((w) => Math.abs(w.rect.y - (dest.y + dest.height * SEAT_RATIO)) < 8);
        if (w) attachPerch(w, !!pendingPerch); else detachPerch();
      } else detachPerch();
      savePosition();
      sendSurface();
    },
    displays: displaysNow,
    cursor: () => screen.getCursorScreenPoint(),
    activeWindow: () => pendingPerch?.rect ?? windowBesidePet()?.rect ?? fgRectDip(),
    cue,
    aiConnected: () => monitor.connected,
    blocked: () => (perchPinned && perchRect ? 'sitting where you placed her' : convo.busy ? 'conversation in progress' : recording ? 'listening' : drag.active ? 'being dragged' : throwTimer ? 'being thrown' : fullscreenHidden ? 'fullscreen app' : userHidden ? 'hidden'
      : !mayInterrupt(settings.get(), { fullscreen: fullscreenHidden, hidden: userHidden }) ? 'do not disturb / quiet hours' : null),
    // tests may pin the user's idle time so results don't depend on whether someone is at the machine
    userIdleSec: () => (TEST && typeof (globalThis as { __capriIdleOverride?: number }).__capriIdleOverride === 'number' ? (globalThis as { __capriIdleOverride?: number }).__capriIdleOverride! : powerMonitor.getSystemIdleTime()),
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
  intervals.push(setInterval(perchTick, 80));
  intervals.push(setInterval(cursorTick, 40));
  intervals.push(setInterval(raiseTick, 250));
  intervals.push(setInterval(presenceTick, 30_000));
  screen.on('display-removed', reclampCharacter);
  screen.on('display-added', reclampCharacter);
  screen.on('display-metrics-changed', reclampCharacter);
  powerMonitor.on('resume', () => { reminders.tick(); reclampCharacter(); void monitor.check('resume'); });

  if (!s0.firstRunComplete) setTimeout(() => openPanel('welcome'), 800);
  else if (!TEST && process.argv.includes('--panel')) setTimeout(() => bubble.open(), 800);
  if (TEST) (globalThis as Record<string, unknown>).__capri = { get teleporter() { return teleporter; }, get monitor() { return monitor; }, settings, convo, history, memory, notes, reminders, secrets, get charWin() { return charWin; }, get panelWin() { return panelWin; }, bubble, get startupMs() { return startupMs; }, get speakCount() { return speakCount; }, presenceTick, settleAfterDrop, throwCharacter, useComputer, exploreTick, get throwing() { return !!throwTimer; }, pendingConfirms, log };
}

// ---------------------------------------------------------------- desktop-pet handling: drop onto a ledge, throw
/** Dropped near the top edge of the active window or the taskbar: she takes a seat on it (Desktop Mate style). */
// Her size always comes from her scale setting, never from reading the window back: at fractional DPI
// (125%) Windows reports the size a pixel off, and writing that back on every move made her grow.
function herSize() { return characterSize(settings.get().character.scale); }
function herBounds() { const b = charWin!.getBounds(); return { x: b.x, y: b.y, ...herSize() }; }
function settleAfterDrop() {
  if (!charWin || charWin.isDestroyed()) return;
  const b = herBounds();
  const seat = b.y + b.height * SEAT_RATIO;
  detachPerch();
  const target = snapWindow(windowsForPlacement(), b, SEAT_RATIO);
  const work = displayFor(b, displaysNow()).workArea;
  if (target) {
    attachPerch(target, true);
  } else if (Math.abs(work.y + work.height - seat) < 24) {
    charWin.setBounds({ ...b, y: Math.round(work.y + work.height - b.height * SEAT_RATIO) }); // rest on the taskbar
  }
  savePosition();
  sendSurface();
}
let throwTimer: NodeJS.Timeout | null = null;
/** Thrown: she flies with the release velocity, skids with friction and bounces off the screen edges. */
function throwCharacter(v0: { x: number; y: number }) {
  if (!charWin || throwTimer) return;
  let vx = Math.max(-5000, Math.min(5000, v0.x)), vy = Math.max(-5000, Math.min(5000, v0.y));
  let last = Date.now();
  cue({ type: 'react', reaction: 'surprised' });
  cue({ type: 'dash', dir: vx < 0 ? -1 : 1 });
  throwTimer = setInterval(() => {
    const w = charWin;
    if (!w || w.isDestroyed() || drag.active) { stopThrow(); return; }
    const now = Date.now(), dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const b = herBounds();
    const area = displayFor(b, displaysNow()).workArea;
    let x = b.x + vx * dt, y = b.y + vy * dt;
    if (x < area.x - b.width * 0.3) { x = area.x - b.width * 0.3; vx = Math.abs(vx) * 0.55; }
    if (x > area.x + area.width - b.width * 0.7) { x = area.x + area.width - b.width * 0.7; vx = -Math.abs(vx) * 0.55; }
    if (y < area.y - b.height * 0.2) { y = area.y - b.height * 0.2; vy = Math.abs(vy) * 0.55; }
    if (y > area.y + area.height - b.height * SEAT_RATIO) { y = area.y + area.height - b.height * SEAT_RATIO; vy = -Math.abs(vy) * 0.45; }
    const f = Math.pow(0.08, dt); // she floats: air friction, no gravity
    vx *= f; vy *= f;
    w.setBounds({ x: Math.round(x), y: Math.round(y), width: b.width, height: b.height });
    if (Math.hypot(vx, vy) < 70) { stopThrow(); settleAfterDrop(); }
  }, 16);
}
function stopThrow() {
  if (throwTimer) clearInterval(throwTimer);
  throwTimer = null;
  cue({ type: 'dash', dir: 0 });
}

// ---------------------------------------------------------------- windows
function createCharacter() {
  const s = settings.get();
  charWin = createCharacterWindow(s, preloadPath(), log);
  lastScale = s.character.scale;
  drag = new DragController(() => charWin, herSize, (moved) => {
    if (moved) {
      detachPerch();
      settleAfterDrop(); // she stays where you let go (no flinging)
    } else { lastInteraction = Date.now(); cue({ type: 'react', reaction: 'happy' }); interaction('poke'); }
  });
  // At fractional DPI Windows shifts new frameless windows by a few px; without this
  // correction the saved position creeps a little on every launch.
  const intended = charWin.getBounds();
  const target = { ...intended };
  const s0 = settings.get();
  if (s0.character.position) { target.x = s0.character.position.x; target.y = s0.character.position.y; }
  let settled = false;
  let ready = false;
  characterReady = () => {
    if (ready) return;
    ready = true;
    if (!charWin) return;
    const size = characterSize(s0.character.scale);
    charWin.setBounds(clampToDisplays({ ...target, ...size }, displaysNow()));
    setTimeout(() => { settled = true; }, 500);
    if (!userHidden && charWin) reveal(charWin);
    // Creating/resizing a frameless window can reset its native topmost style on Windows.
    // Apply the preference after the first size/show operation, not only at construction.
    charWin.setAlwaysOnTop(settings.get().character.alwaysOnTop, 'floating');
    setTimeout(() => sendSurface(true), 600);
    startupMs = Math.round(Date.now() - T0);
    log.info('character ready', { startupMs });
  };
  charWin.once('ready-to-show', characterReady);
  // 'moved' only fires for user moves on Windows; also persist programmatic/snap moves (debounced)
  let moveTimer: NodeJS.Timeout | null = null;
  charWin.on('move', () => {
    bubble?.reposition();
    if (drag.active || !settled) return;
    if (moveTimer) clearTimeout(moveTimer);
    // whatever moved her, re-check what's under her so she never keeps lying on a ledge that's gone
    moveTimer = setTimeout(() => { savePosition(); sendSurface(); }, 300);
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
  const b = herBounds();
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
  if (!bubble) return;
  if (channel === 'chat:message' && (payload as { message: ChatMessage }).message.role === 'user') bubble.begin();
  else if (channel === 'chat:phase') bubble.phase((payload as { phase: AssistantPhase }).phase);
  else if (channel === 'chat:delta') { const p = payload as { messageId: string; delta: string }; bubble.delta(p.messageId, p.delta); }
  else if (channel === 'chat:done') { const m = (payload as { message: ChatMessage }).message; bubble.done(m); if (m.content && !m.meta?.error) cue({ type: 'textTalk', text: m.content }); }
}
function cue(c: CharacterCue) {
  if (c.type === 'bubble' || c.type === 'remark') bubble?.remark(c.text);
  if (charWin && !charWin.isDestroyed()) charWin.webContents.send('cue', c);
}
let lastInteractionBubble = 0;
function interaction(kind: 'pat' | 'poke') {
  if (convo?.busy || Date.now() - lastInteractionBubble < 12000) return;
  lastInteractionBubble = Date.now();
  const lines = kind === 'pat' ? ['Careful. I could get used to that.', 'Okay, you can stay.', 'Keep going. This is your job now.'] : ['Hey. I felt that.', 'You have my attention. Make it interesting.', 'Poking the construct. Bold choice.'];
  bubble.remark(lines[Math.floor(Math.random() * lines.length)]);
}
/** The single gate for speaking out loud: every utterance names its reason and is logged. */
let speakCount = 0;
function speak(reason: SpeechReason, utteranceId: string, text: string): boolean {
  if (!speechAllowed(reason, settings.get(), { fullscreen: fullscreenHidden, hidden: userHidden })) return false;
  speakCount++;
  log.info('speak', { reason, utteranceId });
  cue({ type: 'speak', utteranceId, text });
  return true;
}

function setCharacterVisible(visible: boolean) {
  if (!charWin) return;
  if (visible) { reveal(charWin); if (settings.get().character.alwaysOnTop) charWin.setAlwaysOnTop(true, 'floating'); }
  else conceal(charWin);
  if (!visible) bubble?.hide();
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
let lastScale = NaN; // the character scale her window was last sized for
function onSettingsChanged(s: Settings) {
  const sig = JSON.stringify([s.ai.provider, s.ai.gemini, s.ai.ollama, s.ai.openai, s.ai.anthropic]);
  if (sig !== lastAiSig) { lastAiSig = sig; void monitor.check('settings changed'); }
  const tsig = JSON.stringify(s.teleport);
  if (tsig !== lastTpSig) { lastTpSig = tsig; teleporter?.rearm(); }
  log.setLevel(s.privacy.logLevel);
  if (charWin && !charWin.isDestroyed()) {
    // only an actual scale change resizes her: at fractional DPI the size reads back ±1 px, and
    // "fixing" that moved her a pixel, which saved the position, which landed here again (a slow
    // endless drift down-right, writing settings three times a second)
    if (s.character.scale !== lastScale) {
      lastScale = s.character.scale;
      const size = characterSize(s.character.scale);
      const b = charWin.getBounds();
      // keep her feet planted: anchor bottom-centre
      const nb = { x: Math.round(b.x + b.width / 2 - size.width / 2), y: b.y + b.height - size.height, ...size };
      charWin.setBounds(clampToDisplays(nb, displaysNow()));
      if (perchHandle && perchRect && !perchMoving) attachPerch({ handle: perchHandle, rect: perchRect }, perchPinned, perchFraction);
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
  if (agentCtrl) { charWin.setIgnoreMouseEvents(true); return; } // while she drives, every click goes past her
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
  return [charWin, panelWin, bubble?.window].filter((w): w is BrowserWindow => !!w && !w.isDestroyed()).map((w) => handleToBigint(w.getNativeWindowHandle()));
}
function isFullscreenNow() { return settings.get().character.hideOnFullscreen && win32Status() === 'active' && isOtherAppFullscreen(ownHandles()); }
function perchTick() {
  if (!perchRect || !charWin || teleporter.active || drag.active) return;
  const now = trackedWindowFor(perchHandle);
  if (!now) { detachPerch(); sendSurface(true); savePosition(); return; }
  const changed = (['x', 'y', 'width', 'height'] as const).some((k) => Math.abs(now[k] - perchRect![k]) > 1);
  if (changed) {
    perchRect = now; perchChangedAt = Date.now();
    if (!perchMoving) { perchMoving = true; cue({ type: 'attachment', mode: 'moving' }); sendSurface(true); }
    return;
  }
  const held = TEST ? !!(globalThis as Record<string, unknown>).__capriWindowHeld : leftButtonDown();
  if (!perchMoving || held || Date.now() - perchChangedAt < 240) return;
  const handle = perchHandle!, fraction = perchFraction, pinned = perchPinned;
  pendingPerch = { handle, rect: now };
  void teleporter.jumpTo(() => {
    const latest = trackedWindowFor(handle);
    // Resolve again after departure so a final OS snap lands on the actual edge.
    if (!latest || perchHandle !== handle) { pendingPerch = null; return { ...herBounds(), kind: 'spot' as const }; }
    pendingPerch = { handle, rect: latest };
    return { ...placement(pendingPerch, fraction).bounds, kind: 'perch' as const };
  }, 'perch_glitch').finally(() => {
    pendingPerch = null;
    if (perchHandle === handle) perchPinned = pinned;
  });
}
let lastCursorSample = '';
function cursorTick() {
  if (TEST || !charWin || charWin.isDestroyed() || userHidden || fullscreenHidden) return;
  const c = screen.getCursorScreenPoint(), b = charWin.getBounds();
  bubble?.reposition();
  const sample = `${c.x},${c.y},${b.x},${b.y},${b.width},${b.height}`;
  if (sample === lastCursorSample) return;
  lastCursorSample = sample;
  cue({ type: 'pointer', x: c.x - b.x, y: c.y - b.y });
}
function fullscreenTick() {
  if (!charWin || userHidden) return;
  const fs_ = isFullscreenNow();
  if (fs_ && !fullscreenHidden) { fullscreenHidden = true; setCharacterVisible(false); log.info('hidden for fullscreen app'); }
  else if (!fs_ && fullscreenHidden) { fullscreenHidden = false; setCharacterVisible(true); }
}
// Always-on-top windows share one topmost band, and a freshly activated app (seen with Windows
// Calculator launched from her own action) can draw over her. Re-assert her place at the top of the
// band whenever the foreground window changes, and a few times after she launches something.
let lastFg = 0n;
function raiseCharacter() {
  if (!charWin || charWin.isDestroyed() || userHidden || fullscreenHidden || !settings.get().character.alwaysOnTop) return;
  charWin.setAlwaysOnTop(true, 'floating');
  charWin.moveTop();
}
function raiseTick() {
  const fg = foregroundHandle();
  if (fg !== lastFg) { lastFg = fg; raiseCharacter(); }
}
// ---------------------------------------------------------------- computer control
// vision models in order of click accuracy; each has its own per-minute quota on free keys
const COMPUTER_MODELS = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
const cooldown = new Map<string, number>();
const noThinkingLevel = new Set<string>(); // models that reject thinkingLevel
let agentCtrl: AbortController | null = null;
async function captureScreen(): Promise<Screen> {
  const d = screen.getPrimaryDisplay();
  const pw = Math.round(d.size.width * d.scaleFactor), ph = Math.round(d.size.height * d.scaleFactor);
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1024, height: Math.round((1024 * ph) / pw) } });
  const src = sources.find((x) => x.display_id === String(d.id)) ?? sources[0];
  return { jpegBase64: src.thumbnail.toJPEG(70).toString('base64'), width: pw, height: ph, x: Math.round(d.bounds.x * d.scaleFactor), y: Math.round(d.bounds.y * d.scaleFactor) };
}
/** She carries out a task with the real mouse and keyboard. Only Esc stops a task the user asked for; while
 * exploring, any mouse movement or keypress of the user's own ends it too. */
async function useComputer(task: string, opts: { explore?: boolean; maxSteps?: number } = {}): Promise<{ ok: boolean; summary: string; steps: number }> {
  const key = secretFor('gemini');
  const viaCodex = settings.get().ai.provider === 'codex';
  if (!key && !viaCodex) return { ok: false, summary: 'Using the computer needs Codex (your account) or a Gemini API key in Model settings.', steps: 0 };
  if (!hands.inputAvailable()) return { ok: false, summary: 'Mouse and keyboard control is unavailable on this system.', steps: 0 };
  if (agentCtrl) return { ok: false, summary: "I'm already in the middle of a task.", steps: 0 };
  const ctrl = (agentCtrl = new AbortController());
  const ai = key ? new GoogleGenAI({ apiKey: key }) : null;
  // the user taking the mouse back: the cursor is somewhere she didn't put it, or (exploring) a key went down
  let expected = hands.cursor(), moving = false, lastOwn = Date.now();
  hands.escapeDown(); // forget an Esc tap from before the task
  const escWatch = setInterval(() => {
    if (hands.escapeDown()) ctrl.abort();
    const c = hands.cursor();
    if (opts.explore && !moving && expected && c && Math.hypot(c.x - expected.x, c.y - expected.y) > 25) { log.info('agent: user took the mouse'); ctrl.abort(); }
    if (opts.explore && Date.now() - lastOwn > 1500 && powerMonitor.getSystemIdleTime() === 0 && Date.now() - started > 3000) { log.info('agent: user is back'); ctrl.abort(); }
  }, 80);
  const started = Date.now();
  // the chat gets out of her way (minimized, not closed) and comes back when she's done
  const panelWasOpen = !!panelWin && !panelWin.isDestroyed() && panelWin.isVisible() && !panelWin.isMinimized();
  if (panelWasOpen) panelWin!.minimize();
  applyMouseMode(false);
  cue({ type: 'bubble', text: opts.explore ? 'Going for a look around.' : 'On it. Press Esc to stop me.' });
  cue({ type: 'workPose', pose: 'back' });
  log.info('agent: start', { chars: task.length });
  try {
    const r = await runTask(task, {
      capture: captureScreen,
      decide: async (prompt, s, signal) => {
        if (viaCodex) return runCodex(prompt + '\nReturn only the requested JSON. Do not use CLI tools. The desktop app executes the actions.', { signal, timeoutMs: settings.get().ai.requestTimeoutSec * 1000, jpegBase64: s.jpegBase64 });
        // free-tier keys allow only a few requests a minute per model: on "too many requests" or "busy"
        // move to the next vision model, and if all of them are cooling down, wait it out
        for (let tries = 0; tries < 8; tries++) {
          const now = Date.now();
          const model = COMPUTER_MODELS.find((m) => (cooldown.get(m) ?? 0) <= now);
          if (!model) {
            const wait = Math.min(...COMPUTER_MODELS.map((m) => cooldown.get(m)!)) - now;
            if (wait > 120_000) break; // every model is gone for good
            cue({ type: 'bubble', text: 'Catching my breath…' });
            await new Promise<void>((r, j) => { const t = setTimeout(r, wait); signal.addEventListener('abort', () => { clearTimeout(t); j(new Error('aborted')); }, { once: true }); });
            continue;
          }
          try {
            const res = await ai!.models.generateContent({
              model,
              contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: s.jpegBase64 } }] }],
              config: {
                responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 600, abortSignal: signal,
                // speed over deliberation: she looks again after every batch anyway
                ...(noThinkingLevel.has(model) ? {} : { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }),
              },
            });
            return res.text ?? '';
          } catch (e) {
            const msg = String((e as Error).message ?? e);
            if (!noThinkingLevel.has(model) && /\b400\b|INVALID_ARGUMENT/i.test(msg) && /think/i.test(msg)) { noThinkingLevel.add(model); continue; }
            if (/\b404\b|NOT_FOUND|no longer available/i.test(msg)) { cooldown.set(model, Number.MAX_SAFE_INTEGER); log.info('agent: model unavailable', { model }); continue; }
            if (!/\b(429|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand/i.test(msg)) throw e;
            const retry = /retry in ([\d.]+)s|"retryDelay":"(\d+)s"/.exec(msg);
            const sec = retry ? Number(retry[1] ?? retry[2]) : /503|UNAVAILABLE|high demand/i.test(msg) ? 8 : 30;
            cooldown.set(model, Date.now() + Math.min(60, sec + 1) * 1000);
            log.info('agent: model cooling down', { model, sec });
          }
        }
        throw new Error('The AI service is busy right now');
      },
      hands: {
        moveTo: async (x, y) => { moving = true; try { await hands.moveTo(x, y); } finally { expected = { x, y }; moving = false; lastOwn = Date.now(); } },
        click: async (b, n) => { await hands.click(b, n); lastOwn = Date.now(); },
        typeText: async (t) => { await hands.typeText(t); lastOwn = Date.now(); },
        keys: async (k) => { const ok = await hands.keys(k); lastOwn = Date.now(); return ok; },
        scroll: (n) => { const ok = hands.scroll(n); lastOwn = Date.now(); return ok; },
      },
      onStep: (step, at) => {
        if (step.say) cue({ type: 'bubble', text: step.say });
        if (at && charWin && !charWin.isDestroyed()) {
          // fly beside the spot she's working on, never on top of it
          const d = screen.getPrimaryDisplay(), sf = d.scaleFactor, b = charWin.getBounds(), a = d.workArea;
          const px = at.x / sf, py = at.y / sf;
          const right = px + 60 + b.width <= a.x + a.width;
          const x = right ? px + 60 : px - 60 - b.width;
          const y = Math.min(Math.max(a.y, py - b.height * 0.45), a.y + a.height - b.height * SEAT_RATIO);
          // far away: glitch out and reappear beside it; close by: stay put
          const dist = Math.hypot(x - b.x, y - b.y);
          if (dist > 220) void teleporter.jumpTo({ x: Math.round(x), y: Math.round(y), width: b.width, height: b.height, kind: 'spot' });
          // a different pose each time she moves: mostly turned to watch her work, sometimes crouched
          if (dist > 220 || Math.random() < 0.25) cue({ type: 'workPose', pose: Math.random() < 0.6 ? 'back' : 'crouch' });
        }
      },
      stopRequested: () => ctrl.signal.aborted,
      log: (m, data) => log.info(m, data as Record<string, unknown>),
    }, ctrl.signal, opts);
    log.info('agent: end', { ok: r.ok, steps: r.steps });
    if (!opts.explore) cue({ type: 'bubble', text: r.ok ? 'Done.' : r.summary.startsWith('Stopped') ? 'Stopped.' : 'I got stuck on that one.' });
    return r;
  } catch (e) {
    log.warn('agent: failed', { error: e as Error });
    return { ok: false, summary: ctrl.signal.aborted ? 'Stopped by the user.' : `Something went wrong: ${(e as Error).message.slice(0, 120)}`, steps: 0 };
  } finally {
    clearInterval(escWatch);
    agentCtrl = null;
    cue({ type: 'workPose', pose: null });
    applyMouseMode(false);
    if (panelWasOpen && panelWin && !panelWin.isDestroyed()) panelWin.restore();
  }
}
// ---------------------------------------------------------------- autonomous exploring
const EXPLORE_SPOTS = [
  { url: 'https://www.reddit.com/r/Edgerunners/', what: 'the Edgerunners subreddit', goal: 'Scroll through the posts, open one or two that look interesting, and form an opinion.' },
  { url: 'https://en.wikipedia.org/wiki/Special:Random', what: 'a random Wikipedia article', goal: 'Read it, follow one link that catches your eye, and decide what you think.' },
  { url: 'https://news.ycombinator.com/', what: 'Hacker News', goal: 'Skim the headlines, open the most interesting story, and react to it.' },
  { url: 'https://cyberpunk.fandom.com/wiki/Capri', what: 'your own page on the Cyberpunk wiki', goal: 'Read what people wrote about you and react to it.' },
];
let exploredThisIdle = false;
async function exploreTick(idleSec: number) {
  const s = settings.get();
  if (idleSec < 60) exploredThisIdle = false; // they were back: next idle stretch may get another look around
  if (!s.behavior.explore || exploredThisIdle || agentCtrl || convo.busy || recording || userHidden || fullscreenHidden) return;
  if (idleSec < s.behavior.exploreAfterMinutes * 60 || !mayInterrupt(s, { fullscreen: fullscreenHidden, hidden: userHidden })) return;
  if (!secretFor('gemini')) return;
  exploredThisIdle = true;
  const spot = EXPLORE_SPOTS[Math.floor(Math.random() * EXPLORE_SPOTS.length)];
  log.info('explore: start', { what: spot.what });
  await shell.openExternal(spot.url);
  await new Promise((r) => setTimeout(r, 3500)); // the browser comes up
  const r = await useComputer(`You just opened ${spot.what} in the browser. ${spot.goal}`, { explore: true, maxSteps: 14 });
  if (r.ok && r.summary) {
    cue({ type: 'bubble', text: r.summary.slice(0, 140) });
    const msg = { id: newId('a'), role: 'assistant' as const, content: `While you were away I looked at ${spot.what}. ${r.summary}`, ts: Date.now(), meta: { provider: 'explore' } };
    history.append(msg);
    toPanel('chat:done', { message: msg });
    speak('proactive', `explore:${msg.id}`, r.summary);
  }
  log.info('explore: end', { ok: r.ok, steps: r.steps });
}
function raiseSoon() { for (const ms of [400, 1200, 2500, 4000]) setTimeout(raiseCharacter, ms); }
function presenceTick() {
  const s = settings.get();
  const idleSec = powerMonitor.getSystemIdleTime();
  const quiet = !mayInterrupt(s, { fullscreen: fullscreenHidden, hidden: userHidden });
  cue({ type: 'presence', idleSec, quiet });
  void exploreTick(idleSec).catch((e) => log.warn('explore failed', { error: e as Error }));
  // idle remarks: only when enabled, allowed, user is present, and nothing happened recently
  const due = Date.now() - Math.max(lastRemark, lastInteraction) > s.behavior.remarkIntervalMinutes * 60_000;
  if (s.behavior.idleRemarks && !quiet && due && idleSec < 120 && !convo.busy && !recording) {
    lastRemark = Date.now();
    const text = IDLE_REMARKS[Math.floor(Math.random() * IDLE_REMARKS.length)];
    cue({ type: 'remark', text }); // a silent bubble; spoken only if proactive voice is enabled too
    speak('proactive', `remark:${Date.now()}`, text);
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
  speak('reminder', `rem:${Date.now()}`, r.kind === 'timer' ? `Timer's up, choom. ${r.text}.` : `Hey — reminder: ${r.text}.`);
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
  tray.on('click', () => bubble.open());
  updateTrayMenu();
}
function updateTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  const s = settings.get();
  const visible = shown(charWin);
  const items: MenuItemConstructorOptions[] = [
    { label: 'Chat…  (Ctrl+Alt+Space)', click: () => bubble.open() },
    { label: recording ? 'Stop listening' : 'Push to talk  (Ctrl+Alt+T)', enabled: s.voice.micPermission, click: () => (recording ? stopRecording() : startRecording()) },
    { type: 'separator' },
    { label: visible ? 'Hide Capri  (Ctrl+Alt+H)' : 'Show Capri  (Ctrl+Alt+H)', click: toggleHidden },
    { label: 'Teleport  (Ctrl+Alt+P)', enabled: visible, click: () => void teleporter.go('auto', 'manual') },
    { label: 'Teleport to cursor', enabled: visible, click: () => void teleporter.go('near_cursor', 'manual') },
    { label: 'Sit on the nearby window', enabled: visible, click: () => void sitOnWindow() },
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
    [['Control+Alt+Space', 'Control+Alt+K'], 'Open chat', () => { summonNearCursor(); bubble.open(); }],
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
  const seatWindow = windowBesidePet(); // capture before the native menu takes focus
  Menu.buildFromTemplate([
    { label: 'Chat', click: () => bubble.open() },
    { label: 'Push to talk', enabled: s.voice.micPermission, click: () => startRecording() },
    { label: 'Stop talking', click: () => convo.stop() },
    { label: 'Teleport', click: () => void teleporter.go('auto', 'manual') },
    { label: 'Sit on this window', enabled: !!seatWindow, click: () => void sitOnWindow(seatWindow) },
    { label: 'Animation', submenu: [['Automatic', 'auto'], ['Stand', 'idle'], ['Sit', 'perch'], ['Grin', 'grin'], ['Sleep', 'sleep'], ['Glitch', 'glitch'], ['Hang', 'dangle']].map(([label, name]) => ({ label, type: 'radio' as const, checked: s.character.animation === name, click: () => settings.update({ character: { animation: name } }) })) },
    { label: 'Facing', submenu: [['Follow cursor', 'cursor'], ['Original artwork', 'original'], ['Left', 'left'], ['Right', 'right']].map(([label, name]) => ({ label, type: 'radio' as const, checked: s.character.facing === name, click: () => settings.update({ character: { facing: name } }) })) },
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
type Origin = 'char' | 'panel' | 'bubble' | 'chat' | 'any';
function fromOrigin(e: IpcMainInvokeEvent, origin: Origin) {
  const id = e.sender.id;
  const isChar = !!charWin && !charWin.isDestroyed() && charWin.webContents.id === id;
  const isPanel = !!panelWin && !panelWin.isDestroyed() && panelWin.webContents.id === id;
  const isBubble = !!bubble?.window && !bubble.window.isDestroyed() && bubble.window.webContents.id === id;
  if (origin === 'char') return isChar;
  if (origin === 'panel') return isPanel;
  if (origin === 'bubble') return isBubble;
  if (origin === 'chat') return isPanel || isBubble;
  return isChar || isPanel || isBubble;
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

  handle('chat:send', 'chat', z.object({ text: str(20_000), viaVoice: z.boolean().optional() }), async ({ text }) => {
    lastInteraction = Date.now();
    return { messageId: await convo.send(text) };
  });
  handle('chat:stop', 'any', none, () => { agentCtrl?.abort(); convo.stop(); });
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
  handle('claude:status', 'panel', none, () => claudeStatus());
  handle('claude:signin', 'panel', none, async () => {
    const r = await claudeSignIn();
    if (r.ok && r.url && /^https:\/\/(claude\.com|claude\.ai|platform\.claude\.com)\//.test(r.url)) await shell.openExternal(r.url);
    return { ok: r.ok, detail: r.detail };
  });
  handle('claude:code', 'panel', str(500), async (code) => { const s = await claudeSubmitCode(code); if (s.loggedIn) void monitor.check('claude sign-in'); return s; });
  handle('claude:signout', 'panel', none, async () => { await claudeSignOut(); void monitor.check('claude sign-out'); });
  handle('connection:get', 'any', none, () => monitor.status);
  handle('teleport:now', 'any', z.enum(TELEPORT_TARGETS as [TeleportTarget, ...TeleportTarget[]]).optional(), (t) => t === 'perch' ? sitOnWindow() : teleporter.go(t ?? 'auto', 'manual'));
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
  handle('char:click', 'char', none, () => { lastInteraction = Date.now(); bubble.open(); });
  handle('char:interaction', 'char', z.enum(['pat', 'poke']), interaction);
  handle('bubble:open', 'any', none, () => bubble.open());
  handle('bubble:close', 'bubble', none, () => bubble.dismiss());
  handle('bubble:get', 'bubble', none, () => bubble.state);
  handle('bubble:resize', 'bubble', z.number().finite().min(40).max(1200), (height) => bubble.resize(height));
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
  handle('char:ready', 'char', none, () => characterReady?.());
  handle('tts:fetch', 'char', str(4000), async (text) => {
    const v = settings.get().voice;
    const key = secrets.get('openaiVoice') ?? secrets.get('openai');
    const res = await httpFetch(`${v.openaiTts.baseUrl.replace(/\/+$/, '')}/audio/speech`, {
      method: 'POST', timeoutMs: 30_000,
      headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(speechRequest(text, v)),
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
  bubble?.close();
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
