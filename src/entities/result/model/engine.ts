/*
 * The longevity model.
 *
 * 1. Population. The yearly death rate of an average person comes from the
 *    WHO life table of the country (age-specific rates nMx, smoothed between
 *    age groups and extended past 85 along the Gompertz slope of 70 to 85).
 *    The test asks where the person lived for the last ten years and where
 *    they plan to live: the first table weighs half at the start and fades
 *    over the following years, the second one takes over.
 * 2. Progress. Death rates keep falling; the model lowers future rates by
 *    IMPROVEMENT per year, a cautious pace next to the last twenty years.
 * 3. The person. Each answer carries a hazard ratio from meta-analyses.
 *    Factors that measure the same thing form clusters: inside a cluster the
 *    strongest effect counts in full and the next ones at 50, 30, 20 and 10%.
 *    The sum of changeable factors passes a soft cap so that many small
 *    effects cannot add up to an absurd number; inherited factors and
 *    diagnoses are added on top.
 * 4. Peers. The life table already contains smokers, people with high
 *    pressure and everyone else. So the person's ratio is divided by the
 *    average ratio of people of the same sex and age in Kyrgyzstan, built
 *    from survey prevalence (population.ts). An average answer sheet lands
 *    on the life table, not above or below it.
 * 5. Age. Relative risks shrink in old age: smoking and weight carry about
 *    half their log ratio at 80 compared with 50 (Jha 2013, GBMC 2016). The
 *    log ratio keeps full strength to 55 and loses ATTENUATION by 80.
 * 6. "Do not know" answers take the average ratio of peers for that factor.
 * Road risks do not grow with age and add a constant yearly risk instead.
 */
import { FACTORS } from "../../factor/model/factors.ts";
import type { Factor, FactorOption } from "../../factor/model/types.ts";
import { AGE_GROUPS, LIFE_TABLES, type LifeTable } from "./life-tables.ts";
import { BAND_CENTRES, sharesFor, type Band } from "./population.ts";

export type Sex = "male" | "female";
export type Answers = Record<string, string>;

export interface Profile {
  sex: Sex;
  age: number;
}

export const HOME_COUNTRY = "KGZ";
/** Yearly fall of future death rates. */
export const IMPROVEMENT = 0.01;
/** Share of the past country in today's risk, fading with PAST_FADE years. */
const PAST_WEIGHT = 0.5;
const PAST_FADE = 15;
/** How much of the log hazard ratio is gone by FADE_TO. */
export const ATTENUATION = 0.5;
const FADE_FROM = 55;
const FADE_TO = 80;
const SOFT_CAP = 1.3;
const CLUSTER_WEIGHTS = [1, 0.5, 0.3, 0.2, 0.1, 0.05];
/** Clusters of factors that measure one thing. A "fixed" cluster is added outside the soft cap. */
const CLUSTERS: Record<string, { id: string; fixed?: boolean }> = {
  activity: { id: "fitness" },
  strength: { id: "fitness" },
  muscle: { id: "fitness" },
  steps: { id: "fitness" },
  "heart-rate": { id: "fitness" },
  bmi: { id: "body" },
  "blood-pressure": { id: "body" },
  "fruits-vegetables": { id: "food" },
  "processed-meat": { id: "food" },
  "sugary-drinks": { id: "food" },
  omega3: { id: "food" },
  "close-people": { id: "mind" },
  "relationship-quality": { id: "mind" },
  "life-satisfaction": { id: "mind" },
  distress: { id: "mind" },
  optimism: { id: "mind" },
  relationship: { id: "mind" },
  diabetes: { id: "glucose", fixed: true },
  hba1c: { id: "glucose", fixed: true },
};
const MAX_AGE = 120;
const STEP = 0.25;
const PEER_SAMPLES = 4000;

const optionOf = (f: Factor, id: string | undefined): FactorOption =>
  f.options.find((o) => o.id === id) ?? f.options.find((o) => o.id === f.typical)!;

const typicalOf = (f: Factor) => optionOf(f, f.typical);

const hrOf = (o: FactorOption, sex: Sex) => o.hrBySex?.[sex] ?? o.hr;

/** Answer id that stands for "as the average peer": used for references and for "do not know". */
export const PEERS = "peers";

const peerMeanCache = new Map<string, { hr: number; lambda: number }>();

/** Neighbouring survey bands of an age and the position between their centres. */
function bandsAt(age: number): { a: Band; b: Band; t: number } {
  if (age <= BAND_CENTRES[0]) return { a: 0, b: 0, t: 0 };
  if (age >= BAND_CENTRES[2]) return { a: 2, b: 2, t: 0 };
  const a: Band = age < BAND_CENTRES[1] ? 0 : 1;
  const b = (a + 1) as Band;
  return { a, b, t: (age - BAND_CENTRES[a]) / (BAND_CENTRES[b] - BAND_CENTRES[a]) };
}

