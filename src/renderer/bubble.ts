import type { BubbleState } from '../shared/ipc';
import type { CapriApi } from '../preload/preload';
const api = (window as unknown as { capri: CapriApi }).capri;
const card = document.getElementById('card')!, message = document.getElementById('message')!, status = document.getElementById('status')!;
const form = document.getElementById('composer') as HTMLFormElement, input = document.getElementById('input') as HTMLTextAreaElement;
const stop = document.getElementById('stop') as HTMLButtonElement;
let state: BubbleState;
let composing = false;
let measuredHeight = 0, measureFrame = 0;
function measure() {
  cancelAnimationFrame(measureFrame);
  measureFrame = requestAnimationFrame(() => {
    const height = Math.ceil((card.getBoundingClientRect().height + 12) / 2) * 2;
    if (height === measuredHeight) return;
    measuredHeight = height; void api.invoke('bubble:resize', height);
  });
}
new ResizeObserver(measure).observe(card);
function render(next: BubbleState) {
  const justOpened = next.composer && !state?.composer;
  state = next;
  const busy = ['thinking', 'transcribing', 'listening'].includes(state.phase);
  status.textContent = state.phase === 'idle' ? 'CAPRI' : state.phase.toUpperCase();
  message.textContent = state.text || (busy ? state.phase === 'thinking' ? 'Thinking…' : 'Listening…' : 'Hey. I’m right here.');
  message.classList.toggle('waiting', !state.text && busy);
  form.hidden = !state.composer;
  stop.hidden = !busy;
  document.body.dataset.side = state.side;
  if (justOpened) input.focus();
  requestAnimationFrame(measure);
}
async function send() {
  const text = input.value.trim(); if (!text) return;
  input.value = ''; input.style.height = 'auto';
  try { await api.invoke('chat:send', { text }); } catch (e) { message.textContent = String((e as Error).message); measure(); }
}
form.addEventListener('submit', (e) => { e.preventDefault(); void send(); });
input.addEventListener('compositionstart', () => { composing = true; }); input.addEventListener('compositionend', () => { composing = false; });
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !composing && !e.isComposing) { e.preventDefault(); void send(); } });
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(84, input.scrollHeight)}px`; measure(); });
document.getElementById('reply')!.addEventListener('click', () => { void api.invoke('bubble:open'); });
document.getElementById('settings')!.addEventListener('click', () => { void api.invoke('panel:open', 'character'); });
document.getElementById('close')!.addEventListener('click', () => { void api.invoke('bubble:close'); });
stop.addEventListener('click', () => { void api.invoke('chat:stop'); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') void api.invoke('bubble:close'); });
api.on('bubble:state', (s) => render(s as BubbleState));
api.on('bubble:focus', () => input.focus());
void api.invoke('bubble:get').then(render);
