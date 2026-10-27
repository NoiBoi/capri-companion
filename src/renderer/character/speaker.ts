import type { Mood } from '../../shared/personality';
import type { Settings } from '../../shared/settings';
import { LipSync } from './lipsync';

type Utterance = { id: string; text: string; mood?: Mood };
type Report = (id: string, state: 'start' | 'end' | 'error') => void;

/** Picks a default substitute voice: a female English Windows voice if available. */
export function pickVoice(voices: SpeechSynthesisVoice[], preferred: string): SpeechSynthesisVoice | null {
  if (preferred) { const v = voices.find((x) => x.name === preferred); return v ?? null; }
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  return en.find((v) => /zira|aria|jenny|hazel|susan|eva|female/i.test(v.name)) ?? null;
}

/**
 * Sequential, interruptible speech queue. Each sentence is spoken as soon as it
 * streams in, so the first words play while the model is still generating.
 */
export class Speaker {
  private queue: Utterance[] = [];
  private processing = false;
  private generation = 0;
  private playing: { id: string; cancel: () => void } | null = null;
  readonly lips = new LipSync();
  private audioCtx: AudioContext | null = null;
  constructor(private settings: () => Settings, private report: Report, private fetchAudio: (text: string, mood?: Mood) => Promise<Uint8Array>) {}

  /** True only while audio is actually playing (between the engine's start and end events). */
  private audible = false;
  get speaking() { return this.audible; }

  enqueue(id: string, text: string, mood?: Mood) {
    if (this.queue.length > 50) this.queue.shift(); // bounded
    this.queue.push({ id, text, mood });
    if (!this.processing) void this.next();
  }

  stopAll() {
    this.generation++;
    this.processing = false;
    const pending = this.queue.splice(0);
    for (const q of pending) this.report(q.id, 'end');
    const active = this.playing; this.playing = null; active?.cancel();
    try { speechSynthesis.cancel(); } catch { /* */ }
  }

  private async next() {
    const item = this.queue.shift();
    if (!item) { this.lips.stop(); return; }
    this.processing = true;
    const generation = this.generation;
    const v = this.settings().voice;
    if (!v.ttsEnabled) { this.processing = false; this.report(item.id, 'end'); void this.next(); return; }
    try {
      if (v.ttsEngine === 'openai') await this.playRemote(item, v, generation);
      else await this.playSystem(item, v);
    } catch {
      // Never substitute another voice when the configured voice fails.
      if (generation === this.generation) this.report(item.id, 'error');
    }
    if (generation !== this.generation) return;
    this.playing = null;
    this.processing = false;
    void this.next();
  }

  private playSystem(item: Utterance, v: Settings['voice']) {
    return new Promise<void>((resolve, reject) => {
      if (typeof speechSynthesis === 'undefined') return reject(new Error('no speechSynthesis'));
      const u = new SpeechSynthesisUtterance(item.text);
      const voice = pickVoice(speechSynthesis.getVoices(), v.systemVoice);
      if (!voice) return reject(new Error('Configured voice is not ready'));
      u.voice = voice;
      u.rate = v.rate; u.pitch = v.pitch; u.volume = v.volume;
      let done = false;
      const finish = (state: 'end' | 'error') => { if (done) return; done = true; this.audible = false; this.lips.stop(); this.report(item.id, state); state === 'end' ? resolve() : reject(new Error('tts error')); };
      u.onstart = () => { this.audible = true; this.lips.start(); this.report(item.id, 'start'); };
      u.onboundary = (e) => { if (e.name === 'word') this.lips.boundary(e.charLength || 4); };
      u.onend = () => finish('end');
      u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? finish('end') : finish('error'));
      this.playing = { id: item.id, cancel: () => { speechSynthesis.cancel(); finish('end'); } };
      speechSynthesis.speak(u);
      // watchdog: some voices never fire onend
      setTimeout(() => finish('end'), 4000 + item.text.length * 120);
    });
  }

  private async playRemote(item: Utterance, v: Settings['voice'], generation: number) {
    const bytes = await this.fetchAudio(item.text, item.mood);
    if (generation !== this.generation) { this.report(item.id, 'end'); return; }
    this.audioCtx ??= new AudioContext();
    const buf = await this.audioCtx.decodeAudioData(bytes.slice().buffer);
    if (generation !== this.generation) { this.report(item.id, 'end'); return; }
    const src = this.audioCtx.createBufferSource();
    src.buffer = buf;
    const gain = this.audioCtx.createGain();
    gain.gain.value = v.volume;
    const an = this.audioCtx.createAnalyser();
    an.fftSize = 512;
    const data = new Float32Array(an.fftSize);
    src.connect(gain).connect(an).connect(this.audioCtx.destination);
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => { if (done) return; done = true; this.audible = false; this.lips.stop(); this.report(item.id, 'end'); resolve(); };
      src.onended = finish;
      this.playing = { id: item.id, cancel: () => { try { src.stop(); } catch { /* */ } finish(); } };
      this.lips.start(() => { an.getFloatTimeDomainData(data); let s = 0; for (const x of data) s += x * x; return Math.sqrt(s / data.length); });
      this.audible = true;
      this.report(item.id, 'start');
      src.start();
    });
  }
}
