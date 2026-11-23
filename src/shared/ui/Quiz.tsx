"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { nb } from "@/shared/lib/format";
import { HintRow, OptionVisual, type QuestionLook } from "./Visual";
import { Wordmark } from "./Wordmark";

/** Help up to this length stays in sight; longer help folds under "Подсказка". */
const SHORT_HELP = 48;

/** Pause between a tap on an answer and the next question: long enough to see the pick land. */
export const AUTO_ADVANCE_MS = 420;

export type HeadingRef = RefObject<HTMLHeadingElement | null>;

/** The bar above a test: wordmark, question count and a progress line. */
export function QuizTop({ step, total, extra }: { step: number; total: number; extra?: ReactNode }) {
  const done = Math.min((step + 1) / total, 1);
  return (
    <header className="quiz-top">
      <div className="container quiz-top__inner">
        <Wordmark />
        <p className="label" id="quiz-progress">
          {extra}
          Вопрос {step + 1} из {total}
        </p>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-labelledby="quiz-progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step + 1}
      >
        <span style={{ transform: `scaleX(${done})` }} />
      </div>
    </header>
  );
}

/** The question as the fieldset legend and the page heading, with an optional hint under it. */
export function Question({
  headingRef,
  title,
  help,
  helpId,
  look,
}: {
  headingRef: HeadingRef;
  title: string;
  help?: string;
  helpId: string;
  look: QuestionLook;
}) {
  const Glyph = look.icon;
  return (
    <>
      <legend>
        <span className="quiz__icon" aria-hidden="true">
          <Glyph size={32} strokeWidth={2} />
        </span>
        <h1 ref={headingRef} tabIndex={-1}>
          {nb(title)}
        </h1>
      </legend>
      {look.hints && <HintRow hints={look.hints} />}
      {help &&
        (help.length <= SHORT_HELP ? (
          <p className="quiz__help" id={helpId}>
            {nb(help)}
          </p>
        ) : (
          <details className="quiz__more">
            <summary>Подсказка</summary>
            <p className="quiz__help" id={helpId}>
              {nb(help)}
            </p>
          </details>
        ))}
    </>
  );
}

/** Advances after a pointer pick; keyboard users move between options with arrows and confirm with Enter. */
export function usePointerAdvance(onPick: () => void) {
  const pointer = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return {
    onPointerDown: () => {
      pointer.current = true;
    },
    afterChange: () => {
      if (!pointer.current) return;
      pointer.current = false;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(onPick, AUTO_ADVANCE_MS);
    },
  };
}

/** A short buzz on phones that have it, unless the person asked for less motion. */
function cheer() {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  navigator.vibrate(12);
}

/** Sparks that fly out of the tile of the picked answer. */
function Burst() {
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} style={{ "--turn": `${i * 36 + 18}deg` } as React.CSSProperties} />
      ))}
    </span>
  );
}

/** Radio answers as full-width rows; a tap picks and moves on. */
export function Options({
  name,
  options,
  value,
  onChange,
  onPick,
  describedBy,
  error,
  look,
}: {
  name: string;
  options: { id: string; label: string }[];
  value?: string;
  onChange: (id: string) => void;
  onPick: () => void;
  describedBy?: string;
  error: string;
  look: QuestionLook;
}) {
  const { onPointerDown, afterChange } = usePointerAdvance(onPick);
  // Each pick replays the burst, even on the same answer.
  const [picks, setPicks] = useState(0);
  return (
    <>
      <ul className="options" onPointerDown={onPointerDown}>
        {options.map((o) => (
          <li className="option" key={o.id}>
            <input
              type="radio"
              id={`${name}-${o.id}`}
              name={name}
              value={o.id}
              checked={value === o.id}
              aria-describedby={describedBy}
              onChange={() => {
                onChange(o.id);
                setPicks((n) => n + 1);
                cheer();
                afterChange();
              }}
            />
            <label htmlFor={`${name}-${o.id}`}>
              {look.options?.[o.id] ? <OptionVisual visual={look.options[o.id]} /> : <span className="option__blank" aria-hidden="true" />}
              <span>{o.label}</span>
              <span className="option__check" aria-hidden="true">
                <Check size={16} strokeWidth={3} />
              </span>
              {value === o.id && picks > 0 && <Burst key={picks} />}
            </label>
          </li>
        ))}
      </ul>
      <p className="error" role="alert">
        {error}
      </p>
    </>
  );
}
