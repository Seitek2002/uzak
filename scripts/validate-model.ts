/*
 * Checks the model against published numbers: `npm run test:model`.
 * Each check names the study it compares with. Ranges are wide on purpose:
 * the model mixes many factors and the studies come from other countries.
 */
import {
  assess,
  averageForecast,
  lifeExpectancyAt,
  optionEffect,
  PEER_ANSWERS,
  stepsEffect,
  type Answers,
  type Sex,
} from "../src/entities/result/model/engine.ts";
import { FACTORS } from "../src/entities/factor/model/factors.ts";
import { CONTENT } from "../src/entities/factor/model/content.ts";
import { LIFE_TABLES } from "../src/entities/result/model/life-tables.ts";
import { SITE } from "../src/shared/config/site.ts";
import { actionFor } from "../src/features/share/model/actions.ts";
import { COUNTRIES } from "../src/shared/data/countries.ts";
import { RISK_PROFILES } from "../src/entities/result/model/risk-profiles.ts";
import { peerShares } from "../src/entities/result/model/peers.ts";

let failed = 0;
const r = (n: number) => Math.round(n * 10) / 10;
function check(name: string, value: number, min: number, max: number) {
  const ok = value >= min && value <= max;
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${r(value)} (expected ${min} to ${max})`);
}
function truth(name: string, ok: boolean, detail = "") {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `: ${detail}` : ""}`);
}

// Checks 2 to 10 use the country with a full survey, as before the model went worldwide; 17 to 21 cover the rest.
const HOME = { "country-before": "KGZ", "country-next": "KGZ" };
const years = (sex: Sex, age: number, a: Answers, b: Answers) =>
  assess({ sex, age }, { ...PEER_ANSWERS, ...HOME, ...a }).forecast -
  assess({ sex, age }, { ...PEER_ANSWERS, ...HOME, ...b }).forecast;
const both = (age: number, a: Answers, b: Answers) => (years("male", age, a, b) + years("female", age, a, b)) / 2;

// 1. The life table read by the model gives WHO's own life expectancy at 30 (WHO GHO 2023: men 74.4, women 79.7).
check("period life expectancy at 30, men, Kyrgyzstan", lifeExpectancyAt("KGZ", "male", 30), 73.9, 74.9);
check("period life expectancy at 30, women, Kyrgyzstan", lifeExpectancyAt("KGZ", "female", 30), 79.2, 80.6);

// 2. An average answer sheet lands near the table plus the yearly progress (period + about 3-5 years at 30).
const avgMale = averageForecast({ sex: "male", age: 30 }, "KGZ");
check("average man at 30, with progress", avgMale, 76, 81);
check("average woman at 30, with progress", averageForecast({ sex: "female", age: 30 }, "KGZ"), 81, 86);

// 3. Smoking: smokers lose more than 10 years against never smokers (Jha 2013); at 40 with fading in old age, 7 to 11.
check("heavy smoker vs never smoker at 40, years", both(40, { smoking: "never" }, { smoking: "heavy" }), 7, 11);
// Quitting before 40 regains most of it (Jha 2013: about 9 of 10 years).
check("share regained by quitting at 40", both(40, { smoking: "quit10" }, { smoking: "heavy" }) / both(40, { smoking: "never" }, { smoking: "heavy" }), 0.8, 0.97);

// 4. Body mass (Prospective Studies Collaboration 2009: BMI 30-35 costs 2-4 years, 40-45 costs 8-10).
check("BMI 30-35 vs 20-25 at 40, years lost", both(40, { bmi: "20to25" }, { bmi: "30to35" }), 1.5, 4.5);
check("BMI 40+ vs 20-25 at 40, years lost", both(40, { bmi: "20to25" }, { bmi: "gt40" }), 5, 11);

// 5. Diabetes at 50 shortens life by about 6 years (ERFC 2011).
check("diabetes vs none at 50, years lost", both(50, { diabetes: "no", hba1c: "lt57" }, { diabetes: "yes", hba1c: "ge65" }), 3.5, 7.5);

