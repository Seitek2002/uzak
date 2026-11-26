"use client";

import "@/styles/chat.css";
import { CornerUpLeft, SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FACTOR_BY_SLUG, groupById, type GroupId } from "@/entities/factor";
import { answersBefore, hpOf, reserveOf } from "@/features/journey/model/hp";
import { useQuizFlow } from "@/features/quiz/model/flow";
import { LABS_STEP, STEPS } from "@/features/quiz/model/steps";
import { useQuiz } from "@/features/quiz/model/store";
import { BodyStep } from "@/features/quiz/ui/BodyStep";
import { CountryStep } from "@/features/quiz/ui/CountryStep";
import { AgeStep, NameStep } from "@/features/quiz/ui/QuizApp";
import { FALLBACK_LOOK, LOOKS } from "@/features/quiz/ui/visuals";
import { age as ageText, decimal, delta as signed, nb, plural } from "@/shared/lib/format";
import { Wordmark } from "@/shared/ui/Wordmark";
import { Mascot } from "./Mascot";

/*
 * "Переписка": the test as a chat with Ала, a tortoise. The questions come as
 * messages, the answers as quick replies, and each answer gets a short reply.
 * The conversation is rebuilt from the saved answers, so a reload keeps it.
 */

const PATH_FROM = STEPS.indexOf("country-next") + 1;
const TYPING_MS = 700;
const YEARS: [string, string, string] = ["год", "года", "лет"];
const years = (n: number) => `${decimal(n)} ${plural(n, YEARS)}`;

const GOOD = ["Отлично!", "Здорово, так держать.", "Вот это да!", "Прекрасно.", "Красота."];
const EVEN = ["Записала.", "Понятно, идём дальше.", "Принято.", "Хорошо."];
const LOW = ["Записала. В отчёте подскажу, что с этим делать.", "Ничего, это можно поменять.", "Понимаю. Это поправимо."];
const CALM = ["Спасибо, что рассказали.", "Записала, это важно учесть.", "Понимаю. Записала."];
/** Inheritance, illness and blood tests get a calm word whatever the answer. */
const CALM_GROUPS: GroupId[] = ["family", "diagnoses", "tests"];

const pickOf = (list: string[], key: string) => list[[...key].reduce((n, c) => n + c.charCodeAt(0), 0) % list.length];

const groupOf = (id: string): GroupId | undefined => FACTOR_BY_SLUG.get(id)?.group ?? (id === "labs" ? "tests" : undefined);

function questionOf(id: string): string {
  if (id === "name") return "Как вас зовут?";
  if (id === "sex") return "Ваш пол";
  if (id === "age") return "Сколько вам полных лет?";
  if (id === "labs") return "Есть ли у вас свежие анализы крови?";
  return FACTOR_BY_SLUG.get(id)?.question ?? "";
}

const SEX = [
  { id: "female", label: "Женский" },
  { id: "male", label: "Мужской" },
];
const LABS = [
  { id: "yes", label: "Да, посмотрю цифры" },
  { id: "skip", label: "Нет, пропустить и посчитать результат" },
];

type Saved = ReturnType<typeof useQuiz.getState>;

function answerOf(id: string, s: Saved): string {
  if (id === "name") return s.name.trim() || "Без имени";
  if (id === "sex") return SEX.find((o) => o.id === s.sex)?.label ?? "";
  if (id === "age") return s.age ? ageText(s.age) : "";
  if (id === "labs") return LABS.find((o) => o.id === s.labs)?.label ?? "";
  if (id === "bmi") return `${s.height} см, ${s.weight} кг`;
  const f = FACTOR_BY_SLUG.get(id);
  return f?.options.find((o) => o.id === s.answers[id])?.label ?? "";
}

interface Turn {
  id: string;
  question: string;
  answer: string;
  /** Ала's reply and the years the answer moved the forecast. */
  reply?: string;
  delta?: number;
  /** A block of questions ends here. */
  closes?: GroupId;
  /** The forecast once the countries are known: the start of the count. */
  start?: number;
}

