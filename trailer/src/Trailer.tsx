// CAPRI — fan trailer, recut from the real show. 1920×1080 @ 30 fps, cut to the score's 98 BPM grid.
// Text rule: one title, a handful of short lines (≤ 5 words), always in front of the picture.
import React from "react";
import { AbsoluteFill, Img, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { BAR, BEAT, C, DROP1, DROP2, Decode, Flash, Footage, Glitch, Grain, Letterbox, Scanlines, Slam, TITLE, Vignette, f } from "./lib";
import { Cuts, Cutout, GlitchOut, ShowShot, Zap, type PoseName, type Shot } from "./show";

const b = (n: number) => DROP1 + n * BEAT; // beat n after the first drop (s)
const S = { open: 0, drop1: DROP1, montage: b(8), zaps: b(24), barrage: b(48), breakdown: 48, build: 56, drop2: DROP2, end: DROP2 + 8 * BAR, total: 92 };
const fb = (n: number) => f(n * BEAT); // n beats in frames
const at = (a: number, z: number) => ({ from: f(a), durationInFrames: f(z) - f(a) });

// ---------------------------------------------------------------- shot lists (source, from, to in seconds)
const MONTAGE: Shot[] = [["o", 141.3, 144.8], ["o", 29.6, 30.9], ["n", 22.9, 25.1], ["e", 99.6, 100.05], ["o", 176.8, 179.9], ["n", 284.6, 287.1], ["e", 104.9, 106.0], ["n", 130.6, 132.9]];
const BARRAGE: Shot[] = [["o", 7.0, 7.3], ["o", 31.3, 34.9], ["n", 42.1, 43.1], ["n", 256.4, 257.3], ["e", 143.4, 144.5], ["e", 187.6, 191.1], ["n", 54.95, 55.15], ["e", 260.9, 261.9], ["n", 333.0, 334.1], ["o", 49.1, 52.6], ["e", 335.6, 336.7], ["o", 2.2, 3.0]];
const RUSH: Shot[] = [["o", 3.4, 5.2], ["e", 129.9, 131.4], ["n", 264.5, 267.5], ["e", 282.3, 288.1], ["n", 271.9, 276.7], ["e", 548.9, 549.4], ["o", 0.5, 0.9], ["e", 555.1, 558.5]];
const HYPE: Shot[] = [["n", 18.9, 22.6], ["e", 71.8, 75.8], ["o", 108.9, 114.2], ["n", 284.6, 287.1], ["e", 110.6, 111.1], ["e", 489.8, 492.5], ["n", 25.4, 32.2], ["e", 263.7, 267.4], ["o", 176.8, 179.9], ["e", 219.95, 225.0], ["n", 128.4, 130.3], ["e", 541.0, 542.7], ["o", 141.3, 144.8], ["e", 165.2, 165.8], ["e", 282.3, 288.1], ["e", 548.9, 549.4]];

// ---------------------------------------------------------------- zap choreography: the real cut-outs teleporting with the red bolt
type Spot = { pose: PoseName; x: number; y: number; h: number; flip?: boolean; ledge?: boolean };
const ZAP_SPOTS: Spot[] = [
  { pose: "stand", x: 1560, y: 1070, h: 900 }, { pose: "sit", x: 520, y: 760, h: 880, flip: true, ledge: true },
  { pose: "lounge", x: 1290, y: 640, h: 440, ledge: true }, { pose: "stand", x: 470, y: 1070, h: 980, flip: true },
  { pose: "lie", x: 980, y: 860, h: 420, flip: true, ledge: true }, { pose: "sit", x: 1440, y: 700, h: 820, ledge: true },
  { pose: "stand", x: 960, y: 1070, h: 1000 }, { pose: "lounge", x: 560, y: 520, h: 420, flip: true, ledge: true },
  { pose: "sit", x: 1300, y: 820, h: 860, flip: true, ledge: true }, { pose: "lie", x: 700, y: 900, h: 400, ledge: true },
  { pose: "stand", x: 1500, y: 1070, h: 960, flip: true }, { pose: "sit", x: 640, y: 760, h: 900, ledge: true },
];
const BGS = ["cyber_city.mp4", "neon_scape.mp4", "taxi_rain.mp4", "aerial_fog.mp4", "cyber_scape.mp4", "cyber_city.mp4"];
const centre = (s: Spot): [number, number] => [s.x, s.y - s.h * (s.pose === "lounge" || s.pose === "lie" ? 0.45 : 0.55)];

const ZapRun: React.FC<{ spots: Spot[]; slot: number; bgs: string[]; perBg: number; seed: string; bgTrim?: number }> = ({ spots, slot, bgs, perBg, seed, bgTrim = 4 }) => (
  <AbsoluteFill style={{ backgroundColor: "#05030a" }}>
    {bgs.map((bg, i) => (
      <Sequence key={`bg${i}`} from={i * perBg * slot} durationInFrames={perBg * slot} premountFor={20}>
        <Footage src={bg} trimBefore={bgTrim + i * 3} grade="saturate(1.3) contrast(1.2) brightness(0.5)" tint={i % 2 ? C.violet : C.crimson} tintOpacity={0.28} dur={perBg * slot} push={[1.04, 1.14]} />
      </Sequence>
    ))}
    {spots.map((s, i) => {
      const prev = spots[i - 1];
      return (
        <Sequence key={i} from={i * slot} durationInFrames={slot} premountFor={20}>
          {s.ledge ? <div style={{ position: "absolute", left: s.x - s.h * 0.75, top: s.y - 2, width: s.h * 1.5, height: 4, background: `linear-gradient(90deg, transparent, ${C.crimson}, transparent)`, boxShadow: `0 0 22px ${C.crimson}` }} /> : null}
          <Sequence from={6} layout="none"><Cutout pose={s.pose} x={s.x} y={s.y} h={s.h} flip={s.flip} from={i * 7} /></Sequence>
          {prev ? <Sequence durationInFrames={4} layout="none"><GlitchOut x={centre(prev)[0]} y={centre(prev)[1]} h={prev.h * 0.6} seed={`${seed}o${i}`} /></Sequence> : null}
          <Sequence from={3} durationInFrames={4} layout="none"><GlitchOut x={centre(s)[0]} y={centre(s)[1]} h={s.h * 0.6} seed={`${seed}i${i}`} /></Sequence>
          {prev ? <Zap a={centre(prev)} b={centre(s)} dur={9} seed={`${seed}${i}`} /> : null}
          <Flash at={5} dur={4} color={C.crimson} peak={0.18} />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);

// ---------------------------------------------------------------- text: big, short, in front
const Line: React.FC<{ text: string; size?: number; y?: string; delay?: number; left?: boolean }> = ({ text, size = 120, y = "center", delay = 2, left }) => (
  <AbsoluteFill style={{ justifyContent: y === "top" ? "flex-start" : y === "bottom" ? "flex-end" : "center", alignItems: left ? "flex-start" : "center", padding: left ? "150px 120px" : "150px 0", zIndex: 10 }}>
    <Decode text={text} size={size} delay={delay} style={{ textShadow: "0 0 30px rgba(0,0,0,0.9), 6px 6px 0 rgba(242,21,76,0.85)" }} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------- scenes
const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 24], [1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence durationInFrames={f(3)}><ShowShot shot={["o", 2.1, 3.1]} slot={f(3)} rate={0.4} push={[1.15, 1.3]} grade="saturate(1.1) contrast(1.15) brightness(0.8)" /></Sequence>
      <Sequence from={f(3)} durationInFrames={f(2.5)}><ShowShot shot={["o", 40.4, 41.7]} slot={f(2.5)} rate={0.5} push={[1.05, 1.2]} grade="saturate(1.1) contrast(1.15) brightness(0.8)" /></Sequence>
      <Sequence from={f(5.5)} durationInFrames={f(8.57) - f(5.5)}>
        <ShowShot shot={["n", 241.8, 248.2]} slot={f(3.07)} rate={0.6} push={[1.25, 1.35]} />
        <Line text="THEY SCRAPPED HER." size={104} y="top" delay={8} />
      </Sequence>
      <Sequence from={f(8.57)} durationInFrames={f(10.4) - f(8.57)}>
        <Cuts shots={[["o", 49.1, 52.6], ["e", 335.6, 336.7], ["o", 131.9, 134.0], ["e", 225.3, 230.8], ["o", 114.6, 116.0], ["n", 84.9, 86.1], ["e", 187.6, 191.1], ["o", 49.6, 52.6], ["e", 336.0, 336.7]]} each={6} />
      </Sequence>
      <Sequence from={f(10.4)}><AbsoluteFill style={{ backgroundColor: "#000" }} /></Sequence>
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: fadeIn }} />
    </AbsoluteFill>
  );
};

const Drop1: React.FC = () => (
  <AbsoluteFill>
    <Sequence durationInFrames={fb(4)}><ShowShot shot={["o", 108.9, 114.2]} slot={fb(4)} /></Sequence>
    <Sequence from={fb(4)}><ShowShot shot={["n", 18.9, 22.6]} slot={fb(4)} /></Sequence>
    <Flash dur={10} />
  </AbsoluteFill>
);

const Montage: React.FC = () => (
  <AbsoluteFill>
    <Cuts shots={MONTAGE} each={fb(2)} />
    <Sequence durationInFrames={fb(4)}><Line text="SHE FOUND A HOST." size={110} y="bottom" /></Sequence>
  </AbsoluteFill>
);

const Zaps: React.FC = () => (
  <AbsoluteFill>
    <ZapRun spots={ZAP_SPOTS} slot={fb(2)} bgs={BGS} perBg={2} seed="z1" />
    <Sequence durationInFrames={fb(4)}><Line text="NOW SHE LIVES HERE." size={96} y="top" delay={8} left /></Sequence>
  </AbsoluteFill>
);

const Barrage: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Cuts shots={BARRAGE} each={fb(1)} push={[1.25, 1.12]} />
    <Sequence from={fb(12)}><Flash dur={7} /></Sequence>
  </AbsoluteFill>
);

const Breakdown: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShowShot shot={["o", 114.6, 131.6]} slot={f(8)} rate={0.55} push={[1.0, 1.18]} grade="saturate(1.05) contrast(1.1) brightness(0.7)" />
    <Sequence from={f(1.5)} durationInFrames={f(5)}><Line text="SHE'S NOT A PROGRAM." size={112} /></Sequence>
  </AbsoluteFill>
);

