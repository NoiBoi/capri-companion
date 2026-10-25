import { clamp, prng } from './geometry';
import { PALETTE as C } from './palette';
import type { Params } from './params';

/**
 * Capri drawn from real cut-outs of the show (assets/capri, see docs/ANIMATION_CATALOG.md), the way
 * desktop-pet projects work: a set of poses, each a short run of the original drawings with their
 * original holds, plus procedural life on top (bob, breath, facing, dangling, glitch bursts).
 */
export interface PoseFrame { file: string; hold: number } // hold: frames at 24 fps
export interface PoseDef {
  frames: PoseFrame[];
  /** Point (fractions of the image) that rests on a ledge / is the centre of mass when floating. */
  anchor: [number, number];
  /** Which way she faces in the original drawing (1 = toward viewer-right, -1 = viewer-left). */
  facing: 1 | -1;
  kind: 'stand' | 'sit' | 'lie' | 'float' | 'crouch';
  /** Fraction of the window height the figure should fill. */
  size: number;
  source: string;
}
export type PosePack = Record<string, PoseDef>;

type GlitchKind = 'slice' | 'shatter' | 'ghost' | 'tear';
interface Shard { x: number; y: number; vx: number; vy: number; r: number; vr: number; s: number; life: number; ink: boolean }

export interface SpriteInputs {
  pose: string;
  surface: 'taskbar' | 'window' | 'air' | 'edge_left' | 'edge_right';
  dragging: boolean;
  speaking: number; // 0..1 speech level
  glitchEnabled: boolean;
  scale: number; // css px per rig unit (window width / 340)
}

export class SpriteCapri {
  private imgs = new Map<string, HTMLImageElement>();
  private pose = '';
  private fi = 0;
  private ft = 0;
  private face = 1; // current facing (after mirroring)
  private faceTarget = 1;
  private swing = 0; private swingV = 0; // dangle while dragged
  private lastScreen: [number, number] | null = null;
  private squash = 0; // poke squash
  private rand = prng(0xca9e1);
  t = 0;
  ready = false;
  burst = 0;
  stutter = 0;
  ghost = false;
  private kind: GlitchKind = 'tear';
  private burstLeft = 0;
  private burstNext = 1.5;
  private sliceSeed = 0;
  private shards: Shard[] = [];
  private sparkles: { x: number; y: number; vy: number; life: number }[] = [];

  constructor(readonly pack: PosePack, base: string) {
    let pending = 0;
    for (const def of Object.values(pack)) for (const f of def.frames) {
      if (this.imgs.has(f.file)) continue;
      const im = new Image();
      pending++;
      im.onload = im.onerror = () => { if (--pending === 0) this.ready = true; };
      im.src = `${base}/${f.file}`;
      this.imgs.set(f.file, im);
    }
  }

  has(pose: string) { return pose in this.pack; }
  get current() { return this.pose; }

  /** Face toward viewer-left (-1) or viewer-right (1); she snaps round with a glitch frame, like a cut. */
  faceToward(dir: number) {
    if (Math.abs(dir) < 0.15) return;
    const want = dir > 0 ? 1 : -1;
    if (want !== this.faceTarget) { this.faceTarget = want; this.stutter = Math.max(this.stutter, 1); }
  }
  poke() { this.squash = 1; this.startBurst('slice', 0.12); }
  pat() { for (let i = 0; i < 6; i++) this.sparkles.push({ x: (this.rand() * 2 - 1) * 0.25, y: -0.35 - this.rand() * 0.1, vy: -0.15 - this.rand() * 0.2, life: 0.8 + this.rand() * 0.5 }); }
  glitchNow(kind: GlitchKind = 'shatter') { this.startBurst(kind, 0.3); }

  private startBurst(kind: GlitchKind, len: number) {
    this.kind = kind;
    this.burstLeft = len;
    this.burst = 1;
    if (kind === 'shatter') this.shards.push(...Array.from({ length: 12 }, () => this.newShard()));
  }
  private newShard(): Shard {
    const r = this.rand, a = -Math.PI * (0.05 + r() * 0.9) + (r() < 0.25 ? Math.PI : 0), sp = 0.5 + r() * 1.2;
    return { x: (r() * 2 - 1) * 0.25, y: -0.3 - r() * 0.2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: r() * 6, vr: (r() * 2 - 1) * 9, s: 0.02 + r() * 0.05, life: 0.35 + r() * 0.4, ink: r() < 0.3 };
  }
  private updateBurst(dt: number, enabled: boolean, level: number) {
    if (this.burstLeft > 0) {
      this.burstLeft -= dt;
      this.burst = this.burstLeft > 0 ? 0.55 + 0.45 * this.rand() : 0;
      this.ghost = this.burst > 0 && this.kind === 'ghost';
      if (this.burstLeft <= 0) this.burstNext = 0.8 + this.rand() * 3;
      return;
    }
    this.burst = 0;
    this.ghost = false;
    if (!enabled) return;
    this.burstNext -= dt * (1 + level * 5);
    if (this.burstNext > 0) return;
    const kinds: GlitchKind[] = ['slice', 'shatter', 'ghost', 'tear', 'slice'];
    this.startBurst(kinds[Math.floor(this.rand() * kinds.length)], 0.08 + this.rand() * 0.3);
    if (this.rand() < 0.45) this.stutter = 2 + Math.floor(this.rand() * 3);
  }

