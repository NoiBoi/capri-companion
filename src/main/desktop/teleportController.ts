import type { Settings } from '../../shared/settings';
import type { CharacterCue } from '../../shared/ipc';
import type { Logger } from '../log';
import type { DisplayLike, Rect } from './displays';
import { chooseDestination, nextAutoDelay, type Destination, type TeleportTarget } from './teleport';

export interface TeleportDeps {
  settings(): Settings;
  bounds(): Rect | null; // character window bounds, null if no window
  move(r: Rect, how?: 'teleport' | 'glide'): void; // actually reposition the native window
  displays(): DisplayLike[];
  cursor(): { x: number; y: number };
  activeWindow(): Rect | null; // DIP rect of the foreground app
  cue(c: CharacterCue): void;
  aiConnected(): boolean;
  /** Reason autonomous behaviour must not run right now, or null. */
  blocked(): string | null;
  userIdleSec(): number;
  /** After every move: lets the app work out where she now stands (taskbar / window / air / edge). */
  moved?(d: Destination, how: 'teleport' | 'glide'): void;
  arrived?(d: Destination, reason: 'manual' | 'auto' | 'ai' | 'direct'): void;
  log: Logger;
}

/**
 * Real desktop teleport: departure FX at the old spot → native window moves → arrival FX.
 * Each FX phase is acknowledged by the renderer (with a timeout so a stalled renderer
 * can never strand her mid-teleport).
 */
export class TeleportController {
  private seq = 0;
  private waiting = new Map<string, () => void>();
  private busy = false;
  private autoTimer: NodeJS.Timeout | null = null;
  private nextAt: number | null = null;
  last: string | null = null;
  count = 0;
  lastBlocked: string | null = null;

  constructor(private d: TeleportDeps) {}

  get active() { return this.busy; }
  private automaticBlock() {
    const reason = this.d.blocked();
    // The exploration owner may still request automatic travel itself.
    return reason === 'window exploration handles autonomous movement' ? null : reason;
  }

  /** Renderer finished a phase. */
  ack(id: number, phase: 'out' | 'in') { this.waiting.get(`${id}:${phase}`)?.(); }

  private waitAck(id: number, phase: 'out' | 'in', ms: number) {
    return new Promise<boolean>((resolve) => {
      const key = `${id}:${phase}`;
      const t = setTimeout(() => { this.waiting.delete(key); resolve(false); }, ms);
      this.waiting.set(key, () => { clearTimeout(t); this.waiting.delete(key); resolve(true); });
    });
  }

  /** Fly straight to a spot (computer control: she follows what she's working on). Skips if she's mid-move. */
  /** Teleport (glitch out, reappear) to an exact spot: she follows what she's working on. Skips if busy. */
  async jumpTo(dest: Destination | (() => Destination), animation?: 'perch_glitch', cancelled?: () => boolean) {
    if (this.busy) return;
    this.busy = true;
    const id = ++this.seq, fx = this.d.settings().teleport.effects;
    try {
      const departure = this.waitAck(id, 'out', fx ? 1500 : 400);
      this.d.cue({ type: 'teleport', phase: 'out', id, effects: fx, animation });
      await departure;
      let target: Destination | undefined;
      if (!cancelled?.()) {
        target = typeof dest === 'function' ? dest() : dest;
        this.d.move(target, 'teleport');
        this.d.moved?.(target, 'teleport');
      }
      const arrival = this.waitAck(id, 'in', fx ? 1800 : 400);
      this.d.cue({ type: 'teleport', phase: 'in', id, effects: fx, animation });
      await arrival;
      if (target) this.d.arrived?.(target, 'direct');
    } finally { this.busy = false; }
  }

  async flyTo(dest: Destination, options: { gentle?: boolean; cancelled?: () => boolean; canOccupy?: (r: Rect) => boolean; silent?: boolean; curve?: number; pace?: number } = {}) {
    if (this.busy) return false;
    this.busy = true;
    try { const complete = await this.glide(dest, options); if (complete) { this.d.moved?.(dest, 'glide'); if (!options.silent) this.d.arrived?.(dest, 'direct'); } return complete; } finally { this.busy = false; }
  }

  /** Glide across the desktop (B 4:03 dash): the window slides, hair streams behind her. */
  private async glide(dest: Destination, options: { gentle?: boolean; cancelled?: () => boolean; canOccupy?: (r: Rect) => boolean; curve?: number; pace?: number } = {}): Promise<boolean> {
    const cur = this.d.bounds();
    if (!cur) return false;
    const dx = dest.x - cur.x, dy = dest.y - cur.y;
    const dur = (options.gentle ? Math.min(5500, Math.max(2800, Math.hypot(dx, dy) / 0.22)) : Math.min(2200, Math.max(850, Math.hypot(dx, dy) / 0.7))) * Math.max(.6, Math.min(1.6, options.pace ?? 1));
    this.d.cue({ type: 'dash', dir: dx < 0 ? -1 : 1 });
    const t0 = Date.now();
    const complete = await new Promise<boolean>((resolve) => {
      const step = () => {
        if (options.cancelled?.()) { clearInterval(timer); resolve(false); return; }
        const u = Math.min(1, (Date.now() - t0) / dur);
        const e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2; // ease in-out
        const bend = Math.sin(Math.PI * e) * (options.curve ?? 0), length = Math.max(1, Math.hypot(dx, dy));
        const step = { ...dest, x: Math.round(cur.x + dx * e - dy / length * bend), y: Math.round(cur.y + dy * e + dx / length * bend) };
        if (options.canOccupy && !options.canOccupy(step)) { clearInterval(timer); resolve(false); return; }
        this.d.move(step);
        if (u >= 1) { clearInterval(timer); resolve(true); }
      };
      const timer = setInterval(step, 16);
    });
    this.d.cue({ type: 'dash', dir: 0 });
    return complete;
  }

