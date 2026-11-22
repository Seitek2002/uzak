"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { PET_FACTOR_BY_SLUG, petHelp, petOptions, petQuestion, type PetFactor, type Species } from "@/entities/pet";
import { nb } from "@/shared/lib/format";
import { isEditLink, readStepFromUrl, writeStepToUrl } from "@/shared/lib/step-url";
import { Options, Question, QuizTop, type HeadingRef } from "@/shared/ui/Quiz";
import { PET_QUESTIONS, stepsFor } from "../model/steps";
import { ageOf, usePetHydrated, usePetQuiz } from "../model/store";
import { FALLBACK_PET_LOOK, PET_LOOKS } from "./visuals";

/** First question without an answer, or -1 when the sheet is complete. */
function missingStep(): number {
  const s = usePetQuiz.getState();
  return stepsFor(s.species).findIndex((id) => {
    if (id === "species") return !s.species;
    if (id === "name") return false;
    if (id === "sex") return !s.sex;
    if (id === "age") return !(ageOf(s.years, s.months) > 0);
    return !s.answers[id];
  });
}

/** The furthest a link or the forward button may lead. */
function firstOpenStep(): number {
  const open = missingStep();
  return open === -1 ? stepsFor(usePetQuiz.getState().species).length - 1 : open;
}