const Build: React.FC = () => {
  const silence = f(61.54 - 56), resume = f(61.94 - 56), end = f(DROP2 - 56);
  const rush = [10, 9, 8, 7, 6, 5, 5, 4];
  const rushTotal = rush.reduce((s, n) => s + n, 0);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence durationInFrames={f(2.7)}><ShowShot shot={["n", 259.7, 261.6]} slot={f(2.7)} rate={0.7} /></Sequence>
      <Sequence from={f(2.7)} durationInFrames={silence - f(2.7)}><ShowShot shot={["e", 225.3, 230.8]} slot={silence - f(2.7)} push={[1.2, 1.4]} /></Sequence>
      <Sequence from={resume} durationInFrames={end - resume}>
        <Sequence durationInFrames={end - resume - rushTotal}><ShowShot shot={["o", 141.3, 144.8]} slot={end - resume - rushTotal} push={[1.0, 1.25]} /></Sequence>
        <Sequence from={end - resume - rushTotal}><Cuts shots={RUSH.map((s, i) => [s, rush[i]] as [Shot, number])} each={6} /></Sequence>
      </Sequence>
      <Sequence from={end - 4}><AbsoluteFill style={{ backgroundColor: "#fff" }} /></Sequence>
    </AbsoluteFill>
  );
};

