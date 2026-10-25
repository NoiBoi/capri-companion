import type { Poly } from './geometry';

/**
 * Capri shard rig — original vector reconstruction (not studio artwork).
 * Units: logical px in a 300×520 frame. Body parts are relative to the hip pivot;
 * head, face and hair parts are relative to the head centre.
 * Proportions: tiny angular head, hair mass ≈3× shoulder width, long jagged legs
 * (official frames #1–#3 in reference/SOURCES.md).
 */
export const FRAME = { width: 340, height: 520, hip: [170, 314] as [number, number] };
export const HEAD_OFFSET = -144; // head centre relative to hip

// ---------------------------------------------------------------- head & face (rel. head centre)
export const HEAD: Poly = [[-20, -25], [-25, -9], [-23, 7], [-15, 19], [-5, 29], [0, 32], [5, 29], [15, 19], [23, 7], [25, -9], [20, -25], [8, -31], [-8, -31]];

/** Black crown spikes radiating from the skull (behind face, over hair). [base1, base2, tip] */
export const CROWN: Poly[] = [
  // two tall horn-like spikes (most recognisable black shapes in the front frame)
  [[-20, -20], [-4, -31], [-38, -96], [-30, -58]],
  [[2, -31], [19, -22], [42, -104], [24, -60]],
  // shorter temple shards
  [[-25, -10], [-17, -24], [-74, -50]],
  [[17, -24], [25, -8], [80, -38]],
  [[-25, 0], [-22, 12], [-62, 26]],
  [[23, 2], [21, 13], [56, 34]],
  // jaw points framing the chin
  [[-14, 18], [-6, 27], [-24, 44]],
];
/** Spiky bangs that overlap the top of the mask. */
export const BANGS: Poly[] = [
  [[-16, -31], [-3, -31], [-7, -13]],
  [[3, -31], [16, -29], [6, -15]],
  [[-26, -20], [-15, -27], [-22, -6]],
  [[15, -27], [26, -20], [22, -6]],
];
export const MASK_L: Poly = [[-27, -16], [-3, -20], [-2, 4], [-7, 9], [-22, 7], [-28, -2]];
export const MASK_R: Poly = [[3, -20], [27, -16], [28, -2], [22, 7], [7, 9], [2, 4]];
export const CHEEK_L: Poly = [[-21, 10], [-11, 11], [-16, 19]];
export const CHEEK_R: Poly = [[11, 11], [21, 10], [16, 19]];
export const EYE_L: [number, number] = [-13, -5];
export const EYE_R: [number, number] = [13, -5];
/** Pointed-almond eye (N 0:50, 1:55): half width, half height, outward-up slant. */
export const EYE = { w: 12.5, h: 8.4, slant: 0.2, iris: 5.0, ring: 6.8, pupil: 1.7 };
/** Extra eyes that bloom across the mask for the many-eyes effect (N 2:14). [x, y, scale, threshold, rot] */
export const MANY_EYES: [number, number, number, number, number][] = [
  [0, -12, 0.61, 0.05, 0], [-22, 4, 0.52, 0.15, -0.3], [22, 4, 0.52, 0.2, 0.3], [-4, 6, 0.43, 0.3, 0.1],
  [8, -16, 0.41, 0.4, -0.2], [-20, -15, 0.43, 0.45, 0.25], [20, -15, 0.43, 0.5, -0.25], [0, 3, 0.36, 0.6, 0],
  [-12, 8, 0.32, 0.7, 0.4], [12, 8, 0.32, 0.75, -0.4], [-26, -6, 0.32, 0.85, 0.5], [26, -6, 0.32, 0.9, -0.5],
];
export const MOUTH: [number, number] = [0, 19];

// ---------------------------------------------------------------- body (rel. hip)
export const NECK: Poly = [[-5, -114], [5, -114], [6, -95], [-6, -95]];
export const TORSO: Poly = [[-23, -95], [-7, -101], [7, -101], [23, -95], [18, -70], [13, -42], [11, -24], [19, -7], [17, 5], [0, 11], [-17, 5], [-19, -7], [-11, -24], [-13, -42], [-18, -70]];
/** Torso is crimson (N 1:51): black X crossing + shoulder triangles, green accents. */
export const TORSO_INK: Poly[] = [
  [[-21, -93], [-15, -96], [14, -40], [10, -24], [4, -24]], // X stroke 1
  [[21, -93], [15, -96], [-14, -40], [-10, -24], [-4, -24]], // X stroke 2
  [[7, -101], [23, -95], [19, -80]], // viewer-right shoulder (black)
  [[-12, -24], [12, -24], [14, -18], [-14, -18]], // waist band
  [[0, -18], [10, -6], [0, 10], [-10, -6]], // pelvis diamond
];
export const GREEN_PANELS: Poly[] = [
  [[-7, -101], [-23, -95], [-19, -78]], // viewer-left shoulder (green)
  [[-19, -7], [-11, -12], [-12, 3], [-17, 4]], // viewer-left hip
  [[-6, -110], [-2, -110], [-4, -96], [-8, -95]], // neck stripe
];
export const RED_GLYPHS: Poly[] = [];

