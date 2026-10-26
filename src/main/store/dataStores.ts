import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import type { ChatMessage, MemoryItem, Note, Reminder } from '../../shared/ipc';
import { newId, readJson, writeJsonAtomic } from './jsonFile';

const MAX_HISTORY_IN_MEMORY = 2000;

/** Conversation history: append-only JSONL, compacted on load (retention + cap). */
export class HistoryStore {
  private file: string;
  private items: ChatMessage[] = [];
  constructor(dir: string, private retentionDays: () => number, private enabled: () => boolean) {
    this.file = path.join(dir, 'history.jsonl');
    this.load();
  }
  private load() {
    let raw = '';
    try { raw = fs.readFileSync(this.file, 'utf8'); } catch { return; }
    const out: ChatMessage[] = [];
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const m = JSON.parse(line) as ChatMessage;
        if (m && typeof m.content === 'string' && typeof m.ts === 'number') out.push(m);
      } catch { /* skip torn line (e.g. crash mid-write) */ }
    }
    this.items = out;
    this.compact();
  }
  compact() {
    const days = this.retentionDays();
    const cutoff = days > 0 ? Date.now() - days * 86400_000 : 0;
    const before = this.items.length;
    this.items = this.items.filter((m) => m.ts >= cutoff).slice(-MAX_HISTORY_IN_MEMORY);
    if (this.items.length !== before || fs.existsSync(this.file)) this.rewrite();
  }
  private rewrite() {
    if (!this.enabled()) { this.items = []; try { fs.rmSync(this.file, { force: true }); } catch { /* */ } return; }
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, this.items.map((m) => JSON.stringify(m)).join('\n') + (this.items.length ? '\n' : ''));
    fs.renameSync(tmp, this.file);
  }
  append(m: ChatMessage) {
    this.items.push(m);
    if (this.items.length > MAX_HISTORY_IN_MEMORY * 1.2) this.compact();
    if (!this.enabled()) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.appendFileSync(this.file, JSON.stringify(m) + '\n');
  }
  recent(limit = 50): ChatMessage[] { return this.items.slice(-limit); }
  clear() { this.items = []; try { fs.rmSync(this.file, { force: true }); } catch { /* */ } }
}

/** Long-term memory. Model-proposed memories stay "pending" until the user approves. */
export class MemoryStore extends EventEmitter {
  private file: string;
  private items: MemoryItem[];
  static MAX = 200;
  constructor(dir: string) {
    super();
    this.file = path.join(dir, 'memory.json');
    this.items = (readJson<MemoryItem[]>(this.file, []).value || []).filter((m) => m && typeof m.text === 'string');
  }
  private save() { writeJsonAtomic(this.file, this.items); this.emit('changed'); }
  list() { return [...this.items]; }
  approved() { return this.items.filter((m) => m.status === 'approved'); }
  add(text: string, source: 'user' | 'model'): MemoryItem {
    const clean = text.replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!clean) throw new Error('Memory text is empty');
    const dupe = this.items.find((m) => m.text.toLowerCase() === clean.toLowerCase());
    if (dupe) return dupe;
    if (this.items.length >= MemoryStore.MAX) throw new Error(`Memory is full (${MemoryStore.MAX} items). Delete some first.`);
    const item: MemoryItem = { id: newId('m'), text: clean, createdAt: Date.now(), status: source === 'user' ? 'approved' : 'pending', source };
    this.items.push(item);
    this.save();
    return item;
  }
  /** Validate the full batch before changing anything, and preserve existing entries. */
  importProfile(entries: { text: string; kind: 'fact' | 'preference' | 'interpretation' }[], label: string, asOf: string) {
    if (!label.trim() || label.length > 160 || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error('Invalid profile source.');
    const seen = new Set(this.items.map(m => m.text.toLowerCase()));
    const fresh: MemoryItem[] = [];
    for (const entry of entries) {
      const clean = entry.text.replace(/\s+/g, ' ').trim();
      if (!clean || clean.length > 300 || !['fact', 'preference', 'interpretation'].includes(entry.kind)) throw new Error('Invalid profile entry.');
      if (seen.has(clean.toLowerCase())) continue;
      seen.add(clean.toLowerCase());
      fresh.push({ id: newId('m'), text: clean, createdAt: Date.now(), status: 'approved', source: 'user', context: { label: label.trim(), kind: entry.kind, asOf } });
    }
    if (this.items.length + fresh.length > MemoryStore.MAX) throw new Error('Not enough room for the whole profile.');
    this.items.push(...fresh);
    if (fresh.length) this.save();
    return { added: fresh.length, duplicates: entries.length - fresh.length };
  }
  update(id: string, text: string): MemoryItem {
    const item = this.items.find(m => m.id === id);
    if (!item) throw new Error('Memory not found.');
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean || clean.length > 300) throw new Error('Memory must contain 1 to 300 characters.');
    if (this.items.some(m => m.id !== id && m.text.toLowerCase() === clean.toLowerCase())) throw new Error('That memory already exists.');
    item.text = clean; item.updatedAt = Date.now();
    this.save(); return structuredClone(item);
  }
  approve(id: string) { const m = this.items.find((x) => x.id === id); if (m) { m.status = 'approved'; this.save(); } }
  delete(id: string) { this.items = this.items.filter((m) => m.id !== id); this.save(); }
  clear() { this.items = []; this.save(); }
}

