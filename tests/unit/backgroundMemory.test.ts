import { describe, expect, it } from 'vitest';
import { MemoryLearning } from '../../src/main/ai/memoryLearning';
import { MemoryStore } from '../../src/main/store/dataStores';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';
import { nullLogger } from '../../src/main/log';
import { tmpDir } from './helpers';
import type { GenOptions, LLMMessage } from '../../src/main/ai/providers';
const eventually = async (check: () => boolean) => { for (let i=0;i<100;i++) { if(check()) return; await new Promise(r=>setTimeout(r,10)); } throw Error('Timed out'); };
describe('background learning scheduler', () => {
  it('waits for reply completion, aborts for a new message, then resumes in order', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS); settings.memory.autoLearn = true;
    const memory = new MemoryStore(tmpDir()); let starts = 0; let active = 0; let maxActive = 0;
    const provider = { name: 'mock', local: true, async test() { return { ok: true, detail: '' }; }, async listModels() { return []; },
      async *stream(messages: LLMMessage[], options: GenOptions) {
        starts++; active++; maxActive = Math.max(maxActive, active);
        const data = JSON.parse(messages[1].content);
        try {
          if (starts === 1) await new Promise<void>(resolve => options.signal.addEventListener('abort', () => resolve(), { once: true }));
          if (!options.signal.aborted) yield JSON.stringify({ changes: [{ op:'add', text:data.current_user_message, kind:'fact', evidence:data.current_user_message }] });
        } finally { active--; }
      } };
    const learner = new MemoryLearning({ settings:()=>settings, memory, provider:()=>provider, log:nullLogger });
    try {
      learner.enqueue('First user fact','1'); await new Promise(r=>setTimeout(r,30)); expect(starts).toBe(0);
      learner.schedule(0); await eventually(()=>starts===1);
      learner.enqueue('Second user fact','2'); await eventually(()=>active===0);
      expect(memory.approved()).toHaveLength(0);
      learner.schedule(0); await eventually(()=>memory.approved().length===1);
      learner.schedule(0); await eventually(()=>memory.approved().length===2);
      expect(maxActive).toBe(1); expect(memory.approved().map(m=>m.text)).toEqual(['First user fact','Second user fact']);
    } finally { learner.discard(); }
  });
  it('discard prevents queued facts being restored after a manual deletion', async () => {
    let starts = 0; const settings = structuredClone(DEFAULT_SETTINGS); settings.memory.autoLearn = true;
    const memory = new MemoryStore(tmpDir());
    const provider = { name:'mock', local:true, async *stream() { starts++; yield '{"changes":[]}'; }, async test(){return {ok:true,detail:''};},async listModels(){return [];} };
    const learner = new MemoryLearning({ settings:()=>settings, memory, provider:()=>provider, log:nullLogger });
    learner.enqueue('A personal fact','m'); learner.schedule(0); learner.discard();
    await new Promise(r=>setTimeout(r,30)); expect(starts).toBe(0);
  });
});
