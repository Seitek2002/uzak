"use client";

import { Crown, Flag, Flame, PawPrint, RefreshCw, Sparkles, TestTube, Trophy, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { usePetQuiz } from "@/features/pet-quiz/model/store";
import { TEST_SLUGS } from "@/features/quiz/model/steps";
import type { Attempt } from "@/features/quiz/model/store";
import { badgesOf } from "../model/quests";
import { useGame, useGameHydrated } from "../model/store";

const BADGES: Record<string, { icon: LucideIcon; title: string; how: string }> = {
  first: { icon: Sparkles, title: "Первый прогноз", how: "Пройти тест" },
  numbers: { icon: TestTube, title: "Знаю свои цифры", how: "Ответить хотя бы на один вопрос об анализах" },
  pet: { icon: PawPrint, title: "Питомец тоже", how: "Пройти тест для кошки или собаки" },
  start: { icon: Flag, title: "Первый шаг", how: "Начать квест" },
  week: { icon: Flame, title: "Неделя подряд", how: "Отмечать квест 7 дней подряд" },
  quest: { icon: Trophy, title: "Квест пройден", how: "Пройти квест до конца" },
  three: { icon: Crown, title: "Три из трёх", how: "Пройти три квеста" },
  again: { icon: RefreshCw, title: "Снова в деле", how: "Пройти тест ещё раз" },
};

/** The shelf of badges: the earned ones in colour, the rest say how to get them. */
export function Badges({ history }: { history: Attempt[] }) {
  const hydrated = useGameHydrated();
  const quests = useGame((s) => s.quests);
  const done = useGame((s) => s.done);
  const petAttempts = usePetQuiz((s) => s.history.length);
  useEffect(() => {
    if (!usePetQuiz.persist.hasHydrated()) void usePetQuiz.persist.rehydrate();
  }, []);
  const last = history.at(-1);
  const badges = badgesOf({
    attempts: history.length,
    knowsNumbers: Boolean(last && TEST_SLUGS.some((slug) => last.answers[slug] && last.answers[slug] !== "unknown")),
    petAttempts,
    quests: hydrated ? [...Object.values(quests), ...done] : [],
  });
  const earned = badges.filter((b) => b.earned).length;
  return (
    <section className="section" aria-labelledby="badges-title">
      <div className="container">
        <div className="head head--split">
          <h2 id="badges-title">Значки</h2>
          <p className="lead">
            Получено {earned} из {badges.length}.
          </p>
        </div>
        <ul className="badges">
          {badges.map((b) => {
            const { icon: Glyph, title, how } = BADGES[b.id];
            return (
              <li key={b.id} className={b.earned ? "badge is-on" : "badge"}>
                <span className="badge__icon" aria-hidden="true">
                  <Glyph size={28} strokeWidth={2} />
                </span>
                <b>{title}</b>
                <span className="badge__how">{b.earned ? "Получен" : how}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
