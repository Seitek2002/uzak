/*
 * "Bonus years": the three changes of the report become 21-day quests. A day
 * is ticked by the person, never measured. When all days are ticked, the new
 * answer goes into the report as a new attempt and the years the model gives
 * for it move to the bank. The years are the model's estimate for the new
 * answer, the same number the report shows, not a promise.
 */
import { assess, type Answers, type Assessment, type Profile } from "../../../entities/result/model/engine.ts";

export const QUEST_DAYS = 21;

export interface Quest {
  slug: string;
  /** The answer when the quest began. */
  from: string;
  /** The answer the quest leads to. */
  to: string;
  started: string;
  /** Local calendar days ticked, as YYYY-MM-DD. */
  marks: string[];
  /** Set when the new answer went into the report. */
  done?: string;
  /** Years the new answer added to the forecast at that moment. */
  bonus?: number;
}

/** The local calendar day of a moment, as YYYY-MM-DD. */
export function dayKey(at: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

const dayBefore = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
};

/** Days in a row up to today, or up to yesterday while today is not ticked yet. */
export function streakOf(marks: string[], today = dayKey()): number {
  const set = new Set(marks);
  let day = set.has(today) ? today : dayBefore(today);
  let n = 0;
  while (set.has(day)) {
    n += 1;
    day = dayBefore(day);
  }
  return n;
}

/** The longest run of days in a row. */
export function bestStreakOf(marks: string[]): number {
  const sorted = [...new Set(marks)].sort();
  let best = 0;
  let run = 0;
  let last = "";
  for (const day of sorted) {
    run = last && dayBefore(day) === last ? run + 1 : 1;
    best = Math.max(best, run);
    last = day;
  }
  return best;
}

export const isReady = (q: Quest) => !q.done && new Set(q.marks).size >= QUEST_DAYS;

/*
 * Where a quest leads. The report's next step is the realistic answer in a
 * few years; three weeks change today's answer only. A smoker who stops now
 * has "quit less than 10 years ago", not "more than 10".
 */
export function questTarget(slug: string, improveTo: string): string {
  if (slug === "smoking" && improveTo === "quit10") return "quit";
  return improveTo;
}

/** Years the new answer adds to the forecast of these answers. */
export function bonusOf(profile: Profile, answers: Answers, slug: string, to: string, date: string): number {
  const now = assess(profile, answers, date);
  const then = assess(profile, { ...answers, [slug]: to }, date);
  return Math.max(then.forecast - now.forecast, 0);
}

/** The quests to show: those under way first, then the strongest changes, three in all. Finished quests are not passed in. */
export function questSlots(result: Assessment, quests: Record<string, Quest>): Array<{ slug: string; option: string; to: string; gain: number }> {
  const open = Object.values(quests).filter((q) => !q.done);
  const byGain = result.factors.filter((f) => f.gain >= 0.1 && f.improveTo).sort((a, b) => b.gain - a.gain);
  const slots: Array<{ slug: string; option: string; to: string; gain: number }> = [];
  for (const q of open) {
    const f = result.factors.find((x) => x.slug === q.slug);
    slots.push({ slug: q.slug, option: f?.option ?? q.from, to: q.to, gain: f?.gain ?? 0 });
  }
  for (const f of byGain) {
    if (slots.length >= 3) break;
    if (slots.some((s) => s.slug === f.slug)) continue;
    const to = questTarget(f.slug, f.improveTo!);
    // A recent quitter's next step is time itself: there is no new answer to reach in three weeks.
    if (to === f.option) continue;
    slots.push({ slug: f.slug, option: f.option, to, gain: f.gain });
  }
  return slots.slice(0, 3);
}

export interface BadgeFacts {
  attempts: number;
  /** At least one blood test answered with a number. */
  knowsNumbers: boolean;
  petAttempts: number;
  quests: Quest[];
}

export interface Badge {
  id: string;
  earned: boolean;
}

/** The badges in the order of the shelf; their names and pictures live in the interface. */
export function badgesOf(f: BadgeFacts): Badge[] {
  const done = f.quests.filter((q) => q.done).length;
  return [
    { id: "first", earned: f.attempts >= 1 },
    { id: "numbers", earned: f.knowsNumbers },
    { id: "pet", earned: f.petAttempts >= 1 },
    { id: "start", earned: f.quests.length >= 1 },
    { id: "week", earned: f.quests.some((q) => bestStreakOf(q.marks) >= 7) },
    { id: "quest", earned: done >= 1 },
    { id: "three", earned: done >= 3 },
    { id: "again", earned: f.attempts >= 2 },
  ];
}
