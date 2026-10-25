// Shared building blocks for the trailer: timing grid, footage, type, overlays.
import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Video } from "@remotion/media";
import { loadFont as loadChakra } from "@remotion/google-fonts/ChakraPetch";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import manifest from "../public/cap/manifest.json";

export const TITLE = loadChakra("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;
export const UI = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;

// ---- timing: the score is 98 BPM; trailer time in seconds ----
export const FPS = 30;
export const BEAT = 60 / 98;
export const BAR = BEAT * 4;
export const DROP1 = 11.04;
export const DROP2 = 64.16;
export const TOTAL = 92;
export const f = (s: number) => Math.round(s * FPS);
/** start of bar n counted from the first drop */
export const bar = (n: number) => DROP1 + n * BAR;

export const C = {
  ink: "#0a0710",
  crimson: "#f2154c",
  green: "#22f27a",
  violet: "#8a3dff",
  blue: "#1d6cff",
  yellow: "#fcee0a",
  white: "#f4f1ff",
};

// ---- captured rig footage (frame sequences) ----
type Clip = keyof typeof manifest;
export const clipInfo = (c: Clip) => manifest[c];

/** Plays a captured image sequence of the real rig. `height` sets the on-screen size. */
export const Seq: React.FC<{
  clip: Clip;
  height: number;
  x?: number;
  y?: number;
  from?: number;
  speed?: number;
  loop?: boolean;
  flip?: boolean;
  glow?: string;
  style?: React.CSSProperties;
}> = ({ clip, height, x = 0, y = 0, from = 0, speed = 1, loop = false, flip = false, glow = "rgba(242,21,76,0.45)", style }) => {
  const frame = useCurrentFrame();
  const info = manifest[clip];
  let i = from + Math.floor(frame * speed);
  i = loop ? i % info.frames : Math.min(i, info.frames - 1);
  const w = (height * info.width) / info.height;
  return (
    <Img
      src={staticFile(`cap/${clip}/${String(i).padStart(4, "0")}.webp`)}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height,
        transform: flip ? "scaleX(-1)" : undefined,
        filter: glow ? `drop-shadow(0 0 24px ${glow})` : undefined,
        ...style,
      }}
    />
  );
};
export const seqWidth = (clip: Clip, height: number) => (height * manifest[clip].width) / manifest[clip].height;

// ---- stock footage with a cyberpunk grade ----
export const Footage: React.FC<{
  src: string;
  trimBefore?: number;
  rate?: number;
  grade?: string;
  tint?: string;
  tintMode?: React.CSSProperties["mixBlendMode"];
  tintOpacity?: number;
  push?: [number, number];
  dur?: number;
}> = ({ src, trimBefore = 0, rate = 1, grade = "saturate(1.25) contrast(1.15) brightness(0.75)", tint, tintMode = "color", tintOpacity = 0.55, push = [1.04, 1.12], dur = 90 }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, dur], push, { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: C.ink }}>
      <AbsoluteFill style={{ transform: `scale(${s})`, filter: grade }}>
        <Video src={staticFile(`video/${src}`)} muted trimBefore={f(trimBefore)} playbackRate={rate} objectFit="cover" style={{ width: "100%", height: "100%" }} />
      </AbsoluteFill>
      {tint ? <AbsoluteFill style={{ backgroundColor: tint, mixBlendMode: tintMode, opacity: tintOpacity }} /> : null}
    </AbsoluteFill>
  );
};

// ---- type ----
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@*/<>[]=+";

/** Text that decodes from scrambled glyphs, one character at a time, cyberpunk-style. */
export const Decode: React.FC<{
  text: string;
  size: number;
  color?: string;
  font?: string;
  weight?: number;
  spacing?: number;
  delay?: number;
  speed?: number;
  seed?: string;
  style?: React.CSSProperties;
  out?: number;
}> = ({ text, size, color = C.white, font = TITLE, weight = 700, spacing = 0.06, delay = 0, speed = 1.2, seed = text, style, out }) => {
  const frame = useCurrentFrame() - delay;
  const fadeOut = out === undefined ? 1 : interpolate(frame + delay, [out - 4, out], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ fontFamily: font, fontWeight: weight, fontSize: size, color, letterSpacing: `${spacing}em`, whiteSpace: "pre", lineHeight: 1, opacity: fadeOut, ...style }}>
      {text.split("").map((ch, i) => {
        const at = i / speed + random(`${seed}-a${i}`) * 4;
        if (ch === " ") return <span key={i}> </span>;
        if (frame < at) return <span key={i} style={{ opacity: 0 }}>{ch}</span>;
        const settled = frame > at + 5;
        const g = settled ? ch : GLYPHS[Math.floor(random(`${seed}-${i}-${Math.floor(frame / 2)}`) * GLYPHS.length)];
        return (
          <span key={i} style={{ color: settled ? undefined : C.crimson, opacity: settled ? 1 : 0.8 }}>
            {g}
          </span>
        );
      })}
    </div>
  );
};

