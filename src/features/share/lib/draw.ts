/*
 * The result picture, 1080 by 1920: the size of a story in Instagram, TikTok,
 * WhatsApp and Telegram. The canvas on the screen and the file are one drawing,
 * so what the person sees is what gets posted. Colours and faces come from the
 * tokens of the site.
 */

export const CARD = { width: 1080, height: 1920 } as const;

const PAD = 88;
const INNER = CARD.width - PAD * 2;
/** The stories interface covers the bottom of the picture with a reply field. */
const FOOT = 150;
const BRAND_SIZE = 96;
const ROW_HEIGHT = 152;
const ROW_ICON = 104;

export interface CardRow {
  icon?: HTMLImageElement;
  text: string;
  value: string;
}

export interface CardData {
  brand: [string, string];
  headline: string;
  figure: { num: string; unit: string };
  caption: string;
  ages?: { now: number; best: number; nowText: string; bestText: string; nowLabel: string; bestLabel: string };
  steps?: { title: string; rows: CardRow[] };
  invite: string;
  address: string;
  note: string;
}

export interface CardPaint {
  field: string;
  ink: string;
  mark: string;
  markInk: string;
  display: string;
  body: string;
  brand: string;
}

/** The tokens as the canvas needs them: resolved colours and real family names. */
export function paintFrom(element: Element): CardPaint {
  const css = getComputedStyle(element);
  const token = (name: string) => css.getPropertyValue(name).trim();
  return {
    field: token("--color-field"),
    ink: token("--color-field-ink"),
    mark: token("--color-mark"),
    markInk: token("--color-mark-ink"),
    display: token("--font-display"),
    body: token("--font-body"),
    brand: token("--font-brand"),
  };
}

/** Faces load per script, so the sample carries the letters that will be drawn. */
export async function loadFaces(paint: CardPaint, sample: string) {
  try {
    await Promise.all([
      document.fonts.load(`700 64px ${paint.display}`, sample),
      document.fonts.load(`400 64px ${paint.display}`, sample),
      document.fonts.load(`500 40px ${paint.body}`, sample),
      document.fonts.load(`700 46px ${paint.brand}`, sample),
      document.fonts.load(`400 46px ${paint.brand}`, sample),
    ]);
  } catch {
    /* the fallback face still draws a readable picture */
  }
}

/** An icon from the page as an image the canvas can draw. */
export async function iconImage(svg: SVGSVGElement, colour: string): Promise<HTMLImageElement | undefined> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", "128");
  copy.setAttribute("height", "128");
  copy.setAttribute("stroke", colour);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
  try {
    await image.decode();
    return image;
  } catch {
    return undefined;
  }
}

/** Breaks text into lines; a word wider than the line is left to the caller to shrink. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/ +/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** The largest size at which the text fits the width and the number of lines. */
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  { width, max, min, lines }: { width: number; max: number; min: number; lines: number },
) {
  for (let size = max; ; size -= 2) {
    ctx.font = font(size);
    const rows = wrap(ctx, text, width);
    const fits = rows.length <= lines && rows.every((row) => ctx.measureText(row).width <= width);
    if (fits || size <= min) return { size, rows: rows.slice(0, lines) };
  }
}

interface Block {
  height: number;
  draw: (top: number) => void;
}