export class NotesStore {
  private file: string;
  private items: Note[];
  constructor(dir: string) {
    this.file = path.join(dir, 'notes.json');
    this.items = readJson<Note[]>(this.file, []).value || [];
  }
  list() { return [...this.items].sort((a, b) => b.createdAt - a.createdAt); }
  add(title: string, body: string): Note {
    const n: Note = { id: newId('n'), title: title.slice(0, 120) || 'Note', body: body.slice(0, 10_000), createdAt: Date.now() };
    this.items.push(n);
    writeJsonAtomic(this.file, this.items);
    return n;
  }
  delete(id: string) { this.items = this.items.filter((n) => n.id !== id); writeJsonAtomic(this.file, this.items); }
  clear() { this.items = []; writeJsonAtomic(this.file, this.items); }
}

/**
 * Reminders and timers. One scheduler timer for the nearest due item (no per-item
 * timers → bounded resources). Past-due items fire on startup ("missed while closed").
 */
export class ReminderStore extends EventEmitter {
  private file: string;
  private items: Reminder[];
  private timer: NodeJS.Timeout | null = null;
  static MAX_ACTIVE = 100;
  constructor(dir: string, private now: () => number = Date.now) {
    super();
    this.file = path.join(dir, 'reminders.json');
    this.items = (readJson<Reminder[]>(this.file, []).value || []).filter((r) => r && typeof r.dueAt === 'number');
  }
  start() { this.reschedule(); }
  stop() { if (this.timer) clearTimeout(this.timer); this.timer = null; }
  private save() { writeJsonAtomic(this.file, this.items); }
  active() { return this.items.filter((r) => !r.fired).sort((a, b) => a.dueAt - b.dueAt); }
  list() { return [...this.items].sort((a, b) => b.dueAt - a.dueAt).slice(0, 200); }
  add(text: string, dueAt: number, kind: 'reminder' | 'timer'): Reminder {
    if (!Number.isFinite(dueAt) || dueAt < this.now() - 1000) throw new Error('Time is in the past');
    if (dueAt > this.now() + 366 * 86400_000) throw new Error('Too far in the future (max 1 year)');
    if (this.active().length >= ReminderStore.MAX_ACTIVE) throw new Error('Too many active reminders');
    const r: Reminder = { id: newId('r'), text: text.slice(0, 300) || (kind === 'timer' ? 'Timer' : 'Reminder'), dueAt, kind, fired: false };
    this.items.push(r);
    // keep file bounded: drop old fired items
    this.items = this.items.filter((x) => !x.fired || x.dueAt > this.now() - 7 * 86400_000);
    this.save();
    this.reschedule();
    return r;
  }
  cancel(idOrText: string): Reminder | null {
    const r = this.active().find((x) => x.id === idOrText) ?? this.active().find((x) => x.text.toLowerCase().includes(idOrText.toLowerCase()));
    if (!r) return null;
    this.items = this.items.filter((x) => x.id !== r.id);
    this.save();
    this.reschedule();
    return r;
  }
  clear() { this.items = []; this.save(); this.reschedule(); }
  /** Fire everything due; exposed for tests. */
  tick() {
    const due = this.active().filter((r) => r.dueAt <= this.now());
    for (const r of due) { r.fired = true; this.emit('fired', { ...r }); }
    if (due.length) this.save();
    this.reschedule();
  }
  private reschedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const next = this.active()[0];
    if (!next) return;
    // setTimeout max ~24.8 days; re-arm in chunks; also wake at most hourly to survive sleep/clock changes
    const delay = Math.max(0, Math.min(next.dueAt - this.now(), 3600_000));
    this.timer = setTimeout(() => this.tick(), delay);
    this.timer.unref?.();
  }
}
