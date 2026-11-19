export type GroupId =
  | "place"
  | "habits"
  | "movement"
  | "food"
  | "body"
  | "road"
  | "mind"
  | "family"
  | "diagnoses"
  | "tests";

export interface Group {
  id: GroupId;
  title: string;
  /** One line: what the group covers. */
  line: string;
}

export interface Source {
  /** Authors, short form: "Jha P, et al." */
  authors: string;
  /** Original title of the paper or report. */
  title: string;
  /** Journal, year and volume as printed in the citation. */
  where: string;
  /** Search link (PubMed or Scholar) so the reader can open the paper. */
  href: string;
}

export interface FactorOption {
  id: string;
  label: string;
  /** Hazard ratio against the healthiest option of this factor (1.0). */
  hr: number;
  /** Optional ratios by sex when the studies show a clear difference; they override hr. */
  hrBySex?: { male: number; female: number };
  /** Extra age-independent yearly hazard (road risks). */
  lambda?: number;
  /** The answer means "I do not know" and should become a check-up item. */
  unknown?: boolean;
  /** Where an improvement realistically leads from this option. */
  improveTo?: string;
  /** BMI band bounds, only for the BMI factor. */
  range?: [number, number];
}

export interface Factor {
  slug: string;
  title: string;
  group: GroupId;
  /** Can the person change it? Fixed factors never enter the potential. */
  modifiable: boolean;
  question: string;
  help?: string;
  /** choice: one of the options; bmi: height and weight; country: a list of countries with life tables. */
  kind: "choice" | "bmi" | "country";
  options: FactorOption[];
  /** Option used to calibrate the average person (ratio 1 in the model). */
  typical: string;
  /** Best reachable option, used for the potential. */
  best: string;
  /** One line for lists. */
  summary: string;
}

/** The page texts of a factor, kept in content.ts so the test does not ship them. */
export interface FactorContent {
  /** What exactly the question measures. */
  about: string;
  /** What the cited research found, two to four points. */
  evidence: string[];
  /** Practical steps, two to four points. */
  advice: string[];
  sources: Source[];
}
