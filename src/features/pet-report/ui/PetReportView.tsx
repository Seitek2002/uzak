"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PET_FACTOR_BY_SLUG, petOptions, petTypical, type Species } from "@/entities/pet";
import { assessPet, humanYears, type PetAssessment } from "@/entities/pet/engine";
import { FactorBars } from "@/entities/result/ui/FactorBars";
import { stepsFor } from "@/features/pet-quiz/model/steps";
import { usePetHydrated, usePetQuiz, type PetAttempt } from "@/features/pet-quiz/model/store";
import { ageParts, delta, deltaParts, nb, petAge, petAgeParts, shortDate } from "@/shared/lib/format";
import { Figure } from "@/shared/ui/Figure";
import { petChecksFor } from "../model/checks";

const SPECIES: Record<Species, string> = { dog: "Собака", cat: "Кошка" };

export function PetReportView() {
  const hydrated = usePetHydrated();
  const history = usePetQuiz((s) => s.history);

  if (!hydrated) {
    return (
      <div className="container empty">
        <p className="muted">Открываем отчёт…</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="container empty">
        <h1>Отчёта для питомца пока нет</h1>
        <p className="lead">Он появится после теста о кошке или собаке. Ответы останутся на этом устройстве.</p>
        <div className="actions">
          <Link href="/pet/test" className="btn">
            Пройти тест для питомца
          </Link>
        </div>
      </div>
    );
  }

  return <Report attempt={history[history.length - 1]} history={history} />;
}

const optionLabel = (species: Species, slug: string, id: string | undefined) => {
  const f = PET_FACTOR_BY_SLUG.get(slug);
  if (!f) return undefined;
  const opts = petOptions(f, species);
  return (opts.find((o) => o.id === id) ?? opts.find((o) => o.id === petTypical(f, species)))?.label;
};

