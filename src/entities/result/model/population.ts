/*
 * How common each answer is among adults in Kyrgyzstan, by sex and age band
 * (0: 18-39, 1: 40-69, 2: 70 and older; the bands of the WHO STEPS survey,
 * the oldest one extrapolated). The model uses these shares to build the
 * average person of your sex and age: the life table describes that person,
 * so your ratio is taken against theirs (see engine.ts, step 4).
 *
 * Sources, rounded:
 *   STEPS 2023  WHO STEPS survey Kyrgyzstan 2023, ages 18-69, n = 2 483 (WHO/EURO, 2026)
 *   Census 2022 Population and housing census of Kyrgyzstan, marital status, tables 5.3-5.4
 *   Road        Bishkek seat-belt observation 2019; ESRA3 survey 2023; WHO road safety report 2023
 *   GLOBOCAN    IARC GLOBOCAN 2024, 5-year cancer prevalence
 *   estimate    no survey for Kyrgyzstan: a cautious guess from neighbouring data, to replace when one appears
 * Factors missing here count as "everyone gives the typical answer".
 */
import type { Factor } from "../../factor/model/types.ts";

export type Band = 0 | 1 | 2;
type Sex = "male" | "female";
export type Shares = Record<string, number>;
type ByBand = [Shares, Shares, Shares];
type Entry = Shares | { male: Shares | ByBand; female: Shares | ByBand };

/** Age at the middle of each band, for interpolation between them. */
export const BAND_CENTRES: Record<Band, number> = { 0: 29, 1: 54, 2: 77 };

