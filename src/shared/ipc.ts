// Typed IPC contract shared by main, preload and renderers.
import type { Settings, ToolName, Policy } from './settings';

export type ChatRole = 'user' | 'assistant' | 'system' | 'action';
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  ts: number;
  meta?: { provider?: string; error?: string; interrupted?: boolean; actionStatus?: string };
}

export interface MemoryItem {
  id: string;
  text: string;
  createdAt: number;
  status: 'pending' | 'approved';
  source: 'user' | 'model';
}
export interface Note { id: string; title: string; body: string; createdAt: number }
export interface Reminder { id: string; text: string; dueAt: number; kind: 'reminder' | 'timer'; fired: boolean }

export interface ActionRequest {
  id: string;
  tool: ToolName;
  args: Record<string, unknown>;
  summary: string; // human readable "what will happen"
  policy: Policy;
  tainted: boolean; // requested after untrusted content entered the turn
}
export interface ActionResult { id: string; ok: boolean; summary: string; data?: unknown }

/** Coarse status shown on the character + panel */
export type AssistantPhase = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error' | 'offline';

/** Cues the main process sends to the character renderer */
export type CharacterCue =
  | { type: 'phase'; phase: AssistantPhase }
  | { type: 'react'; reaction: 'happy' | 'surprised' | 'annoyed' | 'curious' | 'wave' | 'nod' }
  | { type: 'speak'; utteranceId: string; text: string }
  | { type: 'stopSpeech' }
  | { type: 'wake' }
  | { type: 'mic'; command: 'start' | 'stop' | 'cancel' }
  | { type: 'pause'; paused: boolean }
  | { type: 'interact'; enabled: boolean }
  | { type: 'presence'; idleSec: number; quiet: boolean }
  | { type: 'remark'; text: string }
  | { type: 'connection'; state: ConnectionStatus['state'] }
  | { type: 'teleport'; phase: 'out' | 'in'; id: number; effects: boolean }
  | { type: 'clip'; name: string }
  | { type: 'surface'; surface: 'taskbar' | 'window' | 'air' | 'edge_left' | 'edge_right' }
  | { type: 'dash'; dir: -1 | 1 | 0 };

export interface ConnectionStatus {
  state: 'connecting' | 'connected' | 'disconnected' | 'error';
  provider: string;
  model?: string;
  usingFallback?: boolean;
  detail: string;
  checkedAt: number;
  latencyMs?: number;
  keySource?: 'secure-store' | 'environment' | 'none';
}

export interface Diagnostics {
  version: string;
  electron: string;
  chrome: string;
  platform: string;
  userData: string;
  gpu: { status: Record<string, string>; info?: unknown };
  safeStorage: boolean;
  fullscreenWatcher: 'active' | 'unavailable' | 'disabled';
  speechRecognizer: { available: boolean; detail: string };
  provider: { name: string; ok: boolean; detail: string; latencyMs?: number };
  connection: ConnectionStatus;
  teleport: { auto: boolean; armed: boolean; nextInSec: number | null; last: string | null; count: number; blockedReason: string | null };
  settingsRepaired: string[];
  shortcuts: Record<string, string>;
  lastCrash: string | null;
  perf: { startupMs: number; mainRssMB: number; processes: { type: string; cpu: number; memMB: number }[]; fps?: number };
  displays: { id: number; bounds: { x: number; y: number; width: number; height: number }; scaleFactor: number; primary: boolean }[];
}

export interface PanelEvents {
  'chat:delta': { messageId: string; delta: string };
  'chat:done': { message: ChatMessage };
  'chat:message': { message: ChatMessage };
  'chat:phase': { phase: AssistantPhase; detail?: string };
  'action:confirm': ActionRequest;
  'action:result': ActionResult;
  'memory:changed': null;
  'settings:changed': Settings;
  'reminder:fired': Reminder;
  'transcript': { text: string; final: boolean };
  'panel:tab': string;
  'connection:status': ConnectionStatus;
}

