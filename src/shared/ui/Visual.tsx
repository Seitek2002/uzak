import type { LucideIcon } from "lucide-react";

/*
 * The pictures of the questions, one language for both tests: icons from one
 * set (Lucide, stroke 2, 24 and 32px) and meters that show "how much". They
 * repeat what the words say, so screen readers skip them.
 */

export type Visual =
  | { kind: "icon"; icon: LucideIcon; times?: number }
  /** `level` filled bars out of `of`, rising from left to right. */
  | { kind: "meter"; level: number; of: number };

export interface Hint {
  icon: LucideIcon;
  text: string;
}

export interface QuestionLook {
  icon: LucideIcon;
  options?: Record<string, Visual>;
  /** A measure shown as pictures, in place of reading the help. */
  hints?: Hint[];
}

export const icon = (glyph: LucideIcon, times = 1): Visual => ({ kind: "icon", icon: glyph, times });

/** A rising scale for the options in the order given; `from` is the level of the first one. */
export function rising(ids: string[], from = 1): Record<string, Visual> {
  const of = ids.length + from - 1;
  return Object.fromEntries(ids.map((id, i) => [id, { kind: "meter", level: i + from, of }]));
}

/** The same scale from full to empty. */
export function falling(ids: string[], to = 1): Record<string, Visual> {
  return rising([...ids].reverse(), to);
}

const HEIGHTS = [0.35, 1];

export function OptionVisual({ visual }: { visual: Visual }) {
  if (visual.kind === "icon") {
    const Glyph = visual.icon;
    return (
      <span className="option__visual" aria-hidden="true">
        {Array.from({ length: visual.times ?? 1 }, (_, i) => (
          <Glyph key={i} size={24} strokeWidth={2} />
        ))}
      </span>
    );
  }
  const { level, of } = visual;
  const [low, high] = HEIGHTS;
  return (
    <span className="option__visual meter" aria-hidden="true">
      {Array.from({ length: of }, (_, i) => (
        <i
          key={i}
          className={i < level ? "meter__bar is-on" : "meter__bar"}
          style={{ transform: `scaleY(${low + ((high - low) * (i + 1)) / of})` }}
        />
      ))}
    </span>
  );
}

export function HintRow({ hints }: { hints: Hint[] }) {
  return (
    <ul className="hints">
      {hints.map(({ icon: Glyph, text }) => (
        <li key={text}>
          <Glyph size={24} strokeWidth={2} aria-hidden="true" />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}
