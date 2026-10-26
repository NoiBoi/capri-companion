import type { Rect } from './displays';

export interface PerchWindow { handle: bigint; rect: Rect }

/** Snap by the visible seat, rather than the large transparent renderer rectangle. */
export function snapWindow(windows: PerchWindow[], pet: Rect, seatRatio: number, distance = 56): PerchWindow | null {
  const x = pet.x + pet.width / 2, y = pet.y + pet.height * seatRatio;
  return windows.find(({ rect: w }) => x >= w.x && x <= w.x + w.width && Math.abs(y - w.y) <= distance) ?? null;
}

export function attachToWindow(pet: Rect, window: Rect, seatRatio: number, fraction?: number): { bounds: Rect; fraction: number } {
  const f = Math.max(0, Math.min(1, fraction ?? (pet.x + pet.width / 2 - window.x) / window.width));
  const inset = Math.min(pet.width * 0.22, window.width / 2);
  const center = Math.max(window.x + inset, Math.min(window.x + window.width - inset, window.x + f * window.width));
  return { bounds: { ...pet, x: Math.round(center - pet.width / 2), y: Math.round(window.y - pet.height * seatRatio) }, fraction: f };
}
