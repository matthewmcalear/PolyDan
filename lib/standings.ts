// Live standings for an edition, derived from the admin's result log.
//
// Everyone starts IN. Losing a round sends you to Redemption Island (ISLAND)
// or straight OUT; surviving the island RETURNs you to the game; losing on
// the island puts you OUT. Your finishing position is fixed the moment you go
// OUT: it's one more than the number of people still not out after that
// round, so two people going out in the same round tie (as in Steven's sheet).

export type ResultKind = 'TO_ISLAND' | 'OUT' | 'RETURN'
export type Status = 'IN' | 'ISLAND' | 'OUT'

export interface ResultEventLike {
  round: number
  competitorId: number
  kind: ResultKind
}

export interface Standing {
  competitorId: number
  status: Status
  position: number | null // set once OUT (or when crowned)
  outRound: number | null
}

export interface Standings {
  byId: Map<number, Standing>
  /** Competitors not yet out (IN or ISLAND). */
  alive: number[]
  /** True once a single competitor is left. */
  finished: boolean
  champion: number | null
  currentRound: number
}

const ALLOWED: Record<ResultKind, Status[]> = {
  TO_ISLAND: ['IN'],
  OUT: ['IN', 'ISLAND'],
  RETURN: ['ISLAND'],
}

const NEXT: Record<ResultKind, Status> = { TO_ISLAND: 'ISLAND', OUT: 'OUT', RETURN: 'IN' }

export function transitionError(current: Status | undefined, kind: ResultKind): string | null {
  if (!current) return 'Not in this edition'
  if (!ALLOWED[kind].includes(current)) {
    const verb = { TO_ISLAND: 'sent to the island', OUT: 'knocked out', RETURN: 'returned' }[kind]
    return `Can't be ${verb} while ${current === 'IN' ? 'still in' : current === 'ISLAND' ? 'on the island' : 'out'}`
  }
  return null
}

export function computeStandings(field: number[], events: ResultEventLike[]): Standings {
  const byId = new Map<number, Standing>(
    field.map((id) => [id, { competitorId: id, status: 'IN', position: null, outRound: null }]),
  )
  // Events are applied in log order, grouped by round for tie handling.
  const rounds = [...new Set(events.map((e) => e.round))].sort((a, b) => a - b)
  let currentRound = 0

  for (const round of rounds) {
    currentRound = round
    const outThisRound: Standing[] = []
    for (const e of events.filter((x) => x.round === round)) {
      const s = byId.get(e.competitorId)
      const err = transitionError(s?.status, e.kind)
      if (err || !s) throw new Error(`Round ${round}: ${err}`)
      s.status = NEXT[e.kind]
      if (e.kind === 'OUT') {
        s.outRound = round
        outThisRound.push(s)
      }
    }
    const stillAlive = [...byId.values()].filter((s) => s.status !== 'OUT').length
    for (const s of outThisRound) s.position = stillAlive + 1
  }

  const alive = [...byId.values()].filter((s) => s.status !== 'OUT').map((s) => s.competitorId)
  let champion: number | null = null
  if (alive.length === 1 && field.length > 1) {
    champion = alive[0]
    byId.get(champion)!.position = 1
  }
  return {
    byId,
    alive,
    finished: field.length > 1 && alive.length <= 1,
    champion,
    currentRound,
  }
}
