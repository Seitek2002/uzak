"use client";

import "@/styles/touch.css";
import { ArrowLeft, Coins } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { FACTOR_BY_SLUG, groupById } from "@/entities/factor";
import { answersBefore, hpOf, reserveOf } from "@/features/journey/model/hp";
import { useQuizFlow } from "@/features/quiz/model/flow";
import { STEPS, totalFor } from "@/features/quiz/model/steps";
import { useQuiz } from "@/features/quiz/model/store";
import { BodyStep } from "@/features/quiz/ui/BodyStep";
import { CountryStep } from "@/features/quiz/ui/CountryStep";
import { AgeStep, NameStep } from "@/features/quiz/ui/QuizApp";
import { FALLBACK_LOOK, LOOKS } from "@/features/quiz/ui/visuals";
import { decimal, delta as signed, plural } from "@/shared/lib/format";
import { AUTO_ADVANCE_MS, Question } from "@/shared/ui/Quiz";
import type { Visual } from "@/shared/ui/Visual";
import { Wordmark } from "@/shared/ui/Wordmark";
import { Jar } from "./Jar";
import { Glasses, Plate, Pulse, Sleep, Steps, TOUCH } from "./Widgets";

/*
 * "Копилка лет": every answer drops years into a jar or lifts some out to the
 * reserve beside it. Five questions are answered by doing: a plate, glasses,
 * moons of sleep, steps and a pulse counted on the spot.
 */

const PATH_FROM = STEPS.indexOf("country-next") + 1;
const HOLD_MS = 1000;
const YEARS: [string, string, string] = ["год", "года", "лет"];
const years = (n: number) => `${decimal(n)} ${plural(n, YEARS)}`;
const SEX = [
  { id: "female", label: "Женский" },
  { id: "male", label: "Мужской" },
];
const LABS = [
  { id: "yes", label: "Да, посмотрю цифры" },
  { id: "skip", label: "Нет, пропустить и посчитать результат" },
];

