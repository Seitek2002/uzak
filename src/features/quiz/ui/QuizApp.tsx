"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FACTOR_BY_SLUG, groupById, type Factor, type GroupId } from "@/entities/factor";
import { BadgeCheck } from "lucide-react";
import { nb } from "@/shared/lib/format";
import { Options, Question, QuizTop, type HeadingRef } from "@/shared/ui/Quiz";
import { Slider } from "@/shared/ui/Slider";
import { useQuizFlow } from "../model/flow";
import { STEPS } from "../model/steps";
import { useQuiz } from "../model/store";
import { BodyStep } from "./BodyStep";
import { CountryStep } from "./CountryStep";
import { FALLBACK_LOOK, LOOKS } from "./visuals";

/** The plain form: one question a screen, rows of answers. */
export function QuizApp() {
  const [milestone, setMilestone] = useState<{ title: string; n: number; of: number } | null>(null);
  const milestoneTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(milestoneTimer.current), []);

  const celebrate = (group: GroupId) => {
    const order = [...new Set(STEPS.flatMap((s) => FACTOR_BY_SLUG.get(s)?.group ?? []))];
    const of = useQuiz.getState().labs === "skip" ? order.length - 1 : order.length;
    setMilestone({ title: groupById(group).title, n: order.indexOf(group) + 1, of });
    window.clearTimeout(milestoneTimer.current);
    milestoneTimer.current = window.setTimeout(() => setMilestone(null), 2600);
  };

  const { step, id, factor, total, isLast, editing, error, headingRef, next, back, saveNow } = useQuizFlow({ onGroupDone: celebrate });
  const advance = () => {
    next();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    next();
  };

  const groupTitle = factor ? groupById(factor.group).title : id === "labs" ? "Анализы" : "О вас";
  const aside =
    factor?.summary ??
    (id === "name"
      ? "Имя нужно только для отчёта и картинки с результатом. Оно остаётся на этом устройстве."
      : id === "labs"
      ? "Цифры анализов уточняют прогноз. Без них модель возьмёт средние значения, а отчёт подскажет, что сдать."
      : "Пол и возраст задают исходную кривую риска, от которой модель считает всё остальное.");

  return (
    <>
      <QuizTop step={step} total={total} />
      <div className="toast-slot" role="status">
        {milestone && (
          <p className="toast" key={milestone.title}>
            <BadgeCheck size={28} strokeWidth={2} aria-hidden="true" />
            <span>
              <b>Блок «{milestone.title}» пройден</b>
              <span>
                Значок {milestone.n} из {milestone.of}
              </span>
            </span>
          </p>
        )}
      </div>
      <main id="main" className="quiz">
        <div className="container cols">
          <form className="quiz__form" onSubmit={onSubmit} noValidate>
            {id === "name" && <NameStep headingRef={headingRef} />}
            {id === "sex" && <SexStep headingRef={headingRef} onPick={editing ? noop : advance} error={error} />}
            {id === "age" && <AgeStep key={`age-${editing}`} headingRef={headingRef} error={error} />}
            {id === "labs" && <LabsStep headingRef={headingRef} onPick={editing ? noop : advance} error={error} />}
            {factor?.kind === "country" && <CountryStep key={factor.slug} factor={factor} headingRef={headingRef} error={error} />}
            {factor?.kind === "bmi" && <BodyStep key={`body-${editing}`} headingRef={headingRef} error={error} />}
            {factor?.kind === "choice" && (
              <ChoiceStep
                key={factor.slug}
                factor={factor}
                headingRef={headingRef}
                onPick={editing ? noop : advance}
                error={error}
              />
            )}
            <div className="quiz__nav">
              {editing ? (
                <>
                  <button type="button" className="btn" onClick={saveNow}>
                    Пересчитать отчёт
                  </button>
                  {!isLast && (
                    <button type="submit" className="link">
                      Следующий вопрос
                    </button>
                  )}
                </>
              ) : (
                <button type="submit" className="btn">
                  {isLast ? "Посчитать результат" : "Дальше"}
                </button>
              )}
              {step > 0 && (
                <button type="button" className="link" onClick={back}>
                  Назад к вопросу {step}
                </button>
              )}
            </div>
          </form>
          <aside className="quiz__aside" aria-label="Почему мы это спрашиваем">
            <p className="label">{groupTitle}</p>
            <details className="quiz__more" key={id}>
              <summary>Почему спрашиваем</summary>
              <p>{nb(aside)}</p>
            </details>
            {factor && (
              <Link className="link" href={`/factors/${factor.slug}`} target="_blank" rel="noopener">
                Как это считается
                <span className="visually-hidden"> (откроется в новой вкладке)</span>
              </Link>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}

const noop = () => {};

export function NameStep({ headingRef }: { headingRef: HeadingRef }) {
  const name = useQuiz((s) => s.name);
  const setName = useQuiz((s) => s.setName);
  return (
    <fieldset>
      <Question look={LOOKS.name} headingRef={headingRef} title="Как вас зовут?" help="Можно не указывать." helpId="help-name" />
      <div className="text-field">
        <label htmlFor="name">Имя</label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="given-name"
          maxLength={40}
          value={name}
          aria-describedby="help-name"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </fieldset>
  );
}

function SexStep({ headingRef, onPick, error }: { headingRef: HeadingRef; onPick: () => void; error: string }) {
  const sex = useQuiz((s) => s.sex);
  const setSex = useQuiz((s) => s.setSex);
  return (
    <fieldset>
      <Question look={LOOKS.sex} headingRef={headingRef} title="Ваш пол" help="У мужчин и женщин разная исходная продолжительность жизни." helpId="help-sex" />
      <Options
        look={LOOKS.sex}
        name="sex"
        value={sex}
        onChange={(v) => setSex(v as "male" | "female")}
        onPick={onPick}
        describedBy="help-sex"
        error={error}
        options={[
          { id: "female", label: "Женский" },
          { id: "male", label: "Мужской" },
        ]}
      />
    </fieldset>
  );
}

export function AgeStep({ headingRef, error }: { headingRef: HeadingRef; error: string }) {
  const age = useQuiz((s) => s.age);
  const setAge = useQuiz((s) => s.setAge);
  return (
    <fieldset>
      <Question look={LOOKS.age} headingRef={headingRef} title="Сколько вам полных лет?" help="Тест для взрослых от 18 до 99 лет." helpId="help-age" />
      <div className="sliders">
        <Slider
          id="age"
          label="Возраст"
          scale={{ min: 18, max: 99, step: 1, rest: 40, unit: "лет" }}
          base={age}
          inputMode="numeric"
          onBase={(n) => setAge(n !== undefined && Number.isInteger(n) && n >= 18 && n <= 99 ? n : Number.NaN)}
          invalid={Boolean(error)}
          describedBy="help-age age-error"
        />
      </div>
      <p className="error" id="age-error" role="alert">
        {error}
      </p>
    </fieldset>
  );
}

function LabsStep({ headingRef, onPick, error }: { headingRef: HeadingRef; onPick: () => void; error: string }) {
  const labs = useQuiz((s) => s.labs);
  const setLabs = useQuiz((s) => s.setLabs);
  return (
    <fieldset>
      <Question
        look={LOOKS.labs}
        headingRef={headingRef}
        title="Есть ли у вас свежие анализы крови?"
        help="Холестерин, сахар, СРБ и омега-3 за год."
        helpId="help-labs"
      />
      <Options
        look={LOOKS.labs}
        name="labs"
        value={labs}
        onChange={(v) => setLabs(v as "yes" | "skip")}
        onPick={onPick}
        describedBy="help-labs"
        error={error}
        options={[
          { id: "yes", label: "Да, посмотрю цифры" },
          { id: "skip", label: "Нет, пропустить и посчитать результат" },
        ]}
      />
    </fieldset>
  );
}

function ChoiceStep({
  factor,
  headingRef,
  onPick,
  error,
}: {
  factor: Factor;
  headingRef: HeadingRef;
  onPick: () => void;
  error: string;
}) {
  const value = useQuiz((s) => s.answers[factor.slug]);
  const answer = useQuiz((s) => s.answer);
  const helpId = `help-${factor.slug}`;
  const look = LOOKS[factor.slug] ?? FALLBACK_LOOK;
  return (
    <fieldset>
      <Question look={look} headingRef={headingRef} title={factor.question} help={factor.help} helpId={helpId} />
      <Options
        look={look}
        name={factor.slug}
        value={value}
        onChange={(v) => answer(factor.slug, v)}
        onPick={onPick}
        describedBy={factor.help ? helpId : undefined}
        error={error}
        options={factor.options}
      />
    </fieldset>
  );
}