export const LEG_L = { hip: [-9, 2] as [number, number], knee: [-12, 92] as [number, number], ankle: [-14, 174] as [number, number], toe: [-19, 192] as [number, number] };
export const LEG_R = { hip: [9, 2] as [number, number], knee: [12, 92] as [number, number], ankle: [14, 174] as [number, number], toe: [19, 192] as [number, number] };
export const LEG_WIDTHS = [19, 11, 7, 1];
/** Leg bone lengths (rig units) — thigh, shin, foot. */
export const LEG = { thigh: 90, shin: 82, foot: 19 };
/**
 * Leg decorations in segment-local coords: [s, t] with t 0→1 along the bone and s −1→1 across
 * its width, so they follow the leg through every pose. seg: 0 = thigh, 1 = shin.
 */
export interface LegDeco { leg: 'L' | 'R'; seg: 0 | 1; color: 'ink' | 'mask'; poly: [number, number][] }
export const LEG_DECO: LegDeco[] = [
  { leg: 'L', seg: 0, color: 'mask', poly: [[-1, 0.1], [-0.45, 0.12], [-0.6, 0.62], [-1, 0.56]] },
  { leg: 'L', seg: 1, color: 'mask', poly: [[-1, 0.18], [-0.4, 0.2], [-0.8, 0.8]] },
  { leg: 'L', seg: 0, color: 'ink', poly: [[0.6, 0.72], [1, 0.8], [0.7, 1]] },
  { leg: 'R', seg: 0, color: 'ink', poly: [[-0.1, 0.2], [0.8, 0.24], [0.2, 0.46], [0.7, 0.48], [-0.2, 0.78], [0.1, 0.56], [-0.3, 0.54]] },
  { leg: 'R', seg: 1, color: 'ink', poly: [[0.1, 0.42], [0.7, 0.46], [0.3, 0.64], [0.6, 0.65], [0.2, 0.9], [0.1, 0.68], [-0.1, 0.66]] },
  { leg: 'L', seg: 1, color: 'ink', poly: [[0.2, 0.92], [1, 1], [-0.4, 1]] },
];
export const LEG_GREEN: Poly[] = [[[-18, 12], [-13, 14], [-15, 62], [-18, 56]], [[-18, 108], [-14, 110], [-16, 158]]];
/** Black lightning cuts on the crimson legs. */
export const LEG_INK: Poly[] = [[[10, 20], [18, 24], [13, 44], [17, 46], [10, 72], [12, 52], [8, 50]], [[13, 118], [17, 122], [14, 140], [16, 141], [13, 160], [12, 142], [11, 141]], [[-9, 70], [-13, 92], [-10, 96]], [[-12, 176], [-17, 186], [-19, 192]]];

export const SHOULDER_L: [number, number] = [-21, -91];
export const SHOULDER_R: [number, number] = [21, -91];
/** Very long spindly arms with claw fingers (N 1:51). */
export const ARM = { upper: 62, fore: 58, widths: [8, 6, 4], claw: [20, 23, 22, 17], clawSpread: 0.17 };

// ---------------------------------------------------------------- hair (rel. head centre)
export interface HairGroup { pivot: [number, number]; length: number; weight: number; slabs: Poly[] }
export const HAIR_BACK: HairGroup[] = [
  { // centre fill so the head is always framed
    pivot: [0, -10], length: 80, weight: 0.3,
    slabs: [[[-48, -42], [48, -42], [58, 40], [32, 72], [-32, 72], [-58, 40]]],
  },
  { // crown cloud
    pivot: [0, -30], length: 130, weight: 0.6,
    slabs: [
      [[-96, -58], [-112, -112], [-72, -102], [-62, -152], [-22, -126], [0, -162], [24, -130], [60, -158], [70, -110], [114, -124], [100, -72], [132, -62], [96, -30], [60, -42], [0, -32], [-60, -42], [-122, -46]],
      [[-128, -88], [-120, -120], [-108, -84]],
      [[116, -96], [134, -122], [126, -80]],
      [[-34, -146], [-20, -164], [-16, -138]],
    ],
  },
  { // left wing
    pivot: [-40, -20], length: 110, weight: 1,
    slabs: [[[-58, -52], [-130, -62], [-120, -20], [-142, 10], [-110, 16], [-132, 62], [-96, 48], [-102, 102], [-70, 70], [-54, 30], [-34, 8]]],
  },
  { // right wing (asymmetric, like the frames)
    pivot: [40, -20], length: 110, weight: 1,
    slabs: [[[58, -50], [136, -40], [112, -4], [140, 32], [102, 30], [124, 86], [86, 60], [82, 112], [58, 62], [38, 10]]],
  },
  { // left lightning strand to the knees
    pivot: [-58, 60], length: 170, weight: 1.6,
    slabs: [[[-72, 58], [-96, 112], [-79, 110], [-104, 172], [-84, 167], [-98, 246], [-71, 162], [-87, 164], [-63, 110], [-79, 112], [-52, 70]]],
  },
  { // right lightning strand
    pivot: [56, 64], length: 170, weight: 1.6,
    slabs: [[[64, 60], [89, 122], [73, 120], [97, 192], [79, 188], [90, 256], [65, 182], [81, 184], [58, 126], [72, 128], [49, 76]]],
  },
];
/** Black shards cutting into the hair from the skull. [base1, base2, tip] */
export const HAIR_INK: Poly[] = [
  [[-44, -46], [-28, -54], [-96, -122], [-70, -78]],
  [[30, -50], [46, -40], [110, -96], [76, -72]],
  [[-54, -26], [-46, -12], [-128, -8], [-96, -24]],
  [[54, 40], [64, 34], [84, 108]],
];
