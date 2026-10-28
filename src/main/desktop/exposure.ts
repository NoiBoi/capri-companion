import type { Rect } from './displays';
import { windowAttachment } from './perch';
import { SEAT_RATIO } from '../../shared/framing';
import { restSupport } from './restSupport';
export function helperWindow(info: { title: string; process: string; className?: string }) {
  return /(?:qa[ _-]*osd|geforce.*overlay|nvidia.*(?:overlay|share|hud)|rtss|rivatuner|xbox game bar|gamebar|discord.*overlay)/i.test(info.title + ' ' + info.className)
    || /^(?:nvidia overlay|nvspcap64|gamebar|rtss|presentmon|q[a_ -]*osd)(?:\.exe)?$/i.test(info.process);
}
export const intersects = (a: Rect, b: Rect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
export function intersection(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), right = Math.min(a.x + a.width, b.x + b.width), bottom = Math.min(a.y + a.height, b.y + b.height);
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}
export function exposedRegions(target: Rect, blockers: Rect[]) {
  let regions = [target];
  for (const blocker of blockers) {
    regions = regions.flatMap(r => {
      const cut = intersection(r, blocker); if (!cut) return [r];
      return [{ x: r.x, y: r.y, width: r.width, height: cut.y - r.y },
        { x: r.x, y: cut.y + cut.height, width: r.width, height: r.y + r.height - cut.y - cut.height },
        { x: r.x, y: cut.y, width: cut.x - r.x, height: cut.height },
        { x: cut.x + cut.width, y: cut.y, width: r.x + r.width - cut.x - cut.width, height: cut.height }].filter(p => p.width > 0 && p.height > 0);
    });
    if (regions.length > 128) regions = regions.sort((a, b) => b.width * b.height - a.width * a.height).slice(0, 128);
  }
  return regions;
}
// Include the wider seated art, gestures and mirrored legs, not just the standing torso.
export const bodyFootprint = (pet: Rect): Rect => ({ x: pet.x + pet.width * .02, y: pet.y + pet.height * .10, width: pet.width * .96, height: pet.height * .78 });
export function exposedBody(pet: Rect, blockers: Rect[], area: Rect) {
  const visible = intersection(bodyFootprint(pet), area);
  return !!visible && !blockers.some(b => intersects(visible, b));
}
export function lowerWindowRest(pet: Rect, window: Rect, blockers: Rect[], area: Rect, cursor: { x: number; y: number }, fraction?: number) {
  for (const f of fraction === undefined ? [.18,.82,.38,.62] : [fraction]) {
    const x = Math.round(window.x + f * window.width - pet.width / 2);
    const bounds = { ...pet, x, y: Math.round(window.y + window.height - pet.height * SEAT_RATIO) };
    const clear = (r: Rect) => !blockers.some(b => intersects(r,b));
    if (restSupport(bounds,area,null,[window],clear).lie && exposedBody(bounds,blockers,area)
      && Math.hypot(bounds.x+pet.width*.5-cursor.x,bounds.y+pet.height*.4-cursor.y)>130) return { bounds, fraction:f };
  }
  return null;
}
export function tourPlan(pet: Rect, window: Rect, blockers: Rect[], area: Rect, cursor: { x: number; y: number }, random = Math.random) {
  const regions = exposedRegions(window, blockers).map(r => intersection(r, area)).filter((r): r is Rect => !!r).sort((a, b) => b.width * b.height - a.width * a.height);
  const points: Rect[] = [];
  for (const r of regions) {
    const body = bodyFootprint(pet); if (r.width < body.width + 12 || r.height < body.height + 12) continue;
    const side = random() < .5 ? 1 : -1, center = .3 + random() * .4;
    const samples = Array.from({ length: 4 }, (_, i) => {
      const angle = (i * .55 + random() * .35) * Math.PI * side;
      return [Math.max(.08, Math.min(.92, center + Math.cos(angle) * (.15 + random() * .2))), Math.max(.08, Math.min(.88, .42 + Math.sin(angle) * .3 + (random() - .5) * .16))];
    });
    for (const [fx, fy] of samples) {
      const p = { ...pet, x: Math.round(r.x + (r.width - body.width) * fx - pet.width * .02), y: Math.round(r.y + (r.height - body.height) * fy - pet.height * .10) };
      const b = bodyFootprint(p);
      if (exposedBody(p, blockers, area) && Math.hypot(b.x + b.width / 2 - cursor.x, b.y + b.height / 2 - cursor.y) > 130) points.push(p);
    }
    if (points.length) break; // One convex exposed region keeps the flight between its points clear.
  }
  const fractions = [.18, .38, .62, .82].sort((a, b) => Math.abs(window.x + b * window.width - cursor.x) - Math.abs(window.x + a * window.width - cursor.x));
  for (const fraction of fractions) {
    const perch = windowAttachment(pet, window, SEAT_RATIO, area.y, fraction);
    const seat = { x: perch.bounds.x + pet.width * .4, y: window.y + 2, width: pet.width * .2, height: 6 };
    if (exposedBody(perch.bounds, blockers, area) && !blockers.some(b => intersects(seat, b))) {
      if (!points.length) {
        for (const dx of [-65, 65, 0]) {
          const p = { ...perch.bounds, x: perch.bounds.x + dx, y: perch.bounds.y + (perch.mode === 'inverted' ? 70 : -35) };
          if (exposedBody(p, blockers, area)) points.push(p);
        }
      }
      if (points.length) return { points, perch };
    }
  }
  return null;
}
