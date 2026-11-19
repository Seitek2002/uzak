#!/usr/bin/env node
/*
 * End-to-end checks of the test and the report in a real browser.
 *
 *   npm run start            (or npm run dev) in another terminal
 *   npm run test:e2e         (BASE_URL defaults to http://localhost:3100)
 *
 * Needs Playwright: `npm i -D playwright` in this project, or point
 * PLAYWRIGHT_DIR at a node_modules folder that has it. Uses the installed
 * Chrome (channel "chrome"), so no browser download is required.
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

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `: ${detail}`}`);
};

const heading = async (page) => (await page.locator(".quiz h1").innerText()).replace(/ /g, " ");
const progress = async (page) => (await page.locator("#quiz-progress").innerText()).trim();
const store = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("uzak-v1") ?? "{}").state ?? {});

/** Answers the visible question: numbers get typed, lists keep their default, choices take option `pick`. */
async function answer(page, pick = 0) {
  const before = await progress(page);
  if (await page.locator("#age").count()) {
    await page.fill("#age", "40");
    await page.click("button[type=submit]");
  } else if (await page.locator("#height").count()) {
    await page.fill("#height", "178");
    await page.locator("#weight").pressSequentially("82,5");
    await page.click("button[type=submit]");
  } else if (await page.locator(".quiz select").count()) {
    await page.click("button[type=submit]");
  } else {
    const labels = page.locator(".option label");
    const n = await labels.count();
    await labels.nth(Math.min(pick, n - 1)).click();
  }
  await page.waitForFunction((b) => document.querySelector("#quiz-progress")?.textContent?.trim() !== b || /\/report\/?$/.test(location.pathname), before, { timeout: 4000 });
}

