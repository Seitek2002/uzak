/*
 * Translation at build time. Russian is the language of the source; for every
 * other language the build rewrites a copy of src, so no dictionary and no
 * lookup reach the browser.
 *
 * A message is one of three things:
 *   - a string literal:           "Выберите страну"
 *   - a template:                 "Ещё {0} вопросов"
 *   - the children of an element that holds text, as one sentence, so a
 *     language can move words:    "Откройте <1>методику</1> за {0} год"
 *
 * {n} is a value, <n>…</n> an element around words. A translation keeps every
 * marker and may reorder them.
 */
import { createHash } from "node:crypto";
import ts from "typescript";

/** Data and language names: never messages. */
export const UNTRANSLATED = new Set(["countries.ts", "life-tables.ts", "risk-profiles.ts", "locale.ts"]);

const CYRILLIC = /[Ѐ-ӿ]/;
const ENTITIES = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export const idOf = (message) => createHash("sha1").update(message).digest("hex").slice(0, 10);

const decode = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] !== "#") return ENTITIES[name] ?? whole;
    return String.fromCodePoint(name[1].toLowerCase() === "x" ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1)));
  });

/** Text between tags as JSX reads it: line breaks with their indentation fold into one space. */
function jsxText(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((line, i) => {
    if (/[^ \t]/.test(line)) last = i;
  });
  let out = "";
  lines.forEach((line, i) => {
    let text = line.replace(/\t/g, " ");
    if (i > 0) text = text.replace(/^ +/, "");
    if (i < lines.length - 1) text = text.replace(/ +$/, "");
    if (!text) return;
    out += i === last ? text : `${text} `;
  });
  return decode(out);
}

/** The markers of a message, sorted: a translation must have the same ones. */
export function markers(message) {
  return (message.match(/\{\d+\}|<\/?\d+>/g) ?? []).sort().join(" ");
}

/** Elements around words must still close in the order they open. */
export function nests(message) {
  const open = [];
  for (const [, close, n] of message.matchAll(/<(\/?)(\d+)>/g)) {
    if (!close) open.push(n);
    else if (open.pop() !== n) return false;
  }
  return open.length === 0;
}

const isContainer = (node) => ts.isJsxElement(node) || ts.isJsxFragment(node);
const isTemplateText = (node) => [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].some((t) => CYRILLIC.test(t));

/**
 * Rewrites one file. `translate(message, context)` returns the words to put in.
 * Returning the message itself rewrites nothing but the notation.
 */
export function transform(fileName, code, translate) {
  const kind = fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, kind);

  const say = (message, node) => {
    const [, lead, body, trail] = message.match(/^( *)([\s\S]*?)( *)$/);
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    return `${lead}${translate(body, { file: fileName, line })}${trail}`;
  };

  /** The source between two offsets with the edits of everything inside applied. */
  const splice = (start, end, edits) => {
    let out = "";
    let at = start;
    for (const edit of edits.sort((a, b) => a.start - b.start)) {
      out += code.slice(at, edit.start) + edit.text;
      at = edit.end;
    }
    return out + code.slice(at, end);
  };

  const rewritten = (node) => {
    const edits = [];
    collect(node, edits);
    return splice(node.getStart(source), node.getEnd(), edits);
  };

  function childrenMessage(node) {
    const held = [];
    let message = "";
    const add = (children) => {
      for (const child of children) {
        if (ts.isJsxText(child)) {
          message += jsxText(child.getFullText(source));
        } else if (ts.isJsxExpression(child)) {
          const value = child.expression;
          if (!value) continue;
          if (ts.isStringLiteral(value)) message += value.text;
          else {
            message += `{${held.length}}`;
            held.push({ value: rewritten(child) });
          }
        } else if (isContainer(child) && child.children.length > 0) {
          const n = held.length;
          const open = ts.isJsxElement(child) ? child.openingElement : child.openingFragment;
          const close = ts.isJsxElement(child) ? child.closingElement : child.closingFragment;
          held.push({ open: rewritten(open), close: close.getText(source) });
          message += `<${n}>`;
          add(child.children);
          message += `</${n}>`;
        } else {
          message += `{${held.length}}`;
          held.push({ value: rewritten(child) });
        }
      }
    };
    add(node.children);

    const translated = say(message, node);
    return translated
      .split(/(\{\d+\}|<\/?\d+>)/)
      .map((part) => {
        if (!part) return "";
        const marker = part.match(/^(?:\{(\d+)\}|<(\/?)(\d+)>)$/);
        if (!marker) return `{${JSON.stringify(part)}}`;
        if (marker[1] !== undefined) return held[Number(marker[1])].value;
        return marker[2] ? held[Number(marker[3])].close : held[Number(marker[3])].open;
      })
      .join("");
  }

  function collect(node, edits) {
    if (isContainer(node)) {
      const open = ts.isJsxElement(node) ? node.openingElement : node.openingFragment;
      const close = ts.isJsxElement(node) ? node.closingElement : node.closingFragment;
      const holdsText = node.children.some((child) => ts.isJsxText(child) && CYRILLIC.test(child.getFullText(source)));
      if (holdsText) {
        collect(open, edits);
        edits.push({ start: open.getEnd(), end: close.getStart(source), text: childrenMessage(node) });
        return;
      }
    }
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && CYRILLIC.test(node.text)) {
      if (ts.isPropertyAssignment(node.parent) && node.parent.name === node) {
        throw new Error(`${fileName}: a Russian object key cannot be translated: ${node.text}`);
      }
      const text = JSON.stringify(say(node.text, node));
      edits.push({ start: node.getStart(source), end: node.getEnd(), text: ts.isJsxAttribute(node.parent) ? `{${text}}` : text });
      return;
    }
    if (ts.isTemplateExpression(node) && isTemplateText(node)) {
      const values = node.templateSpans.map((span) => rewritten(span.expression));
      const message = node.head.text + node.templateSpans.map((span, i) => `{${i}}${span.literal.text}`).join("");
      const text = say(message, node)
        .split(/(\{\d+\})/)
        .map((part) => {
          const value = part.match(/^\{(\d+)\}$/);
          return value ? `\${${values[Number(value[1])]}}` : part.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
        })
        .join("");
      edits.push({ start: node.getStart(source), end: node.getEnd(), text: `\`${text}\`` });
      return;
    }
    ts.forEachChild(node, (child) => collect(child, edits));
  }

  const edits = [];
  collect(source, edits);
  return splice(0, code.length, edits);
}
