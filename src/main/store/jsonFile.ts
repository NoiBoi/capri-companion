import fs from 'node:fs';
import path from 'node:path';

/** Read JSON; on corruption, move the bad file aside (never silently discard) and return fallback. */
export function readJson<T>(file: string, fallback: T): { value: T; corrupt: boolean } {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return { value: fallback, corrupt: false };
  }
  try {
    return { value: JSON.parse(raw) as T, corrupt: false };
  } catch {
    try { fs.renameSync(file, `${file}.corrupt-${Date.now()}`); } catch { /* ignore */ }
    return { value: fallback, corrupt: true };
  }
}

/** Atomic write: temp file in same directory, fsync, then rename over the target. */
export function writeJsonAtomic(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, JSON.stringify(value, null, 2));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
}

/** Debounced writer so rapid updates (dragging, sliders) don't hammer the disk. */
export class DebouncedWriter {
  private timer: NodeJS.Timeout | null = null;
  private pending: unknown = undefined;
  constructor(private file: string, private delayMs = 300) {}
  schedule(value: unknown) {
    this.pending = value;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.delayMs);
  }
  flush() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.pending !== undefined) {
      writeJsonAtomic(this.file, this.pending);
      this.pending = undefined;
    }
  }
}

let counter = 0;
export function newId(prefix = ''): string {
  counter = (counter + 1) % 1e6;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
