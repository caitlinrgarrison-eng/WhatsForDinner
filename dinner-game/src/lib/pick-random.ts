/**
 * Uniform random selection from a candidate pool (fair pick among eligible items).
 * Uses crypto.getRandomValues when available so the index is not biased by Math.random implementation details.
 */

export function getUniform01(): number {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] / 0x100000000;
  }
  return Math.random();
}

export function pickUniformRandomFrom<T>(items: readonly T[]): T {
  const n = items.length;
  if (n === 0) {
    throw new Error("pickUniformRandomFrom: empty candidate pool");
  }
  const u = getUniform01();
  const idx = Math.min(n - 1, Math.floor(u * n));
  return items[idx];
}

/** Fisher–Yates shuffle (copy). Surfaces a different order each call for the same input set. */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(getUniform01() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j]!;
    arr[j] = t!;
  }
  return arr;
}

/** Developer / QA helper: Monte Carlo check that each index is chosen about equally often. */
export function runPickFairnessCheck(poolSize: number, iterations: number) {
  const counts = new Array<number>(poolSize).fill(0);
  const pool = Array.from({ length: poolSize }, (_, i) => i);
  for (let i = 0; i < iterations; i++) {
    const pick = pickUniformRandomFrom(pool);
    counts[pick]++;
  }
  const expected = iterations / poolSize;
  const maxDeviation = Math.max(...counts.map((c) => Math.abs(c - expected)));
  return {
    poolSize,
    iterations,
    counts,
    expectedPerBin: expected,
    maxDeviationFromExpected: maxDeviation,
    maxDeviationPercent: expected > 0 ? (maxDeviation / expected) * 100 : 0,
  };
}
