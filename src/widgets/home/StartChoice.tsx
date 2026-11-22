"use client";

import { useRouter } from "next/navigation";
import { useHydrated, useQuiz } from "@/features/quiz/model/store";
import type { Sex } from "@/entities/result";

/** The test's first question on the close: a pick saves the answer and opens question two. */
export function StartChoice() {
  const router = useRouter();
  useHydrated();
  const pick = (sex: Sex) => {
    const s = useQuiz.getState();
    if (s.editing) s.cancelEdit();
    s.setSex(sex);
    s.goTo(1);
    router.push("/test");
  };
  return (
    <div className="close__options" role="group" aria-labelledby="first-question">
      <button type="button" className="choice-big" onClick={() => pick("female")}>
        Женский
      </button>
      <button type="button" className="choice-big" onClick={() => pick("male")}>
        Мужской
      </button>
    </div>
  );
}
