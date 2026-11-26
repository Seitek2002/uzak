"use client";

/*
 * How the test moves between questions, shared by every way of taking it: the
 * plain form and the game styles show the same steps over the same store.
 * The question number lives in the address bar, so the phone's back button
 * returns to the previous question.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FACTOR_BY_SLUG, type GroupId } from "@/entities/factor";
import { isEditLink, readStepFromUrl as readStep, writeStepToUrl } from "@/shared/lib/step-url";
import { validBody } from "./body";
import { LABS_STEP, STEPS, totalFor } from "./steps";
import { useHydrated, useQuiz } from "./store";

const readStepFromUrl = () => readStep(STEPS.length);

/** First question without an answer: the furthest a link or the forward button may lead. */
export function firstOpenStep(): number {
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

/**
 * Arriving on the test, once per page: a link from the report edits one
 * answer, the back button from the report edits too, a plain visit starts over.
 */
export function useArrival(): boolean {
  const hydrated = useHydrated();
  // Nothing is shown from the saved state until the arrival has decided what it means.
  const [arrived, setArrived] = useState(false);
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
    // Every visit from a link asks for the style again; the saved answers stay. A reload keeps it.
    if (fromUrl === null && !useQuiz.getState().editing) useQuiz.getState().setStyle(undefined);
    const now = useQuiz.getState();
    writeStepToUrl(now.step, "replace", now.editing);
    setArrived(true);
  }, [hydrated]);
  return hydrated && arrived;
}

export interface FlowOptions {
  /** Called when the last question of a block is answered, before moving on. */
  onGroupDone?: (group: GroupId) => void;
  /** Where a finished new attempt goes; a correction always returns to the report. */
  finishTo?: string;
}

/** Steps, the address bar and the browser history for one way of showing the test. */
export function useQuizFlow({ onGroupDone, finishTo = "/result" }: FlowOptions = {}) {
  const router = useRouter();
  const hydrated = useHydrated();
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
        () => document.querySelector<HTMLElement>("[aria-invalid='true'], .option input, .j-slot input, .quiz select")?.focus(),
        0,
      );
    }
    return Boolean(problem);
  };

  const finish = () => {
    const state = useQuiz.getState();
    const { editing: wasEditing } = state;
    const saved = wasEditing ? state.amend() : state.complete();
    // A new attempt opens on the one-screen result; a correction returns to the report it came from.
    if (saved) router.push(wasEditing ? "/report" : finishTo);
    return saved;
  };

  /** The problem with the current answer, empty when it can be accepted. */
  const check = () => {
    const current = STEPS[useQuiz.getState().step];
    commitDefaults(current);
    return validate(current);
  };

  /** Accepts the answer and moves on; `atEnd` replaces saving the attempt on the last question. */
  const next = (atEnd?: () => void) => {
    const state = useQuiz.getState();
    const current = STEPS[state.step];
    if (showProblem(check())) return false;
    if (state.step >= totalFor(useQuiz.getState().labs) - 1) {
      if (atEnd) atEnd();
      else finish();
      return true;
    }
    const target = state.step + 1;
    const doneGroup = FACTOR_BY_SLUG.get(current)?.group;
    const nextGroup = FACTOR_BY_SLUG.get(STEPS[target])?.group;
    if (doneGroup && doneGroup !== nextGroup && !state.editing) onGroupDone?.(doneGroup);
    goTo(target);
    depth.current += 1;
    writeStepToUrl(target, "push", state.editing);
    return true;
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
    if (showProblem(check())) return;
    finish();
  };

  return { hydrated, step, id, factor, total, isLast, editing, error, setError, showProblem, headingRef, check, next, back, saveNow, finish };
}

/** The future country repeats the past one unless the person changes it. */
export function commitDefaults(id: string) {
  if (id !== "country-next") return;
  const s = useQuiz.getState();
  const past = s.answers["country-before"];
  if (!s.answers[id] && past) s.answer(id, past);
}

export function validate(id: string): string {
  const s = useQuiz.getState();
  if (id === "name") return "";
  if (id === "sex") return s.sex ? "" : "Выберите один из вариантов.";
  if (id === "age") return s.age && Number.isInteger(s.age) ? "" : "Введите возраст числом от 18 до 99.";
  if (id === "labs") return s.labs ? "" : "Выберите один из вариантов.";
  if (id === "bmi") {
    return s.height && s.weight && validBody(s.height, s.weight)
      ? ""
      : "Укажите рост от 120 до 230 см (от 3′11″ до 7′7″) и вес от 30 до 300 кг (от 66 до 661 фунта).";
  }
  if (FACTOR_BY_SLUG.get(id)?.kind === "country") return s.answers[id] ? "" : "Выберите страну из списка.";
  return s.answers[id] ? "" : "Выберите один из вариантов.";
}
