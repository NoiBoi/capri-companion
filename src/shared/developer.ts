import type { SpriteClip } from '../renderer/character/spriteClips';
import type { SecondaryPose } from '../renderer/character/secondarySprites';
export const DEV_ANIMATIONS = ['idle', 'blink', 'blink_glitch', 'grin', 'glitch', 'dangle', 'sleep', 'wake', 'perch', 'perch_blink', 'perch_blink_glitch', 'perch_glitch', 'mouth'] as const satisfies readonly SpriteClip[];
export const DEV_ACTIVITIES = ['notice', 'lean', 'stretch', 'settle', 'return', 'pickup', 'putdown'] as const;
export const DEV_INTERACTIONS = ['pat', 'poke', 'hover', 'return', 'window'] as const;
export const DEV_DIALOGUE = ['greeting', 'notice', 'resume', 'roam', 'perch', 'arrival', 'pickup', 'putdown', 'pat', 'poke', 'return', 'thanks', 'farewell'] as const;
export const DEV_SCENARIOS = ['shader_compare', 'sit_hover', 'sit_inspect', 'recline_rest', 'cursor_visit', 'drop_fallback', 'perch_quick', 'perch_held', 'pat_upright', 'pat_perched', 'pat_inverted', 'continuity'] as const;
export interface PoseRendererState { pose: SecondaryPose | null; shader: boolean; reduced: boolean; motion: number }
export interface DevPreview { animation?: SpriteClip; secondary?: SecondaryPose; secondaryMotion?: 'animated' | 'still'; secondaryScene?: 'hover' | 'inspect' | 'rest'; held?: boolean; attachment?: 'perch' | 'inverted' | null; deepSleep?: boolean; phase?: 'idle' | 'thinking' | 'listening' }
export type DevCommand =
  | { kind: 'scene'; name: import('./theatrics').SceneKind; seconds: number }
  | { kind: 'flourish'; name: import('./theatrics').FlourishKind; seconds: number }
  | { kind: 'mask'; seconds: number }
  | { kind: 'cutin'; name: 'grin' | 'laugh' | 'look' | 'eyes' | 'many'; seconds: number }
  | { kind: 'animation'; name: typeof DEV_ANIMATIONS[number]; seconds: number }
  | { kind: 'activity'; name: typeof DEV_ACTIVITIES[number]; seconds: number }
  | { kind: 'interaction'; name: typeof DEV_INTERACTIONS[number]; seconds: number }
  | { kind: 'dialogue'; name: typeof DEV_DIALOGUE[number]; seconds: number; surface?: import('./dialogueContext').DialogueSurface }
  | { kind: 'cycle'; name: 'animations' | 'interactions' | 'activity' | 'loading'; seconds: number }
  | { kind: 'explore'; count?: 1 | 3 }
  | { kind: 'secondary'; name: SecondaryPose; seconds: number; inverted?: boolean; motion?: 'animated' | 'still' }
  | { kind: 'scenario'; name: typeof DEV_SCENARIOS[number]; seconds: number }
  | { kind: 'ping'; name: import('./contextPings').PingKind; seconds: number }
  | { kind: 'live'; name: 'drop' | 'inspect' | 'cursor_return' }
  | { kind: 'checks' | 'intro' };
export interface DevState {
  active: boolean; label: string; step: string; startedAt: number | null;
  result: 'idle' | 'running' | 'passed' | 'stopped' | 'failed';
  log: { at: number; text: string }[];
}
export interface DevSnapshot {
  job: DevState;
  runtime: { scene: string | null; visible: boolean; phase: string; mode: string; fps: number | null; moving: boolean; visit: string; tour: string;
    pendingRequest: boolean; approvedMemories: number; preferredName: string | null; goal: string | null; restSeconds: number; absence: 'idle' | 'sleep' | null;
    dialogueOutcome: string; inspectionPoints: number; sharedScenes: number; poseRenderer: PoseRendererState | null };
}
