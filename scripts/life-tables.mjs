#!/usr/bin/env node
/*
 * Builds the worldwide data of the model from the WHO Global Health Observatory:
 *
 *   src/entities/result/model/life-tables.ts    death rates nMx by country, sex and age (15 to 85+)
 *   src/entities/result/model/risk-profiles.ts  how common the main risks are in each country
 *   src/shared/data/countries.ts                country names in Russian, English and Kyrgyz
 *
 *   npm run life-tables            run once a year, then read the list of substituted tables it prints
 *
 * The model projects one year of mortality fifty years ahead, so a year of war,
 * a disaster or a broken age pattern must not become a lifetime. A country
 * keeps the earlier table (PRE_SHOCK) when the latest one
 *   - loses more than a year of life expectancy at 30 against it,
 *   - has death rates at 15-29 more than 1.8 times higher, or
 *   - has an age pattern after 50 that is broken and worse than the earlier one.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ISO2 } from "./iso-countries.mjs";

const LATEST = 2023;
const PRE_SHOCK = 2019;
const API = "https://ghoapi.azureedge.net/api";
const GROUPS = ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70-74", "75-79", "80-84", "85PLUS"];
const AT_30 = GROUPS.indexOf("30-34");
const AT_55 = GROUPS.indexOf("55-59");
const MAX_E30_FALL = 1;
const MAX_YOUNG_RISE = 1.8;
/** A jump between neighbouring five-year groups; real populations stay near 1.4-2.2. */
const MAX_AGE_JUMP = 2.7;
const CODES = [...Object.keys(ISO2).sort(), "GLOBAL"];
const SEXES = { male: "SEX_MLE", female: "SEX_FMLE" };

async function gho(path) {
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch(`${API}/${path}`);
    if (res.ok) return (await res.json()).value;
    if (attempt === 3) throw new Error(`WHO API answered ${res.status} for ${path}`);
  }
}

/* ---------- life tables ---------- */

async function tablesOf(year) {
  const rows = await gho(`LIFE_0000000029?$filter=TimeDim%20eq%20${year}&$select=SpatialDim,Dim1,Dim2,NumericValue`);
  const cells = new Map(rows.map((r) => [`${r.SpatialDim}:${r.Dim1}:${r.Dim2.replace("AGEGROUP_YEARS", "")}`, r.NumericValue]));
  return new Map(
    CODES.map((code) => {
      const table = { year };
      for (const [sex, dim] of Object.entries(SEXES)) {
        table[sex] = GROUPS.map((group) => {
          const value = cells.get(`${code}:${dim}:${group}`);
          if (typeof value !== "number" || value <= 0) throw new Error(`No ${group} for ${code} ${sex} in ${year}`);
          return Number(value.toPrecision(4));
        });
      }
      return [code, table];
    }),
  );
}

function e30(rates) {
  let alive = 1;
  let age = 30;
  for (let i = AT_30; i < rates.length - 1; i += 1) {
    const survive = Math.exp(-5 * rates[i]);
    age += (alive * (1 - survive)) / rates[i];
    alive *= survive;
  }
  return age + alive / rates[rates.length - 1];
}

/** 0 for a plausible age pattern after 50, higher the worse it is broken. */
function brokenness(rates) {
  let worst = 0;
  for (let i = AT_55; i < rates.length - 1; i += 1) {
    const jump = rates[i] / rates[i - 1];
    if (jump > MAX_AGE_JUMP) worst = Math.max(worst, jump / MAX_AGE_JUMP);
    if (jump < 1) worst = Math.max(worst, 1 / jump);
  }
  return worst;
}

function choose(code, now, before) {
  if (code === "GLOBAL") return { table: now };
  for (const sex of Object.keys(SEXES)) {
    if (e30(before[sex]) - e30(now[sex]) > MAX_E30_FALL) return { table: before, why: "life expectancy fell" };
    const young = (rates) => rates.slice(0, AT_30).reduce((a, b) => a + b, 0);
    if (young(now[sex]) > MAX_YOUNG_RISE * young(before[sex])) return { table: before, why: "deaths at 15-29 jumped" };
  }
  const broken = (t) => Math.max(brokenness(t.male), brokenness(t.female));
  if (broken(now) > 0 && broken(before) < broken(now)) return { table: before, why: "broken age pattern" };
  return { table: now };
}

/* ---------- risk profiles ---------- */

/** id, WHO indicator, newest year to use, age group when the indicator has several. */
const INDICATORS = [
  ["smoked", "M_Est_smk_curr_std", 2023],
  ["tobacco", "M_Est_tob_curr_std", 2023],
  ["obese", "NCD_BMI_30A", 2024, "AGEGROUP_YEARS18-PLUS"],
  ["overweight", "NCD_BMI_25A", 2024, "AGEGROUP_YEARS18-PLUS"],
  ["hypertension", "NCD_HYP_PREVALENCE_A", 2024],
  ["inactive", "NCD_PAA", 2024, "AGEGROUP_YEARS18-PLUS"],
  ["diabetes", "NCD_DIABETES_PREVALENCE_AGESTD", 2024, "AGEGROUP_YEARS18-PLUS"],
  ["abstain", "SA_0000001409", 2023],
  ["litres", "SA_0000001688", 2024],
  ["road", "RS_198", 2024],
];
/** Indicators published for both sexes together only, or used that way. */
const SEXLESS = new Set(["litres", "road"]);

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