export function PetQuizApp() {
  const hydrated = usePetHydrated();
  const router = useRouter();
  const step = usePetQuiz((s) => s.step);
  const species = usePetQuiz((s) => s.species);
  const editing = usePetQuiz((s) => s.editing);
  const goTo = usePetQuiz((s) => s.goTo);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const depth = useRef(0);
  const [error, setError] = useState("");

  const steps = stepsFor(species);
  const id = steps[step] ?? "species";
  const factor = PET_FACTOR_BY_SLUG.get(id);
  const total = steps.length;
  const isLast = step >= total - 1;

  useEffect(() => {
    if (!hydrated) return;
    const state = usePetQuiz.getState();
    // The link may point at the longer list of the last pet, not at the list of the draft.
    const fromUrl = readStepFromUrl(PET_QUESTIONS);
    if (fromUrl !== null && state.history.length > 0 && (isEditLink() || state.completed)) {
      if (state.editing) state.goTo(fromUrl);
      else state.startEdit(fromUrl);
    } else if (state.completed || state.editing) state.restart();
    else if (fromUrl !== null) state.goTo(Math.min(fromUrl, firstOpenStep()));
    const arrived = usePetQuiz.getState();
    writeStepToUrl(arrived.step, "replace", arrived.editing);
  }, [hydrated]);

  useEffect(() => {
    const onPop = () => {
      const fromUrl = readStepFromUrl(stepsFor(usePetQuiz.getState().species).length);
      if (fromUrl === null) return;
      const current = usePetQuiz.getState().step;
      depth.current = Math.max(depth.current + (fromUrl < current ? -1 : 1), 0);
      setError("");
      usePetQuiz.getState().goTo(Math.min(fromUrl, firstOpenStep()));
      const now = usePetQuiz.getState();
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
    const field = document.querySelector<HTMLInputElement>(".quiz input[type='number'], .quiz input[type='text']");
    (field ?? headingRef.current)?.focus();
  }, [step, hydrated]);

  const showProblem = (problem: string) => {
    setError(problem);
    if (problem) {
      window.setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid='true'], .option input")?.focus(), 0);
    }
    return Boolean(problem);
  };

  const finish = () => {
    const state = usePetQuiz.getState();
    const missing = missingStep();
    if (missing !== -1) {
      goTo(missing);
      writeStepToUrl(missing, "push", state.editing);
      depth.current += 1;
      showProblem("Для отчёта не хватает ответа на этот вопрос.");
      return;
    }
    const saved = state.editing ? state.amend() : state.complete();
    if (saved) router.push("/pet/report");
  };

  const next = () => {
    const state = usePetQuiz.getState();
    const list = stepsFor(state.species);
    if (showProblem(validate(list[state.step]))) return;
    if (state.step >= list.length - 1) {
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
    if (showProblem(validate(id))) return;
    finish();
  };

  const onPick = editing ? () => {} : next;

  return (
    <>
      <QuizTop step={step} total={total} />
      <main id="main" className="quiz">
        <div className="container cols">
          <form className="quiz__form" onSubmit={onSubmit} noValidate>
            {id === "species" && <SpeciesStep headingRef={headingRef} onPick={onPick} error={error} />}
            {id === "name" && <NameStep headingRef={headingRef} />}
            {id === "sex" && <SexStep headingRef={headingRef} onPick={onPick} error={error} />}
            {id === "age" && <AgeStep headingRef={headingRef} error={error} />}
            {factor && species && (
              <FactorStep key={factor.slug} factor={factor} species={species} headingRef={headingRef} onPick={onPick} error={error} />
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
            <p className="label">{factor ? factor.title : "О питомце"}</p>
            <details className="quiz__more" key={id}>
              <summary>Почему спрашиваем</summary>
              <p>{nb(factor?.summary ?? "Вид, пол и возраст задают исходную кривую: кошки и собаки разных размеров стареют с разной скоростью.")}</p>
            </details>
            <Link className="link" href="/pet" target="_blank" rel="noopener">
              Как это считается
              <span className="visually-hidden"> (откроется в новой вкладке)</span>
            </Link>
          </aside>
        </div>
      </main>
    </>
  );
}

function SpeciesStep({ headingRef, onPick, error }: { headingRef: HeadingRef; onPick: () => void; error: string }) {
  const species = usePetQuiz((s) => s.species);
  const setSpecies = usePetQuiz((s) => s.setSpecies);
  return (
    <fieldset>
      <Question look={PET_LOOKS.species} headingRef={headingRef} title="Кто ваш питомец?" help="Модель построена на данных о кошках и собаках." helpId="help-species" />
      <Options
        look={PET_LOOKS.species}
        name="species"
        value={species}
        onChange={(v) => setSpecies(v as Species)}
        onPick={onPick}
        describedBy="help-species"
        error={error}
        options={[
          { id: "cat", label: "Кошка или кот" },
          { id: "dog", label: "Собака" },
        ]}
      />
    </fieldset>
  );
}

function NameStep({ headingRef }: { headingRef: HeadingRef }) {
  const name = usePetQuiz((s) => s.name);
  const setName = usePetQuiz((s) => s.setName);
  return (
    <fieldset>
      <Question look={PET_LOOKS.name} headingRef={headingRef} title="Как зовут питомца?" help="Необязательно: имя появится в отчёте. Можно пропустить." helpId="help-name" />
      <div className="text-field">
        <label htmlFor="pet-name">Кличка</label>
        <input
          id="pet-name"
          name="pet-name"
          type="text"
          autoComplete="off"
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
  const sex = usePetQuiz((s) => s.sex);
  const setSex = usePetQuiz((s) => s.setSex);
  return (
    <fieldset>
      <Question look={PET_LOOKS.sex} headingRef={headingRef} title="Это мальчик или девочка?" help="Самки обоих видов в среднем живут немного дольше." helpId="help-pet-sex" />
      <Options
        look={PET_LOOKS.sex}
        name="pet-sex"
        value={sex}
        onChange={(v) => setSex(v as "male" | "female")}
        onPick={onPick}
        describedBy="help-pet-sex"
        error={error}
        options={[
          { id: "female", label: "Девочка" },
          { id: "male", label: "Мальчик" },
        ]}
      />
    </fieldset>
  );
}

function AgeStep({ headingRef, error }: { headingRef: HeadingRef; error: string }) {
  const years = usePetQuiz((s) => s.years);
  const months = usePetQuiz((s) => s.months);
  const setAge = usePetQuiz((s) => s.setAge);
  const [y, setY] = useState(years !== undefined ? String(years) : "");
  const [m, setM] = useState(months ? String(months) : "");
  const update = (ny: string, nm: string) => {
    const a = ny === "" ? undefined : Number(ny);
    const b = nm === "" ? undefined : Number(nm);
    const okY = a === undefined || (Number.isInteger(a) && a >= 0 && a <= 30);
    const okM = b === undefined || (Number.isInteger(b) && b >= 0 && b <= 11);
    setAge(okY ? a : undefined, okM ? b : undefined);
  };
  return (
    <fieldset>
      <Question look={PET_LOOKS.age} headingRef={headingRef} title="Сколько питомцу лет?" help="Если точно не знаете, укажите примерно." helpId="help-pet-age" />
      <div className="numbers">
        <div className="number">
          <label htmlFor="pet-years">Лет</label>
          <input
            id="pet-years"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min={0}
            max={30}
            value={y}
            aria-invalid={error ? true : undefined}
            aria-describedby="help-pet-age pet-age-error"
            onChange={(e) => {
              setY(e.target.value);
              update(e.target.value, m);
            }}
          />
          <span className="number__unit">полных лет</span>
        </div>
        <div className="number">
          <label htmlFor="pet-months">Месяцев</label>
          <input
            id="pet-months"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min={0}
            max={11}
            value={m}
            aria-describedby="help-pet-age pet-age-error"
            onChange={(e) => {
              setM(e.target.value);
              update(y, e.target.value);
            }}
          />
          <span className="number__unit">сверх лет</span>
        </div>
      </div>
      <p className="error" id="pet-age-error" role="alert">
        {error}
      </p>
    </fieldset>
  );
}

function FactorStep({
  factor,
  species,
  headingRef,
  onPick,
  error,
}: {
  factor: PetFactor;
  species: Species;
  headingRef: HeadingRef;
  onPick: () => void;
  error: string;
}) {
  const value = usePetQuiz((s) => s.answers[factor.slug]);
  const answer = usePetQuiz((s) => s.answer);
  const help = petHelp(factor, species);
  const helpId = `help-pet-${factor.slug}`;
  const look = PET_LOOKS[factor.slug] ?? FALLBACK_PET_LOOK;
  return (
    <fieldset>
      <Question look={look} headingRef={headingRef} title={petQuestion(factor, species)} help={help} helpId={helpId} />
      <Options
        look={look}
        name={`pet-${factor.slug}`}
        value={value}
        onChange={(v) => answer(factor.slug, v)}
        onPick={onPick}
        describedBy={help ? helpId : undefined}
        error={error}
        options={petOptions(factor, species)}
      />
    </fieldset>
  );
}

function validate(id: string): string {
  const s = usePetQuiz.getState();
  if (id === "species") return s.species ? "" : "Выберите один из вариантов.";
  if (id === "name") return "";
  if (id === "sex") return s.sex ? "" : "Выберите один из вариантов.";
  if (id === "age") {
    const age = ageOf(s.years, s.months);
    return age > 0 && age <= 30 ? "" : "Укажите возраст: от 0 до 30 лет и от 0 до 11 месяцев, хотя бы одно больше нуля.";
  }
  return s.answers[id] ? "" : "Выберите один из вариантов.";
}
