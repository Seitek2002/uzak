#!/usr/bin/env node
/*
 * The ways of taking the test in a real browser: the choice of style, "Путь
 * героя", "Переписка" and "Копилка лет" from the first question to the
 * result, and the plain form for corrections.
 *
 *   BASE_URL=http://localhost:3200/uzak node scripts/e2e-styles.mjs
 *
 * Needs Playwright and Chrome, like scripts/e2e.mjs.
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
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `: ${detail}`}`);
};

const browser = await chromium.launch({ channel: "chrome" });
async function open({ motion = "no-preference", viewport = { width: 390, height: 844 } } = {}) {
  const ctx = await browser.newContext({ viewport, locale: "ru-RU", reducedMotion: motion });
  await ctx.route(/api\.country\.is|get\.geojs\.io/, (r) => r.fulfill({ json: { country: "KG" }, headers: { "access-control-allow-origin": "*" } }));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${BASE}/test/`, { waitUntil: "networkidle" });
  return { ctx, page, errors };
}
const store = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("uzak-v1") ?? "{}").state ?? {});
const visible = async (page, selector) => (await page.locator(selector).count()) > 0 && (await page.locator(selector).first().isVisible());

/** One move in whatever style is on screen; returns false when the result page is open. */
async function move(page) {
  if (/\/result\/?$/.test(new URL(page.url()).pathname)) return false;
  // A played card or a filling jar holds the next question for a moment.
  await page.waitForFunction(() => !document.querySelector("[data-busy], .c-typing"), null, { timeout: 8000 });
  const button = (name) => page.getByRole("button", { name, exact: true });
  if (await button("Посмотреть результат").count()) {
    await button("Посмотреть результат").click();
    await page.waitForURL(/\/result\/?$/, { timeout: 10000 });
    return false;
  }
  if (await button("В путь").count()) return button("В путь").click();
  const submit = page.locator("form button[type=submit]").first();
  if (await visible(page, "#name")) {
    await page.fill("#name", "Тест");
    return submit.click();
  }
  if (await visible(page, "#age")) {
    await page.fill("#age", "40");
    return submit.click();
  }
  if (await visible(page, "#height")) {
    await page.fill("#height", "176");
    await page.fill("#weight", "80");
    return submit.click();
  }
  if (await visible(page, ".quiz select")) {
    await page.waitForFunction(() => document.querySelector(".quiz select")?.value !== "", null, { timeout: 8000 });
    return submit.click();
  }
  if (await visible(page, ".t-plate")) {
    await page.getByRole("button", { name: "Порции за день: больше" }).click();
    await page.getByRole("button", { name: "Порции за день: больше" }).click();
    await page.getByRole("button", { name: "Порции за день: больше" }).click();
    return submit.click();
  }
  if (await visible(page, ".t-table")) {
    await button("Не пью").click();
    return submit.click();
  }
  if (await visible(page, "#sleep-hours")) {
    await page.fill("#sleep-hours", "7.5");
    return submit.click();
  }
  if (await visible(page, "#steps-day")) {
    await page.fill("#steps-day", "8500");
    return submit.click();
  }
  if (await visible(page, ".t-heart")) return button("Выбрать из вариантов").click();
  for (const pick of [".j-slot label", ".c-chip", ".t-tile"]) {
    if (await visible(page, pick)) {
      // A hand still being played refuses the click; the next move tries again.
      return page.locator(pick).first().click({ timeout: 8000 }).catch(() => {});
    }
  }
  throw new Error(`nothing to answer at ${page.url()}`);
}

async function walk(page, limit = 90) {
  let moves = 0;
  while (moves < limit) {
    const before = await page.evaluate(() => document.querySelector("main")?.innerText.length + location.search);
    const going = await move(page);
    moves += 1;
    if (going === false) return moves;
    await page
      .waitForFunction((b) => document.querySelector("main")?.innerText.length + location.search !== b || /\/result\/?$/.test(location.pathname), before, { timeout: 6000 })
      .catch(() => {});
    await page.waitForTimeout(150);
  }
  return moves;
}