export function TouchApp() {
  const router = useRouter();
  const flow = useQuizFlow();
  const { step, id, factor, error, headingRef } = flow;
  const sex = useQuiz((s) => s.sex);
  const age = useQuiz((s) => s.age);
  const answers = useQuiz((s) => s.answers);
  const labs = useQuiz((s) => s.labs);
  const setStyle = useQuiz((s) => s.setStyle);
  const answer = useQuiz((s) => s.answer);
  const setSex = useQuiz((s) => s.setSex);
  const setLabs = useQuiz((s) => s.setLabs);
  const [fx, setFx] = useState<{ key: number; delta: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [plain, setPlain] = useState(false);
  const [said, setSaid] = useState("");
  const [done, setDone] = useState<{ hp: number; start: number; reserve: number } | null>(null);
  const timers = useRef<number[]>([]);
  const doneRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  useEffect(() => setPlain(false), [step]);
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  const profile = sex && age ? { sex, age } : null;
  const onPath = step >= PATH_FROM;
  const known = useMemo(() => answersBefore(answers, STEPS, step), [answers, step]);
  const hp = done ? done.hp : profile && onPath ? hpOf(profile, known) : null;
  const reserve = done ? done.reserve : profile && onPath ? reserveOf(profile, known) : 0;
  const shownHp = hp !== null && fx ? hp + fx.delta : hp;
  const level = shownHp !== null && profile ? (shownHp - profile.age) / Math.max(100 - profile.age, 1) : 0;
  const total = totalFor(labs);

  const finish = () => {
    const s = useQuiz.getState();
    if (!s.sex || !s.age) return;
    const p = { sex: s.sex, age: s.age };
    s.complete();
    setDone({ hp: hpOf(p, s.answers), start: hpOf(p, answersBefore(s.answers, STEPS, PATH_FROM)), reserve: reserveOf(p, s.answers) });
  };

  const resolve = () => {
    if (busy || done) return;
    const problem = flow.check();
    if (problem) {
      flow.showProblem(problem);
      return;
    }
    const s = useQuiz.getState();
    const f = FACTOR_BY_SLUG.get(STEPS[s.step]);
    if (!profile || !onPath || !f || f.kind === "country") {
      flow.next(finish);
      return;
    }
    const before = hpOf(profile, answersBefore(s.answers, STEPS, s.step));
    const after = hpOf(profile, answersBefore(s.answers, STEPS, s.step + 1));
    const d = after - before;
    setFx({ key: Date.now(), delta: d });
    setSaid(`${signed(d)}. В копилке ${years(after)}.`);
    setBusy(true);
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timers.current.push(
      window.setTimeout(() => {
        setBusy(false);
        setFx(null);
        flow.next(finish);
      }, calm ? 600 : HOLD_MS),
    );
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    resolve();
  };

  const isTouch = factor && TOUCH.has(factor.slug) && !plain;
  const isChoice = !isTouch && (factor?.kind === "choice" || id === "sex" || id === "labs");
  const look = factor ? (LOOKS[factor.slug] ?? FALLBACK_LOOK) : id === "sex" ? LOOKS.sex : id === "labs" ? LOOKS.labs : FALLBACK_LOOK;

  return (
    <div className="touch" data-busy={busy ? "true" : undefined}>
      <header className="t-top">
        <div className="t-top__inner">
          <Wordmark />
          <p className="t-top__step">{done ? "Готово" : `Вопрос ${step + 1} из ${total}`}</p>
          <button type="button" className="t-tool" onClick={() => setStyle("classic")}>
            К обычной анкете
          </button>
        </div>
        <span className="t-progress" aria-hidden="true">
          <i style={{ transform: `scaleX(${done ? 1 : (step + 1) / total})` }} />
        </span>
      </header>

      <section className="t-bank" aria-label="Копилка лет">
        <Jar level={onPath || done ? level : 0} fx={fx} />
        <div className="t-bank__text">
          <p className="t-bank__label">{hp === null ? "Копилка откроется после вопросов о вас" : "В копилке"}</p>
          {shownHp !== null && (
            <p className="t-bank__sum">
              <b>{decimal(shownHp)}</b> <span>{plural(1.5, YEARS)}</span>
            </p>
          )}
          {fx && (
            <p className={`t-bank__fx${fx.delta > 0.04 ? " is-up" : fx.delta < -0.04 ? " is-down" : ""}`} key={fx.key} aria-hidden="true">
              {signed(fx.delta)}
            </p>
          )}
        </div>
        {hp !== null && (
          <p className="t-reserve">
            <Coins size={18} strokeWidth={2} aria-hidden="true" />
            <span>
              Резерв <b>{signed(reserve)}</b>
            </span>
          </p>
        )}
      </section>
      <main id="main" className="quiz t-stage">
        <p className="visually-hidden" role="status">
          {said}
        </p>
        {done ? (
          <section className="t-done" aria-labelledby="t-done-title">
            <h1 id="t-done-title" ref={doneRef} tabIndex={-1}>
              Копилка собрана
            </h1>
            <p className="t-done__sum">
              <b>{decimal(done.hp)}</b> <span>{plural(1.5, YEARS)}</span>
            </p>
            <p>{`Со старта ${years(done.start)} копилка изменилась на ${signed(done.hp - done.start)}.`}</p>
            {done.reserve > 0.04 && <p>{`В резерве ещё ${signed(done.reserve)}: в отчёте есть квесты, чтобы их добрать.`}</p>}
            <button type="button" className="btn t-go" onClick={() => router.push("/result")}>
              Посмотреть результат
            </button>
          </section>
        ) : (
          <form className="t-form" onSubmit={onSubmit} noValidate key={`${id}-${plain}`}>
            <p className="t-block">{factor ? groupById(factor.group).title : id === "labs" ? "Анализы" : "О вас"}</p>
            {id === "name" && <NameStep headingRef={headingRef} />}
            {id === "age" && <AgeStep key="age" headingRef={headingRef} error={error} />}
            {factor?.kind === "country" && <CountryStep key={factor.slug} factor={factor} headingRef={headingRef} error={error} />}
            {factor?.kind === "bmi" && <BodyStep key="body" headingRef={headingRef} error={error} />}
            {isTouch && factor && (
              <fieldset>
                <Question look={look} headingRef={headingRef} title={factor.question} help={factor.help} helpId={`help-${factor.slug}`} />
                {factor.slug === "fruits-vegetables" && <Plate />}
                {factor.slug === "alcohol" && <Glasses />}
                {factor.slug === "sleep" && <Sleep error={error} />}
                {factor.slug === "steps" && <Steps error={error} />}
                {factor.slug === "heart-rate" && <Pulse onPlain={() => setPlain(true)} />}
                <p className="error" role="alert">
                  {error}
                </p>
              </fieldset>
            )}
            {isChoice && (
              <fieldset>
                {id === "sex" && <Question look={look} headingRef={headingRef} title="Ваш пол" help="У мужчин и женщин разная исходная продолжительность жизни." helpId="help-sex" />}
                {id === "labs" && <Question look={look} headingRef={headingRef} title="Есть ли у вас свежие анализы крови?" help="Холестерин, сахар, СРБ и омега-3 за год." helpId="help-labs" />}
                {factor && <Question look={look} headingRef={headingRef} title={factor.question} help={factor.help} helpId={`help-${factor.slug}`} />}
                <Tiles
                  name={id}
                  options={id === "sex" ? SEX : id === "labs" ? LABS : factor!.options}
                  value={id === "sex" ? sex : id === "labs" ? labs : answers[id]}
                  visuals={look.options}
                  disabled={busy}
                  describedBy={factor?.help ? `help-${factor.slug}` : id === "sex" ? "help-sex" : id === "labs" ? "help-labs" : undefined}
                  onChange={(v) => {
                    if (id === "sex") setSex(v as "male" | "female");
                    else if (id === "labs") setLabs(v as "yes" | "skip");
                    else answer(id, v);
                  }}
                  onPick={resolve}
                />
                <p className="error" role="alert">
                  {error}
                </p>
              </fieldset>
            )}
            <div className="t-nav">
              <button type="submit" className="btn t-go" disabled={busy}>
                {isTouch ? "Готово" : "Дальше"}
              </button>
              {step > 0 && (
                <button type="button" className="t-back" onClick={flow.back} disabled={busy}>
                  <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
                  Назад
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

/** Answers as big round-cornered tiles; a tap drops the answer into the jar. */
function Tiles({
  name,
  options,
  value,
  visuals,
  disabled,
  describedBy,
  onChange,
  onPick,
}: {
  name: string;
  options: { id: string; label: string }[];
  value?: string;
  visuals?: Record<string, Visual>;
  disabled: boolean;
  describedBy?: string;
  onChange: (id: string) => void;
  onPick: () => void;
}) {
  const pointer = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <ul className="t-tiles" onPointerDown={() => (pointer.current = true)}>
      {options.map((o, i) => {
        const v = visuals?.[o.id];
        const Glyph = v?.kind === "icon" ? v.icon : null;
        return (
          <li key={o.id} style={{ "--i": i } as CSSProperties}>
            <input
              type="radio"
              id={`${name}-${o.id}`}
              name={name}
              value={o.id}
              checked={value === o.id}
              disabled={disabled}
              aria-describedby={describedBy}
              onChange={() => {
                onChange(o.id);
                if (!pointer.current) return;
                pointer.current = false;
                window.clearTimeout(timer.current);
                timer.current = window.setTimeout(onPick, Math.round(AUTO_ADVANCE_MS / 2));
              }}
            />
            <label htmlFor={`${name}-${o.id}`} className="t-tile">
              <span className="t-tile__badge" aria-hidden="true">
                {Glyph ? (
                  <Glyph size={26} strokeWidth={2} />
                ) : v?.kind === "meter" ? (
                  <span className="t-meter">
                    {Array.from({ length: v.of }, (_, k) => (
                      <i key={k} className={k < v.level ? "is-on" : ""} />
                    ))}
                  </span>
                ) : null}
              </span>
              <span>{o.label}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
