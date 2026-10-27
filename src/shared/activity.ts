import { companionDialogue } from './dialogue';
export type ActivityKind = 'notice' | 'lean' | 'stretch' | 'settle' | 'return' | 'pickup' | 'putdown';
export interface ActivityBeat { kind: ActivityKind; subject: string; returning: boolean; resumed: boolean }
/** Small local scenes have a subject, follow-through and a rest; interruptions retain session continuity. */
export class ActivityDirector {
  phase: 'rest' | 'notice' | 'engage' | 'settle' = 'rest';
  subject = '';
  private due = 0;
  private pending = '';
  private stableSince = 0;
  private suspended = false;
  private lastIdle = 0;
  private visits = new Map<string, number>();
  private turn = 0;
  tick(now: number, input: { blocked: boolean; subject: string; idleSec: number }): ActivityBeat | null {
    const cameBack = this.lastIdle >= 60 && input.idleSec < 3; this.lastIdle = input.idleSec;
    if (input.blocked) { if (this.phase !== 'rest') this.suspended = true; return null; }
    if (!input.subject && this.subject) { this.subject = ''; this.suspended = false; this.phase = 'rest'; this.due = now + 3000; }
    if (cameBack) { this.phase = 'notice'; this.due = now + 3500; return { kind: 'return', subject: this.subject, returning: true, resumed: false }; }
    if (input.subject !== this.pending) { this.pending = input.subject; this.stableSince = now; }
    if (input.subject && input.subject !== this.subject && now - this.stableSince >= 3500) {
      const returning = this.visits.has(input.subject); this.subject = input.subject;
      this.visits.delete(this.subject); this.visits.set(this.subject, now);
      if (this.visits.size > 32) this.visits.delete(this.visits.keys().next().value!);
      this.phase = 'notice'; this.due = now + 4000; this.suspended = false;
      return { kind: 'notice', subject: this.subject, returning, resumed: false };
    }
    if (this.suspended) { this.suspended = false; this.phase = 'engage'; this.due = now + 5500; return { kind: 'lean', subject: this.subject, returning: true, resumed: true }; }
    if (now < this.due) return null;
    if (this.phase === 'notice') { this.phase = 'engage'; this.due = now + 6000; return { kind: 'lean', subject: this.subject, returning: false, resumed: false }; }
    if (this.phase === 'engage') { this.phase = 'settle'; this.due = now + 4000; return { kind: 'settle', subject: this.subject, returning: false, resumed: false }; }
    if (this.phase === 'settle') { this.phase = 'rest'; this.due = now + 14000; return null; }
    this.phase = 'engage'; this.due = now + 6000;
    return { kind: this.turn++ % 2 ? 'lean' : 'stretch', subject: this.subject, returning: false, resumed: false };
  }
}
/** Bounded whole-body acting, applied through the same transform as the art and hit mask. */
export function activityMotion(kind: ActivityKind, age: number, side = 1) {
  const u = Math.max(0, Math.min(1, age / (kind === 'stretch' ? 3 : 2.5))), e = Math.sin(u * Math.PI) ** 2;
  return { x: kind === 'lean' || kind === 'notice' ? side * .025 * e : 0,
    y: kind === 'return' ? -.018 * e : kind === 'settle' || kind === 'putdown' ? .008 * e : 0,
    turn: kind === 'lean' ? side * .045 * e : kind === 'notice' ? side * .025 * e : 0,
    scaleX: kind === 'stretch' ? 1 - .025 * e : 1,
    scaleY: kind === 'stretch' ? 1 + .045 * e : 1 };
}
export function activityLine(beat: ActivityBeat) {
  const event = beat.kind === 'return' ? 'return' : beat.resumed ? 'resume' : beat.kind === 'notice' && beat.subject ? 'notice' : null;
  return event ? companionDialogue.choose({ event, returning: beat.returning }) : '';
}
