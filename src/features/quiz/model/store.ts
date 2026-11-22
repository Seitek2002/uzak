"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { Answers, Profile, Sex } from "@/entities/result";
import { LABS_STEP, TEST_SLUGS, TOTAL } from "./steps";

export interface Attempt {
  date: string;
  profile: Profile;
  answers: Answers;
  /** Height and weight, kept so the report can show the BMI. */
  body?: { height: number; weight: number };
}

interface QuizState {
  sex?: Sex;
  age?: number;
  height?: number;
  weight?: number;
  answers: Answers;
  /** Answer to the fork before the blood tests. */
  labs?: "yes" | "skip";
  step: number;
  /** Set when an attempt is saved; the next visit to the test starts from question one. */
  completed: boolean;
  /** Changing answers of the last attempt instead of starting a new one. */
  editing: boolean;
  history: Attempt[];
  setSex: (sex: Sex) => void;
  setAge: (age: number) => void;
  /** Height, weight and the BMI band the quiz computed from them. */
  setBody: (height: number, weight: number, band: string) => void;
  answer: (slug: string, option: string) => void;
  setLabs: (labs: "yes" | "skip") => void;
  goTo: (step: number) => void;
  complete: () => Attempt | null;
  /** Loads the last attempt back into the test to change some answers. */
  startEdit: (step: number) => void;
  /** Drops an abandoned edit: the saved attempt stays as it was and the test starts over. */
  cancelEdit: () => void;
  /** Saves the changed answers over the last attempt. */
  amend: () => Attempt | null;
  restart: () => void;
  wipe: () => void;
}

/** localStorage can throw in private windows or with blocked site data; the test still works for one session. */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* the answers live in memory until the tab closes */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* nothing stored */
    }
  },
};

const blank = {
  sex: undefined,
  age: undefined,
  height: undefined,
  weight: undefined,
  answers: {},
  labs: undefined,
  step: 0,
  completed: false,
  editing: false,
};

const attemptOf = (s: Pick<QuizState, "sex" | "age" | "answers" | "height" | "weight">, date: string): Attempt | null =>
  s.sex && s.age
    ? {
        date,
        profile: { sex: s.sex, age: s.age },
        answers: s.answers,
        body: s.height && s.weight ? { height: s.height, weight: s.weight } : undefined,
      }
    : null;

export const useQuiz = create<QuizState>()(
  persist(
    (set, get) => ({
      ...blank,
      history: [],
      setSex: (sex) => set({ sex }),
      setAge: (age) => set({ age }),
      setBody: (height, weight, band) => set((s) => ({ height, weight, answers: { ...s.answers, bmi: band } })),
      answer: (slug, option) => set((s) => ({ answers: { ...s.answers, [slug]: option } })),
      setLabs: (labs) =>
        set((s) => {
          if (labs === "yes") return { labs };
          // Without results the model takes average values; the report then lists the tests to take.
          const answers = { ...s.answers };
          for (const slug of TEST_SLUGS) answers[slug] = "unknown";
          return { labs, answers };
        }),
      goTo: (step) => set({ step: Math.min(Math.max(step, 0), TOTAL - 1), completed: false }),
      complete: () => {
        const state = get();
        const attempt = attemptOf(state, new Date().toISOString());
        if (!attempt) return null;
        set({ history: [...state.history, attempt].slice(-12), completed: true, editing: false });
        return attempt;
      },
      startEdit: (step) => {
        const last = get().history.at(-1);
        if (!last) return;
        set({
          sex: last.profile.sex,
          age: last.profile.age,
          height: last.body?.height,
          weight: last.body?.weight,
          answers: { ...last.answers },
          // Opening a blood test for editing means the person has the number now.
          labs: step <= LABS_STEP && TEST_SLUGS.every((slug) => last.answers[slug] === "unknown") ? "skip" : "yes",
          step: Math.min(Math.max(step, 0), TOTAL - 1),
          completed: false,
          editing: true,
        });
      },
      cancelEdit: () => {
        get().startEdit(0);
        get().restart();
      },
      amend: () => {
        const state = get();
        const last = state.history.at(-1);
        if (!last) return state.complete();
        const attempt = attemptOf(state, last.date);
        if (!attempt) return null;
        set({ history: [...state.history.slice(0, -1), attempt], completed: true, editing: false });
        return attempt;
      },
      restart: () => set({ step: 0, completed: false, editing: false }),
      wipe: () => set({ ...blank, history: [] }),
    }),
    {
      name: "uzak-v1",
      version: 1,
      // The server renders the blank state; saved answers are read after mount so the markup always matches.
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ sex, age, height, weight, answers, labs, step, completed, editing, history }) => ({
        sex,
        age,
        height,
        weight,
        answers,
        labs,
        step,
        completed,
        editing,
        history,
      }),
    },
  ),
);

const subscribeHydration = (cb: () => void) => useQuiz.persist.onFinishHydration(cb);

/** False on the server and until the saved answers are read from the browser; reads them on first use. */
export function useHydrated(): boolean {
  useEffect(() => {
    if (!useQuiz.persist.hasHydrated()) void useQuiz.persist.rehydrate();
  }, []);
  return useSyncExternalStore(subscribeHydration, () => useQuiz.persist.hasHydrated(), () => false);
}
