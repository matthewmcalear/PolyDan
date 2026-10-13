import { describe, expect, it } from 'vitest'
import { buyCost, maxHouseLoss, prices, seedQuantities, sellProceeds, sharesForSpend } from './lmsr'
import { computeStandings, type ResultEventLike } from './standings'
import { resolveMarket, type MarketLike } from './resolve'
import { headToHeadProbability, topNProbability, winnerProbabilities } from './history'

describe('lmsr', () => {
  it('prices sum to 1 and an even market opens at 1/n', () => {
    const p = prices([0, 0, 0, 0], 50)
    p.forEach((x) => expect(x).toBeCloseTo(0.25))
  })

  it('sharesForSpend inverts buyCost', () => {
    const q = [10, 0, -5]
    const shares = sharesForSpend(q, 40, 2, 25)
    expect(buyCost(q, 40, 2, shares)).toBeCloseTo(25, 9)
  })

  it('buying raises the price and selling back refunds exactly', () => {
    const q = [0, 0]
    const before = prices(q, 100)[0]
    const shares = sharesForSpend(q, 100, 0, 30)
    const after = [q[0] + shares, q[1]]
    expect(prices(after, 100)[0]).toBeGreaterThan(before)
    expect(sellProceeds(after, 100, 0, shares)).toBeCloseTo(30, 9)
  })

  it('seeds opening prices and bounds the house loss', () => {
    const q = seedQuantities([0.5, 0.3, 0.2], 100)
    const p = prices(q, 100)
    expect(p[0]).toBeCloseTo(0.5)
    expect(p[2]).toBeCloseTo(0.2)
    expect(maxHouseLoss(q, 100)).toBeCloseTo(100 * Math.log(5))
    expect(maxHouseLoss([0, 0, 0, 0], 100)).toBeCloseTo(100 * Math.log(4))
  })

  it('stays finite for extreme quantities', () => {
    const q = [5000, 0]
    expect(prices(q, 10).every(Number.isFinite)).toBe(true)
    expect(Number.isFinite(sharesForSpend(q, 10, 1, 5))).toBe(true)
  })
})

const ev = (round: number, competitorId: number, kind: ResultEventLike['kind']): ResultEventLike => ({
  round,
  competitorId,
  kind,
})

describe('standings', () => {
  const field = [1, 2, 3, 4, 5]

  it('assigns positions as people go out, with Redemption Island returns', () => {
    const st = computeStandings(field, [
      ev(1, 5, 'TO_ISLAND'),
      ev(2, 4, 'OUT'), // 4 left → 5th
      ev(3, 3, 'TO_ISLAND'),
      ev(3, 5, 'OUT'), // island loser out → 4 left (1,2,3 + none) … 3 alive → 4th
      ev(4, 3, 'RETURN'),
      ev(5, 3, 'OUT'), // 2 left → 3rd
      ev(6, 2, 'OUT'), // 1 left → 2nd, 1 is champion
    ])
    expect(st.byId.get(4)!.position).toBe(5)
    expect(st.byId.get(5)!.position).toBe(4)
    expect(st.byId.get(3)!.position).toBe(3)
    expect(st.byId.get(2)!.position).toBe(2)
    expect(st.champion).toBe(1)
    expect(st.byId.get(1)!.position).toBe(1)
    expect(st.finished).toBe(true)
  })

  it('ties two people knocked out in the same round', () => {
    const st = computeStandings(field, [ev(1, 4, 'OUT'), ev(1, 5, 'OUT')])
    expect(st.byId.get(4)!.position).toBe(4)
    expect(st.byId.get(5)!.position).toBe(4)
    expect(st.alive).toEqual([1, 2, 3])
  })

  it('island competitors are still alive', () => {
    const st = computeStandings([1, 2], [ev(1, 2, 'TO_ISLAND')])
    expect(st.finished).toBe(false)
    expect(st.alive).toEqual([1, 2])
  })

  it('rejects impossible transitions', () => {
    expect(() => computeStandings(field, [ev(1, 1, 'RETURN')])).toThrow(/still in/)
    expect(() => computeStandings(field, [ev(1, 1, 'OUT'), ev(2, 1, 'OUT')])).toThrow(/out/)
    expect(() => computeStandings(field, [ev(1, 9, 'OUT')])).toThrow(/Not in this edition/)
  })
})

