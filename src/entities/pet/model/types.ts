import type { Source } from "../../factor/model/types.ts";

export type Species = "dog" | "cat";
export type PetSex = "male" | "female";

/** Baseline group: cats are one group, dogs differ by adult size. */
export type PetGroup = "cat" | "dog-small" | "dog-medium" | "dog-large" | "dog-giant";

export interface PetOption {
  id: string;
  label: string;
  /** Hazard ratio against the healthiest option (1.0). */
  hr: number;
  /** Ratios by sex when the cohorts show a clear difference; they override hr. */
  hrBySex?: Record<PetSex, number>;
  /** Extra yearly death risk from accidents, for roaming outside. */
  lambda?: number;
  /** "I do not know": counts as the typical answer and becomes a vet check. */
  unknown?: boolean;
  /** Where a realistic improvement leads. */
  improveTo?: string;
  /** How this option reads as a goal in the report, where the label does not fit. */
  goal?: string;
  /** For the dog size question: the baseline group this answer selects. */
  group?: PetGroup;
}

export interface PetFactor {
  slug: string;
  title: string;
  /** Species the question is asked for. */
  species: Species[];
  /** Whether the owner can change it; fixed factors never enter the potential. */
  modifiable: boolean;
  question: string | Record<Species, string>;
  help?: string | Record<Species, string>;
  options: PetOption[] | Record<Species, PetOption[]>;
  /** Option of the average pet in the cohorts the baseline comes from. */
  typical: string | Record<Species, string>;
  /** One line for lists. */
  summary: string;
}

/** Page texts, kept apart so the test does not ship them. */
export interface PetFactorContent {
  evidence: string[];
  advice: string[];
  sources: Source[];
}
