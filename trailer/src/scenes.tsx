// The trailer's scenes. Each scene's local frame 0 is its start; Trailer.tsx places them on the beat grid.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BAR, BEAT, C, Decode, Flash, Footage, MONO, Push, Seq, seqWidth, Slam, Tag, TITLE, Typed, UI, f } from "./lib";
import { Desktop, EditorWindow, SEAT, TASKBAR_TOP } from "./desktop";

const fb = (beats: number) => Math.round(beats * BEAT * 30);
const BARF = BAR * 30;
const darkGrad = (side: "left" | "right" | "bottom") =>
  side === "bottom"
    ? "linear-gradient(0deg, rgba(5,3,10,0.85) 0%, rgba(5,3,10,0) 45%)"
    : `linear-gradient(${side === "left" ? 90 : 270}deg, rgba(5,3,10,0.85) 0%, rgba(5,3,10,0) 55%)`;

const Keyart: React.FC<{ blur?: number; dim?: number }> = ({ blur = 8, dim = 0.35 }) => (
  <AbsoluteFill>
    <Img src={staticFile("img/keyart_er2.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `blur(${blur}px) brightness(${dim}) saturate(1.3)`, transform: "scale(1.08)" }} />
  </AbsoluteFill>
);
const Glow: React.FC<{ color?: string; x?: string; y?: string; size?: number; opacity?: number }> = ({ color = C.crimson, x = "50%", y = "55%", size = 55, opacity = 0.55 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at ${x} ${y}, ${color} 0%, transparent ${size}%)`, opacity, mixBlendMode: "screen" }} />
);
const SOFT_MASK = "linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)";
export const SOFT: React.CSSProperties = { maskImage: SOFT_MASK, WebkitMaskImage: SOFT_MASK, maskComposite: "intersect", WebkitMaskComposite: "source-in" };
/** Full-screen face close-up from the high-res face captures. */
const Face: React.FC<{ clip: Parameters<typeof Seq>[0]["clip"]; x?: number; h?: number; from?: number; speed?: number }> = ({ clip, x, h = 1180, from = 0, speed = 1 }) => {
  const w = seqWidth(clip, h);
  return <Seq clip={clip} height={h} x={x ?? (1920 - w) / 2} y={(1080 - h) / 2} from={from} speed={speed} glow="rgba(242,21,76,0.35)" style={SOFT} />;
};

// ───────────────────────── S1 cold open (0 – 11.04 s) ─────────────────────────
export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 30], [1, 0], { extrapolateRight: "clamp" });
  const A = f(4.9), B = f(8.57);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence durationInFrames={A}>
        <Footage src="aerial_fog.mp4" trimBefore={2} grade="saturate(0.9) contrast(1.2) brightness(0.6) hue-rotate(-10deg)" tint={C.blue} tintOpacity={0.25} push={[1.0, 1.1]} dur={A} />
        <AbsoluteFill style={{ background: darkGrad("left") }} />
        <AbsoluteFill style={{ padding: "0 150px", justifyContent: "flex-end", paddingBottom: 200, gap: 10 }}>
          <Typed text="> ARASAKA CORP. // R&D DIVISION" color="#d8d4e8" delay={18} />
          <Typed text="> SUBJECT: PERSONALITY CONSTRUCT" color="#d8d4e8" delay={48} />
          <Typed text="> CLASS: CYBER-WEAPON" color="#d8d4e8" delay={78} />
          <Typed text="> STATUS: SCRAPPED" color={C.crimson} delay={108} size={40} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={A} durationInFrames={B - A}>
        <Footage src="taxi_rain.mp4" trimBefore={14} grade="saturate(1.2) contrast(1.2) brightness(0.55)" tint={C.crimson} tintMode="multiply" tintOpacity={0.35} push={[1.12, 1.02]} dur={B - A} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 26, background: "rgba(0,0,0,0.25)" }}>
          <Decode text="A COLLECTION OF HUMAN PSYCHES." size={70} delay={4} />
          <Decode text="ALL OF THEM DIGITIZED..." size={70} delay={44} color={C.crimson} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={B} durationInFrames={f(11.04) - B}>
        <Footage src="neon_scape.mp4" trimBefore={1} rate={1.3} grade="saturate(1.4) contrast(1.25) brightness(0.65)" tint={C.crimson} tintOpacity={0.6} push={[1.0, 1.25]} dur={f(2.5)} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <Decode text="...AND ROLLED INTO ONE." size={96} delay={3} />
        </AbsoluteFill>
        {/* subliminal many-eyes flashes before the drop */}
        <Sequence from={f(10.4) - B} durationInFrames={3}>
          <AbsoluteFill style={{ backgroundColor: "#000" }}><Face clip="f_many" from={40} /></AbsoluteFill>
        </Sequence>
        <Sequence from={f(10.62) - B} durationInFrames={5}>
          <AbsoluteFill style={{ backgroundColor: C.crimson }}><Face clip="f_menace" from={30} h={1500} /></AbsoluteFill>
        </Sequence>
        <Sequence from={f(10.85) - B}>
          <AbsoluteFill style={{ backgroundColor: "#000" }} />
        </Sequence>
      </Sequence>
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: fadeIn }} />
    </AbsoluteFill>
  );
};

// ───────────────────────── S2 reveal (drop 1) ─────────────────────────
export const Reveal: React.FC = () => {
  const cut = Math.round(BARF);
  const h = 1060;
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <Sequence durationInFrames={cut}>
        <Push dur={cut} from={1.0} to={1.06}>
          <Keyart blur={6} dim={0.3} />
          <Glow y="45%" size={50} opacity={0.7} />
          <Seq clip="reveal_in" height={h} x={(1920 - seqWidth("reveal_in", h)) / 2} y={20} glow="rgba(242,21,76,0.6)" />
        </Push>
        <Flash dur={12} />
      </Sequence>
      <Sequence from={cut}>
        <Push dur={80} from={1.0} to={1.05}>
          <AbsoluteFill style={{ backgroundColor: "#12030a" }} />
          <Glow x="62%" y="50%" size={45} opacity={0.8} />
          <Face clip="f_smug" x={640} />
          <AbsoluteFill style={{ background: darkGrad("left") }} />
        </Push>
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 150, gap: 22 }}>
          <Tag text="// SIGNAL ACQUIRED" color={C.green} />
          <Decode text={"HELLO,\nCHOOM."} size={150} delay={2} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

// ───────────────────────── S3 "she needed a host" ─────────────────────────
export const NeedHost: React.FC = () => {
  const cut = Math.round(BARF);
  return (
    <AbsoluteFill style={{ backgroundColor: "#07020a" }}>
      <Sequence durationInFrames={cut}>
        <Push dur={cut} from={1.08} to={1.0} origin="70% 50%">
          <Glow x="65%" y="45%" size={40} opacity={0.5} />
          <Face clip="f_menace" x={600} h={1240} />
        </Push>
        <AbsoluteFill style={{ background: darkGrad("left") }} />
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 150 }}>
          <Decode text={"SHE NEEDED\nA HOST."} size={130} delay={3} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={cut}>
        <Push dur={80} from={1.0} to={1.07} origin="30% 50%">
          <Glow x="35%" y="45%" size={40} opacity={0.45} color={C.violet} />
          <Face clip="f_tilt" x={-60} />
        </Push>
        <AbsoluteFill style={{ background: darkGrad("right") }} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-end", paddingRight: 150 }}>
          <Decode text={"SOMEWHERE\nTO LIVE."} size={130} delay={3} style={{ textAlign: "right" }} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

// ───────────────────────── S4 she arrives on your desktop ─────────────────────────
const H = 650; // full-body height on the desktop shots
const onTaskbar = (sitting: boolean) => TASKBAR_TOP - (sitting ? SEAT : 0.985) * H;

export const Arrive: React.FC = () => {
  const cut = Math.round(BARF);
  const x = 1220;
  return (
    <Desktop dur={150}>
      <EditorWindow x={180} y={140} w={920} h={560} />
      <Sequence from={18} durationInFrames={cut - 18}>
        <Seq clip="tp_in" height={H} x={x} y={onTaskbar(false)} />
      </Sequence>
      <Sequence from={cut}>
        <Seq clip="sit_idle" height={H} x={x} y={onTaskbar(true)} from={20} />
      </Sequence>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,3,10,0.7) 0%, rgba(5,3,10,0) 40%)" }} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
        <Decode text="NOW SHE'S GOT YOURS." size={110} delay={cut - 6} />
      </AbsoluteFill>
    </Desktop>
  );
};

// ───────────────────────── S5 feature montage (one bar each) ─────────────────────────
const Caption: React.FC<{ n: string; tag: string; text: string; right?: boolean }> = ({ n, tag, text, right }) => (
  <AbsoluteFill style={{ padding: "150px 130px", alignItems: right ? "flex-end" : "flex-start", gap: 16 }}>
    <Tag text={`// ${n} · ${tag}`} />
    <Slam text={text} size={118} style={{ textAlign: right ? "right" : "left" }} />
  </AbsoluteFill>
);
const Shade: React.FC<{ side?: "left" | "right" }> = ({ side = "left" }) => <AbsoluteFill style={{ background: `linear-gradient(${side === "left" ? 120 : 240}deg, rgba(5,3,10,0.8) 0%, rgba(5,3,10,0) 50%)` }} />;

const FTeleport: React.FC = () => (
  <Desktop trim={14} dur={74}>
    <Sequence durationInFrames={10}><Seq clip="tp_in" height={H} x={260} y={onTaskbar(false)} from={44} /></Sequence>
    <Sequence from={10} durationInFrames={16}><Seq clip="tp_out" height={H} x={260} y={onTaskbar(false)} /></Sequence>
    <Sequence from={26}><Seq clip="tp_in" height={H} x={1330} y={onTaskbar(false)} /></Sequence>
    <Shade />
    <Caption n="01" tag="TELEPORT" text={"SHE\nTELEPORTS."} />
  </Desktop>
);
const FPerch: React.FC = () => {
  const top = 610;
  return (
    <Desktop trim={20} dur={74}>
      <EditorWindow x={520} y={top} w={1000} h={390} />
      <Seq clip="perch_look" height={H} x={1080} y={top - SEAT * H} from={10} />
      <Shade />
      <Caption n="02" tag="PERCH" text={"SHE TAKES\nA SEAT."} />
    </Desktop>
  );
};
const FPeek: React.FC = () => {
  const h = 760;
  return (
    <Desktop trim={26} dur={74}>
      <EditorWindow x={560} y={180} w={900} h={560} />
      <Seq clip="peek" height={h} x={-seqWidth("peek", h) * 0.42} y={170} from={6} />
      <Shade side="right" />
      <Caption n="03" tag="PEEK" text={"SHE\nPEEKS."} right />
    </Desktop>
  );
};
const FDash: React.FC = () => {
  const frame = useCurrentFrame();
  const h = 600;
  const xAt = (fr: number) => interpolate(fr, [4, 44], [-450, 1950], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return (
    <Desktop trim={32} dur={74}>
      {[6, 4, 2].map((lag, k) => (
        <Seq key={lag} clip="dash" height={h} x={xAt(frame - lag)} y={180} loop glow="" style={{ opacity: 0.05 + k * 0.06, filter: "blur(6px)" }} />
      ))}
      <Seq clip="dash" height={h} x={xAt(frame)} y={180} loop />
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const x = xAt(frame) - 200 - k * 60;
        return <div key={k} style={{ position: "absolute", left: x - 500, top: 300 + k * 55, width: 500, height: 3, background: `linear-gradient(90deg, transparent, ${k % 2 ? C.crimson : C.white})`, opacity: 0.6 }} />;
      })}
      <Shade />
      <Caption n="04" tag="DASH" text={"SHE\nDASHES."} />
    </Desktop>
  );
};
const FBored: React.FC = () => (
  <Desktop trim={38} dur={74}>
    <Seq clip="recline" height={620} x={1080} y={150} from={14} />
    <Shade />
    <Caption n="05" tag="IDLE" text={"SHE GETS\nBORED."} />
  </Desktop>
);
const FWatch: React.FC = () => {
  const frame = useCurrentFrame();
  const p = -1 + frame / 48;
  const cx = 960 + p * 640;
  const cy = 830 - 60 * Math.sin(frame / 15);
  return (
    <Desktop trim={44} dur={74}>
      <Seq clip="watch" height={620} x={1150} y={onTaskbar(false) - 60} />
      <Shade />
      <Caption n="06" tag="AWARE" text={"SHE WATCHES\nYOU."} />
      <svg style={{ position: "absolute", left: cx, top: cy }} width="34" height="50" viewBox="0 0 17 25">
        <path d="M1 1 L1 20 L6 15.5 L9.5 23.5 L12.5 22 L9 14.5 L15.5 14.5 Z" fill="#fff" stroke="#000" strokeWidth="1.3" />
      </svg>
    </Desktop>
  );
};
export const FEATURES = [FTeleport, FPerch, FPeek, FDash, FBored, FWatch];

