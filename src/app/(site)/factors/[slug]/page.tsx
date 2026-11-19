import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FACTOR_BY_SLUG, FACTORS, factorsInGroup, groupById } from "@/entities/factor";
import { contentOf } from "@/entities/factor/content";
import { optionEffect } from "@/entities/result";
import { delta, nb } from "@/shared/lib/format";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return FACTORS.map((f) => ({ slug: f.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const f = FACTOR_BY_SLUG.get(slug);
  if (!f) return {};
  return { title: f.title, description: f.summary };
}

export default async function FactorPage({ params }: { params: Params }) {
  const { slug } = await params;
  const f = FACTOR_BY_SLUG.get(slug);
  if (!f) notFound();
  const c = contentOf(f.slug);
  const group = groupById(f.group);
  const siblings = factorsInGroup(f.group);

  return (
    <>
      <header className="container page-head">
        <nav aria-label="Навигация по разделу">
          <ol className="crumbs">
            <li>
              <Link href="/factors">Все факторы</Link>
            </li>
            <li>{group.title}</li>
          </ol>
        </nav>
        <h1>{f.title}</h1>
        <p className="lead">{nb(f.summary)}</p>
      </header>

      <div className="container cols split-page">
        <article className="split-page__main prose">
          <h2>Что мы спрашиваем</h2>
          <p>
            <b>{nb(f.question)}</b> {nb(c.about)}
          </p>

          <h2>Что показали исследования</h2>
          <ul>
            {c.evidence.map((e) => (
              <li key={e}>{nb(e)}</li>
            ))}
          </ul>

          <h2>Как это считает модель</h2>
          <p>
            {f.kind === "country"
              ? "Годы для среднего человека 40 лет по сравнению с жизнью в Кыргызстане, по таблицам смертности ВОЗ."
              : "Годы для среднего человека 40 лет в Кыргызстане. Ноль: средний ответ его сверстников."}
          </p>
          <table className="options-table">
            <caption>Ответ и его влияние на прогноз</caption>
            <thead>
              <tr>
                <th scope="col">Ответ</th>
                <th scope="col">Годы</th>
              </tr>
            </thead>
            <tbody>
              {f.options
                .filter((o) => !o.unknown)
                .map((o) => ({ o, years: optionEffect(f.slug, o.id) }))
                // Countries read best from the longest life down; other factors keep the order of the question.
                .sort((a, b) => (f.kind === "country" ? b.years - a.years : 0))
                .map(({ o, years }) => (
                  <tr key={o.id}>
                    <th scope="row">{f.kind === "bmi" ? `Индекс ${o.label.toLowerCase()}` : o.label}</th>
                    <td>{delta(years)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!f.modifiable && (
            <p>Этот фактор не меняется, поэтому модель не включает его в ваш потенциал.</p>
          )}

          <h2>Что можно сделать</h2>
          <ul>
            {c.advice.map((a) => (
              <li key={a}>{nb(a)}</li>
            ))}
          </ul>

          <h2>Источники</h2>
          <ul className="sources">
            {c.sources.map((s) => (
              <li key={s.title}>
                {s.authors}{" "}
                <a href={s.href} target="_blank" rel="noopener noreferrer">
                  {s.title}
                  <span className="visually-hidden"> (откроется в новой вкладке)</span>
                </a>
                . {s.where}.
              </li>
            ))}
          </ul>
        </article>

        <aside className="split-page__aside" aria-labelledby="group-title">
          <h2 id="group-title">{group.title}</h2>
          <ul>
            {siblings.map((s) => (
              <li key={s.slug}>
                <Link href={`/factors/${s.slug}`} aria-current={s.slug === f.slug ? "page" : undefined}>
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/test" className="btn">
            Пройти тест
          </Link>
        </aside>
      </div>
    </>
  );
}
