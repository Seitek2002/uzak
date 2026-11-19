/*
 * Prints the model on reference profiles: run `npm run test:model`.
 * The assertions live in scripts/validate-model.ts; this file is for reading.
 */
import { assess, factorRange, lifeExpectancyAt, stepsEffect } from "../src/entities/result/model/engine.ts";
import { FACTORS } from "../src/entities/factor/model/factors.ts";

const r = (n: number) => Math.round(n * 10) / 10;
const show = (name: string, sex: "male" | "female", age: number, answers: Record<string, string>) => {
  const a = assess({ sex, age }, answers);
  const top = a.factors
    .filter((f) => Math.abs(f.years) >= 0.3)
    .sort((x, y) => x.years - y.years)
    .map((f) => `${f.slug} ${r(f.years)}`)
    .join(", ");
  console.log(
    `${name.padEnd(28)} ${sex.padEnd(6)} ${age}: forecast ${r(a.forecast)} peers ${r(a.peers)} potential +${r(a.potential - a.forecast)} bio ${r(a.bioAge)} | ${top}`,
  );
};
const best = Object.fromEntries(FACTORS.map((f) => [f.slug, f.best]));
const worst = Object.fromEntries(
  FACTORS.filter((f) => f.kind !== "country").map((f) => [f.slug, f.options.filter((o) => !o.unknown).sort((a, b) => b.hr - a.hr)[0].id]),
);
console.log("period e30 from the KGZ table: male", r(lifeExpectancyAt("KGZ", "male", 30)), "female", r(lifeExpectancyAt("KGZ", "female", 30)));
for (const age of [30, 40, 50, 60, 70]) {
  show("typical answers", "male", age, {});
  show("typical answers", "female", age, {});
}
show("ideal", "male", 40, best);
show("ideal", "female", 40, best);
show("worst", "male", 40, worst);
show("heavy smoker only", "male", 40, { smoking: "heavy" });
show("never smoker only", "male", 40, { smoking: "never" });
show("smoker, inactive, bmi 30", "male", 45, { smoking: "heavy", activity: "none", steps: "lt4", bmi: "30to35", "blood-pressure": "140" });
show("diabetes + MI", "male", 55, { diabetes: "yes", "heart-disease": "event" });
show("no seatbelt + moto", "male", 25, { "seat-belt": "never", motorcycle: "regular" });
show("moves to Korea", "male", 30, { "country-next": "KOR" });
show("lived in Russia, back to KG", "male", 30, { "country-before": "RUS" });
console.log("steps 2000..12000:", [2000, 5000, 8000, 10000, 12000].map((s) => `${s}:${r(stepsEffect(s))}`).join(" "));
for (const f of FACTORS) {
  if (f.kind === "country") continue;
  const g = factorRange(f);
  console.log(f.slug.padEnd(22), r(g.min), r(g.max));
}
