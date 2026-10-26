import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPRITE_CLIPS, spriteBase, spriteFrame, type SpriteClip } from '../../src/renderer/character/spriteClips';
import { codexEventText } from '../../src/main/ai/codexAccount';

describe('lachydotmcg artwork integration', () => {
  it('ships every original strip with the expected PNG cell dimensions', () => {
    for (const [name, clip] of Object.entries(SPRITE_CLIPS)) {
      const png = fs.readFileSync(path.join(__dirname, '../../assets/capri/lachy', `${name}.png`));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16), name).toBe(clip.width * clip.frames);
      expect(png.readUInt32BE(20), name).toBe(384);
    }
  });
  it('keeps animation frames inside their cells, including long runtimes and wake completion', () => {
    for (const name of Object.keys(SPRITE_CLIPS) as SpriteClip[]) {
      for (const time of [0, 0.1, 1.7, 12, 3600, -1]) {
        expect(spriteFrame(name, time)).toBeGreaterThanOrEqual(0);
        expect(spriteFrame(name, time)).toBeLessThan(SPRITE_CLIPS[name].frames);
      }
    }
    expect(spriteFrame('wake', 40, false)).toBe(12);
  });
  it('prioritizes held, sleeping, and speaking states over perching', () => {
    expect(spriteBase({ sleeping: true, dragging: true, ledge: true, speaking: false })).toBe('dangle');
    expect(spriteBase({ sleeping: true, dragging: false, ledge: true, speaking: false })).toBe('sleep');
    expect(spriteBase({ sleeping: false, dragging: false, ledge: true, speaking: true })).toBe('idle');
    expect(spriteBase({ sleeping: false, dragging: false, ledge: true, speaking: false })).toBe('perch');
  });
});

describe('Codex conversation protocol', () => {
  it('uses completed assistant text and never exposes tool messages or diagnostics', () => {
    expect(codexEventText('{"type":"item.completed","item":{"type":"agent_message","text":"Hey, choom."}}')).toEqual({ text: 'Hey, choom.' });
    expect(codexEventText('{"type":"item.completed","item":{"type":"command_execution","text":"private output"}}')).toEqual({});
    expect(codexEventText('not JSON')).toEqual({});
    expect(codexEventText('{"type":"turn.failed","error":{"message":"Limit reached"}}')).toEqual({ error: 'Limit reached' });
  });
});
