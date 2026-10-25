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
  'Still here, choom.',
  'Your desktop’s cozy. Messy, but cozy.',
  'Hydrate. Even chrome needs coolant.',
  'Ping me if you need a hand. Or a brain. I’ve got dozens.',
  'Stretch. Your spine isn’t cyberware.',
  'Quiet in here. I like it… mostly.',
];
