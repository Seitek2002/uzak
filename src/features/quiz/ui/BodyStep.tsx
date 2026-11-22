"use client";

import { useState } from "react";
import { bmiBand, bmiOf, FACTOR_BY_SLUG } from "@/entities/factor";
import { decimal } from "@/shared/lib/format";
import { Question, type HeadingRef } from "@/shared/ui/Quiz";
import { BODY_LIMITS, validBody, validHeight, validWeight } from "../model/body";
import { useQuiz } from "../model/store";
import { LOOKS } from "./visuals";

/** Countries that measure people in feet and pounds. */
const IMPERIAL_COUNTRIES = ["USA", "LBR", "MMR"];
const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

type Units = "metric" | "imperial";

interface Scale {
  min: number;
  max: number;
  step: number;
  /** Where the thumb rests before the first touch; it is not an answer. */
  rest: number;
  unit: string;
  toBase: (shown: number) => number;
  fromBase: (base: number) => number;
}

const same = (n: number) => n;
const toHalf = (n: number) => Math.round(n * 2) / 2;

const SCALES: Record<Units, { height: Scale; weight: Scale }> = {
  metric: {
    height: { ...BODY_LIMITS.height, step: 1, rest: 170, unit: "см", toBase: same, fromBase: Math.round },
    weight: { min: BODY_LIMITS.weight.min, max: 200, step: 0.5, rest: 70, unit: "кг", toBase: same, fromBase: toHalf },
  },
  imperial: {
    height: {
      min: 48,
      max: 90,
      step: 1,
      rest: 67,
      unit: "футы и дюймы",
      toBase: (inches) => inches * CM_PER_INCH,
      fromBase: (cm) => Math.round(cm / CM_PER_INCH),
    },
    weight: {
      min: 67,
      max: 440,
      step: 1,
      rest: 154,
      unit: "фунты",
      toBase: (lb) => lb * KG_PER_LB,
      fromBase: (kg) => Math.round(kg / KG_PER_LB),
    },
  },
};

const feet = (inches: number) => `${Math.floor(inches / 12)}′${inches % 12}″`;

export function BodyStep({ headingRef, error }: { headingRef: HeadingRef; error: string }) {
  const factor = FACTOR_BY_SLUG.get("bmi")!;
  const setBody = useQuiz((s) => s.setBody);
  const savedHeight = useQuiz.getState().height;
  const savedWeight = useQuiz.getState().weight;
  const [height, setHeight] = useState<number | undefined>(savedHeight);
  const [weight, setWeight] = useState<number | undefined>(savedWeight);
  const [units, setUnits] = useState<Units>(() =>
    IMPERIAL_COUNTRIES.includes(useQuiz.getState().answers["country-before"]) ? "imperial" : "metric",
  );
  const scale = SCALES[units];

  const save = (h: number | undefined, w: number | undefined) => {
    setHeight(h);
    setWeight(w);
    if (h !== undefined && w !== undefined && validBody(h, w)) setBody(h, w, bmiBand(bmiOf(h, w)));
    else useQuiz.setState({ height: undefined, weight: undefined });
  };

  const bmi = height !== undefined && weight !== undefined && validBody(height, weight) ? bmiOf(height, weight) : null;

  return (
    <fieldset>
      <Question look={LOOKS.bmi} headingRef={headingRef} title={factor.question} help={factor.help} helpId="help-body" />
      <div className="sliders">
        <Slider
          key={`height-${units}`}
          id="height"
          label="Рост"
          scale={scale.height}
          base={height}
          onBase={(h) => save(h, weight)}
          invalid={Boolean(error) && !validHeight(height ?? Number.NaN)}
          show={units === "imperial" ? feet : undefined}
        />
        <Slider
          key={`weight-${units}`}
          id="weight"
          label="Вес"
          scale={scale.weight}
          base={weight}
          onBase={(w) => save(height, w)}
          invalid={Boolean(error) && !validWeight(weight ?? Number.NaN)}
        />
        <button type="button" className="link sliders__units" onClick={() => setUnits(units === "metric" ? "imperial" : "metric")}>
          {units === "metric" ? "Указать в футах и фунтах" : "Указать в сантиметрах и килограммах"}
        </button>
      </div>
      <p className="error" id="body-error" role="alert">
        {error}
      </p>
      <div className="bmi-live" aria-live="polite">
        {bmi !== null && (
          <>
            <span className="figure">{decimal(bmi)}</span>
            <span className="label">индекс массы тела, {bandWord(bmiBand(bmi))}</span>
          </>
        )}
      </div>
      {bmi !== null && <BmiScale bmi={bmi} />}
    </fieldset>
  );
}

/** A slider with the value set large, typed when needed, and a button each side for the last step. */
function Slider({
  id,
  label,
  scale,
  base,
  onBase,
  invalid,
  show,
}: {
  id: "height" | "weight";
  label: string;
  scale: Scale;
  /** The value in centimetres or kilograms. */
  base: number | undefined;
  onBase: (base: number | undefined) => void;
  invalid: boolean;
  /** Set when the shown value cannot be typed as one number, as feet and inches. */
  show?: (shown: number) => string;
}) {
  const [raw, setRaw] = useState(base === undefined ? "" : String(scale.fromBase(base)));
  const typed = Number(raw.replace(",", "."));
  const shown = raw !== "" && Number.isFinite(typed) ? typed : undefined;
  const thumb = Math.min(Math.max(shown ?? scale.rest, scale.min), scale.max);

  const set = (value: number) => {
    setRaw(String(value));
    onBase(scale.toBase(value));
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
              inputMode="decimal"
              autoComplete="off"
              step="any"
              value={raw}
              aria-invalid={invalid || undefined}
              aria-describedby="help-body body-error"
              onChange={(e) => {
                setRaw(e.target.value);
                const n = Number(e.target.value.replace(",", "."));
                onBase(e.target.value !== "" && Number.isFinite(n) ? scale.toBase(n) : undefined);
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
          aria-describedby="body-error"
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

const BMI_FROM = 15;
const BMI_TO = 40;

/** The index on its scale: the blue stretch is the norm, the red mark is the person. */
function BmiScale({ bmi }: { bmi: number }) {
  const place = (v: number) => ((Math.min(Math.max(v, BMI_FROM), BMI_TO) - BMI_FROM) / (BMI_TO - BMI_FROM)) * 100;
  return (
    <div className="bmi-scale" aria-hidden="true">
      <span className="bmi-scale__norm" style={{ insetInline: `${place(18.5)}% ${100 - place(25)}%` }} />
      <span className="bmi-scale__you" style={{ insetInlineStart: `${place(bmi)}%` }} />
    </div>
  );
}

/** Plain words for the BMI band shown under the sliders. */
function bandWord(id: string): string {
  if (id === "lt18") return "ниже нормы";
  if (id === "18to20") return "на нижней границе нормы";
  if (id === "20to25") return "в норме";
  if (id === "25to27" || id === "27to30") return "выше нормы";
  return "ожирение";
}
