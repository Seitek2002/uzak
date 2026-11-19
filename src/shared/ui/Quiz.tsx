"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { nb } from "@/shared/lib/format";
import { Wordmark } from "./Wordmark";

/** Pause between a tap on an answer and the next question: long enough to see the pick land. */
export const AUTO_ADVANCE_MS = 280;

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
export function Question({ headingRef, title, help, helpId }: { headingRef: HeadingRef; title: string; help?: string; helpId: string }) {
  return (
    <>
      <legend>
        <h1 ref={headingRef} tabIndex={-1}>
          {nb(title)}
        </h1>
      </legend>
      {help && (
        <p className="quiz__help" id={helpId}>
          {nb(help)}
        </p>
      )}
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

/** Radio answers as full-width rows; a tap picks and moves on. */
export function Options({
  name,
  options,
  value,
  onChange,
  onPick,
  describedBy,
  error,
}: {
  name: string;
  options: { id: string; label: string }[];
  value?: string;
  onChange: (id: string) => void;
  onPick: () => void;
  describedBy?: string;
  error: string;
}) {
  const { onPointerDown, afterChange } = usePointerAdvance(onPick);
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
                afterChange();
              }}
            />
            <label htmlFor={`${name}-${o.id}`}>{o.label}</label>
          </li>
        ))}
      </ul>
      <p className="error" role="alert">
        {error}
      </p>
    </>
  );
}