export function ChatApp() {
  const router = useRouter();
  const flow = useQuizFlow();
  const { step, id, factor, error, headingRef } = flow;
  const name = useQuiz((s) => s.name);
  const sex = useQuiz((s) => s.sex);
  const ageNow = useQuiz((s) => s.age);
  const answers = useQuiz((s) => s.answers);
  const labs = useQuiz((s) => s.labs);
  const height = useQuiz((s) => s.height);
  const setStyle = useQuiz((s) => s.setStyle);
  const answer = useQuiz((s) => s.answer);
  const setSex = useQuiz((s) => s.setSex);
  const setLabs = useQuiz((s) => s.setLabs);
  const [typing, setTyping] = useState(true);
  const [done, setDone] = useState<{ hp: number; start: number; reserve: number } | null>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);

  const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Ала types for a moment before each question.
  useEffect(() => {
    setTyping(true);
    const t = window.setTimeout(() => setTyping(false), calm() ? 0 : TYPING_MS);
    return () => window.clearTimeout(t);
  }, [step]);

  // The newest message stays in sight above the reply box.
  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: calm() ? "auto" : "smooth" });
  }, [step, typing, done]);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  const profile = sex && ageNow ? { sex, age: ageNow } : null;
  const turns = useMemo((): Turn[] => {
    const s = useQuiz.getState();
    const list: Turn[] = [];
    const last = done ? STEPS.length : step;
    for (let i = 0; i < last && i < STEPS.length; i += 1) {
      const sid = STEPS[i];
      if (i > LABS_STEP && s.labs === "skip") break;
      const turn: Turn = { id: sid, question: questionOf(sid), answer: answerOf(sid, s) };
      if (sid === "name" && s.name.trim()) turn.reply = `Приятно познакомиться, ${s.name.trim()}!`;
      if (profile && i >= PATH_FROM) {
        const before = hpOf(profile, answersBefore(s.answers, STEPS, i));
        const after = hpOf(profile, answersBefore(s.answers, STEPS, i + 1));
        const d = after - before;
        const g = groupOf(sid);
        if (sid !== "labs") {
          turn.delta = d;
          const calmWord = g && CALM_GROUPS.includes(g);
          turn.reply = pickOf(calmWord ? CALM : d > 0.04 ? GOOD : d < -0.04 ? LOW : EVEN, sid);
        }
      }
      if (profile && i === PATH_FROM - 1) turn.start = hpOf(profile, answersBefore(s.answers, STEPS, PATH_FROM));
      const g = groupOf(sid);
      const nextGroup = groupOf(STEPS[i + 1] ?? "");
      if (g && i >= PATH_FROM && g !== nextGroup && (i + 1 < last || done)) turn.closes = g;
      list.push(turn);
    }
    return list;
    // The turns follow the saved answers and the step.
  }, [step, answers, name, sex, ageNow, labs, height, done]);

  const forecast = useMemo(() => {
    if (done) return done.hp;
    if (!profile || step < PATH_FROM) return null;
    return hpOf(profile, answersBefore(answers, STEPS, step));
  }, [done, profile?.sex, profile?.age, step, answers]);

  const finish = () => {
    const s = useQuiz.getState();
    if (!s.sex || !s.age) return;
    const p = { sex: s.sex, age: s.age };
    s.complete();
    setDone({ hp: hpOf(p, s.answers), start: hpOf(p, answersBefore(s.answers, STEPS, PATH_FROM)), reserve: reserveOf(p, s.answers) });
  };

  const send = () => {
    const problem = flow.check();
    if (problem) {
      flow.showProblem(problem);
      return;
    }
    flow.next(finish);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send();
  };

  const isChoice = factor?.kind === "choice" || id === "sex" || id === "labs";
  const look = factor ? (LOOKS[factor.slug] ?? FALLBACK_LOOK) : id === "sex" ? LOOKS.sex : id === "labs" ? LOOKS.labs : FALLBACK_LOOK;
  const options = id === "sex" ? SEX : id === "labs" ? LABS : (factor?.options ?? []);
  const value = id === "sex" ? sex : id === "labs" ? labs : answers[id];
  const pick = (v: string) => {
    if (id === "sex") setSex(v as "male" | "female");
    else if (id === "labs") setLabs(v as "yes" | "skip");
    else answer(id, v);
    send();
  };
  const help = factor?.help ?? (id === "sex" ? "У мужчин и женщин разная исходная продолжительность жизни." : id === "labs" ? "Холестерин, сахар, СРБ и омега-3 за год." : undefined);

  return (
    <div className="chat">
      <header className="c-top">
        <div className="c-top__inner">
          <Wordmark />
          <div className="c-who">
            <Mascot size={40} />
            <p>
              <b>Ала</b>
              <span aria-hidden="true">{typing && !done ? "печатает…" : "в сети"}</span>
            </p>
          </div>
          {forecast !== null && (
            <p className="c-forecast" key={decimal(forecast)}>
              <span>Прогноз</span> <b>{years(forecast)}</b>
            </p>
          )}
          <button type="button" className="c-tool" onClick={() => setStyle("classic")}>
            К обычной анкете
          </button>
        </div>
      </header>

      <main id="main" className="quiz c-main">
        <ol className="c-log" aria-label="Переписка">
          <Bot first>Привет! Я Ала, черепаха. Мы живём долго, и я знаю, от чего это зависит.</Bot>
          <Bot>Задам вопросы по очереди, а модель посчитает ваш прогноз. Отвечайте как есть: так он точнее.</Bot>
          {turns.map((t, i) => (
            <Fragment key={t.id}>
              <Bot first={i === 0 || !(turns[i - 1].reply || turns[i - 1].start !== undefined || turns[i - 1].closes)}>{nb(t.question)}</Bot>
              <Me>{t.answer}</Me>
              {t.reply && (
                <Bot first>
                  {t.reply}
                  {t.delta !== undefined && (
                    <span className={`c-delta${t.delta > 0.04 ? " is-up" : t.delta < -0.04 ? " is-down" : ""}`}>
                      {Math.abs(t.delta) < 0.04 ? "Прогноз не изменился" : `${signed(t.delta)} к прогнозу`}
                    </span>
                  )}
                </Bot>
              )}
              {t.start !== undefined && <Bot first>{`Старт такой: ${years(t.start)}. Это средний прогноз для вашего пола, возраста и страны. Посмотрим, куда его сдвинут ответы.`}</Bot>}
              {t.closes && (
                <li className="c-divider">
                  <span>Блок «{groupById(t.closes).title}» пройден</span>
                </li>
              )}
            </Fragment>
          ))}
          {!done && typing && (
            <li className="c-row c-row--bot">
              <Mascot size={32} />
              <p className="c-bubble c-typing" aria-label="Ала печатает">
                <i />
                <i />
                <i />
              </p>
            </li>
          )}
          {!done && !typing && (
            <li className="c-row c-row--bot c-row--now">
              <Mascot size={32} />
              <div className="c-bubble">
                {isChoice ? (
                  <h1 id="c-current" ref={headingRef} tabIndex={-1}>
                    {nb(questionOf(id))}
                  </h1>
                ) : (
                  <p className="c-ask" aria-hidden="true">
                    {nb(questionOf(id))}
                  </p>
                )}
                {help && <p className="c-help">{nb(help)}</p>}
              </div>
            </li>
          )}
          {done && (
            <>
              <Bot first>
                <span ref={doneRef} tabIndex={-1} className="c-done">
                  {`Готово! Ваш прогноз: ${years(done.hp)}.`}
                </span>
              </Bot>
              <Bot>{`За разговор он сдвинулся на ${signed(done.hp - done.start)}.`}</Bot>
              {done.reserve > 0.04 && <Bot>{`Ещё ${signed(done.reserve)} можно вернуть: в отчёте покажу, с чего начать.`}</Bot>}
            </>
          )}
        </ol>

        <div className="c-composer">
          {done ? (
            <button type="button" className="btn c-send" onClick={() => router.push("/result")}>
              Посмотреть результат
            </button>
          ) : (
            !typing && (
              <form onSubmit={onSubmit} noValidate key={id} className="c-form">
                {isChoice && (
                  <div className="c-chips" role="group" aria-labelledby="c-current">
                    {options.map((o) => {
                      const v = look.options?.[o.id];
                      const Glyph = v?.kind === "icon" ? v.icon : null;
                      return (
                        <button key={o.id} type="button" className="c-chip" aria-pressed={value === o.id} onClick={() => pick(o.id)}>
                          {Glyph && <Glyph size={18} strokeWidth={2} aria-hidden="true" />}
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {id === "name" && <NameStep headingRef={headingRef} />}
                {id === "age" && <AgeStep key="age" headingRef={headingRef} error={error} />}
                {factor?.kind === "country" && <CountryStep key={factor.slug} factor={factor} headingRef={headingRef} error={error} />}
                {factor?.kind === "bmi" && <BodyStep key="body" headingRef={headingRef} error={error} />}
                {isChoice && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <div className="c-actions">
                  {!isChoice && (
                    <button type="submit" className="btn c-send">
                      <SendHorizontal size={18} strokeWidth={2} aria-hidden="true" />
                      Отправить
                    </button>
                  )}
                  {step > 0 && (
                    <button type="button" className="c-back" onClick={flow.back}>
                      <CornerUpLeft size={16} strokeWidth={2} aria-hidden="true" />
                      Изменить прошлый ответ
                    </button>
                  )}
                </div>
              </form>
            )
          )}
        </div>
      </main>
    </div>
  );
}

function Bot({ children, first }: { children: ReactNode; first?: boolean }) {
  return (
    <li className={`c-row c-row--bot${first ? "" : " c-row--more"}`}>
      {first ? <Mascot size={32} /> : <span className="c-gap" aria-hidden="true" />}
      <p className="c-bubble">
        <span className="visually-hidden">Ала: </span>
        {children}
      </p>
    </li>
  );
}

function Me({ children }: { children: ReactNode }) {
  return (
    <li className="c-row c-row--me">
      <p className="c-bubble">
        <span className="visually-hidden">Вы: </span>
        {children}
      </p>
    </li>
  );
}
