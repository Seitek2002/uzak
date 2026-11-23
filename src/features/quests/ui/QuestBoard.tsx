"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { FACTOR_BY_SLUG } from "@/entities/factor";
import { contentOf } from "@/entities/factor/content";
import type { Assessment } from "@/entities/result";
import { STEPS } from "@/features/quiz/model/steps";
import { useQuiz, type Attempt } from "@/features/quiz/model/store";
import { actionFor } from "@/features/share/model/actions";
import { delta, deltaParts, plural, shortDate } from "@/shared/lib/format";
import { Figure } from "@/shared/ui/Figure";
import { bonusOf, dayKey, isReady, QUEST_DAYS, questSlots, streakOf, type Quest } from "../model/quests";
import { useGame, useGameHydrated } from "../model/store";

/*
 * A number that is measured, not lived: three weeks of ticks do not change it.
 * Such a quest ends with a new measurement typed into the test.
 */
const MEASURED = new Set(["bmi", "blood-pressure", "heart-rate", "muscle", "ldl", "hba1c", "crp", "omega3"]);

const DAYS: [string, string, string] = ["день", "дня", "дней"];
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** The report's three changes as quests, with the bank of years they unlocked. */
export function QuestBoard({ attempt, result }: { attempt: Attempt; result: Assessment }) {
  const hydrated = useGameHydrated();
  const quests = useGame((s) => s.quests);
  const done = useGame((s) => s.done);
  const [unlocked, setUnlocked] = useState<{ slug: string; years: number } | null>(null);
  const slots = questSlots(result, hydrated ? quests : {});
  const banked = done.reduce((sum, q) => sum + (q.bonus ?? 0), 0);
  const waiting = slots.reduce((sum, s) => sum + s.gain, 0);

  const unlock = (q: Quest) => {
    if (MEASURED.has(q.slug)) {
      useGame.getState().finish(q.slug, 0);
      return;
    }
    const years = bonusOf(attempt.profile, attempt.answers, q.slug, q.to, new Date().toISOString());
    useQuiz.getState().adopt(q.slug, q.to);
    useGame.getState().finish(q.slug, years);
    setUnlocked({ slug: q.slug, years });
  };

  return (
    <section className="section" aria-labelledby="start-title">
      <div className="container">
        <div className="head head--split">
          <h2 id="start-title">С чего начать</h2>
          <p className="lead">
            Три изменения, которые сильнее всего сдвинут прогноз. Каждое можно пройти как квест на {QUEST_DAYS} день и открыть
            бонусные годы.
          </p>
        </div>

        <div className="bank" aria-live="polite">
          <div>
            <Figure parts={deltaParts(banked)} />
            <p>Бонусные годы в банке</p>
          </div>
          <div>
            <Figure parts={deltaParts(waiting)} />
            <p>Ещё ждут в квестах ниже</p>
          </div>
          {unlocked && (
            <p className="bank__news" role="status">
              Квест пройден: {delta(unlocked.years)} в банке.
            </p>
          )}
        </div>

        {slots.length === 0 ? (
          <p className="lead">По всем привычкам вы уже на лучших вариантах. Проходите тест раз в полгода, чтобы так и оставалось.</p>
        ) : (
          <ol className="starts">
            {slots.map((slot) => {
              const factor = FACTOR_BY_SLUG.get(slot.slug)!;
              const from = factor.options.find((o) => o.id === slot.option);
              const to = factor.options.find((o) => o.id === slot.to);
              const quest = hydrated ? quests[slot.slug] : undefined;
              return (
                <li key={slot.slug} className={quest ? "quest is-on" : "quest"}>
                  <Figure parts={deltaParts(slot.gain)} />
                  <h3>
                    <Link href={`/factors/${slot.slug}`}>{factor.title}</Link>
                  </h3>
                  {from && to && (
                    <p>
                      Сейчас: {lower(from.label)}. Цель: {lower(to.goal ?? to.label)}.
                    </p>
                  )}
                  <p>{contentOf(slot.slug).advice[0]}</p>
                  {hydrated && (
                    <QuestControls
                      slug={slot.slug}
                      title={actionFor(slot.slug, slot.option) ?? factor.title}
                      quest={quest}
                      onStart={() => useGame.getState().start(slot.slug, slot.option, slot.to)}
                      onUnlock={unlock}
                      burst={unlocked?.slug === slot.slug}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {done.length > 0 && (
          <div className="quests-done">
            <h3>Пройденные квесты</h3>
            <ul>
              {done.map((q) => {
                const factor = FACTOR_BY_SLUG.get(q.slug);
                return (
                  <li key={`${q.slug}-${q.done}`}>
                    <span>{actionFor(q.slug, q.from) ?? factor?.title}</span>
                    <span>{shortDate(q.done!)}</span>
                    {MEASURED.has(q.slug) ? (
                      <Link
                        href={`/test?q=${STEPS.indexOf(q.slug as (typeof STEPS)[number]) + 1}&edit=1`}
                        className="link"
                        onClick={() => useQuiz.getState().startEdit(STEPS.indexOf(q.slug as (typeof STEPS)[number]))}
                      >
                        Обновить показатель<span className="visually-hidden">: {factor?.title}</span>
                      </Link>
                    ) : (
                      <b>{delta(q.bonus ?? 0)}</b>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <p className="note">Бонусные годы считает модель по новому ответу. Это оценка, а не обещание.</p>
      </div>
    </section>
  );
}

function QuestControls({
  slug,
  title,
  quest,
  onStart,
  onUnlock,
  burst,
}: {
  slug: string;
  title: string;
  quest?: Quest;
  onStart: () => void;
  onUnlock: (q: Quest) => void;
  burst: boolean;
}) {
  if (!quest) {
    return (
      <button type="button" className="btn btn--compact quest__go" onClick={onStart}>
        Начать квест на {QUEST_DAYS} день<span className="visually-hidden">: {title}</span>
      </button>
    );
  }
  const today = dayKey();
  const ticked = new Set(quest.marks);
  const count = Math.min(ticked.size, QUEST_DAYS);
  const streak = streakOf(quest.marks, today);
  const markedToday = ticked.has(today);
  return (
    <div className="quest__box">
      <p className="quest__title">Квест: {lower(title)}</p>
      <ol className="quest__days" aria-label={`Отмечено ${count} из ${QUEST_DAYS}`}>
        {Array.from({ length: QUEST_DAYS }, (_, i) => (
          <li key={i} className={i < count ? "is-on" : undefined} />
        ))}
      </ol>
      <p className="quest__count">
        Отмечено {count} из {QUEST_DAYS}. Серия: {streak} {plural(streak, DAYS)}.
      </p>
      {isReady(quest) ? (
        <button type="button" className="btn btn--compact" onClick={() => onUnlock(quest)}>
          Открыть бонусные годы
        </button>
      ) : markedToday ? (
        <p className="quest__today">
          Сегодня отмечено.{" "}
          <button type="button" className="link" onClick={() => useGame.getState().toggleToday(slug)}>
            Отменить
          </button>
        </p>
      ) : (
        <button type="button" className="btn btn--compact" onClick={() => useGame.getState().toggleToday(slug)}>
          Сегодня получилось
        </button>
      )}
      {!isReady(quest) && (
        <button type="button" className="link quest__drop" onClick={() => useGame.getState().drop(slug)}>
          Отказаться от квеста
        </button>
      )}
      {burst && (
        <span className="burst burst--big" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ "--turn": `${i * (360 / 14)}deg` } as CSSProperties} />
          ))}
        </span>
      )}
    </div>
  );
}
