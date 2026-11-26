"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { deltaParts } from "@/shared/lib/format";
import { AUTO_ADVANCE_MS } from "@/shared/ui/Quiz";
import type { QuestionLook, Visual } from "@/shared/ui/Visual";

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export interface Reveal {
  id: string;
  /** Years this answer moved the hero's health. */
  delta: number;
  /** Years its next step could still bring back. */
  back: number;
}

/** The face picture of a card: the answer's icon in a medallion, or gold bars for a measure. */
function CardArt({ visual }: { visual?: Visual }) {
  if (!visual) return <span className="j-card__art" aria-hidden="true" />;
  if (visual.kind === "icon") {
    const Glyph = visual.icon;
    const many = (visual.times ?? 1) > 1;
    return (
      <span className="j-card__art" aria-hidden="true">
        {Array.from({ length: visual.times ?? 1 }, (_, i) => (
          <Glyph key={i} size={many ? 22 : 40} strokeWidth={1.75} />
        ))}
      </span>
    );
  }
  return (
    <span className="j-card__art j-card__art--meter" aria-hidden="true">
      {Array.from({ length: visual.of }, (_, i) => (
        <i key={i} className={i < visual.level ? "is-on" : ""} style={{ transform: `scaleY(${0.35 + (0.65 * (i + 1)) / visual.of})` }} />
      ))}
    </span>
  );
}

const canTilt = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Lean the card toward the pointer and move its sheen with it. */
function tilt(e: PointerEvent<HTMLLabelElement>) {
  if (!canTilt()) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty("--ry", `${((x - 0.5) * 14).toFixed(2)}deg`);
  el.style.setProperty("--rx", `${((0.5 - y) * 12).toFixed(2)}deg`);
  el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
  el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
}

function untilt(e: PointerEvent<HTMLLabelElement>) {
  const el = e.currentTarget;
  for (const p of ["--rx", "--ry", "--mx", "--my"]) el.style.removeProperty(p);
}

/**
 * The answers as a hand of cards. They are radio buttons: arrows move between
 * them and Enter plays the chosen one; a tap plays it at once. What a card
 * gives is hidden until it is played.
 */
export function Cards({
  name,
  options,
  value,
  onChange,
  onPlay,
  look,
  reveal,
  describedBy,
  error,
}: {
  name: string;
  options: { id: string; label: string }[];
  value?: string;
  onChange: (id: string) => void;
  onPlay: () => void;
  look?: QuestionLook;
  reveal: Reveal | null;
  describedBy?: string;
  error: string;
}) {
  const pointer = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // A new question deals a new hand.
  const [dealt, setDealt] = useState(name);
  useEffect(() => setDealt(name), [name]);

  return (
    <>
      <ul
        className={`j-hand${reveal ? " is-resolving" : ""}`}
        data-count={options.length}
        key={dealt}
        onPointerDown={() => {
          pointer.current = true;
        }}
      >
        {options.map((o, i) => {
          const played = reveal?.id === o.id;
          const parts = played ? deltaParts(reveal.delta) : null;
          const tone = !reveal ? "" : reveal.delta > 0.04 ? " is-heal" : reveal.delta < -0.04 ? " is-hurt" : " is-even";
          return (
            <li key={o.id} className={`j-slot${played ? ` is-played${tone}` : reveal ? " is-dim" : ""}`} style={{ "--i": i } as CSSProperties}>
              <input
                type="radio"
                id={`${name}-${o.id}`}
                name={name}
                value={o.id}
                checked={value === o.id}
                disabled={Boolean(reveal)}
                aria-describedby={describedBy}
                onChange={() => {
                  onChange(o.id);
                  if (!pointer.current) return;
                  pointer.current = false;
                  window.clearTimeout(timer.current);
                  timer.current = window.setTimeout(onPlay, Math.round(AUTO_ADVANCE_MS / 2));
                }}
              />
              <label htmlFor={`${name}-${o.id}`} className="j-card" onPointerMove={tilt} onPointerLeave={untilt}>
                <span className="j-card__inner">
                  <span className="j-card__face">
                    <span className="j-card__corner" aria-hidden="true">
                      {NUMERALS[i]}
                    </span>
                    <CardArt visual={look?.options?.[o.id]} />
                    <span className="j-card__title">{o.label}</span>
                    <span className="j-card__gem" aria-hidden="true" />
                  </span>
                  <span className="j-card__back" aria-hidden="true">
                    {parts && (
                      <>
                        <b>{parts.num}</b>
                        <span>{parts.unit}</span>
                        <small>
                          {reveal!.delta < -0.04 && reveal!.back > 0.04
                            ? `Можно вернуть ${deltaParts(reveal!.back).num} ${deltaParts(reveal!.back).unit}`
                            : reveal!.delta > 0.04
                              ? "В копилку героя"
                              : reveal!.delta < -0.04
                                ? "Учтено в прогнозе"
                                : "Как у ровесников"}
                        </small>
                      </>
                    )}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="error" role="alert">
        {error}
      </p>
    </>
  );
}
