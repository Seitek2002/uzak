"use client";

import { memo, type CSSProperties } from "react";
import type { Sex } from "@/entities/result";

/*
 * The world of "Путь героя", drawn in code: a mountain range far away, hills,
 * a near slope with pines and yurts, and the trail. Each layer moves at its own
 * speed as the hero walks, so the far range barely moves and the trail runs.
 * Colours come from the biome tokens in journey.css; the shapes are seeded, so
 * every visit sees the same land.
 */

export const VIEW_W = 1600;
export const VIEW_H = 500;
/** Where the hero stands, in view units. */
export const HERO_X = 760;
export const GROUND_Y = 440;
/** View units the trail runs from the first question to the summit. */
const TRAVEL = 5200;

const SPEEDS = { far: 0.1, mid: 0.28, near: 0.6, ground: 1 } as const;

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const widthOf = (speed: number) => VIEW_W + TRAVEL * speed + 240;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** A ridge as points: bumps of random height and width over a base line, with a jagged edge for rock. */
function ridge(width: number, { base, amp, every, jag, seed, step }: { base: number; amp: number; every: number; jag: number; seed: number; step: number }) {
  const rnd = seeded(seed);
  const bumps: Array<{ x: number; h: number; w: number }> = [];
  for (let x = -every; x < width + every; x += every * (0.7 + rnd() * 0.6)) bumps.push({ x, h: 0.45 + rnd() * 0.55, w: every * (0.45 + rnd() * 0.5) });
  const points: Array<[number, number]> = [];
  for (let x = 0; x <= width; x += step) {
    let lift = 0;
    for (const b of bumps) {
      const d = Math.abs(x - b.x) / b.w;
      if (d < 1.6) lift = Math.max(lift, b.h * Math.max(0, 1 - d * d * 0.42));
    }
    points.push([x, base - amp * lift + (rnd() - 0.5) * jag]);
  }
  return points;
}

const sharp = (pts: Array<[number, number]>, bottom: number, width: number) =>
  `M0 ${bottom} ${pts.map(([x, y]) => `L${r1(x)} ${r1(y)}`).join(" ")} L${width} ${bottom} Z`;