export function drawCard(ctx: CanvasRenderingContext2D, data: CardData, paint: CardPaint) {
  const bold = (size: number) => `700 ${size}px ${paint.display}`;
  const light = (size: number) => `400 ${size}px ${paint.display}`;
  const text = (size: number) => `500 ${size}px ${paint.body}`;
  const write = (value: string, x: number, baseline: number, font: string, align: CanvasTextAlign = "left") => {
    ctx.font = font;
    ctx.fillStyle = paint.ink;
    ctx.textAlign = align;
    ctx.fillText(value, x, baseline);
  };

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = paint.field;
  ctx.fillRect(0, 0, CARD.width, CARD.height);

  // Brand
  ctx.fillStyle = paint.mark;
  ctx.fillRect(PAD, PAD, BRAND_SIZE, BRAND_SIZE);
  write(data.brand[0], PAD + BRAND_SIZE + 28, PAD + 42, `700 46px ${paint.brand}`);
  write(data.brand[1], PAD + BRAND_SIZE + 28, PAD + 90, `400 46px ${paint.brand}`);

  const blocks: Block[] = [];

  const head = fit(ctx, data.headline, bold, { width: INNER, max: 84, min: 48, lines: 3 });
  blocks.push({
    height: head.rows.length * head.size * 1.06,
    draw: (top) => head.rows.forEach((row, i) => write(row, PAD, top + head.size * (0.86 + i * 1.06), bold(head.size))),
  });

  const { num, unit } = data.figure;
  let figureSize = 340;
  let numWidth = 0;
  let unitSize = 0;
  for (; figureSize > 120; figureSize -= 10) {
    ctx.font = bold(figureSize);
    numWidth = ctx.measureText(num).width;
    unitSize = Math.round(figureSize * 0.27);
    ctx.font = bold(unitSize);
    if (numWidth + ctx.measureText(unit).width + 28 <= INNER) break;
  }
  const caption = fit(ctx, data.caption, text, { width: INNER, max: 42, min: 34, lines: 2 });
  blocks.push({
    height: figureSize * 0.86 + 28 + caption.rows.length * caption.size * 1.3,
    draw: (top) => {
      const baseline = top + figureSize * 0.78;
      write(num, PAD, baseline, bold(figureSize));
      if (unit) write(unit, PAD + numWidth + (num ? 28 : 0), baseline, bold(unitSize));
      caption.rows.forEach((row, i) => write(row, PAD, baseline + figureSize * 0.08 + 28 + caption.size * (1 + i * 1.3), text(caption.size)));
    },
  });

  const { ages, steps } = data;
  if (ages) {
    blocks.push({
      height: 230,
      draw: (top) => {
        const scale = INNER / Math.max(100, ages.best);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = paint.ink;
        ctx.fillRect(PAD, top, INNER, 72);
        ctx.globalAlpha = 1;
        ctx.fillRect(PAD, top, ages.now * scale, 72);
        ctx.fillStyle = paint.mark;
        ctx.fillRect(PAD + ages.now * scale, top, (ages.best - ages.now) * scale, 72);
        write(ages.nowText, PAD, top + 164, bold(72));
        write(ages.bestText, PAD + INNER, top + 164, bold(72), "right");
        write(ages.nowLabel, PAD, top + 214, text(34));
        write(ages.bestLabel, PAD + INNER, top + 214, text(34), "right");
      },
    });
  }

  if (steps && steps.rows.length > 0) {
    blocks.push({
      height: 72 + steps.rows.length * ROW_HEIGHT,
      draw: (top) => {
        write(steps.title, PAD, top + 40, text(38));
        steps.rows.forEach((row, i) => {
          const y = top + 72 + i * ROW_HEIGHT;
          const box = y + (ROW_HEIGHT - ROW_ICON) / 2;
          ctx.fillStyle = paint.mark;
          ctx.fillRect(PAD, box, ROW_ICON, ROW_ICON);
          if (row.icon) ctx.drawImage(row.icon, PAD + 20, box + 20, ROW_ICON - 40, ROW_ICON - 40);
          ctx.font = bold(48);
          const valueWidth = ctx.measureText(row.value).width;
          write(row.value, PAD + INNER, y + ROW_HEIGHT / 2 + 17, bold(48), "right");
          const left = PAD + ROW_ICON + 32;
          const label = fit(ctx, row.text, bold, { width: PAD + INNER - valueWidth - 32 - left, max: 48, min: 30, lines: 2 });
          const first = y + ROW_HEIGHT / 2 + label.size * 0.35 - ((label.rows.length - 1) * label.size * 1.08) / 2;
          label.rows.forEach((line, j) => write(line, left, first + j * label.size * 1.08, bold(label.size)));
        });
      },
    });
  }

  // Invitation at the foot
  const footTop = CARD.height - FOOT - 120;
  write(data.invite, PAD, footTop + 34, text(34));
  write(data.address, PAD, footTop + 90, bold(40));
  write(data.note, PAD, footTop + 138, text(28));

  // The blocks share the space between the brand and the invitation.
  const from = PAD + BRAND_SIZE;
  const spare = footTop - from - blocks.reduce((sum, block) => sum + block.height, 0);
  const gap = Math.max(spare / (blocks.length + 1), 24);
  let top = from + gap;
  for (const block of blocks) {
    block.draw(top);
    top += block.height + gap;
  }
}