describe('resolveMarket', () => {
  const field = [1, 2, 3, 4]
  const winner: MarketLike = {
    kind: 'WINNER',
    topN: null,
    manualResult: null,
    outcomes: field.map((c) => ({ id: 100 + c, competitorId: c, isYes: null })),
  }
  const top2: MarketLike = {
    kind: 'TOP_N',
    topN: 2,
    manualResult: null,
    outcomes: [
      { id: 1, competitorId: 3, isYes: true },
      { id: 2, competitorId: 3, isYes: false },
    ],
  }
  const h2h: MarketLike = {
    kind: 'H2H',
    topN: null,
    manualResult: null,
    outcomes: [
      { id: 1, competitorId: 1, isYes: null },
      { id: 2, competitorId: 2, isYes: null },
    ],
  }

  it('winner: knocked-out competitors die, island ones do not', () => {
    const st = computeStandings(field, [ev(1, 4, 'OUT'), ev(2, 3, 'TO_ISLAND')])
    const r = resolveMarket(winner, st)
    expect([...r.dead]).toEqual([104])
    expect(r.payouts).toBeNull()
  })

  it('winner: pays the champion', () => {
    const st = computeStandings(field, [ev(1, 4, 'OUT'), ev(2, 3, 'OUT'), ev(3, 1, 'OUT')])
    const r = resolveMarket(winner, st)
    expect(r.payouts!.get(102)).toBe(1)
    expect(r.payouts!.get(101)).toBe(0)
  })

  it('top N: decided as soon as it is certain', () => {
    expect(resolveMarket(top2, computeStandings(field, [ev(1, 4, 'OUT')])).payouts).toBeNull()
    const made = resolveMarket(top2, computeStandings(field, [ev(1, 4, 'OUT'), ev(2, 1, 'OUT')]))
    expect(made.payouts!.get(1)).toBe(1) // 3 still alive with only 2 left
    const missed = resolveMarket(top2, computeStandings(field, [ev(1, 3, 'OUT')]))
    expect(missed.payouts!.get(2)).toBe(1)
    expect([...missed.dead]).toEqual([1])
  })

  it('head to head: first one out loses; same round is a dead heat', () => {
    expect(resolveMarket(h2h, computeStandings(field, [ev(1, 4, 'OUT')])).payouts).toBeNull()
    const r = resolveMarket(h2h, computeStandings(field, [ev(1, 2, 'OUT')]))
    expect(r.payouts!.get(1)).toBe(1)
    const tie = resolveMarket(h2h, computeStandings(field, [ev(1, 1, 'OUT'), ev(1, 2, 'OUT')]))
    expect(tie.payouts!.get(1)).toBe(0.5)
    expect(tie.payouts!.get(2)).toBe(0.5)
  })

  it('custom: waits for the admin', () => {
    const m: MarketLike = { ...h2h, kind: 'CUSTOM', manualResult: null }
    expect(resolveMarket(m, computeStandings(field, [])).payouts).toBeNull()
    const done = resolveMarket({ ...m, manualResult: { 2: 1 } }, computeStandings(field, []))
    expect(done.payouts!.get(2)).toBe(1)
    expect([...done.dead]).toEqual([1])
  })
})

describe('history priors', () => {
  it('favours past champions over first-timers', () => {
    const [jack, newbie] = winnerProbabilities(['Jack', 'Nobody New'])
    expect(jack).toBeGreaterThan(newbie)
    const field = ['Megan', 'Jack', 'Jody', 'Tyler', 'Laura', 'Nobody New']
    const p = winnerProbabilities(field)
    expect(p.reduce((s, x) => s + x, 0)).toBeCloseTo(1)
    expect(Math.min(...p)).toBeGreaterThan(0.15 / field.length)
  })

  it('top N and head-to-head stay within sane bounds', () => {
    expect(topNProbability('Megan', 5, 24)).toBeGreaterThan(topNProbability('Nobody New', 5, 24))
    expect(topNProbability('Nobody New', 5, 25)).toBeCloseTo(0.2)
    const h = headToHeadProbability('Megan', 'Kiera')
    expect(h).toBeGreaterThan(0.5)
    expect(headToHeadProbability('Kiera', 'Megan')).toBeCloseTo(1 - h)
  })
})
