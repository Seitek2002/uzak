/** What the test accepts, in centimetres and kilograms whatever units are shown. */
export const BODY_LIMITS = {
  height: { min: 120, max: 230 },
  weight: { min: 30, max: 300 },
} as const;

const within = (value: number, { min, max }: { min: number; max: number }) => Number.isFinite(value) && value >= min && value <= max;

export const validHeight = (cm: number) => within(cm, BODY_LIMITS.height);
export const validWeight = (kg: number) => within(kg, BODY_LIMITS.weight);
export const validBody = (cm: number, kg: number) => validHeight(cm) && validWeight(kg);
