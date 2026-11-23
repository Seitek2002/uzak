#!/usr/bin/env node
/*
 * Almost every function of a Next.js chunk runs while the page starts, but V8
 * compiles each one lazily on the main thread, in one long task. This comment
 * (explicit compile hints) asks Chromium to compile the file on a background
 * thread while it downloads. Other engines read it as a plain comment. It only
 * counts on the first line, so it is added to the built files.
 *
 *   node scripts/compile-hints.mjs [out]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const HINT = "//# allFunctionsCalledOnLoad\n";
const root = path.resolve(process.argv[2] ?? "out");
let hinted = 0;

for (const name of readdirSync(root, { recursive: true }).map(String)) {
  if (!/_next[\\/]static[\\/]chunks[\\/].*\.js$/.test(name)) continue;
  const file = path.join(root, name);
  const code = readFileSync(file, "utf8");
  if (code.startsWith(HINT)) continue;
  writeFileSync(file, HINT + code);
  hinted += 1;
}

if (!hinted) {
  console.error(`compile-hints: no scripts found in ${root}`);
  process.exit(1);
}
console.log(`compile-hints: ${hinted} scripts`);
