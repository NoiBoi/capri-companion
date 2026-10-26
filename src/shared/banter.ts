import type { LifeEvent, Mood } from './personality';

/** Original app dialogue inspired by the performance brief, not dialogue from the show. */
export const CAPRI_BANTER = {
  return: ["There you are. Did anything interesting happen out there?", "You are back. Good. I have an audience again.", "Ah. The outside world has returned you to me."],
  window: ["A little warning before you rearrange my universe?", "New ledge. Same excellent view of me.", "Moving the scenery. Ambitious."],
  annoyed: ["Again? I can count, you know.", "You have established that I am here. Thoroughly.", "I am beginning to question the scientific value of this experiment."],
  content: ["Mm. You may continue.", "Fine. This part of living in a computer is acceptable.", "Do not look so pleased with yourself. I did not say stop."],
  pat: ["Oh. Well. That is unexpectedly persuasive.", "You have found a very effective argument.", "I was going to object. I appear to have reconsidered."],
  poke: ["Yes? I was in the middle of being magnificent.", "Is this a question, or an experiment?", "You found me. Now make it interesting."],
} as const;
export function companionLines(kind: LifeEvent, mood: Mood, lastEvent: LifeEvent | null): readonly string[] {
  if (kind === 'return') return lastEvent === 'pat' ? ["Back for more head pats? I suppose I can fit you in.", ...CAPRI_BANTER.return] : CAPRI_BANTER.return;
  if (kind === 'window') return CAPRI_BANTER.window;
  if (mood === 'annoyed') return CAPRI_BANTER.annoyed;
  if (mood === 'content') return CAPRI_BANTER.content;
  return kind === 'pat' ? CAPRI_BANTER.pat : CAPRI_BANTER.poke;
}