async function freshPage(browser, viewport) {
  const ctx = await browser.newContext({ viewport, locale: "ru-RU" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return { ctx, page, errors };
}

const browser = await chromium.launch({ channel: "chrome" });
try {
  // 1. A full pass on a phone, with the blood tests.
  {
    const { ctx, page, errors } = await freshPage(browser, { width: 375, height: 812 });
    await page.goto(`${BASE}/test`, { waitUntil: "networkidle" });
    check("test opens on question 1", (await progress(page)).startsWith("Вопрос 1 из"));
    let guard = 0;
    while (!page.url().includes("/report") && guard < 60) {
      if ((await heading(page)).startsWith("Есть ли у вас свежие анализы")) await answer(page, 0);
      else await answer(page, 1);
      guard += 1;
    }
    await page.waitForURL(/\/report\/?$/);
    await page.waitForSelector("#report-title");
    check("full pass ends on the report", (await page.locator("#report-title").innerText()) === "Ваш отчёт");
    const s = await store(page);
    check("one attempt saved", s.history?.length === 1, `history ${s.history?.length}`);
    check("blood tests answered", s.history?.[0]?.answers?.ldl && s.history[0].answers.ldl !== "unknown");
    check("no console errors on the full pass", errors.length === 0, errors.join(" | "));

    // 2. Changing one answer from the report recounts the same attempt.
    await page.click(".answers summary");
    const before = s.history[0].answers.smoking;
    await page.getByRole("link", { name: /Изменить\s*:\s*Курение/ }).click();
    await page.waitForSelector(".quiz h1");
    check("edit link opens the smoking question", (await heading(page)).startsWith("Курите ли вы"));
    check("edit mode shows the recount button", (await page.getByRole("button", { name: "Пересчитать отчёт" }).count()) === 1);
    await page.locator(".option label").nth(0).click();
    await page.waitForTimeout(500);
    check("a pick in edit mode does not jump ahead", (await heading(page)).startsWith("Курите ли вы"));
    await page.getByRole("button", { name: "Пересчитать отчёт" }).click();
    await page.waitForURL(/\/report\/?$/);
    const after = await store(page);
    check("edit keeps one attempt", after.history?.length === 1, `history ${after.history?.length}`);
    check("edit changes the answer", after.history?.[0]?.answers?.smoking === "never" && before !== "never", `${before} -> ${after.history?.[0]?.answers?.smoking}`);

    // 3. The browser back button from the report returns to the last question in edit mode.
    await page.goBack();
    await page.waitForSelector(".quiz h1");
    check("back from the report reopens a question", (await page.locator(".quiz h1").count()) === 1);
    check("back from the report is an edit", (await page.getByRole("button", { name: "Пересчитать отчёт" }).count()) === 1);
    await ctx.close();
  }

  // 4. Back and forward buttons move between questions; a reload keeps the place.
  {
    const { ctx, page } = await freshPage(browser, { width: 375, height: 812 });
    await page.goto(`${BASE}/test`, { waitUntil: "networkidle" });
    await answer(page, 0);
    await answer(page);
    await answer(page);
    const third = await heading(page);
    check("three answers lead to question 4", (await progress(page)).startsWith("Вопрос 4 из"));
    await page.goBack();
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 3 из"));
    check("browser back returns to question 3", page.url().includes("/test") && (await progress(page)).startsWith("Вопрос 3 из"));
    await page.goForward();
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 4 из"));
    check("browser forward returns to question 4", (await heading(page)) === third);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 4 из"));
    check("reload keeps question 4", (await progress(page)).startsWith("Вопрос 4 из"));
    await page.getByRole("button", { name: /Назад к вопросу/ }).click();
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 3 из"));
    check("on-page back goes to question 3", true);
    await page.goto(`${BASE}/test?q=20`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    // Question 4 is the second country, answered by its preset value; question 5 is the first one without an answer.
    check("a link cannot skip unanswered questions", (await progress(page)).startsWith("Вопрос 5 из"), await progress(page));
    await ctx.close();
  }

  // 5. Age validation and keyboard answers.
  {
    const { ctx, page } = await freshPage(browser, { width: 1280, height: 800 });
    await page.goto(`${BASE}/test`, { waitUntil: "networkidle" });
    await page.focus("#sex-female");
    await page.keyboard.press("Space");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 2 из"));
    check("Space picks and Enter confirms a choice", true);
    await page.click("button[type=submit]");
    check("empty age shows an error", (await page.locator("#age-error").innerText()).includes("от 18 до 99"));
    check("empty age marks the field", (await page.getAttribute("#age", "aria-invalid")) === "true");
    await page.fill("#age", "17");
    await page.click("button[type=submit]");
    check("age 17 is refused", (await progress(page)).startsWith("Вопрос 2 из"));
    await page.fill("#age", "45");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 3 из"));
    check("valid age moves on with Enter", true);
    check("country list starts at Kyrgyzstan", (await page.locator(".quiz select").inputValue()) === "KGZ");
    await page.selectOption(".quiz select", "KAZ");
    await page.click("button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 4 из"));
    check("next country defaults to the previous one", (await page.locator(".quiz select").inputValue()) === "KAZ");
    await ctx.close();
  }

  // 6. Skipping the blood tests finishes the test at the fork.
  {
    const { ctx, page } = await freshPage(browser, { width: 375, height: 812 });
    await page.goto(`${BASE}/test`, { waitUntil: "networkidle" });
    let guard = 0;
    while (!(await heading(page)).startsWith("Есть ли у вас свежие анализы") && guard < 60) {
      await answer(page, 0);
      guard += 1;
    }
    await page.locator(".option label").nth(1).click();
    await page.waitForURL(/\/report\/?$/);
    const s = await store(page);
    check("skipping the tests saves them as unknown", s.history?.[0]?.answers?.crp === "unknown");
    await page.waitForSelector("#checks-title");
    check("the report lists the lipid test", (await page.getByText("Сдайте липидный профиль").count()) === 1);
    await ctx.close();
  }

  // 7. The report without data.
  {
    const { ctx, page } = await freshPage(browser, { width: 375, height: 812 });
    await page.goto(`${BASE}/report`, { waitUntil: "networkidle" });
    await page.waitForSelector("h1");
    check("empty report invites to the test", (await page.locator("h1").innerText()) === "Отчёта пока нет");
    await ctx.close();
  }

  // 8. The fork: the header button leads to the choice, "Питомца" opens the pet test.
  {
    const { ctx, page, errors } = await freshPage(browser, { width: 375, height: 812 });
    await page.goto(`${BASE}/start`, { waitUntil: "networkidle" });
    check("the fork asks who the test is for", (await page.locator("h1").innerText()).startsWith("Для кого тест"));
    await page.getByRole("link", { name: "Питомца" }).click();
    await page.waitForURL(/\/pet\/test/);
    await page.waitForSelector(".quiz h1");
    check("pet test starts with the species", (await heading(page)).startsWith("Кто ваш питомец"));
    await page.locator(".option label", { hasText: "Кошка" }).click();
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 2 из"));
    await page.fill("#pet-name", "Мурка");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 3 из"));
    await page.locator(".option label", { hasText: "Девочка" }).click();
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 4 из"));
    await page.click("button[type=submit]");
    check("pet age is required", (await page.locator("#pet-age-error").innerText()).length > 0);
    await page.fill("#pet-years", "3");
    await page.click("button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 5 из"));
    const total = Number((await progress(page)).match(/из (\d+)/)[1]);
    check("a cat gets no question about dog size", total === 15, String(total));
    await page.goBack();
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 4 из"));
    check("back button returns to the pet age", (await page.inputValue("#pet-years")) === "3");
    await page.goForward();
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 5 из"));
    let guard = 0;
    while (!page.url().includes("/pet/report") && guard < 30) {
      const before = await progress(page);
      await page.locator(".option label").nth(1).click();
      await page.waitForFunction((b) => document.querySelector("#quiz-progress")?.textContent?.trim() !== b || /\/pet\/report\/?$/.test(location.pathname), before, { timeout: 4000 });
      guard += 1;
    }
    await page.waitForSelector("#report-title");
    check("pet report carries the name", (await page.locator("#report-title").innerText()) === "Отчёт: Мурка");
    check("pet report shows human years", (await page.getByText("Возраст по-человечески").count()) === 1);
    await page.click(".answers summary");
    await page.getByRole("link", { name: /Изменить\s*:\s*Улица/ }).click();
    await page.waitForSelector(".quiz h1");
    check("pet edit opens the outdoors question", (await heading(page)).startsWith("Выходит ли кошка"));
    await page.locator(".option label").nth(0).click();
    await page.getByRole("button", { name: "Пересчитать отчёт" }).click();
    await page.waitForURL(/\/pet\/report\/?$/);
    const s = await page.evaluate(() => JSON.parse(localStorage.getItem("uzak-pet-v1") ?? "{}").state ?? {});
    check("pet edit keeps one attempt", s.history?.length === 1 && s.history[0].answers.outdoors === "safe", JSON.stringify(s.history?.[0]?.answers ?? {}));
    check("no console errors in the pet flow", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // 9. A dog gets the size question.
  {
    const { ctx, page } = await freshPage(browser, { width: 1280, height: 800 });
    await page.goto(`${BASE}/pet/test`, { waitUntil: "networkidle" });
    await page.locator(".option label", { hasText: "Собака" }).click();
    await page.waitForFunction(() => document.querySelector("#quiz-progress")?.textContent?.includes("Вопрос 2 из"));
    const total = Number((await progress(page)).match(/из (\d+)/)[1]);
    check("a dog gets 16 questions", total === 16, String(total));
    await ctx.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
