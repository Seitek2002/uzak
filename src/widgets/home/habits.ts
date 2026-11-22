/** The four switches of the hero: from the answer of the sample person to a realistic better one. */
export const HABITS = [
  { id: "smoking", label: "Бросить курить", from: "heavy", to: "quit10" },
  { id: "steps", label: "Больше ходить", from: "lt4", to: "8to10" },
  { id: "bmi", label: "Снизить вес", from: "30to35", to: "25to27" },
  { id: "fruits-vegetables", label: "Есть больше овощей", from: "lt1", to: "3to4" },
] as const;

export type HabitId = (typeof HABITS)[number]["id"];
