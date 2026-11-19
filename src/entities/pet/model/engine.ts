/*
 * The pet model.
 *
 * Mortality of cats and dogs follows the Gompertz-Makeham law like ours:
 * hazard = c + lambda + a * HR * e^(b * age). Large dogs age faster (Kraus
 * 2013), so each dog size has its own ageing rate b; cats have one curve.
 * The level a is calibrated so that a pet with every answer typical lives,
 * from birth, as long as the cohort life expectancy in BASELINES; c is the
 * age-free risk of that typical pet, road accidents included. Answers move
 * HR by the ratio against the typical option; roaming outside more or less
 * than the typical pet moves the accident risk. The forecast is the expected age
 * at death for a pet that has already reached its age.
 */
import { PET_FACTORS, petOptions, petTypical } from "./factors.ts";
import type { PetFactor, PetGroup, PetOption, PetSex, Species } from "./types.ts";

export type PetAnswers = Record<string, string>;

export interface PetProfile {
  species: Species;
  sex: PetSex;
  /** Age in years, months as a fraction. */
  age: number;
}

/*
 * Life expectancy at birth of the typical pet, ageing rate b and age-free risk c.
 * Cats: UK life tables, 11.7 years (Teng 2024); fit of the table b 0.315, c 0.031.
 * Dogs: UK median by size 12.7 / 12.5 / 11.9 (McMillan 2024), US life expectancy
 * 13.5 / 12.7 / 11.5 / 9.5 for small to giant (Montoya 2023); fit of the UK table
 * b 0.345, c 0.008 (Teng 2022), steeper for heavier dogs (Kraus 2013).
 */
export const BASELINES: Record<PetGroup, { le0: number; b: number; c: number }> = {
  cat: { le0: 11.7, b: 0.315, c: 0.031 },
  "dog-small": { le0: 12.9, b: 0.3, c: 0.008 },
  "dog-medium": { le0: 12.4, b: 0.34, c: 0.008 },
  "dog-large": { le0: 11.5, b: 0.38, c: 0.008 },
  "dog-giant": { le0: 9.5, b: 0.45, c: 0.009 },
};

/** Males die earlier: HR 1.06 in dogs (McMillan 2024), 1.29 in cats (Mata 2025). */
export const SEX_HR: Record<Species, Record<PetSex, number>> = {
  dog: { female: 1, male: 1.06 },
  cat: { female: 1, male: 1.25 },
};

const SOFT_CAP = 1.2;
const STEP = 0.05;
const MAX_AGE = 40;

const hrOf = (o: PetOption, sex: PetSex) => o.hrBySex?.[sex] ?? o.hr;

const optionOf = (f: PetFactor, species: Species, id: string | undefined): PetOption => {
  const options = petOptions(f, species);
  return options.find((o) => o.id === id) ?? options.find((o) => o.id === petTypical(f, species))!;
};

export const groupOf = (species: Species, answers: PetAnswers): PetGroup => {
  if (species === "cat") return "cat";
  const size = PET_FACTORS.find((f) => f.slug === "size")!;
  return optionOf(size, "dog", answers.size).group ?? "dog-medium";
};

interface Hazard {
  ln: number;
  lambda: number;
}

/** Log ratio against the typical pet and the extra accident risk. */
function hazardOf(species: Species, sex: PetSex, answers: PetAnswers): Hazard {
  let modifiable = 0;
  let fixed = Math.log(SEX_HR[species][sex]);
  let lambda = 0;
  for (const f of PET_FACTORS) {
    if (!f.species.includes(species)) continue;
    const chosen = optionOf(f, species, answers[f.slug]);
    const typical = optionOf(f, species, petTypical(f, species));
    const d = Math.log(hrOf(chosen.unknown ? typical : chosen, sex)) - Math.log(hrOf(typical, sex));
    lambda += (chosen.unknown ? (typical.lambda ?? 0) : (chosen.lambda ?? 0)) - (typical.lambda ?? 0);
    if (f.modifiable) modifiable += d;
    else fixed += d;
  }
  return { ln: SOFT_CAP * Math.tanh(modifiable / SOFT_CAP) + fixed, lambda };
}


/** Expected age at death: the ratio scales the whole hazard of the cohort, road risk moves it on top (cohort HRs are on all-cause death). */
function expected(from: number, a: number, b: number, c: number, ratio: number, lambda = 0): number {
  let s = 1;
  let years = 0;
  const rate = (x: number) => Math.max(ratio * c + lambda, 0.001) + a * ratio * Math.exp(b * x);
  let prev = rate(from);
  for (let x = from + STEP; x <= MAX_AGE; x += STEP) {
    const r = rate(x);
    const next = s * Math.exp(-((prev + r) / 2) * STEP);
    years += ((s + next) / 2) * STEP;
    s = next;
    prev = r;
    if (s < 1e-7) break;
  }
  return from + years;
}