/** Average ratio and road risk of one factor among peers of this sex and age. */
function peerMean(f: Factor, sex: Sex, age: number) {
  const { a, b, t } = bandsAt(age);
  const x = peerMeanOfBand(f, sex, a);
  const y = peerMeanOfBand(f, sex, b);
  return { hr: Math.exp((1 - t) * Math.log(x.hr) + t * Math.log(y.hr)), lambda: (1 - t) * x.lambda + t * y.lambda };
}

function peerMeanOfBand(f: Factor, sex: Sex, band: Band) {
  const key = `${f.slug}:${sex}:${band}`;
  const cached = peerMeanCache.get(key);
  if (cached) return cached;
  const shares = Object.entries(sharesFor(f, sex, band));
  const mean = {
    hr: shares.reduce((acc, [id, p]) => acc + p * hrOf(optionOf(f, id), sex), 0),
    lambda: shares.reduce((acc, [id, p]) => acc + p * (optionOf(f, id).lambda ?? 0), 0),
  };
  peerMeanCache.set(key, mean);
  return mean;
}

/* ---------- life tables ---------- */

interface Curve {
  /** Natural log of the death rate at each group midpoint, 17.5 ... 82.5. */
  ln: number[];
  /** Gompertz slope past 82.5. */
  slope: number;
}

const MIDPOINTS = AGE_GROUPS.slice(0, -1).map((a) => a + 2.5);
const curves = new Map<string, Curve>();

const tableOf = (code: string | undefined): LifeTable =>
  LIFE_TABLES.find((t) => t.code === code) ?? LIFE_TABLES.find((t) => t.code === HOME_COUNTRY)!;

function curveOf(code: string | undefined, sex: Sex): Curve {
  const table = tableOf(code);
  const key = `${table.code}:${sex}`;
  const cached = curves.get(key);
  if (cached) return cached;
  const rates = table[sex].slice(0, -1);
  const ln = rates.map((m) => Math.log(m));
  // Slope from 70-74 to 80-84, kept inside the range seen in real populations.
  const raw = (ln[ln.length - 1] - ln[ln.length - 3]) / 10;
  const curve = { ln, slope: Math.min(Math.max(raw, 0.06), 0.12) };
  curves.set(key, curve);
  return curve;
}

/** Log death rate of the population at age x. */
function lnRate(curve: Curve, x: number): number {
  const { ln, slope } = curve;
  if (x <= MIDPOINTS[0]) return ln[0];
  const last = MIDPOINTS.length - 1;
  if (x >= MIDPOINTS[last]) return Math.min(ln[last] + slope * (x - MIDPOINTS[last]), Math.log(1.5));
  const i = Math.floor((x - MIDPOINTS[0]) / 5);
  const t = (x - MIDPOINTS[i]) / 5;
  return ln[i] + t * (ln[i + 1] - ln[i]);
}

/* ---------- answers to a hazard ratio ---------- */

interface Hazard {
  /** Log hazard ratio against the typical answer sheet. */
  ln: number;
  /** Yearly road risk, absolute. */
  lambda: number;
}

function hazardOf(answers: Answers, sex: Sex, age: number, extraModifiable = 0): Hazard {
  let modifiable = extraModifiable;
  let fixed = 0;
  let lambda = 0;
  const clusters = new Map<string, { fixed: boolean; values: number[] }>();
  for (const f of FACTORS) {
    if (f.kind === "country") continue;
    const id = answers[f.slug];
    const chosen = optionOf(f, id);
    const asPeers = id === PEERS || chosen.unknown;
    const peer = asPeers ? peerMean(f, sex, age) : undefined;
    const ratio = peer ? peer.hr : hrOf(chosen, sex);
    const d = Math.log(ratio) - Math.log(hrOf(typicalOf(f), sex));
    lambda += peer ? peer.lambda : (chosen.lambda ?? 0);
    const cluster = CLUSTERS[f.slug];
    if (cluster) {
      const entry = clusters.get(cluster.id) ?? { fixed: Boolean(cluster.fixed), values: [] };
      entry.values.push(d);
      clusters.set(cluster.id, entry);
    } else if (f.modifiable) modifiable += d;
    else fixed += d;
  }
  for (const { fixed: isFixed, values } of clusters.values()) {
    const sum = values
      .sort((a, b) => Math.abs(b) - Math.abs(a))
      .reduce((acc, d, i) => acc + d * (CLUSTER_WEIGHTS[i] ?? 0), 0);
    if (isFixed) fixed += sum;
    else modifiable += sum;
  }
  return { ln: SOFT_CAP * Math.tanh(modifiable / SOFT_CAP) + fixed, lambda };
}

/* ---------- peers: the average person of this sex and age ---------- */

