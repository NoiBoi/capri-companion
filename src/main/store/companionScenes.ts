import fs from 'node:fs';
import path from 'node:path';
import { writeJsonAtomic } from './jsonFile';

export interface CompanionScene {
  kind: 'said' | 'action'; text: string; at: number; surface?: string;
}
/** What actually reached the screen or happened, never proposed lines or imagined user facts. */
export class CompanionScenes {
  private items: CompanionScene[] = [];
  private file: string;
  private wasEnabled: boolean;
  constructor(dir: string, private enabled: () => boolean, private retentionDays: () => number, private now = Date.now) {
    this.file = path.join(dir, 'companion-scenes.json');
    this.wasEnabled = enabled();
    if (!enabled()) { this.clear(); return; }
    try {
      const raw: unknown = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (Array.isArray(raw)) this.items = raw.filter((x): x is CompanionScene => x && ['said', 'action'].includes(x.kind) && typeof x.text === 'string' && x.text.length <= 600 && Number.isFinite(x.at) && x.at <= now() && (x.surface === undefined || typeof x.surface === 'string' && x.surface.length <= 40));
    } catch { /* New or torn scene file does not affect chat or approved memories. */ }
    this.prune(true);
  }
  private prune(persist = false) {
    const before = this.items.length;
    const days = this.retentionDays(), cutoff = this.now() - (days > 0 ? Math.min(days, 30) : 30) * 86400000;
    this.items = this.items.filter(x => x.at >= cutoff && x.at <= this.now()).slice(-96);
    if (persist && before !== this.items.length && this.enabled()) try { writeJsonAtomic(this.file, this.items); } catch { /* session state is already pruned */ }
  }
  record(kind: CompanionScene['kind'], text: string, surface?: string) {
    const clean = text.replace(/\s+/g, ' ').trim().slice(0, 600);
    if (!clean) return;
    const last = this.items.at(-1);
    if (last?.kind === kind && last.text === clean && this.now() - last.at < 10000) return;
    this.items.push({ kind, text: clean, at: this.now(), ...(surface ? { surface: surface.slice(0, 40) } : {}) });
    this.prune();
    if (this.enabled()) try { writeJsonAtomic(this.file, this.items); } catch { /* Session continuity still works. */ }
  }
  recent(limit = 10) { this.prune(true); return this.items.slice(-limit).map(x => ({ ...x })); }
  context(query = '') {
    this.prune(true);
    const recent = [...this.items.filter(x => x.kind === 'said').slice(-4), ...this.items.filter(x => x.kind === 'action').slice(-2)];
    const words = new Set(query.toLowerCase().match(/[a-z]{4,}/g) ?? []);
    const older = this.items.filter(x => !recent.includes(x)).map(x => ({ x, score: [...words].filter(w => x.text.toLowerCase().includes(w)).length }))
      .filter(x => x.score >= 2).sort((a, b) => b.score - a.score || b.x.at - a.x.at).slice(0, 2).map(x => x.x);
    const selected = [...older, ...recent].sort((a, b) => a.at - b.at);
    let chars = 0;
    return selected.reverse().filter(x => (chars += x.text.length) <= 1800).reverse().map(x => ({ ...x, ageSeconds: Math.max(0, Math.round((this.now() - x.at) / 1000)) }));
  }
  clear() { this.items = []; try { fs.rmSync(this.file, { force: true }); } catch { /* already absent */ } }
  privacyChanged() {
    const enabled = this.enabled();
    if (this.wasEnabled && !enabled) this.clear(); else this.prune(true);
    this.wasEnabled = enabled;
  }
}