/** Monospace HUD line typed out with a block cursor. */
export const Typed: React.FC<{ text: string; size?: number; color?: string; delay?: number; cps?: number; cursor?: boolean; style?: React.CSSProperties }> = ({
  text, size = 34, color = C.green, delay = 0, cps = 40, cursor = true, style,
}) => {
  const frame = useCurrentFrame() - delay;
  if (frame < 0) return null;
  const n = Math.min(text.length, Math.floor((frame * cps) / FPS));
  const blink = Math.floor(frame / 8) % 2 === 0;
  return (
    <div style={{ fontFamily: MONO, fontSize: size, color, letterSpacing: "0.04em", whiteSpace: "pre", ...style }}>
      {text.slice(0, n)}
      {cursor && (n < text.length || blink) ? <span style={{ background: color, color: "transparent" }}>_</span> : null}
    </div>
  );
};

/** Big flat title card text with an offset crimson/violet shadow, like the app's outline. */
export const Slam: React.FC<{ text: string; size?: number; color?: string; style?: React.CSSProperties; delay?: number }> = ({ text, size = 150, color = C.white, style, delay = 0 }) => {
  const frame = useCurrentFrame() - delay;
  if (frame < 0) return null;
  const s = interpolate(frame, [0, 5], [1.25, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const o = interpolate(frame, [0, 2], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: size, color, letterSpacing: "0.02em", lineHeight: 0.95, transform: `scale(${s})`, opacity: o, textShadow: `6px 6px 0 ${C.crimson}, -4px -3px 0 rgba(138,61,255,0.7)`, whiteSpace: "pre", ...style }}>
      {text}
    </div>
  );
};

// ---- overlays ----
export const Letterbox: React.FC<{ h?: number }> = ({ h = 132 }) => (
  <>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: h, background: "#000" }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h, background: "#000" }} />
  </>
);

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.11 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%" viewBox="0 0 960 540" preserveAspectRatio="none">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 97} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="960" height="540" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.16 }) => (
  <AbsoluteFill style={{ opacity, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 1px, transparent 2px, transparent 4px)" }} />
);

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.75 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${strength}) 100%)` }} />
);

/** A flash that decays from `at` (frames, local). */
export const Flash: React.FC<{ at?: number; dur?: number; color?: string; peak?: number }> = ({ at = 0, dur = 8, color = "#fff", peak = 1 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + dur], [peak, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  if (frame < at || o <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: color, opacity: o, pointerEvents: "none" }} />;
};

/** Whole-frame digital glitch: blocky horizontal tearing plus RGB split. Intensity 0 disables it. */
export const Glitch: React.FC<{ amount: number; children: React.ReactNode }> = ({ amount, children }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  if (amount <= 0.001) return <AbsoluteFill>{children}</AbsoluteFill>;
  const tear = amount * 140;
  const ca = 3 + amount * 18;
  const id = `glitch-${frame}`;
  return (
    <AbsoluteFill>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={`0.00001 ${0.012 + random(`gf${frame}`) * 0.03}`} numOctaves={1} seed={frame} result="n" />
          <feComponentTransfer in="n" result="q">
            <feFuncR type="discrete" tableValues="0.5 0.5 0.1 0.5 0.9 0.5 0.5 0.3 0.5 0.7" />
          </feComponentTransfer>
          <feColorMatrix in="q" type="matrix" values="1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 1" result="m" />
          <feDisplacementMap in="SourceGraphic" in2="m" scale={tear} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feColorMatrix in="d" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx={ca} result="ro" />
          <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="b" dx={-ca} result="bo" />
          <feBlend in="ro" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="bo" mode="screen" />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})`, width }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Slow camera push for a held shot. */
export const Push: React.FC<{ dur: number; from?: number; to?: number; children: React.ReactNode; origin?: string }> = ({ dur, from = 1, to = 1.08, children, origin = "50% 50%" }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, dur], [from, to], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: origin }}>{children}</AbsoluteFill>;
};

/** Small mono label in the app's HUD style, e.g. "// 01 · TELEPORT". */
export const Tag: React.FC<{ text: string; color?: string; style?: React.CSSProperties }> = ({ text, color = C.green, style }) => (
  <div style={{ fontFamily: MONO, fontSize: 26, color, letterSpacing: "0.18em", display: "flex", alignItems: "center", gap: 14, ...style }}>
    <span style={{ width: 12, height: 12, background: color, display: "inline-block", boxShadow: `0 0 12px ${color}` }} />
    {text}
  </div>
);
