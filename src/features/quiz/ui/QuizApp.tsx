"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { bmiBand, bmiOf, FACTOR_BY_SLUG, groupById, type Factor } from "@/entities/factor";
import { decimal, nb } from "@/shared/lib/format";
import { isEditLink, readStepFromUrl as readStep, writeStepToUrl } from "@/shared/lib/step-url";
import { Options, Question, QuizTop, type HeadingRef } from "@/shared/ui/Quiz";
import { LABS_STEP, STEPS, totalFor } from "../model/steps";
import { useHydrated, useQuiz } from "../model/store";

const HOME_COUNTRY = "KGZ";
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
    if (FACTOR_BY_SLUG.get(id)?.kind === "country") return false;
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
    if (editLink && state.history.length > 0 && fromUrl !== null) state.startEdit(fromUrl);
    else if (state.completed && fromUrl !== null && state.history.length > 0) state.startEdit(fromUrl);
    else if (state.completed) state.restart();
    else if (fromUrl !== null) state.goTo(Math.min(fromUrl, firstOpenStep()));
    writeStepToUrl(useQuiz.getState().step, "replace");
  }, [hydrated]);

  useEffect(() => {
    const onPop = () => {
      const fromUrl = readStepFromUrl();
      if (fromUrl === null) return;
      const current = useQuiz.getState().step;
      depth.current = Math.max(depth.current + (fromUrl < current ? -1 : 1), 0);
      setError("");
      useQuiz.getState().goTo(Math.min(fromUrl, firstOpenStep()));
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
    const field = document.querySelector<HTMLInputElement>(".quiz input[type='number']");
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
    writeStepToUrl(target, "push");
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
    writeStepToUrl(step - 1, "replace");
  };

  const saveNow = () => {
    commitDefaults(id);
    if (showProblem(validate(id))) return;
    finish();
  };

  const groupTitle = factor ? groupById(factor.group).title : id === "labs" ? "Анализы" : "О вас";
  const aside =
    factor?.summary ??
    (id === "labs"
      ? "Цифры анализов уточняют прогноз. Без них модель возьмёт средние значения, а отчёт подскажет, что сдать."
      : "Пол и возраст задают исходную кривую риска, от которой модель считает всё остальное.");

  return (
    <>
      <QuizTop step={step} total={total} />
      <main id="main" className="quiz">
        <div className="container cols">
          <form className="quiz__form" onSubmit={onSubmit} noValidate>
            {id === "sex" && <SexStep headingRef={headingRef} onPick={editing ? noop : next} error={error} />}
            {id === "age" && <AgeStep headingRef={headingRef} error={error} />}
            {id === "labs" && <LabsStep headingRef={headingRef} onPick={editing ? noop : next} error={error} />}
            {factor?.kind === "country" && <CountryStep key={factor.slug} factor={factor} headingRef={headingRef} />}
            {factor?.kind === "bmi" && <BodyStep headingRef={headingRef} error={error} />}
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

function CountryStep({ factor, headingRef }: { factor: Factor; headingRef: HeadingRef }) {
  const value = useQuiz((s) => s.answers[factor.slug] ?? defaultCountry(factor.slug, s.answers));
  const answer = useQuiz((s) => s.answer);
  const fieldId = `${factor.slug}-field`;
  return (
    <fieldset>
      <Question headingRef={headingRef} title={factor.question} help={factor.help} helpId={`help-${factor.slug}`} />
      <div className="select">
        <label htmlFor={fieldId}>Страна</label>
        <select
          id={fieldId}
          value={value}
          aria-describedby={factor.help ? `help-${factor.slug}` : undefined}
          onChange={(e) => answer(factor.slug, e.target.value)}
        >
          {factor.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}

const defaultCountry = (slug: string, answers: Record<string, string>) =>
  slug === "country-next" ? (answers["country-before"] ?? HOME_COUNTRY) : HOME_COUNTRY;

function BodyStep({ headingRef, error }: { headingRef: HeadingRef; error: string }) {
  const factor = FACTOR_BY_SLUG.get("bmi")!;
  const height = useQuiz((s) => s.height);
  const weight = useQuiz((s) => s.weight);
  const setBody = useQuiz((s) => s.setBody);
  const [h, setH] = useState(height ? String(height) : "");
  const [w, setW] = useState(weight ? String(weight) : "");
  const hn = Number(h.replace(",", "."));
  const wn = Number(w.replace(",", "."));
  const valid = validBody(hn, wn);
  const bmi = valid ? bmiOf(hn, wn) : null;
  const band = bmi !== null ? factor.options.find((o) => o.id === bmiBand(bmi)) : undefined;

  const update = (nh: string, nw: string) => {
    const a = Number(nh.replace(",", "."));
    const b = Number(nw.replace(",", "."));
    if (validBody(a, b)) setBody(a, b, bmiBand(bmiOf(a, b)));
    else useQuiz.setState({ height: undefined, weight: undefined });
  };

  return (
    <fieldset>
      <Question headingRef={headingRef} title={factor.question} help={factor.help} helpId="help-body" />
      <div className="numbers">
        <div className="number">
          <label htmlFor="height">Рост</label>
          <input
            id="height"
            name="height"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min={120}
            max={230}
            value={h}
            aria-invalid={error && !validHeight(hn) ? true : undefined}
            aria-describedby="help-body body-error"
            onChange={(e) => {
              setH(e.target.value);
              update(e.target.value, w);
            }}
          />
          <span className="number__unit">см</span>
        </div>
        <div className="number">
          <label htmlFor="weight">Вес</label>
          <input
            id="weight"
            name="weight"
            type="number"
            inputMode="decimal"
            autoComplete="off"
            min={30}
            max={300}
            step="0.1"
            value={w}
            aria-invalid={error && !validWeight(wn) ? true : undefined}
            aria-describedby="help-body body-error"
            onChange={(e) => {
              setW(e.target.value);
              update(h, e.target.value);
            }}
          />
          <span className="number__unit">кг</span>
        </div>
      </div>
      <p className="error" id="body-error" role="alert">
        {error}
      </p>
      <div className="bmi-live" aria-live="polite">
        {bmi !== null && (
          <>
            <span className="figure">{decimal(bmi)}</span>
            <span className="label">индекс массы тела{band ? `, ${bandWord(band.id)}` : ""}</span>
          </>
        )}
      </div>
    </fieldset>
  );
}

/** Plain words for the BMI band shown under the fields. */
function bandWord(id: string): string {
  if (id === "lt18") return "ниже нормы";
  if (id === "18to20") return "на нижней границе нормы";
  if (id === "20to25") return "в норме";
  if (id === "25to27" || id === "27to30") return "выше нормы";
  return "ожирение";
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

const validHeight = (h: number) => Number.isFinite(h) && h >= 120 && h <= 230;
const validWeight = (w: number) => Number.isFinite(w) && w >= 30 && w <= 300;
const validBody = (h: number, w: number) => validHeight(h) && validWeight(w);

/** A country step is answered by its preselected value even if the person did not touch the list. */
function commitDefaults(id: string) {
  const f = FACTOR_BY_SLUG.get(id);
  if (f?.kind !== "country") return;
  const s = useQuiz.getState();
  if (!s.answers[id]) s.answer(id, defaultCountry(id, s.answers));
}

function validate(id: string): string {
  const s = useQuiz.getState();
  if (id === "sex") return s.sex ? "" : "Выберите один из вариантов.";
  if (id === "age") return s.age && Number.isInteger(s.age) ? "" : "Введите возраст числом от 18 до 99.";
  if (id === "labs") return s.labs ? "" : "Выберите один из вариантов.";
  if (id === "bmi") {
    return s.height && s.weight && validBody(s.height, s.weight)
      ? ""
      : "Введите рост от 120 до 230 см и вес от 30 до 300 кг.";
  }
  if (FACTOR_BY_SLUG.get(id)?.kind === "country") return "";
  return s.answers[id] ? "" : "Выберите один из вариантов.";
}
