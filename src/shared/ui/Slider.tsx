"use client";

import { useState } from "react";
import { decimal } from "@/shared/lib/format";

export interface SliderScale {
  min: number;
  max: number;
  step: number;
  /** Where the thumb rests before the first touch; it is not an answer. */
  rest: number;
  unit: string;
  /** From the shown unit to the stored one (feet to centimetres); the same number when omitted. */
  toBase?: (shown: number) => number;
  fromBase?: (base: number) => number;
}

const same = (n: number) => n;

/** A slider with the value set large, typed when needed, and a button each side for the last step. */
export function Slider({
  id,
  label,
  scale,
  base,
  onBase,
  invalid,
  describedBy,
  show,
  inputMode = "decimal",
}: {
  /** The typed field gets this id, the range `${id}-range`. */
  id: string;
  label: string;
  scale: SliderScale;
  /** The stored value. */
  base: number | undefined;
  onBase: (base: number | undefined) => void;
  invalid: boolean;
  describedBy: string;
  /** Set when the shown value cannot be typed as one number, as feet and inches. */
  show?: (shown: number) => string;
  inputMode?: "decimal" | "numeric";
}) {
  const toBase = scale.toBase ?? same;
  const fromBase = scale.fromBase ?? same;
  const [raw, setRaw] = useState(base === undefined || Number.isNaN(base) ? "" : String(fromBase(base)));
  const typed = Number(raw.replace(",", "."));
  const shown = raw !== "" && Number.isFinite(typed) ? typed : undefined;
  const thumb = Math.min(Math.max(shown ?? scale.rest, scale.min), scale.max);

  const set = (value: number) => {
    setRaw(String(value));
    onBase(toBase(value));
  };
  const nudge = (by: number) => set(shown === undefined ? scale.rest : Math.min(Math.max(shown + by, scale.min), scale.max));

  return (
    <div className="slider">
      <div className="slider__top">
        <label htmlFor={show ? `${id}-range` : id}>{label}</label>
        <div className="slider__value">
          {show ? (
            <output className="slider__output" htmlFor={`${id}-range`}>
              {shown === undefined ? "" : show(shown)}
            </output>
          ) : (
            <input
              id={id}
              name={id}
              type="number"
              inputMode={inputMode}
              autoComplete="off"
              step="any"
              value={raw}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(e) => {
                setRaw(e.target.value);
                const n = Number(e.target.value.replace(",", "."));
                onBase(e.target.value !== "" && Number.isFinite(n) ? toBase(n) : undefined);
              }}
            />
          )}
          <span className="slider__unit">{scale.unit}</span>
        </div>
      </div>
      <div className="slider__track">
        <button type="button" className="slider__nudge" aria-label={`${label}: меньше`} onClick={() => nudge(-scale.step)}>
          −
        </button>
        <input
          id={`${id}-range`}
          className={shown === undefined ? "range range--empty" : "range"}
          type="range"
          min={scale.min}
          max={scale.max}
          step={scale.step}
          value={thumb}
          aria-label={label}
          aria-valuetext={shown === undefined ? "Не указан" : show ? show(shown) : `${decimal(shown)} ${scale.unit}`}
          aria-describedby={describedBy}
          onChange={(e) => set(Number(e.target.value))}
          // A tap on the resting thumb changes nothing, so it fires no change event.
          onPointerUp={(e) => {
            if (shown === undefined) set(Number(e.currentTarget.value));
          }}
        />
        <button type="button" className="slider__nudge" aria-label={`${label}: больше`} onClick={() => nudge(scale.step)}>
          +
        </button>
      </div>
    </div>
  );
}