function Report({ attempt, history }: { attempt: PetAttempt; history: PetAttempt[] }) {
  const profile = { species: attempt.species, sex: attempt.sex, age: attempt.age };
  const result = useMemo(() => assessPet(profile, attempt.answers, attempt.date), [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const sexWord = attempt.sex === "female" ? "девочка" : "мальчик";
  const gain = result.potential - result.forecast;
  const human = humanYears(attempt.species, attempt.age);
  const peersWord = attempt.species === "cat" ? "У типичной кошки" : "У типичной собаки того же размера";

  return (
    <>
      <section className="sheet report-hero" aria-labelledby="report-title">
        <div className="report-hero__text">
          <h1 id="report-title">{attempt.name ? `Отчёт: ${attempt.name}` : "Отчёт о питомце"}</h1>
          <p className="lead">
            {SPECIES[attempt.species]}, {sexWord}, {petAge(attempt.age)}. Тест пройден {shortDate(attempt.date)}.
          </p>
          <div className="actions no-print">
            <Link href="/pet/test" className="btn" onClick={() => usePetQuiz.getState().restart()}>
              Другой питомец или заново
            </Link>
            <button type="button" className="link" onClick={() => window.print()}>
              Сохранить в PDF
            </button>
          </div>
        </div>
        <div className="report-hero__field field">
          <div className="report-hero__main">
            <Figure parts={petAgeParts(result.forecast)} />
            <p>
              Прогноз: ожидаемый возраст, если ничего не менять. {peersWord} {petAge(result.peers)}
            </p>
          </div>
          <div className="report-hero__row">
            <div>
              <Figure parts={deltaParts(gain)} />
              <p>Потенциал: столько добавят изменения из списка ниже</p>
            </div>
            <div>
              <Figure parts={ageParts(human)} />
              <p>Возраст по-человечески: так выглядит {petAge(attempt.age)} на шкале нашей жизни</p>
            </div>
          </div>
        </div>
      </section>

      <Starts result={result} species={attempt.species} />

      <section className="section" aria-labelledby="pet-map-title">
        <div className="container">
          <div className="head head--split">
            <h2 id="pet-map-title">Карта факторов</h2>
            <p className="lead">
              {nb(
                `Сколько каждый ответ добавляет или отнимает по сравнению с типичным питомцем. Биологический возраст: ${petAge(result.bioAge)}.`,
              )}
            </p>
          </div>
          <FactorBars
            caption="Влияние каждого ответа на прогноз питомца"
            linkBase="/pet#"
            scale={2}
            rows={[...result.factors]
              .sort((a, b) => a.years - b.years)
              .map((f) => ({
                slug: f.slug,
                title: PET_FACTOR_BY_SLUG.get(f.slug)!.title,
                answer: optionLabel(attempt.species, f.slug, f.option),
                years: f.years,
              }))}
          />
        </div>
      </section>

      <Checks attempt={attempt} />

      <AnswerList attempt={attempt} />

      {history.length > 1 && <History history={history} />}

      <section className="section section--s no-print" aria-label="Данные питомца">
        <div className="container">
          <Wipe />
        </div>
      </section>
    </>
  );
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function Starts({ result, species }: { result: PetAssessment; species: Species }) {
  const top = result.factors
    .filter((f) => f.gain >= 0.05 && f.improveTo)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);
  return (
    <section className="section" aria-labelledby="pet-start-title">
      <div className="container">
        <div className="head">
          <h2 id="pet-start-title">С чего начать</h2>
          <p className="lead">Изменения, которые сильнее всего сдвинут прогноз.</p>
        </div>
        {top.length === 0 ? (
          <p className="lead">По всем пунктам вы уже на лучших вариантах. Повторите тест через полгода.</p>
        ) : (
          <ol className="starts">
            {top.map((f) => {
              const factor = PET_FACTOR_BY_SLUG.get(f.slug)!;
              return (
                <li key={f.slug}>
                  <Figure parts={deltaParts(f.gain)} />
                  <h3>
                    <Link href={`/pet#${f.slug}`}>{factor.title}</Link>
                  </h3>
                  <p>
                    Сейчас: {lower(optionLabel(species, f.slug, f.option) ?? "")}. Цель: {lower(optionLabel(species, f.slug, f.improveTo) ?? "")}.
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

function Checks({ attempt }: { attempt: PetAttempt }) {
  const checks = petChecksFor(attempt.species, attempt.age, attempt.answers);
  if (checks.length === 0) return null;
  return (
    <section className="section well" aria-labelledby="pet-checks-title">
      <div className="container">
        <div className="head">
          <h2 id="pet-checks-title">Что обсудить с ветеринаром</h2>
          <p className="lead">По ответам и возрасту питомца. Решение принимает врач.</p>
        </div>
        <ul className="checks">
          {checks.map((c) => (
            <li key={c.id}>
              <b>{c.title}</b>
              <p>{c.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AnswerList({ attempt }: { attempt: PetAttempt }) {
  const rows = stepsFor(attempt.species).map((id, i) => {
    let title = PET_FACTOR_BY_SLUG.get(id)?.title ?? "";
    let value = optionLabel(attempt.species, id, attempt.answers[id]) ?? "Нет ответа";
    if (id === "species") [title, value] = ["Вид", SPECIES[attempt.species]];
    if (id === "name") [title, value] = ["Кличка", attempt.name ?? "Не указана"];
    if (id === "sex") [title, value] = ["Пол", attempt.sex === "female" ? "Девочка" : "Мальчик"];
    if (id === "age") [title, value] = ["Возраст", petAge(attempt.age)];
    return { id, step: i, title, value, href: `/pet/test?q=${i + 1}&edit=1` };
  });
  return (
    <section className="section no-print" aria-labelledby="pet-answers-title">
      <div className="container">
        <div className="head">
          <h2 id="pet-answers-title">Ваши ответы</h2>
        </div>
        <details className="answers">
          <summary>Посмотреть и изменить ответы ({rows.length})</summary>
          <dl>
            {rows.map((r) => (
              <div key={r.id}>
                <dt>{r.title}</dt>
                <dd>
                  <span>{r.value}</span>
                  <Link href={r.href} className="link" onClick={() => usePetQuiz.getState().startEdit(r.step)}>
                    Изменить<span className="visually-hidden">: {r.title}</span>
                  </Link>
                </dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </section>
  );
}

function History({ history }: { history: PetAttempt[] }) {
  const rows = history
    .map((h) => ({ h, r: assessPet({ species: h.species, sex: h.sex, age: h.age }, h.answers, h.date) }))
    .reverse();
  return (
    <section className="section" aria-labelledby="pet-history-title">
      <div className="container">
        <div className="head">
          <h2 id="pet-history-title">Прошлые проверки</h2>
        </div>
        <table className="history">
          <caption className="visually-hidden">Результаты прошлых проверок питомцев</caption>
          <thead>
            <tr>
              <th scope="col">Дата</th>
              <th scope="col">Питомец</th>
              <th scope="col">Прогноз</th>
              <th scope="col">Потенциал</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ h, r }) => (
              <tr key={h.date}>
                <th scope="row">{shortDate(h.date)}</th>
                <td>{h.name ?? SPECIES[h.species]}</td>
                <td>{petAge(r.forecast)}</td>
                <td>{delta(Math.max(r.potential - r.forecast, 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Wipe() {
  const [confirming, setConfirming] = useState(false);
  const wipe = usePetQuiz((s) => s.wipe);
  return (
    <div className="danger">
      <p className="note">
        Это оценка по средним данным ветеринарных исследований, а не диагноз. Ответы хранятся только в этом браузере.
      </p>
      {confirming ? (
        <>
          <button type="button" className="btn btn--compact" onClick={wipe}>
            Удалить ответы о питомцах
          </button>
          <button type="button" className="link" onClick={() => setConfirming(false)}>
            Оставить
          </button>
        </>
      ) : (
        <button type="button" className="link" onClick={() => setConfirming(true)}>
          Удалить ответы о питомцах
        </button>
      )}
    </div>
  );
}
