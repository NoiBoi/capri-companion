import { BrowserWindow, screen, type Rectangle } from 'electron';
import { OFFSCREEN } from './windows';

/**
 * Teleport trail: a jagged red line that zaps across the screen from where she was to where she lands.
 * Drawn in a transparent, click-through, non-focusable overlay over the displays involved; static page,
 * no preload, no node access.
 */
const PAGE = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;overflow:hidden;background:transparent">
<canvas id="c"></canvas><script>
const c = document.getElementById('c'), g = c.getContext('2d');
function fit() { const d = devicePixelRatio; c.width = innerWidth * d; c.height = innerHeight * d; c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px'; }
fit(); addEventListener('resize', fit);
let run = 0;
window.zap = (a, b, ms) => {
  const id = ++run, t0 = performance.now(), n = 22;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const bolt = () => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, j = i && i < n ? (Math.random() * 2 - 1) * Math.min(40, L * 0.05) : 0; return [a[0] + dx * u + nx * j, a[1] + dy * u + ny * j]; });
  let pts = bolt();
  const frame = (now) => {
    if (id !== run) return;
    const k = (now - t0) / ms, d = devicePixelRatio;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    if (k >= 1) return;
    if (Math.random() < 0.35) pts = bolt(); // the bolt re-forms while it travels
    const head = Math.min(1, k / 0.4), tail = Math.max(0, (k - 0.3) / 0.7);
    const i0 = Math.floor(tail * n), i1 = Math.min(n, Math.ceil(head * n));
    g.setTransform(d, 0, 0, d, 0, 0); g.lineJoin = 'miter'; g.lineCap = 'butt';
    for (const [w, col, blur] of [[26, 'rgba(242,21,76,0.3)', 36], [9, '#f2154c', 16], [3, '#ffffff', 6]]) {
      g.lineWidth = w; g.strokeStyle = col; g.shadowColor = '#f2154c'; g.shadowBlur = blur;
      g.beginPath();
      for (let i = i0; i <= i1; i++) i === i0 ? g.moveTo(pts[i][0], pts[i][1]) : g.lineTo(pts[i][0], pts[i][1]);
      g.stroke();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};
</script></body></html>`;

let win: BrowserWindow | null = null;
let hideTimer: NodeJS.Timeout | null = null;
/** Number of zaps fired (tests read this; off-screen mode never shows the overlay). */
export let zapCount = 0;

function union(rs: Rectangle[]): Rectangle {
  const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y));
  return { x, y, width: Math.max(...rs.map((r) => r.x + r.width)) - x, height: Math.max(...rs.map((r) => r.y + r.height)) - y };
}

/** Fire a zap between the centres of two window rects (DIP). */
export function zap(from: Rectangle, to: Rectangle, ms = 560) {
  zapCount++;
  if (OFFSCREEN) return;
  const a = { x: from.x + from.width / 2, y: from.y + from.height * 0.4 }, b = { x: to.x + to.width / 2, y: to.y + to.height * 0.4 };
  const area = union([screen.getDisplayNearestPoint({ x: Math.round(a.x), y: Math.round(a.y) }).bounds, screen.getDisplayNearestPoint({ x: Math.round(b.x), y: Math.round(b.y) }).bounds]);
  if (!win || win.isDestroyed()) {
    win = new BrowserWindow({
      ...area, frame: false, transparent: true, resizable: false, movable: false, focusable: false, skipTaskbar: true, hasShadow: false, show: false,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
    });
    win.setIgnoreMouseEvents(true);
    win.setAlwaysOnTop(true, 'screen-saver');
    void win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(PAGE));
  }
  const w = win;
  const fire = () => {
    w.setBounds(area);
    w.showInactive();
    void w.webContents.executeJavaScript(`zap(${JSON.stringify([a.x - area.x, a.y - area.y])}, ${JSON.stringify([b.x - area.x, b.y - area.y])}, ${ms})`).catch(() => {});
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (!w.isDestroyed()) w.hide(); }, ms + 120);
  };
  if (w.webContents.isLoading()) w.webContents.once('did-finish-load', fire); else fire();
}

export function disposeZap() { if (win && !win.isDestroyed()) win.destroy(); win = null; }
