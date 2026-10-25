import { Mat, bend, clamp, lerp, limb, offset, prng, toPath, type Poly, type Pt } from './geometry';
import { PALETTE as C } from './palette';
import type { Params } from './params';
import * as R from './rigData';

type Ctx = CanvasRenderingContext2D;

export interface DrawOptions {
  glitchEnabled: boolean;
  micActive: boolean;
  interactHint: boolean;
  scale: number; // logical px per rig unit
}

/** Underdamped spring for hair secondary motion (gives a little overshoot/bounce). */
class HairSpring {
  x = 0; v = 0;
  step(target: number, dt: number) {
    const k = 38, d = 5.5;
    this.v += (k * (target - this.x) - d * this.v) * dt;
    this.x += this.v * dt;
  }
}

export class CapriRig {
  private sparkleA: CanvasPattern | null = null;
  private sparkleB: CanvasPattern | null = null;
  private springs = R.HAIR_BACK.map(() => new HairSpring());
  private prevHead: Pt = [0, 0];
  private glitchRand = prng(0xc0ffee);
  private hitPaths: Path2D[] = [];
  private zPhase = 0;
  t = 0;

  constructor(private makeCanvas: (w: number, h: number) => HTMLCanvasElement | OffscreenCanvas) {}

  /** Deterministic glitter texture (fixed seed → never changes between frames/sessions). */
  private sparkle(ctx: Ctx, seed: number): CanvasPattern | null {
    const N = 96;
    const cv = this.makeCanvas(N, N);
    const g = cv.getContext('2d') as CanvasRenderingContext2D | null;
    if (!g) return null;
    const r = prng(seed);
    for (let i = 0; i < 280; i++) {
      const x = r() * N, y = r() * N, s = 0.4 + r() ** 3 * 1.7;
      g.globalAlpha = 0.45 + r() * 0.55;
      g.fillStyle = r() < 0.7 ? C.white : C.sparkle;
      g.beginPath();
      if (s > 1.2) { g.moveTo(x - s * 1.6, y); g.lineTo(x, y - s * 0.5); g.lineTo(x + s * 1.6, y); g.lineTo(x, y + s * 0.5); } // tiny 4-point glint
      else g.arc(x, y, s, 0, Math.PI * 2);
      g.fill();
    }
    return ctx.createPattern(cv as CanvasImageSource, 'repeat');
  }

  hitTest(ctx: Ctx, x: number, y: number): boolean {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const hit = this.hitPaths.some((p) => ctx.isPointInPath(p, x, y));
    ctx.restore();
    return hit;
  }

