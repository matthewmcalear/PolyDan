import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { balanceCents, loadStandings, priceMarket } from './markets'
import { prices } from './lmsr'
import type { Standings } from './standings'

// Read models for the pages. Everything is computed per request from the
// ledger, the result log and the LMSR quantities — nothing derived is stored.

export async function getCurrentEdition() {
  return (
    (await prisma.edition.findFirst({ where: { status: 'LIVE' }, orderBy: { number: 'desc' } })) ??
    (await prisma.edition.findFirst({ orderBy: { number: 'desc' } }))
  )
}

const marketInclude = {
  outcomes: { orderBy: [{ sort: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.MarketInclude

type MarketRow = NonNullable<Awaited<ReturnType<typeof loadMarketRow>>>
function loadMarketRow(id: number) {
  return prisma.market.findUnique({ where: { id }, include: marketInclude })
}

export interface OutcomeView {
  id: number
  label: string
  competitorId: number | null
  isYes: boolean | null
  q: number
  price: number
  dead: boolean
}

export interface MarketView {
  id: number
  editionId: number
  kind: MarketRow['kind']
  question: string
  status: MarketRow['status']
  b: number
  tradable: boolean
  lockedReason: string | null
  resolved: boolean
  outcomes: OutcomeView[]
  volumeCents: number
}

function toView(m: MarketRow, st: Standings, volumeCents: number): MarketView {
  const priced = priceMarket(m, st)
  return {
    id: m.id,
    editionId: m.editionId,
    kind: m.kind,
    question: m.question,
    status: m.status,
    b: m.b,
    tradable: priced.tradable,
    lockedReason: priced.lockedReason,
    resolved: priced.resolution.payouts != null,
    volumeCents,
    outcomes: m.outcomes.map((o) => ({
      id: o.id,
      label: o.label,
      competitorId: o.competitorId,
      isYes: o.isYes,
      q: o.q,
      price: priced.price.get(o.id) ?? 0,
      dead: priced.resolution.dead.has(o.id),
    })),
  }
}

async function volumes(marketIds: number[]): Promise<Map<number, number>> {
  const rows = await prisma.trade.findMany({
    where: { marketId: { in: marketIds } },
    select: { marketId: true, costCents: true },
  })
  const v = new Map<number, number>()
  for (const r of rows) v.set(r.marketId, (v.get(r.marketId) ?? 0) + Math.abs(r.costCents))
  return v
}

export async function getEditionBoard(editionId: number) {
  const [edition, standings, markets] = await Promise.all([
    prisma.edition.findUniqueOrThrow({
      where: { id: editionId },
      include: { entries: { include: { competitor: true } } },
    }),
    loadStandings(prisma, editionId),
    prisma.market.findMany({ where: { editionId }, include: marketInclude, orderBy: { id: 'asc' } }),
  ])
  const vol = await volumes(markets.map((m) => m.id))
  const field = edition.entries
    .map((e) => ({ ...e.competitor, standing: standings.byId.get(e.competitorId)! }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return {
    edition,
    standings,
    field,
    markets: markets.map((m) => toView(m, standings, vol.get(m.id) ?? 0)),
  }
}

export interface ChartSeries {
  outcomeId: number
  label: string
  points: { t: number; p: number }[]
}

export async function getMarketDetail(marketId: number, userId: number) {
  const m = await loadMarketRow(marketId)
  if (!m) return null
  const [standings, trades, positions, edition] = await Promise.all([
    loadStandings(prisma, m.editionId),
    prisma.trade.findMany({
      where: { marketId },
      orderBy: { id: 'asc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.position.findMany({ where: { userId, outcome: { marketId } } }),
    prisma.edition.findUniqueOrThrow({ where: { id: m.editionId } }),
  ])
  const view = toView(
    m,
    standings,
    trades.reduce((s, t) => s + Math.abs(t.costCents), 0),
  )

  // Opening quantities = today's minus every share traded since.
  const openQ = new Map(m.outcomes.map((o) => [o.id, o.q]))
  for (const t of trades) openQ.set(t.outcomeId, openQ.get(t.outcomeId)! - t.shares)
  const opening = prices(
    m.outcomes.map((o) => openQ.get(o.id)!),
    m.b,
  )
  const snapshots: { t: number; prices: Record<string, number> }[] = [
    { t: m.createdAt.getTime(), prices: Object.fromEntries(m.outcomes.map((o, i) => [o.id, opening[i]])) },
    ...trades.map((t) => ({ t: t.createdAt.getTime(), prices: t.pricesAfter as Record<string, number> })),
    { t: Date.now(), prices: Object.fromEntries(view.outcomes.map((o) => [o.id, o.price])) },
  ]
  // Binary markets chart the first side; multi-outcome markets the current top 4.
  const charted =
    view.outcomes.length === 2
      ? [view.outcomes[0]]
      : [...view.outcomes]
          .sort((a, b) => b.price - a.price)
          .slice(0, 4)
          // Colour follows the outcome, not its rank: keep a stable order so a
          // lead change doesn't repaint the lines.
          .sort((a, b) => view.outcomes.indexOf(a) - view.outcomes.indexOf(b))
  const series: ChartSeries[] = charted.map((o) => ({
    outcomeId: o.id,
    label: o.label,
    points: snapshots.map((s) => ({ t: s.t, p: s.prices[o.id] ?? 0 })),
  }))

  const costBasis = new Map<number, number>()
  for (const t of trades)
    if (t.userId === userId) costBasis.set(t.outcomeId, (costBasis.get(t.outcomeId) ?? 0) + t.costCents)

  const labelOf = new Map(m.outcomes.map((o) => [o.id, o.label]))
  return {
    market: view,
    edition,
    series,
    myPositions: positions
      .filter((p) => p.shares > 1e-9)
      .map((p) => ({ outcomeId: p.outcomeId, shares: p.shares, costCents: costBasis.get(p.outcomeId) ?? 0 })),
    activity: trades
      .slice(-30)
      .reverse()
      .map((t) => ({
        id: t.id,
        user: t.user.name,
        outcome: labelOf.get(t.outcomeId) ?? '',
        shares: t.shares,
        costCents: t.costCents,
        at: t.createdAt,
      })),
  }
}

/** Open positions valued at today's prices (or the known payout). */
async function openPositions(userId?: number) {
  const rows = await prisma.position.findMany({
    where: { ...(userId ? { userId } : {}), shares: { gt: 1e-9 }, outcome: { market: { status: { in: ['OPEN', 'CLOSED'] } } } },
    include: { outcome: { include: { market: { include: marketInclude } } } },
  })
  const standingsByEdition = new Map<number, Standings>()
  const viewByMarket = new Map<number, MarketView>()
  for (const r of rows) {
    const m = r.outcome.market
    if (!standingsByEdition.has(m.editionId))
      standingsByEdition.set(m.editionId, await loadStandings(prisma, m.editionId))
    if (!viewByMarket.has(m.id)) viewByMarket.set(m.id, toView(m, standingsByEdition.get(m.editionId)!, 0))
  }
  return rows.map((r) => {
    const view = viewByMarket.get(r.outcome.marketId)!
    const outcome = view.outcomes.find((o) => o.id === r.outcomeId)!
    const price = outcome.price
    return {
      dead: outcome.dead,
      userId: r.userId,
      market: view,
      outcomeId: r.outcomeId,
      label: r.outcome.label,
      shares: r.shares,
      price,
      valueCents: Math.floor(r.shares * price * 100),
    }
  })
}

export async function getPortfolio(userId: number) {
  const [balance, positions, ledger, trades] = await Promise.all([
    balanceCents(prisma, userId),
    openPositions(userId),
    prisma.ledgerEntry.findMany({ where: { userId }, orderBy: { id: 'desc' }, take: 100 }),
    prisma.trade.groupBy({ by: ['outcomeId'], where: { userId }, _sum: { costCents: true } }),
  ])
  const basis = new Map(trades.map((t) => [t.outcomeId, t._sum.costCents ?? 0]))
  return {
    balance,
    positions: positions.map((p) => ({ ...p, costCents: basis.get(p.outcomeId) ?? 0 })),
    ledger,
  }
}

/** Every player's account: cash, money put in, and open bets at today's prices. */
export async function getPlayerAccounts() {
  const [users, sums, positions, basis] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, isAdmin: true }, orderBy: { name: 'asc' } }),
    prisma.ledgerEntry.groupBy({ by: ['userId', 'kind'], _sum: { amountCents: true } }),
    openPositions(),
    prisma.trade.groupBy({ by: ['userId', 'outcomeId'], _sum: { costCents: true } }),
  ])
  const costOf = new Map(basis.map((b) => [`${b.userId}:${b.outcomeId}`, b._sum.costCents ?? 0]))
  return users.map((u) => {
    const mine = sums.filter((s) => s.userId === u.id)
    const sum = (kinds: string[]) =>
      mine.filter((s) => kinds.includes(s.kind)).reduce((t, s) => t + (s._sum.amountCents ?? 0), 0)
    const balance = sum(['DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL', 'PAYOUT', 'REFUND'])
    const invested = sum(['DEPOSIT', 'WITHDRAWAL'])
    const bets = positions
      .filter((p) => p.userId === u.id)
      .map((p) => ({ ...p, costCents: costOf.get(`${u.id}:${p.outcomeId}`) ?? 0 }))
    const open = bets.reduce((t, p) => t + p.valueCents, 0)
    const netWorth = balance + open
    return { ...u, balance, invested, open, netWorth, pnl: netWorth - invested, bets }
  })
}

export async function getLeaderboard() {
  return (await getPlayerAccounts())
    .filter((u) => u.invested !== 0 || u.netWorth !== 0)
    .sort((a, b) => b.pnl - a.pnl)
}
