// Minimal Win32 bindings via koffi (prebuilt FFI, no compiler needed). Every call degrades
// to a safe default if the library can't load, and diagnostics report the status.
import type { Logger } from '../log';

type Fn = (...a: unknown[]) => unknown;
interface Api {
  GetForegroundWindow: Fn; GetWindowRect: Fn; MonitorFromWindow: Fn; GetMonitorInfoW: Fn;
  GetClassNameW: Fn; SHQueryUserNotificationState: Fn; GetAsyncKeyState: Fn; address: (p: unknown) => bigint;
  EnumWindows: Fn; IsWindowVisible: Fn; IsIconic: Fn; IsWindow: Fn; GetWindow: Fn;
  DwmGetWindowAttribute: Fn;
}
let api: Api | null = null;
let loadError: string | null = null;

export function loadWin32(log?: Logger): boolean {
  if (api || loadError) return !!api;
  if (process.platform !== 'win32') { loadError = 'not Windows'; return false; }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    const shell32 = koffi.load('shell32.dll');
    const dwm = koffi.load('dwmapi.dll');
    koffi.proto('bool __stdcall CAPRI_ENUM_WINDOW(void* hwnd, intptr_t param)');
    const RECT = koffi.struct('CAPRI_RECT', { left: 'long', top: 'long', right: 'long', bottom: 'long' });
    koffi.struct('CAPRI_MONITORINFO', { cbSize: 'uint32', rcMonitor: RECT, rcWork: RECT, dwFlags: 'uint32' });
    api = {
      GetForegroundWindow: user32.func('void* __stdcall GetForegroundWindow()'),
      GetWindowRect: user32.func('bool __stdcall GetWindowRect(void* hWnd, _Out_ CAPRI_RECT* rect)'),
      MonitorFromWindow: user32.func('void* __stdcall MonitorFromWindow(void* hwnd, uint32 flags)'),
      GetMonitorInfoW: user32.func('bool __stdcall GetMonitorInfoW(void* hMonitor, _Inout_ CAPRI_MONITORINFO* info)'),
      GetClassNameW: user32.func('int __stdcall GetClassNameW(void* hWnd, _Out_ uint16_t* buf, int max)'),
      GetAsyncKeyState: user32.func('int16 __stdcall GetAsyncKeyState(int vKey)'),
      SHQueryUserNotificationState: shell32.func('long __stdcall SHQueryUserNotificationState(_Out_ int* state)'),
      address: (p: unknown) => (p ? BigInt(koffi.address(p)) : 0n),
      EnumWindows: user32.func('bool __stdcall EnumWindows(CAPRI_ENUM_WINDOW* callback, intptr_t param)'),
      IsWindowVisible: user32.func('bool __stdcall IsWindowVisible(void* hwnd)'),
      IsIconic: user32.func('bool __stdcall IsIconic(void* hwnd)'),
      IsWindow: user32.func('bool __stdcall IsWindow(void* hwnd)'),
      GetWindow: user32.func('void* __stdcall GetWindow(void* hwnd, uint32 command)'),
      DwmGetWindowAttribute: dwm.func('long __stdcall DwmGetWindowAttribute(void* hwnd, uint32 attr, void* value, uint32 size)'),
    };
    return true;
  } catch (e) {
    loadError = (e as Error).message;
    log?.warn('win32 bindings unavailable; fullscreen detection disabled', { error: loadError });
    return false;
  }
}
export const win32Status = () => (api ? 'active' : 'unavailable') as 'active' | 'unavailable';

const SHELL_CLASSES = new Set(['Progman', 'WorkerW', 'Shell_TrayWnd', 'Shell_SecondaryTrayWnd']);
export interface ExternalWindow { handle: bigint; rect: { x: number; y: number; width: number; height: number } }

/** Follow a specific window regardless of which app has keyboard focus. Physical pixels. */
export function windowRect(handle: bigint): ExternalWindow['rect'] | null {
  if (!api || !handle) return null;
  try {
    if (!api.IsWindow(handle) || !api.IsWindowVisible(handle) || api.IsIconic(handle)) return null;
    const r: { left?: number; top?: number; right?: number; bottom?: number } = {};
    if (!api.GetWindowRect(handle, r)) return null;
    // DWM's visible frame excludes the invisible resize border around ordinary windows.
    const native = new Int32Array(4);
    if (api.DwmGetWindowAttribute(handle, 9, native, 16) === 0) [r.left, r.top, r.right, r.bottom] = native;
    const rect = { x: r.left!, y: r.top!, width: r.right! - r.left!, height: r.bottom! - r.top! };
    return rect.width > 80 && rect.height > 60 ? rect : null;
  } catch { return null; }
}

