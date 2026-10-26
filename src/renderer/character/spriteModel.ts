import { CapriModel as VectorModel, type ModelInputs, type PoseName } from './model';
import { SEAT_RATIO } from '../../shared/framing';
import type { Params } from './params';
import { SPRITE_CLIPS, spriteBase, spriteFrame, type SpriteClip } from './spriteClips';

/** Draw the original PNG cells without tracing, recoloring, or replacing their linework. */
export class CapriSpriteModel extends VectorModel {
  readonly artwork = 'lachydotmcg';
  readonly images = new Map<SpriteClip, HTMLImageElement>();
  readonly ready: Promise<void>;
  activeClip: SpriteClip = 'idle';
  activeFrame = 0;
  private spritePose: PoseName = 'sit';
  private direction = 1;
  private nextDirection = 1;
  private clipTime = 0;
  private reactionUntil = 0;
  private awakeUntil = 0;
  private wasSleeping = false;
  private burstUntil = 0;
  private patUntil = 0;
  private nextBurst = 9;
  private squish = 0;

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
  override faceToward(dir: number) { if (Math.abs(dir) > 0.38) this.nextDirection = dir < 0 ? -1 : 1; }
  override poke() { this.reactionUntil = this.t + 2; this.squish = 0.1; }
  override pat() { this.reactionUntil = this.t + 3; this.patUntil = this.t + 1.2; }
  override glitchNow(_kind: 'slice' | 'shatter' | 'ghost' | 'tear' = 'slice', len = 0.3) { this.burstUntil = this.t + len; }

  override draw(ctx: CanvasRenderingContext2D, p: Params, dt: number, inp: ModelInputs & { taskbar?: boolean }, W: number, H: number) {
    this.t += dt;
    this.spritePose = inp.pose;
    this.squish = Math.max(0, this.squish - dt * 0.4);
    if (this.direction !== this.nextDirection && !inp.dragging) { this.direction = this.nextDirection; if (inp.glitchEnabled) this.glitchNow('slice', 0.12); }
    const sleeping = p.sleep > 0.7;
    if (this.wasSleeping && !sleeping) this.awakeUntil = this.t + 13 / 15;
    this.wasSleeping = sleeping;
    if (inp.glitchEnabled && this.t > this.nextBurst && !sleeping && p.mouthOpen < 0.08) {
      this.burstUntil = this.t + 10 / 15;
      this.nextBurst = this.t + 15 + Math.random() * 20;
    }
    const bursting = inp.glitchEnabled && this.t < this.burstUntil;
    this.burst = bursting ? 0.5 : 0;
    this.ghost = false;
    let clip = spriteBase({ sleeping, dragging: inp.dragging, ledge: inp.ledge && !inp.taskbar, speaking: p.mouthOpen > 0.04 });
    const perched = clip === 'perch';
    if (!sleeping && !inp.dragging) {
      if (this.t < this.awakeUntil) clip = 'wake';
      else if (p.blinkL > 0.2 || p.blinkR > 0.2) clip = perched ? (bursting ? 'perch_blink_glitch' : 'perch_blink') : (bursting ? 'blink_glitch' : 'blink');
      else if (bursting) clip = perched ? 'perch_glitch' : 'glitch';
      else if (!perched && (this.t < this.reactionUntil || p.happyEyes > 0.3 || p.mouthSmile > 0.75)) clip = 'grin';
    }
    if (clip !== this.activeClip) { this.activeClip = clip; this.clipTime = 0; }
    else this.clipTime += dt;
    this.activeFrame = spriteFrame(clip, this.clipTime, clip !== 'wake');
    const img = this.images.get(clip);
    if (!img) return;
    const def = SPRITE_CLIPS[clip];
    const isPerch = clip.startsWith('perch');
    // Equal head size across standing and sitting art; fit all original pixels inside the window.
    const scale = Math.min(W * 0.88 / 384, H * 0.90 / 384);
    const dw = def.width * scale, dh = 384 * scale;
    const anchor = inp.ledge ? H * SEAT_RATIO : H * 0.90;
    // Perch seat is 79% down the source cell, as in lachydotmcg's original renderer.
    const sourceAnchor = isPerch ? 384 * 0.79 : 367;
    const bob = inp.ledge || sleeping || inp.dragging ? 0 : Math.sin(this.t * 1.75) * 2;
    const x = (W - dw) / 2 + Math.max(-3, Math.min(3, p.gazeX * 2));
    const y = anchor - sourceAnchor * scale + bob;
    ctx.save();
    ctx.translate(W / 2, y + dh / 2);
    ctx.rotate(Math.max(-0.055, Math.min(0.055, p.headRoll * 0.16 + p.bodyRot * 0.1)));
    ctx.scale(this.direction * (1 + this.squish), 1 - this.squish);
    ctx.translate(-W / 2, -y - dh / 2);
    const draw = (image: HTMLImageElement, frame: number, width: number) => ctx.drawImage(image, frame * width, 0, width, 384, x, y, dw, dh);
    draw(img, this.activeFrame, def.width);
    if ((clip === 'idle' || clip === 'blink' || clip === 'grin') && p.mouthOpen > 0.04) {
      const mouth = this.images.get('mouth');
      if (mouth) draw(mouth, Math.min(4, Math.floor(p.mouthOpen * 5)), 240);
    }
    ctx.restore();
    if (this.t < this.patUntil) {
      ctx.save();
      ctx.fillStyle = '#6dffb0'; ctx.globalAlpha = Math.min(1, this.patUntil - this.t);
      for (let i = 0; i < 4; i++) { const sx = W * (0.35 + i * 0.1), sy = y + 16 - (this.t % 1) * 18; ctx.fillRect(sx - 3, sy, 6, 2); ctx.fillRect(sx - 1, sy - 2, 2, 6); }
      ctx.restore();
    }
  }
}
