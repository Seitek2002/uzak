"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { dayKey, QUEST_DAYS, type Quest } from "./quests";

interface GameState {
  /** Quests under way, one per question. */
  quests: Record<string, Quest>;
  /** Finished quests, oldest first; the same question can come back as a new quest. */
  done: Quest[];
  start: (slug: string, from: string, to: string) => void;
  /** Ticks today or takes the tick back. */
  toggleToday: (slug: string) => void;
  finish: (slug: string, bonus: number) => void;
  drop: (slug: string) => void;
  wipe: () => void;
}

/** localStorage can throw in private windows or with blocked site data; quests then last one session. */
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
      /* kept in memory */
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

export const useGame = create<GameState>()(
  persist(
    (set) => ({
      quests: {},
      done: [],
      start: (slug, from, to) =>
        set((s) => ({ quests: { ...s.quests, [slug]: { slug, from, to, started: new Date().toISOString(), marks: [] } } })),
      toggleToday: (slug) =>
        set((s) => {
          const q = s.quests[slug];
          if (!q || q.done) return s;
          const today = dayKey();
          const marks = q.marks.includes(today) ? q.marks.filter((d) => d !== today) : [...q.marks, today].slice(-QUEST_DAYS * 2);
          return { quests: { ...s.quests, [slug]: { ...q, marks } } };
        }),
      finish: (slug, bonus) =>
        set((s) => {
          const q = s.quests[slug];
          if (!q) return s;
          const quests = { ...s.quests };
          delete quests[slug];
          return { quests, done: [...s.done, { ...q, done: new Date().toISOString(), bonus }] };
        }),
      drop: (slug) =>
        set((s) => {
          const quests = { ...s.quests };
          delete quests[slug];
          return { quests };
        }),
      wipe: () => set({ quests: {}, done: [] }),
    }),
    {
      name: "uzak-game-v1",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ quests, done }) => ({ quests, done }),
    },
  ),
);

const subscribe = (cb: () => void) => useGame.persist.onFinishHydration(cb);

/** False on the server and until the quests are read from the browser. */
export function useGameHydrated(): boolean {
  useEffect(() => {
    if (!useGame.persist.hasHydrated()) void useGame.persist.rehydrate();
  }, []);
  return useSyncExternalStore(subscribe, () => useGame.persist.hasHydrated(), () => false);
}
