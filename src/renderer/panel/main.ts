import type { ActionRequest, ActionResult, AssistantPhase, ChatMessage, ConnectionStatus, Diagnostics, MemoryItem, Note, Reminder } from '../../shared/ipc';
import { TOOL_NAMES, type Settings, type ToolName } from '../../shared/settings';
import type { CapriApi } from '../../preload/preload';
import { brandMark, icon } from './icons';

declare global { interface Window { capri: CapriApi } }
const api = window.capri;

// ---------------------------------------------------------------- tiny DOM helper (no innerHTML → no injection)
type Child = Node | string | null | undefined | false;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k in el && k !== 'list') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const c of kids) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

// ---------------------------------------------------------------- state
let S: Settings;
let secretStatus: Record<string, boolean> = {};
let phase: AssistantPhase = 'idle';
let phaseDetail = '';
let conn: ConnectionStatus | null = null;
let tab = location.hash.slice(1) || 'chat';
const TABS: { id: string; label: string; icon: string; sub: string }[] = [
  { id: 'chat', label: 'Chat', icon: 'chat', sub: 'talk to Capri' },
  { id: 'model', label: 'Model', icon: 'model', sub: 'AI connection' },
  { id: 'voice', label: 'Voice', icon: 'voice', sub: 'mic & speech' },
  { id: 'look', label: 'Look', icon: 'eye', sub: 'appearance & presence' },
  { id: 'move', label: 'Teleport', icon: 'teleport', sub: 'movement on your desktop' },
  { id: 'behavior', label: 'Behavior', icon: 'behavior', sub: 'quiet hours & startup' },
  { id: 'memory', label: 'Memory', icon: 'memory', sub: 'what she remembers' },
  { id: 'permissions', label: 'Permissions', icon: 'shield', sub: 'what she may do' },
  { id: 'privacy', label: 'Privacy', icon: 'lock', sub: 'your data' },
  { id: 'diagnostics', label: 'Diagnostics', icon: 'pulse', sub: 'health & logs' },
];
const ALIASES: Record<string, string> = { settings: 'model' };
const view = document.getElementById('view')!;

function setByPath(path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  const patch: Record<string, unknown> = {};
  let cur = patch;
  keys.forEach((k, i) => { if (i === keys.length - 1) cur[k] = value; else { cur[k] = {}; cur = cur[k] as Record<string, unknown>; } });
  return patch;
}
const getByPath = (path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], S);
async function save(path: string, value: unknown) {
  const r = await api.invoke('settings:set', setByPath(path, value));
  S = r.settings;
  if (r.repaired.length) toast(`Invalid value for ${r.repaired.join(', ')} — reset to default.`, true);
}
const timers: Record<string, number> = {};
function saveDebounced(path: string, value: unknown, ms = 400) {
  clearTimeout(timers[path]);
  timers[path] = window.setTimeout(() => void save(path, value), ms);
}

// ---------------------------------------------------------------- components
const field = (label: string, control: Node, hint?: string, wide = false) =>
  h('div', { class: `field${wide ? ' wide' : ''}` }, h('label', {}, label), control, hint ? h('div', { class: 'hint' }, hint) : null);
const toggle = (path: string, onChange?: (v: boolean) => void) =>
  h('input', { type: 'checkbox', class: 'switch', checked: !!getByPath(path), role: 'switch', 'aria-label': path, onchange: (e: Event) => { const v = (e.target as HTMLInputElement).checked; void save(path, v).then(() => onChange?.(v)); } });
function range(path: string, min: number, max: number, step: number, fmt = (v: number) => v.toFixed(2)) {
  const val = h('span', { class: 'val' }, fmt(Number(getByPath(path))));
  const input = h('input', { type: 'range', min, max, step, value: Number(getByPath(path)), 'aria-label': path,
    oninput: (e: Event) => { const v = Number((e.target as HTMLInputElement).value); val.textContent = fmt(v); saveDebounced(path, v, 120); } });
  return h('span', { class: 'row' }, input, val);
}
const select = (path: string, options: [string, string][], onChange?: (v: string) => void, coerce: (v: string) => unknown = (v) => v) => {
  const cur = String(getByPath(path));
  return h('select', { 'aria-label': path, onchange: (e: Event) => { const v = (e.target as HTMLSelectElement).value; void save(path, coerce(v)).then(() => onChange?.(v)); } },
    ...options.map(([v, l]) => h('option', { value: v, selected: v === cur }, l)));
};
const text = (path: string, placeholder = '', listId?: string) => {
  const el = h('input', { type: 'text', value: String(getByPath(path) ?? ''), placeholder, spellcheck: false, oninput: (e: Event) => saveDebounced(path, (e.target as HTMLInputElement).value.trim(), 600) });
  if (listId) el.setAttribute('list', listId);
  return el;
};
const timeIn = (path: string) => h('input', { type: 'time', value: String(getByPath(path)), onchange: (e: Event) => void save(path, (e.target as HTMLInputElement).value) });
const num = (path: string, min: number, max: number) => h('input', { type: 'number', min, max, value: Number(getByPath(path)), onchange: (e: Event) => void save(path, Number((e.target as HTMLInputElement).value)) });
const card = (title: string, ...kids: Child[]) => h('section', { class: 'card' }, h('span', { class: 'label' }, title), ...kids);
const btn = (label: string, onclick: () => unknown, cls = '', ic?: string, title?: string) =>
  h('button', { class: `btn ${cls}`, onclick, title, type: 'button' }, ic ? icon(ic) : null, label);
const note = (t: Child, kind: '' | 'warn' | 'err' = '') => h('p', { class: `note ${kind}` }, t);
function viewHead(title: string, sub?: string) { return h('div', { class: 'view-head' }, h('h1', {}, title), sub ? h('span', { class: 'sub' }, sub) : null); }

function toast(msg: string, err = false) {
  const t = h('div', { class: `toast${err ? ' err' : ''}`, role: 'status' }, msg);
  document.getElementById('toasts')!.append(t);
  setTimeout(() => t.remove(), 3800);
}

