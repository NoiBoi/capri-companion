import { describe, expect, it } from 'vitest';
import { EnvironmentalCuriosity } from '../../src/shared/curiosity';
import { inspectionReading } from '../../src/main/desktop/inspection';

const allowed = { blocked: false, mayInspect: true };
function dwell(c: EnvironmentalCuriosity, key: string, start: number, duration = 32000) {
  for (let t = start; t <= start + duration; t += 2000) c.observe(key, t);
}
describe('environmental judgment over desktop events', () => {
  it('looks, selectively inspects, then stays quiet during a long ordinary work session', () => {
    const c = new EnvironmentalCuriosity(); dwell(c, 'a', 0);
    expect(c.choose(32000, allowed).action).toBe('look');
    expect(c.choose(32000, allowed).action).toBe('inspect');
    c.record('a', { facts: ['A disconnected green loop.'], interpretation: 'Maybe a route.', curiosity: 'Where does the loose end go?' }, 32000);
    for (let t = 34000; t < 3600000; t += 2000) {
      c.observe('a', t); expect(c.choose(t, allowed).action).toBe('quiet');
    }
    expect(c.context('a', 3600000)?.evidence).toBeUndefined();
    expect(c.priority('a', 3600000)).toBe(0);
  });
  it('treats rapid ordinary app switching as unsettled, rather than twelve new interests', () => {
    const c = new EnvironmentalCuriosity();
    for (let t = 0; t < 60000; t += 2000) {
      c.observe(String(t % 6000), t); expect(c.choose(t, allowed).action).toBe('quiet');
    }
    expect(c.context('0', 60000)).toBeUndefined();
  });
  it('recognizes a return and carries a dated open curiosity into a later investigation', () => {
    const c = new EnvironmentalCuriosity(); dwell(c, 'diagram', 0);
    c.choose(32000, allowed); c.choose(32000, allowed);
    c.record('diagram', { facts: ['A loop ends outside the border.'], interpretation: 'Might be a deliberate escape route.', curiosity: 'Does the outside end reconnect?' }, 32000);
    dwell(c, 'other', 40000); c.observe(null, 80000);
    dwell(c, 'diagram', 640000);
    expect(c.context('diagram', 672000)).toMatchObject({ familiarity: 'returned to previously observed metadata', hypothesis: 'Might be a deliberate escape route.', evidence: { ageSeconds: 640 } });
    expect(c.choose(672000, allowed).action).toBe('look');
    expect(c.choose(672000, allowed)).toMatchObject({ action: 'inspect', reason: expect.stringContaining('unresolved') });
  });
  it('preserves interest through touch but never spends an inspection while blocked or quiet', () => {
    const c = new EnvironmentalCuriosity(); dwell(c, 'a', 0);
    expect(c.choose(32000, { ...allowed, blocked: true }).action).toBe('quiet');
    expect(c.choose(32000, allowed).action).toBe('look');
    expect(c.choose(32000, { ...allowed, mayInspect: false }).action).toBe('quiet');
    expect(c.choose(32000, allowed).action).toBe('inspect');
    c.record('a', { facts: [], interpretation: '', curiosity: 'A small unresolved detail.' }, 32000);
    expect(c.choose(32000, { ...allowed, blocked: true }).action).toBe('quiet');
    expect(c.context('a', 32000)?.openCuriosity).toBe('A small unresolved detail.');
    c.clear(); expect(c.context('a', 32000)).toBeUndefined();
  });
  it('expires absent subjects and never implies unseen user intent from metadata', () => {
    const c = new EnvironmentalCuriosity(); dwell(c, 'opaque-key', 0);
    expect(c.context('opaque-key', 32000)).toEqual({ familiarity: 'seen this session', evidence: undefined, hypothesis: undefined, openCuriosity: undefined });
    c.observe(null, 3 * 3600000); expect(c.context('opaque-key', 3 * 3600000)).toBeUndefined();
  });
  it('bounds and separates model visual facts, hypotheses and unresolved interests', () => {
    const reading = inspectionReading(JSON.stringify({ facts: ['green loop', 4, 'x'.repeat(1000), 'end', 'extra'], interpretation: 'Maybe a map.', curiosity: 'Does it connect?' }));
    expect(reading.facts).toHaveLength(3); expect(reading.facts[1]).toHaveLength(160);
    expect(reading.interpretation).toBe('Maybe a map.');
    expect(inspectionReading('not JSON').facts).toEqual([]);
    expect(inspectionReading('null').curiosity).toBe('');
  });
});