const levels = new Map<string, number>();

/** Gompertz level a that gives the typical pet of the group, both sexes averaged, its cohort life expectancy. */
function levelFor(group: PetGroup): number {
  const key = group;
  const species: Species = group === "cat" ? "cat" : "dog";
  // Halfway between the sexes on the log scale: females land above the cohort, males below.
  const mid = Math.sqrt(SEX_HR[species].male * SEX_HR[species].female);
  const cached = levels.get(key);
  if (cached) return cached;
  const { le0, b, c } = BASELINES[group];
  let lo = Math.log(1e-6);
  let hi = Math.log(1);
  for (let i = 0; i < 60; i += 1) {
    const m = (lo + hi) / 2;
    if (expected(0, Math.exp(m), b, c, mid) > le0) lo = m;
    else hi = m;
  }
  const a = Math.exp((lo + hi) / 2);
  levels.set(key, a);
  return a;
}

function forecastOf(profile: PetProfile, answers: PetAnswers): number {
  const group = groupOf(profile.species, answers);
  const { b, c } = BASELINES[group];
  const h = hazardOf(profile.species, profile.sex, answers);
  return expected(profile.age, levelFor(group), b, c, Math.exp(h.ln), h.lambda);
}

/** Age at which a typical pet of the same group carries the same yearly risk. */
function biologicalAge(profile: PetProfile, answers: PetAnswers): number {
  const { b } = BASELINES[groupOf(profile.species, answers)];
  const { ln } = hazardOf(profile.species, profile.sex, answers);
  const raw = profile.age + ln / b;
  return Math.min(Math.max(raw, Math.max(0.3, profile.age - 4)), profile.age + 4);
}

/** Pet years in human years: the dog epigenetic clock (Wang 2020) and the feline life-stage table (AAFP 2021). */
export function humanYears(species: Species, age: number): number {
  if (species === "dog") return age < 1 ? age * 31 : 16 * Math.log(age) + 31;
  if (age <= 1) return age * 15;
  if (age <= 2) return 15 + (age - 1) * 9;
  return 24 + (age - 2) * 4;
}

export interface PetFactorResult {
  slug: string;
  option: string;
  years: number;
  gain: number;
  improveTo?: string;
}

export interface PetAssessment {
  date: string;
  profile: PetProfile;
  forecast: number;
  /** Typical pet of the same group, sex and age. */
  peers: number;
  potential: number;
  bioAge: number;
  factors: PetFactorResult[];
}

export function improvedPetAnswers(species: Species, answers: PetAnswers): PetAnswers {
  const next = { ...answers };
  for (const f of PET_FACTORS) {
    if (!f.modifiable || !f.species.includes(species)) continue;
    const step = optionOf(f, species, answers[f.slug]).improveTo;
    if (step) next[f.slug] = step;
  }
  return next;
}

export function assessPet(profile: PetProfile, answers: PetAnswers, date = new Date().toISOString()): PetAssessment {
  const forecast = forecastOf(profile, answers);
  const typicalAnswers: PetAnswers = { size: answers.size };
  const factors = PET_FACTORS.filter((f) => f.species.includes(profile.species)).map((f): PetFactorResult => {
    const option = optionOf(f, profile.species, answers[f.slug]);
    const asTypical = forecastOf(profile, { ...answers, [f.slug]: petTypical(f, profile.species) });
    const improveTo = f.modifiable ? option.improveTo : undefined;
    const gain = improveTo ? forecastOf(profile, { ...answers, [f.slug]: improveTo }) - forecast : 0;
    return { slug: f.slug, option: option.id, years: forecast - asTypical, gain: Math.max(gain, 0), improveTo };
  });
  return {
    date,
    profile,
    forecast,
    peers: forecastOf(profile, typicalAnswers),
    potential: forecastOf(profile, improvedPetAnswers(profile.species, answers)),
    bioAge: biologicalAge(profile, answers),
    factors,
  };
}

/** Years an option moves an otherwise typical pet of `age`, both sexes averaged. */
export function petOptionEffect(species: Species, slug: string, optionId: string, age = 5, extra: PetAnswers = {}): number {
  const delta = (sex: PetSex) =>
    forecastOf({ species, sex, age }, { ...extra, [slug]: optionId }) - forecastOf({ species, sex, age }, extra);
  return (delta("female") + delta("male")) / 2;
}

/** Life expectancy at birth of a typical pet of a group, for the info page. */
export function cohortLifeExpectancy(group: PetGroup): number {
  return BASELINES[group].le0;
}
