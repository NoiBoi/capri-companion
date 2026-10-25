import type { ActionRequest, ActionResult, AssistantPhase, ChatMessage, ConnectionStatus, Diagnostics, MemoryItem, Note, Reminder } from '../../shared/ipc';
import { TOOL_NAMES, type Settings, type ToolName } from '../../shared/settings';
import type { CapriApi } from '../../preload/preload';
import { icon } from './icons';

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
const TABS: { id: string; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'model', label: 'Model', icon: 'model' },
  { id: 'voice', label: 'Voice', icon: 'voice' },
  { id: 'character', label: 'Character', icon: 'eye' },
  { id: 'memory', label: 'Memory', icon: 'memory' },
  { id: 'privacy', label: 'Privacy', icon: 'shield' },
  { id: 'system', label: 'System', icon: 'pulse' },
];
// older entry points (tray menu, shortcuts, tests) still land somewhere sensible
const ALIASES: Record<string, string> = { settings: 'model', look: 'character', move: 'character', behavior: 'character', permissions: 'privacy', diagnostics: 'system' };
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
  if (r.repaired.length) toast(`Invalid value for ${r.repaired.join(', ')}; reset to default.`, true);
}
const timers: Record<string, number> = {};
function saveDebounced(path: string, value: unknown, ms = 400) {
  clearTimeout(timers[path]);
  timers[path] = window.setTimeout(() => void save(path, value), ms);
}

// ---------------------------------------------------------------- components
const field = (label: string, control: Node, hint?: string, wide = false) =>
  h('div', { class: `field${wide ? ' wide' : ''}` }, h('label', {}, label), h('div', { class: 'control' }, control), hint ? h('div', { class: 'hint' }, hint) : null);
const toggle = (path: string, label: string, onChange?: (v: boolean) => void) =>
  h('input', { type: 'checkbox', class: 'switch', checked: !!getByPath(path), role: 'switch', 'aria-label': label, onchange: (e: Event) => { const v = (e.target as HTMLInputElement).checked; void save(path, v).then(() => onChange?.(v)); } });
const sw = (label: string, path: string, onChange?: (v: boolean) => void) => field(label, toggle(path, label, onChange));
function range(path: string, label: string, min: number, max: number, step: number, fmt = (v: number) => v.toFixed(2)) {
  const val = h('span', { class: 'val' }, fmt(Number(getByPath(path))));
  const input = h('input', { type: 'range', min, max, step, value: Number(getByPath(path)), 'aria-label': label,
    oninput: (e: Event) => { const v = Number((e.target as HTMLInputElement).value); val.textContent = fmt(v); saveDebounced(path, v, 120); } });
  return h('span', { class: 'row' }, input, val);
}
const select = (path: string, label: string, options: [string, string][], onChange?: (v: string) => void, coerce: (v: string) => unknown = (v) => v) => {
  const cur = String(getByPath(path));
  return h('select', { 'aria-label': label, onchange: (e: Event) => { const v = (e.target as HTMLSelectElement).value; void save(path, coerce(v)).then(() => onChange?.(v)); } },
    ...options.map(([v, l]) => h('option', { value: v, selected: v === cur }, l)));
};
const text = (path: string, label: string, placeholder = '', listId?: string) => {
  const el = h('input', { type: 'text', value: String(getByPath(path) ?? ''), placeholder, spellcheck: false, 'aria-label': label, oninput: (e: Event) => saveDebounced(path, (e.target as HTMLInputElement).value.trim(), 600) });
  if (listId) el.setAttribute('list', listId);
  return el;
};
const timeIn = (path: string, label: string) => h('input', { type: 'time', value: String(getByPath(path)), 'aria-label': label, onchange: (e: Event) => void save(path, (e.target as HTMLInputElement).value) });
const num = (path: string, label: string, min: number, max: number) => h('input', { type: 'number', min, max, value: Number(getByPath(path)), 'aria-label': label, onchange: (e: Event) => void save(path, Number((e.target as HTMLInputElement).value)) });
const group = (title: string, ...kids: Child[]) => h('section', { class: 'group' }, h('span', { class: 'label' }, title), ...kids);
const btn = (label: string, onclick: () => unknown, cls = '', ic?: string, title?: string) =>
  h('button', { class: `btn ${cls}`, onclick, title, type: 'button' }, ic ? icon(ic) : null, label);
