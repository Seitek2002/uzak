export const SITE = {
  name: "Узак Өмүр",
  first: "Узак",
  second: "өмүр",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100",
  description:
    "Бесплатный тест на 37 вопросов: прогноз продолжительности жизни, биологический возраст и привычки, которые стоит изменить первыми.",
  /** Kept in step with features/quiz/model/steps.ts; scripts/validate-model.ts checks the number. */
  questions: 37,
  minutes: 7,
} as const;

export const NAV = [
  { href: "/factors", label: "Факторы" },
  { href: "/method", label: "Как считаем" },
  { href: "/report", label: "Мой отчёт" },
] as const;
