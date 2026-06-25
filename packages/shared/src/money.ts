/**
 * Money helpers. Paper balances are dollars stored as numbers; to avoid classic
 * binary-float drift (e.g. 49.99999999999997) we round to cents at every write
 * boundary and compare with a cent-scale epsilon.
 */

/** Round a dollar amount to whole cents. */
export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Tolerance for money comparisons (well below one cent). */
export const MONEY_EPSILON = 1e-6;

/** a >= b within money tolerance. */
export function gte(a: number, b: number): boolean {
  return a - b >= -MONEY_EPSILON;
}
