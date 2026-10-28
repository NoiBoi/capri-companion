/** Only lines promising a closer look invite a small cursor visit. */
export function invitesCloserLook(text: string) {
  const line = text.replace(/[’]/g, "'");
  if (/\b(?:don't|do not|not going to|wouldn't)\b/i.test(line)) return false;
  return /\b(?:i want to see|let me (?:look|get closer|see)|i(?:'m| am) coming over|i want (?:another look|to try over here)|i wasn't done looking|ooh,? hang on)\b/i.test(line);
}

export interface EnvironmentalReading {
  facts: string[];
  interpretation: string;
  curiosity: string;
}
interface EnvironmentalInterest extends EnvironmentalReading {
  key: string; firstSeen: number; lastSeen: number; visits: number;
  inspectedAt?: number; attemptedAt?: number; lookedAt?: number; returning: boolean;
}
export type CuriosityChoice = { action: 'quiet' | 'look' | 'inspect'; reason: string };
const RETENTION = 2 * 3600000, EVIDENCE_AGE = 15 * 60000;
/** Session-only attention, not personal memory. Keys are opaque; no screenshots or titles retained. */
export class EnvironmentalCuriosity {
  private interests = new Map<string, EnvironmentalInterest>();
  private current = ''; private since = 0; private lastSample = 0;
  private switches: number[] = []; private lastAttempt: number | undefined;
  clear() { this.interests.clear(); this.current = ''; this.since = this.lastSample = 0; this.switches = []; this.lastAttempt = undefined; }
  observe(key: string | null, now: number) {
    for (const [k, v] of this.interests) if (now - v.lastSeen > RETENTION) this.interests.delete(k);
    if (!key) { this.current = ''; this.since = this.lastSample = now; return; }
    if (key !== this.current || now - this.lastSample > 10000) {
      this.current = key; this.since = now;
      this.switches = [...this.switches.filter(t => now - t < 60000), now].slice(-12);
    }
    this.lastSample = now;
    // A fleeting switch does not establish familiarity or a new interest.
    if (now - this.since < 12000) return;
    let item = this.interests.get(key);
    if (!item) item = { key, firstSeen: now, lastSeen: now, visits: 1, returning: false, facts: [], interpretation: '', curiosity: '' };
    else if (now - item.lastSeen >= 60000) { item.visits++; item.returning = true; item.lookedAt = undefined; }
    item.lastSeen = now;
    this.interests.delete(key); this.interests.set(key, item);
    if (this.interests.size > 32) this.interests.delete(this.interests.keys().next().value!);
  }
  choose(now: number, input: { blocked: boolean; mayInspect: boolean }): CuriosityChoice {
    const item = this.interests.get(this.current);
    if (input.blocked || !item || now - this.lastSample > 10000 || now - this.since < 12000
      || this.switches.filter(t => now - t < 60000).length >= 4) return { action: 'quiet', reason: 'unsettled or interrupted' };
    if (item.lookedAt === undefined) {
      item.lookedAt = now;
      return { action: 'look', reason: item.returning ? 'a familiar subject returned' : 'a sustained unfamiliar view, content still unknown' };
    }
    const followup = item.returning && !!item.curiosity && now - (item.inspectedAt ?? 0) < EVIDENCE_AGE;
    if (!input.mayInspect || now - this.since < 30000 || this.lastAttempt !== undefined && now - this.lastAttempt < 300000
      || item.attemptedAt !== undefined && (!followup || now - item.attemptedAt < 600000)) return { action: 'quiet', reason: 'nothing new worth interrupting for' };
    item.attemptedAt = now; item.returning = false; this.lastAttempt = now;
    return { action: 'inspect', reason: followup ? 'revisit an unresolved visual curiosity; earlier evidence may have changed' : 'one selective look may establish whether this view has an interesting detail' };
  }
  record(key: string, reading: EnvironmentalReading, now: number) {
    // Only the caller can confirm a completed, still-valid visual observation.
    const item = this.interests.get(key) ?? { key, firstSeen: now, lastSeen: now, visits: 1, returning: false };
    this.interests.delete(key);
    this.interests.set(key, { ...item, ...reading, lastSeen: now, inspectedAt: now, attemptedAt: now });
    if (this.interests.size > 32) this.interests.delete(this.interests.keys().next().value!);
  }
  priority(key: string, now: number) {
    const item = this.interests.get(key);
    return item?.curiosity && item.inspectedAt !== undefined && now - item.inspectedAt < EVIDENCE_AGE ? 12 : 0;
  }
  stable(key: string, now: number) { return key === this.current && now - this.since >= 12000 && now - this.lastSample <= 10000; }
  snapshot(now: number) {
    return { stableSeconds: this.current && now - this.lastSample <= 10000 ? Math.floor((now - this.since) / 1000) : 0,
      switchesPerMinute: this.switches.filter(t => now - t < 60000).length,
      subjects: [...this.interests.values()].filter(i => now - i.lastSeen <= RETENTION).slice(-6).map(i => ({
        current: i.key === this.current, visits: i.visits, ageSeconds: Math.floor((now - i.lastSeen) / 1000),
        reading: this.context(i.key, now),
      })) };
  }
  context(key: string, now: number) {
    const item = this.interests.get(key);
    if (!item || now - item.lastSeen > RETENTION) return undefined;
    const fresh = item.inspectedAt !== undefined && now - item.inspectedAt < EVIDENCE_AGE;
    return { familiarity: item.visits > 1 ? 'returned to previously observed metadata' : 'seen this session',
      evidence: fresh ? { source: 'earlier exposed crop, model-described, not independently verified', ageSeconds: Math.floor((now - item.inspectedAt!) / 1000), facts: item.facts } : undefined,
      hypothesis: fresh ? item.interpretation : undefined, openCuriosity: fresh ? item.curiosity : undefined };
  }
}
