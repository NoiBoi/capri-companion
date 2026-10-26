import { CapriModel as VectorModel, type ModelInputs, type PoseName } from './model';
import { SEAT_RATIO } from '../../shared/framing';
import type { Params } from './params';
import { SPRITE_CLIPS, spriteBase, spriteFrame, spriteFacing, type SpriteClip } from './spriteClips';

/** Draw the original PNG cells without tracing, recoloring, or replacing their linework. */
export class CapriSpriteModel extends VectorModel {
  readonly artwork = 'lachydotmcg';
  readonly images = new Map<SpriteClip, HTMLImageElement>();
  readonly ready: Promise<void>;
  activeClip: SpriteClip = 'idle';
  activeFrame = 0;
  private spritePose: PoseName = 'sit';
  private direction = 1;
  private lookDirection = 0;
  private clipTime = 0;
  private reactionUntil = 0;
  private awakeUntil = 0;
  private wasSleeping = false;
  private burstUntil = 0;
  private patUntil = 0;
  private nextBurst = 9;
  private nextFidget = 5;
  private blinkUntil = 0;
  private wasBlinking = false;
  private squish = 0;
  private motionTime = 0;
  private hitCanvas = document.createElement('canvas');
  private hitCtx = this.hitCanvas.getContext('2d', { willReadFrequently: true })!;
  private teleportUntil = 0;
  teleportAnimation(_clip: 'perch_glitch') { this.teleportUntil = this.t + 0.7; this.clipTime = 0; }
  private request: { clip: SpriteClip; until: number } | null = null;
  requestAnimation(clip: SpriteClip, seconds = 20) { this.request = { clip, until: this.t + seconds }; }

