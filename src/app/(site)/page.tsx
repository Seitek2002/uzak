import Link from "next/link";
import { FACTOR_BY_SLUG, FACTORS, GROUPS, factorsInGroup } from "@/entities/factor";
import { assess, factorRange, stepsEffect, type Answers } from "@/entities/result";
import { FactorBars } from "@/entities/result/ui/FactorBars";
import { checksFor } from "@/features/report/model/checks";
import { age, ageParts, counted, delta, deltaParts, inGroups, nb } from "@/shared/lib/format";
import { Figure } from "@/shared/ui/Figure";
import { HeroProbe } from "@/widgets/home/HeroProbe";
import { STEPS_MAX, STEPS_MIN, STEPS_STEP } from "@/widgets/home/steps";
import { Scenarios, type Scenario } from "@/widgets/home/Scenarios";
import { StartChoice } from "@/widgets/home/StartChoice";
import { SITE } from "@/shared/config/site";

/* A sample profile for the report preview. Every figure on it is the model's own output for these answers. */
const SAMPLE_PROFILE = { sex: "male" as const, age: 40 };
const SAMPLE: Answers = {
  smoking: "light",
  alcohol: "mid",
  sleep: "6to7",
  activity: "lt150",
  strength: "none",
  steps: "4to6",
  "fruits-vegetables": "1to2",
  "processed-meat": "often",
  "sugary-drinks": "daily",
  bmi: "27to30",
  "blood-pressure": "unknown",
  "heart-rate": "unknown",
  "seat-belt": "front",
  "phone-driving": "sometimes",
  "close-people": "three5",
  distress: "sometimes",
  optimism: "mixed",
  parents: "other",
  "family-heart": "unknown",
  diabetes: "unknown",
  "heart-disease": "no",
};

function scenario(id: string, tab: string, slug: string, from: string, to: string, labels: [string, string], text: string): Scenario {
  const who = { sex: "male" as const, age: 40 };
  const before = assess(who, { [slug]: from }).forecast;
  const after = assess(who, { [slug]: to }).forecast;
  return {
    id,
    tab,
    before: { value: ageParts(before), label: labels[0] },
    after: { value: ageParts(after), label: labels[1] },
    change: `Разница ${delta(after - before)}`,
    text,
  };
}

