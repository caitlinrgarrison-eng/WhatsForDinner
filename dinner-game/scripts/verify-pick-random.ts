/**
 * Run from repo root: cd dinner-game && npx --yes tsx scripts/verify-pick-random.ts
 * Monte Carlo sanity check: each slot in the pool should get ~equal share over many trials.
 */
import { runPickFairnessCheck } from "../src/lib/pick-random";

const poolSize = 8;
const iterations = 24_000;

const result = runPickFairnessCheck(poolSize, iterations);

console.log(
  `[pick-random] ${iterations} trials, pool size ${poolSize}, expected ~${result.expectedPerBin.toFixed(1)} per bin`,
);
console.log("[pick-random] counts:", result.counts.join(", "));
console.log(
  `[pick-random] max deviation from expected: ${result.maxDeviationFromExpected.toFixed(2)} (${result.maxDeviationPercent.toFixed(2)}%)`,
);

// Loose threshold: catches systematic bias (e.g. always-first-item), not normal variance.
const failPct = 12;
if (result.maxDeviationPercent > failPct) {
  console.error(`[pick-random] FAIL: deviation > ${failPct}% — investigate for bias.`);
  process.exit(1);
}

console.log("[pick-random] OK: distribution looks uniform for this sample.");
