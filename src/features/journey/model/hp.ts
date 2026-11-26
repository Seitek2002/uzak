/*
 * The hero's health in "Путь героя": the model's forecast in years for the
 * answers given so far. A question not reached yet counts as the average
 * peer's answer, so the journey starts at the average for this sex, age and
 * country and every answer moves it from there. With every answer given, it
 * is the forecast of the report.
 */
import { FACTORS } from "../../../entities/factor/model/factors.ts";
import { forecast, PEERS, type Answers, type Profile } from "../../../entities/result/model/engine.ts";

/** The answers so far, the questions ahead as the average peer. */
export function sofar(answers: Answers): Answers {
  const filled: Answers = { ...answers };
  for (const f of FACTORS) if (f.kind !== "country" && !filled[f.slug]) filled[f.slug] = PEERS;
  return filled;
}

/** Only the answers to the steps before `step`: a later answer kept from going back does not count yet. */
export function answersBefore(answers: Answers, steps: readonly string[], step: number): Answers {
  const reached = new Set(steps.slice(0, step));
  return Object.fromEntries(Object.entries(answers).filter(([slug]) => reached.has(slug)));
}

/** Health points: the expected age for the answers so far. */
export const hpOf = (profile: Profile, answers: Answers) => forecast(profile, sofar(answers));

/** Years the realistic next step of each answered question would add, all together. */
export function reserveOf(profile: Profile, answers: Answers): number {
  const now = sofar(answers);
  const better: Answers = { ...now };
  for (const f of FACTORS) {
    if (!f.modifiable || !answers[f.slug]) continue;
    const step = f.options.find((o) => o.id === answers[f.slug])?.improveTo;
    if (step) better[f.slug] = step;
  }
  return Math.max(forecast(profile, better) - forecast(profile, now), 0);
}
