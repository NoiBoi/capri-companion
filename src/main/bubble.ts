import { screen, type BrowserWindow, type Rectangle } from 'electron';
import { createBubbleWindow, reveal, conceal, OFFSCREEN } from './windows';
import type { BubbleState, AssistantPhase, ChatMessage } from '../shared/ipc';
import type { Logger } from './log';

export function bubblePosition(pet: Rectangle, size: { width: number; height: number }, area: Rectangle) {
  const right = Math.round(pet.x + pet.width * 0.70 + 10), left = Math.round(pet.x + pet.width * 0.30 - size.width - 10);
  const side = right + size.width <= area.x + area.width ? 'right' : 'left';
  return { side: side as 'left' | 'right', x: Math.round(Math.max(area.x + 4, Math.min(area.x + area.width - size.width - 4, side === 'right' ? right : left))),
    y: Math.round(Math.max(area.y + 4, Math.min(area.y + area.height - size.height - 4, pet.y + pet.height * 0.18))) };
}

export class BuddyBubble {
  window: BrowserWindow | null = null;
  state: BubbleState = { text: '', phase: 'idle', composer: false, side: 'right' };
  private id = '';
  private timer: NodeJS.Timeout | null = null;
  private visible = false;
  private dismissed = false;
  private disposed = false;
  constructor(private d: { anchor(): Rectangle | null; enabled(): boolean; preload: string; log: Logger }) {}
  private ensure() {
    if (this.window && !this.window.isDestroyed()) return this.window;
    const win = (this.window = createBubbleWindow(this.d.preload, this.d.log));
    win.webContents.once('did-finish-load', () => { this.send(); if (this.visible) { reveal(win, this.state.composer); if (this.state.composer && !OFFSCREEN) win.focus(); } });
    win.on('closed', () => { if (this.window === win) this.window = null; });
    return win;
  }
  private send() { if (this.window && !this.window.isDestroyed() && !this.window.webContents.isLoading()) this.window.webContents.send('bubble:state', this.state); }
  private show(focus = false) {
    if (this.disposed || this.dismissed || (!this.d.enabled() && !this.state.composer)) return;
    this.visible = true;
    const win = this.ensure(); this.reposition(); this.send();
    win.setFocusable(this.state.composer);
    if (!win.webContents.isLoading()) { reveal(win, focus); if (focus && !OFFSCREEN) win.focus(); }
  }
  private expire() {
    if (this.disposed) return;
    if (this.timer) clearTimeout(this.timer);
    if (this.state.composer) return;
    this.timer = setTimeout(() => this.hide(), Math.min(90000, Math.max(16000, this.state.text.length * 65)));
    this.timer.unref?.();
  }
  open() { this.dismissed = false; this.state.composer = true; if (this.timer) clearTimeout(this.timer); this.show(true); }
  hide() { this.visible = false; if (this.window && !this.window.isDestroyed()) conceal(this.window); }
  dismiss() { this.dismissed = true; this.state.composer = false; this.hide(); }
  begin() { this.id = ''; this.state.text = ''; this.dismissed = false; if (this.timer) clearTimeout(this.timer); }
  phase(p: AssistantPhase) { this.state.phase = p; if (p === 'thinking' || p === 'listening' || p === 'transcribing') this.show(); else this.send(); }
  delta(id: string, text: string) { if (this.id !== id) { this.id = id; this.state.text = ''; } this.state.text = (this.state.text + text).slice(-20000); this.show(); }
  done(message: ChatMessage) { this.id = message.id; this.state.text = message.content; this.state.phase = message.meta?.error ? 'error' : 'idle'; if (message.content) this.show(); this.expire(); }
  remark(text: string) { if (this.state.composer) return; this.dismissed = false; this.state.text = text; this.state.phase = 'idle'; this.show(); this.expire(); }
  resize(height: number) { const w = this.window; if (!w || w.isDestroyed()) return; const h = Math.round(Math.max(75, Math.min(360, height))); if (w.getBounds().height !== h) w.setSize(340, h); this.reposition(); }
  reposition() {
    const pet = this.d.anchor(), win = this.window;
    if (!pet || !win || win.isDestroyed()) return;
    const b = win.getBounds(), pos = bubblePosition(pet, b, screen.getDisplayMatching(pet).workArea);
    if (b.x !== pos.x || b.y !== pos.y) win.setPosition(pos.x, pos.y);
    if (this.state.side !== pos.side) { this.state.side = pos.side; this.send(); }
  }
  close() { this.disposed = true; if (this.timer) clearTimeout(this.timer); this.window?.destroy(); this.window = null; }
}
