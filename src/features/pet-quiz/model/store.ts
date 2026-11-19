"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { PetSex, Species } from "@/entities/pet";
import { stepsFor } from "./steps";

export interface PetAttempt {
  date: string;
  species: Species;
  sex: PetSex;
  /** Age in years, months as a fraction. */
  age: number;
  name?: string;
  answers: Record<string, string>;
}

interface PetQuizState {
  species?: Species;
  name: string;
  sex?: PetSex;
  years?: number;
  months?: number;
  answers: Record<string, string>;
  step: number;
  completed: boolean;
  editing: boolean;
  history: PetAttempt[];
  setSpecies: (species: Species) => void;
  setName: (name: string) => void;
  setSex: (sex: PetSex) => void;
  setAge: (years: number | undefined, months: number | undefined) => void;
  answer: (slug: string, option: string) => void;
  goTo: (step: number) => void;
  complete: () => PetAttempt | null;
  startEdit: (step: number) => void;
  amend: () => PetAttempt | null;
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
      /* kept in memory until the tab closes */
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
  species: undefined,
  name: "",
  sex: undefined,
  years: undefined,
  months: undefined,
  answers: {},
  step: 0,
  completed: false,
  editing: false,
};

export const ageOf = (years?: number, months?: number) => (years ?? 0) + (months ?? 0) / 12;

const attemptOf = (s: PetQuizState, date: string): PetAttempt | null => {
  const age = ageOf(s.years, s.months);
  if (!s.species || !s.sex || !(age > 0)) return null;
  return { date, species: s.species, sex: s.sex, age, name: s.name.trim() || undefined, answers: s.answers };
};

export const usePetQuiz = create<PetQuizState>()(
  persist(
    (set, get) => ({
      ...blank,
      history: [],
      setSpecies: (species) =>
        set((s) => (s.species === species ? {} : { species, answers: species === "cat" ? omit(s.answers, "size") : s.answers })),
      setName: (name) => set({ name: name.slice(0, 40) }),
      setSex: (sex) => set({ sex }),
      setAge: (years, months) => set({ years, months }),
      answer: (slug, option) => set((s) => ({ answers: { ...s.answers, [slug]: option } })),
      goTo: (step) => set((s) => ({ step: Math.min(Math.max(step, 0), stepsFor(s.species).length - 1), completed: false })),
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
        const years = Math.floor(last.age);
        set({
          species: last.species,
          sex: last.sex,
          name: last.name ?? "",
          years,
          months: Math.round((last.age - years) * 12),
          answers: { ...last.answers },
          step: Math.min(Math.max(step, 0), stepsFor(last.species).length - 1),
          completed: false,
          editing: true,
        });
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
      restart: () => set({ ...blank }),
      wipe: () => set({ ...blank, history: [] }),
    }),
    {
      name: "uzak-pet-v1",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ species, name, sex, years, months, answers, step, completed, editing, history }) => ({
        species,
        name,
        sex,
        years,
        months,
        answers,
        step,
        completed,
        editing,
        history,
      }),
    },
  ),
);

function omit(answers: Record<string, string>, key: string) {
  const next = { ...answers };
  delete next[key];
  return next;
}

const subscribeHydration = (cb: () => void) => usePetQuiz.persist.onFinishHydration(cb);

/** False on the server and until the saved answers are read from the browser. */
export function usePetHydrated(): boolean {
  useEffect(() => {
    if (!usePetQuiz.persist.hasHydrated()) void usePetQuiz.persist.rehydrate();
  }, []);
  return useSyncExternalStore(subscribeHydration, () => usePetQuiz.persist.hasHydrated(), () => false);
}
