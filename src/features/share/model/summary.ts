import { assess } from "@/entities/result";
import type { Attempt } from "@/features/quiz/model/store";
import { actionFor } from "./actions";

/** A change too small to print as a gain. */
const MIN_GAIN = 0.1;
const MAX_STEPS = 3;

export interface ShareStep {
  slug: string;
  action: string;
  years: number;
}

export interface ShareSummary {
  name?: string;
  forecast: number;
  potential: number;
  /** The difference of the two printed numbers, so the picture adds up. */
  gain: number;
  steps: ShareStep[];
}

/** What the person chose to put on the picture. */
export interface ShareShow {
  name: boolean;
  ages: boolean;
  steps: boolean;
}

const tenth = (n: number) => Math.round(n * 10) / 10;

export function summaryOf(attempt: Attempt): ShareSummary {
  const result = assess(attempt.profile, attempt.answers, attempt.date);
  const forecast = tenth(result.forecast);
  const potential = Math.max(tenth(result.potential), forecast);
  const steps = result.factors
    .filter((f) => f.improveTo && f.gain >= MIN_GAIN)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, MAX_STEPS)
    .flatMap((f) => {
      const action = actionFor(f.slug, f.option);
      return action ? [{ slug: f.slug, action, years: f.gain }] : [];
    });
  return { name: attempt.name, forecast, potential, gain: tenth(potential - forecast), steps };
}
