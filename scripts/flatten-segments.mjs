#!/usr/bin/env node
/*
 * After `next build` with output "export": Next.js 16 writes segment prefetch
 * files into nested folders (report/__next.X/report/__PAGE__.txt), while the
 * client asks for one dotted file (report/__next.X.report.__PAGE__.txt). A
 * static host such as GitHub Pages then answers 404 and navigation falls back
 * to full page loads. This script places a copy under the dotted name.
 *
 *   node scripts/flatten-segments.mjs [out]
 */
import { copyFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "out");
let copied = 0;

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    if (name.startsWith("__next.")) {
      for (const file of filesUnder(full)) {
        const dotted = [name, ...path.relative(full, file).split(path.sep)].join(".");
        copyFileSync(file, path.join(dir, dotted));
        copied += 1;
      }
    } else {
      walk(full);
    }
  }
}

walk(root);
console.log(`flatten-segments: ${copied} prefetch files copied in ${root}`);
