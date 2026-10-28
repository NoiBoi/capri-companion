import fs from 'node:fs';
import { writeJsonAtomic } from '../store/jsonFile';
type Purpose = 'ambient' | 'memory' | 'placement' | 'interaction';
/** A shared persisted ceiling for optional generation; direct replies never enter it. */
export class BackgroundBudget {
  private attempts: { at: number; purpose: Purpose }[] = [];
  constructor(private file?: string, private now = () => Date.now()) {
    if (file) try { const data = JSON.parse(fs.readFileSync(file, 'utf8')); if (Array.isArray(data)) this.attempts = data.filter(x => typeof x.at === 'number' && ['ambient', 'memory', 'placement', 'interaction'].includes(x.purpose)).slice(-24); } catch { /* fresh budget */ }
  }
  reserve(purpose: Purpose) {
    const now = this.now(); this.attempts = this.attempts.filter(a => a.at > now - 600000 && a.at <= now);
    const same = this.attempts.filter(a => a.purpose === purpose), last = same.at(-1);
    // Intentional contact gets a bounded lane, independent of inspections and memory extraction.
    if (purpose === 'interaction') {
      if (same.length >= 6 || last && now - last.at < 10000) return false;
      this.attempts.push({ at: now, purpose });
      if (this.file) try { writeJsonAtomic(this.file, this.attempts); } catch {}
      return true;
    }
    // Deliberate drops have a reserved allowance rather than competing with idle chatter.
    const background = this.attempts.filter(a => a.purpose !== 'placement' && a.purpose !== 'interaction');
    if (purpose === 'placement' ? same.length >= 4 || !!last && now - last.at < 15000
      : background.length >= 5 || same.length >= 3 || !!last && now - last.at < 60000) return false;
    this.attempts.push({ at: now, purpose });
    if (this.file) try { writeJsonAtomic(this.file, this.attempts); } catch { /* in-process ceiling remains */ }
    return true;
  }
  snapshot() {
    const now = this.now(), attempts = this.attempts.filter(a => a.at > now - 600000 && a.at <= now);
    return (['ambient', 'memory', 'placement', 'interaction'] as const).map(purpose => {
      const same = attempts.filter(a => a.purpose === purpose), limit = purpose === 'interaction' ? 6 : purpose === 'placement' ? 4 : 3;
      const available = (at: number) => {
        const live = attempts.filter(a => a.at > at - 600000), lane = live.filter(a => a.purpose === purpose), last = lane.at(-1);
        const shared = live.filter(a => a.purpose !== 'placement' && a.purpose !== 'interaction');
        return lane.length < limit && (!last || at - last.at >= (purpose === 'interaction' ? 10000 : purpose === 'placement' ? 15000 : 60000))
          && (purpose === 'placement' || purpose === 'interaction' || shared.length < 5);
      };
      const times = [now, ...attempts.flatMap(a => [a.at + 10000, a.at + 15000, a.at + 60000, a.at + 600000])].filter(t => t >= now).sort((a,b) => a-b);
      return { purpose, used: same.length, limit, retrySeconds: Math.ceil(((times.find(available) ?? now + 600000) - now) / 1000) };
    });
  }
}
