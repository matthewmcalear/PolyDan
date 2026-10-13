// Logarithmic Market Scoring Rule (Hanson). The market maker always quotes a
// price, so anyone can buy or sell at any time without a counterparty.
//
//   C(q) = b · ln Σ exp(q_i / b)        cost function
//   p_i  = exp(q_i / b) / Σ exp(q_j / b) price of outcome i (sums to 1)
//
// Buying Δ shares of i costs C(q + Δ·e_i) − C(q). A winning share pays $1.
// The house's worst-case loss is b · ln(1 / p₀) where p₀ is the opening price
// of the outcome that ends up winning (b · ln n for an even market).
//
// Every function here works on the LIVE outcomes only. Outcomes that can no
// longer win (e.g. a competitor eliminated for good) are dropped before
// pricing, which re-normalises the rest.

function logSumExp(xs: number[]): number {
  const m = Math.max(...xs)
  return m + Math.log(xs.reduce((s, x) => s + Math.exp(x - m), 0))
}

export function cost(q: number[], b: number): number {
  return b * logSumExp(q.map((x) => x / b))
}

export function prices(q: number[], b: number): number[] {
  const l = logSumExp(q.map((x) => x / b))
  return q.map((x) => Math.exp(x / b - l))
}

/** Dollars needed to buy `shares` of outcome i. */
export function buyCost(q: number[], b: number, i: number, shares: number): number {
  const next = q.slice()
  next[i] += shares
  return cost(next, b) - cost(q, b)
}

/** Dollars received for selling `shares` of outcome i. */
export function sellProceeds(q: number[], b: number, i: number, shares: number): number {
  return -buyCost(q, b, i, -shares)
}

/** Shares of outcome i that `spend` dollars buy (exact inverse of buyCost). */
export function sharesForSpend(q: number[], b: number, i: number, spend: number): number {
  const p = prices(q, b)[i]
  return b * Math.log1p(Math.expm1(spend / b) / p)
}

/** Quantities that open a market at the given probabilities. */
export function seedQuantities(probabilities: number[], b: number): number[] {
  const total = probabilities.reduce((s, p) => s + p, 0)
  const q = probabilities.map((p) => b * Math.log(p / total))
  const lo = Math.min(...q)
  return q.map((x) => x - lo) // shift is free: only differences matter
}

/** Worst-case house loss for a market opened at these quantities. */
export function maxHouseLoss(q: number[], b: number): number {
  return Math.max(...prices(q, b).map((p) => -b * Math.log(p)))
}
