import { Personality, type Mood, type LifeEvent, type LifeFrame } from '../../shared/personality';
import type { AssistantPhase, CharacterCue } from '../../shared/ipc';
import type { Settings } from '../../shared/settings';
import type { CapriApi } from '../../preload/preload';
import { Animator, Blinker, NEUTRAL, type Params } from './params';
import { Behavior } from './behavior';
import { Speaker } from './speaker';
import { MicRecorder } from './audio';
import { FRAME_SIZE } from '../../shared/framing';
import { TeleportFx } from './teleportFx';
import { POSTURES, type PostureName, type Surface } from './postures';
import { clipByName } from './clips';
import type { Reaction } from './behavior';
import type { PoseName } from './model';
import { CapriSpriteModel } from './spriteModel';
import { modelPoseFor } from './poseMap';

/** Model-requested emotes → validated reactions/clips (the model never touches the renderer directly). */
const EMOTE_MAP: Record<string, { react?: Reaction; clip?: string; posture?: PostureName }> = {
  smug: { clip: 'smug' }, maniac_grin: { clip: 'maniac_grin' }, blank_stare: { clip: 'blank_stare' }, reach: { clip: 'reach_claw' },
  sit: { posture: 'sit_edge' }, stand: { posture: 'stand' }, recline: { posture: 'recline' }, power_stance: { posture: 'power_stance' }, curl_up: { posture: 'air_sit' },
  happy: { react: 'happy' }, laugh: { clip: 'giggle' }, wink: { clip: 'wink' }, tease: { clip: 'tease' }, grin: { clip: 'tilt_grin' },
  surprised: { react: 'surprised' }, many_eyes: { clip: 'many_eyes' }, annoyed: { react: 'annoyed' }, eye_roll: { clip: 'eye_roll' },
  pout: { clip: 'pout' }, menace: { clip: 'menace' }, curious: { react: 'curious' }, thinking: { clip: 'chin_tap' }, shrug: { clip: 'shrug' },
  nod: { clip: 'nod_slow' }, shake_no: { clip: 'shake_no' }, wave: { react: 'wave' }, cheer: { clip: 'cheer' }, proud: { clip: 'proud_pose' },
  reveal: { clip: 'reveal_spread' }, loom: { clip: 'loom' }, facepalm: { clip: 'facepalm' }, yawn: { clip: 'yawn' },
};

declare global { interface Window { capri: CapriApi; __capriDebug?: unknown } }
const api = window.capri;

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: true, desynchronized: false })!;
const off = document.createElement('canvas'); // glitch post-process source
const offCtx = off.getContext('2d')!;

let settings: Settings;
let phase: AssistantPhase = 'idle';
let idleSec = 0;
let quiet = false;
let paused = false;
let pointer: { x: number; y: number } | null = null;
let lastPointerAt = 0;
let cursorLocal: { x: number; y: number } | null = null;
let hit = false;
let dragging = false;
let forced: Partial<Params> | null = null;
let surface: Surface = 'taskbar';
let attachment: 'perch' | 'hang' | 'moving' | null = null;
let dashing = 0; // pose override for previews/tests only
let textTalkUntil = 0;

const fx = new TeleportFx(() => document.createElement('canvas'));
const model = new CapriSpriteModel();
const personality = new Personality();
let life: LifeFrame | undefined;
let reportedMood: Mood = 'neutral';
function lifeEvent(event: LifeEvent) {
  if (!settings?.character.personality) return;
  const mood = personality.event(event); reportedMood = mood;
  void api.invoke('char:personality', { mood, event });
}
let variantFor = '', variant = 0, lastP: Params | null = null, shownPose: PoseName | null = null;
let workPose: 'back' | 'crouch' | 'sit' | null = null; // set while she uses the PC
function modelPose(): PoseName {
  // while she breaks apart she keeps the pose she was in; the new spot's pose appears as she arrives
  if (fx.phase === 'out' && shownPose) return shownPose;
  // working on the PC: the pose main picked, except she only sits with a ledge under her
  if (workPose && !dragging) return (shownPose = workPose === 'sit' && surface !== 'window' && surface !== 'taskbar' ? 'crouch' : workPose);
  if (variantFor !== behavior.posture) { variantFor = behavior.posture; variant = Math.random(); }
  return (shownPose = modelPoseFor({ surface, posture: behavior.posture, sleeping: behavior.state === 'sleeping', dragging, variant, back: (lastP?.back ?? 0) > 0.5 }));
}
const anim = new Animator();
const behavior = new Behavior();
const blinker = new Blinker();
const mic = new MicRecorder();
const speaker = new Speaker(() => settings, (id, state) => void api.invoke('char:speechState', { utteranceId: id, state }), (text, mood) => api.invoke('tts:fetch', mood ? { text, mood } : text));