async function profilesOf(regions) {
  const profiles = new Map(CODES.map((code) => [code, {}]));
  let filled = 0;
  for (const [id, indicator, maxYear, ageGroup] of INDICATORS) {
    const rows = await gho(`${indicator}?$select=SpatialDim,TimeDim,Dim1,Dim2,NumericValue`);
    const dims = SEXLESS.has(id) ? ["SEX_BTSX"] : Object.values(SEXES);
    const latest = new Map();
    for (const row of rows) {
      if (row.NumericValue === null || row.TimeDim > maxYear) continue;
      if (ageGroup && row.Dim2 !== ageGroup) continue;
      if (!dims.includes(row.Dim1)) continue;
      const key = `${row.SpatialDim}:${row.Dim1}`;
      if (!(latest.get(key)?.TimeDim >= row.TimeDim)) latest.set(key, row);
    }
    const valueOf = (code, dim) => latest.get(`${code}:${dim}`)?.NumericValue;
    for (const code of CODES) {
      profiles.get(code)[id] = dims.map((dim) => {
        let value = valueOf(code, dim);
        if (value === undefined) {
          // No survey: the median of the WHO region, for the world the median of all countries.
          const known = CODES.filter((c) => c !== "GLOBAL" && valueOf(c, dim) !== undefined);
          const near = known.filter((c) => regions.get(c) === regions.get(code));
          const pool = code !== "GLOBAL" && near.length ? near : known;
          if (!pool.length) throw new Error(`${indicator} has no values for ${dim}`);
          value = median(pool.map((c) => valueOf(c, dim)));
          filled += 1;
        }
        return Number(value.toFixed(1));
      });
    }
  }
  return { profiles, filled };
}

/* ---------- output ---------- */

const write = (path, text) => writeFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), text);

const now = await tablesOf(LATEST);
const before = await tablesOf(PRE_SHOCK);
const substituted = [];
const tables = CODES.map((code) => {
  const { table, why } = choose(code, now.get(code), before.get(code));
  if (why) substituted.push(`${code} ${why}`);
  return `  { code: "${code}", year: ${table.year}, male: [${table.male.join(",")}], female: [${table.female.join(",")}] },`;
});

write(
  "entities/result/model/life-tables.ts",
  `/*
 * Generated by scripts/life-tables.mjs from the WHO Global Health Observatory:
 * age-specific death rates nMx for 15-19, 20-24 ... 80-84 and 85+. The year is
 * ${LATEST}, or ${PRE_SHOCK} where ${LATEST} was a year of crisis or has a broken age
 * pattern. Do not edit by hand.
 */

export const LIFE_TABLE_YEAR = ${LATEST};
export const FALLBACK_YEAR = ${PRE_SHOCK};
/** Countries that keep the earlier table. */
export const FALLBACK_COUNT = ${substituted.length};

/** Lower bound of each age group; the last group is open (85+). */
export const AGE_GROUPS = [${GROUPS.map((g) => Number.parseInt(g, 10)).join(", ")}];

export interface LifeTable {
  /** ISO 3166 alpha-3 code, or GLOBAL for the world average. */
  code: string;
  year: number;
  male: number[];
  female: number[];
}

export const LIFE_TABLES: LifeTable[] = [
${tables.join("\n")}
];
`,
);

const regions = new Map((await gho("DIMENSION/COUNTRY/DimensionValues")).map((c) => [c.Code, c.ParentCode]));
const { profiles, filled } = await profilesOf(regions);
write(
  "entities/result/model/risk-profiles.ts",
  `/*
 * Generated by scripts/life-tables.mjs from the WHO Global Health Observatory,
 * newest year of each indicator up to 2024. Values in order:
 * ${INDICATORS.map(([id]) => (SEXLESS.has(id) ? id : `${id} (men, women)`)).join(", ")}.
 * Percent of adults, except litres (pure alcohol per adult a year) and road
 * (deaths per 100 000 a year). A country without a survey has the median of
 * its WHO region. Do not edit by hand.
 */

export const RISK_PROFILES: Record<string, number[]> = {
${CODES.map((code) => `  ${code}: [${INDICATORS.flatMap(([id]) => profiles.get(code)[id]).join(",")}],`).join("\n")}
};
`,
);

/** Where CLDR differs from the name the readers use. */
const RU_NAMES = { KGZ: "Кыргызстан", KOR: "Южная Корея", PRK: "Северная Корея", COD: "ДР Конго", COG: "Республика Конго" };
const names = Object.fromEntries(["ru", "en", "ky"].map((lang) => [lang, new Intl.DisplayNames([lang], { type: "region" })]));
const collator = new Intl.Collator("en");
const countries = Object.entries(ISO2)
  .map(([code, iso2]) => ({ code, iso2, ru: RU_NAMES[code] ?? names.ru.of(iso2), en: names.en.of(iso2), ky: names.ky.of(iso2) }))
  .sort((a, b) => collator.compare(a.en, b.en));
countries.push({ code: "GLOBAL", iso2: "", ru: "Другая страна", en: "Another country", ky: "Башка өлкө" });
write(
  "shared/data/countries.ts",
  `/*
 * Generated by scripts/life-tables.mjs: the countries the test offers, sorted
 * by the English name (the interface sorts them for its language). Names come
 * from Unicode CLDR through Intl.DisplayNames. Do not edit by hand.
 */

export interface Country {
  /** ISO 3166 alpha-3 code, or GLOBAL for the world average. */
  code: string;
  /** ISO 3166 alpha-2 code, empty for GLOBAL. */
  iso2: string;
  ru: string;
  en: string;
  ky: string;
}

export const COUNTRIES: Country[] = [
${countries.map((c) => `  ${JSON.stringify(c)},`).join("\n")}
];
`,
);

console.log(`${CODES.length - 1} countries and the world written`);
console.log(`${filled} profile cells without a survey took a median`);
console.log(`${substituted.length} countries keep ${PRE_SHOCK}:\n  ${substituted.join("\n  ")}`);
