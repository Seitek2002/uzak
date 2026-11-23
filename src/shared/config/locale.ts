/*
 * The language of this build. The site is built once per language (see
 * scripts/i18n/build.mjs), so this is a constant in the browser. This file is
 * never translated: each language is named in itself.
 */

export type Locale = "ru" | "en" | "ky";

export const LOCALE = (process.env.NEXT_PUBLIC_LOCALE ?? "ru") as Locale;

/** Where the Russian copy lives; the other languages are folders inside it. */
export const ROOT_PATH = process.env.NEXT_PUBLIC_ROOT_PATH ?? "";

export const LOCALES: Array<{ code: Locale; short: string; name: string }> = [
  { code: "ru", short: "Рус", name: "Русский" },
  { code: "en", short: "Eng", name: "English" },
  { code: "ky", short: "Кыр", name: "Кыргызча" },
];

export const OG_LOCALE: Record<Locale, string> = { ru: "ru_RU", en: "en_US", ky: "ky_KG" };

/** Chrome has no Kyrgyz number or collation data; Russian writes both the same way. */
export const INTL: Record<Locale, string> = { ru: "ru-RU", en: "en-GB", ky: "ru-RU" };

/** Kyrgyz month names, for the same reason. */
export const KY_MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

export const KY_DATE = (day: number, month: number, year: number) => `${year}-ж. ${day}-${KY_MONTHS[month]}`;

/** Kyrgyz has one word for an age and another for a length of time. */
export const KY_AGE = "жаш";

export const LOCALE_KEY = "uzak-lang";

/*
 * On a Russian address a first-time visitor moves to the language of the
 * browser. A choice in the switch wins, a link to /en or /ky is never
 * redirected, and crawlers see each address as it is.
 */
export const LOCALE_REDIRECT = `(function () {
  try {
    if (/bot|crawl|spider/i.test(navigator.userAgent)) return;
    var saved = localStorage.getItem(${JSON.stringify(LOCALE_KEY)});
    var asked = (navigator.language || "ru").slice(0, 2).toLowerCase();
    var to = saved || (asked === "ky" ? "ky" : /^(ru|be|kk|tg|uz)$/.test(asked) ? "ru" : "en");
    if (to !== "en" && to !== "ky") return;
    var root = ${JSON.stringify(ROOT_PATH)};
    var path = location.pathname.slice(root.length) || "/";
    if (/^\\/(en|ky)(\\/|$)/.test(path)) return;
    location.replace(root + "/" + to + path + location.search + location.hash);
  } catch (e) {}
})();`;