  constructor() {
    super();
    this.ready = Promise.all((Object.keys(SPRITE_CLIPS) as SpriteClip[]).map((name) => new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => { this.images.set(name, img); resolve(); };
      img.onerror = () => reject(new Error(`Missing Capri artwork: ${name}.png`));
      img.src = `capri/lachy/${name}.png`;
    }))).then(() => undefined);
  }

  override get currentPose() { return this.spritePose; }
  override get facing() { return this.direction; }
  override faceToward(dir: number) { if (Math.abs(dir) > 0.18) this.lookDirection = dir < 0 ? -1 : 1; }
  override poke() { this.reactionUntil = this.t + 2; this.squish = 0.1; }
  override pat() { this.reactionUntil = this.t + 3; this.patUntil = this.t + 1.2; }
  override glitchNow(_kind: 'slice' | 'shatter' | 'ghost' | 'tear' = 'slice', len = 0.3) { this.burstUntil = this.t + len; }

  override draw(ctx: CanvasRenderingContext2D, p: Params, dt: number, inp: ModelInputs & { attachment?: 'perch' | 'hang' | 'moving' | null; taskbar?: boolean; intensity?: number; animation?: 'auto' | SpriteClip; sleeping?: boolean; facing?: 'cursor' | 'original' | 'left' | 'right' }, W: number, H: number) {
    this.t += dt;
    const intensity = Math.max(0, inp.intensity ?? 1);
    const motionDt = dt * intensity;
    this.motionTime += motionDt;
    this.spritePose = inp.pose;
    this.squish = Math.max(0, this.squish - dt * 0.4);
    const sleeping = inp.sleeping ?? p.sleep > 0.7;
    if (this.wasSleeping && !sleeping) this.awakeUntil = this.t + 13 / 15;
    this.wasSleeping = sleeping;
    if (intensity > 0 && inp.glitchEnabled && this.t > this.nextBurst && !sleeping && p.mouthOpen < 0.08) {
      this.burstUntil = this.t + 10 / 15;
      this.nextBurst = this.t + 15 + Math.random() * 20;
    }
    const bursting = inp.glitchEnabled && this.t < this.burstUntil;
    this.burst = bursting ? 0.5 : 0;
    this.ghost = false;
    const selected = inp.animation && inp.animation !== 'auto' ? inp.animation : this.request && this.request.until > this.t ? this.request.clip : null;
    let clip = selected === 'idle' || selected === 'perch' ? selected : spriteBase({ sleeping, dragging: inp.dragging, ledge: inp.ledge && !inp.taskbar, speaking: p.mouthOpen > 0.04 });
    if (inp.dragging) clip = 'dangle';
    const perched = clip === 'perch';
    const blinkRequested = p.blinkL > 0.2 || p.blinkR > 0.2;
    if (blinkRequested && !this.wasBlinking && !sleeping && intensity > 0) this.blinkUntil = this.motionTime + 4 / 8;
    this.wasBlinking = blinkRequested;
    if (intensity > 0 && !sleeping && !inp.dragging && this.t > this.nextFidget) {
      this.reactionUntil = this.t + 1.6;
      this.nextFidget = this.t + 9 + Math.random() * 12;
    }
    if (!sleeping && !inp.dragging && intensity > 0) {
      if (this.t < this.awakeUntil) clip = 'wake';
      else if (this.motionTime < this.blinkUntil) clip = perched ? (bursting ? 'perch_blink_glitch' : 'perch_blink') : (bursting ? 'blink_glitch' : 'blink');
      else if (bursting) clip = perched ? 'perch_glitch' : 'glitch';
      else if (!perched && (this.t < this.reactionUntil || p.happyEyes > 0.3 || p.mouthSmile > 0.75)) clip = 'grin';
    }
    if (selected && selected !== 'idle' && selected !== 'perch' && !inp.dragging) clip = selected;
    if (inp.attachment === 'moving' && !inp.dragging) clip = this.motionTime < this.blinkUntil ? 'blink' : 'idle';
    if (inp.attachment === 'hang' && !inp.dragging) clip = 'dangle';
    if (this.t < this.teleportUntil && !inp.dragging) clip = 'perch_glitch';
    const facing = inp.facing ?? 'cursor';
    const target = facing === 'left' ? -1 : facing === 'right' ? 1 : this.lookDirection;
    const direction = facing === 'original' || !target || clip === 'sleep' ? 1 : spriteFacing(target, this.direction, clip);
    if (!inp.dragging) this.direction = direction;
    if (clip !== this.activeClip) { this.activeClip = clip; this.clipTime = 0; }
    else this.clipTime += this.t < this.teleportUntil ? dt : motionDt;
    this.activeFrame = spriteFrame(clip, this.clipTime, clip !== 'wake');
    const img = this.images.get(clip);
    if (!img) return;
    const def = SPRITE_CLIPS[clip];
    const isPerch = clip.startsWith('perch');
    // Equal head size across standing and sitting art; fit all original pixels inside the window.
    const scale = Math.min(W * 0.88 / 384, H * 0.90 / 384);
    const dw = def.width * scale, dh = 384 * scale;
    // The visible contact point must match the main process's snap line in air too.
    const hanging = inp.attachment === 'hang';
    const anchor = H * (hanging ? 0.08 : SEAT_RATIO);
    // Perch seat is 79% down the source cell, as in lachydotmcg's original renderer.
    const sourceAnchor = hanging ? 0 : isPerch ? 384 * 0.79 : 367;
    const bob = inp.ledge || sleeping || inp.dragging ? 0 : Math.sin(this.motionTime * 1.75) * 2 * intensity;
    const x = (W - dw) / 2;
    const y = anchor - sourceAnchor * scale + bob;
    ctx.save();
    ctx.translate(W / 2, anchor);
    ctx.rotate(intensity * Math.max(-0.035, Math.min(0.035, p.headRoll * 0.20 + p.bodyRot * 0.15 + (isPerch ? Math.sin(this.motionTime * 0.9) * 0.008 : 0))));
    ctx.scale(this.direction * (1 + this.squish), 1 - this.squish);
    ctx.translate(-W / 2, -anchor);
    const draw = (image: HTMLImageElement, frame: number, width: number) => ctx.drawImage(image, frame * width, 0, width, 384, x, y, dw, dh);
    draw(img, this.activeFrame, def.width);
    if ((clip === 'idle' || clip === 'blink' || clip === 'grin') && p.mouthOpen > 0.04) {
      const mouth = this.images.get('mouth');
      if (mouth) draw(mouth, Math.min(4, Math.floor(p.mouthOpen * 5)), 240);
    }
    ctx.restore();
    // Hit-test the base art before particles or teleport effects add extra opaque pixels.
    if (this.hitCanvas.width !== ctx.canvas.width || this.hitCanvas.height !== ctx.canvas.height) { this.hitCanvas.width = ctx.canvas.width; this.hitCanvas.height = ctx.canvas.height; }
    this.hitCtx.clearRect(0, 0, this.hitCanvas.width, this.hitCanvas.height);
    this.hitCtx.drawImage(ctx.canvas, 0, 0);
    if (this.t < this.patUntil) {
      ctx.save();
      ctx.fillStyle = '#6dffb0'; ctx.globalAlpha = Math.min(1, this.patUntil - this.t);
      for (let i = 0; i < 4; i++) { const sx = W * (0.35 + i * 0.1), sy = y + 16 - (this.t % 1) * 18; ctx.fillRect(sx - 3, sy, 6, 2); ctx.fillRect(sx - 1, sy - 2, 2, 6); }
      ctx.restore();
    }
  }
  override hitTest(_ctx: CanvasRenderingContext2D, x: number, y: number, dpr: number) {
    const px = Math.floor(x * dpr), py = Math.floor(y * dpr);
    if (px < 0 || py < 0 || px >= this.hitCanvas.width || py >= this.hitCanvas.height) return false;
    return this.hitCtx.getImageData(px, py, 1, 1).data[3] >= 128;
  }
}
