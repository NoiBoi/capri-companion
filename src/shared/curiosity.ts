/** Only lines promising a closer look invite a small cursor visit. */
export function invitesCloserLook(text: string) {
  const line = text.replace(/[’]/g, "'");
  if (/\b(?:don't|do not|not going to|wouldn't)\b/i.test(line)) return false;
  return /\b(?:i want to see|let me (?:look|get closer|see)|i(?:'m| am) coming over|i want (?:another look|to try over here)|i wasn't done looking|ooh,? hang on)\b/i.test(line);
}