/** The same ridge through midpoints with quadratic curves: soft hills. */
function soft(pts: Array<[number, number]>, bottom: number, width: number) {
  let d = `M0 ${bottom} L${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += ` Q${r1(x)} ${r1(y)} ${r1((x + nx) / 2)} ${r1((y + ny) / 2)}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${d} L${r1(lx)} ${r1(ly)} L${width} ${bottom} Z`;
}

const heightAt = (pts: Array<[number, number]>, x: number) => {
  const i = Math.min(Math.max(Math.round(x / (pts[1][0] - pts[0][0])), 0), pts.length - 1);
  return pts[i][1];
};

function pine(x: number, y: number, h: number) {
  const w = h * 0.42;
  return `M${r1(x)} ${r1(y - h)} L${r1(x + w * 0.55)} ${r1(y - h * 0.55)} L${r1(x + w * 0.3)} ${r1(y - h * 0.55)} L${r1(x + w)} ${r1(y - h * 0.12)} L${r1(x + w * 0.12)} ${r1(y - h * 0.12)} L${r1(x + w * 0.12)} ${r1(y)} L${r1(x - w * 0.12)} ${r1(y)} L${r1(x - w * 0.12)} ${r1(y - h * 0.12)} L${r1(x - w)} ${r1(y - h * 0.12)} L${r1(x - w * 0.3)} ${r1(y - h * 0.55)} L${r1(x - w * 0.55)} ${r1(y - h * 0.55)} Z`;
}

/* The land is the same on every visit: build it once. */
const FAR_W = widthOf(SPEEDS.far);
const MID_W = widthOf(SPEEDS.mid);
const NEAR_W = widthOf(SPEEDS.near);
const GROUND_W = widthOf(SPEEDS.ground) + VIEW_W;

const farPts = ridge(FAR_W, { base: 380, amp: 200, every: 320, jag: 10, seed: 11, step: 22 });
const backPts = ridge(FAR_W, { base: 384, amp: 130, every: 230, jag: 6, seed: 5, step: 26 });
const midPts = ridge(MID_W, { base: 404, amp: 58, every: 260, jag: 0, seed: 23, step: 48 });
const nearPts = ridge(NEAR_W, { base: 430, amp: 30, every: 340, jag: 0, seed: 37, step: 60 });

const LAND = (() => {
  const rnd = seeded(91);
  const midTrees: string[] = [];
  for (let x = 30; x < MID_W; x += 26 + rnd() * 60) {
    if (rnd() < 0.45) continue;
    midTrees.push(pine(x, heightAt(midPts, x) + 6, 16 + rnd() * 12));
  }
  const nearTrees: string[] = [];
  for (let x = 60; x < NEAR_W; x += 40 + rnd() * 120) {
    if (rnd() < 0.35) continue;
    nearTrees.push(pine(x, heightAt(nearPts, x) + 8, 34 + rnd() * 26));
  }
  const yurts = [330, 1180, 2140].filter((x) => x < NEAR_W).map((x) => ({ x, y: heightAt(nearPts, x) + 6 }));
  const stones: Array<{ x: number; r: number }> = [];
  for (let x = 20; x < GROUND_W; x += 70 + rnd() * 160) stones.push({ x, r: 3 + rnd() * 6 });
  const tufts: number[] = [];
  for (let x = 10; x < GROUND_W; x += 30 + rnd() * 90) tufts.push(x);
  const stars: Array<{ x: number; y: number; r: number }> = [];
  for (let i = 0; i < 70; i += 1) stars.push({ x: rnd() * VIEW_W, y: rnd() * 260, r: 0.8 + rnd() * 1.6 });
  return {
    far: sharp(farPts, VIEW_H, FAR_W),
    back: sharp(backPts, VIEW_H, FAR_W),
    mid: soft(midPts, VIEW_H, MID_W),
    near: soft(nearPts, VIEW_H, NEAR_W),
    midTrees: midTrees.join(" "),
    nearTrees: nearTrees.join(" "),
    yurts,
    stones,
    tufts,
    stars,
  };
})();

/** The snow line of the far range, wavy so the caps do not look cut by a ruler. */
const SNOW = (() => {
  let d = `M0 0 L${FAR_W} 0 L${FAR_W} 262`;
  for (let x = FAR_W; x >= 0; x -= 40) d += ` L${x} ${262 + (x % 80 === 0 ? 14 : -4)}`;
  return `${d} Z`;
})();

function Yurt({ x, y }: { x: number; y: number }) {
  return (
    <g className="j-yurt" transform={`translate(${x} ${y})`}>
      <path className="j-yurt__felt" d="M-30 0 L-30 -20 Q-28 -27 -22 -30 Q0 -44 22 -30 Q28 -27 30 -20 L30 0 Z" />
      <path className="j-yurt__band" d="M-30 -16 L30 -16 L30 -12 L-30 -12 Z M-22 -31 Q0 -44 22 -31 L19 -28 Q0 -40 -19 -28 Z" />
      <path className="j-yurt__door" d="M-6 0 L-6 -14 L6 -14 L6 0 Z" />
      <path className="j-yurt__band" d="M-3 -43 L3 -43 L2 -39 L-2 -39 Z" />
    </g>
  );
}

/** Pennants on the trail where one block of questions ends and the next begins. */
function Markers({ stops }: { stops: number[] }) {
  return (
    <>
      {stops.map((p, i) => {
        const x = HERO_X + p * TRAVEL + 70;
        return (
          <g key={i} className="j-marker" transform={`translate(${r1(x)} ${GROUND_Y})`}>
            <path className="j-marker__cairn" d="M-14 0 Q-14 -8 -6 -9 Q-9 -15 -2 -17 Q4 -16 3 -10 Q12 -9 12 0 Z" />
            <path className="j-marker__pole" d="M0 -16 L0 -58" />
            <path className="j-marker__flag" d="M1 -57 L26 -51 L1 -44 Z" />
          </g>
        );
      })}
    </>
  );
}

/** The rock at the end of the trail: the hero stands on it at the finale. */
function Summit() {
  const x = HERO_X + TRAVEL;
  const g = GROUND_Y;
  return (
    <g className="j-summit">
      <path className="j-summit__rock" d={`M${x - 150} ${g + 6} C${x - 112} ${g - 8} ${x - 86} ${g - 58} ${x - 50} ${g - 64} L${x + 50} ${g - 64} C${x + 86} ${g - 58} ${x + 112} ${g - 8} ${x + 150} ${g + 6} Z`} />
      <path className="j-summit__cap" d={`M${x - 58} ${g - 64} L${x + 58} ${g - 64} L${x + 48} ${g - 57} Q${x} ${g - 53} ${x - 48} ${g - 57} Z`} />
      <path className="j-summit__ledge" d={`M${x - 104} ${g - 26} Q${x - 86} ${g - 32} ${x - 66} ${g - 31} M${x + 70} ${g - 36} Q${x + 92} ${g - 30} ${x + 108} ${g - 18}`} />
    </g>
  );
}

export type Pose = "stand" | "walk" | "rest" | "hurt" | "cheer" | "summit";

/** The traveller in a chapan with a staff; a kalpak for a man, a braid and a cap for a woman. */
export const Hero = memo(function Hero({ sex, pose }: { sex?: Sex; pose: Pose }) {
  return (
    <g className={`j-hero is-${pose}`} transform={`translate(${HERO_X} ${GROUND_Y})`}>
      <ellipse className="j-hero__shadow" cx="0" cy="2" rx="30" ry="5" />
      <g className="j-hero__body">
        <g className="j-hero__leg j-hero__leg--back">
          <path d="M-7 -64 L5 -64 L4 -8 L-5 -8 Z" className="j-hero__trousers-deep" />
          <path d="M-7 -9 L6 -9 Q12 -8 13 -2 L13 0 L-7 0 Z" className="j-hero__boot" />
        </g>
        {sex === "female" && <path className="j-hero__hair" d="M-6 -142 Q-16 -128 -14 -112 Q-13 -100 -16 -90 Q-10 -94 -9 -106 Q-6 -122 2 -138 Z" />}
        <g className="j-hero__pack">
          <rect x="-33" y="-120" width="22" height="44" rx="6" className="j-hero__leather" />
          <rect x="-36" y="-128" width="28" height="11" rx="5.5" className="j-hero__roll" />
          <path d="M-33 -100 L-11 -100" className="j-hero__strap" />
        </g>
        <g className="j-hero__leg j-hero__leg--front">
          <path d="M-5 -64 L7 -64 L6 -8 L-3 -8 Z" className="j-hero__trousers" />
          <path d="M-5 -9 L8 -9 Q14 -8 15 -2 L15 0 L-5 0 Z" className="j-hero__boot" />
        </g>
        <path className="j-hero__coat" d="M-15 -122 Q0 -128 15 -122 L21 -60 Q0 -54 -21 -60 Z" />
        <path className="j-hero__trim" d="M3 -124 L6 -58 M-21 -61 Q0 -55 21 -61" />
        <rect x="-17" y="-90" width="35" height="6" rx="2" className="j-hero__belt" />
        <circle cx="5" cy="-87" r="2.4" className="j-hero__buckle" />
        <circle cx="3" cy="-134" r="11.5" className="j-hero__skin" />
        <circle cx="9" cy="-135" r="1.5" className="j-hero__eye" />
        <path d="M12 -129 Q10 -127 8 -128" className="j-hero__smile" />
        {sex === "male" && (
          <g className="j-hero__kalpak">
            <path d="M-11 -140 Q-9 -158 1 -170 Q11 -158 15 -140 Z" className="j-hero__felt" />
            <path d="M-13 -142 L17 -142 L17 -137 L6 -137 L4 -141 L2 -137 L-13 -137 Z" className="j-hero__felt-band" />
            <path d="M-4 -150 Q1 -156 6 -150 M-1 -160 Q1 -163 4 -160" className="j-hero__felt-line" />
          </g>
        )}
        {sex === "female" && (
          <g className="j-hero__cap">
            <path d="M-10 -140 Q-9 -153 3 -154 Q15 -153 15 -140 Z" className="j-hero__cap-cloth" />
            <path d="M-10 -141 L15 -141" className="j-hero__cap-line" />
            <circle cx="3" cy="-147" r="1.8" className="j-hero__cap-dot" />
          </g>
        )}
        {!sex && <path className="j-hero__hood" d="M-12 -132 Q-14 -152 3 -152 Q17 -151 16 -136 Q12 -146 3 -146 Q-6 -146 -12 -132 Z" />}
        <g className="j-hero__arm">
          <path d="M22 -156 L15 2" className="j-hero__staff" />
          <circle cx="23" cy="-160" r="11" className="j-hero__glow" />
          <path d="M23 -169 L28 -160 L23 -151 L18 -160 Z" className="j-hero__crystal" />
          <path d="M2 -120 Q14 -112 19 -94 L13 -91 Q8 -106 -2 -112 Z" className="j-hero__sleeve" />
          <circle cx="17" cy="-91" r="4.5" className="j-hero__skin" />
        </g>
      </g>
      {pose === "summit" && (
        <g className="j-hero__flag">
          <path d="M-46 0 L-46 -120" className="j-hero__flagpole" />
          <path d="M-45 -118 Q-22 -126 -2 -114 Q-22 -104 -45 -98 Z" className="j-hero__flagcloth" />
        </g>
      )}
      {pose === "rest" && (
        <g className="j-fire" transform="translate(64 0)">
          <path d="M-16 0 L16 -6 M-16 -6 L16 0" className="j-fire__log" />
          <path d="M0 -6 Q-11 -18 -4 -32 Q-2 -22 3 -24 Q1 -36 9 -44 Q8 -30 12 -22 Q14 -12 6 -6 Z" className="j-fire__flame" />
          <path d="M1 -7 Q-4 -14 0 -21 Q2 -16 5 -16 Q8 -11 4 -7 Z" className="j-fire__core" />
        </g>
      )}
    </g>
  );
});

/**
 * The scene. In a narrow strip the land is anchored left; in the side panel
 * of a wide screen it is centred so the hero stays in sight. `progress` runs from 0 at the first question of the trail to 1 at
 * the summit; `stops` are the progress values where blocks end.
 */
export function Scene({ progress, stops, sex, pose, align = "start" }: { progress: number; stops: number[]; sex?: Sex; pose: Pose; align?: "start" | "middle" }) {
  const shift = (speed: number) => ({ transform: `translateX(${r1(-progress * TRAVEL * speed)}px)` }) as CSSProperties;
  return (
    <svg className="j-scene" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio={align === "middle" ? "xMidYMax slice" : "xMinYMax slice"} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="j-far-clip">
          <path d={LAND.far} />
        </clipPath>
        <linearGradient id="j-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="j-mist__top" />
          <stop offset="1" className="j-mist__bottom" />
        </linearGradient>
        <radialGradient id="j-sun-glow">
          <stop offset="0" className="j-sun__glow-in" />
          <stop offset="1" className="j-sun__glow-out" />
        </radialGradient>
      </defs>
      <g className="j-stars">
        {LAND.stars.map((s, i) => (
          <circle key={i} cx={r1(s.x)} cy={r1(s.y)} r={r1(s.r)} />
        ))}
      </g>
      <g className="j-sun">
        <circle cx="1060" cy="0" r="120" fill="url(#j-sun-glow)" />
        <circle cx="1060" cy="0" r="38" className="j-sun__disc" />
      </g>
      <g className="j-layer" style={shift(SPEEDS.far)}>
        <path d={LAND.back} className="j-back" />
        <path d={LAND.far} className="j-far" />
        <path d={SNOW} className="j-snow" clipPath="url(#j-far-clip)" />
        <rect x="0" y="300" width={FAR_W} height="120" fill="url(#j-mist)" />
      </g>
      <g className="j-layer" style={shift(SPEEDS.mid)}>
        <path d={LAND.mid} className="j-mid" />
        <path d={LAND.midTrees} className="j-mid-trees" />
      </g>
      <g className="j-layer" style={shift(SPEEDS.near)}>
        <path d={LAND.near} className="j-near" />
        <path d={LAND.nearTrees} className="j-near-trees" />
        {LAND.yurts.map((y) => (
          <Yurt key={y.x} x={y.x} y={y.y} />
        ))}
      </g>
      <g className="j-layer" style={shift(SPEEDS.ground)}>
        <rect x="0" y={GROUND_Y - 4} width={GROUND_W} height={VIEW_H - GROUND_Y + 4} className="j-ground" />
        <path d={`M0 ${GROUND_Y + 14} L${GROUND_W} ${GROUND_Y + 14}`} className="j-trail" />
        {LAND.stones.map((s) => (
          <ellipse key={s.x} cx={r1(s.x)} cy={GROUND_Y + 30} rx={r1(s.r * 1.6)} ry={r1(s.r)} className="j-stone" />
        ))}
        {LAND.tufts.map((x) => (
          <path key={x} d={`M${r1(x)} ${GROUND_Y} l-4 -9 M${r1(x + 3)} ${GROUND_Y} l1 -12 M${r1(x + 6)} ${GROUND_Y} l5 -8`} className="j-tuft" />
        ))}
        <Markers stops={stops} />
        <Summit />
      </g>
      <g className="j-lift">
        <Hero sex={sex} pose={pose} />
      </g>
    </svg>
  );
}
