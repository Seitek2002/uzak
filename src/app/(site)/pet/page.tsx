import type { Metadata } from "next";
import Link from "next/link";
import { PET_FACTORS, petOptions, type PetFactor, type Species } from "@/entities/pet";
import { BASELINES, petOptionEffect, SEX_HR } from "@/entities/pet/engine";
import { PET_CONTENT, PET_SOURCES } from "@/entities/pet/content";
import { PET_MINUTES, PET_QUESTIONS } from "@/features/pet-quiz/model/steps";
import { decimal, delta, nb, petAge } from "@/shared/lib/format";
import { SourcesToggle } from "@/widgets/sources-list/SourcesToggle";

export const metadata: Metadata = {
  title: "Тест для кошек и собак",
  description:
    "Сколько проживёт кошка или собака: тест по данным ветеринарных исследований. Порода, вес, улица, прививки и здоровье.",
};

const SPECIES_LABEL: Record<Species, string> = { cat: "Кошка", dog: "Собака" };
const GROUP_ROWS = [
  { key: "cat", label: "Кошка" },
  { key: "dog-small", label: "Собака до 10 кг" },
  { key: "dog-medium", label: "Собака от 10 до 25 кг" },
  { key: "dog-large", label: "Собака от 25 до 40 кг" },
  { key: "dog-giant", label: "Собака больше 40 кг" },
] as const;

/** Years each option gives a typical pet of 5 against the typical answer, for every species the question is asked for. */
function OptionsTable({ f }: { f: PetFactor }) {
  return (
    <>
      {f.species.map((s) => (
        <table className="options-table" key={s}>
          <caption>{f.species.length > 1 ? `${SPECIES_LABEL[s]}: ответ и годы` : "Ответ и годы"}</caption>
          <thead>
            <tr>
              <th scope="col">Ответ</th>
              <th scope="col">Годы</th>
            </tr>
          </thead>
          <tbody>
            {petOptions(f, s)
              .filter((o) => !o.unknown)
              .map((o) => (
                <tr key={o.id}>
                  <th scope="row">{o.label}</th>
                  <td>{f.slug === "size" ? petAge(BASELINES[o.group!].le0) : delta(petOptionEffect(s, f.slug, o.id))}</td>
                </tr>
              ))}
          </tbody>
        </table>
      ))}
    </>
  );
}

export default function PetPage() {
  return (
    <>
      <header className="container page-head">
        <h1>Тест долголетия для питомца</h1>
        <p className="lead">
          {nb(
            `Кошка или собака: до ${PET_QUESTIONS} вопросов, около ${PET_MINUTES} минут. Прогноз, возраст по-человечески и что обсудить с ветеринаром.`,
          )}
        </p>
        <div className="actions">
          <Link href="/pet/test" className="btn">
            Пройти тест для питомца
          </Link>
        </div>
      </header>

      <div className="container cols split-page">
        <article className="split-page__main prose">
          <h2 id="lifespan">Сколько живут кошки и собаки</h2>
          <p>
            Средняя продолжительность жизни от рождения по большим ветеринарным когортам. Крупные собаки стареют
            быстрее мелких, поэтому у каждого размера своя кривая риска.
          </p>
          <table className="options-table">
            <caption>Типичный питомец, лет</caption>
            <thead>
              <tr>
                <th scope="col">Питомец</th>
                <th scope="col">Живёт в среднем</th>
              </tr>
            </thead>
            <tbody>
              {GROUP_ROWS.map((g) => (
                <tr key={g.key}>
                  <th scope="row">{g.label}</th>
                  <td>{petAge(BASELINES[g.key].le0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {PET_FACTORS.map((f) => {
            // Texts may lag behind a new question; the section then shows the summary and the table only.
            const c = PET_CONTENT[f.slug] ?? { evidence: [], advice: [], sources: [] };
            return (
              <section key={f.slug} aria-labelledby={f.slug}>
                <h2 id={f.slug}>{f.title}</h2>
                <p>{nb(f.summary)}</p>
                {c.evidence.length > 0 && (
                  <ul>
                    {c.evidence.map((e) => (
                      <li key={e}>{nb(e)}</li>
                    ))}
                  </ul>
                )}
                <OptionsTable f={f} />
                {c.advice.length > 0 && (
                  <p>
                    <b>Что делать.</b> {nb(c.advice.join(" "))}
                  </p>
                )}
              </section>
            );
          })}

          <h2 id="method">Как считаем</h2>
          <p>
            Риск смерти питомца растёт с возрастом по тому же закону Гомперца, что и у людей, только быстрее. Уровень
            кривой подобран так, чтобы типичный питомец доживал до средних цифр когорт. Каждый ответ умножает риск на
            отношение рисков из исследований, а свободная улица добавляет постоянный риск аварий.
          </p>
          <p>
            {nb(
              `Самцы живут чуть меньше: модель берёт риск выше в ${decimal(SEX_HR.dog.male, 2)} раза у собак и в ${decimal(SEX_HR.cat.male, 2)} раза у кошек.`,
            )}{" "}
            Возраст по-человечески для собак считается по эпигенетическим часам, для кошек по таблице
            ветеринарных ассоциаций.
          </p>
          <p>
            Чего модель не знает: породных болезней, генетики и того, как живут питомцы в вашей стране. Таблицы
            жизни есть только для нескольких стран, поэтому основа взята из Великобритании и США. Это оценка, а не диагноз.
          </p>

          <h2 id="sources">Источники</h2>
          <SourcesToggle sources={PET_SOURCES} />
        </article>

        <aside className="split-page__aside" aria-labelledby="pet-toc-title">
          <h2 id="pet-toc-title">На этой странице</h2>
          <ol>
            <li>
              <a href="#lifespan">Сколько живут</a>
            </li>
            <li>
              <a href="#body">Вес и сложение</a>
            </li>
            <li>
              <a href="#outdoors">Улица</a>
            </li>
            <li>
              <a href="#method">Как считаем</a>
            </li>
            <li>
              <a href="#sources">Источники</a>
            </li>
          </ol>
          <Link href="/pet/test" className="btn">
            Пройти тест
          </Link>
        </aside>
      </div>
    </>
  );
}
