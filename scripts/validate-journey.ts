/*
 * Checks of the hero's health in "Путь героя": it starts at the average peer,
 * moves with each answer and ends on the forecast of the report.
 *
 *   npm run test:journey
 */
import { FACTORS } from "../src/entities/factor/model/factors.ts";
import { assess, averageForecast, type Answers } from "../src/entities/result/model/engine.ts";
import { answersBefore, hpOf, reserveOf } from "../src/features/journey/model/hp.ts";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `: ${detail}`}`);
};

const profile = { sex: "female" as const, age: 40 };
const date = "2026-11-26T10:00:00.000Z";
const place: Answers = { "country-before": "KGZ", "country-next": "KGZ" };

const start = hpOf(profile, place);
const average = averageForecast(profile, "KGZ");
check("the journey starts near the average peer of the country", Math.abs(start - average) < 1.5, `${start.toFixed(2)} vs ${average.toFixed(2)}`);

// A whole answer sheet, the second option of each choice.
const sheet: Answers = { ...place };
for (const f of FACTORS) if (f.kind === "choice") sheet[f.slug] = f.options[Math.min(1, f.options.length - 1)].id;
sheet.bmi = "25to27";
const report = assess(profile, sheet, date);
check("with every answer the health is the report's forecast", Math.abs(hpOf(profile, sheet) - report.forecast) < 1e-9, `${hpOf(profile, sheet)} vs ${report.forecast}`);
check("the reserve at the end is the report's potential", Math.abs(reserveOf(profile, sheet) - (report.potential - report.forecast)) < 1e-6, `${reserveOf(profile, sheet)} vs ${report.potential - report.forecast}`);

// Answer by answer the steps add up to the whole way.
const order = FACTORS.filter((f) => f.kind !== "country").map((f) => f.slug);
let given: Answers = { ...place };
let sum = 0;
for (const slug of order) {
  const before = hpOf(profile, given);
  given = { ...given, [slug]: sheet[slug] };
  sum += hpOf(profile, given) - before;
}
check("the steps add up to the way from start to end", Math.abs(start + sum - report.forecast) < 1e-9);

const smoker = hpOf(profile, { ...place, smoking: "heavy" });
const never = hpOf(profile, { ...place, smoking: "never" });
check("smoking takes health, never smoking gives it", smoker < start && never > start, `${smoker.toFixed(2)} ${start.toFixed(2)} ${never.toFixed(2)}`);
check("a heavy smoker has a reserve, a non-smoker none for it", reserveOf(profile, { ...place, smoking: "heavy" }) > 0.5 && reserveOf(profile, { ...place, smoking: "never" }) < 1e-9);

const steps = ["sex", "age", "country-before", "country-next", "smoking", "alcohol"];
const kept = answersBefore({ ...place, smoking: "heavy", alcohol: "none" }, steps, 5);
check("answers past the current question do not count yet", kept.smoking === "heavy" && kept.alcohol === undefined);

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
