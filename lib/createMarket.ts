import { prisma } from './prisma'
import { seedQuantities } from './lmsr'
import { DEFAULT_LIQUIDITY, normaliseOdds } from './marketDefaults'
import { headToHeadProbability, topNProbability, winnerProbabilities } from './history'

export type MarketSpec =
  | { kind: 'WINNER' }
  | { kind: 'TOP_N'; competitorId: number; n: number }
  | { kind: 'H2H'; a: number; b: number }
  | { kind: 'CUSTOM'; question: string; options: string[] }

export { DEFAULT_LIQUIDITY }

interface Draft {
  question: string
  topN?: number
  outcomes: { label: string; competitorId?: number; isYes?: boolean; p: number }[]
}

async function draft(editionId: number, spec: MarketSpec): Promise<Draft> {
  const edition = await prisma.edition.findUniqueOrThrow({
    where: { id: editionId },
    include: { entries: { include: { competitor: true } } },
  })
  const field = edition.entries.map((e) => e.competitor).sort((a, b) => a.name.localeCompare(b.name))
  const byId = new Map(field.map((c) => [c.id, c]))
  const need = (id: number) => {
    const c = byId.get(id)
    if (!c) throw new Error('Competitor is not in this edition')
    return c
  }

  switch (spec.kind) {
    case 'WINNER': {
      if (field.length < 2) throw new Error('Set the field first')
      const p = winnerProbabilities(field.map((c) => c.name))
      return {
        question: `Who wins Iron Man ${edition.number}?`,
        outcomes: field.map((c, i) => ({ label: c.name, competitorId: c.id, p: p[i] })),
      }
    }
    case 'TOP_N': {
      const c = need(spec.competitorId)
      if (!(spec.n >= 1 && spec.n < field.length)) throw new Error(`Top N must be between 1 and ${field.length - 1}`)
      const p = topNProbability(c.name, spec.n, field.length)
      return {
        question: spec.n === 1 ? `Will ${c.name} win?` : `Will ${c.name} finish top ${spec.n}?`,
        topN: spec.n,
        outcomes: [
          { label: 'Yes', competitorId: c.id, isYes: true, p },
          { label: 'No', competitorId: c.id, isYes: false, p: 1 - p },
        ],
      }
    }
    case 'H2H': {
      const a = need(spec.a)
      const b = need(spec.b)
      if (a.id === b.id) throw new Error('Pick two different people')
      const p = headToHeadProbability(a.name, b.name)
      return {
        question: `${a.name} vs ${b.name}: who lasts longer?`,
        outcomes: [
          { label: a.name, competitorId: a.id, p },
          { label: b.name, competitorId: b.id, p: 1 - p },
        ],
      }
    }
    case 'CUSTOM': {
      const options = spec.options.map((o) => o.trim()).filter(Boolean)
      if (!spec.question.trim()) throw new Error('Write the question')
      if (options.length < 2) throw new Error('Give at least two options')
      if (new Set(options).size !== options.length) throw new Error('Options must all be different')
      return {
        question: spec.question.trim(),
        outcomes: options.map((label) => ({ label, p: 1 / options.length })),
      }
    }
  }
}

export async function createMarket(
  editionId: number,
  spec: MarketSpec,
  b: number = DEFAULT_LIQUIDITY[spec.kind],
  /** Admin-set opening odds as {outcome label: weight}, scaled to 100%. */
  openingOdds?: Record<string, number>,
) {
  const d = await draft(editionId, spec)
  if (openingOdds) {
    const p = normaliseOdds(d.outcomes.map((o) => Number(openingOdds[o.label])))
    if (!p) throw new Error('Opening odds must be set for every outcome, each at least 0.5%')
    d.outcomes.forEach((o, i) => (o.p = p[i]))
  }
  const q = seedQuantities(
    d.outcomes.map((o) => o.p),
    b,
  )
  return prisma.market.create({
    data: {
      editionId,
      kind: spec.kind,
      question: d.question,
      topN: d.topN,
      b,
      outcomes: {
        create: d.outcomes.map((o, i) => ({
          label: o.label,
          competitorId: o.competitorId,
          isYes: o.isYes,
          sort: i,
          q: q[i],
        })),
      },
    },
  })
}
