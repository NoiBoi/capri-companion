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
  fingerprint?: string; failures?: number; retryAt?: number; checkedAt?: number;
}
export type CuriosityChoice = { action: 'quiet' | 'look' | 'inspect'; reason: string };
const RETENTION = 2 * 3600000, EVIDENCE_AGE = 15 * 60000;
/** Session-only attention, not personal memory. Keys are opaque; no screenshots or titles retained. */
export class EnvironmentalCuriosity {
  private interests = new Map<string, EnvironmentalInterest>();
  private current = ''; private since = 0; private lastSample = 0;
  private switches: number[] = []; private lastAttempt: number | undefined;
  private windows: Map<string, string> | null = null;
  private changes = new Map<string, { kind: 'opened' | 'changed'; at: number }>();
  clear() { this.interests.clear(); this.current = ''; this.since = this.lastSample = 0; this.switches = []; this.lastAttempt = undefined; this.windows = null; this.changes.clear(); }
  /** Seed the initial desktop silently. A new HWND is an opening; a changed title
   * is only a possible document change. No pixels or inferred purpose here. */
  syncWindows(windows: { id: string; key?: string }[], now: number) {
    const next = new Map(windows.slice(0, 80).map(w => [w.id, w.key ?? this.windows?.get(w.id) ?? w.id]));
    const events: { id: string; key: string; kind: 'opened' | 'changed' }[] = [];
    if (this.windows) for (const [id, key] of next) {
      if (this.windows.get(id) === key) continue;
      if (this.windows.get(id) === id && !this.changes.has(id)) continue; // first metadata sample, not a title change
      const birth = this.changes.get(id);
      const kind = !this.windows.has(id) || birth?.kind === 'opened' && now - birth.at < 90000 ? 'opened' as const : 'changed' as const;
      if (key !== id) this.changes.delete(id);
      this.changes.set(key, { kind, at: now }); events.push({ id, key, kind });
    }
    this.windows = next;
    for (const [key, change] of this.changes) if (now - change.at > 90000) this.changes.delete(key);
    while (this.changes.size > 32) this.changes.delete(this.changes.keys().next().value!);
    return events;
  }
  observe(key: string | null, now: number) {
    for (const [k, v] of this.interests) if (now - v.lastSeen > RETENTION) this.interests.delete(k);
    if (!key) { this.current = ''; this.since = this.lastSample = now; return; }
    if (key !== this.current || now - this.lastSample > 10000) {
      this.current = key; this.since = now;
      this.switches = [...this.switches.filter(t => now - t < 60000), now].slice(-12);
    }
    this.lastSample = now;
    // A fleeting switch does not establish familiarity or a new interest.
    if (now - this.since < 4000) return;
    let item = this.interests.get(key);
    if (!item) item = { key, firstSeen: now, lastSeen: now, visits: 1, returning: false, facts: [], interpretation: '', curiosity: '' };
    else if (now - item.lastSeen >= 60000) { item.visits++; item.returning = true; item.lookedAt = undefined; item.failures = 0; item.retryAt = 0; if (item.inspectedAt === undefined) item.attemptedAt = undefined; }
    item.lastSeen = now;
    this.interests.delete(key); this.interests.set(key, item);
    if (this.interests.size > 32) this.interests.delete(this.interests.keys().next().value!);
  }
  choose(now: number, input: { blocked: boolean; mayInspect: boolean }): CuriosityChoice {
    const item = this.interests.get(this.current);
    if (input.blocked || !item || now - this.lastSample > 10000 || now - this.since < 4000
      || this.switches.filter(t => now - t < 60000).length >= 4 && now - this.since < 20000) return { action: 'quiet', reason: 'unsettled or interrupted' };
    if (item.lookedAt === undefined) {
      item.lookedAt = now;
      return { action: 'look', reason: item.returning ? 'a familiar subject returned' : 'a sustained unfamiliar view, content still unknown' };
    }
    const followup = false; // Returning to the same unresolved view is not novelty.
    // A failed capture is not familiarity. Accepted views can change without a title change.
    const failed = item.inspectedAt === undefined && (item.failures ?? 0) > 0;
    const changedView = item.inspectedAt !== undefined && now - (item.checkedAt ?? item.inspectedAt) >= (item.curiosity ? 120000 : 240000);
    if (!input.mayInspect || this.waitSeconds(now) > 0 || now < (item.retryAt ?? 0)
      || failed && (item.failures ?? 0) >= 3
      || item.attemptedAt !== undefined && !failed && !changedView && (!followup || now - item.attemptedAt < 60000)) return { action: 'quiet', reason: 'nothing new worth interrupting for' };
    item.attemptedAt = now; item.returning = false; this.lastAttempt = now;
    const change = this.changes.get(this.current);
    return { action: 'inspect', reason: failed ? 'retry an interrupted or unavailable observation after settling'
      : followup ? 'revisit an unresolved visual curiosity; earlier evidence may have changed' : changedView ? 'check whether the exposed view changed under the same title; reuse the earlier reading if unchanged'
      : change?.kind === 'opened' ? 'a newly opened window has settled; inspect its exposed content before choosing a reaction'
      : change?.kind === 'changed' ? 'the visible document title changed and settled; check whether its content is meaningfully different'
      : 'a sustained unfamiliar view may contain an interesting detail; a gesture or silence can be enough' };
  }
  waitSeconds(now: number) {
    const change = this.changes.get(this.current), item = this.interests.get(this.current);
    const dwell = change && now - change.at < 90000 ? change.kind === 'opened' ? 6000 : 10000 : item?.returning ? 12000 : 18000;
    return Math.max(0, Math.ceil((Math.max(this.since + dwell, (this.lastAttempt ?? -Infinity) + 30000) - now) / 1000));
  }
  unchanged(key: string, fingerprint: string, now?: number) {
    const item = this.interests.get(key);
    if (!item || item.fingerprint !== fingerprint) return false;
    if (now !== undefined) { item.checkedAt = now; item.failures = 0; }
    return true;
  }
  /** A bounded retry, not a new interest or a repeated model decision. */
  failed(key: string, now: number) {
    const item = this.interests.get(key);
    if (!item) return;
    item.failures = Math.min(3, (item.failures ?? 0) + 1);
    item.retryAt = now + 30000 * item.failures;
    item.checkedAt = now;
  }
  record(key: string, reading: EnvironmentalReading, now: number, fingerprint?: string) {
    // Only the caller can confirm a completed, still-valid visual observation.
    const item = this.interests.get(key) ?? { key, firstSeen: now, lastSeen: now, visits: 1, returning: false };
    this.interests.delete(key);
    this.interests.set(key, { ...item, ...reading, fingerprint, lastSeen: now, inspectedAt: now, attemptedAt: now, checkedAt: now, failures: 0, retryAt: 0 });
    if (this.interests.size > 32) this.interests.delete(this.interests.keys().next().value!);
  }
  readAt(key: string) { return this.interests.get(key)?.inspectedAt; }
  priority(key: string, now: number) {
    const item = this.interests.get(key);
    return item?.curiosity && item.inspectedAt !== undefined && now - item.inspectedAt < EVIDENCE_AGE ? 12 : 0;
  }
  stable(key: string, now: number) { return key === this.current && now - this.since >= 4000 && now - this.lastSample <= 10000; }
  snapshot(now: number) {
    return { stableSeconds: this.current && now - this.lastSample <= 10000 ? Math.floor((now - this.since) / 1000) : 0,
      switchesPerMinute: this.switches.filter(t => now - t < 60000).length, inspectWaitSeconds: this.waitSeconds(now), recentChange: this.changes.get(this.current)?.kind ?? null,
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
