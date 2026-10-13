// Opening odds from Iron Man history (editions 1–9, exported from Steven's
// sheet via sslgolf.com/iron-man.html). Every estimate is shrunk toward the
// "know nothing" baseline so first-timers and small samples stay sensible.

import history from '../data/iron-man-history.json'

interface EditionResult {
  pos: number
  name: string
}
interface HistoricEdition {
  n: number
  N: number
  results: EditionResult[]
}

const editions = history.editions as HistoricEdition[]
const PRIOR_WEIGHT = 2 // pseudo-editions of "average" form added to everyone

function finishes(name: string): { pos: number; field: number }[] {
  return editions.flatMap((e) =>
    e.results.filter((r) => r.name === name).map((r) => ({ pos: r.pos, field: e.N })),
  )
}

/** P(name finishes in the top n of a field of `fieldSize`). */
export function topNProbability(name: string, n: number, fieldSize: number): number {
  const base = Math.min(1, n / fieldSize)
  const past = finishes(name)
  // Scale each past result to this field size, so 3rd of 11 ≈ 6th of 22.
  const hits = past.filter((f) => ((f.pos - 1) / f.field) * fieldSize < n).length
  return clamp((hits + PRIOR_WEIGHT * base) / (past.length + PRIOR_WEIGHT))
}

/** Relative strength: grows with the share of the field beaten, plus titles. */
function strength(name: string): number {
  const past = finishes(name)
  // Average share of the field beaten (0 = last, 1 = won), shrunk toward 0.45.
  const beat = past.reduce((s, f) => s + (f.field - f.pos) / (f.field - 1), 0)
  const form = (beat + PRIOR_WEIGHT * 0.45) / (past.length + PRIOR_WEIGHT)
  const titles = past.filter((f) => f.pos === 1).length
  return Math.exp(5 * form) * (1 + titles * 0.5)
}

/** Opening win probabilities for a field, normalised to sum to 1. */
export function winnerProbabilities(names: string[]): number[] {
  const raw = names.map(strength)
  const total = raw.reduce((s, x) => s + x, 0)
  // Keep 15% spread evenly so nobody opens at a near-zero price (that would
  // make the house's worst case much larger, see lmsr.maxHouseLoss).
  return raw.map((x) => 0.85 * (x / total) + 0.15 / names.length)
}

/** P(a finishes ahead of b): overall form, nudged by the editions both played. */
export function headToHeadProbability(a: string, b: string): number {
  let aWins = 0
  let meetings = 0
  for (const e of editions) {
    const ra = e.results.find((r) => r.name === a)
    const rb = e.results.find((r) => r.name === b)
    if (!ra || !rb || ra.pos === rb.pos) continue
    meetings++
    if (ra.pos < rb.pos) aWins++
  }
  const sa = strength(a)
  const formOdds = sa / (sa + strength(b))
  return clamp((aWins + 3 * formOdds) / (meetings + 3))
}

export function pastEditionCount(name: string): number {
  return finishes(name).length
}

function clamp(p: number): number {
  return Math.min(0.95, Math.max(0.05, p))
}