try {
  // 1. The choice: three hidden styles and the plain form.
  {
    const { ctx, page, errors } = await open();
    check("the test opens on the choice of style", (await page.locator(".deck").count()) === 3);
    check("the styles are hidden behind numbers", (await page.locator(".deck__name").allInnerTexts()).join() === "Стиль 1,Стиль 2,Стиль 3");
    check("nothing on the page gives a style away", !/Путь героя|Переписка|Копилка лет/.test(await page.locator("main").innerText()));
    check("the plain form is offered", (await page.getByRole("button", { name: "Обычная анкета без сюрпризов" }).count()) === 1);
    await page.getByRole("button", { name: "Стиль 1" }).click();
    await page.waitForSelector(".journey", { timeout: 8000 });
    check("a picked card opens its style", (await page.locator(".deck").count()) === 0);
    check("the style is remembered for the attempt", (await store(page)).style === "journey");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".journey", { timeout: 8000 });
    check("a reload keeps the style", true);
    await page.getByRole("button", { name: "К обычной анкете" }).click();
    await page.waitForSelector(".quiz__form");
    check("the plain form is one tap away", (await store(page)).style === "classic");
    check("no console errors on the choice", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // 2. "Путь героя" from the first question to the result.
  {
    const { ctx, page, errors } = await open();
    await page.getByRole("button", { name: "Стиль 1" }).click();
    await page.waitForSelector(".journey");
    let sawHp = false;
    let sawCard = false;
    let sawCamp = false;
    let guard = 0;
    while (guard < 120) {
      guard += 1;
      if (!sawHp && (await page.locator(".j-hp b").count())) sawHp = true;
      if (!sawCamp && (await page.locator(".j-relic").count())) sawCamp = true;
      const hand = await visible(page, ".j-slot label");
      const before = await page.evaluate(() => document.querySelector("main")?.innerText.length + location.search);
      const going = await move(page);
      if (going === false) break;
      if (hand && !sawCard) {
        await page.waitForSelector(".j-slot.is-played .j-card__back b", { timeout: 3000 }).catch(() => {});
        sawCard = /^[+−]?[\d,]+$|^0$/.test((await page.locator(".j-slot.is-played .j-card__back b").first().innerText().catch(() => "")).trim());
      }
      await page.waitForFunction((b) => document.querySelector("main")?.innerText.length + location.search !== b || /\/result\/?$/.test(location.pathname), before, { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(100);
    }
    check("the hero has health once the trail starts", sawHp);
    check("a played card turns and shows its years", sawCard);
    check("a camp gives a relic", sawCamp);
    check("the trail ends on the result", /\/result\/?$/.test(new URL(page.url()).pathname));
    const s = await store(page);
    check("the attempt is saved", s.history?.length === 1 && Object.keys(s.history[0].answers).length >= 34, String(s.history?.length));
    check("no console errors on the trail", errors.length === 0, errors.join(" | "));
    await page.goto(`${BASE}/test/`, { waitUntil: "networkidle" });
    check("a new attempt asks for the style again", (await page.locator(".deck").count()) === 3);
    await page.goto(`${BASE}/test/?q=10&edit=1`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    check("a correction opens in the plain form", (await page.getByRole("button", { name: "Пересчитать отчёт" }).count()) === 1);
    await ctx.close();
  }

  // 3. "Переписка".
  {
    const { ctx, page, errors } = await open();
    await page.getByRole("button", { name: "Стиль 2" }).click();
    await page.waitForSelector(".chat");
    const moves = await walk(page);
    check("the chat ends on the result", /\/result\/?$/.test(new URL(page.url()).pathname), `${moves} moves`);
    const s = await store(page);
    check("the chat saves the attempt", s.history?.length === 1 && s.history[0].name === "Тест");
    check("no console errors in the chat", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // 4. "Копилка лет", with less motion.
  {
    const { ctx, page, errors } = await open({ motion: "reduce" });
    await page.getByRole("button", { name: "Стиль 3" }).click();
    await page.waitForSelector(".touch");
    const moves = await walk(page);
    check("the jar ends on the result", /\/result\/?$/.test(new URL(page.url()).pathname), `${moves} moves`);
    const a = (await store(page)).history?.[0]?.answers ?? {};
    check("the plate gives three portions", a["fruits-vegetables"] === "3to4", a["fruits-vegetables"]);
    check("no glasses means no alcohol", a.alcohol === "none", a.alcohol);
    check("seven and a half hours of sleep", a.sleep === "7to8", a.sleep);
    check("8 500 steps", a.steps === "8to10", a.steps);
    check("no console errors in the jar", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
} catch (error) {
  check("the run finished", false, error.stack);
} finally {
  await browser.close();
}
const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
