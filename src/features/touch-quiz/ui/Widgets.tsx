"use client";

import { Apple, Banana, Carrot, Cherry, Citrus, Grape, HeartPulse, LeafyGreen, Minus, Moon, Plus, Wine, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { FACTOR_BY_SLUG } from "@/entities/factor";
import { useQuiz } from "@/features/quiz/model/store";
import { LOOKS } from "@/features/quiz/ui/visuals";
import { counted, decimal, thousands } from "@/shared/lib/format";
import { Slider } from "@/shared/ui/Slider";

/*
 * The questions of "Копилка лет" that are answered by doing something: food
 * on a plate, glasses on a table, hours of sleep, steps and a pulse counted
 * on the spot. Each one turns what was done into one of the test's answers
 * and shows which, so nothing is hidden from the model's view.
 */

export const TOUCH = new Set(["fruits-vegetables", "alcohol", "sleep", "steps", "heart-rate"]);

const labelOf = (slug: string, id: string | undefined) => FACTOR_BY_SLUG.get(slug)?.options.find((o) => o.id === id)?.label ?? "";

function Chosen({ slug }: { slug: string }) {
  const id = useQuiz((s) => s.answers[slug]);
  return (
    <p className="t-chosen" role="status">
      {id ? (
        <>
          Ответ для теста: <b>{labelOf(slug, id)}</b>
        </>
      ) : (
        "Ответ появится, когда начнёте"
      )}
    </p>
  );
}

function Stepper({ label, count, set, max, unit }: { label: string; count: number; set: (n: number) => void; max: number; unit: [string, string, string] }) {
  return (
    <div className="t-stepper">
      <button type="button" className="t-round" onClick={() => set(Math.max(count - 1, 0))} disabled={count <= 0} aria-label={`${label}: меньше`}>
        <Minus size={22} strokeWidth={2.5} aria-hidden="true" />
      </button>
      <output className="t-count" aria-live="polite">
        {counted(count, unit)}
      </output>
      <button type="button" className="t-round" onClick={() => set(Math.min(count + 1, max))} disabled={count >= max} aria-label={`${label}: больше`}>
        <Plus size={22} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  );
}

const FOODS: LucideIcon[] = [Apple, Carrot, LeafyGreen, Citrus, Cherry, Banana, Grape];
const PORTIONS: [string, string, string] = ["порция", "порции", "порций"];
const plateOption = (n: number) => (n < 1 ? "lt1" : n <= 2 ? "1to2" : n <= 4 ? "3to4" : "5plus");
const PLATE_START: Record<string, number> = { lt1: 0, "1to2": 2, "3to4": 3, "5plus": 5 };

/** Portions of vegetables and fruit a day, put on a plate one by one. */
export function Plate() {
  const answer = useQuiz((s) => s.answer);
  const [n, setN] = useState(() => PLATE_START[useQuiz.getState().answers["fruits-vegetables"]] ?? -1);
  const set = (next: number) => {
    setN(next);
    answer("fruits-vegetables", plateOption(next));
  };
  const shown = Math.max(n, 0);
  return (
    <div className="t-widget">
      <div className="t-plate" aria-hidden="true" onClick={() => set(Math.min(shown + 1, 7))}>
        {Array.from({ length: shown }, (_, i) => {
          const Food = FOODS[i % FOODS.length];
          return (
            <span key={i} className="t-food" style={{ "--a": `${(i * 360) / Math.max(shown, 1)}deg`, "--r": shown === 1 ? "0px" : "4.25rem" } as CSSProperties}>
              <Food size={30} strokeWidth={2} />
            </span>
          );
        })}
        {shown === 0 && <span className="t-plate__empty">Пусто</span>}
      </div>
      <Stepper label="Порции за день" count={shown} set={set} max={7} unit={PORTIONS} />
      <Chosen slug="fruits-vegetables" />
    </div>
  );
}

const GLASSES: [string, string, string] = ["порция", "порции", "порций"];
const glassOption = (n: number) => (n === 0 ? "none" : n < 10 ? "low" : n < 20 ? "mid" : n < 35 ? "high" : "heavy");
const GLASS_START: Record<string, number> = { none: 0, low: 5, mid: 14, high: 26, heavy: 38 };

/** Drinks a week as glasses on a table. */
export function Glasses() {
  const answer = useQuiz((s) => s.answer);
  const [n, setN] = useState(() => GLASS_START[useQuiz.getState().answers.alcohol] ?? -1);
  const set = (next: number) => {
    setN(next);
    answer("alcohol", glassOption(next));
  };
  const shown = Math.max(n, 0);
  return (
    <div className="t-widget">
      <div className="t-table" aria-hidden="true">
        {shown === 0 && <span className="t-plate__empty">Ни одной за неделю</span>}
        {Array.from({ length: Math.min(shown, 40) }, (_, i) => (
          <Wine key={i} size={22} strokeWidth={2} className="t-glass" />
        ))}
      </div>
      <Stepper label="Порции за неделю" count={shown} set={set} max={50} unit={GLASSES} />
      <div className="t-quick">
        <button type="button" className="t-pill" onClick={() => set(0)}>
          Не пью
        </button>
        <button type="button" className="t-pill" onClick={() => set(Math.min(shown + 5, 50))}>
          Ещё 5
        </button>
      </div>
      <Chosen slug="alcohol" />
    </div>
  );
}

const sleepOption = (h: number) => (h < 6 ? "lt6" : h < 7 ? "6to7" : h < 8 ? "7to8" : h < 9 ? "8to9" : "gt9");
const SLEEP_START: Record<string, number> = { lt6: 5.5, "6to7": 6.5, "7to8": 7.5, "8to9": 8.5, gt9: 9.5 };

/** Hours of sleep on a slider, drawn as moons. */
export function Sleep({ error }: { error: string }) {
  const answer = useQuiz((s) => s.answer);
  const [h, setH] = useState<number | undefined>(() => SLEEP_START[useQuiz.getState().answers.sleep]);
  return (
    <div className="t-widget">
      <div className="t-moons" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <Moon key={i} size={20} strokeWidth={2} className={h !== undefined && i < Math.round(h) ? "is-on" : ""} />
        ))}
      </div>
      <div className="sliders">
        <Slider
          id="sleep-hours"
          label="Часов сна за ночь"
          scale={{ min: 3, max: 12, step: 0.5, rest: 7.5, unit: "ч" }}
          base={h}
          onBase={(v) => {
            setH(v);
            if (v !== undefined && v >= 3 && v <= 12) answer("sleep", sleepOption(v));
          }}
          invalid={Boolean(error)}
          describedBy="help-sleep"
        />
      </div>
      <Chosen slug="sleep" />
    </div>
  );
}

