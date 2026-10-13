export type Interval = { value: number; lo: number; hi: number; n: number };

const Z = 1.96;

export function wilson(successes: number, n: number): Interval {
  if (n === 0) {
    return { value: 0, lo: 0, hi: 1, n };
  }
  const p = successes / n;
  const denom = 1 + (Z * Z) / n;
  const center = (p + (Z * Z) / (2 * n)) / denom;
  const half = (Z * Math.sqrt((p * (1 - p)) / n + (Z * Z) / (4 * n * n))) / denom;
  return { value: p, lo: Math.max(0, center - half), hi: Math.min(1, center + half), n };
}

export function meanCi(values: readonly number[]): Interval {
  const n = values.length;
  if (n === 0) {
    return { value: 0, lo: 0, hi: 0, n };
  }
  const mean = values.reduce((sum, x) => sum + x, 0) / n;
  const variance = n < 2 ? 0 : values.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1);
  const half = Z * Math.sqrt(variance / n);
  return { value: mean, lo: mean - half, hi: mean + half, n };
}

export function separated(a: Interval, b: Interval): boolean {
  return a.n > 0 && b.n > 0 && (a.hi < b.lo || b.hi < a.lo);
}

export function synergy(pair: number, a: number, b: number, none: number): number {
  return pair - a - b + none;
}
