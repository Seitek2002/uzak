"use client";

import type { CSSProperties } from "react";

/*
 * The jar of "Копилка лет": coins of years fill it up to the forecast. A good
 * answer drops coins in, a weak one lifts some out to the reserve beside it.
 */

const BODY = "M30 28 Q20 32 20 46 L20 132 Q20 148 38 148 L82 148 Q100 148 100 132 L100 46 Q100 32 90 28 Z";
const TOP = 34;
const BOTTOM = 148;

/** Rows of coins seen through the glass, from the bottom up. */
const COINS = (() => {
  const out: Array<{ x: number; y: number }> = [];
  for (let row = 0; row < 15; row += 1) {
    const y = BOTTOM - 5 - row * 8;
    const shift = row % 2 ? 11 : 0;
    for (let x = 30 + shift; x < 96; x += 22) out.push({ x, y });
  }
  return out;
})();

export function Jar({ level, fx }: { level: number; fx: { key: number; delta: number } | null }) {
  const height = (BOTTOM - TOP) * Math.min(Math.max(level, 0), 1);
  const drops = fx && fx.delta > 0.04 ? Math.min(2 + Math.round(fx.delta * 3), 7) : 0;
  const lifts = fx && fx.delta < -0.04 ? Math.min(2 + Math.round(-fx.delta * 3), 7) : 0;
  return (
    <svg className="t-jar" viewBox="0 0 150 160" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="t-jar-clip">
          <path d={BODY} />
        </clipPath>
      </defs>
      <path d={BODY} className="t-jar__glass" />
      <g clipPath="url(#t-jar-clip)">
        <g className="t-jar__fill" style={{ transform: `translateY(${(BOTTOM - TOP - height).toFixed(1)}px)` } as CSSProperties}>
          <rect x="16" y={TOP} width="90" height={BOTTOM - TOP + 6} className="t-jar__honey" />
          {COINS.map((c, i) => (
            <ellipse key={i} cx={c.x} cy={c.y} rx="10.5" ry="4.4" className="t-jar__coin" />
          ))}
        </g>
      </g>
      <path d="M30 46 Q28 90 32 132" className="t-jar__shine" />
      <rect x="26" y="16" width="68" height="13" rx="4" className="t-jar__lid" />
      <rect x="22" y="26" width="76" height="6" rx="3" className="t-jar__ring" />
      <path d="M48 16 L72 16" className="t-jar__slot" />
      {fx && (
        <g key={fx.key} className="t-jar__fx">
          {Array.from({ length: drops }, (_, i) => (
            <ellipse key={`d${i}`} cx={52 + ((i * 7) % 16)} cy="10" rx="7" ry="7" className="t-coin-drop" style={{ "--d": `${i * 90}ms` } as CSSProperties} />
          ))}
          {Array.from({ length: lifts }, (_, i) => (
            <ellipse key={`l${i}`} cx={60} cy="40" rx="6" ry="6" className="t-coin-lift" style={{ "--d": `${i * 80}ms`, "--dx": `${40 + i * 7}px`, "--dy": `${20 - i * 9}px` } as CSSProperties} />
          ))}
        </g>
      )}
    </svg>
  );
}
