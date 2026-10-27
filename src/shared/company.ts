export type CompanyControl = { kind: 'focus'; minutes: number } | { kind: 'focus_end' | 'stay' | 'release' | 'resume' | 'look' | 'explore' | 'sleep' };

/** Only complete, direct utterances qualify. Quoted text and mixed requests stay in conversation. */
export function companyControl(text: string): CompanyControl | null {
  const s = text.toLowerCase().replace(/[’]/g, "'").trim().replace(/^(?:hey\s+)?capri[,!]?\s+/, '').replace(/^(?:can|could|would) you\s+/, '').replace(/^please,?\s+/, '').replace(/[.!?]+$/, '').replace(/,?\s+please$/, '').trim();
  if (/^(?:go to sleep|sleep mode|take a nap|go to bed|sleep)$/.test(s)) return { kind: 'sleep' };
  if (/^(?:explore mode|start exploring|go explor(?:e|ing)|explore)$/.test(s)) return { kind: 'explore' };
  if (/^(?:wake up|wake|normal mode|stop exploring)$/.test(s)) return { kind: 'resume' };
  if (/^(?:stay (?:right )?here|stay put|hold (?:this|your) spot|don't (?:move|wander)|do not (?:move|wander))(?: for (?:a bit|now))?$/.test(s)) return { kind: 'stay' };
  if (/^(?:look at (?:this|that|this window)|watch this|take a look at this)$/.test(s)) return { kind: 'look' };
  if (/^(?:back to normal|resume (?:exploring|wandering)|you can (?:wander|explore) again)$/.test(s)) return { kind: 'resume' };
  if (/^(?:you can move again|you don't have to stay here|stop staying here)$/.test(s)) return { kind: 'release' };
  if (/^(?:i'm done focusing|i am done focusing|focus time is over|stop focus mode|end focus mode)$/.test(s)) return { kind: 'focus_end' };
  const focus = /^(?:i need to (?:focus|concentrate)|i'm trying to focus|i am trying to focus|let me focus|quiet company|keep me company quietly|be quiet)(?: for (a bit|now|\d{1,3} (?:minutes?|mins?)))?$/.exec(s);
  if (focus) return { kind: 'focus', minutes: Math.min(180, Math.max(1, Number.parseInt(focus[1] ?? '', 10) || 25)) };
  return null;
}

/** Temporary requests never mutate the user's persistent settings or approved memories. */
export class Company {
  focusUntil = 0;
  staying = false;
  focused(now = Date.now()) { return this.focusUntil > now; }
  apply(control: CompanyControl, now = Date.now()) {
    if (control.kind === 'focus') this.focusUntil = now + control.minutes * 60000;
    if (control.kind === 'focus_end' || control.kind === 'resume') this.focusUntil = 0;
    if (control.kind === 'stay') this.staying = true;
    if (control.kind === 'release' || control.kind === 'resume') this.staying = false;
  }
  blocked(now = Date.now()) { return this.focused(now) || this.staying; }
  label(now = Date.now()) { return [this.focused(now) ? 'Quiet company' : '', this.staying ? 'Staying here' : ''].filter(Boolean).join(' · '); }
}

export type VisitPhase = 'idle' | 'approach' | 'study' | 'settle' | 'rest';
/** One cancellable intention, advanced by the existing presence clock. No extra timers or model calls. */
export class VisitSequence {
  phase: VisitPhase = 'idle';
  target: bigint | null = null;
  revision = 0;
  private due = 0;
  private restMs = 30000;
  get approaching() { return this.phase === 'approach'; }
  begin(target: bigint) { this.cancel(); this.target = target; this.phase = 'approach'; return this.revision; }
  arrive(revision: number, now: number, random = Math.random, restMs = 30000) {
    if (revision !== this.revision || this.phase !== 'approach') return false;
    this.restMs = restMs; this.phase = 'study'; this.due = now + 4500 + random() * 3500; return true;
  }
  cancel() { this.revision++; this.target = null; this.phase = 'idle'; }
  step(now: number, valid: boolean, interrupted: boolean): 'settle' | 'consider_comment' | null {
    if (!valid || interrupted) { this.cancel(); return null; }
    if (this.phase === 'idle' || this.phase === 'approach' || now < this.due) return null;
    if (this.phase === 'study') { this.phase = 'settle'; this.due = now + 1800; return 'settle'; }
    if (this.phase === 'settle') { this.phase = 'rest'; this.due = now + this.restMs; return 'consider_comment'; }
    this.cancel(); return null;
  }
}
