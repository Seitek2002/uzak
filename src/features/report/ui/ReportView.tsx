"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FACTOR_BY_SLUG } from "@/entities/factor";
import { contentOf } from "@/entities/factor/content";
import { STEPS, TOTAL } from "@/features/quiz/model/steps";
import { SITE } from "@/shared/config/site";
import { assess, bmiOf, type Assessment } from "@/entities/result";
import { FactorBars } from "@/entities/result/ui/FactorBars";
import { useHydrated, useQuiz, type Attempt } from "@/features/quiz/model/store";
import { age, ageParts, decimal, delta, deltaParts, shortDate } from "@/shared/lib/format";
import { Figure } from "@/shared/ui/Figure";
import { checksFor } from "../model/checks";

export function ReportView() {
  const hydrated = useHydrated();
  const history = useQuiz((s) => s.history);

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
        <h1>Отчёта пока нет</h1>
        <p className="lead">
          Он появится после теста: {TOTAL} вопросов, около {SITE.minutes} минут. Ответы останутся на этом устройстве.
        </p>
        <div className="actions">
          <Link href="/test" className="btn">
            Пройти тест
          </Link>
        </div>
      </div>
    );
  }

  return <Report attempt={history[history.length - 1]} history={history} />;
}

function Report({ attempt, history }: { attempt: Attempt; history: Attempt[] }) {
  const result = useMemo(() => assess(attempt.profile, attempt.answers, attempt.date), [attempt]);
  const bmi = attempt.body ? bmiOf(attempt.body.height, attempt.body.weight) : undefined;
  const sexLabel = attempt.profile.sex === "female" ? "Женщина" : "Мужчина";
  const gain = result.potential - result.forecast;
  const { "country-before": past, "country-next": future } = attempt.answers;
  const peersLabel = future && future !== past ? "У сверстников в тех же странах в среднем" : "У сверстников в вашей стране в среднем";

  return (
    <>
      <section className="sheet report-hero" aria-labelledby="report-title">
        <div className="report-hero__text">
          <h1 id="report-title">{attempt.name ? `${attempt.name}, ваш отчёт` : "Ваш отчёт"}</h1>
          <p className="lead">
            {sexLabel}, {age(attempt.profile.age)}. Тест пройден {shortDate(attempt.date)}.
          </p>
          <div className="actions no-print">
            <Link href="/test" className="btn" onClick={() => useQuiz.getState().restart()}>
              Пройти заново
            </Link>
            <button type="button" className="link" onClick={() => window.print()}>
              Сохранить в PDF
            </button>
          </div>
        </div>
        <div className="report-hero__field field">
          <div className="report-hero__main">
            <Figure parts={ageParts(result.forecast)} />
            <p>
              Прогноз: ожидаемый возраст, если ничего не менять. {peersLabel} {age(result.peers)}
            </p>
          </div>
          <div className="report-hero__row">
            <div>
              <Figure parts={deltaParts(gain)} />
              <p>Потенциал: столько добавят изменения из списка ниже</p>
            </div>
            <div>
              <Figure parts={ageParts(result.bioAge)} />
              <p>Биологический возраст, паспортный {age(attempt.profile.age)}</p>
            </div>
          </div>
        </div>
      </section>

      <Starts result={result} />

      <section className="section" aria-labelledby="map-title">
        <div className="container">
          <div className="head head--split">
            <h2 id="map-title">Карта ваших факторов</h2>
            <p className="lead">Сколько лет каждый ответ добавляет или отнимает по сравнению со средним сверстником.</p>
          </div>
          <FactorBars
            caption="Влияние каждого ответа на прогноз"
            rows={[...result.factors]
              .sort((a, b) => a.years - b.years)
              .map((f) => {
                const factor = FACTOR_BY_SLUG.get(f.slug)!;
                const option = factor.options.find((o) => o.id === f.option);
                const answer = f.slug === "bmi" && bmi ? `Индекс ${decimal(bmi)}` : option?.label;
                return { slug: f.slug, title: factor.title, answer, years: f.years };
              })}
          />
        </div>
      </section>

      <Checks result={result} bmi={bmi} attempt={attempt} />

      <AnswerList attempt={attempt} />

      {history.length > 1 && <History history={history} />}

      <section className="section section--s no-print" aria-label="Ваши данные">
        <div className="container">
          <Wipe />
        </div>
      </section>
    </>
  );
}