// ───────────────────────── S6 expression barrage ─────────────────────────
const BARRAGE: { clip: Parameters<typeof Seq>[0]["clip"]; bg: string; word: string; from: number; stroke: string }[] = [
  { clip: "f_smug", bg: C.crimson, word: "SMUG", from: 14, stroke: "#000" },
  { clip: "f_maniac", bg: C.ink, word: "MANIAC", from: 8, stroke: C.crimson },
  { clip: "f_wink", bg: C.violet, word: "WINK", from: 4, stroke: "#000" },
  { clip: "f_blank", bg: "#e8e4f2", word: "BLANK", from: 8, stroke: C.ink },
  { clip: "f_surprise", bg: C.green, word: "WHAT?", from: 0, stroke: "#000" },
  { clip: "f_many", bg: "#000", word: "MANY", from: 6, stroke: C.crimson },
];
const BarrageCut: React.FC<{ i: number }> = ({ i }) => {
  const frame = useCurrentFrame();
  const b = BARRAGE[i];
  const slide = interpolate(frame, [0, 40], [i % 2 ? -80 : 80, 0]);
  const s = interpolate(frame, [0, 6], [1.12, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: b.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: `translateX(${slide}px)` }}>
        <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: 470, color: "transparent", WebkitTextStroke: `5px ${b.stroke}`, letterSpacing: "0.04em", opacity: 0.8 }}>{b.word}</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${s})` }}>
        <Face clip={b.clip} from={b.from} h={1000} speed={1.3} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 60, bottom: 50, fontFamily: MONO, fontSize: 24, color: b.bg === "#e8e4f2" || b.bg === C.green ? "#000" : "#fff", letterSpacing: "0.2em" }}>
        EMOTE://{b.word.replace("?", "")} · 0{i + 1}/06
      </div>
    </AbsoluteFill>
  );
};
export const Barrage: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {BARRAGE.map((_, i) => (
      <Sequence key={i} from={fb(2 * i)} durationInFrames={fb(2 * i + 2) - fb(2 * i)}>
        <BarrageCut i={i} />
      </Sequence>
    ))}
    <Sequence from={fb(12)}><Flash dur={7} color="#fff" /></Sequence>
  </AbsoluteFill>
);

// ───────────────────────── S7 she talks back (chat) ─────────────────────────
const stream = (text: string, frame: number, start: number, cps: number) => text.slice(0, Math.max(0, Math.floor(((frame - start) * cps) / 30)));
const Bubble: React.FC<{ who: "you" | "capri"; text: string; at: number }> = ({ who, text, at }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const o = interpolate(frame, [at, at + 5], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [at, at + 6], [14, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const me = who === "you";
  return (
    <div style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "86%", opacity: o, transform: `translateY(${y}px)`, background: me ? "rgba(29,108,255,0.18)" : "rgba(242,21,76,0.10)", border: `1px solid ${me ? "rgba(29,108,255,0.5)" : "rgba(242,21,76,0.45)"}`, borderLeft: me ? undefined : `4px solid ${C.crimson}`, padding: "14px 18px", borderRadius: me ? "14px 14px 2px 14px" : "2px 14px 14px 14px", fontFamily: UI, fontSize: 24, lineHeight: 1.4, color: "#efeaf8", boxShadow: me ? undefined : "4px 4px 0 rgba(138,61,255,0.35)" }}>
      {!me ? <div style={{ fontFamily: MONO, fontSize: 15, color: C.crimson, letterSpacing: "0.18em", marginBottom: 6 }}>CAPRI</div> : null}
      {text}
    </div>
  );
};
const Q1 = "can you scoot over? you're covering my code";
const A1 = "Moving right over, choom—wouldn't want to block a nova function.";
const Q2 = "are you dangerous?";
const A2 = "Built as an Arasaka cyber-weapon, so technically yes, but right now I'm just here to keep your rig running smooth, choom.";
const T = { q1: 52, a1: 64, act: 108, out: 114, in: 130, q2: 160, a2: 172 };

const ChatPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [34, 48], [700, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const thinking = (frame > T.q1 + 4 && frame < T.a1) || (frame > T.q2 + 4 && frame < T.a2);
  return (
    <div style={{ position: "absolute", left: 1250, top: 150, width: 600, height: 830, transform: `translateX(${slide}px)`, background: "rgba(10,7,16,0.94)", border: "1px solid rgba(242,21,76,0.55)", boxShadow: "8px 8px 0 rgba(138,61,255,0.45), 0 30px 80px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 70, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "0 22px", gap: 14 }}>
        <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: 30, color: "#fff", letterSpacing: "0.12em" }}>CAPRI</div>
        <div style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 16, color: C.green, border: `1px solid ${C.green}`, padding: "6px 12px", letterSpacing: "0.12em", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 9, height: 9, borderRadius: 9, background: C.green, boxShadow: `0 0 10px ${C.green}` }} /> GEMINI · ONLINE
        </div>
      </div>
      <div style={{ flex: 1, padding: 22, display: "flex", flexDirection: "column", gap: 16, justifyContent: "flex-end", overflow: "hidden" }}>
        <Bubble who="you" text={Q1} at={T.q1} />
        <Bubble who="capri" text={stream(A1, frame, T.a1, 46)} at={T.a1} />
        {frame >= T.act ? (
          <div style={{ alignSelf: "flex-start", fontFamily: MONO, fontSize: 17, color: C.crimson, border: `1px dashed ${C.crimson}`, padding: "6px 12px", letterSpacing: "0.1em" }}>⟐ ACTION · teleport(where: "beside")</div>
        ) : null}
        <Bubble who="you" text={Q2} at={T.q2} />
        <Bubble who="capri" text={stream(A2, frame, T.a2, 64)} at={T.a2} />
        {thinking ? <div style={{ fontFamily: MONO, fontSize: 18, color: "#aaa", letterSpacing: "0.2em" }}>CAPRI IS THINKING{".".repeat(1 + (Math.floor(frame / 6) % 3))}</div> : null}
      </div>
      <div style={{ height: 66, margin: 16, border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", padding: "0 18px", fontFamily: UI, fontSize: 20, color: "#777" }}>
        {frame > T.q1 - 22 && frame < T.q1 ? <span style={{ color: "#ddd" }}>{stream(Q1, frame, T.q1 - 22, 70)}</span> : frame > T.q2 - 12 && frame < T.q2 ? <span style={{ color: "#ddd" }}>{stream(Q2, frame, T.q2 - 12, 60)}</span> : "Talk to Capri…"}
      </div>
    </div>
  );
};
export const TalksBack: React.FC = () => {
  const frame = useCurrentFrame();
  const titleO = interpolate(frame, [30, 40], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x1 = 330, x2 = 760;
  const talking1 = frame >= T.a1 && frame < T.act;
  return (
    <Desktop trim={8} dur={240} clock="11:52 PM">
      <Sequence durationInFrames={T.out}>
        <Seq clip={talking1 ? "talk_sit" : "sit_idle"} height={H} x={x1} y={onTaskbar(true)} from={talking1 ? 0 : 40} />
      </Sequence>
      <Sequence from={T.out} durationInFrames={16}><Seq clip="tp_out" height={H} x={x1} y={onTaskbar(true) + 10} /></Sequence>
      <Sequence from={T.in} durationInFrames={T.a2 - T.in}><Seq clip="tp_in" height={H} x={x2} y={onTaskbar(false)} /></Sequence>
      <Sequence from={T.a2}><Seq clip="talk_sit" height={H} x={x2} y={onTaskbar(true)} from={30} /></Sequence>
      <ChatPanel />
      {frame < 42 ? (
        <AbsoluteFill style={{ backgroundColor: `rgba(5,3,10,${0.7 * titleO})`, justifyContent: "center", alignItems: "center", gap: 20, opacity: titleO }}>
          <Slam text="SHE TALKS BACK." size={140} />
          <Tag text="REAL REPLIES · POWERED BY GOOGLE GEMINI" color={C.green} />
        </AbsoluteFill>
      ) : null}
    </Desktop>
  );
};

// ───────────────────────── S8 build: "she's not a program" ─────────────────────────
const SWARM = [
  [180, 120, 360], [1400, 90, 330], [760, 640, 300], [80, 640, 300], [1500, 620, 340], [520, 60, 260], [1120, 380, 280], [300, 380, 240], [1660, 360, 220],
];
export const NotAProgram: React.FC = () => {
  const frame = useCurrentFrame();
  const a = 80, b = 166, c = 178;
  const cutsAt = [0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.25, 5.5].map((k) => c + fb(k * 0.6));
  const cutClips = ["f_menace", "f_maniac", "f_surprise", "f_many", "f_blank", "f_tilt", "f_menace", "f_many", "f_maniac", "f_many"] as const;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence durationInFrames={a}>
        <AbsoluteFill style={{ opacity: 0.22 }}><Face clip="f_blank" from={10} h={1300} speed={0.6} /></AbsoluteFill>
        <Glow opacity={0.25} size={60} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <Decode text="SHE'S NOT A PROGRAM." size={118} delay={4} speed={0.8} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={a} durationInFrames={b - a}>
        <Push dur={b - a} from={1.0} to={1.12}>
          <Glow opacity={0.6} size={45} />
          <Face clip="f_many" speed={0.8} />
          {SWARM.map(([x, y, h], k) => (
            <Sequence key={k} from={20 + k * 6}>
              <Seq clip="f_many" height={h} x={x} y={y} from={20 + k * 3} speed={0.8} glow="rgba(242,21,76,0.5)" style={{ opacity: 0.85, ...SOFT }} />
            </Sequence>
          ))}
        </Push>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.8) 100%)" }} />
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 120 }}>
          <Slam text="SHE'S MANY." size={150} delay={4} />
        </AbsoluteFill>
      </Sequence>
      {cutsAt.map((at, i) => (
        <Sequence key={i} from={at} durationInFrames={(cutsAt[i + 1] ?? f(64.16 - 56) - 4) - at}>
          <AbsoluteFill style={{ backgroundColor: i % 2 ? C.crimson : "#000" }}>
            <Face clip={cutClips[i]} from={20} h={i % 3 === 0 ? 1500 : 1150} />
            {i < 3 ? <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 110 }}><Slam text={["SHE'S", "NOT", "ALONE."][i]} size={130} /></AbsoluteFill> : null}
          </AbsoluteFill>
        </Sequence>
      ))}
            {frame >= f(64.16 - 56) - 4 ? <AbsoluteFill style={{ backgroundColor: "#fff" }} /> : null}
    </AbsoluteFill>
  );
};

// ───────────────────────── S9 drop 2: hype ─────────────────────────
const HYPE: { kind: "full" | "face"; clip: Parameters<typeof Seq>[0]["clip"]; from: number; bg: string | null }[] = [
  { kind: "full", clip: "tp_in", from: 0, bg: "cyber_scape.mp4" },
  { kind: "face", clip: "f_maniac", from: 10, bg: null },
  { kind: "full", clip: "menace_full", from: 6, bg: "neon_scape.mp4" },
  { kind: "face", clip: "f_wink", from: 6, bg: null },
  { kind: "full", clip: "dash", from: 0, bg: "cyber_city.mp4" },
  { kind: "full", clip: "reach", from: 8, bg: "aerial_fog.mp4" },
  { kind: "face", clip: "f_surprise", from: 0, bg: null },
  { kind: "full", clip: "power", from: 30, bg: "cyber_scape.mp4" },
];
const BigFull: React.FC<{ clip: Parameters<typeof Seq>[0]["clip"]; from?: number; h?: number }> = ({ clip, from = 0, h = 1040 }) => (
  <Seq clip={clip} height={h} x={(1920 - seqWidth(clip, h)) / 2} y={1080 - h + 20} from={from} glow="rgba(242,21,76,0.6)" />
);
export const Hype: React.FC = () => {
  const B = (n: number) => Math.round(n * BARF);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence durationInFrames={B(1)}>
        <Footage src="cyber_scape.mp4" trimBefore={2} grade="saturate(1.4) contrast(1.2) brightness(0.6)" tint={C.crimson} tintOpacity={0.35} dur={B(1)} push={[1.0, 1.15]} />
        <Glow opacity={0.5} />
        <BigFull clip="power" />
        <Flash dur={10} />
      </Sequence>
      <Sequence from={B(1)} durationInFrames={B(2) - B(1)}>
        <Footage src="cyber_city.mp4" trimBefore={24} grade="saturate(1.4) contrast(1.2) brightness(0.55)" tint={C.violet} tintOpacity={0.3} dur={B(1)} push={[1.15, 1.0]} />
        <Glow opacity={0.5} color={C.violet} />
        <BigFull clip="reveal_in" from={12} />
      </Sequence>
      <Sequence from={B(2)} durationInFrames={B(3) - B(2)}>
        <Footage src="neon_scape.mp4" trimBefore={4} grade="saturate(1.4) contrast(1.2) brightness(0.6)" dur={B(1)} push={[1.0, 1.2]} />
        <Glow opacity={0.45} color={C.blue} />
        <BigFull clip="contra_wave" from={2} />
      </Sequence>
      {HYPE.map((h, i) => {
        const at = B(3) + fb(i);
        return (
          <Sequence key={i} from={at} durationInFrames={B(3) + fb(i + 1) - at}>
            {h.bg ? <Footage src={h.bg} trimBefore={6 + i * 2} grade="saturate(1.5) contrast(1.3) brightness(0.55)" tint={i % 2 ? C.violet : C.crimson} tintOpacity={0.35} dur={20} push={[1.2, 1.05]} /> : <AbsoluteFill style={{ backgroundColor: i % 2 ? C.crimson : C.violet }} />}
            {h.kind === "face" ? <Face clip={h.clip} from={h.from} h={1200} speed={1.4} /> : <BigFull clip={h.clip} from={h.from} h={h.clip === "dash" ? 800 : 1040} />}
            <Flash dur={4} peak={0.5} />
          </Sequence>
        );
      })}
      <Sequence from={B(5)} durationInFrames={B(7) - B(5)}>
        <TitleCard />
      </Sequence>
      <Sequence from={B(7)}>
        <Desktop trim={30} dur={B(1)}>
          <Seq clip="sit_smug" height={H + 60} x={1200} y={TASKBAR_TOP - SEAT * (H + 60)} />
          <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(5,3,10,0.85) 0%, rgba(5,3,10,0) 60%)" }} />
          <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 130, gap: 18 }}>
            <Tag text="// WINDOWS 11 · DESKTOP COMPANION" />
            <Slam text={"SHE LIVES ON\nYOUR DESKTOP."} size={124} />
          </AbsoluteFill>
        </Desktop>
      </Sequence>
    </AbsoluteFill>
  );
};

const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const spread = interpolate(frame, [0, 140], [0.34, 0.2], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Keyart blur={4} dim={0.4} />
      <Glow opacity={0.65} y="40%" size={50} />
      <AbsoluteFill style={{ opacity: 0.9 }}>
        <BigFull clip="power" from={20} h={1080} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 55%)" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 130, gap: 8 }}>
        <Decode text="CAPRI" size={330} spacing={spread} speed={0.5} delay={2} style={{ textShadow: `8px 8px 0 ${C.crimson}, -5px -4px 0 rgba(138,61,255,0.8)` }} />
        <Typed text="YOUR DESKTOP. HER RULES." color={C.green} size={40} delay={40} cps={30} style={{ background: "rgba(0,0,0,0.6)", padding: "6px 16px" }} />
      </AbsoluteFill>
      <Flash dur={10} />
    </AbsoluteFill>
  );
};

// ───────────────────────── S10 end card ─────────────────────────
export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const start = 15;
  const fadeOut = interpolate(frame, [f(7.2), f(8.0)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const credits = interpolate(frame, [start + 30, start + 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame < start) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  const h = 360;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", opacity: fadeOut }}>
      <Keyart blur={14} dim={0.22} />
      <Glow opacity={0.4} y="40%" size={45} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
        <div style={{ position: "relative" }}>
          <Sequence from={start + 8} layout="none">
            <Seq clip="sit_idle" height={h} x={560} y={-SEAT * h + 95} from={30} glow="rgba(242,21,76,0.55)" />
          </Sequence>
          <Slam text="CAPRI" size={250} delay={start} style={{ letterSpacing: "0.22em", paddingLeft: "0.22em" }} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 140, gap: 22, opacity: credits }}>
        <div style={{ fontFamily: MONO, fontSize: 24, color: "#cfc9de", letterSpacing: "0.3em" }}>AN UNOFFICIAL FAN PROJECT BASED ON</div>
        <Img src={staticFile("img/logo_edgerunners2.png")} style={{ height: 120 }} />
        <div style={{ fontFamily: UI, fontSize: 16, color: "#8d86a0", marginTop: 18, letterSpacing: "0.04em" }}>
          Not affiliated with or endorsed by CD PROJEKT RED, Studio Trigger or Netflix. Cyberpunk and Edgerunners are their trademarks.
        </div>
      </AbsoluteFill>
      <Flash at={start} dur={14} />
    </AbsoluteFill>
  );
};