// ---------------------------------------------------------------- sizing (DPI aware)
let dpr = 1, W = FRAME_SIZE.width, H = FRAME_SIZE.height;
function resize() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth; H = window.innerHeight;
  for (const c of [canvas, off]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
}
window.addEventListener('resize', resize);
// re-run when moved to a monitor with a different scale factor
const watchDpr = () => matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', () => { resize(); watchDpr(); }, { once: true });

// ---------------------------------------------------------------- render loop (throttled)
let last = performance.now();
let acc = 0;
let frames = 0, fpsT = performance.now();
let raf = 0;
function frameBudget(): number {
  const cap = settings?.character.fpsCap ?? 60;
  if (behavior.state === 'sleeping') return 1000 / Math.min(cap, 15);
  const busy = dashing !== 0 || fx.active || speaker.speaking || dragging || phase !== 'idle' || behavior.state !== 'idle' || pointer;
  return 1000 / (busy ? cap : Math.min(cap, 30));
}
function loop(now: number) {
  raf = requestAnimationFrame(loop);
  acc = now - last;
  if (acc < frameBudget() - 1) return;
  const dt = Math.min(0.1, acc / 1000);
  last = now;
  tick(dt);
  frames++;
  if (now - fpsT > 5000) { void api.invoke('char:fps', Math.round((frames * 1000) / (now - fpsT))); frames = 0; fpsT = now; }
}
function setPaused(p: boolean) {
  if (p === paused) return;
  paused = p;
  if (p) cancelAnimationFrame(raf);
  else { last = performance.now(); raf = requestAnimationFrame(loop); }
}
// Main pauses genuinely hidden pets explicitly. Covering the native window must
// not stop teleport effects or leave a stale mouse hit region behind.

function tick(dt: number) {
  if (!settings) return;
  const intensity = settings.character.animationIntensity;
  if (pointer && performance.now() - lastPointerAt > 4000) pointer = null; // stop staring when the mouse rests
  life = settings.character.personality ? personality.update(dt, { pointer, phase, sleeping: behavior.state === 'sleeping', held: dragging }) : undefined;
  const mood = life?.mood ?? 'neutral';
  if (mood !== reportedMood) { reportedMood = mood; void api.invoke('char:personality', { mood }); }
  const level = speaker.lips.update(dt);
  const target: Params = behavior.update(dt, {
    phase, speechLevel: level, speaking: speaker.speaking, pointer, idleSec, quiet, intensity,
    sleepAfterSec: settings.behavior.sleepAfterMinutes * 60,
    surface, dashing, held: dragging,
  });
  const b = blinker.update(dt, { drowsy: target.sleep, suppressed: behavior.state === 'sleeping' });
  target.blinkL = Math.max(target.blinkL, b);
  target.blinkR = Math.max(target.blinkR, b);
  if (!settings.character.glitchEffects) target.glitch = 0;
  // departure: the many-eyes bloom flashes as she starts to fragment (N 2:14)
  if (fx.phase === 'out') target.manyEyes = Math.max(target.manyEyes, Math.sin(Math.min(1, fx.u / 0.6) * Math.PI));
  if (forced) Object.assign(target, forced);
  anim.step(target, dt, intensity);
  const p = anim.value;
  p.mouthOpen = Math.max(0, speaker.speaking ? level : p.mouthOpen); // lip-sync wins over gesture clips

  const teleporting = fx.active || fx.hidden;
  model.faceToward(life && settings.character.animation === 'auto' ? life.look ?? 0 : pointer ? pointer.x : 0);
  if (!settings.voice.ttsEnabled && !speaker.speaking && performance.now() < textTalkUntil) p.mouthOpen = 0.12 + 0.30 * Math.abs(Math.sin(performance.now() / 95));
  if (model.stutter > 0 && !teleporting) { model.stutter--; return; } // glitch stutter: hold the last image a few frames
  const glitch = !teleporting && settings.character.glitchEffects && (p.glitch > 0.05 || model.burst > 0);
  const g = glitch || teleporting ? offCtx : ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  lastP = p;
  model.draw(g, p, dt, { personality: life, attachment, pose: modelPose(), ledge: surface === 'taskbar' || surface === 'window', taskbar: surface === 'taskbar', dragging, glitchEnabled: settings.character.glitchEffects, intensity, animation: settings.character.animation, facing: settings.character.facing }, W, H);
  if (glitch) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0);
    model.post(ctx, off, Math.max(0.3, p.glitch, model.burst * 0.9));
  }
  if (teleporting) fx.render(ctx, off, dt, dpr);
  if (!dragging && cursorLocal) setHit(!teleporting && model.hitTest(ctx, cursorLocal.x, cursorLocal.y, dpr));
}

