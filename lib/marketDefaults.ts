// Shared by the server (market creation) and the admin form (odds preview).

export type MarketKindName = 'WINNER' | 'TOP_N' | 'H2H' | 'CUSTOM'

export const DEFAULT_LIQUIDITY: Record<MarketKindName, number> = {
  WINNER: 100,
  TOP_N: 50,
  H2H: 50,
  CUSTOM: 50,
}

/** Lowest opening chance allowed (0.5%), so no outcome opens at an absurd payout. */
export const MIN_OPENING = 0.005

/** Scales raw weights (e.g. typed percentages) to probabilities summing to 1. */
export function normaliseOdds(weights: number[]): number[] | null {
  if (!weights.length || weights.some((w) => !Number.isFinite(w) || w <= 0)) return null
  const total = weights.reduce((s, w) => s + w, 0)
  const p = weights.map((w) => w / total)
  return p.every((x) => x >= MIN_OPENING) ? p : null
}
