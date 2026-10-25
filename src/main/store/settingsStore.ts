import path from 'node:path';
import { EventEmitter } from 'node:events';
import { DEFAULT_SETTINGS, deepMerge, normalizeSettings, type Settings } from '../../shared/settings';
import { DebouncedWriter, readJson } from './jsonFile';

export class SettingsStore extends EventEmitter {
  private current: Settings;
  readonly repairedOnLoad: string[];
  private writer: DebouncedWriter;
  readonly file: string;

  constructor(dir: string) {
    super();
    this.file = path.join(dir, 'settings.json');
    const { value, corrupt } = readJson<unknown>(this.file, {});
    const { settings, repaired } = normalizeSettings(value);
    this.current = settings;
    this.repairedOnLoad = corrupt ? ['(file was corrupt; defaults restored)', ...repaired] : repaired;
    this.writer = new DebouncedWriter(this.file, 250);
    if (corrupt || repaired.length) this.writer.schedule(this.current);
  }

  get(): Settings {
    return structuredClone(this.current);
  }

  /** Apply a deep partial patch. Invalid fields are reset to defaults and reported. */
  update(patch: unknown): { settings: Settings; repaired: string[] } {
    const { settings, repaired } = normalizeSettings(deepMerge(this.current, patch));
    // arrays/records are replaced not merged — that's intended for lists like approvedApps
    this.current = settings;
    this.writer.schedule(settings);
    this.emit('changed', this.get());
    return { settings: this.get(), repaired };
  }

  reset(): Settings {
    this.current = structuredClone({ ...DEFAULT_SETTINGS, firstRunComplete: true });
    this.writer.schedule(this.current);
    this.emit('changed', this.get());
    return this.get();
  }

  flush() { this.writer.flush(); }
}
