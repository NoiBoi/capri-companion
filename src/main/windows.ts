import path from 'node:path';
import { BrowserWindow, screen, shell, type Rectangle } from 'electron';
import type { Settings } from '../shared/settings';
import { clampToDisplays, restorePosition, type DisplayLike } from './desktop/displays';
import { leftButtonDown } from './desktop/win32';
import type { Logger } from './log';

export const BASE_SIZE = { width: 340, height: 520 }; // wide enough for the hair cloud + a leg laid along a ledge
/** Test-only: render windows off-screen so automated runs never appear on the user's desktop. */
export const OFFSCREEN = process.env.CAPRI_TEST === '1' && process.env.CAPRI_OFFSCREEN === '1';

/** Show a window — in off-screen test mode only mark it logically shown (rendering continues off-screen). */
export function reveal(win: BrowserWindow, focus = false) {
  (win as unknown as { capriShown: boolean }).capriShown = true;
  if (OFFSCREEN) return;
  if (focus) win.show(); else win.showInactive();
}
export function conceal(win: BrowserWindow) {
  (win as unknown as { capriShown: boolean }).capriShown = false;
  win.hide();
}
export const shown = (win: BrowserWindow | null | undefined) => !!win && !win.isDestroyed() && (OFFSCREEN ? (win as unknown as { capriShown?: boolean }).capriShown === true : win.isVisible());
const RENDERER_DIR = path.join(__dirname, '..', 'renderer');

export function characterSize(scale: number) {
  return { width: Math.round(BASE_SIZE.width * scale), height: Math.round(BASE_SIZE.height * scale) };
}

export function displaysNow(): DisplayLike[] {
  return screen.getAllDisplays().map((d) => ({ id: d.id, workArea: d.workArea, bounds: d.bounds, scaleFactor: d.scaleFactor }));
}

/** Common hardening for every window we create. */
function harden(win: BrowserWindow, log: Logger) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); log.warn('blocked navigation', { url }); }
  });
  win.webContents.on('will-attach-webview', (e) => e.preventDefault());
}

export function createCharacterWindow(s: Settings, preload: string, log: Logger): BrowserWindow {
  const size = characterSize(s.character.scale);
  const pos = restorePosition(s.character.position, size, displaysNow(), screen.getPrimaryDisplay().id);
  const win = new BrowserWindow({
    ...pos,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: false, // never steals keyboard focus
    show: false,
    title: 'Capri',
    alwaysOnTop: s.character.alwaysOnTop,
    webPreferences: {
      offscreen: OFFSCREEN,
      preload,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: true,
    },
  });
  if (s.character.alwaysOnTop) win.setAlwaysOnTop(true, 'floating');
  win.setIgnoreMouseEvents(true, { forward: true });
  win.setOpacity(s.character.opacity);
  harden(win, log);
  void win.loadFile(path.join(RENDERER_DIR, 'character.html'));
  return win;
}

export function createPanelWindow(near: Rectangle, preload: string, log: Logger, tab?: string): BrowserWindow {
  const size = { width: 420, height: 620 };
  const display = screen.getDisplayMatching(near).workArea;
  // prefer the left side of the character, else the right
  let x = near.x - size.width - 8;
  if (x < display.x) x = near.x + near.width + 8;
  const y = Math.min(Math.max(display.y, near.y + near.height - size.height), display.y + display.height - size.height);
  const r = clampToDisplays({ x, y, ...size }, displaysNow(), size.width);
  const win = new BrowserWindow({
    ...r,
    minWidth: 340,
    minHeight: 420,
    frame: false,
    backgroundColor: '#0b0912',
    show: false,
    title: 'Capri',
    alwaysOnTop: true,
    webPreferences: { offscreen: OFFSCREEN, preload, contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true },
  });
  harden(win, log);
  void win.loadFile(path.join(RENDERER_DIR, 'panel.html'), tab ? { hash: tab } : undefined);
  win.once('ready-to-show', () => reveal(win, true));
  return win;
}

/**
 * Drag the character window with the cursor. Main-process driven (works with
 * focusable:false and across monitors with different DPI). Ends on mouseup or,
 * as a safety net, when the physical button is released outside the window.
 */
export class DragController {
  private timer: NodeJS.Timeout | null = null;
  private offset = { x: 0, y: 0 };
  private start = { x: 0, y: 0 };
  moved = false;
  constructor(private win: () => BrowserWindow | null, private onEnd: (moved: boolean) => void) {}
  begin() {
    const w = this.win();
    if (!w || this.timer) return;
    const c = screen.getCursorScreenPoint();
    const [wx, wy] = w.getPosition();
    this.offset = { x: c.x - wx, y: c.y - wy };
    this.start = c;
    this.moved = false;
    this.timer = setInterval(() => this.step(), 16);
  }
  private step() {
    const w = this.win();
    if (!w || w.isDestroyed()) return this.end();
    if (leftButtonDown() === false) return this.end();
    const c = screen.getCursorScreenPoint();
    if (!this.moved && Math.hypot(c.x - this.start.x, c.y - this.start.y) < 4) return;
    this.moved = true;
    const [width, height] = w.getSize();
    w.setBounds({ x: c.x - this.offset.x, y: c.y - this.offset.y, width, height });
  }
  end() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    const w = this.win();
    if (w && !w.isDestroyed() && this.moved) {
      const b = w.getBounds();
      w.setBounds(clampToDisplays(b, displaysNow()));
    }
    this.onEnd(this.moved);
  }
  get active() { return !!this.timer; }
}
