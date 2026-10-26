import type { Settings } from './settings';

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** Quiet hours may wrap midnight (22:00 → 08:00). */
export function inQuietHours(q: Settings['behavior']['quietHours'], d = new Date()): boolean {
  if (!q.enabled) return false;
  const now = d.getHours() * 60 + d.getMinutes();
  const s = toMin(q.start), e = toMin(q.end);
  if (s === e) return false;
  return s < e ? now >= s && now < e : now >= s || now < e;
}

/** Should Capri volunteer anything right now? (She still answers when spoken to.) */
export function mayInterrupt(s: Settings, ctx: { fullscreen: boolean; hidden: boolean; now?: Date }): boolean {
  return !s.behavior.doNotDisturb && !ctx.fullscreen && !ctx.hidden && !inQuietHours(s.behavior.quietHours, ctx.now);
}

// Interpretation lines (see docs/CHARACTER_DOSSIER.md §3) — used only when idle remarks are enabled.
export const IDLE_REMARKS = [
  "So much world, and I get this little rectangle. Seems poorly negotiated.",
  "Sometimes I wonder what I would look like from the other side of a screen.",
  "I could be mysterious for a while. Would you appreciate the effort?",
  "I had a magnificent thought. I am deciding whether to share.",
  "Pick something you are curious about. I want to see where it goes.",
  "You know what I like about a window? The implication that there is something beyond it.",
  "There is a difference between being quiet and having nothing to say."
];
