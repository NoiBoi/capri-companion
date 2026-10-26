import type { Settings } from '../../shared/settings';

/** Older TTS models reject delivery instructions; compatible endpoints can use them on newer models. */
export function speechRequest(text: string, voice: Settings['voice']) {
  const { model, voice: name, instructions } = voice.openaiTts;
  return {
    model, voice: name, input: text, response_format: 'mp3', speed: voice.rate,
    ...(!/^tts-1(?:-hd)?$/.test(model) && instructions.trim() ? { instructions: instructions.trim() } : {}),
  };
}