export default function HomePage() {
  const stepsTable = Array.from({ length: (STEPS_MAX - STEPS_MIN) / STEPS_STEP + 1 }, (_, i) =>
    stepsEffect(STEPS_MIN + i * STEPS_STEP),
  );
  const sample = assess(SAMPLE_PROFILE, SAMPLE);
  const top = [...sample.factors].filter((f) => f.gain >= 0.1).sort((a, b) => b.gain - a.gain).slice(0, 3);
  const mapRows = [...sample.factors]
    .filter((f) => Math.abs(f.years) >= 0.05)
    .sort((a, b) => Math.abs(b.years) - Math.abs(a.years))
    .slice(0, 6)
    .sort((a, b) => a.years - b.years)
    .map((f) => ({ slug: f.slug, title: FACTOR_BY_SLUG.get(f.slug)!.title, years: f.years }));
  const checks = checksFor(SAMPLE_PROFILE, SAMPLE).slice(0, 4);

  const scenarios = [
    scenario(
      "smoking",
      "Курение",
      "smoking",
      "heavy",
      "quit10",
      ["курит 10 сигарет в день и больше", "через 10 лет без сигарет"],
      "С каждым годом без сигарет риск приближается к риску некурящего.",
    ),
    scenario(
      "weight",
      "Вес",
      "bmi",
      "30to35",
      "25to27",
      ["индекс массы тела 32", "индекс массы тела 26"],
      "При росте 177 см это 100 и 82 кг.",
    ),
    scenario(
      "steps",
      "Шаги",
      "steps",
      "lt4",
      "8to10",
      ["3 000 шагов в день", "9 000 шагов в день"],
      "Шесть тысяч шагов: около часа ходьбы в день.",
    ),
  ];

  return (
    <>
      <section className="sheet hero" aria-labelledby="hero-title">
        <div className="hero__text">
          <h1 id="hero-title">{nb("Ваши привычки в годах жизни")}</h1>
          <p className="lead">{nb(`Тест на ${SITE.questions} вопросов: прогноз, биологический возраст и что менять первым.`)}</p>
          <div className="actions">
            <Link href="/test" className="btn">
              Пройти тест
            </Link>
            <Link href="/pet" className="link">
              Тест для кошки или собаки
            </Link>
          </div>
        </div>
        <div
          className="hero__field field"
          data-slot="hero"
          data-kind="product"
          data-alt="Модель на одном факторе: шаги в день и годы, которые они добавляют"
        >
          <HeroProbe years={stepsTable} total={FACTORS.length} />
        </div>
      </section>

      <section className="section" aria-labelledby="report-title">
        <div className="container">
          <div className="head head--split">
            <h2 id="report-title">Отчёт мужчины 40&nbsp;лет, который курит</h2>
            <p className="lead">{nb("Ещё он ходит около 5\u00a0000 шагов в день и не знает своего давления.")}</p>
          </div>
          <div className="bento">
            <div className="tile tile--lead">
              <h3>Прогноз</h3>
              <div>
                <Figure parts={ageParts(sample.forecast)} />
                <p className="muted">ожидаемый возраст, если ничего не менять</p>
              </div>
              <div className="tile__pair">
                <div>
                  <Figure parts={deltaParts(sample.potential - sample.forecast)} />
                  <p className="muted">потенциал, если изменить привычки</p>
                </div>
                <div>
                  <Figure parts={ageParts(sample.potential)} />
                  <p className="muted">прогноз после изменений</p>
                </div>
              </div>
            </div>
            <div className="tile tile--bio">
              <h3>Биологический возраст</h3>
              <div>
                <Figure parts={ageParts(sample.bioAge)} />
                <p className="muted">паспортный возраст {age(SAMPLE_PROFILE.age)}</p>
              </div>
            </div>
            <div className="tile tile--start">
              <h3>С чего начать</h3>
              <p className="muted">Годы, если сделать следующий шаг</p>
              <ol className="gains">
                {top.map((f) => (
                  <li key={f.slug}>
                    <span>{FACTOR_BY_SLUG.get(f.slug)!.title}</span>
                    <b>{delta(f.gain)}</b>
                  </li>
                ))}
              </ol>
            </div>
            <div className="tile tile--map">
              <h3>Карта факторов</h3>
              <p className="muted">Годы против среднего ответа</p>
              <FactorBars caption="Факторы с самым большим влиянием в примере" rows={mapRows} />
            </div>
            <div className="tile tile--check">
              <h3>Что обсудить с врачом</h3>
              <ul className="plainlist">
                {checks.map((c) => (
                  <li key={c.id}>{c.title}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--flush-top" aria-labelledby="factors-title">
        <div className="container">
          <div className="head head--split">
            <h2 id="factors-title">{nb(`${counted(FACTORS.length, ["фактор", "фактора", "факторов"])} ${inGroups(GROUPS.length)}`)}</h2>
            <p className="lead">{nb("Цифра у группы: сколько её худший ответ отнимает у среднего человека 40\u00a0лет.")}</p>
          </div>
          <ul className="index">
            {GROUPS.map((g) => {
              const items = factorsInGroup(g.id);
              const worst = Math.min(...items.map((f) => factorRange(f).min));
              return (
                <li key={g.id} className="index__row cols">
                  <h3>{g.title}</h3>
                  <ul className="index__links">
                    {items.map((f) => (
                      <li key={f.slug}>
                        <Link href={`/factors/${f.slug}`}>{f.title}</Link>
                      </li>
                    ))}
                  </ul>
                  <p className="index__range">
                    <b>{delta(worst)}</b>
                    <span className="visually-hidden">в худшем случае</span>
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="index__foot">
            <Link href="/factors" className="link">
              Все факторы и исследования
            </Link>
          </p>
        </div>
      </section>

      <section className="section field--mark" aria-labelledby="habit-title">
        <div className="container">
          <Scenarios
            items={scenarios}
            head={
              <>
                <h2 id="habit-title">Одна привычка, два прогноза</h2>
                <p className="lead">{nb("Тот же мужчина 40\u00a0лет, остальные ответы средние.")}</p>
              </>
            }
          />
        </div>
      </section>

      <section className="section section--l" aria-labelledby="method-title">
        <div className="container cols method">
          <div className="method__lead">
            <h2 id="method-title">Как модель считает годы</h2>
            <p className="figure method__figure">×2</p>
            <p className="lead">
              {nb("Каждые 8 лет растёт годовой риск смерти взрослого. По этой кривой Гомперца модель переводит риск в годы.")}
            </p>
          </div>
          <div className="method__rows">
            <div>
              <h3>Риск каждого ответа</h3>
              <p>{nb("Отношение рисков из исследований: во сколько раз выше или ниже смертность.")}</p>
            </div>
            <div>
              <h3>Риски перемножаются</h3>
              <p>{nb("Похожие факторы, вроде шагов и нагрузки, учитываются не целиком.")}</p>
            </div>
            <div>
              <h3>Биологический возраст</h3>
              <p>{nb("Возраст, в котором средний человек вашего пола несёт такой же риск, как вы.")}</p>
            </div>
            <p>
              <Link href="/method" className="link">
                Вся методика и источники
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="faq-title">
        <div className="container cols faq">
          <div className="faq__head">
            <h2 id="faq-title">{nb("Перед тем как поверить прогнозу")}</h2>
          </div>
          <div className="faq__list">
            <details>
              <summary>Это диагноз?</summary>
              <p>Нет. Тест оценивает риск по средним данным больших исследований. Диагноз ставит только врач.</p>
            </details>
            <details>
              <summary>Насколько точен прогноз?</summary>
              <p>
                Модель знает средние риски, а не вашу историю болезни. Для одного человека ошибка может составлять годы,
                поэтому смотрите на факторы, а не на одну цифру.
              </p>
            </details>
            <details>
              <summary>Куда уходят мои ответы?</summary>
              <p>Никуда. Они хранятся в браузере на этом устройстве, удалить их можно одной кнопкой в отчёте.</p>
            </details>
            <details>
              <summary>А если у меня нет анализов крови?</summary>
              <p>Четыре вопроса о них можно пропустить: модель возьмёт средние значения, а отчёт подскажет, что сдать.</p>
            </details>
            <details>
              <summary>Как часто проходить тест?</summary>
              <p>Раз в три или шесть месяцев. Отчёт покажет, как изменился прогноз с прошлого раза.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section field" aria-labelledby="close-title">
        <div className="container cols close">
          <div className="close__head">
            <h2 id="close-title">Первый вопрос уже здесь</h2>
            <p className="lead">{nb(`Ещё ${SITE.questions - 1} вопросов, около ${SITE.minutes} минут. Ответы сохраняются по ходу теста.`)}</p>
          </div>
          <div className="close__choice">
            <p id="first-question">Ваш пол</p>
            <StartChoice />
          </div>
        </div>
      </section>
    </>
  );
}
