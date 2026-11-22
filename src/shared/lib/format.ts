import { INTL, KY_AGE, KY_DATE, LOCALE } from "../config/locale.ts";

const MINUS = "\u2212";

/** Russian typesetting: a one-letter word never ends a line, it sticks to the next word. */
export const nb = (text: string) => text.replace(/(^|[\s(\u00ab])([\u0432\u0441\u043a\u043e\u0443\u0438\u0430\u044f\u0412\u0421\u041a\u041e\u0423\u0418\u0410\u042f])\s+/g, "$1$2\u00a0");

/** "33 фактора": the number and the noun in the right form. */
export const counted = (n: number, forms: [string, string, string]) => `${n} ${plural(n, forms)}`;

/**
 * Russian plural: 1 год, 2 года, 5 лет; fractions take the second form. A
 * translation fills the same three places: English uses the first for one and
 * the second for the rest, Kyrgyz keeps the noun after a number unchanged.
 */
export function plural(n: number, forms: [string, string, string]): string {
  if (LOCALE === "ky") return forms[0];
  if (LOCALE === "en") return Math.abs(n) === 1 ? forms[0] : forms[1];
  if (!Number.isInteger(n)) return forms[1];
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b === 1) return forms[0];
  if (b >= 2 && b <= 4) return forms[1];
  return forms[2];
}

const YEARS: [string, string, string] = ["год", "года", "лет"];
const MONTHS: [string, string, string] = ["месяц", "месяца", "месяцев"];

export const decimal = (n: number, digits = 1) =>
  n.toLocaleString(INTL[LOCALE], { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const integer = (n: number) => Math.round(n).toLocaleString(INTL[LOCALE]);

const ageWord = (n: number) => (LOCALE === "ky" ? KY_AGE : plural(n, YEARS));

/** "81 год", "37 лет". */
export function age(n: number): string {
  const r = Math.round(n);
  return `${r}\u00a0${ageWord(r)}`;
}

export const yearsWord = (n: number) => plural(Math.round(n), YEARS);

/** Signed amount of time: "+4,2 года", "−3 месяца", "0". */
export function delta(years: number, { sign = true }: { sign?: boolean } = {}): string {
  const abs = Math.abs(years);
  const s = !sign ? "" : years > 0 ? "+" : MINUS;
  if (abs >= 0.95) {
    const v = Math.round(abs * 10) / 10;
    return `${s}${decimal(v)}\u00a0${plural(v, YEARS)}`;
  }
  const months = Math.round(abs * 12);
  if (months >= 1) return `${s}${months}\u00a0${plural(months, MONTHS)}`;
  if (abs >= 0.002) return "\u043c\u0435\u043d\u044c\u0448\u0435 \u043c\u0435\u0441\u044f\u0446\u0430";
  return "0";
}

export function shortDate(iso: string): string {
  const at = new Date(iso);
  if (LOCALE === "ky") return KY_DATE(at.getDate(), at.getMonth(), at.getFullYear());
  return at
    .toLocaleDateString(INTL[LOCALE], { day: "numeric", month: "long", year: "numeric" })
    .replace(/\s?г\.$/, "");
}

export const thousands = (n: number) => n.toLocaleString(INTL[LOCALE]);

export interface Parts {
  num: string;
  unit: string;
}

/** A figure split so the number can be set large and the unit small. */
export function deltaParts(years: number): Parts {
  const text = delta(years);
  const m = text.match(/^([+\u2212]?[\d.,]+)\u00a0(.+)$/);
  return m ? { num: m[1], unit: m[2] } : { num: text === "0" ? "0" : "", unit: text === "0" ? "" : text };
}

/** Pet ages keep one decimal: half a year matters to a cat. Under a year it reads in months. */
export function petAgeParts(n: number): Parts {
  if (n < 1) {
    const m = Math.max(1, Math.round(n * 12));
    return { num: String(m), unit: plural(m, MONTHS) };
  }
  const v = Math.round(n * 10) / 10;
  return { num: decimal(v), unit: ageWord(v) };
}

export const petAge = (n: number) => {
  const p = petAgeParts(n);
  return `${p.num} ${p.unit}`;
};

export function ageParts(n: number): Parts {
  const r = Math.round(n);
  return { num: String(r), unit: ageWord(r) };
}