  draw(ctx: CanvasRenderingContext2D, p: Params, dt: number, inp: SpriteInputs, W: number, H: number) {
    this.t += dt;
    const def = this.pack[inp.pose] ?? this.pack[Object.keys(this.pack)[0]];
    if (inp.pose !== this.pose) { this.pose = inp.pose; this.fi = 0; this.ft = 0; this.stutter = Math.max(this.stutter, 1); }
    // the original drawings with their original holds (the show runs on twos and threes)
    this.ft += dt * 24;
    const fr = def.frames[this.fi % def.frames.length];
    if (this.ft >= fr.hold) { this.ft = 0; this.fi = (this.fi + 1) % def.frames.length; }
    this.updateBurst(dt, inp.glitchEnabled, p.glitch);
    let img = this.imgs.get(def.frames[this.fi % def.frames.length].file);
    // tearing / ghosting bursts flash the show's own glitch-out drawings in her place
    const gl = this.pack.glitch;
    if (gl && this.burst > 0 && (this.kind === 'tear' || this.kind === 'ghost') && this.rand() < 0.7) img = this.imgs.get(gl.frames[Math.floor(this.rand() * gl.frames.length)].file) ?? img;
    if (this.face !== this.faceTarget) this.face = this.faceTarget;

    // dangle: the window moves under her while held, she swings from the grab point
    const sx = window.screenX, sy = window.screenY;
    const vx = this.lastScreen ? (sx - this.lastScreen[0]) / Math.max(dt, 1e-3) : 0;
    this.lastScreen = [sx, sy];
    const target = inp.dragging ? clamp(-vx * 0.0011, -0.7, 0.7) + 0.05 * Math.sin(this.t * 3) : 0;
    this.swingV += ((target - this.swing) * 60 - this.swingV * 7) * dt;
    this.swing += this.swingV * dt;
    this.squash = Math.max(0, this.squash - dt * 4);
    if (!img || !img.complete || !img.naturalWidth) return;

    const iw = img.naturalWidth, ih = img.naturalHeight;
    const k = Math.min((W * 0.98) / iw, (H * def.size) / ih);
    const dw = iw * k, dh = ih * k;
    const ledge = inp.surface === 'taskbar' || inp.surface === 'window';
    const floaty = !ledge || def.kind === 'float' || def.kind === 'stand';
    const bob = floaty && !inp.dragging ? Math.sin(this.t * 1.1) * 4 * (inp.scale) + Math.sin(this.t * 0.37) * 2 : 0;
    // where her anchor sits: on the seat line of a ledge, else centred
    const ax = W / 2, ay = ledge && (def.kind === 'sit' || def.kind === 'lie' || def.kind === 'crouch') ? H * (500 / 520) : H * 0.5 + dh * (def.anchor[1] - 0.5);
    const breath = 1 + 0.008 * Math.sin(this.t * 1.6) + inp.speaking * 0.02;
    const sq = this.squash;
    const flip = this.face * def.facing;

    ctx.save();
    if (inp.dragging) {
      // pinched at the top like a picked-up desktop pet, swinging
      ctx.translate(W / 2, H * 0.06);
      ctx.rotate(this.swing);
      ctx.translate(-W / 2, -H * 0.06);
    }
    ctx.translate(ax, ay + bob);
    ctx.rotate(Math.sin(this.t * 0.29) * 0.012 + p.bodyRot * 0.5);
    ctx.scale(flip * (1 + sq * 0.12), breath * (1 - sq * 0.14));
    const x0 = -dw * def.anchor[0], y0 = -dh * def.anchor[1];
    ctx.shadowColor = 'rgba(138,61,255,0.35)'; ctx.shadowBlur = 10;
    if (this.burst > 0 && this.kind === 'slice') {
      // dislocation: the drawing tears into horizontal bands that jump sideways
      const bands = 7, r = prng(this.sliceSeed = (this.sliceSeed + (this.rand() < 0.5 ? 1 : 0)) | 0);
      for (let i = 0; i < bands; i++) {
        const a = i / bands, b = (i + 1) / bands;
        const off = (r() < 0.55 ? (r() * 2 - 1) * dw * 0.12 : 0) * this.burst;
        ctx.drawImage(img, 0, ih * a, iw, ih * (b - a) + 1, x0 + off, y0 + dh * a, dw, dh * (b - a) + 1);
      }
    } else ctx.drawImage(img, x0, y0, dw, dh);
    ctx.restore();

    // shards thrown off while she shatters, sparkles when patted
    const unit = Math.min(W, H);
    for (const s of this.shards) {
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt;
      ctx.save();
      ctx.globalAlpha = clamp(s.life * 3, 0, 1);
      ctx.translate(W / 2 + s.x * unit, ay - dh * 0.55 + s.y * unit); ctx.rotate(s.r);
      const z = s.s * unit;
      ctx.beginPath(); ctx.moveTo(-0.3 * z, -0.14 * z); ctx.lineTo(0.3 * z, -0.11 * z); ctx.lineTo(0.06 * z, 0.9 * z); ctx.closePath();
      ctx.fillStyle = C.violet; ctx.save(); ctx.translate(-2, 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = s.ink ? C.ink : C.hair; ctx.fill();
      ctx.restore();
    }
    this.shards = this.shards.filter((s) => s.life > 0);
    for (const s of this.sparkles) {
      s.life -= dt; s.y += s.vy * dt;
      ctx.save(); ctx.globalAlpha = clamp(s.life, 0, 1); ctx.fillStyle = s.life > 0.5 ? C.white : C.sparkle;
      const x = W / 2 + s.x * unit, y = ay - dh * 0.6 + s.y * unit, z = 5 * inp.scale;
      ctx.beginPath(); ctx.moveTo(x - z, y); ctx.lineTo(x, y - z * 0.35); ctx.lineTo(x + z, y); ctx.lineTo(x, y + z * 0.35); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y - z); ctx.lineTo(x + z * 0.35, y); ctx.lineTo(x, y + z); ctx.lineTo(x - z * 0.35, y); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    this.sparkles = this.sparkles.filter((s) => s.life > 0);
  }

  /** Per-pixel hit test against what was actually drawn. */
  hitTest(ctx: CanvasRenderingContext2D, x: number, y: number, dpr: number) {
    try { return ctx.getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data[3] > 40; } catch { return false; }
  }

  /** Post-process on the composed frame: ghost double, datamosh smear, band tearing. */
  post(dst: CanvasRenderingContext2D, src: CanvasImageSource & { width: number; height: number }, amount: number) {
    const r = this.rand, H = src.height, W = src.width;
    if (this.ghost) {
      dst.save();
      dst.globalCompositeOperation = 'destination-over';
      dst.globalAlpha = 0.55;
      dst.filter = r() < 0.5 ? 'hue-rotate(110deg) saturate(1.6)' : 'hue-rotate(-60deg) saturate(1.4)';
      dst.drawImage(src, Math.round((r() * 2 - 1) * W * 0.07), Math.round((r() * 2 - 1) * H * 0.015));
      dst.restore();
    }
    if (amount > 0.6 && r() < 0.35) {
      const y = Math.floor(H * (0.15 + r() * 0.6)), hh = Math.floor(H * (0.04 + r() * 0.12)), x = Math.floor(r() * W * 0.6), w = Math.floor(W * (0.15 + r() * 0.3));
      dst.drawImage(src, x, y, w, 1, x + (r() * 2 - 1) * W * 0.05, y, w, hh);
    }
    const bands = Math.ceil(amount * 6);
    for (let i = 0; i < bands; i++) {
      const h = Math.max(2, Math.floor(r() * H * 0.05)), y = Math.floor(r() * (H - h)), dx = Math.round((r() * 2 - 1) * W * 0.08 * amount);
      dst.clearRect(0, y, W, h);
      dst.drawImage(src, 0, y, W, h, dx, y, W, h);
      if (r() < 0.35) { dst.save(); dst.globalCompositeOperation = 'source-atop'; dst.fillStyle = r() < 0.6 ? C.mask : C.hair; const bw = W * (0.2 + r() * 0.6); dst.fillRect(r() * (W - bw), y + h * 0.3, bw, Math.max(2, h * 0.35)); dst.restore(); }
    }
  }
}
