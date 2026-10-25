import type { PoseName } from './model';

export interface PoseInput {
  surface: string; // 'taskbar' | 'window' | 'air' | edges…
  posture: string;
  sleeping: boolean;
  dragging: boolean;
  variant: number; // 0–1, rolled once per posture so the choice holds
}

/**
 * Which pose of the model fits what she is doing. Lying down and sitting need something under her:
 * on the taskbar she lies along it (a dangling leg would hang off the screen) or hovers just above
 * it; on a window top she sits on the edge. With nothing under her she floats with her knees drawn
 * up, whatever the posture asks for: she never lies or sits on thin air.
 */
export function modelPoseFor(i: PoseInput): PoseName {
  const ledge = i.surface === 'taskbar' || i.surface === 'window';
  if (i.dragging || !ledge) return 'crouch';
  if (i.sleeping || i.posture === 'recline') return 'lie';
  if (i.surface === 'taskbar') return i.variant < 0.6 ? 'lie' : 'crouch';
  return 'sit';
}