// head pats: the cursor rubbing back and forth over her head (Desktop Mate / Shimeji style)
let patDir = 0, patTurns: number[] = [], patLastX = 0, patCool = 0;
function trackPat(x: number, y: number) {
  if (!hit || dragging || y > H * 0.45) return;
  const d = Math.sign(x - patLastX);
  patLastX = x;
  if (!d) return;
  const now = performance.now();
  if (d !== patDir) { patDir = d; patTurns.push(now); }
  patTurns = patTurns.filter((t) => now - t < 1400);
  if (patTurns.length >= 4 && now > patCool) {
    patTurns = []; patCool = now + 2500;
    model.pat();
    void api.invoke('char:interaction', 'pat');
    behavior.react('happy');
  }
}

// ---------------------------------------------------------------- teleport (window move happens in main between phases)
fx.onDone = (id, ph) => {
  void api.invoke('char:teleport', { id, phase: ph });
  if (ph === 'in') {
    // arrive with an observed pose: arms flung wide (N 1:51), the tilted grin (W3) or a many-eyes flash (N 2:14)
    const pick = ['reveal_spread', 'tilt_grin', 'many_eyes'][Math.floor(Math.random() * 3)];
    behavior.playClip(pick);
  }
};
function onTeleport(phaseName: 'out' | 'in', id: number, effects: boolean, perchAnimation = false) {
  setHit(false);
  if (!effects) {
    fx.phase = null;
    fx.hidden = phaseName === 'out';
    if (phaseName === 'in') ctx.clearRect(0, 0, canvas.width, canvas.height);
    void api.invoke('char:teleport', { id, phase: phaseName });
    return;
  }
  setPaused(false);
  fx.start(phaseName, id, { x: W / 2, y: H * 0.38, w: W * 0.8, h: H * 0.7 }, perchAnimation ? 0.7 : undefined);
}

// ---------------------------------------------------------------- pointer: hit-test, drag, click
function setHit(h: boolean) { if (h !== hit) { hit = h; void api.invoke('char:hit', h); document.body.style.cursor = h ? 'grab' : 'default'; } }
window.addEventListener('mousemove', (e) => {
  cursorLocal = { x: e.clientX, y: e.clientY };
  lastPointerAt = performance.now();
  // gaze target relative to her head (≈ 34% down the frame)
  pointer = { x: (e.clientX - W / 2) / (W * 0.45), y: (e.clientY - H * 0.34) / (H * 0.35) };
  if (!dragging) setHit(!fx.active && !fx.hidden && model.hitTest(ctx, e.clientX, e.clientY, dpr));
  trackPat(e.clientX, e.clientY);
});
window.addEventListener('mouseleave', () => { cursorLocal = null; pointer = null; if (!dragging) setHit(false); });
window.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || !hit) return;
  dragging = true;
  document.body.style.cursor = 'grabbing';
  void api.invoke('char:drag', 'start');
});
window.addEventListener('mouseup', (e) => {
  if (e.button !== 0 || !dragging) return;
  dragging = false;
  document.body.style.cursor = hit ? 'grab' : 'default';
  void api.invoke('char:drag', 'end');
});
window.addEventListener('dblclick', () => { if (hit) void api.invoke('char:click'); });
window.addEventListener('contextmenu', (e) => { e.preventDefault(); if (hit) void api.invoke('char:menu'); });

// ---------------------------------------------------------------- microphone
async function micStart(autoStop: boolean) {
  try {
    await mic.start(autoStop, () => void micStop(false));
  } catch (e) {
    void api.invoke('char:micError', (e as Error).message || 'microphone unavailable');
  }
}
async function micStop(cancel: boolean) {
  if (!mic.active) return;
  const out = await mic.stop(cancel);
  if (out) await api.invoke('char:audio', out);
}