const peerCache = new Map<string, { lnMean: number; lambda: number }>();

/** Small seeded generator so the peer average is the same on every run. */
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function peersOf(sex: Sex, band: Band) {
  const key = `${sex}:${band}`;
  const cached = peerCache.get(key);
  if (cached) return cached;
  const next = random(band * 2 + (sex === "male" ? 1 : 2));
  const plan = FACTORS.filter((f) => f.kind !== "country").map((f) => ({
    slug: f.slug,
    shares: Object.entries(sharesFor(f, sex, band)),
  }));
  let sum = 0;
  let lambda = 0;
  for (let n = 0; n < PEER_SAMPLES; n += 1) {
    const answers: Answers = {};
    for (const { slug, shares } of plan) {
      let r = next();
      for (const [id, p] of shares) {
        r -= p;
        if (r <= 0) {
          answers[slug] = id;
          break;
        }
      }
      answers[slug] ??= shares[shares.length - 1][0];
    }
    const h = hazardOf(answers, sex, BAND_CENTRES[band]);
    sum += Math.exp(h.ln);
    lambda += h.lambda;
  }
  const peers = { lnMean: Math.log(sum / PEER_SAMPLES), lambda: lambda / PEER_SAMPLES };
  peerCache.set(key, peers);
  return peers;
}

/** Peer averages at the age, interpolated between the survey age bands. */
function peersAt(sex: Sex, age: number) {
  const { a, b, t } = bandsAt(age);
  const x = peersOf(sex, a);
  const y = peersOf(sex, b);
  return { lnMean: x.lnMean + t * (y.lnMean - x.lnMean), lambda: x.lambda + t * (y.lambda - x.lambda) };
}

/* ---------- survival ---------- */

const fade = (x: number) => 1 - ATTENUATION * Math.min(Math.max((x - FADE_FROM) / (FADE_TO - FADE_FROM), 0), 1);

interface Person {
  profile: Profile;
  before: Curve;
  next: Curve;
  /** Log ratio against peers at today's age. */
  lnRatio: number;
  /** Yearly road risk against peers. */
  lambda: number;
}

function personOf(profile: Profile, answers: Answers, extraModifiable = 0): Person {
  const h = hazardOf(answers, profile.sex, profile.age, extraModifiable);
  const peers = peersAt(profile.sex, profile.age);
  return {
    profile,
    before: curveOf(answers["country-before"], profile.sex),
    next: curveOf(answers["country-next"], profile.sex),
    lnRatio: h.ln - peers.lnMean,
    lambda: h.lambda - peers.lambda,
  };
}

/** Yearly death rate t years from now. */
function rateAt(p: Person, t: number): number {
  const x = p.profile.age + t;
  const w = PAST_WEIGHT * Math.exp(-t / PAST_FADE);
  const base = Math.exp(w * lnRate(p.before, x) + (1 - w) * lnRate(p.next, x)) * (1 - IMPROVEMENT) ** t;
  const personal = base * Math.exp(p.lnRatio * fade(x));
  return Math.max(personal + p.lambda, personal * 0.5);
}

/** Age at death expected for the person. */
function expectedAge(p: Person): number {
  const { age } = p.profile;
  let s = 1;
  let years = 0;
  let prevRate = rateAt(p, 0);
  for (let t = STEP; age + t <= MAX_AGE; t += STEP) {
    const rate = rateAt(p, t);
    const next = s * Math.exp(-((prevRate + rate) / 2) * STEP);
    years += ((s + next) / 2) * STEP;
    s = next;
    prevRate = rate;
    if (s < 1e-7) break;
  }
  return age + years;
}

function forecastOf(profile: Profile, answers: Answers, extraModifiable = 0): number {
  return expectedAge(personOf(profile, answers, extraModifiable));
}

/** The age at which an average person in the same countries carries the same yearly risk. */
function biologicalAge(profile: Profile, answers: Answers): number {
  const p = personOf(profile, answers);
  const lnBase = (x: number) => PAST_WEIGHT * lnRate(p.before, x) + (1 - PAST_WEIGHT) * lnRate(p.next, x);
  const target = lnBase(profile.age) + p.lnRatio * fade(profile.age);
  // Death rates dip in the early twenties; a running maximum keeps the curve monotone.
  let best = 18;
  let peak = -Infinity;
  for (let x = 18; x <= 110; x += 0.1) {
    peak = Math.max(peak, lnBase(x));
    if (peak <= target) best = x;
    else break;
  }
  const floor = Math.max(18, profile.age - 15);
  return Math.min(Math.max(best, floor), profile.age + 20);
}

/* ---------- public API ---------- */

export interface FactorResult {
  slug: string;
  option: string;
  /** Years against the average answer: positive adds, negative takes. */
  years: number;
  /** Years the next realistic step would add, 0 when there is none. */
  gain: number;
  improveTo?: string;
}

