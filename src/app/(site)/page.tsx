import { Activity, Apple, Brain, Car, Cat, Cigarette, Dna, Dog, MapPin, Scale, Stethoscope, TestTube, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { FACTORS, GROUPS, factorsInGroup, type GroupId } from "@/entities/factor";
import { assess, factorRange, lifeExpectancyAt, PEER_ANSWERS, WORLD, type Answers } from "@/entities/result";
import { LOCALE } from "@/shared/config/locale";
import { SITE } from "@/shared/config/site";
import { COUNTRIES } from "@/shared/data/countries";
import { age, counted, delta, nb } from "@/shared/lib/format";
import { HABITS } from "@/widgets/home/habits";
import { HabitLab } from "@/widgets/home/HabitLab";
import { StartName } from "@/widgets/home/StartName";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const GROUP_ICONS: Record<GroupId, LucideIcon> = {
  place: MapPin,
  habits: Cigarette,
  movement: Activity,
  food: Apple,
  body: Scale,
  road: Car,
  mind: Brain,
  family: Dna,
  diagnoses: Stethoscope,
  tests: TestTube,
};

/** Countries on the world band, from long lives to short ones around the world average. */
const WORLD_SAMPLE = ["JPN", "DEU", "USA", "BRA", WORLD, "IND", "NGA"];

/** The right edge of the bars of the world band, in years of age. */
const WORLD_BAR_END = 90;

/** The model's forecast for the sample person under every combination of the hero switches. */
function habitForecasts(): number[] {
  return Array.from({ length: 2 ** HABITS.length }, (_, mask) => {
    const answers: Answers = { ...PEER_ANSWERS };
    HABITS.forEach((habit, i) => {
      answers[habit.id] = mask & (1 << i) ? habit.to : habit.from;
    });
    return assess({ sex: "male", age: 40 }, answers).forecast;
  });
}

export default function HomePage() {
  const impact = GROUPS.map((group) => ({
    group,
    worst: Math.min(...factorsInGroup(group.id).map((f) => factorRange(f).min)),
  })).sort((a, b) => a.worst - b.worst);
  const deepest = Math.min(...impact.map((row) => row.worst));
  const world = WORLD_SAMPLE.map((code) => ({
    code,
    name: code === WORLD ? "Мир в среднем" : COUNTRIES.find((c) => c.code === code)![LOCALE],
    until: (lifeExpectancyAt(code, "male") + lifeExpectancyAt(code, "female")) / 2,
  })).sort((a, b) => b.until - a.until);

  return (
    <>
      <section className="sheet hero" aria-labelledby="hero-title">
        <div className="hero__text">
          <h1 id="hero-title">{nb("Сколько лет вы можете добавить?")}</h1>
          <p className="lead">{nb(`${SITE.questions} вопросов, ${SITE.minutes} минут, любая страна мира.`)}</p>
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
          data-alt="Модель на четырёх привычках: включите изменение и увидите, сколько лет оно добавит"
        >
          <HabitLab forecasts={habitForecasts()} />
        </div>
      </section>

      <section className="section" aria-labelledby="product-title">
        <div className="container cols product">
          <div className="product__head">
            <h2 id="product-title">От вопроса до истории в соцсетях</h2>
            <p className="lead">{nb("В конце один экран: сколько лет можно добавить и с чего начать.")}</p>
          </div>
          <div className="product__shots">
            <figure>
              <img
                src={`${BASE_PATH}/landing/${LOCALE}/question.jpg`}
                width={720}
                height={1440}
                loading="lazy"
                decoding="async"
                alt="Вопрос об алкоголе: порции показаны картинками, ответы шкалой"
              />
              <figcaption>Вопросы картинками</figcaption>
            </figure>
            <figure>
              <img
                src={`${BASE_PATH}/landing/${LOCALE}/result.jpg`}
                width={720}
                height={1440}
                loading="lazy"
                decoding="async"
                alt="Экран результата: сколько лет добавят изменения привычек и три первых шага"
              />
              <figcaption>Пример результата для публикации</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="section section--flush-top" aria-labelledby="factors-title">
        <div className="container">
          <div className="head head--split">
            <h2 id="factors-title">{nb(`${counted(FACTORS.length, ["фактор", "фактора", "факторов"])}: что отнимает годы`)}</h2>
            <p className="lead">{nb("Худший ответ в группе для среднего человека 40\u00a0лет.")}</p>
          </div>
          <ul className="impact">
            {impact.map(({ group, worst }) => {
              const Glyph = GROUP_ICONS[group.id];
              return (
                <li key={group.id}>
                  <Glyph size={32} strokeWidth={2} aria-hidden="true" />
                  <h3>{group.title}</h3>
                  <span className="impact__track" aria-hidden="true">
                    <span style={{ transform: `scaleX(${worst / deepest})` }} />
                  </span>
                  <b>{delta(worst)}</b>
                </li>
              );
            })}
          </ul>
          <p className="impact__foot">
            <Link href="/factors" className="link">
              Все факторы и исследования
            </Link>
          </p>
        </div>
      </section>

      <section className="section field--mark" aria-labelledby="world-title">
        <div className="container cols world">
          <div className="world__head">
            <h2 id="world-title">{nb(`${COUNTRIES.length - 1} стран, у каждой своя кривая`)}</h2>
            <p className="lead">{nb("До какого возраста в среднем доживают те, кому сейчас 30, по таблицам ВОЗ.")}</p>
          </div>
          <ul className="world__list">
            {world.map(({ code, name, until }) => (
              <li key={code}>
                <span>{name}</span>
                <span className="world__track" aria-hidden="true">
                  <span style={{ transform: `scaleX(${until / WORLD_BAR_END})` }} />
                </span>
                <b>{age(until)}</b>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section well" aria-labelledby="pets-title">
        <div className="container cols pets">
          <p className="pets__icons" aria-hidden="true">
            <span>
              <Cat size={32} strokeWidth={2} />
            </span>
            <span>
              <Dog size={32} strokeWidth={2} />
            </span>
          </p>
          <div className="pets__head">
            <h2 id="pets-title">Питомцу тоже можно добавить годы</h2>
            <p className="lead">{nb("Отдельный тест для кошки или собаки, около трёх минут.")}</p>
            <Link href="/pet/test" className="link">
              Проверить питомца
            </Link>
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
              <p>Никуда. Они хранятся в браузере на этом устройстве, удалить их можно одной кнопкой в отчёте. Наружу уходит только запрос страны по IP-адресу, без ответов.</p>
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
            <StartName />
          </div>
        </div>
      </section>
    </>
  );
}