  draw(ctx: Ctx, p: Params, dt: number, o: DrawOptions) {
    this.t += dt;
    if (!this.sparkleA) { this.sparkleA = this.sparkle(ctx, 7); this.sparkleB = this.sparkle(ctx, 1337); }
    const hits: Path2D[] = [];
    const S = o.scale;

    // ---------------- transforms
    const lift = (p.float - 0.4) * 12;
    const root = Mat.identity().scale(S).translate(R.FRAME.hip[0] + p.bodyX, R.FRAME.hip[1] + p.bodyY - lift + p.hipDrop).rotate(p.bodyRot + p.lean);
    const sleepDroop = p.sleep * 6;
    const headLocal = Mat.identity().translate(p.hip * 1.5, R.HEAD_OFFSET - p.breathe * 1.5 + sleepDroop).rotate(p.headRoll + p.bodyRot * 0.4);
    const head = root.mul(headLocal);
    const hairM = root.mul(Mat.identity().translate(p.hip * 1.5, R.HEAD_OFFSET - p.breathe * 1.5 + sleepDroop).rotate(p.headRoll * 0.6));

    // hair secondary motion: springs chase head movement + wind
    const headPos = head.apply([0, 0]);
    const vx = (headPos[0] - this.prevHead[0]) / Math.max(dt, 1e-3) / S;
    this.prevHead = headPos;
    R.HAIR_BACK.forEach((g, i) => {
      const wind = Math.sin(this.t * (0.9 + i * 0.23) + i * 1.7) * 0.035 * (0.3 + p.hairWind) + Math.sin(this.t * 2.7 + i) * 0.012 * p.hairWind;
      this.springs[i].step(clamp(-vx * 0.0045, -0.25, 0.25) - p.headRoll * 0.25 + wind - p.hairStream * (0.38 + 0.14 * g.weight), dt);
    });

    const yaw = p.headYaw, pitch = p.headPitch;
    const fx = yaw * 7, fy = pitch * 6;
    const squeeze = 1 - Math.abs(yaw) * 0.14;
    const face = (poly: Poly, depth = 1): Poly => poly.map(([x, y]) => [x * squeeze + fx * depth, y + fy * depth]);

    // ---------------- hair back (violet offset → red → glitter → ink shards)
    const hairPolys: Poly[] = [];
    R.HAIR_BACK.forEach((g, i) => {
      const ang = this.springs[i].x * g.weight;
      for (const s of g.slabs) hairPolys.push(hairM.map(offset(bend(s, g.pivot, ang, g.length), -yaw * 4, -pitch * 3)));
    });
    const violetShift: Pt = [-3.5 * S, 4.5 * S];
    ctx.fillStyle = C.violet;
    for (const hp of hairPolys) ctx.fill(toPath(offset(hp, violetShift[0], violetShift[1])));
    const hairPath = new Path2D();
    for (const hp of hairPolys) hairPath.addPath(toPath(hp));
    ctx.fillStyle = C.hair;
    ctx.fill(hairPath);
    hits.push(hairPath);
    // glitter: two layers cross-fading for a slow twinkle
    ctx.save();
    ctx.clip(hairPath);
    const tw = 0.5 + 0.5 * Math.sin(this.t * 1.3);
    for (const [pat, a, sx] of [[this.sparkleA, 0.55 + 0.35 * tw, 0], [this.sparkleB, 0.55 + 0.35 * (1 - tw), 31]] as const) {
      if (!pat) continue;
      pat.setTransform?.(new DOMMatrix().translate(sx + headPos[0] * 0.15, sx * 0.5).scale(S * 0.9));
      ctx.globalAlpha = a;
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    ctx.restore();

    // hair sheen: brighter, denser glitter toward the top centre (N 1:51)
    ctx.save();
    ctx.clip(hairPath);
    const [shx, shy] = hairM.apply([0, -105]);
    const sheen = ctx.createRadialGradient(shx, shy, 0, shx, shy, 95 * S);
    sheen.addColorStop(0, 'rgba(255,170,195,0.55)');
    sheen.addColorStop(0.55, 'rgba(255,120,160,0.18)');
    sheen.addColorStop(1, 'rgba(255,90,130,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (this.sparkleB) {
      ctx.beginPath(); ctx.arc(shx, shy, 70 * S, 0, Math.PI * 2); ctx.clip();
      this.sparkleB.setTransform?.(new DOMMatrix().translate(13, 7).scale(S * 0.7));
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(this.t * 2.1);
      ctx.fillStyle = this.sparkleB;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    ctx.restore();

    ctx.fillStyle = C.ink;
    for (const s of R.HAIR_INK) ctx.fill(toPath(hairM.map(offset(s, -yaw * 2, 0))));

    // ---------------- legs (crimson with black lightning cuts), posable: thigh/knee/foreshortening
    const leg = (side: -1 | 1) => {
      const hipPt: Pt = side < 0 ? [R.LEG_L.hip[0] - p.hip * 0.6, R.LEG_L.hip[1]] : [R.LEG_R.hip[0] - p.hip * 0.6, R.LEG_R.hip[1]];
      const out = side < 0 ? p.thighL : p.thighR, knee = side < 0 ? p.kneeL : p.kneeR, fore = clamp(side < 0 ? p.foreL : p.foreR, 0.15, 1);
      // canvas angle: 90° = straight down; "out" swings away from the body, knee bends the shin back toward vertical/inward
      const thighDeg = 90 - side * (out + (side < 0 ? -p.hip * 2 : p.hip * 2));
      const shinDeg = thighDeg + side * knee;
      const t = (thighDeg * Math.PI) / 180, sh = (shinDeg * Math.PI) / 180;
      const kneePt: Pt = [hipPt[0] + Math.cos(t) * R.LEG.thigh * fore, hipPt[1] + Math.sin(t) * R.LEG.thigh * fore];
      const ankle: Pt = [kneePt[0] + Math.cos(sh) * R.LEG.shin, kneePt[1] + Math.sin(sh) * R.LEG.shin];
      const footDeg = shinDeg + side * 12; // pointed toes splay outward
      const toe: Pt = [ankle[0] + Math.cos((footDeg * Math.PI) / 180) * R.LEG.foot, ankle[1] + Math.sin((footDeg * Math.PI) / 180) * R.LEG.foot];
      return { side, joints: [hipPt, kneePt, ankle, toe] as Pt[] };
    };
    const legs = [leg(-1), leg(1)];
    const legPolys = legs.map((l) => root.map(limb(l.joints, R.LEG_WIDTHS)));
    for (const lp of legPolys) { ctx.fillStyle = C.violet; ctx.fill(toPath(offset(lp, -2 * S, 2 * S))); }
    for (const lp of legPolys) { const path = toPath(lp); ctx.fillStyle = C.hair; ctx.fill(path); hits.push(path); }
    for (const d of R.LEG_DECO) {
      const l = legs[d.leg === 'L' ? 0 : 1];
      const A = l.joints[d.seg], B = l.joints[d.seg + 1];
      const wA = R.LEG_WIDTHS[d.seg], wB = R.LEG_WIDTHS[d.seg + 1];
      const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const poly: Poly = d.poly.map(([sx, tt]) => { const w = (wA + (wB - wA) * tt) / 2; return [A[0] + dx * tt + nx * sx * w * l.side, A[1] + dy * tt + ny * sx * w * l.side]; });
      ctx.fillStyle = d.color === 'ink' ? C.ink : C.mask;
      ctx.fill(toPath(root.map(poly)));
    }

    // ---------------- torso (crimson, black X, green/black shoulder triangles)
    const chest = (q: Poly): Poly => q.map(([x, y]) => [x, y < -60 ? y - p.breathe * 1.5 : y]);
    const torso = root.map(chest(R.TORSO));
    ctx.fillStyle = C.violet;
    ctx.fill(toPath(offset(torso, -2.5 * S, 3 * S)));
    const torsoPath = toPath(torso);
    ctx.fillStyle = C.hair; ctx.fill(torsoPath); hits.push(torsoPath);
    ctx.save();
    ctx.clip(torsoPath);
    ctx.fillStyle = C.ink;
    for (const g2 of R.TORSO_INK) ctx.fill(toPath(root.map(chest(g2))));
    ctx.fillStyle = C.mask;
    for (const g2 of R.GREEN_PANELS.slice(0, 2)) ctx.fill(toPath(root.map(chest(g2))));
    ctx.restore();
    ctx.fillStyle = C.ink;
    const neck = toPath(root.map(offset(R.NECK, p.hip * 0.8, sleepDroop * 0.5)));
    ctx.fill(neck);
    ctx.fillStyle = C.mask;
    ctx.fill(toPath(root.map(offset(R.GREEN_PANELS[2], p.hip * 0.8, sleepDroop * 0.5))));

    // ---------------- arms: very long, spindly, four claws (viewer-left black, viewer-right crimson)
    const arm = (side: -1 | 1, raise: number, wave: number, spread: number) => {
      const sh = side < 0 ? R.SHOULDER_L : R.SHOULDER_R;
      // angle keyframes (deg; canvas 0=right, 90=down): hang -> hand-to-chin -> raised
      const keys = side < 0
        ? [{ u: 98, f: 93 }, { u: 100, f: -70 }, { u: -122, f: -100 }]
        : [{ u: 82, f: 87 }, { u: 60, f: -128 }, { u: -52, f: -96 + wave * 30 }];
      const k = raise <= 0.55 ? raise / 0.55 : (raise - 0.55) / 0.45;
      const [a, b] = raise <= 0.55 ? [keys[0], keys[1]] : [keys[1], keys[2]];
      let ud = lerp(a.u, b.u, k), fd = lerp(a.f, b.f, k);
      // reveal pose: arms flung out wide, slightly drooping (N 1:51)
      const spreadU = side < 0 ? 172 : 8, spreadF = side < 0 ? 186 : -6;
      ud = lerp(ud, spreadU, spread); fd = lerp(fd, spreadF, spread);
      const u = (ud * Math.PI) / 180, f = (fd * Math.PI) / 180;
      const s0: Pt = [sh[0], sh[1] - p.breathe * 1.5];
      const el: Pt = [s0[0] + Math.cos(u) * R.ARM.upper, s0[1] + Math.sin(u) * R.ARM.upper];
      const wr: Pt = [el[0] + Math.cos(f) * R.ARM.fore, el[1] + Math.sin(f) * R.ARM.fore];
      const poly = root.map(limb([s0, el, wr], R.ARM.widths));
      const fill = side < 0 ? C.ink : C.hair;
      ctx.fillStyle = C.violet; ctx.fill(toPath(offset(poly, -1.8 * S, 2 * S)));
      const path = toPath(poly); ctx.fillStyle = fill; ctx.fill(path); hits.push(path);
      // claws fan out more when spread or waving
      const fan = R.ARM.clawSpread * (1 + spread * 1.4 + Math.abs(wave) * 0.3);
      R.ARM.claw.forEach((len, i) => {
        const ang = f + (i - 1.5) * fan;
        const L = len * clamp(p.clawScale, 0.6, 2.2);
        const tip: Pt = [wr[0] + Math.cos(ang) * L, wr[1] + Math.sin(ang) * L];
        const nx = -Math.sin(ang) * 1.3, ny = Math.cos(ang) * 1.3;
        const cp = root.map([[wr[0] + nx, wr[1] + ny], [wr[0] - nx, wr[1] - ny], tip]);
        ctx.fillStyle = C.violet; ctx.fill(toPath(offset(cp, -1 * S, 1.2 * S)));
        ctx.fillStyle = fill; ctx.fill(toPath(cp));
      });
      if (side < 0) { ctx.fillStyle = C.mask; ctx.fill(toPath(root.map(limb([s0, [lerp(s0[0], el[0], 0.4), lerp(s0[1], el[1], 0.4)]], [3.5, 1.5])))); }
    };
    arm(-1, p.armLRaise, 0, clamp(p.armSpread, 0, 1));
    arm(1, p.armRRaise, p.armRWave, clamp(p.armSpread, 0, 1));

    // ---------------- head
    ctx.fillStyle = C.ink;
    const crownShift = (q: Poly): Poly => offset(q, -yaw * 3, -pitch * 2);
    for (const s of R.CROWN) { const path = toPath(head.map(crownShift(s))); ctx.fill(path); hits.push(path); }
    const headPoly = head.map(face(R.HEAD, 0.35));
    ctx.fillStyle = C.violet; ctx.fill(toPath(offset(headPoly, -2 * S, 2.5 * S)));
    const headPath = toPath(headPoly);
    ctx.fillStyle = C.ink; ctx.fill(headPath); hits.push(headPath);

    // mask (glows when talking/thinking)
    const glow = clamp(p.maskGlow, 0, 1);
    const maskPolys = [R.MASK_L, R.MASK_R].map((m) => head.map(face(m)));
    ctx.save();
    if (glow > 0.3) { ctx.shadowColor = C.mask; ctx.shadowBlur = (glow - 0.3) * 18 * S; }
    ctx.fillStyle = C.mask;
    for (const m of maskPolys) ctx.fill(toPath(m));
    for (const m of [R.CHEEK_L, R.CHEEK_R]) ctx.fill(toPath(head.map(face(m))));
    ctx.restore();

    // eyes: black pointed almonds with thorns, blue iris, white pupil, green ring
    const farL = yaw > 0 ? 1 - yaw * 0.3 : 1, farR = yaw < 0 ? 1 + yaw * 0.3 : 1;
    this.eye(ctx, head, face([R.EYE_L])[0], -1, farL, 1, p, p.blinkL, S);
    this.eye(ctx, head, face([R.EYE_R])[0], 1, farR, 1, p, p.blinkR, S);
    // many eyes bloom across the mask (N 2:14)
    if (p.manyEyes > 0.03) {
      ctx.save();
      const maskClip = new Path2D();
      for (const m of maskPolys) maskClip.addPath(toPath(m));
      ctx.clip(maskClip);
      for (const [x, y, sc, th, rot] of R.MANY_EYES) {
        const grow = clamp((p.manyEyes - th) / 0.12, 0, 1);
        if (grow <= 0) continue;
        const c2 = face([[x, y]])[0];
        this.eye(ctx, head, c2, x < 0 ? -1 : 1, 1, sc * (0.6 + 0.4 * grow), { ...p, squint: p.squint * 0.5 }, 0, S, rot);
      }
      ctx.restore();
    }

    // bangs over the mask
    ctx.fillStyle = C.ink;
    for (const b of R.BANGS) ctx.fill(toPath(head.map(face(b, 0.6))));

    // mouth
    this.mouth(ctx, head, face([R.MOUTH])[0], p, S);

    // ---------------- FX
    if (o.micActive || p.ringPulse > 0.05) this.listenRing(ctx, head, p, S, o.micActive);
    if (p.sleep > 0.5) this.zzz(ctx, head, dt, S);
    if (o.interactHint) {
      ctx.save(); ctx.strokeStyle = C.mask; ctx.lineWidth = 2 * S; ctx.setLineDash([6 * S, 5 * S]); ctx.globalAlpha = 0.7;
      ctx.stroke(torsoPath); ctx.stroke(headPath); ctx.restore();
    }
    this.hitPaths = hits;
  }

  /** Almond eye. side: -1 viewer-left / 1 viewer-right (slant mirrors). size scales the whole eye. */
  private eye(ctx: Ctx, head: Mat, c: Pt, side: -1 | 1, xScale: number, size: number, p: Params, blink: number, S: number, extraRot = 0) {
    const E = R.EYE;
    const closed = clamp(Math.max(blink, p.sleep * 0.9), 0, 1);
    const sq = clamp(p.squint, 0, 1);
    const wide = clamp(p.eyeWide, 0, 1);
    // squint narrows the almond and tilts it inward-down (menace, N 2:06)
    const m = head.translate(c[0], c[1]).rotate(side * (-E.slant - sq * 0.22) + extraRot).scale(xScale * size, size);
    const w = E.w * (1 + wide * 0.06);
    const hTop = E.h * (1 + wide * 0.3) * (1 - sq * 0.62) * (1 - closed);
    const hBot = E.h * 0.82 * (1 + wide * 0.2) * (1 - sq * 0.35) * (1 - closed);
    const almond = (ht: number, hb: number): Poly => {
      const pts: Pt[] = [];
      const N = 14;
      for (let i = 0; i <= N; i++) { const x = -w + (2 * w * i) / N; const u = Math.max(0, 1 - (x / w) ** 2); pts.push([x, -ht * Math.pow(u, 0.75)]); }
      for (let i = N - 1; i >= 1; i--) { const x = -w + (2 * w * i) / N; const u = Math.max(0, 1 - (x / w) ** 2); pts.push([x, hb * Math.pow(u, 0.9)]); }
      return pts;
    };
    // thorn spikes on the almond edge (outer-bottom and inner-top)
    const thorns: Poly[] = [
      [[w * 0.6 * side, hBot * 0.6], [w * 0.85 * side, hBot * 0.3], [w * 0.98 * side, E.h * 1.05]],
      [[-w * 0.4 * side, -hTop * 0.8], [-w * 0.62 * side, -hTop * 0.55], [-w * 0.72 * side, -E.h * 1.12]],
    ];
    ctx.fillStyle = C.ink;
    for (const t of thorns) ctx.fill(toPath(m.map(t)));
    if (hTop + hBot < 1.2) {
      ctx.fill(toPath(m.map(almond(0.8, 0.8)))); // closed: thin black slit
      return;
    }
    if (p.happyEyes > 0.5) {
      // ^ ^ : a thick black upward arc in place of the almond (B 2:33)
      const arc: Pt[] = [];
      for (let i = 0; i <= 12; i++) { const x = -w + (2 * w * i) / 12; arc.push([x, -E.h * 0.55 * (1 - (x / w) ** 2) + E.h * 0.15]); }
      const thick = E.h * 0.38;
      const shapeArc = [...arc.map(([x, y]) => [x, y - thick / 2] as Pt), ...arc.reverse().map(([x, y]) => [x, y + thick / 2] as Pt)];
      ctx.fill(toPath(m.map(shapeArc)));
      return;
    }
    const shape = toPath(m.map(almond(hTop, hBot)));
    ctx.fill(shape);
    ctx.save();
    ctx.clip(shape);
    const gx = p.gazeX * w * 0.42, gy = p.gazeY * E.h * 0.38;
    const dot = (cx: number, cy: number, rad: number, col: string, stroke = 0) => {
      const [x, y] = m.apply([cx, cy]);
      ctx.beginPath();
      ctx.ellipse(x, y, rad * Math.hypot(m.a, m.b), rad * Math.hypot(m.c, m.d), Math.atan2(m.b, m.a), 0, Math.PI * 2);
      if (stroke) { ctx.strokeStyle = col; ctx.lineWidth = stroke * S * size; ctx.stroke(); } else { ctx.fillStyle = col; ctx.fill(); }
    };
    dot(gx * 0.85 + 0.6 * side, gy * 0.85 - 0.3, E.ring, C.mask, 0.8);
    if (p.blankEyes > 0.5) {
      dot(gx * 0.5, gy * 0.5, E.iris * 1.35, C.white); // blank white stare (B 0:13)
    } else {
      dot(gx, gy, E.iris * (1 - wide * 0.15), C.iris); // pupils shrink when shocked
      dot(gx, gy, E.pupil * (1 - wide * 0.25), C.white);
    }
    ctx.restore();
  }

  private mouth(ctx: Ctx, head: Mat, c: Pt, p: Params, S: number) {
    const open = clamp(p.mouthOpen, 0, 1);
    const smile = clamp(p.mouthSmile, -1, 1);
    const w = 9 + open * 1.5 + Math.max(0, smile) * 1.5;
    const teeth = 4;
    const zig = (yBase: number, amp: number, sign: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i <= teeth * 2; i++) {
        const t = i / (teeth * 2);
        const x = -w + 2 * w * t;
        const curve = -smile * 3.2 * (1 - (2 * t - 1) ** 2) + smile * 1.2; // ends up when smiling
        pts.push([x, yBase + curve * sign + (i % 2 ? amp : -amp) * 0.5]);
      }
      return pts;
    };
    const m = head.translate(c[0], c[1]);
    const upper = m.map(zig(-open * 3.5, 1.7 + open * 0.8, 1));
    const lower = m.map(zig(open * 4.5, 1.7 + open * 0.8, open > 0.05 ? -0.3 : 1));
    if (open > 0.05) {
      // dark slot with white triangular teeth (N 0:34, W3)
      const slot = toPath([...upper, ...[...lower].reverse()]);
      ctx.fillStyle = C.mouthInner;
      ctx.fill(slot);
      ctx.save();
      ctx.clip(slot);
      ctx.fillStyle = C.white;
      const depth = (2.2 + open * 2.6) * Math.hypot(m.c, m.d);
      const teeth = (line: Pt[], dir: number) => {
        for (let i = 0; i + 2 < line.length; i += 2) {
          const a2 = line[i], c2 = line[i + 2];
          ctx.beginPath();
          ctx.moveTo(a2[0], a2[1]); ctx.lineTo(c2[0], c2[1]);
          ctx.lineTo((a2[0] + c2[0]) / 2, (a2[1] + c2[1]) / 2 + dir * depth);
          ctx.closePath(); ctx.fill();
        }
      };
      teeth(upper, 1);
      teeth(lower, -1);
      ctx.restore();
    }
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 1.05 * S;
    ctx.lineJoin = 'miter';
    for (const line of open > 0.05 ? [upper, lower] : [upper]) {
      ctx.beginPath();
      ctx.moveTo(line[0][0], line[0][1]);
      for (const q of line.slice(1)) ctx.lineTo(q[0], q[1]);
      ctx.stroke();
    }
  }

  private listenRing(ctx: Ctx, head: Mat, p: Params, S: number, mic: boolean) {
    const [x, y] = head.apply([0, 0]);
    ctx.save();
    ctx.strokeStyle = C.mask;
    ctx.lineWidth = 2 * S;
    ctx.globalAlpha = 0.35 + 0.5 * clamp(p.ringPulse, 0, 1);
    const r = (46 + p.ringPulse * 6) * S;
    for (let i = 0; i < 6; i++) {
      const a0 = this.t * 1.5 + (i * Math.PI) / 3;
      ctx.beginPath(); ctx.arc(x, y, r, a0, a0 + 0.6); ctx.stroke();
    }
    if (mic) { // explicit "microphone is live" badge
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.mask;
      const bx = x + 34 * S, by = y - 40 * S;
      ctx.beginPath(); ctx.arc(bx, by, 7 * S, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.fillRect(bx - 1.6 * S, by - 4 * S, 3.2 * S, 5.5 * S);
      ctx.fillRect(bx - 3 * S, by + 2 * S, 6 * S, 1.2 * S);
    }
    ctx.restore();
  }

  private zzz(ctx: Ctx, head: Mat, dt: number, S: number) {
    this.zPhase = (this.zPhase + dt * 0.35) % 1;
    const [x, y] = head.apply([30, -40]);
    ctx.save();
    ctx.fillStyle = C.mask;
    ctx.font = `bold ${12 * S}px "Segoe UI", sans-serif`;
    for (let i = 0; i < 3; i++) {
      const ph = (this.zPhase + i / 3) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      ctx.fillText('Z', x + ph * 22 * S, y - ph * 40 * S);
    }
    ctx.restore();
  }

  /** Optional glitch post-process: horizontal band displacement + violet tint bands. */
  glitch(dst: Ctx, src: CanvasImageSource & { width: number; height: number }, amount: number) {
    const r = this.glitchRand;
    const bands = Math.ceil(amount * 4);
    const H = src.height, W = src.width;
    for (let i = 0; i < bands; i++) {
      const h = Math.max(2, Math.floor(r() * H * 0.05));
      const y = Math.floor(r() * (H - h));
      const dx = Math.round((r() * 2 - 1) * W * 0.04 * amount);
      dst.clearRect(0, y, W, h);
      dst.drawImage(src, 0, y, W, h, dx, y, W, h);
      if (r() < 0.35) {
        dst.save(); dst.globalCompositeOperation = 'source-atop'; dst.fillStyle = r() < 0.6 ? C.mask : C.hair;
        const bw = W * (0.2 + r() * 0.6);
        dst.fillRect(r() * (W - bw), y + h * 0.3, bw, Math.max(2, h * 0.35)); dst.restore();
      }
      if (r() < 0.5) {
        dst.save(); dst.globalCompositeOperation = 'source-atop'; dst.globalAlpha = 0.35; dst.fillStyle = r() < 0.5 ? C.violet : C.mask;
        dst.fillRect(0, y, W, h); dst.restore();
      }
    }
  }
}
