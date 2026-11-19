import { FACTORS } from "@/entities/factor";

/** "labs" is the fork before the blood tests: without results at hand the four questions are skipped. */
export type StepId = "sex" | "age" | "labs" | (typeof FACTORS)[number]["slug"];

const firstTest = FACTORS.findIndex((f) => f.group === "tests");
const before = FACTORS.slice(0, firstTest).map((f) => f.slug);
const tests = FACTORS.slice(firstTest).map((f) => f.slug);

export const STEPS: StepId[] = ["sex", "age", ...before, "labs", ...tests];
export const TOTAL = STEPS.length;
export const LABS_STEP = STEPS.indexOf("labs");
export const TEST_SLUGS = tests;

/** Number of questions with the blood tests skipped or not. */
export const totalFor = (labs?: "yes" | "skip") => (labs === "skip" ? LABS_STEP + 1 : TOTAL);
