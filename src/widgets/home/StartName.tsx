"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { STEPS } from "@/features/quiz/model/steps";
import { useHydrated, useQuiz } from "@/features/quiz/model/store";

/** The test's first question on the close: the name is saved and the test opens on the next one. */
export function StartName() {
  const router = useRouter();
  useHydrated();
  const [name, setName] = useState("");

  const start = (e: FormEvent) => {
    e.preventDefault();
    const s = useQuiz.getState();
    if (s.editing) s.cancelEdit();
    if (name.trim()) s.setName(name);
    s.goTo(STEPS.indexOf("name") + 1);
    router.push("/test");
  };

  return (
    <form className="start-name" onSubmit={start}>
      <div className="text-field">
        <label htmlFor="first-name">Как вас зовут?</label>
        <input
          id="first-name"
          type="text"
          autoComplete="given-name"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <button type="submit" className="choice-big">
        Начать
      </button>
    </form>
  );
}
