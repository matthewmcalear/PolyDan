'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hashPin, requireAdmin } from '@/lib/auth'
import { loadStandings, priceMarket, settleMarket, voidMarket, TradeError } from '@/lib/markets'
import { computeStandings, type ResultKind } from '@/lib/standings'
import { resolveMarket } from '@/lib/resolve'
import { createMarket, type MarketSpec } from '@/lib/createMarket'
import { formatMoney, parseDollarsToCents } from '@/lib/money'
import type { ActionState } from '../actions'

// Every admin action re-checks the session, runs, and reports back as an
// ActionState so the form can show the outcome inline.
async function run(fn: () => Promise<string>): Promise<ActionState> {
  await requireAdmin()
  try {
    const ok = await fn()
    revalidatePath('/', 'layout')
    return { ok }
  } catch (e) {
    if (e instanceof TradeError || e instanceof Error) return { error: e.message }
    throw e
  }
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const int = (f: FormData, k: string) => Number.parseInt(str(f, k), 10)

// ---------------------------------------------------------------- players

export async function createUser(_: ActionState, f: FormData) {
  return run(async () => {
    const name = str(f, 'name')
    const pin = str(f, 'pin')
    if (!name) throw new Error('Name is required')
    if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN must be 4–8 digits')
    if (await prisma.user.findUnique({ where: { name } })) throw new Error(`${name} already has an account`)
    await prisma.user.create({ data: { name, pinHash: hashPin(pin), isAdmin: f.get('isAdmin') === 'on' } })
    return `Added ${name}. Their PIN is ${pin}.`
  })
}

export async function resetPin(_: ActionState, f: FormData) {
  return run(async () => {
    const pin = str(f, 'pin')
    if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN must be 4–8 digits')
    const u = await prisma.user.update({ where: { id: int(f, 'userId') }, data: { pinHash: hashPin(pin) } })
    return `${u.name}'s PIN is now ${pin}`
  })
}

export async function adjustBalance(_: ActionState, f: FormData) {
  return run(async () => {
    const cents = parseDollarsToCents(str(f, 'amount'))
    if (!cents) throw new Error('Enter an amount')
    const kind = f.get('kind') === 'WITHDRAWAL' ? 'WITHDRAWAL' : 'DEPOSIT'
    const userId = int(f, 'userId')
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    await prisma.ledgerEntry.create({
      data: {
        userId,
        kind,
        amountCents: kind === 'DEPOSIT' ? cents : -cents,
        note: str(f, 'note') || (kind === 'DEPOSIT' ? 'Credited by admin' : 'Cashed out'),
      },
    })
    return `${kind === 'DEPOSIT' ? 'Credited' : 'Cashed out'} ${formatMoney(cents)} ${kind === 'DEPOSIT' ? 'to' : 'from'} ${user.name}`
  })
}

// --------------------------------------------------------------- editions

export async function createEdition(_: ActionState, f: FormData) {
  return run(async () => {
    const number = int(f, 'number')
    if (!(number > 0)) throw new Error('Edition number is required')
    const date = str(f, 'date')
    await prisma.edition.create({ data: { number, date: date ? new Date(`${date}T12:00:00`) : null } })
    return `Created Iron Man ${number}`
  })
}

export async function setField(_: ActionState, f: FormData) {
  return run(async () => {
    const editionId = int(f, 'editionId')
    const hasResults = await prisma.resultEvent.count({ where: { editionId } })
    const hasMarkets = await prisma.market.count({ where: { editionId } })
    if (hasResults || hasMarkets) throw new Error('The field is locked once markets or results exist')
    const chosen = f.getAll('competitorId').map(Number)
    const newNames = str(f, 'newNames')
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
    for (const name of newNames) {
      const c = await prisma.competitor.upsert({ where: { name }, create: { name }, update: {} })
      chosen.push(c.id)
    }
    const ids = [...new Set(chosen)]
    await prisma.$transaction([
      prisma.editionEntry.deleteMany({ where: { editionId } }),
      prisma.editionEntry.createMany({ data: ids.map((competitorId) => ({ editionId, competitorId })) }),
    ])
    return `Field set: ${ids.length} competitors`
  })
}

export async function setEditionStatus(_: ActionState, f: FormData) {
  return run(async () => {
    const status = str(f, 'status') as 'SETUP' | 'LIVE' | 'FINISHED'
    const e = await prisma.edition.update({ where: { id: int(f, 'editionId') }, data: { status } })
    return `Iron Man ${e.number} is now ${status.toLowerCase()}`
  })
}

// ---------------------------------------------------------------- results

async function checkSettledUnchanged(editionId: number, nextStandings: ReturnType<typeof computeStandings>) {
  const settled = await prisma.market.findMany({
    where: { editionId, status: 'SETTLED', kind: { not: 'CUSTOM' } },
    include: { outcomes: true },
  })
  const current = await loadStandings(prisma, editionId)
  for (const m of settled) {
    const before = resolveMarket(m, current).payouts
    const after = resolveMarket(m, nextStandings).payouts
    const same = before && after && [...before].every(([id, p]) => after.get(id) === p)
    if (!same) throw new Error(`That would change "${m.question}", which is already settled`)
  }
}

export async function recordResults(_: ActionState, f: FormData) {
  return run(async () => {
    const editionId = int(f, 'editionId')
    const round = int(f, 'round')
    if (!(round > 0)) throw new Error('Round number is required')
    // One field per competitor: "" (no change), TO_ISLAND, OUT, RETURN
    const events = [...f.entries()]
      .filter(([k, v]) => k.startsWith('r_') && v)
      .map(([k, v]) => ({ round, competitorId: Number(k.slice(2)), kind: v as ResultKind }))
    if (!events.length) throw new Error('Nothing selected')

    const [entries, existing] = await Promise.all([
      prisma.editionEntry.findMany({ where: { editionId } }),
      prisma.resultEvent.findMany({ where: { editionId }, orderBy: { id: 'asc' } }),
    ])
    const next = computeStandings(
      entries.map((e) => e.competitorId),
      [...existing, ...events],
    ) // throws on an impossible move
    await checkSettledUnchanged(editionId, next)
    await prisma.resultEvent.createMany({ data: events.map((e) => ({ ...e, editionId })) })
    await prisma.edition.update({
      where: { id: editionId },
      data: { status: next.finished ? 'FINISHED' : 'LIVE' },
    })
    return `Round ${round} recorded (${events.length} result${events.length > 1 ? 's' : ''})${next.finished ? ' — we have a champion!' : ''}`
  })
}

export async function undoLastResult(_: ActionState, f: FormData) {
  return run(async () => {
    const editionId = int(f, 'editionId')
    const all = await prisma.resultEvent.findMany({ where: { editionId }, orderBy: { id: 'asc' } })
    const last = all.at(-1)
    if (!last) throw new Error('Nothing to undo')
    const entries = await prisma.editionEntry.findMany({ where: { editionId } })
    const next = computeStandings(
      entries.map((e) => e.competitorId),
      all.slice(0, -1),
    )
    await checkSettledUnchanged(editionId, next)
    await prisma.resultEvent.delete({ where: { id: last.id } })
    if (!next.finished) await prisma.edition.update({ where: { id: editionId }, data: { status: 'LIVE' } })
    return 'Undid the last result'
  })
}

// ---------------------------------------------------------------- markets

export async function addMarket(_: ActionState, f: FormData) {
  return run(async () => {
    const editionId = int(f, 'editionId')
    const kind = str(f, 'kind') as MarketSpec['kind']
    const spec: MarketSpec =
      kind === 'WINNER'
        ? { kind }
        : kind === 'TOP_N'
          ? { kind, competitorId: int(f, 'competitorId'), n: int(f, 'n') }
          : kind === 'H2H'
            ? { kind, a: int(f, 'a'), b: int(f, 'b') }
            : { kind: 'CUSTOM', question: str(f, 'question'), options: str(f, 'options').split('\n') }
    const b = Number(str(f, 'liquidity')) || undefined
    if (b != null && !(b >= 5 && b <= 1000)) throw new Error('Liquidity must be between 5 and 1000')
    // Edited opening odds arrive as JSON {outcome label: percentage}; blank = history.
    const oddsRaw = str(f, 'odds')
    const odds = oddsRaw ? (JSON.parse(oddsRaw) as Record<string, number>) : undefined
    const m = await createMarket(editionId, spec, b, odds)
    return `Opened “${m.question}”`
  })
}

export async function setMarketStatus(_: ActionState, f: FormData) {
  return run(async () => {
    const status = str(f, 'status') === 'CLOSED' ? 'CLOSED' : 'OPEN'
    const m = await prisma.market.findUniqueOrThrow({ where: { id: int(f, 'marketId') } })
    if (m.status === 'SETTLED' || m.status === 'VOID') throw new Error('Already settled')
    await prisma.market.update({ where: { id: m.id }, data: { status } })
    return status === 'CLOSED' ? `Paused “${m.question}”` : `Reopened “${m.question}”`
  })
}

export async function resolveCustom(_: ActionState, f: FormData) {
  return run(async () => {
    const m = await prisma.market.findUniqueOrThrow({ where: { id: int(f, 'marketId') }, include: { outcomes: true } })
    if (m.kind !== 'CUSTOM') throw new Error('Only custom markets are resolved by hand')
    if (m.status === 'SETTLED' || m.status === 'VOID') throw new Error('Already settled')
    const winner = str(f, 'outcomeId')
    if (!winner) {
      await prisma.market.update({ where: { id: m.id }, data: { manualResult: Prisma.DbNull } })
      return 'Cleared the result'
    }
    const o = m.outcomes.find((x) => x.id === Number(winner))
    if (!o) throw new Error('Pick an outcome')
    await prisma.market.update({ where: { id: m.id }, data: { manualResult: { [o.id]: 1 } } })
    return `“${m.question}” → ${o.label}. Settle to pay out.`
  })
}

export async function settleOne(_: ActionState, f: FormData) {
  return run(async () => {
    const r = await settleMarket(int(f, 'marketId'))
    return `Settled: paid ${formatMoney(r.paidCents)} to ${r.winners} player${r.winners === 1 ? '' : 's'}`
  })
}

export async function settleAll(_: ActionState, f: FormData) {
  return run(async () => {
    const editionId = int(f, 'editionId')
    const markets = await prisma.market.findMany({
      where: { editionId, status: { in: ['OPEN', 'CLOSED'] } },
      include: { outcomes: true },
    })
    const st = await loadStandings(prisma, editionId)
    let count = 0
    let paid = 0
    for (const m of markets) {
      if (!priceMarket(m, st).resolution.payouts) continue
      paid += (await settleMarket(m.id)).paidCents
      count++
    }
    if (!count) throw new Error('No market has a result yet')
    return `Settled ${count} market${count === 1 ? '' : 's'}, paid out ${formatMoney(paid)}`
  })
}

export async function voidOne(_: ActionState, f: FormData) {
  return run(async () => {
    await voidMarket(int(f, 'marketId'))
    return 'Voided — everyone got their stake back'
  })
}
