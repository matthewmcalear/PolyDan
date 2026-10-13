// Decides, from the live standings, which outcomes of a market are dead and
// whether the market's result is already known.
//
// A known result locks the market straight away (nobody can bet on a sure
// thing); winnings are paid out when the admin settles at the end of the day.
// Payouts are per share: 1 = full win, 0.5 = dead heat between two, 0 = loss.

import type { Standings } from './standings'

export type MarketKind = 'WINNER' | 'TOP_N' | 'H2H' | 'CUSTOM'

export interface OutcomeLike {
  id: number
  competitorId: number | null
  isYes: boolean | null
}

export interface MarketLike {
  kind: MarketKind
  topN: number | null
  manualResult: unknown
  outcomes: OutcomeLike[]
}

export interface Resolution {
  /** Outcomes that can no longer pay out: hidden from pricing, not tradable. */
  dead: Set<number>
  /** Payout per share for every outcome, once the result is known. */
  payouts: Map<number, number> | null
}

function splitBetween(all: OutcomeLike[], winners: OutcomeLike[]): Map<number, number> {
  return new Map(all.map((o) => [o.id, winners.includes(o) ? 1 / winners.length : 0]))
}

export function resolveMarket(market: MarketLike, st: Standings): Resolution {
  const { outcomes } = market
  const pos = (o: OutcomeLike) => (o.competitorId == null ? null : st.byId.get(o.competitorId)?.position ?? null)
  const isOut = (o: OutcomeLike) => o.competitorId != null && st.byId.get(o.competitorId)?.status === 'OUT'

  switch (market.kind) {
    case 'WINNER': {
      const dead = new Set(outcomes.filter((o) => isOut(o) && pos(o) !== 1).map((o) => o.id))
      const live = outcomes.filter((o) => !dead.has(o.id))
      if (!st.finished) return { dead, payouts: null }
      // Normally one champion; if the last few went out together they share it.
      return { dead, payouts: splitBetween(outcomes, live) }
    }

    case 'TOP_N': {
      const yes = outcomes.find((o) => o.isYes)!
      const no = outcomes.find((o) => !o.isYes)!
      const n = market.topN ?? 1
      const p = pos(yes)
      let made: boolean | null = null
      if (p != null) made = p <= n
      // Still alive with only N or fewer left: guaranteed a top-N finish.
      else if (st.alive.length <= n) made = true
      if (made == null) return { dead: new Set(), payouts: null }
      return {
        dead: new Set([made ? no.id : yes.id]),
        payouts: new Map([[yes.id, made ? 1 : 0], [no.id, made ? 0 : 1]]),
      }
    }

    case 'H2H': {
      const [a, b] = outcomes
      const pa = pos(a)
      const pb = pos(b)
      if (pa == null && pb == null) return { dead: new Set(), payouts: null }
      // Whoever is still standing beats whoever is out; equal positions = dead heat.
      const winners = pa == null ? [a] : pb == null ? [b] : pa < pb ? [a] : pb < pa ? [b] : [a, b]
      return {
        dead: new Set(outcomes.filter((o) => !winners.includes(o)).map((o) => o.id)),
        payouts: splitBetween(outcomes, winners),
      }
    }

    case 'CUSTOM': {
      const manual = market.manualResult as Record<string, number> | null
      if (!manual) return { dead: new Set(), payouts: null }
      const payouts = new Map(outcomes.map((o) => [o.id, Number(manual[o.id] ?? 0)]))
      return {
        dead: new Set(outcomes.filter((o) => !payouts.get(o.id)).map((o) => o.id)),
        payouts,
      }
    }
  }
}
