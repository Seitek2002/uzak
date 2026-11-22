#!/usr/bin/env node
/*
 * End-to-end checks of the three languages of the static copy.
 *
 *   node scripts/i18n/build.mjs              builds out/, out/en/, out/ky/
 *   serve out/ under the base path, then
 *   BASE_URL=http://localhost:3200/uzak node scripts/e2e-locales.mjs
 *
 * Needs Playwright and Chrome, like scripts/e2e.mjs, which covers the behaviour
 * of the tests in Russian. This file covers what a translation can break: the
 * redirect, the switch, untranslated or broken texts, and the layout.
 */
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try {
    return require("playwright");
  } catch {
    if (!process.env.PLAYWRIGHT_DIR) throw new Error("Playwright not found: install it or set PLAYWRIGHT_DIR");
    return require(path.join(process.env.PLAYWRIGHT_DIR, "playwright"));
  }
})();

const BASE = (process.env.BASE_URL ?? "http://localhost:3200/uzak").replace(/\/$/, "");
const ROOT = new URL(BASE).pathname.replace(/\/$/, "");
const LANGUAGES = [
  { code: "ru", prefix: "", browser: "ru-RU", years: /\s(год|года|лет)$/ },
  { code: "en", prefix: "/en", browser: "en-US", years: /\s(year|years)$/ },
  { code: "ky", prefix: "/ky", browser: "ky-KG", years: /\sжаш$/ },
];
const WIDTHS = [320, 375, 1280];

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `: ${detail}`}`);
};
const some = (list) => `${list.length}: ${[...new Set(list)].slice(0, 12).join(" | ")}`;

async function context(browser, locale, viewport = { width: 375, height: 812 }) {
  const ctx = await browser.newContext({ viewport, locale });
  await ctx.route(/api\.country\.is|get\.geojs\.io/, (route) =>
    route.fulfill({ json: { country: "KG" }, headers: { "access-control-allow-origin": "*" } }),
  );
  return ctx;
}

/** What a reader of this language must never meet on a page, and what sticks out of it. */
function inspect({ code }) {
  const seen = [document.title, document.querySelector('meta[name="description"]')?.content ?? ""];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const parent = walker.currentNode.parentElement;
    if (!parent || parent.closest("script, style, noscript, .langs")) continue;
    seen.push(walker.currentNode.textContent);
  }
  for (const el of document.querySelectorAll("[aria-label], [alt], [title], [placeholder], [aria-valuetext]")) {
    if (el.closest(".langs")) continue;
    for (const name of ["aria-label", "alt", "title", "placeholder", "aria-valuetext"]) {
      if (el.hasAttribute(name)) seen.push(el.getAttribute(name));
    }
  }
  const texts = seen.map((t) => t.trim()).filter(Boolean);
  const broken = texts.filter((t) => /\{\d\}|<\/?\d>|undefined|NaN/.test(t));
  const foreign = code === "en" ? texts.filter((t) => /[Ѐ-ӿ]/.test(t) || /\d,\d{1,2}(?!\d)/.test(t.replace(/\(\d[^)]*\)|;\d[^ ]*/g, ""))) : [];

  const width = document.documentElement.clientWidth;
  const outside = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("script, style, svg, noscript, .sr-only, .skip")) continue;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height || (box.right <= width + 1 && box.left >= -1)) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || box.right <= 0) continue;
    let held = false;
    for (let up = el.parentElement; up && up !== document.body; up = up.parentElement) {
      if (/auto|scroll/.test(getComputedStyle(up).overflowX)) held = true;
    }
    if (!held) outside.push(`${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? "").trim().slice(0, 40)}"`);
  }
  // Wix Madefor has no such letters: an element with them has to be set in Onest.
  const fallback = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("script, style, noscript, svg, select")) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
    if (/[\u04A2\u04A3\u04AE\u04AF\u04E8\u04E9]/.test(own) && !/onest/i.test(getComputedStyle(el).fontFamily.split(",")[0])) {
      fallback.push(`${el.tagName.toLowerCase()} "${own.trim().slice(0, 40)}"`);
    }
  }
  return { lang: document.documentElement.lang, broken, foreign, outside, fallback };
}

