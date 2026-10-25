// CAPRI — fan trailer. 1920×1080 @ 30 fps, cut to the score's 98 BPM grid.
import React from "react";
import { AbsoluteFill, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { BAR, BEAT, DROP2, Glitch, Grain, Letterbox, Scanlines, Vignette, bar, f } from "./lib";
import { Arrive, Barrage, ColdOpen, EndCard, FEATURES, Hype, NeedHost, NotAProgram, Reveal, TalksBack } from "./scenes";

// Scene boundaries (seconds)
const S = {
  open: 0,
  reveal: bar(0), // 11.04 — drop 1
  host: bar(2),
  arrive: bar(4),
  features: bar(6),
  barrage: bar(12),
  talks: 48,
  build: 56,
  hype: DROP2, // 64.16 — drop 2
  end: DROP2 + 8 * BAR, // 83.75 — hard cut
  total: 92,
};

// ---------------- glitch hits: [time s, length frames, strength] ----------------
const beatsFrom = (t0: number, n: number, step = 1) => Array.from({ length: n }, (_, i) => t0 + i * step * BEAT);
const HITS: [number, number, number][] = [
  [4.9, 6, 0.6], [6.37, 3, 0.3], [8.57, 7, 0.7], [10.4, 4, 0.9], [10.62, 6, 1], [S.reveal, 10, 1], [bar(1), 4, 0.4], [bar(1.85), 4, 0.5],
  [S.host, 6, 0.7], [bar(3), 6, 0.6], [S.arrive, 5, 0.5], [S.arrive + 18 / 30, 8, 0.7], [bar(5), 5, 0.6],
  ...[0, 1, 2, 3, 4, 5].map((k) => [bar(6 + k), 5, 0.55] as [number, number, number]),
  [bar(6) + 10 / 30, 6, 0.6], [bar(6) + 26 / 30, 6, 0.6],
  ...beatsFrom(S.barrage, 6, 2).map((t) => [t, 4, 0.7] as [number, number, number]),
  [S.talks, 6, 0.6], [S.talks + 114 / 30, 6, 0.6], [S.talks + 130 / 30, 6, 0.6],
  [S.build, 8, 0.6], [S.build + 80 / 30, 8, 0.8], [S.build + 166 / 30, 3, 1],
  ...[0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.25, 5.5].map((k) => [S.build + 178 / 30 + k * 0.6 * BEAT, 3, 0.8] as [number, number, number]),
  [S.hype, 12, 1], [S.hype + BAR, 6, 0.7], [S.hype + 2 * BAR, 6, 0.7],
  ...beatsFrom(S.hype + 3 * BAR, 8).map((t) => [t, 4, 0.8] as [number, number, number]),
  [S.hype + 5 * BAR, 24, 1], [S.hype + 7 * BAR, 6, 0.7], [S.end - 0.1, 3, 1], [S.end + 0.5, 12, 0.9],
];
const glitchAt = (frame: number) => {
  let a = 0;
  for (const [t, len, amt] of HITS) {
    const d = frame - f(t);
    if (d >= 0 && d < len) a = Math.max(a, amt * (1 - d / len) * (0.6 + 0.4 * random(`g${frame}`)));
  }
  return a;
};

// ---------------- sound design (all sourced, see trailer/ASSETS.md) ----------------
// peak/onset: seconds from file start to the hit, measured from the waveform, so hits land on picture.
const SFX_PEAK: Record<string, number> = {
  braam: 0.76, data_proc: 0, digital_glitch: 0.08, drone_dark: 0, drone_deep: 0, glitch1: 0.34, glitch_hd: 0.24, glitch_trans5: 0.72, glitch_trans7: 0.46,
  hud_ping: 0.04, impact_boom: 0.08, impact_huge: 0.02, interface_typing: 0.86, riser3: 2.98, riser_impact: 1.8, sub_boom: 0.06, sub_drop: 0.92,
  teleport_instant: 0.04, teleport_whoosh: 1.72, trailer_braam: 0.2, ui_glitch_notif: 0.02, warp: 0.06, whoosh_cine: 0.88, whoosh_epic: 0.64, whoosh_velocity: 0.48,
};
type Cue = { sfx: string; at: number; vol: number; len?: number; fade?: number };
const CUES: Cue[] = [
  { sfx: "drone_deep", at: 0, vol: 0.55 },
  { sfx: "data_proc", at: 0.3, vol: 0.18, len: 4.5, fade: 1 },
  { sfx: "hud_ping", at: 0.6, vol: 0.35 }, { sfx: "hud_ping", at: 1.6, vol: 0.3 }, { sfx: "hud_ping", at: 2.6, vol: 0.3 },
  { sfx: "ui_glitch_notif", at: 3.6, vol: 0.55 },
  { sfx: "glitch_hd", at: 4.9, vol: 0.4 },
  { sfx: "glitch_trans7", at: 8.57, vol: 0.4 },
  { sfx: "digital_glitch", at: 10.4, vol: 0.3 },
  { sfx: "riser3", at: S.reveal, vol: 0.35 },
  { sfx: "impact_boom", at: S.reveal, vol: 0.6 }, { sfx: "sub_boom", at: S.reveal, vol: 0.4 },
  { sfx: "teleport_whoosh", at: S.reveal + 0.5, vol: 0.25 },
  { sfx: "glitch1", at: bar(1), vol: 0.25 },
  { sfx: "whoosh_cine", at: S.host, vol: 0.35 },
  { sfx: "teleport_whoosh", at: S.arrive + 0.75, vol: 0.55 },
  { sfx: "teleport_instant", at: bar(6) + 10 / 30, vol: 0.6 }, { sfx: "teleport_whoosh", at: bar(6) + 26 / 30 + 0.3, vol: 0.5 },
  { sfx: "whoosh_epic", at: bar(9) + 0.7, vol: 0.32 },
  ...beatsFrom(S.barrage, 6, 2).map((t) => ({ sfx: "ui_glitch_notif", at: t, vol: 0.25 })),
  { sfx: "hud_ping", at: S.talks + 52 / 30, vol: 0.35 },
  { sfx: "hud_ping", at: S.talks + 64 / 30, vol: 0.3 },
  { sfx: "teleport_instant", at: S.talks + 114 / 30, vol: 0.55 }, { sfx: "teleport_whoosh", at: S.talks + 130 / 30 + 0.3, vol: 0.45 },
  { sfx: "hud_ping", at: S.talks + 160 / 30, vol: 0.35 },
  { sfx: "drone_dark", at: S.talks + 3.5, vol: 0.35, len: 5, fade: 1 },
  { sfx: "braam", at: S.build + 0.1, vol: 0.55 },
  { sfx: "glitch_trans5", at: S.build + 80 / 30, vol: 0.4 },
  { sfx: "sub_drop", at: S.build + 80 / 30, vol: 0.5 },
  { sfx: "whoosh_epic", at: S.hype, vol: 0.3 },
  { sfx: "trailer_braam", at: S.hype, vol: 0.5 }, { sfx: "impact_huge", at: S.hype, vol: 0.35, len: 4, fade: 2 },
  { sfx: "impact_boom", at: S.hype + BAR, vol: 0.45 }, { sfx: "impact_boom", at: S.hype + 2 * BAR, vol: 0.45 },
  { sfx: "braam", at: S.hype + 5 * BAR, vol: 0.6 }, { sfx: "glitch_hd", at: S.hype + 5 * BAR, vol: 0.4 },
  { sfx: "impact_huge", at: S.end + 0.5, vol: 0.75, len: 7.5, fade: 3 }, { sfx: "sub_boom", at: S.end + 0.5, vol: 0.45 },
  { sfx: "drone_dark", at: S.end + 0.9, vol: 0.3, len: 7.1, fade: 2 },
];

// Master trims keep the summed mix under full scale at the drops.
const SFX_GAIN = 0.52;
const SCORE_GAIN = 0.6;

const Sfx: React.FC<Cue> = ({ sfx, at, vol: v, len, fade = 0 }) => {
  const vol = v * SFX_GAIN;
  const start = f(at - (SFX_PEAK[sfx] ?? 0));
  const n = len ? f(len) : undefined;
  return (
    <Sequence from={start} durationInFrames={n} layout="none">
      <Audio
        src={staticFile(`audio/sfx/${sfx}.mp3`)}
        trimBefore={start < 0 ? -start : undefined}
        volume={(fr) => (n && fade ? vol * interpolate(fr, [n - f(fade), n], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : vol)}
      />
    </Sequence>
  );
};

// Score edit: play the intro + drop 1 + breakdown, skip 5.66 s of breakdown, then the build and drop 2; hard cut after 8 bars.
const XF = 0.2;
const SCORE_B_IN = 61.66;
const Score: React.FC = () => {
  const aEnd = f(S.build + XF);
  const bStart = f(S.build - XF);
  const bLen = f(S.end) - bStart;
  return (
    <>
      <Sequence durationInFrames={aEnd} layout="none">
        <Audio src={staticFile("audio/score.mp3")} volume={(fr) => SCORE_GAIN * interpolate(fr, [aEnd - f(2 * XF), aEnd], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
      <Sequence from={bStart} durationInFrames={bLen} layout="none">
        <Audio
          src={staticFile("audio/score.mp3")}
          trimBefore={f(SCORE_B_IN - XF)}
          volume={(fr) => SCORE_GAIN * interpolate(fr, [0, f(2 * XF), bLen - 2, bLen], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        />
      </Sequence>
    </>
  );
};

const at = (a: number, b: number) => ({ from: f(a), durationInFrames: f(b) - f(a) });

export const Trailer: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const boxed = t < S.reveal || (t >= S.build && t < S.hype) || t >= S.end;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Glitch amount={glitchAt(frame)}>
        <Sequence {...at(S.open, S.reveal)}><ColdOpen /></Sequence>
        <Sequence {...at(S.reveal, S.host)}><Reveal /></Sequence>
        <Sequence {...at(S.host, S.arrive)}><NeedHost /></Sequence>
        <Sequence {...at(S.arrive, S.features)}><Arrive /></Sequence>
        {FEATURES.map((F, k) => (
          <Sequence key={k} {...at(bar(6 + k), bar(7 + k))}><F /></Sequence>
        ))}
        <Sequence {...at(S.barrage, S.talks)}><Barrage /></Sequence>
        <Sequence {...at(S.talks, S.build)}><TalksBack /></Sequence>
        <Sequence {...at(S.build, S.hype)}><NotAProgram /></Sequence>
        <Sequence {...at(S.hype, S.end)}><Hype /></Sequence>
        <Sequence {...at(S.end, S.total)}><EndCard /></Sequence>
      </Glitch>
      <Vignette strength={0.6} />
      <Scanlines opacity={0.1} />
      <Grain opacity={0.1} />
      {boxed ? <Letterbox h={110} /> : null}
      <Score />
      {CUES.map((c, i) => <Sfx key={i} {...c} />)}
    </AbsoluteFill>
  );
};
export const TRAILER_FRAMES = f(S.total);
