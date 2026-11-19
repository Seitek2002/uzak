import type { Metadata } from "next";
import Link from "next/link";
import { FACTORS, GROUPS, factorsInGroup } from "@/entities/factor";
import { factorRange } from "@/entities/result";
import { counted, delta, nb } from "@/shared/lib/format";

export const metadata: Metadata = {
  title: "Факторы долголетия",
  description: `Тест учитывает ${counted(FACTORS.length, ["фактор", "фактора", "факторов"])}: страна и семья, привычки, движение, питание, тело, дорога, настроение, наследственность, диагнозы и анализы.`,
};

export default function FactorsPage() {
  return (
    <>
      <header className="container page-head">
        <h1>Тест учитывает {counted(FACTORS.length, ["фактор", "фактора", "факторов"])}</h1>
        <p className="lead">
          У каждого фактора свой вопрос, свои источники и своя цена в годах. Цифры справа: лучший и худший ответ для
          среднего человека 40 лет.
        </p>
      </header>
      <div className="container">
        <ul className="library">
          {GROUPS.map((g) => (
            <li key={g.id} className="library__group cols">
              <h2>{g.title}</h2>
              <ul>
                {factorsInGroup(g.id).map((f) => {
                  const r = factorRange(f);
                  return (
                    <li key={f.slug} className="library__item">
                      <Link href={`/factors/${f.slug}`}>{f.title}</Link>
                      <p>{nb(f.summary)}</p>
                      <p className="range-note">
                        <span>
                          <b>{delta(r.max)}</b> лучший ответ
                        </span>
                        <span>
                          <b>{delta(r.min)}</b> худший ответ
                        </span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
