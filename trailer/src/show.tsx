// Building blocks for the recut: real show shots, real cut-outs of her, and the red zap bolt.
import React from "react";
import { AbsoluteFill, Img, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Video } from "@remotion/media";
import poses from "../../assets/capri/poses.json";
import { C, FPS } from "./lib";

// ---------------------------------------------------------------- show footage
export type Src = "o" | "n" | "e"; // o = Netflix "The Moment D Meets Capri"; n, e = compilations of Netflix footage
export type Shot = [Src, number, number]; // source, from (s), to (s)

/**
 * One shot of the real show, fitted to a slot: plays at normal speed, or slowed down when the shot is
 * shorter than the slot. The compilation clips carry a credit watermark in the bottom corners, so they are
 * framed from the top with a zoom that keeps it out of picture.
 */
export const ShowShot: React.FC<{ shot: Shot; slot: number; push?: [number, number]; origin?: string; grade?: string; rate?: number }> = ({ shot, slot, push, origin, grade = "saturate(1.15) contrast(1.08)", rate }) => {
  const frame = useCurrentFrame();
  const [src, from, to] = shot;
  const r = rate ?? Math.max(0.35, Math.min(1, (to - from) / (slot / FPS)));
  const wm = src !== "o";
  const [z0, z1] = push ?? [wm ? 1.2 : 1.02, wm ? 1.26 : 1.1];
  const z = interpolate(frame, [0, slot], [z0, z1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: origin ?? (wm ? "50% 0%" : "50% 50%"), filter: grade }}>
        <Video src={staticFile(`show/${src}.mp4`)} muted trimBefore={Math.round(from * FPS)} playbackRate={r} objectFit="cover" style={{ width: "100%", height: "100%" }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** A run of shots, each lasting `each` frames (or its own length), hard-cut. */
export const Cuts: React.FC<{ shots: (Shot | [Shot, number])[]; each: number; push?: [number, number] }> = ({ shots, each, push }) => {
  let at = 0;
  return (
    <>
      {shots.map((s, i) => {
        const [shot, len] = Array.isArray(s[0]) ? (s as [Shot, number]) : [s as Shot, each];
        const el = (
          <Sequence key={i} from={at} durationInFrames={len} premountFor={20}>
            <ShowShot shot={shot} slot={len} push={push} />
          </Sequence>
        );
        at += len;
        return el;
      })}
    </>
  );
};

// ---------------------------------------------------------------- cut-outs of her (same pack the app uses)
type Pose = { frames: { file: string; hold: number }[]; anchor: [number, number]; facing: number; kind: string; size: number };
const P = poses as unknown as Record<string, Pose>;
export type PoseName = keyof typeof poses;

/** One real-footage pose, playing its original drawings with their holds (24 fps), placed by its anchor. */
export const Cutout: React.FC<{ pose: PoseName; x: number; y: number; h: number; flip?: boolean; from?: number; glow?: boolean }> = ({ pose, x, y, h, flip, from = 0, glow = true }) => {
  const frame = useCurrentFrame() + from;
  const p = P[pose];
  const total = p.frames.reduce((s, f) => s + f.hold, 0);
  let t = Math.floor((frame * 24) / FPS) % total, i = 0;
  while (t >= p.frames[i].hold) { t -= p.frames[i].hold; i++; }
  const bob = Math.sin(frame / 14) * h * 0.006;
  return (
    <Img
      src={staticFile(`capri/${p.frames[i].file}`)}
      style={{
        position: "absolute", height: h, left: x, top: y + bob,
        transform: `translate(-${p.anchor[0] * 100}%, -${p.anchor[1] * 100}%) scaleX(${flip ? -1 : 1})`,
        filter: glow ? "drop-shadow(0 0 22px rgba(242,21,76,0.55)) drop-shadow(-4px 4px 0 rgba(138,61,255,0.6))" : undefined,
      }}
    />
  );
};

// ---------------------------------------------------------------- the red zap bolt (same look as the app's teleport)
export const Zap: React.FC<{ a: [number, number]; b: [number, number]; dur: number; seed: string }> = ({ a, b, dur, seed }) => {
  const frame = useCurrentFrame();
  if (frame < 0 || frame >= dur) return null;
  const n = 24, k = frame / dur;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n, j = i && i < n ? (random(`${seed}-${i}-${Math.floor(frame / 2)}`) * 2 - 1) * Math.min(60, L * 0.06) : 0;
    return [a[0] + dx * u + nx * j, a[1] + dy * u + ny * j];
  });
  const head = Math.min(1, k / 0.4), tail = Math.max(0, (k - 0.3) / 0.7);
  const seg = pts.slice(Math.floor(tail * n), Math.ceil(head * n) + 1).map((p) => p.join(",")).join(" ");
  return (
    <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <polyline points={seg} fill="none" stroke="rgba(242,21,76,0.35)" strokeWidth={34} strokeLinejoin="miter" style={{ filter: "blur(10px)" }} />
      <polyline points={seg} fill="none" stroke={C.crimson} strokeWidth={11} strokeLinejoin="miter" style={{ filter: "drop-shadow(0 0 14px #f2154c)" }} />
      <polyline points={seg} fill="none" stroke="#fff" strokeWidth={3.5} strokeLinejoin="miter" />
    </svg>
  );
};

/** Her glitch-out drawings (from the show) flashed in place for a few frames, for departures/arrivals. */
export const GlitchOut: React.FC<{ x: number; y: number; h: number; seed: string }> = ({ x, y, h, seed }) => {
  const frame = useCurrentFrame();
  const g = P.glitch;
  const i = Math.floor(random(`${seed}-${frame}`) * g.frames.length);
  return <Img src={staticFile(`capri/${g.frames[i].file}`)} style={{ position: "absolute", left: x, top: y, height: h, transform: "translate(-50%, -60%)", filter: "drop-shadow(0 0 18px rgba(34,242,122,0.5))" }} />;
};