export interface Assessment {
  date: string;
  profile: Profile;
  forecast: number;
  potential: number;
  bioAge: number;
  /** Expected age of an average person of the same sex and age in the same countries. */
  peers: number;
  factors: FactorResult[];
}

export function improvedAnswers(answers: Answers): Answers {
  const next: Answers = { ...answers };
  for (const f of FACTORS) {
    if (!f.modifiable) continue;
    const step = optionOf(f, answers[f.slug]).improveTo;
    if (step) next[f.slug] = step;
  }
  return next;
}

/** Expected age of the average person: peers' ratio, same countries. */
function peersForecast(profile: Profile, answers: Answers): number {
  return expectedAge({
    profile,
    before: curveOf(answers["country-before"], profile.sex),
    next: curveOf(answers["country-next"], profile.sex),
    lnRatio: 0,
    lambda: 0,
  });
}

export function assess(profile: Profile, answers: Answers, date = new Date().toISOString()): Assessment {
  const forecast = forecastOf(profile, answers);
  const factors = FACTORS.map((f): FactorResult => {
    const option = optionOf(f, answers[f.slug]);
    // Each answer is weighed against the average peer; a country against staying in Kyrgyzstan.
    const asTypical = forecastOf(profile, { ...answers, [f.slug]: f.kind === "country" ? f.typical : PEERS });
    const improveTo = f.modifiable ? option.improveTo : undefined;
    const gain = improveTo ? forecastOf(profile, { ...answers, [f.slug]: improveTo }) - forecast : 0;
    return { slug: f.slug, option: option.id, years: forecast - asTypical, gain: Math.max(gain, 0), improveTo };
  });
  return {
    date,
    profile,
    forecast,
    potential: forecastOf(profile, improvedAnswers(answers)),
    bioAge: biologicalAge(profile, answers),
    peers: peersForecast(profile, answers),
    factors,
  };
}

/** Every answer as the average peer: the reference person of the factor pages. */
export const PEER_ANSWERS: Answers = Object.fromEntries(
  FACTORS.filter((f) => f.kind !== "country").map((f) => [f.slug, PEERS]),
);

/** Expected age of the average person of one sex and age. */
export function averageForecast(profile: Profile): number {
  return forecastOf(profile, PEER_ANSWERS);
}

/** Years an option moves an otherwise average person of `age`, averaged over both sexes. */
export function optionEffect(slug: string, optionId: string, age = 40): number {
  const delta = (sex: Sex) =>
    forecastOf({ sex, age }, { ...PEER_ANSWERS, [slug]: optionId }) - forecastOf({ sex, age }, PEER_ANSWERS);
  return (delta("male") + delta("female")) / 2;
}

/** The span of years a factor covers for an average 40-year-old. */
export function factorRange(f: Factor, age = 40): { min: number; max: number } {
  const values = f.options.filter((o) => !o.unknown).map((o) => optionEffect(f.slug, o.id, age));
  return { min: Math.min(...values), max: Math.max(...values) };
}

const STEPS_CURVE: Array<[number, number]> = [
  [3000, Math.log(1.45)],
  [5000, Math.log(1.22)],
  [7000, Math.log(1.1)],
  [9000, Math.log(1.03)],
  [11000, 0],
];

/** Years a daily step count adds to an average 40-year-old, against 5 000 steps. */
export function stepsEffect(steps: number, age = 40): number {
  const curve = STEPS_CURVE;
  let ln = curve[0][1];
  if (steps >= curve[curve.length - 1][0]) ln = 0;
  else {
    for (let i = 1; i < curve.length; i += 1) {
      const [x1, y1] = curve[i];
      const [x0, y0] = curve[i - 1];
      if (steps <= x1) {
        ln = steps <= x0 ? y0 : y0 + ((steps - x0) / (x1 - x0)) * (y1 - y0);
        break;
      }
    }
  }
  const d = ln - Math.log(1.22);
  const base = { ...PEER_ANSWERS, steps: "4to6" };
  const delta = (sex: Sex) => forecastOf({ sex, age }, base, d) - forecastOf({ sex, age }, base);
  return (delta("male") + delta("female")) / 2;
}

export { bmiBand, bmiOf } from "../../factor/model/bmi.ts";

/** Period life expectancy at an adult age straight from a table, without progress or answers. */
export function lifeExpectancyAt(code: string, sex: Sex, age = 30): number {
  const curve = curveOf(code, sex);
  let s = 1;
  let years = 0;
  for (let x = Math.max(age, 15); x < MAX_AGE; x += STEP) {
    const rate = Math.exp(lnRate(curve, x + STEP / 2));
    const next = s * Math.exp(-rate * STEP);
    years += ((s + next) / 2) * STEP;
    s = next;
    if (s < 1e-7) break;
  }
  return age + years;
}
