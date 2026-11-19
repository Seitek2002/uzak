/*
 * Checks the pet model against the veterinary numbers it is built on:
 * `npm run test:pet`. Ranges are wide: cohorts differ by country and breed mix.
 */
import { PET_FACTORS, petOptions, petTypical } from "../src/entities/pet/model/factors.ts";
import { PET_CONTENT } from "../src/entities/pet/model/content.ts";
import {
  assessPet,
  BASELINES,
  humanYears,
  petOptionEffect,
  type PetAnswers,
} from "../src/entities/pet/model/engine.ts";
import type { PetGroup, PetSex, Species } from "../src/entities/pet/model/types.ts";

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

const sizeOf: Record<PetGroup, string | undefined> = { cat: undefined, "dog-small": "small", "dog-medium": "medium", "dog-large": "large", "dog-giant": "giant" };
const speciesOf = (g: PetGroup): Species => (g === "cat" ? "cat" : "dog");
const typicalSheet = (s: Species, size?: string): PetAnswers => {
  const a: PetAnswers = {};
  for (const f of PET_FACTORS) if (f.species.includes(s)) a[f.slug] = petTypical(f, s);
  if (size) a.size = size;
  return a;
};
const both = (s: Species, age: number, a: PetAnswers) => {
  const f = (sex: PetSex) => assessPet({ species: s, sex, age }, a).forecast;
  return (f("female") + f("male")) / 2;
};

// 1. A typical pet of every group lives, from birth, close to its cohort life expectancy (sexes averaged).
for (const g of Object.keys(BASELINES) as PetGroup[]) {
  const s = speciesOf(g);
  check(`typical ${g} from birth lives as the cohort`, both(s, 0.01, typicalSheet(s, sizeOf[g])), BASELINES[g].le0 - 0.6, BASELINES[g].le0 + 0.6);
}

// 2. Smaller dogs live longer (McMillan 2024, Teng 2022).
const bySize = (["small", "medium", "large", "giant"] as const).map((size) => both("dog", 3, typicalSheet("dog", size)));
truth("small > medium > large > giant dogs", bySize.every((v, i) => i === 0 || v < bySize[i - 1]), bySize.map(r).join(" "));

// 3. Overweight costs up to about 2.5 years (Salt 2019); obese at 5 against ideal.
check("obese vs ideal dog at 5, years lost", petOptionEffect("dog", "body", "ideal", 5) - petOptionEffect("dog", "body", "obese", 5), 0.8, 3.5);

// 4. Flat-faced dogs die years earlier.
check("flat-faced vs mixed dog at 2, years lost", petOptionEffect("dog", "breed", "mixed", 2) - petOptionEffect("dog", "breed", "flat", 2), 1.5, 5);

// 5. Free-roaming cats lose years to road accidents, mostly young ones.
check("free-roaming vs indoor cat at 1, years lost", petOptionEffect("cat", "outdoors", "safe", 1) - petOptionEffect("cat", "outdoors", "free", 1), 0.8, 4);

// 6. Neutered cats live longer.
check("neutered vs entire cat at 1, years", petOptionEffect("cat", "neutered", "yes", 1) - petOptionEffect("cat", "neutered", "no", 1), 0.5, 3);

// 7. Human years (Wang 2020; AAFP 2021).
check("dog of 1 in human years", humanYears("dog", 1), 30, 32);
check("dog of 10 in human years", humanYears("dog", 10), 66, 70);
check("cat of 2 in human years", humanYears("cat", 2), 23.5, 24.5);
check("cat of 10 in human years", humanYears("cat", 10), 55.5, 56.5);

// 8. Every option moves the forecast in the order of its ratios.
for (const f of PET_FACTORS) {
  for (const s of f.species) {
    const known = petOptions(f, s).filter((o) => !o.unknown && o.lambda === undefined && !o.group);
    const sorted = [...known].sort((a, b) => a.hr - b.hr);
    const effects = sorted.map((o) => petOptionEffect(s, f.slug, o.id));
    truth(`${s} ${f.slug}: higher ratio, fewer years`, effects.every((e, i) => i === 0 || e <= effects[i - 1] + 1e-9), effects.map(r).join(" "));
  }
}

// 9. Edges: every age gives a finite forecast above it.
let edges = true;
for (const s of ["dog", "cat"] as Species[]) {
  for (let age = 0.1; age <= 25; age += 0.5) {
    const a = assessPet({ species: s, sex: "male", age }, typicalSheet(s, s === "dog" ? "giant" : undefined));
    if (!Number.isFinite(a.forecast) || a.forecast <= age || !Number.isFinite(a.bioAge)) edges = false;
  }
}
truth("ages 0 to 25 give sane numbers", edges);

// 10. Every factor has texts and sources for the info page.
const thin = PET_FACTORS.filter((f) => {
  const c = PET_CONTENT[f.slug];
  return !c || c.evidence.length === 0 || c.advice.length === 0 || c.sources.length === 0;
});
truth("every pet factor has texts and sources", thin.length === 0, thin.map((f) => f.slug).join(", "));

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
