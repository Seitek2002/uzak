#!/usr/bin/env node
/*
 * Bonus years in a real browser: quests in the report, ticking days, unlocking
 * the years, badges, the block badge in the test, and deleting it all.
 *
 *   BASE_URL=http://localhost:3200/uzak node scripts/e2e-game.mjs
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

const answers = { "country-before": "KGZ", "country-next": "KGZ", smoking: "light", steps: "lt4", activity: "none", bmi: "30to35" };
const human = { state: { name: "", answers: {}, step: 0, completed: true, editing: false, history: [{ date: "2026-11-01T10:00:00.000Z", profile: { sex: "male", age: 40 }, answers, body: { height: 178, weight: 100 } }] }, version: 2 };
const pad = (n) => String(n).padStart(2, "0");
const day = (back) => {
  const d = new Date();
  d.setDate(d.getDate() - back);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const ticked = (n, from = 1) => Array.from({ length: n }, (_, i) => day(from + i));
const game = (quests) => ({ state: { quests }, version: 1 });

const browser = await chromium.launch({ channel: "chrome" });
async function open(route, { quests, locale = "ru-RU", motion = "no-preference" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, locale, reducedMotion: motion });
  await ctx.route(/api\.country\.is|get\.geojs\.io/, (r) => r.fulfill({ json: { country: "KG" }, headers: { "access-control-allow-origin": "*" } }));
  await ctx.addInitScript(([h, g]) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("uzak-v1", JSON.stringify(h));
      if (g) localStorage.setItem("uzak-game-v1", JSON.stringify(g));
      sessionStorage.setItem("seeded", "1");
    }
  }, [human, quests ? game(quests) : null]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  return { ctx, page, errors };
}
const store = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}").state ?? {}, key);

try {
  // 1. Three quests, a bank at zero, a quest started and a day ticked and taken back.
  {
    const { ctx, page, errors } = await open("/report/");
    await page.waitForSelector(".quest");
    check("the report offers three quests", (await page.locator(".quest").count()) === 3);
    check("the bank starts empty", (await page.locator(".bank .figure").first().innerText()).trim() === "0");
    await page.locator(".quest__go").first().click();
    await page.waitForSelector(".quest__days");
    check("a started quest shows 21 days", (await page.locator(".quest__days li").count()) === 21);
    await page.getByRole("button", { name: "Сегодня получилось" }).click();
    check("ticking today fills a day", (await page.locator(".quest__days li.is-on").count()) === 1);
    check("the streak counts today", (await page.locator(".quest__count").first().innerText()).includes("Серия: 1"));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".quest__days");
    check("the tick survives a reload", (await page.locator(".quest__days li.is-on").count()) === 1);
    await page.getByRole("button", { name: "Отменить" }).click();
    check("a tick can be taken back", (await page.locator(".quest__days li.is-on").count()) === 0);
    const earned = await page.locator(".badge.is-on b").allInnerTexts();
    check("starting a quest earns its badge", earned.includes("Первый шаг"), earned.join(", "));
    check("no console errors in the quests", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // 2. Twenty-one days: the new answer goes into the report and its years into the bank.
  {
    const quests = { smoking: { slug: "smoking", from: "light", to: "quit", started: "2026-11-01T10:00:00.000Z", marks: ticked(21) } };
    const { ctx, page, errors } = await open("/report/", { quests });
    await page.waitForSelector(".quest");
    const before = (await page.locator(".report-hero__main .figure").innerText()).replace(/\s+/g, " ");
    await page.getByRole("button", { name: "Открыть бонусные годы" }).click();
    await page.waitForSelector(".bank__news");
    const news = await page.locator(".bank__news").innerText();
    check("unlocking says how many years went to the bank", /Квест пройден: \+\d/.test(news), news);
    const s = await store(page, "uzak-v1");
    check("the new answer is a new attempt", s.history?.length === 2 && s.history[1].answers.smoking === "quit", JSON.stringify(s.history?.map((h) => h.answers.smoking)));
    const g = await store(page, "uzak-game-v1");
    check("the quest is archived with its years", !g.quests?.smoking && g.done?.[0]?.slug === "smoking" && g.done[0].bonus > 0, JSON.stringify(g));
    const cards = await page.locator(".quest h3").allInnerTexts();
    check("no quest towards the answer already given", !cards.includes("Курение"), cards.join(", "));
    const after = (await page.locator(".report-hero__main .figure").innerText()).replace(/\s+/g, " ");
    check("the forecast moves up", Number.parseInt(after) >= Number.parseInt(before), `${before} -> ${after}`);
    check("the bank is not empty", (await page.locator(".bank .figure").first().innerText()).trim() !== "0");
    check("finished quests are listed", (await page.locator(".quests-done li").count()) === 1);
    const earned = await page.locator(".badge.is-on b").allInnerTexts();
    check("badges for the week and the quest", earned.includes("Неделя подряд") && earned.includes("Квест пройден") && earned.includes("Снова в деле"), earned.join(", "));
    check("no console errors when unlocking", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // 3. A measured number does not change by ticking: the quest ends with a new reading.
  {
    const quests = { bmi: { slug: "bmi", from: "30to35", to: "27to30", started: "2026-11-01T10:00:00.000Z", marks: ticked(21) } };
    const { ctx, page } = await open("/report/", { quests });
    await page.waitForSelector(".quest");
    await page.getByRole("button", { name: "Открыть бонусные годы" }).click();
    await page.waitForSelector(".quests-done");
    const s = await store(page, "uzak-v1");
    check("a measured quest adds no attempt", s.history?.length === 1);
    check("it asks for a new reading", (await page.locator(".quests-done a", { hasText: "Обновить показатель" }).count()) === 1);
    await ctx.close();
  }

  // 4. The test gives a badge when a block of questions is done.
  {
    const fresh = { state: { name: "", answers: {}, step: 0, completed: false, editing: false, history: [] }, version: 2 };
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: "ru-RU" });
    await ctx.route(/api\.country\.is|get\.geojs\.io/, (r) => r.fulfill({ json: { country: "KG" }, headers: { "access-control-allow-origin": "*" } }));
    await ctx.addInitScript((h) => sessionStorage.getItem("seeded") || (localStorage.setItem("uzak-v1", JSON.stringify(h)), sessionStorage.setItem("seeded", "1")), fresh);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/test/`, { waitUntil: "networkidle" });
    const submit = () => page.click(".quiz__form button.btn[type=submit]");
    await submit();
    await page.locator(".option label").first().click();
    await page.waitForSelector("#age");
    await page.fill("#age", "40");
    await submit();
    for (let i = 0; i < 2; i += 1) {
      await page.waitForFunction(() => document.querySelector(".quiz select")?.value);
      await submit();
    }
    check("no block badge inside a block", (await page.locator(".toast").count()) === 0);
    await page.locator(".option label").first().click();
    await page.waitForSelector(".toast", { timeout: 3000 }).catch(() => {});
    const toast = (await page.locator(".toast").count()) ? await page.locator(".toast").innerText() : "";
    check("finishing a block shows its badge", toast.includes("Страна и семья") && toast.includes("1 из"), toast);
    const covered = await page.evaluate(() => {
      const t = document.querySelector(".toast")?.getBoundingClientRect();
      if (!t) return "no toast";
      return [...document.querySelectorAll(".quiz__nav .btn, .quiz__nav .link")].some((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > t.top && r.top < t.bottom && r.right > t.left && r.left < t.right;
      });
    });
    check("the block badge covers no button", covered === false, String(covered));
    await page.waitForTimeout(3000);
    check("the block badge goes by itself", (await page.locator(".toast").count()) === 0);
    await ctx.close();
  }

  // 5. Deleting the answers deletes the quests.
  {
    const quests = { steps: { slug: "steps", from: "lt4", to: "6to8", started: "2026-11-01T10:00:00.000Z", marks: ticked(3) } };
    const { ctx, page } = await open("/report/", { quests });
    await page.getByRole("button", { name: "Удалить мои ответы" }).click();
    await page.getByRole("button", { name: "Удалить все ответы" }).click();
    await page.waitForTimeout(300);
    const g = await store(page, "uzak-game-v1");
    check("deleting answers deletes quests", Object.keys(g.quests ?? {}).length === 0 && (g.done ?? []).length === 0, JSON.stringify(g));
    await ctx.close();
  }

  // 6. Other languages and less motion.
  {
    const { ctx, page, errors } = await open("/en/report/", { locale: "en-US" });
    await page.waitForSelector(".quest");
    check("English quests", (await page.locator(".quest__go").first().innerText()).startsWith("Start a 21-day quest"));
    check("no console errors in English", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
  {
    const quests = { smoking: { slug: "smoking", from: "light", to: "quit", started: "2026-11-01T10:00:00.000Z", marks: ticked(21) } };
    const { ctx, page } = await open("/ky/report/", { quests, locale: "ky-KG", motion: "reduce" });
    await page.waitForSelector(".quest");
    await page.locator(".quest__box .btn").first().click();
    await page.waitForSelector(".bank__news");
    check("Kyrgyz unlock", (await page.locator(".bank__news").innerText()).startsWith("Квест аткарылды"));
    check("no sparks with reduced motion", (await page.locator(".burst--big").evaluateAll((els) => els.filter((e) => e.checkVisibility()).length)) === 0);
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