// 6. Five low-risk habits at 50 add 12-14 years against none (Li 2018).
const lowRisk = { smoking: "never", activity: "gt300", bmi: "20to25", alcohol: "low", "fruits-vegetables": "5plus", "processed-meat": "rare", "sugary-drinks": "rare" };
const highRisk = { smoking: "heavy", activity: "none", bmi: "30to35", alcohol: "heavy", "fruits-vegetables": "lt1", "processed-meat": "daily", "sugary-drinks": "twice" };
check("five healthy habits vs none at 50, years", both(50, lowRisk, highRisk), 9, 16);

// 7. Inactivity (Arem 2015: no activity carries 1.6 times the risk of 300+ minutes).
check("no activity vs 300+ minutes at 40, years", both(40, { activity: "gt300" }, { activity: "none" }), 1.5, 5);

// 8. Moving: Korea's table is about 7 years longer at 30 than Kyrgyzstan's for men.
check("man of 30 moving to South Korea, years", years("male", 30, { "country-next": "KOR" }, {}), 4, 7.5);

// 9. Road risks stay small in years: belts save 45% of car deaths, about 4-6 per 100 000 a year here.
check("never belted vs always at 25, years", both(25, { "seat-belt": "always" }, { "seat-belt": "never" }), 0.05, 0.5);
check("regular motorcycle vs none at 25, years", both(25, { motorcycle: "never" }, { motorcycle: "regular" }), 0.3, 2);

// 10. "Do not know" equals the average peer.
truth("unknown blood pressure is worth 0 years", Math.abs(assess({ sex: "male", age: 50 }, { ...PEER_ANSWERS, ...HOME, "blood-pressure": "unknown" }).factors.find((f) => f.slug === "blood-pressure")!.years) < 0.05);

// 11. Every factor moves the forecast in the order of its ratios.
for (const f of FACTORS) {
  if (f.kind === "country") continue;
  const known = f.options.filter((o) => !o.unknown && o.lambda === undefined);
  const sorted = [...known].sort((a, b) => a.hr - b.hr);
  const effects = sorted.map((o) => optionEffect(f.slug, o.id));
  const monotone = effects.every((e, i) => i === 0 || e <= effects[i - 1] + 1e-9);
  truth(`${f.slug}: higher ratio, fewer years`, monotone, monotone ? "" : effects.map(r).join(" "));
}

// 12. Steps: more is better, with a plateau.
const s = [2000, 4000, 6000, 8000, 10000, 12000].map((n) => stepsEffect(n));
truth("steps curve rises", s.every((v, i) => i === 0 || v >= s[i - 1]), s.map(r).join(" "));
check("gain from 10 000 to 12 000 steps is small", s[5] - s[4], 0, 0.5);

// 13. Edges: every age from 18 to 99 gives a finite forecast above the age, and the biological age stays in its window.
let edgesOk = true;
for (const sex of ["male", "female"] as Sex[]) {
  for (let age = 18; age <= 99; age += 1) {
    const a = assess({ sex, age }, {});
    if (!Number.isFinite(a.forecast) || a.forecast <= age || a.bioAge < Math.max(18, age - 15) - 1e-9 || a.bioAge > age + 20 + 1e-9) edgesOk = false;
  }
}
truth("ages 18 to 99 give sane numbers", edgesOk);

// 14. Every country in the list has a full table.
truth("all countries have 15 age groups", LIFE_TABLES.every((t) => t.male.length === 15 && t.female.length === 15 && [...t.male, ...t.female].every((v) => v > 0 && v < 1)));

// 16. Every factor page has its texts and at least one source.
const thin = FACTORS.filter((f) => {
  const c = CONTENT[f.slug];
  return !c || !c.about || c.evidence.length === 0 || c.advice.length === 0 || c.sources.length === 0;
});
truth("every factor has texts and sources", thin.length === 0, thin.map((f) => f.slug).join(", "));

// 15. The question count printed on the site matches the test: name, sex, age, every factor and the blood-test fork.
truth("site says the right number of questions", SITE.questions === FACTORS.length + 4, `${SITE.questions} vs ${FACTORS.length + 4}`);

