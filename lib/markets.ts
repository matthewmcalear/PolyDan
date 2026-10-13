import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { computeStandings, type Standings } from './standings'
import { resolveMarket, type Resolution } from './resolve'
import { prices, sellProceeds, sharesForSpend } from './lmsr'

type Db = Prisma.TransactionClient | typeof prisma

export const MIN_BUY_CENTS = 100
const EPS = 1e-9

// ---------------------------------------------------------------------------
// Reading: standings + resolution + live prices for a market
// ---------------------------------------------------------------------------

export async function loadStandings(db: Db, editionId: number): Promise<Standings> {
  const [entries, results] = await Promise.all([
    db.editionEntry.findMany({ where: { editionId }, select: { competitorId: true } }),
    db.resultEvent.findMany({ where: { editionId }, orderBy: { id: 'asc' } }),
  ])
  return computeStandings(
    entries.map((e) => e.competitorId),
    results,
  )
}

interface PriceableMarket {
  kind: 'WINNER' | 'TOP_N' | 'H2H' | 'CUSTOM'
  topN: number | null
  b: number
  status: 'OPEN' | 'CLOSED' | 'SETTLED' | 'VOID'
  manualResult: Prisma.JsonValue
  outcomes: { id: number; competitorId: number | null; isYes: boolean | null; q: number }[]
}

export interface Priced {
  resolution: Resolution
  /** Current price (0–1) per outcome id; the payout once the result is known. */
  price: Map<number, number>
  tradable: boolean
  /** Why trading is off, for the UI. */
  lockedReason: string | null
}

export function priceMarket(market: PriceableMarket, st: Standings): Priced {
  const resolution = resolveMarket(market, st)
  const live = market.outcomes.filter((o) => !resolution.dead.has(o.id))
  const price = new Map<number, number>(market.outcomes.map((o) => [o.id, 0]))
  if (resolution.payouts) {
    for (const [id, p] of resolution.payouts) price.set(id, p)
  } else if (live.length) {
    const p = prices(
      live.map((o) => o.q),
      market.b,
    )
    live.forEach((o, i) => price.set(o.id, p[i]))
  }
  const lockedReason =
    market.status === 'SETTLED'
      ? 'Settled'
      : market.status === 'VOID'
        ? 'Voided — stakes refunded'
        : resolution.payouts
          ? 'Result is in — pays out at settlement'
          : market.status === 'CLOSED'
            ? 'Trading paused by the admin'
            : null
  return { resolution, price, tradable: lockedReason == null, lockedReason }
}

export async function balanceCents(db: Db, userId: number): Promise<number> {
  const r = await db.ledgerEntry.aggregate({ where: { userId }, _sum: { amountCents: true } })
  return r._sum.amountCents ?? 0
}

// ---------------------------------------------------------------------------
// Trading. Each trade locks its market row and the user's row so prices and
// balances can't race; everything runs in one transaction.
// ---------------------------------------------------------------------------

export class TradeError extends Error {}

export type TradeRequest =
  | { side: 'BUY'; userId: number; outcomeId: number; spendCents: number }
  | { side: 'SELL'; userId: number; outcomeId: number; shares: number }

export interface TradeResult {
  shares: number
  costCents: number
  price: number
}