const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const spread = interpolate(frame, [0, 140], [0.3, 0.18], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <ShowShot shot={["e", 71.8, 75.8]} slot={fb(8)} rate={0.55} push={[1.22, 1.32]} grade="saturate(1.2) contrast(1.15) brightness(0.55)" />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.75) 100%)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 10 }}>
        <Decode text="CAPRI" size={360} spacing={spread} speed={0.5} delay={2} style={{ textShadow: `10px 10px 0 ${C.crimson}, -6px -5px 0 rgba(138,61,255,0.85), 0 0 60px rgba(0,0,0,0.8)` }} />
      </AbsoluteFill>
      <Flash dur={12} />
    </AbsoluteFill>
  );
};

const FINALE: Spot[] = [
  { pose: "stand", x: 420, y: 1070, h: 980, flip: true }, { pose: "sit", x: 1460, y: 760, h: 860, ledge: true }, { pose: "lie", x: 860, y: 880, h: 420, ledge: true }, { pose: "stand", x: 1560, y: 1070, h: 1000 },
  { pose: "lounge", x: 520, y: 600, h: 440, flip: true, ledge: true }, { pose: "sit", x: 1100, y: 800, h: 900, flip: true, ledge: true }, { pose: "stand", x: 700, y: 1070, h: 1000 }, { pose: "stand", x: 1300, y: 1070, h: 1040, flip: true },
];