function Starts({ result }: { result: Assessment }) {
  const top = result.factors
    .filter((f) => f.gain >= 0.1 && f.improveTo)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);

  return (
    <section className="section" aria-labelledby="start-title">
      <div className="container">
        <div className="head">
          <h2 id="start-title">С чего начать</h2>
          <p className="lead">Три изменения, которые сильнее всего сдвинут прогноз.</p>
        </div>
        {top.length === 0 ? (
          <p className="lead">По всем привычкам вы уже на лучших вариантах. Проходите тест раз в полгода, чтобы так и оставалось.</p>
        ) : (
          <ol className="starts">
            {top.map((f) => {
              const factor = FACTOR_BY_SLUG.get(f.slug)!;
              const from = factor.options.find((o) => o.id === f.option)!;
              const to = factor.options.find((o) => o.id === f.improveTo)!;
              return (
                <li key={f.slug}>
                  <Figure parts={deltaParts(f.gain)} />
                  <h3>
                    <Link href={`/factors/${f.slug}`}>{factor.title}</Link>
                  </h3>
                  <p>
                    Сейчас: {lower(from.label)}. Цель: {lower(to.label)}.
                  </p>
                  <p>{contentOf(f.slug).advice[0]}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function Checks({ result, bmi, attempt }: { result: Assessment; bmi?: number; attempt: Attempt }) {
  const checks = checksFor(result.profile, attempt.answers, bmi);
  if (checks.length === 0) return null;
  return (
    <section className="section well" aria-labelledby="checks-title">
      <div className="container">
        <div className="head">
          <h2 id="checks-title">Что обсудить с врачом</h2>
          <p className="lead">Проверки по вашим ответам и возрасту. Решение о них принимает врач.</p>
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

/** Every answer with a link back into the test to change it; the report is recounted on save. */
function AnswerList({ attempt }: { attempt: Attempt }) {
  const rows = STEPS.flatMap((id, i) => {
    if (id === "labs") return [];
    const factor = FACTOR_BY_SLUG.get(id);
    let title = factor?.title ?? "";
    let value = "Нет ответа";
    if (id === "name") {
      title = "Имя";
      value = attempt.name ?? "Не указано";
    } else if (id === "sex") {
      title = "Пол";
      value = attempt.profile.sex === "female" ? "Женский" : "Мужской";
    } else if (id === "age") {
      title = "Возраст";
      value = age(attempt.profile.age);
    } else if (factor?.kind === "bmi" && attempt.body) {
      title = "Рост и вес";
      value = `${decimal(attempt.body.height, 0)} см, ${decimal(attempt.body.weight)} кг`;
    } else if (factor) {
      const id2 = attempt.answers[id] ?? (factor.kind === "country" ? "GLOBAL" : undefined);
      value = factor.options.find((o) => o.id === id2)?.label ?? value;
    }
    return [{ id, step: i, title, value, href: `/test?q=${i + 1}&edit=1` }];
  });
  return (
    <section className="section no-print" aria-labelledby="answers-title">
      <div className="container">
        <div className="head">
          <h2 id="answers-title">Ваши ответы</h2>
        </div>
        <details className="answers">
          <summary>Посмотреть и изменить ответы ({rows.length})</summary>
          <dl>
            {rows.map((r) => (
              <div key={r.id}>
                <dt>{r.title}</dt>
                <dd>
                  <span>{r.value}</span>
                  <Link href={r.href} className="link" onClick={() => useQuiz.getState().startEdit(r.step)}>
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

function History({ history }: { history: Attempt[] }) {
  const rows = history.map((h) => ({ date: h.date, r: assess(h.profile, h.answers, h.date) })).reverse();
  return (
    <section className="section" aria-labelledby="history-title">
      <div className="container">
        <div className="head">
          <h2 id="history-title">Как менялся прогноз</h2>
        </div>
        <table className="history">
          <caption className="visually-hidden">Результаты прошлых попыток</caption>
          <thead>
            <tr>
              <th scope="col">Дата</th>
              <th scope="col">Прогноз</th>
              <th scope="col">Потенциал</th>
              <th scope="col">Биологический возраст</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ date, r }) => (
              <tr key={date}>
                <th scope="row">{shortDate(date)}</th>
                <td>{age(r.forecast)}</td>
                <td>{delta(r.potential - r.forecast)}</td>
                <td>{age(r.bioAge)}</td>
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
  const wipe = useQuiz((s) => s.wipe);
  return (
    <div className="danger">
      <p className="note">
        Это оценка по средним данным исследований, а не диагноз. Ответы хранятся только в этом браузере и пропадут, если
        очистить данные сайта.
      </p>
      {confirming ? (
        <>
          <button type="button" className="btn btn--compact" onClick={wipe}>
            Удалить все ответы
          </button>
          <button type="button" className="link" onClick={() => setConfirming(false)}>
            Оставить
          </button>
        </>
      ) : (
        <button type="button" className="link" onClick={() => setConfirming(true)}>
          Удалить мои ответы
        </button>
      )}
    </div>
  );
}
