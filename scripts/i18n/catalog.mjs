#!/usr/bin/env node
/*
 * The catalogue of messages.
 *
 *   node scripts/i18n/catalog.mjs extract   writes i18n/messages.json from src
 *   node scripts/i18n/catalog.mjs check     fails when a language lacks a message or broke a marker
 *
 * i18n/<lang>.json maps a message id to its translation. The id is a hash of
 * the Russian text, so editing the Russian asks for a new translation. Where
 * one Russian text needs two translations, "<id>@<file>" overrides it for a file.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { idOf, markers, nests, transform, UNTRANSLATED } from "./transform.mjs";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const LANGUAGES = ["en", "ky"];
const DIR = path.join(ROOT, "i18n");

export function sourceFiles(root = ROOT) {
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return walk(full);
      return /\.tsx?$/.test(name) && !UNTRANSLATED.has(name) ? [full] : [];
    });
  return walk(path.join(root, "src")).sort();
}

export const nameOf = (file, root = ROOT) => path.relative(root, file).split(path.sep).join("/");

export function messagesOfSource() {
  const found = new Map();
  for (const file of sourceFiles()) {
    transform(nameOf(file), readFileSync(file, "utf8"), (text, where) => {
      const id = idOf(text);
      const entry = found.get(id) ?? { id, ru: text, at: [] };
      const at = where.file;
      if (!entry.at.includes(at)) entry.at.push(at);
      found.set(id, entry);
      return text;
    });
  }
  return [...found.values()];
}

export function dictionaryOf(lang) {
  const file = path.join(DIR, `${lang}.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}

export function problemsOf(lang, messages = messagesOfSource()) {
  const words = dictionaryOf(lang);
  const problems = [];
  for (const { id, ru, at } of messages) {
    for (const key of [id, ...at.map((file) => `${id}@${file}`)]) {
      const text = words[key];
      if (text === undefined || text === "") {
        if (key === id) problems.push(`${lang} ${id} is missing: ${ru.slice(0, 70)}`);
        continue;
      }
      if (markers(text) !== markers(ru) || !nests(text)) problems.push(`${lang} ${key} broke the markers: ${ru.slice(0, 70)}`);
      else if (lang === "en" && /[Ѐ-ӿ]/.test(text)) problems.push(`${lang} ${key} still has Cyrillic: ${text.slice(0, 70)}`);
    }
  }
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const messages = messagesOfSource();
  if (process.argv[2] === "extract") {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(path.join(DIR, "messages.json"), `${JSON.stringify(messages, null, 1)}\n`);
    console.log(`${messages.length} messages, ${messages.reduce((n, m) => n + m.ru.split(" ").length, 0)} words`);
  } else if (process.argv[2] === "check") {
    const problems = LANGUAGES.flatMap((lang) => problemsOf(lang, messages));
    console.log(problems.length ? `${problems.slice(0, 40).join("\n")}\n${problems.length} problem(s)` : `${messages.length} messages translated`);
    process.exit(problems.length ? 1 : 0);
  } else {
    console.log("use: catalog.mjs extract | check");
    process.exit(1);
  }
}
