"use client";

import { lazy, Suspense } from "react";
import { useArrival } from "../model/flow";
import { useQuiz, type QuizStyle } from "../model/store";
import { QuizApp } from "./QuizApp";
import { StylePicker } from "./StylePicker";

/*
 * The game styles load only when someone picks them, so the plain form and the
 * choice screen stay as light as before.
 */
const loaders = {
  journey: () => import("@/features/journey/ui/JourneyApp").then((m) => ({ default: m.JourneyApp })),
  chat: () => import("@/features/chat-quiz/ui/ChatApp").then((m) => ({ default: m.ChatApp })),
  touch: () => import("@/features/touch-quiz/ui/TouchApp").then((m) => ({ default: m.TouchApp })),
};
type GameStyle = keyof typeof loaders;

const started = new Map<GameStyle, ReturnType<(typeof loaders)[GameStyle]>>();
const load = (style: GameStyle) => {
  if (!started.has(style)) started.set(style, loaders[style]());
  return started.get(style)!;
};
const VIEWS = {
  journey: lazy(() => load("journey")),
  chat: lazy(() => load("chat")),
  touch: lazy(() => load("touch")),
};

const preload = (style: GameStyle) => {
  void load(style).catch(() => started.delete(style));
};

/** The test page: the choice of style first, then the questions in that style. A correction is always the plain form. */
export function TestApp() {
  const hydrated = useArrival();
  const style = useQuiz((s) => s.style);
  const step = useQuiz((s) => s.step);
  const editing = useQuiz((s) => s.editing);
  if (!hydrated || (!editing && !style && step === 0)) return <StylePicker preload={preload} />;
  const mode: QuizStyle = editing ? "classic" : (style ?? "classic");
  if (mode === "classic") return <QuizApp />;
  const View = VIEWS[mode];
  return (
    <Suspense fallback={<Waiting />}>
      <View />
    </Suspense>
  );
}

function Waiting() {
  return (
    <main id="main" className="quiz">
      <div className="container">
        <p className="label" role="status">
          Загружаем стиль…
        </p>
      </div>
    </main>
  );
}
