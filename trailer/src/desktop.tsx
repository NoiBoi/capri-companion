// A stylised Windows 11 desktop for the "she lives on your desktop" shots.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, Footage, MONO, UI } from "./lib";

export const TASKBAR_H = 64;
export const TASKBAR_TOP = 1080 - TASKBAR_H;
/** Seat line within a captured full-body frame (rig SEAT_RATIO = 500/520). */
export const SEAT = 500 / 520;

const Taskbar: React.FC<{ clock?: string }> = ({ clock = "11:47 PM" }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: TASKBAR_H, background: "rgba(16,12,24,0.86)", borderTop: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
    {[C.blue, "#e8e8e8", "#ffb000", C.green, C.violet, "#ff5f2e"].map((c, i) => (
      <div key={i} style={{ width: 40, height: 40, borderRadius: 8, background: i === 0 ? "transparent" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {i === 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
            {[0, 1, 2, 3].map((k) => <div key={k} style={{ width: 12, height: 12, background: c, borderRadius: 1 }} />)}
          </div>
        ) : (
          <div style={{ width: 22, height: 22, borderRadius: 5, background: c, opacity: 0.85 }} />
        )}
      </div>
    ))}
    <div style={{ position: "absolute", right: 28, color: "#eee", fontFamily: UI, fontSize: 17, textAlign: "right", lineHeight: 1.3 }}>
      {clock}
      <div style={{ fontSize: 14, opacity: 0.8 }}>10/24/2026</div>
    </div>
  </div>
);

const CODE = [
  ["const", " rig ", "= ", "new", " Rig(canvas);"],
  ["rig", ".", "pose", "(", "'sit_edge'", ");"],
  ["// TODO: why is she on my taskbar"],
  ["await", " capri.", "teleport", "({ where: ", "'perch'", " });"],
  ["if", " (ai.", "connected", ") ", "autoTick", "();"],
  ["export", " default", " function", " main() {"],
  ["  return", " render(", "frame", ");"],
  ["}"],
];
const TOK = [C.violet, "#d8d8e0", "#7fb4ff", "#d8d8e0", "#ffb86b", "#d8d8e0"];

export const EditorWindow: React.FC<{ x: number; y: number; w: number; h: number }> = ({ x, y, w, h }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: "#14111c", borderRadius: 10, boxShadow: "0 30px 80px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
    <div style={{ height: 40, background: "#1c1826", display: "flex", alignItems: "center", padding: "0 16px", fontFamily: UI, fontSize: 15, color: "#aaa", gap: 18 }}>
      <span style={{ color: "#ddd" }}>main.ts — capri</span>
      <span style={{ marginLeft: "auto", letterSpacing: 18 }}>—  ▢  ✕</span>
    </div>
    <div style={{ padding: "22px 28px", fontFamily: MONO, fontSize: 22, lineHeight: 1.75 }}>
      {CODE.map((line, i) => (
        <div key={i} style={{ whiteSpace: "pre" }}>
          <span style={{ color: "#555", marginRight: 26 }}>{String(i + 1).padStart(2, " ")}</span>
          {line.map((t, k) => (
            <span key={k} style={{ color: line.length === 1 && t.startsWith("//") ? "#6a9955" : TOK[k % TOK.length] }}>{t}</span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/** Desktop shell: moving neon wallpaper + taskbar. Children render above the wallpaper, below the taskbar unless `over`. */
export const Desktop: React.FC<{ children?: React.ReactNode; over?: React.ReactNode; wallpaper?: string; trim?: number; dur?: number; clock?: string }> = ({ children, over, wallpaper = "cyber_city.mp4", trim = 4, dur = 150, clock }) => {
  const frame = useCurrentFrame();
  const intro = interpolate(frame, [0, 6], [0.92, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <AbsoluteFill style={{ opacity: intro }}>
        <Footage src={wallpaper} trimBefore={trim} grade="saturate(1.1) contrast(1.05) brightness(0.55) blur(2px)" push={[1.05, 1.07]} dur={dur} />
      </AbsoluteFill>
      {children}
      <Taskbar clock={clock} />
      {over}
    </AbsoluteFill>
  );
};