// ---------------------------------------------------------------- status chips
const phaseChip = document.getElementById('phaseChip')!;
const phaseText = document.getElementById('phaseText')!;
const connChip = document.getElementById('connChip')!;
const connText = document.getElementById('connText')!;
const PHASE_LABEL: Record<AssistantPhase, string> = { idle: 'ready', listening: 'listening', transcribing: 'transcribing', thinking: 'thinking', speaking: 'speaking', error: 'error', offline: 'offline' };
let statusEl: HTMLElement | null = null;
let stopBtn: HTMLButtonElement | null = null;
function renderPhase() {
  phaseChip.dataset.phase = phase;
  phaseText.textContent = PHASE_LABEL[phase];
  if (statusEl) {
    statusEl.textContent = phaseDetail || (phase === 'idle' ? `${providerLabel()} · Enter to send · Esc to stop` : `${PHASE_LABEL[phase]}…`);
    statusEl.className = `status statusline${phase === 'error' ? ' err' : ''}`;
  }
  if (stopBtn) stopBtn.hidden = !(phase === 'thinking' || phase === 'speaking');
}
const CONN_LABEL: Record<ConnectionStatus['state'], string> = { connecting: 'connecting', connected: 'online', disconnected: 'offline', error: 'error' };
function renderConn() {
  if (!conn) return;
  connChip.dataset.state = conn.state;
  connText.textContent = conn.provider === 'offline' ? 'no AI' : CONN_LABEL[conn.state];
  connChip.title = `${conn.provider}${conn.model ? ` · ${conn.model}` : ''}: ${conn.detail}`;
}
const providerLabel = () => ({ gemini: `Gemini · ${S.ai.gemini.model}`, offline: 'Offline command mode', ollama: `Ollama · ${S.ai.ollama.model}`, openai: `OpenAI-compatible · ${S.ai.openai.model}`, anthropic: `Anthropic · ${S.ai.anthropic.model}` })[S.ai.provider];

// ---------------------------------------------------------------- rail navigation
function renderRail() {
  const rail = document.getElementById('rail')!;
  rail.replaceChildren(...TABS.flatMap((t, i) => [
    i === 4 || i === 7 ? h('div', { class: 'sep' }) : null,
    h('button', { role: 'tab', 'aria-selected': String(t.id === tab), 'aria-label': t.label, onclick: () => go(t.id) }, icon(t.icon), h('span', { class: 'tip' }, t.label)),
  ].filter(Boolean) as Node[]));
}
function go(t: string) {
  t = ALIASES[t] ?? t;
  if (t !== 'welcome' && !TABS.some((x) => x.id === t)) t = 'chat';
  tab = t;
  renderRail();
  statusEl = null; stopBtn = null;
  view.replaceChildren();
  view.className = 'enter';
  void (RENDER[t] ?? renderChat)();
  setTimeout(() => (view.className = ''), 250);
}

// ---------------------------------------------------------------- chat
let messagesEl: HTMLElement;
let scroller: HTMLElement;
const streamBubbles = new Map<string, { el: HTMLElement; text: string }>();

function richText(content: string): Node[] {
  const out: Node[] = [];
  content.split(/```(?:[\w-]*)\n?([\s\S]*?)```/g).forEach((part, i) => {
    if (i % 2 === 1) { out.push(h('pre', {}, h('code', {}, part))); return; }
    part.split(/`([^`\n]+)`/g).forEach((seg, j) => out.push(j % 2 ? h('code', {}, seg) : document.createTextNode(seg)));
  });
  return out;
}
function msgEl(m: ChatMessage): HTMLElement {
  if (m.role === 'action') {
    const st = m.meta?.actionStatus ?? '';
    const cls = st === 'done' ? 'ok' : ['failed', 'blocked', 'rejected', 'declined'].includes(st) ? 'bad' : '';
    return h('div', { class: 'msg action' }, h('span', { class: `tag ${cls}` }, st || 'action'), h('span', {}, m.content));
  }
  const el = h('div', { class: `msg ${m.role}${m.meta?.error ? ' err' : ''}`, 'data-id': m.id },
    m.role === 'assistant' ? h('span', { class: 'who' }, 'Capri') : null, ...richText(m.content));
  if (m.meta?.interrupted) el.append(h('span', { class: 'meta' }, '— interrupted'));
  if (m.meta?.error && m.content !== m.meta.error) el.append(h('span', { class: 'meta' }, m.meta.error));
  return el;
}
const atBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 60;
const scrollDown = (force = false) => { if (scroller && (force || atBottom())) scroller.scrollTop = scroller.scrollHeight; };

const pendingConfirm = new Map<string, ActionRequest>();
function confirmCard(req: ActionRequest): HTMLElement {
  const c = h('div', { class: 'confirm', 'data-confirm': req.id });
  const respond = async (approved: boolean) => {
    pendingConfirm.delete(req.id);
    c.remove(); // the main process logs the outcome as an action message
    await api.invoke('action:respond', { id: req.id, approved });
  };
  c.append(
    h('span', { class: 'label' }, 'Capri wants to do something'),
    h('div', {}, req.summary),
    h('div', { class: 'why' }, req.tainted ? '⚠ Requested right after reading file names or notes. Make sure this is what you asked for.' : `Permission for "${req.tool}" is set to “ask first”.`),
    h('div', { class: 'row' }, btn('Allow', () => respond(true), 'primary', 'check'), btn('Deny', () => respond(false), '', 'close')),
  );
  return c;
}
let chatReady = false;
function showConfirm(req: ActionRequest) {
  if (!chatReady || !messagesEl || messagesEl.querySelector(`[data-confirm="${CSS.escape(req.id)}"]`)) return;
  messagesEl.append(confirmCard(req));
  scrollDown(true);
}

let mic = false;
async function renderChat() {
  chatReady = false;
  scroller = h('div', { class: 'scroll' });
  messagesEl = h('div', { class: 'messages', role: 'log', 'aria-live': 'polite' });
  scroller.append(messagesEl);
  const ta = h('textarea', { placeholder: 'Talk to Capri…', rows: 1, 'aria-label': 'Message' });
  const send = async (value?: string) => {
    const v = (value ?? ta.value).trim();
    if (!v) return;
    ta.value = ''; autosize();
    try { await api.invoke('chat:send', { text: v }); } catch (e) { toast((e as Error).message, true); }
  };
  const autosize = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(140, ta.scrollHeight)}px`; };
  ta.addEventListener('input', autosize);
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } });
  const micBtn = h('button', { class: 'btn icon-only', type: 'button', title: S.voice.micPermission ? 'Hold to talk (or Ctrl+Alt+T)' : 'Microphone is off — enable it in Voice', 'aria-label': 'Push to talk' }, icon('mic'));
  micBtn.disabled = !S.voice.micPermission;
  const micStart = () => { if (mic) return; mic = true; micBtn.classList.add('rec'); void api.invoke('voice:ptt', 'start'); };
  const micStop = () => { if (!mic) return; mic = false; micBtn.classList.remove('rec'); void api.invoke('voice:ptt', 'stop'); };
  micBtn.addEventListener('pointerdown', micStart);
  micBtn.addEventListener('pointerup', micStop);
  micBtn.addEventListener('pointerleave', micStop);
  micBtn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); mic ? micStop() : micStart(); } });
  stopBtn = h('button', { class: 'btn icon-only', type: 'button', title: 'Stop (Esc)', 'aria-label': 'Stop', onclick: () => api.invoke('chat:stop') }, icon('stop'));
  const sendBtn = h('button', { class: 'btn primary icon-only', type: 'button', title: 'Send (Enter)', 'aria-label': 'Send', onclick: () => send() }, icon('send'));
  statusEl = h('div', { class: 'status statusline' });
  view.append(h('div', { class: 'chat' }, scroller, statusEl, h('div', { class: 'composer' }, ta, micBtn, stopBtn, sendBtn)));

  const hist = await api.invoke('chat:history', { limit: 200 });
  if (!hist.length) {
    messagesEl.append(h('div', { class: 'empty' }, brandMark(), h('div', {}, 'Say something. She’s listening.'),
      h('div', { class: 'try' }, ...['Who are you?', 'timer 5 minutes', 'teleport', 'come here'].map((q) => h('button', { type: 'button', onclick: () => send(q) }, q)))));
  }
  const shownIds = new Set(hist.map((m) => m.id));
  const early = [...messagesEl.children].filter((el) => !shownIds.has((el as HTMLElement).dataset.id ?? ''));
  messagesEl.replaceChildren(...hist.map(msgEl), ...early);
  for (const [id, b] of streamBubbles) if (!shownIds.has(id)) messagesEl.append(b.el);
  chatReady = true;
  for (const req of pendingConfirm.values()) showConfirm(req);
  renderPhase();
  scrollDown(true);
  ta.focus();
}

