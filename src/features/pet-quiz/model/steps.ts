import { petFactorsFor, type Species } from "@/entities/pet";

/** Profile questions first, then the factors asked for the species. */
export const stepsFor = (species: Species | undefined): string[] => [
  "species",
  "name",
  "sex",
  "age",
  ...petFactorsFor(species ?? "dog").map((f) => f.slug),
];

/** The longer of the two lists, for texts that do not know the species yet. */
export const PET_QUESTIONS = Math.max(stepsFor("dog").length, stepsFor("cat").length);
export const PET_MINUTES = 3;
