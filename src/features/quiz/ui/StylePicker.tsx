"use client";

import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/shared/ui/Wordmark";
import { useQuiz, type QuizStyle } from "../model/store";

type GameStyle = Exclude<QuizStyle, "classic">;

/** The game styles in the order of their cards; what each one is stays hidden until it is picked or taken to the end. */
const DECK: Array<{ style: GameStyle; name: string; reveal: string }> = [
  { style: "journey", name: "Стиль 1", reveal: "Путь героя" },
  { style: "chat", name: "Стиль 2", reveal: "Переписка" },
  { style: "touch", name: "Стиль 3", reveal: "Копилка лет" },
];

/** How long the turned card stays before its style opens. */
const REVEAL_MS = 1100;
const REVEAL_MS_CALM = 500;

/**
 * The choice before the first question: three face-down cards and the plain
 * form. The questions, the model and the report are the same in every style.
 */
export function StylePicker({ preload }: { preload: (style: GameStyle) => void }) {
  const setStyle = useQuiz((s) => s.setStyle);
  const played = useQuiz((s) => s.played);
  const step = useQuiz((s) => s.step);
  const [turned, setTurned] = useState<GameStyle | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pick = (style: GameStyle) => {
    if (turned) return;
    preload(style);
    // A style already taken has nothing left to reveal.
    if (played.includes(style)) {
      setStyle(style);
      return;
    }
    setTurned(style);
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = window.setTimeout(() => setStyle(style), calm ? REVEAL_MS_CALM : REVEAL_MS);
  };
  const revealed = DECK.find((d) => d.style === turned);

  return (
    <>
      <header className="quiz-top">
        <div className="container quiz-top__inner">
          <Wordmark />
        </div>
      </header>
      <main id="main" className="quiz pick">
        <div className="container">
          <div className="pick__head">
            <h1 ref={headingRef} tabIndex={-1}>
              Как будете проходить тест?
            </h1>
            <p className="lead">Вопросы и результат везде одни и те же. Что за стилями, узнаете после выбора.</p>
            {step > 0 && <p className="pick__resume">{`Ответы сохранены: продолжим с вопроса ${step + 1}.`}</p>}
          </div>
          <ul className="decks">
            {DECK.map((d, i) => {
              const known = played.includes(d.style);
              return (
              <li key={d.style}>
                <button
                  type="button"
                  className={`deck${turned === d.style || known ? " is-turned" : ""}${known ? " is-known" : ""}`}
                  onPointerEnter={() => preload(d.style)}
                  onFocus={() => preload(d.style)}
                  onClick={() => pick(d.style)}
                  aria-disabled={turned !== null && turned !== d.style ? true : undefined}
                >
                  <span className="deck__card" aria-hidden="true">
                    <span className="deck__face deck__back">
                      <span className="deck__ornament" />
                      <span className="deck__numeral">{i + 1}</span>
                    </span>
                    <span className="deck__face deck__front">
                      <span className="deck__numeral">{i + 1}</span>
                      {(turned === d.style || known) && <span className="deck__reveal">{d.reveal}</span>}
                    </span>
                  </span>
                  <span className="deck__name">
                    {known ? d.reveal : d.name}
                    {known && (
                      <span className="deck__done">
                        <span className="visually-hidden">, </span>пройден
                      </span>
                    )}
                  </span>
                </button>
              </li>
              );
            })}
          </ul>
          <button type="button" className="link pick__plain" onClick={() => setStyle("classic")} disabled={turned !== null}>
            Обычная анкета без сюрпризов
          </button>
          <p className="visually-hidden" role="status">
            {revealed ? `${revealed.name}: ${revealed.reveal}. Открываем…` : ""}
          </p>
        </div>
      </main>
    </>
  );
}
