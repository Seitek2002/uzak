"use client";

import { useState } from "react";
import { bmiBand, bmiOf, FACTOR_BY_SLUG } from "@/entities/factor";
import { decimal } from "@/shared/lib/format";
import { Question, type HeadingRef } from "@/shared/ui/Quiz";
import { Slider, type SliderScale } from "@/shared/ui/Slider";
import { BODY_LIMITS, validBody, validHeight, validWeight } from "../model/body";
import { useQuiz } from "../model/store";
import { LOOKS } from "./visuals";

/** Countries that measure people in feet and pounds. */
const IMPERIAL_COUNTRIES = ["USA", "LBR", "MMR"];
const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

type Units = "metric" | "imperial";

type Scale = SliderScale & Required<Pick<SliderScale, "toBase" | "fromBase">>;

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
          describedBy="help-body body-error"
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
          describedBy="help-body body-error"
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