api.on('chat:message', (p) => {
  const { message } = p as { message: ChatMessage };
  if (tab !== 'chat' || !messagesEl) return;
  messagesEl.querySelector('.empty')?.remove();
  messagesEl.append(msgEl(message));
  scrollDown(message.role === 'user');
});
api.on('chat:delta', (p) => {
  const { messageId, delta } = p as { messageId: string; delta: string };
  if (tab !== 'chat' || !messagesEl) return;
  let b = streamBubbles.get(messageId);
  if (!b) {
    const el = h('div', { class: 'msg assistant cursor', 'data-id': messageId });
    messagesEl.append(el);
    b = { el, text: '' };
    streamBubbles.set(messageId, b);
  }
  b.text += delta;
  b.el.replaceChildren(h('span', { class: 'who' }, 'Capri'), b.text);
  scrollDown();
});
api.on('chat:done', (p) => {
  const { message } = p as { message: ChatMessage };
  const b = streamBubbles.get(message.id);
  streamBubbles.delete(message.id);
  if (tab !== 'chat' || !messagesEl) return;
  const fresh = msgEl(message);
  if (b) { if (message.content) b.el.replaceWith(fresh); else b.el.remove(); }
  else if (message.content) messagesEl.append(fresh);
  scrollDown();
});
api.on('chat:phase', (p) => { const x = p as { phase: AssistantPhase; detail?: string }; phase = x.phase; phaseDetail = x.detail ?? ''; renderPhase(); });
api.on('connection:status', (c) => { conn = c as ConnectionStatus; renderConn(); if (tab === 'model') refreshConnCard(); });
api.on('action:confirm', (p) => {
  const req = p as ActionRequest;
  pendingConfirm.set(req.id, req);
  if (tab !== 'chat') go('chat'); else showConfirm(req);
  window.focus();
});
api.on('action:result', (p) => { const r = p as ActionResult; if (!r.ok) toast(r.summary, true); });
api.on('transcript', (p) => { const t = p as { text: string }; if (t.text) toast(`Heard: “${t.text}”`); });
api.on('reminder:fired', (p) => { const r = p as Reminder; toast(`⏰ ${r.text}`); });
api.on('settings:changed', (s) => { S = s as Settings; if (tab === 'chat') renderPhase(); });
api.on('panel:tab', (t) => { const target = ALIASES[String(t)] ?? String(t); if (target !== tab) go(target); });
api.on('memory:changed', () => { if (tab === 'memory') go('memory'); });

