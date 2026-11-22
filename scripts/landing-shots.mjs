#!/usr/bin/env node
/*
 * Takes the two screens the landing shows from the product itself, so the
 * pictures never drift from what people get:
 *
 *   BASE_URL=http://localhost:3100 node scripts/landing-shots.mjs
 *
 * Run it after a change to the test or to the result screen. Needs Playwright
 * and Chrome, like scripts/e2e.mjs. The person on the pictures is made up.
 */
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const OUT = fileURLToPath(new URL("../public/landing/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const place = { "country-before": "GLOBAL", "country-next": "GLOBAL" };
const person = {
  date: "2026-11-22T10:00:00.000Z",
  profile: { sex: "male", age: 40 },
  answers: { ...place, smoking: "light", alcohol: "mid", activity: "none", steps: "lt4", "fruits-vegetables": "lt1", bmi: "27to30" },
  body: { height: 178, weight: 90 },
};
// Every answer before the pictured question, so the test opens on it as a first pass.
const draft = { ...place, relationship: "married", smoking: "light", alcohol: "mid" };

const browser = await chromium.launch({ channel: "chrome" });
async function shot(name, route, state, ready) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 720 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((s) => localStorage.setItem("uzak-v1", JSON.stringify({ state: s, version: 2 })), state);
  const page = await ctx.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.waitForSelector(ready, { timeout: 15000 });
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 78 });
  await ctx.close();
}

await shot(
  "question",
  "/test/?q=8",
  { name: "", sex: "male", age: 40, answers: draft, step: 7, completed: false, editing: false, history: [] },
  ".option .option__visual",
);
await shot(
  "result",
  "/result/",
  { name: "", answers: {}, step: 0, completed: true, editing: false, history: [person] },
  ".result__card[data-ready=true]",
);
await browser.close();
console.log(`landing screens written to ${OUT}`);
