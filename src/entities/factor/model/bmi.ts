import { FACTORS } from "./factors.ts";

export function bmiOf(heightCm: number, weightKg: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** The BMI option of the test for an index value. */
export function bmiBand(bmi: number): string {
  const f = FACTORS.find((x) => x.kind === "bmi")!;
  const band = f.options.find((o) => o.range && bmi >= o.range[0] && bmi < o.range[1]);
  return band?.id ?? f.typical;
}