export async function executeTrade(req: TradeRequest): Promise<TradeResult> {
  return prisma.$transaction(async (tx) => {
    const target = await tx.outcome.findUnique({ where: { id: req.outcomeId }, select: { marketId: true } })
    if (!target) throw new TradeError('That outcome no longer exists')
    await tx.$queryRaw`SELECT id FROM "Market" WHERE id = ${target.marketId} FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${req.userId} FOR UPDATE`

    const market = await tx.market.findUniqueOrThrow({
      where: { id: target.marketId },
      include: { outcomes: { orderBy: { id: 'asc' } } },
    })
    const st = await loadStandings(tx, market.editionId)
    const priced = priceMarket(market, st)
    if (!priced.tradable) throw new TradeError(priced.lockedReason ?? 'Trading is closed')
    if (priced.resolution.dead.has(req.outcomeId)) throw new TradeError("That outcome can't win any more")

    const live = market.outcomes.filter((o) => !priced.resolution.dead.has(o.id))
    const q = live.map((o) => o.q)
    const i = live.findIndex((o) => o.id === req.outcomeId)
    const position = await tx.position.findUnique({
      where: { userId_outcomeId: { userId: req.userId, outcomeId: req.outcomeId } },
    })

    let shares: number
    let costCents: number
    if (req.side === 'BUY') {
      if (!Number.isInteger(req.spendCents) || req.spendCents < MIN_BUY_CENTS)
        throw new TradeError(`Minimum bet is $${MIN_BUY_CENTS / 100}`)
      const balance = await balanceCents(tx, req.userId)
      if (req.spendCents > balance) throw new TradeError('Not enough money — ask Matt to top you up')
      shares = sharesForSpend(q, market.b, i, req.spendCents / 100)
      costCents = req.spendCents
    } else {
      const held = position?.shares ?? 0
      if (!(req.shares > 0)) throw new TradeError('Choose how many shares to sell')
      if (req.shares > held + EPS) throw new TradeError(`You only hold ${held.toFixed(2)} shares`)
      shares = -Math.min(req.shares, held)
      // Round in the house's favour so fractions of a cent never leak out.
      costCents = -Math.floor(sellProceeds(q, market.b, i, -shares) * 100)
    }

    q[i] += shares
    const after = prices(q, market.b)
    const pricesAfter = Object.fromEntries(live.map((o, k) => [o.id, after[k]]))

    await tx.outcome.update({ where: { id: req.outcomeId }, data: { q: { increment: shares } } })
    await tx.position.upsert({
      where: { userId_outcomeId: { userId: req.userId, outcomeId: req.outcomeId } },
      create: { userId: req.userId, outcomeId: req.outcomeId, shares },
      update: { shares: Math.max(0, (position?.shares ?? 0) + shares) },
    })
    await tx.trade.create({
      data: { userId: req.userId, marketId: market.id, outcomeId: req.outcomeId, shares, costCents, pricesAfter },
    })
    const label = market.outcomes.find((o) => o.id === req.outcomeId)!.label
    await tx.ledgerEntry.create({
      data: {
        userId: req.userId,
        marketId: market.id,
        kind: req.side,
        amountCents: -costCents,
        note: `${req.side === 'BUY' ? 'Bought' : 'Sold'} ${Math.abs(shares).toFixed(2)} × ${label}`,
      },
    })
    return { shares, costCents, price: after[i] }
  })
}

// ---------------------------------------------------------------------------
// Settlement (admin, end of the day) and voiding
// ---------------------------------------------------------------------------

export async function settleMarket(marketId: number): Promise<{ paidCents: number; winners: number }> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Market" WHERE id = ${marketId} FOR UPDATE`
    const market = await tx.market.findUniqueOrThrow({
      where: { id: marketId },
      include: { outcomes: { include: { positions: true } } },
    })
    if (market.status === 'SETTLED' || market.status === 'VOID') throw new TradeError('Already settled')
    const { resolution } = priceMarket(market, await loadStandings(tx, market.editionId))
    if (!resolution.payouts) throw new TradeError('Result not known yet')

    const owed = new Map<number, number>()
    for (const o of market.outcomes) {
      const perShare = resolution.payouts.get(o.id) ?? 0
      for (const p of o.positions) {
        if (perShare > 0 && p.shares > EPS) owed.set(p.userId, (owed.get(p.userId) ?? 0) + p.shares * perShare)
      }
    }
    let paidCents = 0
    for (const [userId, amount] of owed) {
      const cents = Math.floor(amount * 100 + 1e-6)
      if (cents <= 0) continue
      paidCents += cents
      await tx.ledgerEntry.create({
        data: { userId, marketId, kind: 'PAYOUT', amountCents: cents, note: `Won: ${market.question}` },
      })
    }
    await tx.market.update({ where: { id: marketId }, data: { status: 'SETTLED', settledAt: new Date() } })
    return { paidCents, winners: owed.size }
  })
}

/** Unwinds a market: everyone gets back exactly what they put in, net of sales. */
export async function voidMarket(marketId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Market" WHERE id = ${marketId} FOR UPDATE`
    const market = await tx.market.findUniqueOrThrow({ where: { id: marketId } })
    if (market.status === 'SETTLED' || market.status === 'VOID') throw new TradeError('Already settled')
    const net = await tx.trade.groupBy({ by: ['userId'], where: { marketId }, _sum: { costCents: true } })
    for (const row of net) {
      const cents = row._sum.costCents ?? 0
      if (cents === 0) continue
      await tx.ledgerEntry.create({
        data: { userId: row.userId, marketId, kind: 'REFUND', amountCents: cents, note: `Voided: ${market.question}` },
      })
    }
    await tx.market.update({ where: { id: marketId }, data: { status: 'VOID', settledAt: new Date() } })
  })
}