/** Visible application windows in front-to-back order; no titles or contents are read. */
export function externalWindows(ownHandles: bigint[]): ExternalWindow[] {
  if (!api) return [];
  const result: ExternalWindow[] = [];
  try {
    api.EnumWindows((hwnd: unknown) => {
      const handle = api!.address(hwnd);
      if (!handle || ownHandles.includes(handle) || api!.GetWindow(hwnd, 4 /* owner */)) return true;
      const buf = new Uint16Array(128);
      const n = api!.GetClassNameW(hwnd, buf, buf.length) as number;
      const cls = String.fromCharCode(...buf.slice(0, Math.max(0, n)));
      if (SHELL_CLASSES.has(cls) || cls === '#32768' || cls === 'tooltips_class32') return true;
      const cloaked = new Int32Array(1);
      if (api!.DwmGetWindowAttribute(hwnd, 14, cloaked, 4) === 0 && cloaked[0]) return true;
      const rect = windowRect(handle);
      if (rect) result.push({ handle, rect });
      return true;
    }, 0);
  } catch { /* return the windows collected before an unavailable window */ }
  return result;
}

/**
 * True when some other app is fullscreen (game, video, presentation).
 * `ownHandles` = native handles of our windows (excluded).
 */
export function isOtherAppFullscreen(ownHandles: bigint[]): boolean {
  if (!api) return false;
  try {
    const st = [0];
    if (api.SHQueryUserNotificationState(st) === 0 && [2, 3, 4].includes(st[0])) return true; // BUSY, D3D_FULL_SCREEN, PRESENTATION
    const hwnd = api.GetForegroundWindow();
    if (!hwnd || ownHandles.includes(api.address(hwnd))) return false;
    const buf = new Uint16Array(64);
    const n = api.GetClassNameW(hwnd, buf, 64) as number;
    const cls = String.fromCharCode(...buf.slice(0, Math.max(0, n)));
    if (SHELL_CLASSES.has(cls)) return false;
    const r: { left?: number; top?: number; right?: number; bottom?: number } = {};
    if (!api.GetWindowRect(hwnd, r)) return false;
    const mon = api.MonitorFromWindow(hwnd, 2 /* MONITOR_DEFAULTTONEAREST */);
    const mi = { cbSize: 72, rcMonitor: {} as typeof r, rcWork: {}, dwFlags: 0 };
    if (!api.GetMonitorInfoW(mon, mi)) return false;
    const m = mi.rcMonitor;
    return r.left! <= m.left! && r.top! <= m.top! && r.right! >= m.right! && r.bottom! >= m.bottom!;
  } catch {
    return false;
  }
}

/** Rect (physical px) of the foreground app window, excluding the shell and our own windows. */
export function foregroundRect(ownHandles: bigint[]): { x: number; y: number; width: number; height: number } | null {
  if (!api) return null;
  try {
    const hwnd = api.GetForegroundWindow();
    if (!hwnd || ownHandles.includes(api.address(hwnd))) return null;
    const buf = new Uint16Array(64);
    const n = api.GetClassNameW(hwnd, buf, 64) as number;
    if (SHELL_CLASSES.has(String.fromCharCode(...buf.slice(0, Math.max(0, n))))) return null;
    const r: { left?: number; top?: number; right?: number; bottom?: number } = {};
    if (!api.GetWindowRect(hwnd, r)) return null;
    return { x: r.left!, y: r.top!, width: r.right! - r.left!, height: r.bottom! - r.top! };
  } catch { return null; }
}

/** Is the left mouse button physically down? (used to end drags robustly). Null if unknown. */
/** Handle of the foreground window (0n when none or unavailable). */
export function foregroundHandle(): bigint {
  if (!api) return 0n;
  try { const h = api.GetForegroundWindow(); return h ? api.address(h) : 0n; } catch { return 0n; }
}

export function leftButtonDown(): boolean | null {
  if (!api) return null;
  try { return ((api.GetAsyncKeyState(0x01) as number) & 0x8000) !== 0; } catch { return null; }
}

/** Read a BrowserWindow native handle Buffer as a bigint. */
export function handleToBigint(buf: Buffer): bigint {
  return buf.length >= 8 ? buf.readBigUInt64LE(0) : BigInt(buf.readUInt32LE(0));
}