// 17. Every country: the average person gets a sane forecast that stays near the table plus progress.
const t0 = Date.now();
const strange: string[] = [];
for (const { code } of LIFE_TABLES) {
  for (const sex of ["male", "female"] as Sex[]) {
    const forecast = averageForecast({ sex, age: 30 }, code);
    const period = lifeExpectancyAt(code, sex, 30);
    if (!(forecast > period && forecast < period + 8)) strange.push(`${code} ${sex} ${r(forecast)} vs ${r(period)}`);
  }
}
truth("every country: average forecast is the table plus progress", strange.length === 0, strange.join(", "));
console.log(`      ${LIFE_TABLES.length} countries, both sexes, in ${Date.now() - t0} ms`);

// 18. The country data is complete and matches the list of the test.
truth("185 countries and the world", LIFE_TABLES.length === 186 && COUNTRIES.length === 186, `${LIFE_TABLES.length}, ${COUNTRIES.length}`);
truth(
  "every listed country has a table and a risk profile",
  COUNTRIES.every((c) => LIFE_TABLES.some((t) => t.code === c.code) && RISK_PROFILES[c.code]?.length === 18 && c.ru && c.en && c.ky),
);

// 19. Peers are local: the country's own figures come back from the shares (weights as in peers.ts).
const shareOf = (slug: string, ids: string[], sex: Sex, code: string) =>
  [0.52, 0.4, 0.08].reduce((acc, w, band) => {
    const shares = peerShares(FACTORS.find((f) => f.slug === slug)!, sex, band as 0 | 1 | 2, code);
    return acc + w * ids.reduce((s, id) => s + (shares[id] ?? 0), 0);
  }, 0);
const off: string[] = [];
for (const { code } of LIFE_TABLES) {
  if (code === "KGZ") continue;
  const p = RISK_PROFILES[code];
  if (Math.abs(shareOf("smoking", ["light", "heavy"], "male", code) - p[0] / 100) > 0.01) off.push(`${code} smoking`);
  if (Math.abs(shareOf("bmi", ["30to35", "35to40", "gt40"], "female", code) - p[5] / 100) > 0.01) off.push(`${code} obesity`);
}
truth("peers repeat the WHO prevalence of their country", off.length === 0, off.join(", "));

// 20. Staying put costs and adds nothing, wherever it is.
for (const code of ["DEU", "BRA", "NGA", "GLOBAL"]) {
  const a = assess({ sex: "female", age: 35 }, { "country-before": code, "country-next": code });
  const moved = a.factors.filter((f) => f.slug.startsWith("country-")).map((f) => f.years);
  truth(`no move is worth 0 years in ${code}`, moved.every((v) => Math.abs(v) < 0.01), moved.map(r).join(" "));
}

// 21. An answer is weighed against local peers: never smoking adds more where more men smoke.
const neverIn = (code: string) =>
  assess({ sex: "male", age: 40 }, { ...PEER_ANSWERS, "country-before": code, "country-next": code, smoking: "never" })
    .factors.find((f) => f.slug === "smoking")!.years;
truth("never smoking adds more in Indonesia than in Sweden", neverIn("IDN") > neverIn("SWE"), `${r(neverIn("IDN"))} and ${r(neverIn("SWE"))}`);

// 22. Living parents past 85 count as long-lived ones.
truth("living parents past 85 are worth a long life", Math.abs(optionEffect("parents", "alive85") - optionEffect("parents", "long")) < 1e-9 && optionEffect("parents", "alive85") > 0.1);

// 23. Whatever can end up on the picture for social networks has its short action.
const silent = FACTORS.filter((f) => f.modifiable).flatMap((f) =>
  f.options.filter((o) => o.improveTo && !actionFor(f.slug, o.id)).map((o) => `${f.slug}:${o.id}`),
);
truth("every improvement has a short action for the picture", silent.length === 0, silent.join(", "));

console.log(failed ?`\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