// ---------------------------------------------------------------- cues from main
let wakeAuto = false;
api.on('cue', (raw) => {
  const c = raw as CharacterCue;
  switch (c.type) {
    case 'life': lifeEvent(c.event); break;
    case 'phase': if (c.phase === 'speaking' && phase !== 'speaking') lifeEvent('reply'); phase = c.phase; if (c.phase !== 'idle') behavior.wake(); break;
    case 'react': behavior.react(c.reaction); if (c.reaction === 'happy' || c.reaction === 'surprised') model.poke(); break;
    case 'speak': behavior.wake(); speaker.enqueue(c.utteranceId, c.text, settings.character.personality ? personality.mood : undefined); break;
    case 'stopSpeech': speaker.stopAll(); break;
    case 'wake': wakeAuto = true; behavior.react('surprised'); break;
    case 'mic':
      if (c.command === 'start') { void micStart(wakeAuto); wakeAuto = false; speaker.stopAll(); }
      else void micStop(c.command === 'cancel');
      break;
    case 'pause': setPaused(c.paused); if (c.paused) speaker.stopAll(); break;
    case 'interact': canvas.style.filter = c.enabled ? 'drop-shadow(0 0 1.5px #22f27a) drop-shadow(0 0 1px #22f27a)' : ''; break; // click-through lifted for a moment
    case 'presence': idleSec = c.idleSec; quiet = c.quiet; break;
    case 'remark': behavior.react('wave'); break;
    case 'bubble': break; // the attached bubble window owns text layout
    case 'textTalk': textTalkUntil = performance.now() + Math.min(10000, Math.max(1800, c.text.length * 40)); behavior.react('happy'); break;
    case 'workPose': workPose = c.pose; break;
    case 'teleport': if (c.animation && c.effects) model.teleportAnimation(c.animation); onTeleport(c.phase, c.id, c.effects, !!c.animation); break;
    case 'attachment': attachment = c.mode; break;
    case 'clip': {
      const spriteEmotes: Record<string, 'idle' | 'perch' | 'grin' | 'sleep' | 'glitch' | 'dangle'> = { sit: 'perch', curl_up: 'perch', stand: 'idle', grin: 'grin', laugh: 'grin', happy: 'grin', smug: 'grin', power_stance: 'glitch', menace: 'glitch', recline: 'sleep', yawn: 'sleep' };
      if (spriteEmotes[c.name]) model.requestAnimation(spriteEmotes[c.name], ['sit', 'stand', 'recline', 'curl_up'].includes(c.name) ? 20 : spriteEmotes[c.name] === 'glitch' ? 10 / 15 : 2);
      const e = EMOTE_MAP[c.name];
      if (e?.posture) behavior.setPosture(surface === 'air' && e.posture === 'sit_edge' ? 'air_sit' : e.posture);
      else if (e?.react) behavior.react(e.react);
      else if (e?.clip && clipByName(e.clip)) behavior.playClip(e.clip, 'reacting');
      break;
    }
    case 'connection': break;
    case 'surface': surface = c.surface; break;
    case 'pointer':
      cursorLocal = { x: c.x, y: c.y };
      pointer = Math.hypot(c.x - W / 2, c.y - H / 2) < 1100 ? { x: (c.x - W / 2) / (W * 0.45), y: (c.y - H * 0.34) / (H * 0.35) } : null;
      lastPointerAt = performance.now();
      break;
    case 'dash': dashing = c.dir; break;
  }
});
api.on('settings:changed', (s) => { settings = s as Settings; });

// ---------------------------------------------------------------- boot
(async () => {
  settings = await api.invoke('settings:get');
  await model.ready;
  resize();
  watchDpr();
  anim.snap({ ...NEUTRAL });
  tick(1 / 60);
  await api.invoke('char:ready');
  raf = requestAnimationFrame(loop);
  window.__capriDebug = {
    behavior, anim, speaker, model, mic, fx, personality, lifeEvent, get life() { return life; }, postures: POSTURES,
    get pose() { return modelPose(); },
    get surface() { return surface; },
    get hit() { return hit; },
    get paused() { return paused; },
    force(p: Partial<Params> | null) { forced = p; },
    hitAt: (x: number, y: number) => model.hitTest(ctx, x, y, dpr),
    // ---- deterministic capture mode (trailer / docs): stop the clock, advance exact frames, export pixels
    manual(on: boolean) { if (on) { cancelAnimationFrame(raf); paused = true; } else { paused = false; last = performance.now(); raf = requestAnimationFrame(loop); } },
    step(dt: number, n = 1) { for (let i = 0; i < n; i++) tick(dt); },
    setPhase(p: AssistantPhase) { phase = p; },
    setPointer(x: number | null, y = 0) { pointer = x === null ? null : { x, y }; lastPointerAt = performance.now(); },
    setSurface(s: Surface) { surface = s; },
    setDashing(d: number) { dashing = d; },
    setIdle(sec: number, q = false) { idleSec = sec; quiet = q; },
    lips(on: boolean) { if (on) speaker.lips.start(); else speaker.lips.stop(); },
    teleportFx(ph: 'out' | 'in', id = 1) { fx.start(ph, id, { x: W / 2, y: H * 0.38, w: W * 0.8, h: H * 0.7 }); },
    canvasSize: () => [canvas.width, canvas.height],
    grab(crop?: { x: number; y: number; w: number; h: number }, q = 0.9, type = 'image/webp') {
      const r = crop ?? { x: 0, y: 0, w: canvas.width, h: canvas.height };
      const c = document.createElement('canvas'); c.width = r.w; c.height = r.h;
      c.getContext('2d')!.drawImage(canvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      return c.toDataURL(type, q);
    },
  };
})();
