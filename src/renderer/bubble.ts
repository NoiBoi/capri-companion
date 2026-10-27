import { PORTRAITS, transmissionFace, transmissionStatus } from '../shared/transmission';
import { WaitingDialogue } from '../shared/dialogue';
const waitingDialogue = new WaitingDialogue();
import { bubbleTail } from '../shared/bubbleGeometry';
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
    const plate = document.getElementById('plate')!.getBoundingClientRect(), svg = document.getElementById('tail')!;
    svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    svg.querySelector('polygon')!.setAttribute('points', state?.tail ? bubbleTail(plate, state.tail, { width: innerWidth, height: innerHeight }) : '');
    const height = Math.ceil((card.getBoundingClientRect().height + 28) / 2) * 2;
    if (height === measuredHeight) return;
    measuredHeight = height; void api.invoke('bubble:resize', height);
  });
}
new ResizeObserver(measure).observe(card);
function render(next: BubbleState) {
  const justOpened = next.composer && !state?.composer;
  state = next;
  document.body.dataset.compact = String(state.delivery === 'aside' && state.phase === 'idle' && !state.composer && state.text.length <= 180);
  const busy = ['thinking', 'transcribing', 'listening'].includes(state.phase);
  (document.getElementById('retire') as HTMLButtonElement).disabled = !state.text || busy || state.phase === 'error';
  const elapsed = Math.max(0, Math.floor((Date.now() - (state.startedAt ?? Date.now())) / 1000));
  const display = transmissionStatus(state.phase, !!state.text, elapsed);
  status.textContent = display.label;
  document.body.dataset.kind = display.kind;
  document.getElementById('detail')!.textContent = display.detail || state.company || '';
  document.getElementById('activity')!.hidden = !busy;
  const portrait = document.getElementById('portrait') as HTMLImageElement;
  const face = transmissionFace(state.phase, state.text);
  if (portrait.dataset.face !== face) {
    portrait.dataset.face = face; portrait.src = `capri/mochiiwuff/${PORTRAITS[face]}`;
    portrait.classList.remove('swapping'); void portrait.offsetWidth; portrait.classList.add('swapping');
  }
  const text = state.text || (busy ? waitingDialogue.text(state.phase, state.startedAt ?? 0, elapsed) : '...');
  if (message.textContent !== text) { const stick = message.scrollHeight - message.scrollTop - message.clientHeight < 32; message.textContent = text; if (stick) message.scrollTop = message.scrollHeight; }
  message.classList.toggle('waiting', !state.text && busy);
  form.hidden = !state.composer;
  document.body.dataset.composing = String(state.composer);
  stop.hidden = !busy;
  document.body.dataset.side = state.side;
  if (justOpened) input.focus();
  measure();
}
async function send() {
  const text = input.value.trim(); if (!text) return;
  input.value = ''; input.style.height = 'auto';
  try { await api.invoke('chat:send', { text }); } catch (e) { if (!input.value) input.value = text; message.textContent = String((e as Error).message); measure(); }
}
form.addEventListener('submit', (e) => { e.preventDefault(); void send(); });
input.addEventListener('compositionstart', () => { composing = true; }); input.addEventListener('compositionend', () => { composing = false; });
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !composing && !e.isComposing) { e.preventDefault(); void send(); } });
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(84, input.scrollHeight)}px`; measure(); });
document.getElementById('reply')!.addEventListener('click', () => { void api.invoke('bubble:reply'); });
document.getElementById('retire')!.addEventListener('click', () => {
  const line = state?.text; if (!line) return;
  void api.invoke('dialogue:retire', line.slice(0, 1000)).catch(() => {});
});
document.getElementById('settings')!.addEventListener('click', () => { void api.invoke('panel:open', 'character'); });
document.getElementById('close')!.addEventListener('click', () => { void api.invoke('bubble:close'); });
stop.addEventListener('click', () => { void api.invoke('chat:stop'); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') void api.invoke('bubble:close'); });
api.on('bubble:state', (s) => render(s as BubbleState));
api.on('bubble:focus', () => input.focus());
void api.invoke('bubble:get').then(render);

setInterval(() => { if (state && ['thinking', 'transcribing', 'listening'].includes(state.phase)) render(state); }, 1000);
