/*
 * What to do, in two to four words, for the picture that goes to social
 * networks. It is shown to other people, so it names the action and never the
 * diagnosis or the number behind it. Every factor with an improvement has one,
 * checked by scripts/validate-model.ts.
 */

const ACTIONS: Record<string, string> = {
  smoking: "Бросить курить",
  alcohol: "Пить меньше алкоголя",
  sleep: "Наладить сон",
  activity: "Больше двигаться",
  strength: "Добавить силовые",
  muscle: "Укрепить мышцы",
  steps: "Больше ходить",
  "fruits-vegetables": "Больше овощей и фруктов",
  "processed-meat": "Меньше колбасы",
  "sugary-drinks": "Меньше сладких напитков",
  bmi: "Снизить вес",
  "blood-pressure": "Снизить давление",
  "heart-rate": "Тренировать сердце",
  "seat-belt": "Всегда пристёгиваться",
  "phone-driving": "За рулём без телефона",
  motorcycle: "Реже ездить на мотоцикле",
  "close-people": "Больше близкого общения",
  distress: "Снизить стресс",
  ldl: "Снизить холестерин",
  hba1c: "Снизить сахар крови",
  crp: "Снизить воспаление",
  omega3: "Больше жирной рыбы",
};

/** Answers for which the usual action would be wrong. */
const BY_ANSWER: Record<string, string> = {
  "smoking:quit": "Не возвращаться к курению",
  "smoking:smokeless": "Отказаться от вейпа и табака",
  "bmi:lt18": "Набрать вес",
  "bmi:18to20": "Набрать немного веса",
};

export const actionFor = (slug: string, answer: string): string | undefined => BY_ANSWER[`${slug}:${answer}`] ?? ACTIONS[slug];
