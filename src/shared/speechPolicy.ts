import type { Settings } from './settings';
import { mayInterrupt } from './behaviorRules';

/**
 * The only reasons Capri may speak out loud. Every speech request in the app goes through
 * {@link speechAllowed}; nothing else (timers, reconnects, idle animations, teleports, the model
 * deciding on its own) can make her talk.
 * - reply: answering something the user said or typed to her
 * - reminder: a timer or reminder the user created
 * - proactive: volunteering a line; off unless the user enabled both idle remarks and their voice
 */
export type SpeechReason = 'reply' | 'reminder' | 'proactive';

export function speechAllowed(reason: SpeechReason, s: Settings, ctx: { fullscreen: boolean; hidden: boolean; now?: Date }): boolean {
  if (!s.voice.ttsEnabled) return false;
  switch (reason) {
    case 'reply': return true;
    case 'reminder': return !s.behavior.doNotDisturb && !ctx.fullscreen;
    case 'proactive': return s.behavior.idleRemarks && s.behavior.proactiveVoice && mayInterrupt(s, ctx);
  }
}