const stepsOption = (n: number) => (n < 4000 ? "lt4" : n < 6000 ? "4to6" : n < 8000 ? "6to8" : n < 10000 ? "8to10" : "gt10");
const STEPS_START: Record<string, number> = { lt4: 3000, "4to6": 5000, "6to8": 7000, "8to10": 9000, gt10: 12000 };

/** Steps a day: the walker changes from a snail to a mountain climber. */
export function Steps({ error }: { error: string }) {
  const answer = useQuiz((s) => s.answer);
  const chosen = useQuiz((s) => s.answers.steps);
  const [n, setN] = useState<number | undefined>(() => STEPS_START[useQuiz.getState().answers.steps]);
  const visual = chosen ? LOOKS.steps.options?.[chosen] : undefined;
  const Walker = visual?.kind === "icon" ? visual.icon : null;
  return (
    <div className="t-widget">
      <div className="t-walker" aria-hidden="true">
        {Walker && <Walker key={chosen} size={56} strokeWidth={1.75} />}
        <span>{n !== undefined ? thousands(n) : "?"}</span>
      </div>
      <div className="sliders">
        <Slider
          id="steps-day"
          label="Шагов в день"
          scale={{ min: 0, max: 20000, step: 500, rest: 6000, unit: "шагов" }}
          base={n}
          inputMode="numeric"
          onBase={(v) => {
            setN(v);
            if (v !== undefined && v >= 0 && v <= 20000) answer("steps", stepsOption(v));
          }}
          invalid={Boolean(error)}
          describedBy="help-steps"
        />
      </div>
      <Chosen slug="steps" />
    </div>
  );
}

const pulseOption = (bpm: number) => (bpm < 60 ? "lt60" : bpm < 70 ? "60to69" : bpm < 80 ? "70to79" : bpm < 90 ? "80to89" : "gt90");
const COUNT_S = 15;

/** The resting pulse, counted now: a tap on the heart for every beat for fifteen seconds. */
export function Pulse({ onPlain }: { onPlain: () => void }) {
  const answer = useQuiz((s) => s.answer);
  const [phase, setPhase] = useState<"idle" | "counting" | "done">("idle");
  const [taps, setTaps] = useState(0);
  const [left, setLeft] = useState(COUNT_S);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = () => {
    setTaps(0);
    setLeft(COUNT_S);
    setPhase("counting");
    const until = Date.now() + COUNT_S * 1000;
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      const rest = Math.max(Math.ceil((until - Date.now()) / 1000), 0);
      setLeft(rest);
      if (rest === 0) {
        window.clearInterval(timer.current);
        setPhase("done");
      }
    }, 200);
  };
  const bpm = taps * (60 / COUNT_S);
  useEffect(() => {
    if (phase === "done" && taps >= 6) answer("heart-rate", pulseOption(bpm));
  }, [phase, taps, bpm, answer]);

  return (
    <div className="t-widget">
      <p className="t-hint">Сядьте и посидите минуту. Положите два пальца на запястье или шею, нажмите «Начать» и касайтесь сердца на каждый удар.</p>
      <button
        type="button"
        className={`t-heart${phase === "counting" ? " is-counting" : ""}`}
        onClick={() => (phase === "counting" ? setTaps((t) => t + 1) : start())}
        aria-label={phase === "counting" ? `Удар. Осталось ${left} с` : "Начать замер пульса"}
      >
        <HeartPulse size={56} strokeWidth={1.75} aria-hidden="true" />
        <span aria-hidden="true">{phase === "counting" ? taps : "Начать"}</span>
      </button>
      <p className="t-count" role="status">
        {phase === "counting" ? `Осталось ${left} с` : phase === "done" ? (taps >= 6 ? `${decimal(bpm, 0)} ударов в минуту` : "Ударов слишком мало, попробуйте ещё раз") : ""}
      </p>
      {phase === "done" && (
        <button type="button" className="t-pill" onClick={start}>
          Замерить ещё раз
        </button>
      )}
      <Chosen slug="heart-rate" />
      <button type="button" className="t-plain" onClick={onPlain}>
        Выбрать из вариантов
      </button>
    </div>
  );
}