export const PREVALENCE: Record<string, Entry> = {
  // STEPS 2023: daily, non-daily, former and never smokers; men who only use nasvay (5% at 18-39, 13% at 40-69) are "smokeless".
  smoking: {
    male: [
      { never: 59.5, quit10: 3, quit: 6.8, smokeless: 4.8, light: 17.3, heavy: 8.6 },
      { never: 34.8, quit10: 9, quit: 6.5, smokeless: 13, light: 17.9, heavy: 18.8 },
      { never: 45, quit10: 20, quit: 5, smokeless: 6, light: 12, heavy: 12 },
    ],
    female: [
      { never: 95.5, quit10: 0.7, quit: 1.4, smokeless: 0.1, light: 1.8, heavy: 0.5 },
      { never: 94.6, quit10: 1.2, quit: 0.7, smokeless: 0.1, light: 2.3, heavy: 1.1 },
      { never: 96, quit10: 2, quit: 0.5, light: 1, heavy: 0.5 },
    ],
  },
  // STEPS 2023: 16% of men and 7% of women drank in the last 30 days, about 4 drinks a week on average.
  alcohol: {
    male: [
      { none: 87.9, low: 9, mid: 2, high: 0.8, heavy: 0.3 },
      { none: 78.9, low: 15, mid: 4, high: 1.5, heavy: 0.6 },
      { none: 88, low: 9, mid: 2, high: 0.7, heavy: 0.3 },
    ],
    female: { none: 93, low: 6.5, mid: 0.4, high: 0.1 },
  },
  // estimate: international sleep surveys.
  sleep: { lt6: 12, "6to7": 30, "7to8": 40, "8to9": 13, gt9: 5 },
  // STEPS 2023 counts work and transport and finds 7-11% below 150 minutes; the test question is narrower, so the shares are discounted.
  activity: {
    male: [
      { none: 5, lt150: 15, "150to300": 25, gt300: 55 },
      { none: 10, lt150: 20, "150to300": 25, gt300: 45 },
      { none: 25, lt150: 30, "150to300": 25, gt300: 20 },
    ],
    female: [
      { none: 10, lt150: 25, "150to300": 30, gt300: 35 },
      { none: 12, lt150: 25, "150to300": 30, gt300: 33 },
      { none: 30, lt150: 30, "150to300": 25, gt300: 15 },
    ],
  },
  // estimate.
  strength: {
    male: [
      { none: 65, lt30: 12, "30to60": 12, gt60: 11 },
      { none: 75, lt30: 10, "30to60": 9, gt60: 6 },
      { none: 88, lt30: 6, "30to60": 4, gt60: 2 },
    ],
    female: [
      { none: 80, lt30: 9, "30to60": 7, gt60: 4 },
      { none: 87, lt30: 6, "30to60": 5, gt60: 2 },
      { none: 93, lt30: 4, "30to60": 2, gt60: 1 },
    ],
  },
  // estimate: compared with peers by definition, more people fall behind with age.
  muscle: {
    male: [
      { more: 22, average: 63, less: 15 },
      { more: 18, average: 60, less: 22 },
      { more: 12, average: 53, less: 35 },
    ],
    female: [
      { more: 15, average: 65, less: 20 },
      { more: 12, average: 60, less: 28 },
      { more: 8, average: 50, less: 42 },
    ],
  },
  // estimate.
  steps: [
    { lt4: 15, "4to6": 28, "6to8": 27, "8to10": 17, gt10: 13 },
    { lt4: 22, "4to6": 30, "6to8": 25, "8to10": 14, gt10: 9 },
    { lt4: 40, "4to6": 30, "6to8": 18, "8to10": 8, gt10: 4 },
  ] as unknown as Shares,
  // STEPS 2023: 3.4 (men) and 3.6 (women) servings a day, 74-78% below five.
  "fruits-vegetables": {
    male: { lt1: 8, "1to2": 32, "3to4": 37, "5plus": 23 },
    female: { lt1: 7, "1to2": 30, "3to4": 38, "5plus": 25 },
  },
  // estimate: STEPS did not ask about processed meat.
  "processed-meat": { rare: 35, weekly: 40, often: 18, daily: 7 },
  // STEPS 2023: daily sugary drinks 8.5% of men (12.8% at 18-39) and 5.6% of women.
  "sugary-drinks": {
    male: [
      { rare: 40, weekly: 47, daily: 9, twice: 4 },
      { rare: 55, weekly: 40, daily: 4, twice: 1 },
      { rare: 65, weekly: 32, daily: 2.5, twice: 0.5 },
    ],
    female: [
      { rare: 55, weekly: 37, daily: 6, twice: 2 },
      { rare: 68, weekly: 28, daily: 3, twice: 1 },
      { rare: 75, weekly: 22, daily: 2.5, twice: 0.5 },
    ],
  },
  // STEPS 2023, measured: obesity 12% of men and 11% of women at 18-39, 27% and 42% at 40-69.
  bmi: {
    male: [
      { lt18: 3.5, "18to20": 11, "20to25": 40.2, "25to27": 18, "27to30": 15, "30to35": 9, "35to40": 2.5, gt40: 0.8 },
      { lt18: 1.5, "18to20": 3, "20to25": 23.7, "25to27": 24, "27to30": 21, "30to35": 19, "35to40": 6, gt40: 1.8 },
      { lt18: 4, "18to20": 6, "20to25": 28, "25to27": 21, "27to30": 19, "30to35": 16, "35to40": 4.5, gt40: 1.5 },
    ],
    female: [
      { lt18: 3.5, "18to20": 15, "20to25": 46.8, "25to27": 13.5, "27to30": 10.5, "30to35": 7.5, "35to40": 2.4, gt40: 0.8 },
      { lt18: 1, "18to20": 2, "20to25": 18, "25to27": 20, "27to30": 17, "30to35": 28, "35to40": 10, gt40: 4 },
      { lt18: 3, "18to20": 4, "20to25": 22, "25to27": 19, "27to30": 17, "30to35": 24, "35to40": 8, gt40: 3 },
    ],
  },
  // STEPS 2023: raised pressure 24% of men and 13% of women at 18-39, 51-53% at 40-69; only 8% of the treated are controlled.
  "blood-pressure": {
    male: [
      { lt120: 30, "120": 25, "130": 21.5, "140": 17, "160": 6.5 },
      { lt120: 12, "120": 15, "130": 22, "140": 31, "160": 20 },
      { lt120: 8, "120": 12, "130": 20, "140": 33, "160": 27 },
    ],
    female: [
      { lt120: 52, "120": 20, "130": 14.6, "140": 10, "160": 3.4 },
      { lt120: 15, "120": 13, "130": 19, "140": 31, "160": 22 },
      { lt120: 8, "120": 10, "130": 18, "140": 34, "160": 30 },
    ],
  },
  // STEPS 2023: mean resting pulse 73.5 (men) and 76.5 (women).
  "heart-rate": {
    male: { lt60: 11, "60to69": 25, "70to79": 32, "80to89": 22, gt90: 10 },
    female: { lt60: 7, "60to69": 20, "70to79": 32, "80to89": 26, gt90: 15 },
  },
  // Road: in Bishkek 70% of drivers and 59% of front passengers wear a belt, 6% in the back.
  "seat-belt": { always: 5, front: 45, sometimes: 30, never: 20 },
  // Road: 72% of drivers in ESRA3 held a phone while driving in the last month, the highest of 39 countries.
  "phone-driving": {
    male: { nodrive: 40, never: 15, sometimes: 30, often: 15 },
    female: { nodrive: 78, never: 7, sometimes: 11, often: 4 },
  },
  // Road: about 9 000 registered motorcycles for 7 million people.
  motorcycle: {
    male: { never: 98.5, sometimes: 1, regular: 0.5 },
    female: { never: 99.7, sometimes: 0.25, regular: 0.05 },
  },
  // Census 2022, adults.
  relationship: {
    male: [
      { married: 54.6, single: 41.9, divorced: 2.8, widowed: 0.7 },
      { married: 80.9, single: 11.3, divorced: 5.3, widowed: 2.5 },
      { married: 75, single: 2, divorced: 4, widowed: 19 },
    ],
    female: [
      { married: 63, single: 29.7, divorced: 6.1, widowed: 1.2 },
      { married: 60.5, single: 13.8, divorced: 7.5, widowed: 18.2 },
      { married: 35, single: 3, divorced: 7, widowed: 55 },
    ],
  },
  // estimate.
  "close-people": { none: 5, one2: 25, three5: 45, six: 25 },
  // estimate.
  "relationship-quality": { great: 25, good: 40, mixed: 22, poor: 9, bad: 4 },
  // estimate.
  "life-satisfaction": { very: 20, mostly: 42, mixed: 26, low: 9, "very-low": 3 },
  // STEPS 2023: depression symptoms in the past year, 14% of men and 26% of women.
  distress: {
    male: { rarely: 45, sometimes: 40, often: 11, always: 4 },
    female: { rarely: 32, sometimes: 42, often: 19, always: 7 },
  },
  // estimate.
  optimism: { bad: 15, mixed: 50, good: 35 },
  // estimate: fewer parents reach 85 in Kyrgyzstan than in the UK Biobank.
  parents: { long: 18, short: 15, other: 67 },
  // estimate.
  "family-heart": { no: 85, yes: 15 },
  // estimate.
  "family-cancer": { no: 92, yes: 8 },
  // STEPS 2023: raised glucose or treatment 4% (men) and 2% (women) at 18-39, 10% at 40-69; impaired fasting glucose 5%.
  diabetes: [
    { no: 94, pre: 3, yes: 3 },
    { no: 83, pre: 7, yes: 10 },
    { no: 75, pre: 9, yes: 16 },
  ] as unknown as Shares,
  // STEPS 2023: heart attack, angina or stroke 5% at 18-39 and 12% at 40-69.
  "heart-disease": {
    male: [
      { no: 95.2, event: 1.5, other: 3.3 },
      { no: 88.4, event: 5, other: 6.6 },
      { no: 75, event: 12, other: 13 },
    ],
    female: [
      { no: 95.4, event: 1.3, other: 3.3 },
      { no: 87.6, event: 4.5, other: 7.9 },
      { no: 77, event: 10, other: 13 },
    ],
  },
  // GLOBOCAN 2024: about 280 people per 100 000 live within 5 years of a cancer diagnosis.
  cancer: [
    { no: 99.75, remission: 0.1, recent: 0.15 },
    { no: 98.8, remission: 0.6, recent: 0.6 },
    { no: 96.5, remission: 2, recent: 1.5 },
  ] as unknown as Shares,
  // estimate from STEPS 2023 mean total cholesterol 3.6-4.4 mmol/l, LDL about 60% of it.
  ldl: [
    { lt18: 18, "18to25": 37, "26to33": 30, "34to40": 10, "41to48": 4, ge49: 1 },
    { lt18: 10, "18to25": 28, "26to33": 34, "34to40": 17, "41to48": 8, ge49: 3 },
    { lt18: 10, "18to25": 28, "26to33": 34, "34to40": 17, "41to48": 8, ge49: 3 },
  ] as unknown as Shares,
  // estimate in line with the STEPS glucose figures.
  hba1c: [
    { lt57: 90, "57to64": 6.5, ge65: 3.5 },
    { lt57: 72, "57to64": 17, ge65: 11 },
    { lt57: 65, "57to64": 20, ge65: 15 },
  ] as unknown as Shares,
  // estimate: population surveys elsewhere.
  crp: [
    { lt1: 35, "1to3": 38, "3to10": 22, gt10: 5 },
    { lt1: 28, "1to3": 38, "3to10": 27, gt10: 7 },
    { lt1: 25, "1to3": 38, "3to10": 30, gt10: 7 },
  ] as unknown as Shares,
  // estimate: little fish in the diet of Central Asia.
  omega3: { lt4: 45, "4to8": 52, gt8: 3 },
};

/** Shares of each option for the sex and band, normalised to 1; the typical answer when nothing is known. */
export function sharesFor(f: Factor, sex: Sex, band: Band): Shares {
  const entry = PREVALENCE[f.slug] as unknown;
  let shares: Shares | undefined;
  if (Array.isArray(entry)) shares = entry[band];
  else if (entry && typeof entry === "object" && "male" in entry) {
    const bySex = (entry as { male: Shares | ByBand; female: Shares | ByBand })[sex];
    shares = Array.isArray(bySex) ? bySex[band] : bySex;
  } else shares = entry as Shares | undefined;
  if (!shares) return { [f.typical]: 1 };
  const valid = Object.entries(shares).filter(([id, p]) => p > 0 && f.options.some((o) => o.id === id && !o.unknown));
  const total = valid.reduce((acc, [, p]) => acc + p, 0);
  if (total === 0) return { [f.typical]: 1 };
  return Object.fromEntries(valid.map(([id, p]) => [id, p / total]));
}