// ---------------------------------------------------------------- model
let connCardBody: HTMLElement | null = null;
function refreshConnCard() {
  if (!connCardBody || !conn) return;
  const tone = conn.state === 'connected' ? 'ok' : conn.state === 'error' ? 'bad' : conn.state === 'connecting' ? 'info' : '';
  connCardBody.replaceChildren(h('dl', { class: 'kv' },
    h('dt', {}, 'Status'), h('dd', {}, h('span', { class: `tag ${tone}` }, conn.state)),
    h('dt', {}, 'Provider'), h('dd', {}, conn.provider),
    conn.model ? h('dt', {}, 'Model') : null, conn.model ? h('dd', {}, `${conn.model}${conn.usingFallback ? ' (fallback)' : ''}`) : null,
    h('dt', {}, 'Detail'), h('dd', {}, conn.detail),
    conn.provider === 'gemini' ? h('dt', {}, 'Key source') : null,
    conn.provider === 'gemini' ? h('dd', {}, conn.keySource === 'secure-store' ? 'saved in Capri (Windows DPAPI)' : conn.keySource === 'environment' ? 'GEMINI_API_KEY (local environment / .env.local)' : 'none') : null,
    h('dt', {}, 'Checked'), h('dd', {}, conn.checkedAt ? new Date(conn.checkedAt).toLocaleTimeString() : '—')));
}
async function renderModel() {
  secretStatus = await api.invoke('secrets:status');
  conn = await api.invoke('connection:get');
  const persistent = (secretStatus as Record<string, boolean>)._persistent;
  const sc = h('div', { class: 'scroll' });
  const result = h('div', { class: 'hint' });
  const datalist = h('datalist', { id: 'models' });
  const keyField = (key: 'gemini' | 'openai' | 'anthropic' | 'openaiVoice', label: string) => {
    const input = h('input', { type: 'password', placeholder: secretStatus[key] ? '•••••••• (stored)' : 'paste API key', autocomplete: 'off', spellcheck: false });
    return field(label, h('span', { class: 'row' }, input,
      btn('Save', async () => { if (!input.value.trim()) return; try { await api.invoke('secrets:set', { key, value: input.value.trim() }); input.value = ''; toast('Key saved securely'); go('model'); } catch (e) { result.textContent = (e as Error).message; } }),
      secretStatus[key] ? btn('Remove', async () => { await api.invoke('secrets:delete', key); go(tab); }, 'danger') : null),
      persistent ? 'Encrypted with Windows DPAPI (your account only). Never logged, never sent to the interface.' : 'OS encryption unavailable — key kept in memory for this session only.', true);
  };
  connCardBody = h('div', {});
  refreshConnCard();
  const prov = S.ai.provider;
  sc.append(
    card('Connection', connCardBody, h('div', { class: 'row', style: 'margin-top:10px' },
      btn('Check now', async () => { conn = await api.invoke('connection:check'); renderConn(); refreshConnCard(); }, '', 'refresh'),
      btn('Test & list models', async () => { result.textContent = 'Testing…'; const r = await api.invoke('provider:test'); result.textContent = `${r.ok ? '✔' : '✖'} ${r.detail}${r.latencyMs !== undefined ? ` (${r.latencyMs} ms)` : ''}`; const list = await api.invoke('provider:models'); datalist.replaceChildren(...list.map((m) => h('option', { value: m }))); }),
    ), result, datalist),
    card('Brain',
      field('Provider', select('ai.provider', [['gemini', 'Google Gemini'], ['ollama', 'Ollama (local)'], ['openai', 'OpenAI-compatible'], ['anthropic', 'Anthropic'], ['offline', 'Offline commands (no AI)']], () => go('model'))),
      prov === 'gemini' ? h('div', {},
        note('Default gemini-3.5-flash-lite: Google’s current low-latency stable Flash-Lite model (verified against ai.google.dev, Oct 2026). Conversations are sent with store=false.'),
        field('Model', text('ai.gemini.model', 'gemini-3.5-flash-lite', 'models')),
        field('Fallback model', text('ai.gemini.fallbackModel', 'gemini-3.1-flash-lite', 'models'), 'Used only if the main model is unavailable or overloaded. Empty = none.'),
        field('Thinking', select('ai.gemini.thinkingLevel', [['minimal', 'Minimal (fastest)'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']]), 'Some models reject “minimal”.'),
        keyField('gemini', 'Gemini API key')) : null,
      prov === 'offline' ? note('No AI: direct commands only (timers, reminders, notes, opening sites/apps, file search, teleport). Autonomous teleport needs a live AI connection.') : null,
      prov === 'ollama' ? h('div', {}, note('Install Ollama (ollama.com), then run “ollama pull llama3.2”. Everything stays on this PC.'),
        field('Server URL', text('ai.ollama.baseUrl')), field('Model', text('ai.ollama.model', 'llama3.2', 'models'))) : null,
      prov === 'openai' ? h('div', {}, note('OpenAI, OpenRouter, LM Studio, llama.cpp server… Local servers need no key.'),
        field('Base URL', text('ai.openai.baseUrl')), field('Model', text('ai.openai.model', 'gpt-4o-mini', 'models')), keyField('openai', 'API key')) : null,
      prov === 'anthropic' ? h('div', {}, field('Base URL', text('ai.anthropic.baseUrl')), field('Model', text('ai.anthropic.model', 'claude-haiku-5-5', 'models')), keyField('anthropic', 'API key')) : null,
    ),
    card('Generation',
      field('Reply length', select('ai.responseLength', [['short', 'Short'], ['medium', 'Medium'], ['long', 'Long']])),
      field('Creativity', range('ai.temperature', 0, 1.5, 0.05), 'Ignored by Gemini 3.6+ models (they manage their own sampling).'),
      field('Max tokens', num('ai.maxTokens', 32, 8192)),
      field('Context turns', num('ai.historyTurns', 0, 100), 'Recent exchanges sent with each message.'),
      field('Timeout (s)', num('ai.requestTimeoutSec', 5, 600))),
  );
  view.append(viewHead('Model', 'AI connection'), sc);
}

// ---------------------------------------------------------------- voice
async function renderVoice() {
  secretStatus = await api.invoke('secrets:status');
  const sc = h('div', { class: 'scroll' });
  const voiceSel = h('select', { 'aria-label': 'System voice', onchange: (e: Event) => void save('voice.systemVoice', (e.target as HTMLSelectElement).value) });
  const fillVoices = () => {
    const vs = speechSynthesis.getVoices();
    voiceSel.replaceChildren(h('option', { value: '' }, 'Automatic (English female if available)'), ...vs.map((v) => h('option', { value: v.name, selected: v.name === S.voice.systemVoice }, `${v.name} (${v.lang})`)));
  };
  fillVoices();
  speechSynthesis.onvoiceschanged = fillVoices;
  const testVoice = () => {
    const u = new SpeechSynthesisUtterance('Hey choom. This is my substitute voice.');
    const v = speechSynthesis.getVoices().find((x) => x.name === S.voice.systemVoice);
    if (v) u.voice = v;
    u.rate = S.voice.rate; u.pitch = S.voice.pitch; u.volume = S.voice.volume;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  };
  const keyIn = h('input', { type: 'password', placeholder: secretStatus.openaiVoice ? '•••••••• (stored)' : 'optional — falls back to the Model key', autocomplete: 'off' });
  sc.append(
    note('Capri’s official voice (Brittany Lauda / Aoi Koga) isn’t licensed for this app. She speaks with a clearly substitute synthetic voice.', 'warn'),
    card('Microphone',
      field('Allow microphone', toggle('voice.micPermission', () => go('voice')), 'Off by default. Audio is captured only while you hold push-to-talk (Ctrl+Alt+T) or after the wake word. A green ring and mic badge show on Capri while it’s live. Recordings are deleted right after transcription.'),
      field('Speech-to-text', select('voice.sttEngine', [['windows', 'Windows (offline, on-device)'], ['openai', 'Whisper-compatible endpoint']], () => go('voice'))),
      S.voice.sttEngine === 'openai' ? h('div', {}, field('STT base URL', text('voice.openaiStt.baseUrl')), field('STT model', text('voice.openaiStt.model')), note('Audio clips are uploaded to this endpoint for transcription.')) : null,
      field('Wake word “Hey Capri”', toggle('voice.wakeWord'), S.voice.micPermission ? 'Listens continuously on-device (Windows recognizer). Audio never leaves this PC. Expect occasional false triggers.' : 'Requires microphone permission.'),
    ),
    card('Speech',
      field('Speak replies', toggle('voice.ttsEnabled')),
      field('Engine', select('voice.ttsEngine', [['system', 'Windows voices (offline)'], ['openai', 'OpenAI-compatible TTS endpoint']], () => go('voice'))),
      S.voice.ttsEngine === 'system' ? field('Voice', h('span', { class: 'row' }, voiceSel, btn('Test', testVoice))) : h('div', {},
        field('TTS base URL', text('voice.openaiTts.baseUrl')), field('TTS model', text('voice.openaiTts.model')), field('TTS voice', text('voice.openaiTts.voice')),
        note('Reply text is sent to this endpoint for synthesis. Falls back to Windows voices if it fails.')),
      field('Rate', range('voice.rate', 0.5, 2, 0.05)),
      field('Pitch', range('voice.pitch', 0, 2, 0.05)),
      field('Volume', range('voice.volume', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`)),
    ),
    (S.voice.ttsEngine === 'openai' || S.voice.sttEngine === 'openai') ? card('Voice API key',
      field('Key', h('span', { class: 'row' }, keyIn, btn('Save', async () => { if (keyIn.value.trim()) { await api.invoke('secrets:set', { key: 'openaiVoice', value: keyIn.value.trim() }); go('voice'); } }),
        secretStatus.openaiVoice ? btn('Remove', async () => { await api.invoke('secrets:delete', 'openaiVoice'); go('voice'); }, 'danger') : null), undefined, true)) : '',
  );
  view.append(viewHead('Voice', 'mic & speech'), sc);
}

// ---------------------------------------------------------------- look
function renderLook() {
  const sc = h('div', { class: 'scroll' });
  sc.append(
    card('Appearance',
      field('Size', range('character.scale', 0.4, 2.5, 0.05, (v) => `${Math.round(v * 100)}%`)),
      field('Opacity', range('character.opacity', 0.2, 1, 0.05, (v) => `${Math.round(v * 100)}%`)),
      field('Animation intensity', range('character.animationIntensity', 0, 1.5, 0.05, (v) => `${Math.round(v * 100)}%`), '0% = nearly still. Lower values also reduce CPU/GPU use.'),
      field('Max frame rate', select('character.fpsCap', [['15', '15 fps'], ['30', '30 fps'], ['60', '60 fps'], ['120', '120 fps']], undefined, Number), 'She drops to ≤30 fps idle, 15 fps asleep, and stops rendering when hidden.'),
      field('Glitch effects', toggle('character.glitchEffects'))),
    card('Desktop presence',
      field('Always on top', toggle('character.alwaysOnTop')),
      field('Click-through', toggle('character.clickThrough'), 'Clicks pass through her. Press Ctrl+Alt+C to interact for 15 seconds.'),
      field('Hide during fullscreen apps', toggle('character.hideOnFullscreen'), 'Games, videos and presentations.'),
      h('div', { class: 'row', style: 'margin-top:8px' }, btn('Reset position', () => save('character.position', null)))),
    note('Original vector reconstruction from official Edgerunners 2 frames and the Netflix clip “The Moment D Meets Capri” — not studio assets. See docs/REFERENCE_BOARD.md.'),
  );
  view.append(viewHead('Look', 'appearance & presence'), sc);
}

// ---------------------------------------------------------------- teleport
async function renderMove() {
  const d = await api.invoke('diagnostics:get');
  const sc = h('div', { class: 'scroll' });
  const t = d.teleport;
  const go1 = (where: string, label: string, ic = 'teleport') => btn(label, async () => { const r = await api.invoke('teleport:now', where); toast(r.detail, !r.ok); }, '', ic);
  sc.append(
    card('Teleport now', h('div', { class: 'row' }, go1('auto', 'Anywhere'), go1('near_cursor', 'Beside cursor'), go1('corner', 'Corner'), go1('other_monitor', 'Other monitor')),
      h('div', { class: 'hint', style: 'margin-top:8px' }, 'Shortcut Ctrl+Alt+P. Manual teleport works with or without an AI connection.')),
    card('Autonomous teleport',
      field('Teleport on her own', toggle('teleport.auto'), 'Only while the AI connection is live, never during a conversation, while you’re away, in DND/quiet hours, or over fullscreen apps.'),
      field('Every (min, from)', num('teleport.minMinutes', 1, 240)),
      field('Every (min, to)', num('teleport.maxMinutes', 1, 480)),
      field('Avoid the active window', toggle('teleport.avoidActiveWindow'), 'Prefers spots that don’t cover the app you’re using.'),
      field('Effects', toggle('teleport.effects'), 'Chromatic split, scanline collapse and shard burst. Off = instant move.'),
      h('dl', { class: 'kv', style: 'margin-top:8px' },
        h('dt', {}, 'Status'), h('dd', {}, t.auto ? (t.armed ? h('span', { class: 'tag ok' }, 'armed') : h('span', { class: 'tag' }, 'waiting')) : h('span', { class: 'tag' }, 'off')),
        h('dt', {}, 'Next attempt'), h('dd', {}, t.nextInSec !== null ? `in ${Math.ceil(t.nextInSec / 60)} min` : '—'),
        h('dt', {}, 'Held back by'), h('dd', {}, t.blockedReason ?? 'nothing'),
        h('dt', {}, 'Teleports'), h('dd', {}, `${t.count}${t.last ? ` · last ${t.last}` : ''}`))),
  );
  view.append(viewHead('Teleport', 'movement on your desktop'), sc);
}

// ---------------------------------------------------------------- behavior
function renderBehavior() {
  const sc = h('div', { class: 'scroll' });
  sc.append(
    card('Presence',
      field('Do not disturb', toggle('behavior.doNotDisturb'), 'She stays quiet and still unless you talk to her. Reminders still notify silently.'),
      field('Idle remarks', toggle('behavior.idleRemarks'), 'Occasional short lines when you’re around. Off by default.'),
      field('Remark interval (min)', num('behavior.remarkIntervalMinutes', 5, 480)),
      field('Sleep after idle (min)', num('behavior.sleepAfterMinutes', 1, 240))),
    card('Quiet hours', field('Enabled', toggle('behavior.quietHours.enabled')), field('From', timeIn('behavior.quietHours.start')), field('Until', timeIn('behavior.quietHours.end'))),
    card('Notifications & startup',
      field('Reminder notifications', toggle('notifications.reminders')),
      field('Notification sound', toggle('notifications.sound')),
      field('Launch at sign-in', toggle('startup.launchOnLogin'), 'Off by default. Applies to the installed app only.')),
    card('Keyboard shortcuts',
      ...([['Ctrl+Alt+Space', 'Open chat (brings her to your cursor)'], ['Ctrl+Alt+T', 'Push-to-talk'], ['Ctrl+Alt+P', 'Teleport'], ['Ctrl+Alt+X', 'Stop talking / cancel'], ['Ctrl+Alt+H', 'Hide / show'], ['Ctrl+Alt+C', 'Interact while click-through is on'], ['Esc', 'Stop reply / close panel']] as const)
        .map(([k, d]) => h('div', { class: 'field' }, h('span', {}, d), h('span', { class: 'kbd' }, k))),
      h('div', { class: 'hint' }, 'If another app owns a combo, Capri uses a fallback — see Diagnostics.')),
  );
  view.append(viewHead('Behavior', 'quiet hours & startup'), sc);
}

// ---------------------------------------------------------------- memory
async function renderMemory() {
  const [mem, notes, rems] = await Promise.all([api.invoke('memory:list'), api.invoke('notes:list'), api.invoke('reminders:list')]);
  const sc = h('div', { class: 'scroll' });
  const add = h('input', { type: 'text', class: 'input', placeholder: 'Add something Capri should remember about you…', maxLength: 300, style: 'flex:1;max-width:none' });
  const memItem = (m: MemoryItem) => h('div', { class: 'item' },
    h('div', { class: 'txt' }, m.text, h('div', { class: 'sub' }, `${m.source === 'model' ? 'suggested by Capri' : 'added by you'} · ${new Date(m.createdAt).toLocaleDateString()}`)),
    m.status === 'pending' ? h('span', { class: 'tag' }, 'pending') : null,
    m.status === 'pending' ? btn('Approve', () => api.invoke('memory:approve', m.id).then(() => go('memory')), 'primary') : null,
    btn('Delete', () => api.invoke('memory:delete', m.id).then(() => go('memory')), 'danger'));
  const pending = mem.filter((m) => m.status === 'pending');
  sc.append(
    card('Long-term memory',
      field('Use memory in conversations', toggle('memory.enabled'), 'Only approved items are ever sent to the model.'),
      pending.length ? note(`${pending.length} suggestion(s) waiting for your approval.`, 'warn') : null,
      h('div', { class: 'list' }, ...mem.map(memItem), mem.length ? null : h('div', { class: 'hint' }, 'Nothing remembered yet.')),
      h('div', { class: 'row', style: 'margin-top:10px' }, add,
        btn('Add', async () => { if (add.value.trim()) { try { await api.invoke('memory:add', add.value.trim()); go('memory'); } catch (e) { toast((e as Error).message, true); } } }, '', 'plus'),
        mem.length ? btn('Forget everything', async () => { if (confirm('Delete all memories?')) { await api.invoke('memory:clear'); go('memory'); } }, 'danger') : null)),
    card('Conversation history',
      field('Save history', toggle('privacy.saveHistory'), 'Off = conversations are kept in memory only until Capri quits.'),
      field('Keep for (days, 0 = forever)', num('memory.historyRetentionDays', 0, 3650)),
      h('div', { class: 'row' }, btn('Clear history', async () => { if (confirm('Delete all conversation history?')) { await api.invoke('chat:clear'); toast('History cleared'); } }, 'danger', 'trash'))),
    card(`Notes (${notes.length})`, h('div', { class: 'list' }, ...notes.map((n: Note) => h('div', { class: 'item' },
      h('div', { class: 'txt' }, h('b', {}, n.title), h('div', { class: 'sub' }, n.body.slice(0, 300))),
      btn('Delete', () => api.invoke('notes:delete', n.id).then(() => go('memory')), 'danger'))), notes.length ? null : h('div', { class: 'hint' }, 'Say “note: …” to save one.'))),
    card('Timers & reminders', h('div', { class: 'list' }, ...rems.map((r: Reminder) => h('div', { class: 'item' },
      h('div', { class: 'txt' }, r.text, h('div', { class: 'sub' }, `${r.kind} · ${new Date(r.dueAt).toLocaleString()}`)),
      r.fired ? h('span', { class: 'tag ok' }, 'done') : btn('Cancel', () => api.invoke('reminders:cancel', r.id).then(() => go('memory')), 'danger'))), rems.length ? null : h('div', { class: 'hint' }, 'None.'))),
  );
  view.append(viewHead('Memory', 'what she remembers'), sc);
}

// ---------------------------------------------------------------- permissions
const TOOL_INFO: Record<ToolName, string> = {
  open_url: 'Open web pages (http/https only)', launch_app: 'Launch apps from your approved list', search_files: 'Search file names in authorized folders',
  create_note: 'Save notes', list_notes: 'Read your notes', set_reminder: 'Set reminders', start_timer: 'Start timers', cancel_timer: 'Cancel timers/reminders',
  get_time: 'Check the time', remember: 'Save facts to long-term memory', teleport: 'Teleport herself on request', emote: 'Express herself (gestures/expressions)',
};
function renderPermissions() {
  const sc = h('div', { class: 'scroll' });
  const pol = (t: ToolName) => select(`actions.policies.${t}`, [['allow', 'Allow'], ['confirm', 'Ask first'], ['deny', 'Never']]);
  sc.append(
    note('Capri can only use these actions — no shell, no arbitrary commands. Anything consequential requested right after she reads file names or notes always asks first.'),
    card('Actions', ...TOOL_NAMES.map((t) => field(TOOL_INFO[t], pol(t)))),
    card('Approved applications',
      h('div', { class: 'list' }, ...S.actions.approvedApps.map((a, i) => h('div', { class: 'item' }, h('div', { class: 'txt' }, a.name, h('div', { class: 'sub' }, a.path)),
        btn('Remove', () => save('actions.approvedApps', S.actions.approvedApps.filter((_, j) => j !== i)).then(() => go('permissions')), 'danger'))),
        S.actions.approvedApps.length ? null : h('div', { class: 'hint' }, 'None yet. Capri can only launch apps you add here.')),
      h('div', { class: 'row', style: 'margin-top:10px' }, btn('Add application', async () => {
        const a = await api.invoke('apps:pick');
        if (a) { await save('actions.approvedApps', [...S.actions.approvedApps, a]); go('permissions'); }
      }, '', 'plus'))),
    card('Search folders',
      h('div', { class: 'list' }, ...S.actions.searchRoots.map((r, i) => h('div', { class: 'item' }, h('div', { class: 'txt' }, r),
        btn('Remove', () => save('actions.searchRoots', S.actions.searchRoots.filter((_, j) => j !== i)).then(() => go('permissions')), 'danger'))),
        S.actions.searchRoots.length ? null : h('div', { class: 'hint' }, 'No folders authorized. File search is disabled until you add one.')),
      h('div', { class: 'row', style: 'margin-top:10px' }, btn('Add folder', async () => {
        const f = await api.invoke('folders:pick');
        if (f && !S.actions.searchRoots.includes(f)) { await save('actions.searchRoots', [...S.actions.searchRoots, f]); go('permissions'); }
      }, '', 'folder'))),
  );
  view.append(viewHead('Permissions', 'what she may do'), sc);
}

// ---------------------------------------------------------------- privacy
async function renderPrivacy() {
  const d = await api.invoke('diagnostics:get');
  const sc = h('div', { class: 'scroll' });
  sc.append(
    card('Your data',
      h('dl', { class: 'kv' },
        h('dt', {}, 'Stored in'), h('dd', { class: 'mono' }, d.userData),
        h('dt', {}, 'API keys'), h('dd', {}, d.safeStorage ? 'secrets.bin (DPAPI-encrypted)' : 'memory only (encryption unavailable)'),
        h('dt', {}, 'Conversation'), h('dd', {}, S.privacy.saveHistory ? `history.jsonl (kept ${S.memory.historyRetentionDays || '∞'} days)` : 'not saved'),
        h('dt', {}, 'Memory / notes'), h('dd', {}, 'memory.json, notes.json, reminders.json'),
        h('dt', {}, 'Logs'), h('dd', {}, 'logs/capri.log (keys & message text redacted, 3 × 2 MB max)'),
        h('dt', {}, 'Audio'), h('dd', {}, 'never stored; temp clips deleted after transcription'),
        h('dt', {}, 'Gemini'), h('dd', {}, 'requests sent with store=false (not kept for later retrieval)'),
        h('dt', {}, 'Telemetry'), h('dd', {}, 'none')),
      h('div', { class: 'row', style: 'margin-top:10px' }, btn('Open data folder', () => api.invoke('app:openDataFolder'), '', 'folder'))),
    card('Logging', field('Log level', select('privacy.logLevel', [['error', 'Errors only'], ['warn', 'Warnings'], ['info', 'Normal'], ['debug', 'Debug']]))),
    card('Reset', h('p', { class: 'hint' }, 'Deletes settings, saved API keys, history, memory, notes and reminders, then restarts Capri.'),
      btn('Delete all data & reset', async () => {
        if (confirm('Delete ALL Capri data (settings, keys, history, memory, notes)? This cannot be undone.') && confirm('Really delete everything?')) await api.invoke('app:resetAll');
      }, 'danger', 'trash')),
  );
  view.append(viewHead('Privacy', 'your data'), sc);
}

// ---------------------------------------------------------------- diagnostics
async function renderDiagnostics() {
  const sc = h('div', { class: 'scroll' }, h('div', { class: 'hint' }, 'Running checks…'));
  view.append(viewHead('Diagnostics', 'health & logs'), sc);
  let d: Diagnostics;
  try { d = await api.invoke('diagnostics:get'); } catch (e) { sc.replaceChildren(note(`Diagnostics failed: ${(e as Error).message}`, 'err')); return; }
  const ok = (b: boolean, t: string) => h('span', {}, h('span', { class: `tag ${b ? 'ok' : 'bad'}` }, b ? 'ok' : 'issue'), ' ', t);
  const gpu = Object.entries(d.gpu.status).filter(([k]) => /2d_canvas|gpu_compositing|webgl$/.test(k)).map(([k, v]) => `${k}: ${v}`).join(', ');
  const logs = h('div', { class: 'logs' });
  const loadLogs = async () => { logs.textContent = (await api.invoke('logs:tail', 200)).join('\n'); logs.scrollTop = logs.scrollHeight; };
  sc.replaceChildren(
    card('Health', h('dl', { class: 'kv' },
      h('dt', {}, 'AI connection'), h('dd', {}, ok(d.connection.state === 'connected', `${d.connection.state} — ${d.connection.detail}`)),
      h('dt', {}, 'Model check'), h('dd', {}, ok(d.provider.ok, `${d.provider.name}: ${d.provider.detail}`)),
      h('dt', {}, 'Speech recognizer'), h('dd', {}, ok(d.speechRecognizer.available, d.speechRecognizer.detail)),
      h('dt', {}, 'Credential store'), h('dd', {}, ok(d.safeStorage, d.safeStorage ? 'Windows DPAPI available' : 'unavailable — keys kept in memory only')),
      h('dt', {}, 'Fullscreen detection'), h('dd', {}, ok(d.fullscreenWatcher !== 'unavailable', d.fullscreenWatcher)),
      h('dt', {}, 'Teleport'), h('dd', {}, `${d.teleport.auto ? (d.teleport.armed ? 'auto armed' : `auto waiting (${d.teleport.blockedReason ?? '—'})`) : 'auto off'} · ${d.teleport.count} so far`),
      h('dt', {}, 'GPU'), h('dd', {}, gpu || 'unknown'),
      h('dt', {}, 'Shortcuts'), h('dd', {}, Object.entries(d.shortcuts).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'disabled'),
      h('dt', {}, 'Settings repaired'), h('dd', {}, d.settingsRepaired.length ? d.settingsRepaired.join(', ') : 'none'),
      h('dt', {}, 'Last unclean exit'), h('dd', {}, d.lastCrash ?? 'none'))),
    card('Performance', h('dl', { class: 'kv' },
      h('dt', {}, 'Startup'), h('dd', {}, `${d.perf.startupMs} ms to character visible`),
      h('dt', {}, 'Character fps'), h('dd', {}, String(d.perf.fps ?? '—')),
      h('dt', {}, 'Main process RSS'), h('dd', {}, `${d.perf.mainRssMB} MB`),
      ...d.perf.processes.flatMap((p) => [h('dt', {}, p.type), h('dd', {}, `${p.memMB} MB · ${p.cpu}% CPU`)]))),
    card('System', h('dl', { class: 'kv' },
      h('dt', {}, 'Version'), h('dd', {}, `Capri ${d.version} · Electron ${d.electron} · Chromium ${d.chrome}`),
      h('dt', {}, 'Platform'), h('dd', {}, d.platform),
      ...d.displays.flatMap((x, i) => [h('dt', {}, `Display ${i + 1}${x.primary ? ' ★' : ''}`), h('dd', {}, `${x.bounds.width}×${x.bounds.height} @ ${Math.round(x.scaleFactor * 100)}%`)]))),
    card('Logs', logs, h('div', { class: 'row', style: 'margin-top:10px' },
      btn('Refresh', loadLogs, '', 'refresh'), btn('Copy', () => navigator.clipboard.writeText(logs.textContent ?? '').then(() => toast('Logs copied'))),
      btn('Restart Capri', () => api.invoke('app:restart')), btn('Quit Capri', () => api.invoke('app:quit'), 'danger'))),
  );
  void loadLogs();
}

// ---------------------------------------------------------------- first run
function renderWelcome() {
  const finish = async (provider?: string) => {
    if (provider) await save('ai.provider', provider);
    await save('firstRunComplete', true);
    go(provider && provider !== 'offline' && provider !== 'gemini' ? 'model' : 'chat');
  };
  const choice = (title: string, sub: string, provider: string) => h('div', { class: 'choice', role: 'button', tabIndex: 0, onclick: () => finish(provider), onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') void finish(provider); } },
    h('b', {}, title), h('span', { class: 'btn ghost' }, 'Use'), h('span', { class: 'sub' }, sub));
  view.append(
    h('div', { class: 'hero' }, brandMark(), h('h2', {}, 'Hey, ', h('em', {}, 'choom'), '.'),
      h('p', {}, 'I’m Capri — a fan-made version of me, living on your desktop. Drag me anywhere, double-click to chat, right-click for options. I teleport around when my AI link is up.')),
    h('div', { class: 'scroll' },
      note('Unofficial fan project. The art is an original reconstruction from official Edgerunners 2 footage, and the voice is a substitute — neither comes from CD PROJEKT, Studio Trigger or Netflix.', 'warn'),
      card('Pick a brain',
        choice('Google Gemini', 'Fast, conversational. Needs a Gemini API key (free tier available).', 'gemini'),
        choice('Ollama (local, free)', 'Fully on your PC. Needs Ollama installed.', 'ollama'),
        choice('OpenAI-compatible / Anthropic', 'Bring your own key or local server.', 'openai'),
        choice('No AI — offline commands', 'Timers, reminders, notes, sites, apps, teleport. No internet.', 'offline')),
      card('Good to know', h('div', { class: 'hint' }, 'Microphone stays off until you enable it in Voice. She never runs shell commands; risky actions ask first. ',
        h('span', { class: 'kbd' }, 'Ctrl+Alt+Space'), ' chat · ', h('span', { class: 'kbd' }, 'Ctrl+Alt+T'), ' talk · ', h('span', { class: 'kbd' }, 'Ctrl+Alt+P'), ' teleport'))),
  );
}

const RENDER: Record<string, () => unknown> = {
  chat: renderChat, model: renderModel, voice: renderVoice, look: renderLook, move: renderMove, behavior: renderBehavior,
  memory: renderMemory, permissions: renderPermissions, privacy: renderPrivacy, diagnostics: renderDiagnostics, welcome: renderWelcome,
};

// ---------------------------------------------------------------- boot
document.getElementById('wordmark')!.prepend(brandMark());
document.getElementById('closeBtn')!.append(icon('close'));
document.getElementById('closeBtn')!.addEventListener('click', () => api.invoke('panel:close'));
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (phase === 'thinking' || phase === 'speaking') void api.invoke('chat:stop');
  else void api.invoke('panel:close');
});
(async () => {
  S = await api.invoke('settings:get');
  conn = await api.invoke('connection:get');
  renderConn();
  renderPhase();
  if (!S.firstRunComplete && tab !== 'welcome') tab = 'welcome';
  go(tab);
})();