const progress = async (page) => (await page.locator("#quiz-progress").innerText()).trim();

async function answer(page) {
  const before = await progress(page);
  const submit = () => page.click(".quiz__form button.btn[type=submit]");
  if (await page.locator("#name, #pet-name").count()) {
    await submit();
  } else if (await page.locator("#age").count()) {
    await page.fill("#age", "40");
    await submit();
  } else if (await page.locator("#pet-years").count()) {
    await page.fill("#pet-years", "5");
    await submit();
  } else if (await page.locator("#height").count()) {
    await page.fill("#height", "178");
    await page.fill("#weight", "90");
    await submit();
  } else if (await page.locator(".quiz select").count()) {
    await page.waitForFunction(() => document.querySelector(".quiz select")?.value !== "", null, { timeout: 8000 });
    await submit();
  } else if (await page.locator("input[name=labs]").count()) {
    // With results at hand, or the four questions about blood tests are skipped.
    await page.locator(".option label").first().click();
  } else {
    const labels = page.locator(".option label");
    await labels.nth(Math.min(1, (await labels.count()) - 1)).click();
  }
  await page.waitForFunction(
    (b) => document.querySelector("#quiz-progress")?.textContent?.trim() !== b || /\/(report|result)\/?$/.test(location.pathname),
    before,
    { timeout: 8000 },
  );
}