const viewHead = (title: string) => h('div', { class: 'view-head' }, h('h1', {}, title));
const emptyLine = (t: string) => h('div', { class: 'empty-line' }, t);
const pct = (v: number) => `${Math.round(v * 100)}%`;

function toast(msg: string, err = false) {
  const t = h('div', { class: `toast${err ? ' err' : ''}`, role: 'status' }, msg);
  document.getElementById('toasts')!.append(t);
  setTimeout(() => t.remove(), 3800);
}

// ---------------------------------------------------------------- status (one indicator: connection, plus what she's doing when busy)
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
    statusEl.textContent = phase === 'idle' ? phaseDetail : phaseDetail || `${PHASE_LABEL[phase]}…`;
    statusEl.className = `status${phase === 'error' ? ' err' : ''}`;
  }
  if (stopBtn) stopBtn.hidden = !(phase === 'thinking' || phase === 'speaking');
}
const CONN_LABEL: Record<ConnectionStatus['state'], string> = { connecting: 'Connecting', connected: 'Online', disconnected: 'Offline', error: 'Error' };
function renderConn() {
  if (!conn) return;
  connChip.dataset.state = conn.state;
  connText.textContent = conn.provider === 'offline' ? 'No AI' : CONN_LABEL[conn.state];
  connChip.title = `${conn.provider}${conn.model ? ` · ${conn.model}` : ''}: ${conn.detail}`;
}