export interface CharacterEvents {
  'cue': CharacterCue;
  'settings:changed': Settings;
}

/** invoke() channels from either renderer to main */
export interface InvokeMap {
  'settings:get': [void, Settings];
  'settings:set': [Partial<Settings> | Record<string, unknown>, { settings: Settings; repaired: string[] }];
  'settings:reset': [void, Settings];
  'secrets:status': [void, Record<string, boolean>];
  'secrets:set': [{ key: string; value: string }, boolean];
  'secrets:delete': [string, boolean];
  'chat:send': [{ text: string; viaVoice?: boolean }, { messageId: string }];
  'chat:stop': [void, void];
  'chat:history': [{ limit?: number }, ChatMessage[]];
  'chat:clear': [void, void];
  'memory:list': [void, MemoryItem[]];
  'memory:add': [string, MemoryItem];
  'memory:approve': [string, void];
  'memory:delete': [string, void];
  'memory:clear': [void, void];
  'notes:list': [void, Note[]];
  'notes:delete': [string, void];
  'reminders:list': [void, Reminder[]];
  'reminders:cancel': [string, void];
  'action:respond': [{ id: string; approved: boolean; remember?: boolean }, void];
  'provider:test': [void, { ok: boolean; detail: string; latencyMs?: number }];
  'provider:models': [void, string[]];
  'diagnostics:get': [void, Diagnostics];
  'logs:tail': [number, string[]];
  'app:openDataFolder': [void, void];
  'app:resetAll': [void, void];
  'app:quit': [void, void];
  'app:restart': [void, void];
  'apps:pick': [void, { name: string; path: string } | null];
  'folders:pick': [void, string | null];
  'panel:open': [string | void, void];
  'panel:close': [void, void];
  'voice:ptt': ['start' | 'stop' | 'cancel', void];
  // character renderer → main
  'char:hit': [boolean, void];
  'char:drag': ['start' | 'end', void];
  'char:click': [void, void];
  'char:menu': [void, void];
  'char:speechState': [{ utteranceId: string; state: 'start' | 'end' | 'error' }, void];
  'char:audio': [{ wav: Uint8Array; durationMs: number }, void];
  'char:micError': [string, void];
  'char:fps': [number, void];
  'tts:fetch': [string, Uint8Array];
  'connection:get': [void, ConnectionStatus];
  'teleport:now': [string | void, { ok: boolean; detail: string }];
  'char:teleport': [{ id: number; phase: 'out' | 'in' }, void];
  'connection:check': [void, ConnectionStatus];
}
export type InvokeChannel = keyof InvokeMap;
export const INVOKE_CHANNELS: InvokeChannel[] = [
  'settings:get', 'settings:set', 'settings:reset', 'secrets:status', 'secrets:set', 'secrets:delete',
  'chat:send', 'chat:stop', 'chat:history', 'chat:clear', 'memory:list', 'memory:add', 'memory:approve',
  'memory:delete', 'memory:clear', 'notes:list', 'notes:delete', 'reminders:list', 'reminders:cancel',
  'action:respond', 'provider:test', 'provider:models', 'diagnostics:get', 'logs:tail', 'app:openDataFolder',
  'app:resetAll', 'app:quit', 'app:restart', 'apps:pick', 'folders:pick', 'panel:open', 'panel:close',
  'voice:ptt', 'char:hit', 'char:drag', 'char:click', 'char:menu', 'char:speechState', 'char:audio',
  'char:micError', 'char:fps', 'tts:fetch', 'connection:get', 'connection:check', 'teleport:now', 'char:teleport',
];
export const EVENT_CHANNELS = [
  'chat:delta', 'chat:done', 'chat:message', 'chat:phase', 'action:confirm', 'action:result', 'memory:changed',
  'settings:changed', 'reminder:fired', 'transcript', 'panel:tab', 'cue', 'connection:status',
] as const;

export const SECRET_KEYS = ['gemini', 'openai', 'anthropic', 'openaiVoice'] as const;
export type SecretKey = (typeof SECRET_KEYS)[number];
