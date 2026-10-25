// Capri product trailer: one continuous take of the real app on a real Windows desktop
// (scripts/record-demo.mjs), cut into six beats. Nothing is composited onto the footage except
// the camera move, short captions, cut glitches and the closing wordmark. Cut points come from
// the recorder's marks, so a new take re-times the edit by itself.
import React from "react";
import { AbsoluteFill, Easing, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio, Video } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/Inter";
import marks from "../public/demo/marks.json";

const { fontFamily } = loadFont("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
const FPS = 30;
const W = 1920, H = 1080;
const C = { bg: "#0c0b0f", text: "#f4f2f7", muted: "#8d8896", accent: "#f2154c" };
type Rect = [number, number, number, number];
const { layout: L, ...times } = marks as unknown as Record<string, number> & { layout: Record<string, { her: Rect; panel: Rect | null }> };
const M = times as Record<string, number>;

type Cam = { z: number; x: number; y: number }; // zoom and the footage point to centre
type Clip = { src: number; dur: number }; // seconds into the take, seconds long
type Beat = { clips: Clip[]; cam: [Cam, Cam]; caption?: string; side?: "left" | "right"; sfx?: { name: string; at: number; volume: number }[] };

// The camera aims at where things really were in the take (the recorder saves her window and the
// panel at each beat), so a new take frames itself. Her body sits around the middle of her window.
const her = (k: string): Rect => { const [x, y, w, h] = L[k].her; return [x + w * 0.18, y + h * 0.12, w * 0.64, h * 0.78]; };
const union = (...rs: Rect[]): Rect => {
  const x0 = Math.min(...rs.map((r) => r[0])), y0 = Math.min(...rs.map((r) => r[1]));
  const x1 = Math.max(...rs.map((r) => r[0] + r[2])), y1 = Math.max(...rs.map((r) => r[1] + r[3]));
  return [x0, y0, x1 - x0, y1 - y0];
};
/** Camera that fits a rectangle (plus margin), capped at a zoom. */
const fit = (r: Rect, maxZ: number, margin = 1.12): Cam => ({ z: Math.max(1, Math.min(maxZ, W / (r[2] * margin), H / (r[3] * margin))), x: r[0] + r[2] / 2, y: r[1] + r[3] / 2 });
const FULL: Cam = { z: 1, x: W / 2, y: H / 2 };
const awayFrom = (r: Rect) => (r[0] + r[2] / 2 < W / 2 ? "right" : "left");
const CALC: Rect = [40, 20, 480, 660]; // Windows Calculator opens at the top-left of the primary display

const BEATS: Beat[] = [
  // she arrives at the edge of the desktop
  { clips: [{ src: M.launch - 0.2, dur: 4 }], cam: [FULL, fit(her("cursor"), 1.9)], caption: "She lives on your desktop.", side: awayFrom(her("cursor")),
    sfx: [{ name: "glitch1", at: 0.6, volume: 0.35 }] },
  // idle life: she follows the cursor around her (it swings ~330 px either side of her window)
  { clips: [{ src: M.cursor, dur: 5 }], cam: [fit(union(L.cursor.her, [L.cursor.her[0] - 340, L.cursor.her[1], 10, 10]), 1.7), fit(her("cursor"), 1.9)], caption: "Always watching.", side: awayFrom(her("cursor")) },
  // a real conversation (Gemini, streamed): the panel, typing included, and her
  { clips: [{ src: M.chat - 0.3, dur: 7 }], cam: [fit(union(L.chat.panel!, her("chat")), 1.6, 1.08), fit(union(L.chat.panel!, her("chat")), 1.6, 1.02)], caption: "Talk to her.", side: "left" },
  // asked to move, she teleports: the real window crosses the screen
  { clips: [{ src: M.ask_move - 0.2, dur: 7 }], cam: [{ ...FULL, z: 1.06 }, FULL], caption: "Ask her to move.", side: awayFrom(her("moved")),
    sfx: [{ name: "teleport_whoosh", at: M.moved - 0.45 - (M.ask_move - 0.2), volume: 0.7 }] },
  // a real desktop action, through the permission prompt
  { clips: [{ src: M.ask_app - 0.2, dur: 2.8 }, { src: M.allow - 1.4, dur: 4.2 }], cam: [fit(union(L.moved.panel!, her("moved")), 1.5), fit(union(L.moved.panel!, her("moved"), CALC), 1.5, 1.04)],
    caption: "Real actions. She asks first.", side: "right", sfx: [{ name: "hud_ping", at: 2.8 + 1.4, volume: 0.5 }] },
  // back to idle, then the wordmark
  { clips: [{ src: M.idle + 0.6, dur: 5 }], cam: [fit(her("idle"), 1.5, 1.6), fit(her("idle"), 2.2, 1.2)],
    sfx: [{ name: "braam", at: 1.4, volume: 0.55 }] },
];
const beatLen = (b: Beat) => b.clips.reduce((s, c) => s + c.dur, 0);
export const TRAILER_FRAMES = Math.round(BEATS.reduce((s, b) => s + beatLen(b), 0) * FPS);
const f = (s: number) => Math.round(s * FPS);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Camera over the full-frame footage: zoom toward a point, never showing past the frame edge. */
const Camera: React.FC<{ cam: [Cam, Cam]; len: number; children: React.ReactNode }> = ({ cam, len, children }) => {
  const fr = useCurrentFrame();
  const t = interpolate(fr, [0, len], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const z = interpolate(t, [0, 1], [cam[0].z, cam[1].z]);
  const x = interpolate(t, [0, 1], [cam[0].x, cam[1].x]);
  const y = interpolate(t, [0, 1], [cam[0].y, cam[1].y]);
  const tx = Math.min(0, Math.max(W - W * z, W / 2 - x * z));
  const ty = Math.min(0, Math.max(H - H * z, H / 2 - y * z));
  return <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) scale(${z})`, transformOrigin: "0 0" }}>{children}</AbsoluteFill>;
};

const Caption: React.FC<{ text: string; len: number; side: "left" | "right" }> = ({ text, len, side }) => {
  const fr = useCurrentFrame();
  const inn = interpolate(fr, [8, 18], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const out = interpolate(fr, [len - 16, len - 6], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: side === "left" ? "flex-start" : "flex-end", padding: "0 112px 96px", pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: Math.min(inn, out), transform: `translateY(${(1 - inn) * 18}px)` }}>
        <div style={{ width: 6, height: 58, background: C.accent, transform: "skewX(-18deg)" }} />
        <div style={{ fontFamily, fontWeight: 600, fontSize: 62, letterSpacing: "-0.01em", color: C.text, background: "rgba(12,11,15,0.86)", padding: "10px 22px 14px" }}>{text}</div>
      </div>
    </AbsoluteFill>
  );
};

/** A few frames of her own glitch on each cut: torn horizontal slices and a red line. */
const CutGlitch: React.FC<{ seed: number }> = ({ seed }) => {
  const fr = useCurrentFrame();
  if (fr > 5) return null;
  const k = 1 - fr / 6;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 7 }, (_, i) => {
        const y = random(`${seed}-y-${i}-${fr}`) * H;
        const h = 4 + random(`${seed}-h-${i}`) * 38;
        const dx = (random(`${seed}-x-${i}-${fr}`) - 0.5) * 220 * k;
        return <div key={i} style={{ position: "absolute", left: dx, top: y, width: W, height: h, background: i % 3 === 0 ? C.accent : "rgba(12,11,15,0.9)", opacity: 0.85 * k }} />;
      })}
      <div style={{ position: "absolute", left: 0, top: random(`${seed}-line-${fr}`) * H, width: W, height: 3, background: C.accent, opacity: k }} />
    </AbsoluteFill>
  );
};

const Wordmark: React.FC<{ from: number }> = ({ from }) => {
  const fr = useCurrentFrame() - from;
  const dim = interpolate(fr, [0, 12], [0, 0.92], clamp);
  const show = interpolate(fr, [6, 16], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const glitch = fr >= 6 && fr < 10 ? (random(`wm-${fr}`) - 0.5) * 40 : 0;
  return (
    <AbsoluteFill style={{ background: `rgba(12,11,15,${dim})`, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34, opacity: show, transform: `translateX(${glitch}px)` }}>
        <div style={{ width: 14, height: 120, background: C.accent, transform: "skewX(-20deg)" }} />
        <div style={{ fontFamily, fontWeight: 700, fontSize: 132, letterSpacing: "0.32em", color: C.text, marginRight: "-0.32em" }}>CAPRI</div>
      </div>
    </AbsoluteFill>
  );
};

export const Trailer: React.FC = () => {
  let at = 0;
  const seqs = BEATS.map((b, i) => {
    const len = beatLen(b);
    const start = at;
    at += len;
    let inner = 0;
    return (
      <Sequence key={i} from={f(start)} durationInFrames={f(len)} name={`beat ${i + 1}`}>
        <Camera cam={b.cam} len={f(len)}>
          {b.clips.map((c, j) => {
            const from = inner;
            inner += c.dur;
            return (
              <Sequence key={j} from={f(from)} durationInFrames={f(c.dur)}>
                <Video src={staticFile("demo/desktop.mp4")} muted trimBefore={f(c.src)} style={{ width: W, height: H }} />
              </Sequence>
            );
          })}
        </Camera>
        {b.clips.slice(1).map((_, j) => <Sequence key={`g${j}`} from={f(b.clips.slice(0, j + 1).reduce((s, c) => s + c.dur, 0))}><CutGlitch seed={i * 10 + j} /></Sequence>)}
        {i > 0 ? <CutGlitch seed={i} /> : null}
        {b.caption ? <Caption text={b.caption} len={f(len)} side={b.side ?? "left"} /> : null}
        {(b.sfx ?? []).map((s, j) => (
          <Sequence key={`s${j}`} from={f(s.at)}><Audio src={staticFile(`audio/sfx/${s.name}.mp3`)} volume={s.volume} /></Sequence>
        ))}
        {i > 0 ? <Audio src={staticFile("audio/sfx/glitch1.mp3")} volume={0.18} /> : null}
        {i === BEATS.length - 1 ? <Wordmark from={f(1.4)} /> : null}
      </Sequence>
    );
  });
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {seqs}
      <Audio src={staticFile("audio/score.mp3")} volume={(fr) => 0.6 * interpolate(fr, [0, 20, TRAILER_FRAMES - 40, TRAILER_FRAMES], [0, 1, 1, 0], clamp)} />
    </AbsoluteFill>
  );
};