const browser = await chromium.launch({ channel: "chrome" });
try {
  // 1. Which language a visitor gets.
  for (const [locale, saved, from, to] of [
    ["en-US", null, "/factors/", "/en/factors/"],
    ["de-DE", null, "/", "/en/"],
    ["ky-KG", null, "/method/", "/ky/method/"],
    ["ru-RU", null, "/factors/", "/factors/"],
    ["kk-KZ", null, "/", "/"],
    ["en-US", "ru", "/factors/", "/factors/"],
    ["ru-RU", "ky", "/", "/ky/"],
    ["en-US", null, "/ky/factors/", "/ky/factors/"],
    ["ru-RU", null, "/en/", "/en/"],
  ]) {
    const ctx = await context(browser, locale);
    if (saved) await ctx.addInitScript((code) => localStorage.setItem("uzak-lang", code), saved);
    const page = await ctx.newPage();
    await page.goto(`${BASE}${from}`);
    await page.waitForURL((url) => url.pathname === `${ROOT}${to}`, { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(500);
    const got = new URL(page.url()).pathname;
    check(`browser ${locale}${saved ? `, chose ${saved}` : ""}: ${from} opens ${to}`, got === `${ROOT}${to}`, got);
    await ctx.close();
  }

  // 2. The switch keeps the page and is remembered.
  {
    const ctx = await context(browser, "en-US");
    const page = await ctx.newPage();
    await page.goto(`${BASE}/en/factors/smoking/`, { waitUntil: "networkidle" });
    await page.locator('.langs a[hreflang="ru"]:visible').first().click();
    await page.waitForURL(`${BASE}/factors/smoking/`, { timeout: 8000 }).catch(() => {});
    check("the switch keeps the page", page.url() === `${BASE}/factors/smoking/`, page.url());
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    check("the switch is remembered", new URL(page.url()).pathname === `${ROOT}/`, page.url());
    await ctx.close();
  }

  for (const language of LANGUAGES) {
    const { code, prefix, browser: locale } = language;
    const home = `${BASE}${prefix}`;
    const problems = { lang: [], broken: [], foreign: [], outside: [], fallback: [], errors: [] };
    const look = async (page, where) => {
      const found = await page.evaluate(inspect, { code });
      if (found.lang !== code) problems.lang.push(`${where} says ${found.lang}`);
      for (const kind of ["broken", "foreign", "outside", "fallback"]) {
        for (const item of found[kind]) problems[kind].push(`${where}: ${item}`);
      }
    };

    const ctx = await context(browser, locale);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => problems.errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && problems.errors.push(`${m.text()} ${m.location().url}`));

    // 3. Every page of the sitemap, at three widths.
    const sitemap = await (await ctx.request.get(`${home}/sitemap.xml`)).text();
    const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+\/[^/]+/, "").replace(prefix, "") || "/");
    check(`${code}: the sitemap lists the pages`, routes.length >= 40, String(routes.length));
    check(`${code}: the sitemap names the other languages`, (sitemap.match(/hreflang=/g) ?? []).length === routes.length * 3);
    for (const route of routes) {
      await page.goto(`${home}${route}`, { waitUntil: "networkidle" });
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        await look(page, `${route} @${width}`);
      }
    }

    // 4. The whole test, question by question, then the screen and the report.
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(`${home}/test/`, { waitUntil: "networkidle" });
    let asked = 0;
    while (!/\/(report|result)\/?$/.test(new URL(page.url()).pathname) && asked < 60) {
      await look(page, `question ${asked + 1}`);
      await answer(page);
      asked += 1;
    }
    check(`${code}: the test goes through all 38 questions`, asked === 38, String(asked));
    await page.waitForSelector(".result__card[data-ready=true]", { timeout: 15000 });
    for (const [width, height] of [[360, 640], [375, 812], [1280, 800]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(300);
      const fits = await page.evaluate(() => {
        const card = document.querySelector(".result__card").getBoundingClientRect();
        const main = document.querySelector(".result .btn").getBoundingClientRect();
        return card.top >= 0 && card.bottom <= innerHeight && main.bottom <= innerHeight;
      });
      check(`${code}: the result fits one screen at ${width}x${height}`, fits);
      await look(page, `result @${width}`);
    }
    await page.goto(`${home}/report/`, { waitUntil: "networkidle" });
    await page.waitForSelector("#report-title");
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await look(page, `report @${width}`);
    }
    const shown = (await page.locator(".report-hero__main .figure, .report-hero__main > :first-child").first().innerText()).replace(/\s+/g, " ").trim();
    check(`${code}: the forecast age uses the language's word`, language.years.test(shown), shown);

    // 5. The test for pets.
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(`${home}/pet/test/`, { waitUntil: "networkidle" });
    let petAsked = 0;
    while (!/\/report\/?$/.test(new URL(page.url()).pathname) && petAsked < 30) {
      await look(page, `pet question ${petAsked + 1}`);
      await answer(page);
      petAsked += 1;
    }
    await page.waitForSelector(".report-hero__main");
    check(`${code}: the pet test ends on its report`, petAsked >= 14 && petAsked < 30, String(petAsked));
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await look(page, `pet report @${width}`);
    }

    check(`${code}: every page declares its language`, problems.lang.length === 0, some(problems.lang));
    check(`${code}: no broken markers`, problems.broken.length === 0, some(problems.broken));
    if (code === "en") check("en: no Cyrillic and no decimal commas", problems.foreign.length === 0, some(problems.foreign));
    check(`${code}: nothing sticks out of the screen`, problems.outside.length === 0, some(problems.outside));
    check(`${code}: Kyrgyz letters are set in a face that has them`, problems.fallback.length === 0, some(problems.fallback));
    check(`${code}: no console errors`, problems.errors.length === 0, some(problems.errors));
    await ctx.close();
  }

  // 6. One device, one set of answers in every language.
  {
    const ctx = await context(browser, "ru-RU");
    const page = await ctx.newPage();
    await page.goto(`${BASE}/test/`, { waitUntil: "networkidle" });
    await answer(page);
    await page.locator(".option label").first().click();
    await page.waitForSelector("#age");
    await page.goto(`${BASE}/en/test/`, { waitUntil: "networkidle" });
    await page.waitForSelector("#age", { timeout: 8000 }).catch(() => {});
    check("answers carry over to another language", (await page.locator("#age").count()) === 1);
    await ctx.close();
  }
} catch (error) {
  check("the run finished", false, error.stack);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