  async go(target: TeleportTarget, reason: 'manual' | 'auto' | 'ai', how: 'teleport' | 'glide' | 'either' = 'teleport'): Promise<{ ok: boolean; detail: string; to?: Rect }> {
    if (this.busy) return { ok: false, detail: 'Already teleporting' };
    const cur = this.d.bounds();
    if (!cur) return { ok: false, detail: 'Character is not on screen' };
    const s = this.d.settings();
    const dest = chooseDestination(target, {
      displays: this.d.displays(), current: cur, cursor: this.d.cursor(),
      avoid: target === 'perch' || s.teleport.avoidActiveWindow ? this.d.activeWindow() : null,
    });
    if (!dest) return { ok: false, detail: target === 'perch' ? 'No window to sit on (needs a non-maximised window with room above it)' : 'No free spot to teleport to' };
    this.busy = true;
    // short hops on the same screen are sometimes a glide instead of a teleport
    const near = Math.hypot(dest.x - cur.x, dest.y - cur.y) < 900 && this.d.displays().some((x) => x.workArea.x <= cur.x + cur.width / 2 && cur.x + cur.width / 2 < x.workArea.x + x.workArea.width && x.workArea.x <= dest.x + dest.width / 2 && dest.x + dest.width / 2 < x.workArea.x + x.workArea.width);
    if (how === 'glide' || (how === 'either' && near && Math.random() < 0.4)) {
      try {
        const completed = await this.glide(dest, { cancelled: () => reason === 'auto' && !!this.automaticBlock() });
        if (!completed) return { ok: false, detail: this.automaticBlock() ?? 'Automatic movement interrupted.' };
        this.count++;
        this.last = `${new Date().toLocaleTimeString()} (${reason}, glide ${target}) → ${dest.x},${dest.y}`;
        this.d.moved?.(dest, 'glide');
        this.d.arrived?.(dest, reason);
        this.d.log.info('glide', { reason, target, kind: dest.kind });
        return { ok: true, detail: `Glided (${target.replace('_', ' ')})`, to: dest };
      } finally { this.busy = false; }
    }
    const id = ++this.seq;
    const fx = s.teleport.effects;
    try {
      const departure = this.waitAck(id, 'out', fx ? 1500 : 400);
      this.d.cue({ type: 'teleport', phase: 'out', id, effects: fx });
      const outOk = await departure;
      const blocked = reason === 'auto' ? this.automaticBlock() : null;
      if (blocked) {
        // Restore her at the departure point when a new request interrupts automatic travel.
        const restored = this.waitAck(id, 'in', fx ? 1800 : 400);
        this.d.cue({ type: 'teleport', phase: 'in', id, effects: fx });
        await restored;
        return { ok: false, detail: blocked };
      }
      this.d.move(dest, 'teleport');
      this.d.moved?.(dest, 'teleport');
      const arrival = this.waitAck(id, 'in', fx ? 1800 : 400);
      this.d.cue({ type: 'teleport', phase: 'in', id, effects: fx });
      const inOk = await arrival;
      this.d.arrived?.(dest, reason);
      this.count++;
      this.last = `${new Date().toLocaleTimeString()} (${reason}, ${target}) → ${dest.x},${dest.y}`;
      this.d.log.info('teleport', { reason, target, x: dest.x, y: dest.y, outOk, inOk });
      return { ok: true, detail: `Teleported (${target.replace('_', ' ')})`, to: dest };
    } finally {
      this.busy = false;
    }
  }

  // ---------------------------------------------------------------- autonomous
  startAuto() { this.schedule(); }
  stopAuto() { if (this.autoTimer) clearTimeout(this.autoTimer); this.autoTimer = null; this.nextAt = null; }
  /** Settings or connection changed: re-arm. */
  rearm() { this.stopAuto(); this.schedule(); }

  private schedule() {
    const s = this.d.settings().teleport;
    if (!s.auto) { this.lastBlocked = 'automatic teleport is off'; return; }
    const delay = nextAutoDelay(s.minMinutes, s.maxMinutes);
    this.nextAt = Date.now() + delay;
    this.autoTimer = setTimeout(() => void this.autoTick(), delay);
    this.autoTimer.unref?.();
  }

  /** Exposed for tests. Returns the reason it didn't teleport, or null if it did. */
  async autoTick(): Promise<string | null> {
    this.autoTimer = null;
    const reason = !this.d.settings().teleport.auto ? 'automatic teleport is off'
      : !this.d.aiConnected() ? 'AI is not connected'
      : this.d.blocked() ?? (this.d.userIdleSec() > 300 ? 'user is away' : null);
    this.lastBlocked = reason;
    if (!reason) await this.go('auto', 'auto', 'either');
    else this.d.log.debug('auto teleport skipped', { reason });
    if (this.d.settings().teleport.auto) this.schedule();
    return reason;
  }

  status() {
    const s = this.d.settings().teleport;
    return {
      auto: s.auto,
      armed: !!this.autoTimer && this.d.aiConnected(),
      nextInSec: this.nextAt ? Math.max(0, Math.round((this.nextAt - Date.now()) / 1000)) : null,
      last: this.last,
      count: this.count,
      blockedReason: !this.d.aiConnected() ? 'AI is not connected' : this.lastBlocked,
    };
  }
}