// ---------------------------------------------------------------- navigation
function renderRail() {
  const rail = document.getElementById('rail')!;
  rail.replaceChildren(...TABS.map((t) => h('button', { role: 'tab', 'aria-selected': String(t.id === tab), 'aria-label': t.label, onclick: () => go(t.id) }, icon(t.icon), h('span', { class: 'tip' }, t.label))));
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
  setTimeout(() => (view.className = ''), 200);
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
  c.append(h('div', {}, req.summary));
  if (req.tainted) c.append(h('div', { class: 'why' }, 'Asked right after reading file names or notes. Check this is what you wanted.'));
  c.append(h('div', { class: 'row' }, btn('Allow', () => respond(true), 'primary', 'check'), btn('Deny', () => respond(false), '', 'close')));
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
  const ta = h('textarea', { placeholder: 'Message Capri', rows: 1, 'aria-label': 'Message' });
  const send = async (value?: string) => {
    const v = (value ?? ta.value).trim();
    if (!v) return;
    ta.value = ''; autosize();
    try { await api.invoke('chat:send', { text: v }); } catch (e) { toast((e as Error).message, true); }
  };
  const autosize = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(140, Math.max(34, ta.scrollHeight + 2))}px`; };
  ta.addEventListener('input', autosize);
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } });
  const micBtn = h('button', { class: 'btn icon-only', type: 'button', title: S.voice.micPermission ? 'Hold to talk (Ctrl+Alt+T)' : 'Microphone is off (Voice settings)', 'aria-label': 'Push to talk' }, icon('mic'));
  micBtn.disabled = !S.voice.micPermission;
  const micStart = () => { if (mic) return; mic = true; micBtn.classList.add('rec'); void api.invoke('voice:ptt', 'start'); };
  const micStop = () => { if (!mic) return; mic = false; micBtn.classList.remove('rec'); void api.invoke('voice:ptt', 'stop'); };
  micBtn.addEventListener('pointerdown', micStart);
  micBtn.addEventListener('pointerup', micStop);
  micBtn.addEventListener('pointerleave', micStop);
  micBtn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); mic ? micStop() : micStart(); } });
  stopBtn = h('button', { class: 'btn icon-only', type: 'button', title: 'Stop (Esc)', 'aria-label': 'Stop', onclick: () => api.invoke('chat:stop') }, icon('stop'));
  const sendBtn = h('button', { class: 'btn primary icon-only', type: 'button', title: 'Send (Enter)', 'aria-label': 'Send', onclick: () => send() }, icon('send'));
  statusEl = h('div', { class: 'status' });
  view.append(h('div', { class: 'chat' }, scroller, statusEl, h('div', { class: 'composer' }, ta, micBtn, stopBtn, sendBtn)));

  const hist = await api.invoke('chat:history', { limit: 200 });
  if (!hist.length) {
    messagesEl.append(h('div', { class: 'empty' }, h('div', {}, 'Say something.'),
      h('div', { class: 'try' }, ...['Who are you?', 'Teleport', 'Timer 5 minutes'].map((q) => h('button', { type: 'button', onclick: () => send(q) }, q)))));
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
api.on('connection:status', (c) => { conn = c as ConnectionStatus; renderConn(); if (tab === 'model') refreshConn(); });
api.on('action:confirm', (p) => {
  const req = p as ActionRequest;
  pendingConfirm.set(req.id, req);
  if (tab !== 'chat') go('chat'); else showConfirm(req);
  window.focus();
});
api.on('action:result', (p) => { const r = p as ActionResult; if (!r.ok) toast(r.summary, true); });
api.on('transcript', (p) => { const t = p as { text: string }; if (t.text) toast(`Heard: “${t.text}”`); });
api.on('reminder:fired', (p) => { const r = p as Reminder; toast(r.text); });
api.on('settings:changed', (s) => { S = s as Settings; if (tab === 'chat') renderPhase(); });
api.on('panel:tab', (t) => { const target = ALIASES[String(t)] ?? String(t); if (target !== tab) go(target); });
api.on('memory:changed', () => { if (tab === 'memory') go('memory'); });

// ---------------------------------------------------------------- model
let connBody: HTMLElement | null = null;
function refreshConn() {
  if (!connBody || !conn) return;
  const tone = conn.state === 'connected' ? 'ok' : conn.state === 'error' ? 'bad' : conn.state === 'connecting' ? 'info' : '';
  connBody.replaceChildren(h('dl', { class: 'kv' },
    h('dt', {}, 'Status'), h('dd', {}, h('span', { class: `tag ${tone}` }, CONN_LABEL[conn.state])),
    conn.model ? h('dt', {}, 'Model') : null, conn.model ? h('dd', { class: 'mono' }, `${conn.model}${conn.usingFallback ? ' (fallback)' : ''}`) : null,
    conn.state !== 'connected' ? h('dt', {}, 'Detail') : null, conn.state !== 'connected' ? h('dd', {}, conn.detail) : null,
    conn.provider === 'gemini' ? h('dt', {}, 'API key') : null,
    conn.provider === 'gemini' ? h('dd', {}, conn.keySource === 'secure-store' ? 'Saved in Capri' : conn.keySource === 'environment' ? 'GEMINI_API_KEY' : 'Not set') : null,
    h('dt', {}, 'Checked'), h('dd', {}, conn.checkedAt ? new Date(conn.checkedAt).toLocaleTimeString() : '—')));
}
async function renderModel() {
  secretStatus = await api.invoke('secrets:status');
  conn = await api.invoke('connection:get');
  const sc = h('div', { class: 'scroll' });
  const result = h('div', { class: 'sub' });
  const datalist = h('datalist', { id: 'models' });
  const keyField = (key: 'gemini' | 'openai' | 'anthropic', label: string) => {
    const input = h('input', { type: 'password', placeholder: secretStatus[key] ? 'Saved' : 'Paste key', autocomplete: 'off', spellcheck: false, 'aria-label': label });
    return field(label, h('span', { class: 'row' }, input,
      btn('Save', async () => { if (!input.value.trim()) return; try { await api.invoke('secrets:set', { key, value: input.value.trim() }); input.value = ''; toast('Key saved'); go('model'); } catch (e) { result.textContent = (e as Error).message; } }),
      secretStatus[key] ? btn('Remove', async () => { await api.invoke('secrets:delete', key); go(tab); }, 'danger') : null),
      secretStatus._persistent ? undefined : 'Encryption unavailable: kept for this session only.');
  };
  connBody = h('div', {});
  refreshConn();
  const prov = S.ai.provider;
  sc.append(
    group('Connection', connBody, h('div', { class: 'row' },
      btn('Check', async () => { conn = await api.invoke('connection:check'); renderConn(); refreshConn(); }, '', 'refresh'),
      btn('Test', async () => { result.textContent = 'Testing…'; const r = await api.invoke('provider:test'); result.textContent = `${r.ok ? 'OK' : 'Failed'}: ${r.detail}${r.latencyMs !== undefined ? ` · ${r.latencyMs} ms` : ''}`; const list = await api.invoke('provider:models'); datalist.replaceChildren(...list.map((m) => h('option', { value: m }))); })),
    result, datalist),
    group('Provider',
      field('Provider', select('ai.provider', 'Provider', [['gemini', 'Google Gemini'], ['ollama', 'Ollama'], ['openai', 'OpenAI-compatible'], ['anthropic', 'Anthropic'], ['offline', 'None (offline commands)']], () => go('model'))),
      prov === 'gemini' ? h('div', {},
        field('Model', text('ai.gemini.model', 'Model', 'gemini-3.5-flash-lite', 'models')),
        field('Fallback', text('ai.gemini.fallbackModel', 'Fallback model', 'none', 'models')),
        field('Thinking', select('ai.gemini.thinkingLevel', 'Thinking', [['minimal', 'Minimal'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']])),
        keyField('gemini', 'API key')) : null,
      prov === 'ollama' ? h('div', {}, field('Server', text('ai.ollama.baseUrl', 'Server URL')), field('Model', text('ai.ollama.model', 'Model', 'llama3.2', 'models'))) : null,
      prov === 'openai' ? h('div', {}, field('Base URL', text('ai.openai.baseUrl', 'Base URL')), field('Model', text('ai.openai.model', 'Model', 'gpt-4o-mini', 'models')), keyField('openai', 'API key')) : null,
      prov === 'anthropic' ? h('div', {}, field('Base URL', text('ai.anthropic.baseUrl', 'Base URL')), field('Model', text('ai.anthropic.model', 'Model', 'claude-haiku-5-5', 'models')), keyField('anthropic', 'API key')) : null,
    ),
    group('Replies',
      field('Length', select('ai.responseLength', 'Reply length', [['short', 'Short'], ['medium', 'Medium'], ['long', 'Long']])),
      prov !== 'gemini' ? field('Creativity', range('ai.temperature', 'Creativity', 0, 1.5, 0.05)) : null,
      field('Max tokens', num('ai.maxTokens', 'Max tokens', 32, 8192)),
      field('Context turns', num('ai.historyTurns', 'Context turns', 0, 100)),
      field('Timeout (s)', num('ai.requestTimeoutSec', 'Timeout', 5, 600))),
  );
  view.append(viewHead('Model'), sc);
}

// ---------------------------------------------------------------- voice
async function renderVoice() {
  secretStatus = await api.invoke('secrets:status');
  const sc = h('div', { class: 'scroll' });
  const voiceSel = h('select', { 'aria-label': 'Voice', onchange: (e: Event) => void save('voice.systemVoice', (e.target as HTMLSelectElement).value) });
  const fillVoices = () => {
    const vs = speechSynthesis.getVoices();
    voiceSel.replaceChildren(h('option', { value: '' }, 'Automatic'), ...vs.map((v) => h('option', { value: v.name, selected: v.name === S.voice.systemVoice }, v.name)));
  };
  fillVoices();
  speechSynthesis.onvoiceschanged = fillVoices;
  const testVoice = () => {
    const u = new SpeechSynthesisUtterance('Hey, choom.');
    const v = speechSynthesis.getVoices().find((x) => x.name === S.voice.systemVoice);
    if (v) u.voice = v;
    u.rate = S.voice.rate; u.pitch = S.voice.pitch; u.volume = S.voice.volume;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  };
  const keyIn = h('input', { type: 'password', placeholder: secretStatus.openaiVoice ? 'Saved' : 'Optional', autocomplete: 'off', 'aria-label': 'Voice API key' });
  sc.append(
    group('Microphone',
      sw('Allow microphone', 'voice.micPermission', () => go('voice')),
      field('Speech to text', select('voice.sttEngine', 'Speech to text', [['windows', 'Windows (on-device)'], ['openai', 'Whisper-compatible']], () => go('voice'))),
      S.voice.sttEngine === 'openai' ? h('div', {}, field('Endpoint', text('voice.openaiStt.baseUrl', 'Speech to text endpoint')), field('Model', text('voice.openaiStt.model', 'Speech to text model'))) : null,
      field('Wake word “Hey Capri”', toggle('voice.wakeWord', 'Wake word'), S.voice.micPermission ? undefined : 'Needs the microphone.'),
    ),
    group('Speech',
      sw('Speak replies', 'voice.ttsEnabled'),
      field('Engine', select('voice.ttsEngine', 'Speech engine', [['system', 'Windows voices'], ['openai', 'OpenAI-compatible']], () => go('voice'))),
      S.voice.ttsEngine === 'system' ? field('Voice', h('span', { class: 'row' }, voiceSel, btn('Test', testVoice))) : h('div', {},
        field('Endpoint', text('voice.openaiTts.baseUrl', 'Speech endpoint')), field('Model', text('voice.openaiTts.model', 'Speech model')), field('Voice', text('voice.openaiTts.voice', 'Voice name'))),
      field('Rate', range('voice.rate', 'Rate', 0.5, 2, 0.05)),
      field('Pitch', range('voice.pitch', 'Pitch', 0, 2, 0.05)),
      field('Volume', range('voice.volume', 'Volume', 0, 1, 0.05, pct)),
    ),
    (S.voice.ttsEngine === 'openai' || S.voice.sttEngine === 'openai') ? group('Voice API key',
      field('Key', h('span', { class: 'row' }, keyIn, btn('Save', async () => { if (keyIn.value.trim()) { await api.invoke('secrets:set', { key: 'openaiVoice', value: keyIn.value.trim() }); go('voice'); } }),
        secretStatus.openaiVoice ? btn('Remove', async () => { await api.invoke('secrets:delete', 'openaiVoice'); go('voice'); }, 'danger') : null))) : '',
  );
  view.append(viewHead('Voice'), sc);
}

// ---------------------------------------------------------------- character: appearance, behavior, movement
async function renderCharacter() {
  const d = await api.invoke('diagnostics:get');
  const t = d.teleport;
  const sc = h('div', { class: 'scroll' });
  const tp = (where: string, label: string) => btn(label, async () => { const r = await api.invoke('teleport:now', where); if (!r.ok) toast(r.detail, true); }, '', 'teleport');
  sc.append(
    group('Appearance',
      field('Size', range('character.scale', 'Size', 0.4, 2.5, 0.05, pct)),
      field('Opacity', range('character.opacity', 'Opacity', 0.2, 1, 0.05, pct)),
      field('Animation', range('character.animationIntensity', 'Animation intensity', 0, 1.5, 0.05, pct)),
      field('Frame rate', select('character.fpsCap', 'Frame rate', [['15', '15 fps'], ['30', '30 fps'], ['60', '60 fps'], ['120', '120 fps']], undefined, Number)),
      sw('Glitch effects', 'character.glitchEffects')),
    group('On the desktop',
      sw('Always on top', 'character.alwaysOnTop'),
      field('Click-through', toggle('character.clickThrough', 'Click-through'), 'Ctrl+Alt+C to interact for 15 s.'),
      sw('Hide for fullscreen apps', 'character.hideOnFullscreen'),
      field('Position', btn('Reset', () => save('character.position', null)))),
    group('Movement',
      field('Teleport now', h('span', { class: 'row' }, tp('auto', 'Anywhere'), tp('near_cursor', 'To cursor'), tp('perch', 'On window')), undefined, true),
      field('Teleport on her own', toggle('teleport.auto', 'Teleport on her own'), t.auto ? (t.armed ? `Next in ${t.nextInSec !== null ? Math.max(1, Math.ceil(t.nextInSec / 60)) : '—'} min` : `Waiting: ${t.blockedReason ?? 'AI offline'}`) : undefined),
      field('Every (minutes)', h('span', { class: 'row' }, num('teleport.minMinutes', 'Minimum minutes', 1, 240), h('span', { class: 'sub' }, 'to'), num('teleport.maxMinutes', 'Maximum minutes', 1, 480))),
      sw('Avoid the active window', 'teleport.avoidActiveWindow'),
      sw('Teleport effects', 'teleport.effects')),
    group('Behavior',
      sw('Do not disturb', 'behavior.doNotDisturb'),
      field('Sleep after (minutes)', num('behavior.sleepAfterMinutes', 'Sleep after', 1, 240)),
      sw('Quiet hours', 'behavior.quietHours.enabled'),
      field('From', h('span', { class: 'row' }, timeIn('behavior.quietHours.start', 'Quiet hours start'), h('span', { class: 'sub' }, 'to'), timeIn('behavior.quietHours.end', 'Quiet hours end'))),
      sw('Idle remarks', 'behavior.idleRemarks'),
      S.behavior.idleRemarks ? sw('Say remarks out loud', 'behavior.proactiveVoice') : null,
      S.behavior.idleRemarks ? field('Remark every (minutes)', num('behavior.remarkIntervalMinutes', 'Remark interval', 5, 480)) : null),
  );
  view.append(viewHead('Character'), sc);
}

// ---------------------------------------------------------------- memory
async function renderMemory() {
  const [mem, notes, rems] = await Promise.all([api.invoke('memory:list'), api.invoke('notes:list'), api.invoke('reminders:list')]);
  const sc = h('div', { class: 'scroll' });
  const add = h('input', { type: 'text', placeholder: 'Something to remember', maxLength: 300, 'aria-label': 'New memory', style: 'flex:1;width:auto' });
  const memItem = (m: MemoryItem) => h('div', { class: 'item' },
    h('div', { class: 'txt' }, m.text, h('div', { class: 'sub' }, `${m.source === 'model' ? 'Suggested by Capri' : 'Added by you'} · ${new Date(m.createdAt).toLocaleDateString()}`)),
    m.status === 'pending' ? btn('Approve', () => api.invoke('memory:approve', m.id).then(() => go('memory')), 'primary') : null,
    btn('Delete', () => api.invoke('memory:delete', m.id).then(() => go('memory')), 'quiet'));
  sc.append(
    group('Long-term',
      sw('Use in conversations', 'memory.enabled'),
      h('div', { class: 'list' }, ...mem.map(memItem), mem.length ? null : emptyLine('Nothing yet.')),
      h('div', { class: 'row', style: 'margin:8px 0' }, add,
        btn('Add', async () => { if (add.value.trim()) { try { await api.invoke('memory:add', add.value.trim()); go('memory'); } catch (e) { toast((e as Error).message, true); } } }, '', 'plus'),
        mem.length ? btn('Forget all', async () => { if (confirm('Delete all memories?')) { await api.invoke('memory:clear'); go('memory'); } }, 'danger') : null)),
    group('History',
      sw('Save conversations', 'privacy.saveHistory'),
      field('Keep for (days, 0 = always)', num('memory.historyRetentionDays', 'Keep history for days', 0, 3650)),
      field('Clear', btn('Clear history', async () => { if (confirm('Delete all conversation history?')) { await api.invoke('chat:clear'); toast('History cleared'); } }, 'danger', 'trash'))),
    group('Notes', h('div', { class: 'list' }, ...notes.map((n: Note) => h('div', { class: 'item' },
      h('div', { class: 'txt' }, n.title, h('div', { class: 'sub' }, n.body.slice(0, 200))),
      btn('Delete', () => api.invoke('notes:delete', n.id).then(() => go('memory')), 'quiet'))), notes.length ? null : emptyLine('No notes.'))),
    group('Timers and reminders', h('div', { class: 'list' }, ...rems.map((r: Reminder) => h('div', { class: 'item' },
      h('div', { class: 'txt' }, r.text, h('div', { class: 'sub' }, `${r.kind === 'timer' ? 'Timer' : 'Reminder'} · ${new Date(r.dueAt).toLocaleString()}`)),
      r.fired ? h('span', { class: 'tag ok' }, 'done') : btn('Cancel', () => api.invoke('reminders:cancel', r.id).then(() => go('memory')), 'quiet'))), rems.length ? null : emptyLine('None.'))),
  );
  view.append(viewHead('Memory'), sc);
}

// ---------------------------------------------------------------- privacy: permissions + data
const TOOL_INFO: Record<ToolName, string> = {
  open_url: 'Open web pages', launch_app: 'Launch approved apps', search_files: 'Search file names',
  create_note: 'Save notes', list_notes: 'Read notes', set_reminder: 'Set reminders', start_timer: 'Start timers', cancel_timer: 'Cancel timers',
  get_time: 'Check the time', remember: 'Remember facts', teleport: 'Teleport on request', emote: 'Expressions',
  read_screen: 'Read your screen', study_timer: 'Study timers', mischief: 'Pranks on request', use_computer: 'Use your computer',
};
async function renderPrivacy() {
  const d = await api.invoke('diagnostics:get');
  const sc = h('div', { class: 'scroll' });
  const pol = (t: ToolName) => select(`actions.policies.${t}`, TOOL_INFO[t], [['allow', 'Allow'], ['confirm', 'Ask first'], ['deny', 'Never']]);
  sc.append(
    group('What Capri may do', ...TOOL_NAMES.map((t) => field(TOOL_INFO[t], pol(t)))),
    group('Approved apps',
      h('div', { class: 'list' }, ...S.actions.approvedApps.map((a, i) => h('div', { class: 'item' }, h('div', { class: 'txt' }, a.name, h('div', { class: 'sub mono' }, a.path)),
        btn('Remove', () => save('actions.approvedApps', S.actions.approvedApps.filter((_, j) => j !== i)).then(() => go('privacy')), 'quiet'))),
        S.actions.approvedApps.length ? null : emptyLine('None.')),
      h('div', { class: 'row', style: 'margin:8px 0' }, btn('Add app', async () => {
        const a = await api.invoke('apps:pick');
        if (a) { await save('actions.approvedApps', [...S.actions.approvedApps, a]); go('privacy'); }
      }, '', 'plus'))),
    group('Search folders',
      h('div', { class: 'list' }, ...S.actions.searchRoots.map((r, i) => h('div', { class: 'item' }, h('div', { class: 'txt mono' }, r),
        btn('Remove', () => save('actions.searchRoots', S.actions.searchRoots.filter((_, j) => j !== i)).then(() => go('privacy')), 'quiet'))),
        S.actions.searchRoots.length ? null : emptyLine('None.')),
      h('div', { class: 'row', style: 'margin:8px 0' }, btn('Add folder', async () => {
        const f = await api.invoke('folders:pick');
        if (f && !S.actions.searchRoots.includes(f)) { await save('actions.searchRoots', [...S.actions.searchRoots, f]); go('privacy'); }
      }, '', 'folder'))),
    group('Your data',
      h('dl', { class: 'kv' },
        h('dt', {}, 'Location'), h('dd', { class: 'mono' }, d.userData),
        h('dt', {}, 'API keys'), h('dd', {}, d.safeStorage ? 'Encrypted (Windows DPAPI)' : 'Memory only'),
        h('dt', {}, 'Audio'), h('dd', {}, 'Never stored'),
        h('dt', {}, 'Telemetry'), h('dd', {}, 'None')),
      field('Log level', select('privacy.logLevel', 'Log level', [['error', 'Errors'], ['warn', 'Warnings'], ['info', 'Normal'], ['debug', 'Debug']])),
      h('div', { class: 'row', style: 'margin:8px 0' }, btn('Open folder', () => api.invoke('app:openDataFolder'), '', 'folder'),
        btn('Delete all data', async () => {
          if (confirm('Delete all Capri data (settings, keys, history, memory, notes)? This cannot be undone.') && confirm('Really delete everything?')) await api.invoke('app:resetAll');
        }, 'danger', 'trash'))),
  );
  view.append(viewHead('Privacy'), sc);
}

// ---------------------------------------------------------------- system: startup, shortcuts, health, logs
async function renderSystem() {
  const sc = h('div', { class: 'scroll' });
  view.append(viewHead('System'), sc);
  sc.append(
    group('Startup',
      sw('Launch at sign-in', 'startup.launchOnLogin'),
      sw('Reminder notifications', 'notifications.reminders'),
      sw('Notification sound', 'notifications.sound')),
    group('Shortcuts', ...([['Open chat', 'Ctrl+Alt+Space'], ['Push to talk', 'Ctrl+Alt+T'], ['Teleport', 'Ctrl+Alt+P'], ['Stop', 'Ctrl+Alt+X'], ['Hide / show', 'Ctrl+Alt+H'], ['Interact (click-through)', 'Ctrl+Alt+C']] as const)
      .map(([d, k]) => field(d, h('span', { class: 'kbd' }, k)))),
  );
  const health = group('Health', emptyLine('Checking…'));
  const logs = h('div', { class: 'logs' });
  sc.append(health, group('Logs', logs, h('div', { class: 'row', style: 'margin:8px 0' },
    btn('Refresh', () => loadLogs(), '', 'refresh'), btn('Copy', () => navigator.clipboard.writeText(logs.textContent ?? '').then(() => toast('Copied'))),
    btn('Restart', () => api.invoke('app:restart')), btn('Quit Capri', () => api.invoke('app:quit'), 'danger'))));
  const loadLogs = async () => { logs.textContent = (await api.invoke('logs:tail', 200)).join('\n'); logs.scrollTop = logs.scrollHeight; };
  let d: Diagnostics;
  try { d = await api.invoke('diagnostics:get'); } catch (e) { health.replaceChildren(h('span', { class: 'label' }, 'Health'), h('div', { class: 'err-text' }, (e as Error).message)); return; }
  const ok = (b: boolean, t: string) => h('span', { class: `tag ${b ? 'ok' : 'bad'}` }, t);
  health.replaceChildren(h('span', { class: 'label' }, 'Health'), h('dl', { class: 'kv' },
    h('dt', {}, 'AI'), h('dd', {}, ok(d.connection.state === 'connected', `${CONN_LABEL[d.connection.state]}${d.connection.state === 'connected' ? '' : ` · ${d.connection.detail}`}`)),
    h('dt', {}, 'Speech recognizer'), h('dd', {}, ok(d.speechRecognizer.available, d.speechRecognizer.available ? 'Available' : d.speechRecognizer.detail)),
    h('dt', {}, 'Key storage'), h('dd', {}, ok(d.safeStorage, d.safeStorage ? 'Encrypted' : 'Memory only')),
    h('dt', {}, 'Fullscreen detection'), h('dd', {}, ok(d.fullscreenWatcher !== 'unavailable', d.fullscreenWatcher)),
    h('dt', {}, 'Frame rate'), h('dd', { class: 'mono' }, `${d.perf.fps ?? '—'} fps`),
    h('dt', {}, 'Startup'), h('dd', { class: 'mono' }, `${d.perf.startupMs} ms`),
    h('dt', {}, 'Memory'), h('dd', { class: 'mono' }, `${d.perf.processes.reduce((s, p) => s + p.memMB, 0)} MB`),
    h('dt', {}, 'Shortcuts'), h('dd', { class: 'mono' }, Object.entries(d.shortcuts).map(([k, v]) => `${k} ${v}`).join(' · ') || 'Off'),
    h('dt', {}, 'Last unclean exit'), h('dd', {}, d.lastCrash ?? 'None'),
    h('dt', {}, 'Version'), h('dd', { class: 'mono' }, `${d.version} · Electron ${d.electron}`),
    h('dt', {}, 'Displays'), h('dd', { class: 'mono' }, d.displays.map((x) => `${x.bounds.width}×${x.bounds.height} @${Math.round(x.scaleFactor * 100)}%`).join(', '))));
  void loadLogs();
}

// ---------------------------------------------------------------- first run
function renderWelcome() {
  const finish = async (provider?: string) => {
    if (provider) await save('ai.provider', provider);
    await save('firstRunComplete', true);
    go(provider && provider !== 'offline' && provider !== 'gemini' ? 'model' : provider === 'gemini' ? 'model' : 'chat');
  };
  const choice = (title: string, sub: string, provider: string) => h('div', { class: 'choice', role: 'button', tabIndex: 0, onclick: () => finish(provider), onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') void finish(provider); } },
    h('b', {}, title), h('span', { class: 'sub' }, sub), h('span', { class: 'go' }, '→'));
  view.append(h('div', { class: 'scroll' }, h('div', { class: 'welcome' },
    h('h2', {}, 'Choose her brain'),
    choice('Google Gemini', 'Needs an API key', 'gemini'),
    choice('Ollama', 'Local, on this PC', 'ollama'),
    choice('Other API', 'OpenAI-compatible or Anthropic', 'openai'),
    choice('No AI', 'Commands only', 'offline'))));
}

const RENDER: Record<string, () => unknown> = {
  chat: renderChat, model: renderModel, voice: renderVoice, character: renderCharacter, memory: renderMemory, privacy: renderPrivacy, system: renderSystem, welcome: renderWelcome,
};

// ---------------------------------------------------------------- boot
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
