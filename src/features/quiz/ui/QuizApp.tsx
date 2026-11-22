"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FACTOR_BY_SLUG, groupById, type Factor } from "@/entities/factor";
import { nb } from "@/shared/lib/format";
import { isEditLink, readStepFromUrl as readStep, writeStepToUrl } from "@/shared/lib/step-url";
import { Options, Question, QuizTop, type HeadingRef } from "@/shared/ui/Quiz";
import { LABS_STEP, STEPS, totalFor } from "../model/steps";
import { validBody } from "../model/body";
import { useHydrated, useQuiz } from "../model/store";
import { BodyStep } from "./BodyStep";
import { CountryStep } from "./CountryStep";

const readStepFromUrl = () => readStep(STEPS.length);

/** First question without an answer: the furthest a link or the forward button may lead. */
function firstOpenStep(): number {
  const s = useQuiz.getState();
  const open = STEPS.findIndex((id, i) => {
    if (i > LABS_STEP && s.labs === "skip") return false;
    if (id === "sex") return !s.sex;
    if (id === "age") return !s.age;
    if (id === "labs") return !s.labs;
    if (id === "bmi") return !(s.height && s.weight);
    if (id === "name" || id === "country-next") return false;
    return !s.answers[id];
  });
  return open === -1 ? totalFor(s.labs) - 1 : open;
}

