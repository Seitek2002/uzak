"use client";

import { useId, useState } from "react";
import { deltaParts, thousands } from "@/shared/lib/format";
import { Figure } from "@/shared/ui/Figure";
import { STEPS_MAX, STEPS_MIN, STEPS_STEP } from "./steps";

/** The test's step-count question, live: drag the count and the years change at poster scale. */
export function HeroProbe({ years: table, total }: { years: number[]; total: number }) {
  const [steps, setSteps] = useState(8000);
  const id = useId();
  const years = table[Math.round((steps - STEPS_MIN) / STEPS_STEP)] ?? 0;

  return (
    <div className="probe">
      <p className="probe__meta">
        <span>Один фактор из {total}</span>
        <span>Движение</span>
      </p>
      <label className="probe__q" htmlFor={id}>
        Сколько шагов в день вы проходите в среднем?
      </label>
      <div>
        <div className="probe__value">
          <output htmlFor={id}>{thousands(steps)}</output>
          <span>шагов</span>
        </div>
        <input
          id={id}
          className="range"
          type="range"
          min={STEPS_MIN}
          max={STEPS_MAX}
          step={STEPS_STEP}
          value={steps}
          aria-valuetext={`${thousands(steps)} шагов в день`}
          onChange={(e) => setSteps(Number(e.target.value))}
        />
      </div>
      <div className="probe__years" aria-live="polite">
        <Figure parts={deltaParts(years)} />
        <p>к прогнозу для человека 40 лет по сравнению с 5&nbsp;000 шагов</p>
      </div>
    </div>
  );
}
