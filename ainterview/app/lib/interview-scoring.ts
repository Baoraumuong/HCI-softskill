export function validatedRubricScore(value: unknown, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > max) return null;
  return value;
}

export function calculateTotalScore(
  scores: ReadonlyArray<number | null>,
): number | null {
  if (scores.some((score) => score === null)) return null;
  return scores.reduce<number>((total, score) => total + (score ?? 0), 0);
}