export function QuizApp() {
  const hydrated = useHydrated();
  const router = useRouter();
  const step = useQuiz((s) => s.step);
  const labs = useQuiz((s) => s.labs);
  const editing = useQuiz((s) => s.editing);
  const goTo = useQuiz((s) => s.goTo);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  /** How many questions this page pushed onto the browser history. */
  const depth = useRef(0);
  const [error, setError] = useState("");

  const id = STEPS[step];
  const factor = FACTOR_BY_SLUG.get(id);
  const total = totalFor(labs);
  const isLast = step >= total - 1;

  // Arriving: a link from the report edits one answer, the back button from the report edits too, a plain visit starts over.
  useEffect(() => {
    if (!hydrated) return;
    const state = useQuiz.getState();
    const fromUrl = readStepFromUrl();
    const editLink = isEditLink();
    if (editLink && state.history.length > 0 && fromUrl !== null) {
      // Already editing means a reload or a click in the report: the draft stays.
      if (state.editing) state.goTo(fromUrl);
      else state.startEdit(fromUrl);
    } else if (state.completed && fromUrl !== null && state.history.length > 0) state.startEdit(fromUrl);
    else if (state.editing) state.cancelEdit();
    else if (state.completed) state.restart();
    else if (fromUrl !== null) state.goTo(Math.min(fromUrl, firstOpenStep()));
    const arrived = useQuiz.getState();
    writeStepToUrl(arrived.step, "replace", arrived.editing);
  }, [hydrated]);

  useEffect(() => {
    const onPop = () => {
      const fromUrl = readStepFromUrl();
      if (fromUrl === null) return;
      const current = useQuiz.getState().step;
      depth.current = Math.max(depth.current + (fromUrl < current ? -1 : 1), 0);
      setError("");
      useQuiz.getState().goTo(Math.min(fromUrl, firstOpenStep()));
      const now = useQuiz.getState();
      writeStepToUrl(now.step, "replace", now.editing);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Number steps take the cursor straight into the first field; choice steps announce the question first.
    const field = document.querySelector<HTMLInputElement>(".quiz input[type='number'], .quiz input[type='text']");
    (field ?? headingRef.current)?.focus();
  }, [step, hydrated]);

  const showProblem = (problem: string) => {
    setError(problem);
    if (problem) {
      window.setTimeout(
        () => document.querySelector<HTMLElement>("[aria-invalid='true'], .option input, .quiz select")?.focus(),
        0,
      );
    }
    return Boolean(problem);
  };

  const finish = () => {
    const state = useQuiz.getState();
    const saved = state.editing ? state.amend() : state.complete();
    if (saved) router.push("/report");
  };

  const next = () => {
    const state = useQuiz.getState();
    const current = STEPS[state.step];
    commitDefaults(current);
    if (showProblem(validate(current))) return;
    if (state.step >= totalFor(useQuiz.getState().labs) - 1) {
      finish();
      return;
    }
    const target = state.step + 1;
    goTo(target);
    depth.current += 1;
    writeStepToUrl(target, "push", state.editing);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    next();
  };

  const back = () => {
    setError("");
    if (depth.current > 0) {
      window.history.back();
      return;
    }
    goTo(step - 1);
    writeStepToUrl(step - 1, "replace", editing);
  };

  const saveNow = () => {
    commitDefaults(id);
    if (showProblem(validate(id))) return;
    finish();
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
      <main id="main" className="quiz">
        <div className="container cols">
          <form className="quiz__form" onSubmit={onSubmit} noValidate>
            {id === "name" && <NameStep headingRef={headingRef} />}
            {id === "sex" && <SexStep headingRef={headingRef} onPick={editing ? noop : next} error={error} />}
            {id === "age" && <AgeStep key={`age-${editing}`} headingRef={headingRef} error={error} />}
            {id === "labs" && <LabsStep headingRef={headingRef} onPick={editing ? noop : next} error={error} />}
            {factor?.kind === "country" && <CountryStep key={factor.slug} factor={factor} headingRef={headingRef} error={error} />}
            {factor?.kind === "bmi" && <BodyStep key={`body-${editing}`} headingRef={headingRef} error={error} />}
            {factor?.kind === "choice" && (
              <ChoiceStep
                key={factor.slug}
                factor={factor}
                headingRef={headingRef}
                onPick={editing ? noop : next}
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
            <p>{nb(aside)}</p>
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

function NameStep({ headingRef }: { headingRef: HeadingRef }) {
  const name = useQuiz((s) => s.name);
  const setName = useQuiz((s) => s.setName);
  return (
    <fieldset>
      <Question headingRef={headingRef} title="Как вас зовут?" help="Можно не указывать." helpId="help-name" />
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
      <Question headingRef={headingRef} title="Ваш пол" help="У мужчин и женщин разная исходная продолжительность жизни." helpId="help-sex" />
      <Options
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

function AgeStep({ headingRef, error }: { headingRef: HeadingRef; error: string }) {
  const age = useQuiz((s) => s.age);
  const setAge = useQuiz((s) => s.setAge);
  const [raw, setRaw] = useState(age ? String(age) : "");
  return (
    <fieldset>
      <Question headingRef={headingRef} title="Сколько вам полных лет?" help="Тест рассчитан на взрослых от 18 до 99 лет." helpId="help-age" />
      <div className="numbers">
        <div className="number">
          <label htmlFor="age">Возраст</label>
          <input
            id="age"
            name="age"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min={18}
            max={99}
            value={raw}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "help-age age-error" : "help-age"}
            onChange={(e) => {
              setRaw(e.target.value);
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 18 && n <= 99) setAge(n);
              else setAge(Number.NaN);
            }}
          />
          <span className="number__unit">лет</span>
        </div>
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
        headingRef={headingRef}
        title="Есть ли у вас свежие анализы крови?"
        help="Осталось четыре вопроса о холестерине, сахаре, воспалении и омега-3. Подойдут результаты за последний год."
        helpId="help-labs"
      />
      <Options
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
  return (
    <fieldset>
      <Question headingRef={headingRef} title={factor.question} help={factor.help} helpId={helpId} />
      <Options
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

/** The future country repeats the past one unless the person changes it. */
function commitDefaults(id: string) {
  if (id !== "country-next") return;
  const s = useQuiz.getState();
  const past = s.answers["country-before"];
  if (!s.answers[id] && past) s.answer(id, past);
}

function validate(id: string): string {
  const s = useQuiz.getState();
  if (id === "name") return "";
  if (id === "sex") return s.sex ? "" : "Выберите один из вариантов.";
  if (id === "age") return s.age && Number.isInteger(s.age) ? "" : "Введите возраст числом от 18 до 99.";
  if (id === "labs") return s.labs ? "" : "Выберите один из вариантов.";
  if (id === "bmi") {
    return s.height && s.weight && validBody(s.height, s.weight)
      ? ""
      : "Укажите рост и вес: от 120 до 230 см и от 30 до 300 кг.";
  }
  if (FACTOR_BY_SLUG.get(id)?.kind === "country") return s.answers[id] ? "" : "Выберите страну из списка.";
  return s.answers[id] ? "" : "Выберите один из вариантов.";
}
