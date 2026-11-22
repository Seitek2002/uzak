"use client";

import { Apple, Cigarette, Footprints, Scale, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { decimal, deltaParts } from "@/shared/lib/format";
import { Figure } from "@/shared/ui/Figure";
import { HABITS, type HabitId } from "./habits";

const ICONS: Record<HabitId, LucideIcon> = {
  smoking: Cigarette,
  steps: Footprints,
  bmi: Scale,
  "fruits-vegetables": Apple,
};

/** The right edge of the life bar, in years of age. */
const BAR_END = 100;

/**
 * The model on four habits: switch them on and the life gets longer.
 * `forecasts` holds the model's own answer for every combination, the index
 * being the bit mask of the habits in their order.
 */
export function HabitLab({ forecasts }: { forecasts: number[] }) {
  const [mask, setMask] = useState(1);
  const tenth = (n: number) => Math.round(n * 10) / 10;
  const base = tenth(forecasts[0]);
  const changed = tenth(forecasts[mask]);
  const gain = tenth(changed - base);

  return (
    <div className="lab">
      <p className="lab__who">Пример: мужчина 40&nbsp;лет, курит, мало ходит</p>
      <ul className="lab__habits">
        {HABITS.map(({ id, label }, i) => {
          const Glyph = ICONS[id];
          const on = Boolean(mask & (1 << i));
          return (
            <li key={id}>
              <button type="button" className="lab__habit" aria-pressed={on} onClick={() => setMask(mask ^ (1 << i))}>
                <Glyph size={32} strokeWidth={2} aria-hidden="true" />
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="lab__result" aria-live="polite">
        <Figure parts={gain > 0 ? deltaParts(gain) : { num: "+0", unit: "лет" }} />
        <p>
          Прогноз {decimal(base)}, с изменениями {decimal(changed)}
        </p>
      </div>
      <div className="life" aria-hidden="true">
        <span className="life__gain" style={{ transform: `scaleX(${changed / BAR_END})` }} />
        <span className="life__now" style={{ transform: `scaleX(${base / BAR_END})` }} />
      </div>
    </div>
  );
}
