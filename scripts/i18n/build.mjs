#!/usr/bin/env node
/*
 * The static site in three languages, as GitHub Pages serves it:
 *
 *   out/      Russian, the source; the addresses shared before stay valid
 *   out/en/   English
 *   out/ky/   Kyrgyz
 *
 * Each language is its own Next.js build of a translated copy of src in
 * .locales/<lang>, which resolves packages from the project's node_modules.
 *
 *   NEXT_PUBLIC_BASE_PATH=/uzak NEXT_PUBLIC_SITE_URL=https://… node scripts/i18n/build.mjs
 *   add --pseudo to check the mechanism before translations exist
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dictionaryOf, LANGUAGES, messagesOfSource, nameOf, problemsOf, ROOT, sourceFiles } from "./catalog.mjs";
import { idOf, transform } from "./transform.mjs";

const pseudo = process.argv.includes("--pseudo");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const next = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

if (!pseudo) {
  const messages = messagesOfSource();
  const problems = LANGUAGES.flatMap((lang) => problemsOf(lang, messages));
  if (problems.length) {
    console.error(`${problems.slice(0, 20).join("\n")}\n${problems.length} translation problem(s), nothing built`);
    process.exit(1);
  }
}

function build(cwd, lang) {
  const prefix = lang === "ru" ? "" : `/${lang}`;
  execFileSync(process.execPath, [next, "build"], {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      GITHUB_PAGES: "true",
      UZAK_ROOT: ROOT,
      NEXT_PUBLIC_LOCALE: lang,
      NEXT_PUBLIC_ROOT_PATH: basePath,
      NEXT_PUBLIC_BASE_PATH: `${basePath}${prefix}`,
      NEXT_PUBLIC_SITE_URL: `${siteUrl}${prefix}`,
    },
  });
}

rmSync(path.join(ROOT, "out"), { recursive: true, force: true });
build(ROOT, "ru");

for (const lang of LANGUAGES) {
  const words = dictionaryOf(lang);
  const copy = path.join(ROOT, ".locales", lang);
  // The build cache stays, so a second build is quick.
  for (const part of ["src", "public", "out"]) rmSync(path.join(copy, part), { recursive: true, force: true });
  mkdirSync(copy, { recursive: true });
  for (const part of ["src", "public", "next.config.ts", "tsconfig.json", "package.json"]) {
    if (existsSync(path.join(ROOT, part))) cpSync(path.join(ROOT, part), path.join(copy, part), { recursive: true });
  }
  for (const file of sourceFiles(copy)) {
    const name = nameOf(file, copy);
    const out = transform(name, readFileSync(file, "utf8"), (text) => {
      if (pseudo) return `[${text}]`;
      const id = idOf(text);
      return words[`${id}@${name}`] ?? words[id];
    });
    writeFileSync(file, out);
  }
  build(copy, lang);
  cpSync(path.join(copy, "out"), path.join(ROOT, "out", lang), { recursive: true });
}

for (const step of ["flatten-segments.mjs", "compile-hints.mjs"]) {
  execFileSync(process.execPath, [path.join(ROOT, "scripts", step), path.join(ROOT, "out")], { stdio: "inherit" });
}
console.log(`built ru, ${LANGUAGES.join(", ")}${pseudo ? " (pseudo)" : ""}`);