const Drop2: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Sequence durationInFrames={fb(16)}><Cuts shots={HYPE} each={fb(1)} push={[1.18, 1.06]} /></Sequence>
    <Sequence from={fb(16)} durationInFrames={fb(8)}><TitleCard /></Sequence>
    <Sequence from={fb(24)}><ZapRun spots={FINALE} slot={fb(1)} bgs={["cyber_scape.mp4", "neon_scape.mp4"]} perBg={4} seed="z2" bgTrim={8} /></Sequence>
    <Flash dur={12} />
  </AbsoluteFill>
);

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const start = 15;
  const fadeOut = interpolate(frame, [f(7.2), f(8)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const o = interpolate(frame, [start + 18, start + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame < start) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", opacity: fadeOut }}>
      <AbsoluteFill><Img src={staticFile("img/keyart_er2.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(14px) brightness(0.22) saturate(1.3)" }} /></AbsoluteFill>
      <Cutout pose="sit" x={1500} y={760} h={620} flip from={0} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", paddingLeft: 200, gap: 36 }}>
        <Slam text="CAPRI" size={220} delay={start} style={{ letterSpacing: "0.2em" }} />
        <div style={{ opacity: o, display: "flex", alignItems: "center", gap: 34 }}>
          <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: 40, color: "#e8e3f2", letterSpacing: "0.22em" }}>A FAN PROJECT</div>
          <Img src={staticFile("img/logo_edgerunners2.png")} style={{ height: 100 }} />
        </div>
      </AbsoluteFill>
      <Flash at={start} dur={14} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- glitch hits on every cut
const cutsAt = (t0: number, n: number, every: number) => Array.from({ length: n }, (_, i) => t0 + i * every);
const HITS: [number, number, number][] = [
  [3, 6, 0.6], [5.5, 6, 0.6], [8.57, 6, 0.8], ...cutsAt(8.57, 9, 6 / 30).map((t) => [t, 2, 0.6] as [number, number, number]), [10.4, 6, 1],
  [S.drop1, 12, 1], [b(4), 6, 0.7],
  ...cutsAt(S.montage, 8, 2 * BEAT).map((t) => [t, 4, 0.55] as [number, number, number]),
  ...cutsAt(S.zaps, 12, 2 * BEAT).map((t) => [t + 3 / 30, 5, 0.7] as [number, number, number]),
  ...cutsAt(S.barrage, 12, BEAT).map((t) => [t, 3, 0.7] as [number, number, number]),
  [S.breakdown, 8, 0.6], [S.build, 8, 0.6], [S.build + 2.7, 8, 0.8], [61.54, 3, 1], [61.94, 4, 0.8],
  [S.drop2, 14, 1], ...cutsAt(S.drop2, 16, BEAT).map((t) => [t, 3, 0.75] as [number, number, number]),
  [S.drop2 + 4 * BAR, 26, 1], ...cutsAt(S.drop2 + 6 * BAR, 8, BEAT).map((t) => [t + 3 / 30, 5, 0.8] as [number, number, number]),
  [S.end - 0.1, 3, 1], [S.end + 0.5, 12, 0.9],
];
const glitchAt = (frame: number) => {
  let a = 0;
  for (const [t, len, amt] of HITS) { const d = frame - f(t); if (d >= 0 && d < len) a = Math.max(a, amt * (1 - d / len) * (0.6 + 0.4 * random(`g${frame}`))); }
  return a;
};

// ---------------------------------------------------------------- sound (all sourced; see ASSETS.md). Peak = s from file start to the hit.
const SFX_PEAK: Record<string, number> = {
  braam: 0.76, data_proc: 0, digital_glitch: 0.08, drone_dark: 0, drone_deep: 0, glitch1: 0.34, glitch_hd: 0.24, glitch_trans5: 0.72, glitch_trans7: 0.46,
  hud_ping: 0.04, impact_boom: 0.08, impact_huge: 0.02, interface_typing: 0.86, riser3: 2.98, riser_impact: 1.8, sub_boom: 0.06, sub_drop: 0.92,
  teleport_instant: 0.04, teleport_whoosh: 1.72, trailer_braam: 0.2, ui_glitch_notif: 0.02, warp: 0.06, whoosh_cine: 0.88, whoosh_epic: 0.64, whoosh_velocity: 0.48,
};
type Cue = { sfx: string; at: number; vol: number; len?: number; fade?: number };
const CUES: Cue[] = [
  { sfx: "drone_deep", at: 0, vol: 0.55 },
  { sfx: "glitch_hd", at: 3, vol: 0.35 }, { sfx: "glitch1", at: 5.5, vol: 0.3 },
  { sfx: "digital_glitch", at: 8.57, vol: 0.35 }, { sfx: "glitch_trans7", at: 9.4, vol: 0.3 },
  { sfx: "riser3", at: S.drop1, vol: 0.35 },
  { sfx: "impact_boom", at: S.drop1, vol: 0.6 }, { sfx: "sub_boom", at: S.drop1, vol: 0.4 },
  { sfx: "whoosh_cine", at: b(4), vol: 0.3 },
  ...cutsAt(S.zaps + 2 * BEAT, 11, 2 * BEAT).map((t, i) => ({ sfx: i % 2 ? "teleport_instant" : "warp", at: t + 3 / 30, vol: i % 2 ? 0.5 : 0.35, len: 0.6, fade: 0.3 })),
  ...cutsAt(S.barrage, 6, 2 * BEAT).map((t) => ({ sfx: "ui_glitch_notif", at: t, vol: 0.2 })),
  { sfx: "drone_dark", at: S.breakdown + 0.5, vol: 0.35, len: 7, fade: 1.5 },
  { sfx: "braam", at: S.build + 0.1, vol: 0.55 },
  { sfx: "glitch_trans5", at: S.build + 2.7, vol: 0.4 }, { sfx: "sub_drop", at: S.build + 2.7, vol: 0.45 },
  { sfx: "whoosh_epic", at: S.drop2, vol: 0.3 },
  { sfx: "trailer_braam", at: S.drop2, vol: 0.5 }, { sfx: "impact_huge", at: S.drop2, vol: 0.35, len: 4, fade: 2 },
  { sfx: "braam", at: S.drop2 + 4 * BAR, vol: 0.6 }, { sfx: "glitch_hd", at: S.drop2 + 4 * BAR, vol: 0.4 },
  ...cutsAt(S.drop2 + 6 * BAR + BEAT, 7, BEAT).map((t, i) => ({ sfx: i % 2 ? "teleport_instant" : "warp", at: t + 3 / 30, vol: 0.4, len: 0.5, fade: 0.25 })),
  { sfx: "impact_huge", at: S.end + 0.5, vol: 0.75, len: 7.5, fade: 3 }, { sfx: "sub_boom", at: S.end + 0.5, vol: 0.45 },
  { sfx: "drone_dark", at: S.end + 0.9, vol: 0.3, len: 7.1, fade: 2 },
];
const SFX_GAIN = 0.52;
const SCORE_GAIN = 0.6;
const Sfx: React.FC<Cue> = ({ sfx, at: t, vol: v, len, fade = 0 }) => {
  const vol = v * SFX_GAIN;
  const start = f(t - (SFX_PEAK[sfx] ?? 0));
  const n = len ? f(len) : undefined;
  return (
    <Sequence from={start} durationInFrames={n} layout="none">
      <Audio src={staticFile(`audio/sfx/${sfx}.mp3`)} trimBefore={start < 0 ? -start : undefined}
        volume={(fr) => (n && fade ? vol * interpolate(fr, [n - f(fade), n], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : vol)} />
    </Sequence>
  );
};
// Score edit: intro + drop 1 + breakdown, skip 5.66 s of breakdown, then build and drop 2; hard cut after 8 bars.
const XF = 0.2, SCORE_B_IN = 61.66;
const Score: React.FC = () => {
  const aEnd = f(S.build + XF), bStart = f(S.build - XF), bLen = f(S.end) - bStart;
  return (
    <>
      <Sequence durationInFrames={aEnd} layout="none">
        <Audio src={staticFile("audio/score.mp3")} volume={(fr) => SCORE_GAIN * interpolate(fr, [aEnd - f(2 * XF), aEnd], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
      <Sequence from={bStart} durationInFrames={bLen} layout="none">
        <Audio src={staticFile("audio/score.mp3")} trimBefore={f(SCORE_B_IN - XF)} volume={(fr) => SCORE_GAIN * interpolate(fr, [0, f(2 * XF), bLen - 2, bLen], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
    </>
  );
};

export const Trailer: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const boxed = t < S.drop1 || (t >= S.breakdown && t < S.drop2) || t >= S.end;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Glitch amount={glitchAt(frame)}>
        <Sequence {...at(S.open, S.drop1)}><ColdOpen /></Sequence>
        <Sequence {...at(S.drop1, S.montage)}><Drop1 /></Sequence>
        <Sequence {...at(S.montage, S.zaps)}><Montage /></Sequence>
        <Sequence {...at(S.zaps, S.barrage)}><Zaps /></Sequence>
        <Sequence {...at(S.barrage, S.breakdown)}><Barrage /></Sequence>
        <Sequence {...at(S.breakdown, S.build)}><Breakdown /></Sequence>
        <Sequence {...at(S.build, S.drop2)}><Build /></Sequence>
        <Sequence {...at(S.drop2, S.end)}><Drop2 /></Sequence>
        <Sequence {...at(S.end, S.total)}><EndCard /></Sequence>
      </Glitch>
      <Vignette strength={0.55} />
      <Scanlines opacity={0.08} />
      <Grain opacity={0.09} />
      {boxed ? <Letterbox h={110} /> : null}
      <Score />
      {CUES.map((c, i) => <Sfx key={i} {...c} />)}
    </AbsoluteFill>
  );
};
export const TRAILER_FRAMES = f(S.total);
