import { prng } from './geometry';
import { PALETTE as C } from './palette';

/**
 * Teleport effect, composited from the rendered character (offscreen canvas).
 * Departure ≈ chromatic split + scan-band tearing → vertical collapse to a scanline + shard burst.
 * Arrival ≈ shards converge → scanline expands → slight overshoot → clean.
 * Grounded in her observed glitch-shard visuals (N 2:54) and violet/green palette; the
 * dissolve itself is an inference (she enters by hard cuts in the show).
 */
export type FxPhase = 'out' | 'in';
interface Shard { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; color: string }

export const FX_DURATION: Record<FxPhase, number> = { out: 0.45, in: 0.55 };

const easeIn = (x: number) => x * x * x;
const easeOutBack = (x: number) => { const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

export class TeleportFx {
  phase: FxPhase | null = null;
  t = 0;
  id = 0;
  private shards: Shard[] = [];
  private tint: Record<string, HTMLCanvasElement> = {};
  /** Phases completed (for tests/diagnostics). */
  readonly log: string[] = [];
  onDone: ((id: number, phase: FxPhase) => void) | null = null;

  constructor(private makeCanvas: () => HTMLCanvasElement) {}

  get active() { return this.phase !== null; }
  /** 0..1 progress of the current phase. */
  get u() { return this.phase ? Math.min(1, this.t / FX_DURATION[this.phase]) : 0; }
  /** Whether the character should be considered invisible (between out and in). */
  hidden = false;

  start(phase: FxPhase, id: number, focus: { x: number; y: number; w: number; h: number }) {
    this.phase = phase;
    this.t = 0;
    this.id = id;
    this.hidden = false;
    const r = prng(id * 7919 + (phase === 'out' ? 1 : 2));
    const cols = [C.hair, C.hair, C.mask, C.violet, C.ink, C.white];
    this.shards = Array.from({ length: 46 }, () => {
      const x = focus.x + (r() - 0.5) * focus.w, y = focus.y + (r() - 0.5) * focus.h;
      const a = r() * Math.PI * 2, sp = 180 + r() * 520;
      return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, rot: r() * 6, vr: (r() - 0.5) * 18, size: 3 + r() * 11, color: cols[Math.floor(r() * cols.length)] };
    });
  }

  /** Called every frame with the freshly rendered character in `src`. Draws into `dst`. */
  render(dst: CanvasRenderingContext2D, src: HTMLCanvasElement, dt: number, dpr: number) {
    const W = src.width, H = src.height;
    dst.setTransform(1, 0, 0, 1, 0, 0);
    dst.clearRect(0, 0, W, H);
    if (!this.phase) {
      if (!this.hidden) dst.drawImage(src, 0, 0);
      return;
    }
    this.t += dt;
    const u = this.u;
    const out = this.phase === 'out';
    // "presence": 1 = fully formed, 0 = collapsed to a line
    const presence = out ? 1 - easeIn(Math.max(0, (u - 0.35) / 0.65)) : u < 0.35 ? 0 : easeOutBack(Math.min(1, (u - 0.35) / 0.65));
    const chroma = (out ? u : 1 - u) * 12 * dpr;
    const tear = out ? u : 1 - u;
    const cy = H * 0.42; // collapse toward chest/face line, keeps face readable until the last moment

    // chromatic separation copies (violet left, green right)
    if (chroma > 0.5 && presence > 0.02) {
      for (const [col, dx] of [[C.violet, -chroma], [C.mask, chroma]] as const) {
        const tc = this.tinted(src, col);
        dst.save();
        dst.globalAlpha = 0.55 * Math.min(1, presence * 1.5);
        dst.translate(0, cy); dst.scale(1, presence); dst.translate(0, -cy);
        dst.drawImage(tc, dx, 0);
        dst.restore();
      }
    }
    // main image with scan-band tearing
    if (presence > 0.02) {
      dst.save();
      dst.translate(0, cy); dst.scale(1, presence); dst.translate(0, -cy);
      const bands = 14;
      const bh = Math.ceil(H / bands);
      const r = prng(Math.floor(this.t * 30) + this.id);
      for (let i = 0; i < bands; i++) {
        const shift = r() < tear * 0.8 ? (r() - 0.5) * W * 0.12 * tear : 0;
        dst.drawImage(src, 0, i * bh, W, bh, shift, i * bh, W, bh);
      }
      dst.restore();
    }
    // the scanline: bright at the moment of collapse/expansion
    const lineK = out ? Math.max(0, (u - 0.6) / 0.4) : Math.max(0, 1 - u / 0.45);
    if (lineK > 0) {
      const lw = (W * 0.7) * (out ? 1 - lineK * 0.85 : 0.15 + (1 - lineK) * 0.85);
      dst.save();
      dst.globalAlpha = Math.sin(Math.min(1, lineK) * Math.PI) * 0.95;
      dst.fillStyle = C.mask;
      dst.fillRect(W / 2 - lw / 2, cy - 1.5 * dpr, lw, 3 * dpr);
      dst.fillStyle = C.white;
      dst.fillRect(W / 2 - lw / 4, cy - 0.5 * dpr, lw / 2, 1 * dpr);
      dst.restore();
    }
    // shards: burst outward on departure, converge on arrival
    const sk = out ? Math.max(0, (u - 0.3) / 0.7) : Math.max(0, 1 - u / 0.6);
    if (sk > 0) {
      dst.save();
      for (const s of this.shards) {
        const tt = out ? sk * 0.55 : sk * 0.55;
        const x = s.x * dpr + s.vx * tt * dpr * (out ? 1 : 1), y = s.y * dpr + s.vy * tt * dpr + 200 * tt * tt * dpr;
        dst.globalAlpha = Math.max(0, out ? 1 - sk : sk) * 0.9;
        dst.fillStyle = s.color;
        dst.translate(x, y); dst.rotate(s.rot + s.vr * tt);
        const z = s.size * dpr;
        dst.beginPath(); dst.moveTo(-z, -z * 0.4); dst.lineTo(z, 0); dst.lineTo(-z * 0.3, z * 0.6); dst.closePath(); dst.fill();
        dst.setTransform(1, 0, 0, 1, 0, 0);
      }
      dst.restore();
    }
    if (u >= 1) {
      const done = this.phase;
      this.phase = null;
      this.hidden = done === 'out';
      this.log.push(`${this.id}:${done}`);
      if (this.log.length > 40) this.log.shift();
      if (!this.hidden) dst.drawImage(src, 0, 0);
      else dst.clearRect(0, 0, W, H);
      this.onDone?.(this.id, done);
    }
  }

  /** Character silhouette filled with a flat colour (cached canvas per colour). */
  private tinted(src: HTMLCanvasElement, col: string) {
    let c = this.tint[col];
    if (!c) { c = this.makeCanvas(); this.tint[col] = c; }
    if (c.width !== src.width || c.height !== src.height) { c.width = src.width; c.height = src.height; }
    const g = c.getContext('2d')!;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = col;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    return c;
  }
}
