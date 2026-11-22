/*
 * The average peer in each country.
 *
 * population.ts holds the answer shares of Kyrgyzstan by sex and age band. They
 * are the template: for every other country the groups that WHO measures
 * (smoking, smokeless tobacco, weight, pressure, inactivity, diabetes) are
 * shifted on the log-odds scale until the adult average meets the country's
 * figure, which keeps the age pattern of the survey. Alcohol comes from litres
 * per adult and the share of abstainers. Factors WHO does not measure keep the
 * template and are estimates everywhere outside Kyrgyzstan.
 */
import type { Factor } from "../../factor/model/types.ts";
import { sharesFor, type Band, type Shares } from "./population.ts";
import { RISK_PROFILES } from "./risk-profiles.ts";

type Sex = "male" | "female";
type Bands = [Shares, Shares, Shares];

/** The country whose survey is the template. */
export const SURVEY_COUNTRY = "KGZ";
/** Road deaths per 100 000 a year where the road risks of the factors were estimated. */
const SURVEY_ROAD_RATE = 13.3;
/** Adult population by band, for the all-adult figures of WHO. */
const ADULTS = [0.52, 0.4, 0.08];
/** The same for the hypertension figure, which covers ages 30 to 79. */
const AGES_30_79 = [0.28, 0.64, 0.08];
/** A litre of pure alcohol a year in 10 g portions a week. */
const PORTIONS_PER_LITRE = 1.517;
/** Surveys and cohorts hear less than half of what is sold; the ratios of the test are on their scale. */
const SELF_REPORT = 0.4;
/** Men drink about three quarters of the alcohol in most countries. */
const MEN_SHARE = 0.75;

interface Profile {
  smoked: number;
  tobacco: number;
  obese: number;
  overweight: number;
  hypertension: number;
  inactive: number;
  diabetes: number;
  abstain: number;
  litres: number;
  road: number;
}

function profileOf(country: string, sex: Sex): Profile {
  const v = RISK_PROFILES[country] ?? RISK_PROFILES.GLOBAL;
  const at = (pair: number) => v[pair * 2 + (sex === "male" ? 0 : 1)] / 100;
  return {
    smoked: at(0),
    tobacco: at(1),
    obese: at(2),
    overweight: at(3),
    hypertension: at(4),
    inactive: at(5),
    diabetes: at(6),
    abstain: at(7),
    litres: v[16],
    road: v[17],
  };
}

const sumOf = (shares: Shares, ids: string[]) => ids.reduce((acc, id) => acc + (shares[id] ?? 0), 0);

/**
 * Moves the weighted share of `ids` to `target`, every band by the same step in
 * log odds. Options in `keep` stay as they are; the rest scale to fill up.
 */
function shift(bands: Bands, ids: string[], target: number, weights: number[], keep: string[] = []): Bands {
  const free = bands.map((b) => 1 - sumOf(b, keep));
  const share = bands.map((b, i) => Math.min(Math.max(sumOf(b, ids) / free[i], 0.001), 0.999));
  const moved = (i: number, step: number) => 1 / (1 + ((1 - share[i]) / share[i]) * Math.exp(-step));
  let lo = -8;
  let hi = 8;
  for (let n = 0; n < 40; n += 1) {
    const mid = (lo + hi) / 2;
    const average = weights.reduce((acc, w, i) => acc + w * free[i] * moved(i, mid), 0);
    if (average < target) lo = mid;
    else hi = mid;
  }
  return bands.map((band, i) => {
    const p = moved(i, (lo + hi) / 2);
    return Object.fromEntries(
      Object.entries(band).map(([id, value]) => {
        if (keep.includes(id)) return [id, value];
        return [id, ids.includes(id) ? (value * p) / share[i] : (value * (1 - p)) / (1 - share[i])];
      }),
    );
  }) as Bands;
}

/** Shares of drinkers above 10, 20 and 35 portions a week, with intake spread exponentially among drinkers. */
function alcoholBands(p: Profile, sex: Sex): Bands {
  const litres = p.litres * 2 * (sex === "male" ? MEN_SHARE : 1 - MEN_SHARE);
  const drinkers = Math.max(1 - p.abstain, 0.02);
  const mean = Math.max((litres * PORTIONS_PER_LITRE * SELF_REPORT) / drinkers, 0.01);
  const above = (portions: number) => drinkers * Math.exp(-portions / mean);
  const shares: Shares = {
    none: 1 - drinkers,
    low: drinkers - above(10),
    mid: above(10) - above(20),
    high: above(20) - above(35),
    heavy: above(35),
  };
  return [shares, shares, shares];
}

const OBESE = ["30to35", "35to40", "gt40"];
const SMOKED = ["light", "heavy"];

function adapt(slug: string, template: Bands, p: Profile, sex: Sex): Bands {
  switch (slug) {
    case "smoking": {
      const smoked = shift(template, SMOKED, p.smoked, ADULTS);
      // The template has no smokeless users among the oldest women.
      const seeded = smoked.map((band) => ({ ...band, smokeless: band.smokeless ?? 0.001 })) as unknown as Bands;
      return shift(seeded, ["smokeless"], Math.max(p.tobacco - p.smoked, 0.001), ADULTS, SMOKED);
    }
    case "bmi": {
      const obese = shift(template, OBESE, p.obese, ADULTS);
      return shift(obese, ["25to27", "27to30"], Math.max(p.overweight - p.obese, 0.01), ADULTS, OBESE);
    }
    case "blood-pressure":
      return shift(template, ["140", "160"], p.hypertension, AGES_30_79);
    case "activity":
      return shift(template, ["none", "lt150"], p.inactive, ADULTS);
    case "diabetes":
      return shift(template, ["yes"], p.diabetes, ADULTS);
    case "hba1c":
      return shift(template, ["ge65"], p.diabetes, ADULTS);
    case "alcohol":
      return alcoholBands(p, sex);
    default:
      return template;
  }
}

const cache = new Map<string, Bands>();

/** Answer shares of one factor among peers of this country, sex and age band. */
export function peerShares(f: Factor, sex: Sex, band: Band, country: string): Shares {
  const key = `${f.slug}:${sex}:${country}`;
  let bands = cache.get(key);
  if (!bands) {
    const template: Bands = [sharesFor(f, sex, 0), sharesFor(f, sex, 1), sharesFor(f, sex, 2)];
    bands = country === SURVEY_COUNTRY ? template : adapt(f.slug, template, profileOf(country, sex), sex);
    cache.set(key, bands);
  }
  return bands[band];
}

/** How much deadlier or safer the roads of the country are than those the road risks were estimated on. */
export function roadScale(country: string): number {
  if (country === SURVEY_COUNTRY) return 1;
  return Math.min(Math.max(profileOf(country, "male").road / SURVEY_ROAD_RATE, 0.15), 3);
}
