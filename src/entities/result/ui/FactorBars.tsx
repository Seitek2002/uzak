import Link from "next/link";
import { delta } from "@/shared/lib/format";

export interface BarRow {
  slug: string;
  title: string;
  answer?: string;
  years: number;
}

/** A diverging bar chart of real model output: years each answer adds or takes against the average answer. */
/** `linkBase` is prepended to the slug: factor pages for people, anchors of the pet page for pets. */
export function FactorBars({
  rows,
  caption,
  scale,
  linkBase = "/factors/",
}: {
  rows: BarRow[];
  caption: string;
  scale?: number;
  linkBase?: string;
}) {
  const max = scale ?? Math.max(3, ...rows.map((r) => Math.abs(r.years)));
  const hasAnswers = rows.some((r) => r.answer);
  // When every row points the same way the axis moves to the start edge, so the bars use the full width.
  const oneSided = !rows.some((r) => r.years >= 0.04) || !rows.some((r) => r.years <= -0.04);
  return (
    <table className="bars" role="table">
      <caption className="visually-hidden">{caption}</caption>
      <tbody role="rowgroup">
        {rows.map((r) => {
          const share = Math.min(Math.abs(r.years) / max, 1) * (oneSided ? 100 : 50);
          const sign = r.years >= 0.04 ? "plus" : r.years <= -0.04 ? "minus" : "zero";
          return (
            <tr key={r.slug} role="row">
              <th scope="row" role="rowheader">
                <Link href={`${linkBase}${r.slug}`}>{r.title}</Link>
              </th>
              {hasAnswers && (
                <td className="bars__answer" role="cell">
                  {r.answer}
                </td>
              )}
              <td className="bars__chart" role="cell" aria-hidden="true">
                <div className={oneSided ? "track track--one" : "track"}>
                  {sign !== "zero" && <span className={sign} style={{ width: `${share}%` }} />}
                </div>
              </td>
              <td className={`bars__years${sign === "zero" ? "" : ` bars__years--${sign}`}`} role="cell">{delta(r.years)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
