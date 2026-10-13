import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEditionBoard, getPlayerAccounts } from '@/lib/queries'
import { maxHouseLoss } from '@/lib/lmsr'
import { formatMoney, formatOrdinal, formatPct } from '@/lib/money'
import { StatusTag } from '@/components/MarketCard'
import {
  BalanceForm,
  CreateEditionForm,
  CreateUserForm,
  EditionStatusForm,
  FieldForm,
  MarketActions,
  NewMarketForm,
  ResetPinForm,
  ResultsForm,
  SettleAllForm,
  UndoForm,
} from './forms'

const TABS = [
  { key: 'setup', label: 'Setup' },
  { key: 'players', label: 'Players & money' },
  { key: 'markets', label: 'Markets' },
  { key: 'results', label: 'Results' },
] as const
type Tab = (typeof TABS)[number]['key']

export default async function AdminPage({ searchParams }: PageProps<'/admin'>) {
  await requireAdmin()
  const sp = await searchParams
  const editions = await prisma.edition.findMany({ orderBy: { number: 'desc' } })
  const editionId = Number(sp.edition) || editions.find((e) => e.status === 'LIVE')?.id || editions[0]?.id
  // Land on Setup until an edition is live, then on Results (the day-of job).
  const live = editions.find((e) => e.id === editionId)?.status === 'LIVE'
  const tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : live ? 'results' : 'setup') as Tab
  const href = (t: Tab) => `/admin?tab=${t}${editionId ? `&edition=${editionId}` : ''}`

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Control room</h1>
        </div>
        {editions.length > 1 && (
          <nav className="ml-auto flex gap-1 text-sm">
            {editions.map((e) => (
              <Link
                key={e.id}
                href={`/admin?tab=${tab}&edition=${e.id}`}
                className={`rounded-md px-2.5 py-1 ${e.id === editionId ? 'bg-surface-2 font-semibold' : 'text-muted'}`}
              >
                IM {e.number}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-line text-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href(t.key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 font-medium ${
              tab === t.key ? 'border-gold text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'players' ? (
        <PlayersTab />
      ) : tab === 'setup' ? (
        <EditionTab editionId={editionId} />
      ) : !editionId ? (
        <p className="card p-4 text-sm">
          No edition yet — start in the <Link href={href('setup')} className="text-gold underline">Setup</Link> tab.
        </p>
      ) : tab === 'results' ? (
        <ResultsTab editionId={editionId} />
      ) : (
        <MarketsTab editionId={editionId} />
      )}
    </div>
  )
}

// ------------------------------------------------------------------ results

async function ResultsTab({ editionId }: { editionId: number }) {
  const { edition, field, standings } = await getEditionBoard(editionId)
  const log = await prisma.resultEvent.findMany({
    where: { editionId },
    orderBy: { id: 'asc' },
    include: { competitor: true },
  })
  if (!field.length) return <p className="card p-4 text-sm">Set the field in the Setup tab first.</p>

  const rounds = [...new Set(log.map((e) => e.round))].sort((a, b) => b - a)
  const word = { TO_ISLAND: '→ island', OUT: 'out', RETURN: 'back from island' }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <section className="card p-4">
        <h2 className="mb-1 font-semibold">Record a round</h2>
        <p className="mb-4 text-sm text-muted">
          Last place each round goes to Redemption Island or out. Markets that become certain lock straight away; nothing
          pays out until you settle.
        </p>
        {standings.finished ? (
          <p className="text-sm font-medium text-gold">
            Finished — {field.find((c) => c.id === standings.champion)?.name ?? 'dead heat'} is the champion.
          </p>
        ) : (
          <ResultsForm
            editionId={edition.id}
            nextRound={standings.currentRound + 1}
            currentRound={standings.currentRound}
            competitors={field
              .filter((c) => c.standing.status !== 'OUT')
              .map((c) => ({ id: c.id, name: c.name, status: c.standing.status }))}
          />
        )}
      </section>
      <aside className="space-y-3">
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Log</h2>
            {log.length > 0 && <UndoForm editionId={edition.id} />}
          </div>
          {rounds.length ? (
            <ol className="space-y-2 text-sm">
              {rounds.map((r) => (
                <li key={r}>
                  <span className="eyebrow">Round {r}</span>
                  <ul>
                    {log
                      .filter((e) => e.round === r)
                      .map((e) => (
                        <li key={e.id}>
                          {e.competitor.name} <span className="text-muted">{word[e.kind]}</span>
                          {e.kind === 'OUT' && (
                            <span className="text-muted num"> ({formatOrdinal(standings.byId.get(e.competitorId)?.position ?? 0)})</span>
                          )}
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">No results yet.</p>
          )}
        </div>
      </aside>
    </div>
  )
}

// ------------------------------------------------------------------ markets

async function MarketsTab({ editionId }: { editionId: number }) {
  const { field, markets } = await getEditionBoard(editionId)
  const [ledger, trades] = await Promise.all([
    prisma.ledgerEntry.groupBy({
      by: ['marketId', 'kind'],
      where: { market: { editionId } },
      _sum: { amountCents: true },
    }),
    prisma.trade.findMany({ where: { market: { editionId } }, select: { marketId: true, outcomeId: true, shares: true } }),
  ])
  // House view per market: money taken in, paid out, and the worst case.
  const house = (marketId: number) => {
    const rows = ledger.filter((l) => l.marketId === marketId)
    const sum = (k: string[]) => rows.filter((r) => k.includes(r.kind)).reduce((s, r) => s + (r._sum.amountCents ?? 0), 0)
    return { taken: -sum(['BUY', 'SELL']), paid: sum(['PAYOUT', 'REFUND']) }
  }
  const risk = (m: (typeof markets)[number]) => {
    const openQ = m.outcomes.map(
      (o) => o.q - trades.filter((t) => t.outcomeId === o.id).reduce((s, t) => s + t.shares, 0),
    )
    return maxHouseLoss(openQ, m.b)
  }
  const decided = markets.filter((m) => m.resolved && (m.status === 'OPEN' || m.status === 'CLOSED'))
  const competitors = field.map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section className="space-y-3">
        <div className={`card flex flex-wrap items-center gap-3 p-4 ${decided.length ? 'border-gold' : ''}`}>
          <p className="flex-1 text-sm">
            {decided.length ? (
              <>
                <span className="font-semibold">{decided.length}</span> market{decided.length > 1 ? 's have' : ' has'} a
                result waiting to pay out.
              </>
            ) : (
              <span className="text-muted">Nothing waiting to pay out.</span>
            )}
          </p>
          <SettleAllForm editionId={editionId} disabled={!decided.length} />
        </div>
        {markets.map((m) => {
          const h = house(m.id)
          return (
            <div key={m.id} className="card space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/m/${m.id}`} className="font-semibold hover:underline">
                  {m.question}
                </Link>
                <StatusTag market={m} />
              </div>
              <p className="text-xs text-muted num">
                Took in {formatMoney(h.taken)} · paid {formatMoney(h.paid)} · liquidity {m.b} · house risk ≤{' '}
                {formatMoney(Math.round(risk(m) * 100))}
                {m.outcomes.length === 2 && !m.resolved && ` · ${m.outcomes[0].label} ${formatPct(m.outcomes[0].price)}`}
              </p>
              <MarketActions
                market={{
                  id: m.id,
                  kind: m.kind,
                  status: m.status,
                  resolved: m.resolved,
                  outcomes: m.outcomes.map((o) => ({ id: o.id, label: o.label })),
                }}
              />
            </div>
          )
        })}
        {!markets.length && <p className="card p-4 text-sm text-muted">No markets yet — open one →</p>}
      </section>
      <aside className="card h-fit p-4">
        <h2 className="mb-3 font-semibold">Open a market</h2>
        <NewMarketForm
          editionId={editionId}
          competitors={competitors}
          hasWinner={markets.some((m) => m.kind === 'WINNER' && m.status !== 'VOID')}
        />
      </aside>
    </div>
  )
}

// ------------------------------------------------------------------ players

async function PlayersTab() {
  const players = await getPlayerAccounts()
  const total = (k: 'balance' | 'open' | 'invested') => players.reduce((t, p) => t + p[k], 0)

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <section className="space-y-3">
        {/* What the family holds right now — i.e. what you'd owe if everyone cashed out. */}
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ['Put in', total('invested')],
              ['Cash held', total('balance')],
              ['In live bets', total('open')],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="card p-3">
              <p className="eyebrow">{k}</p>
              <p className="mt-1 font-display text-xl font-semibold num">{formatMoney(v)}</p>
            </div>
          ))}
        </div>

        <div className="card divide-y divide-line">
          {players.map((u) => (
            <details key={u.id} className="group" open={u.bets.length > 0}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-2/60">
                <span className="w-4 text-muted group-open:rotate-90">▸</span>
                <span className="min-w-28 font-semibold">
                  {u.name} {u.isAdmin && <span className="text-xs font-normal text-gold">admin</span>}
                </span>
                <Stat label="Cash" value={formatMoney(u.balance)} strong />
                <Stat label="Live bets" value={`${formatMoney(u.open)} · ${u.bets.filter((b) => !b.dead).length}`} />
                <Stat label="Put in" value={formatMoney(u.invested)} />
                <span className={`ml-auto text-sm font-semibold num ${u.pnl > 0 ? 'text-yes' : u.pnl < 0 ? 'text-no' : 'text-muted'}`}>
                  {formatMoney(u.pnl, { sign: true })}
                </span>
              </summary>
              <div className="space-y-3 px-4 pb-4 pl-12">
                {u.bets.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted">
                        <th className="py-1 font-normal">Bet</th>
                        <th className="py-1 text-right font-normal">Shares</th>
                        <th className="py-1 text-right font-normal">Staked</th>
                        <th className="py-1 text-right font-normal">Worth now</th>
                        <th className="py-1 text-right font-normal">Pays if right</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {u.bets.map((b) => (
                        <tr key={b.outcomeId}>
                          <td className="py-1.5 pr-2">
                            <Link href={`/m/${b.market.id}`} className="hover:underline">
                              <span className="font-medium">{b.label}</span>{' '}
                              <span className="text-muted">· {b.market.question}</span>
                            </Link>
                            {b.dead ? (
                              <span className="ml-1 text-xs text-no">lost</span>
                            ) : (
                              b.market.resolved && <span className="ml-1 text-xs text-gold">won · awaiting payout</span>
                            )}
                          </td>
                          <td className="py-1.5 text-right num">{b.shares.toFixed(2)}</td>
                          <td className="py-1.5 text-right num">{formatMoney(b.costCents)}</td>
                          <td className="py-1.5 text-right num">
                            {formatMoney(b.valueCents)} <span className="text-xs text-muted">({formatPct(b.price)})</span>
                          </td>
                          <td className="py-1.5 text-right num">{b.dead ? '—' : formatMoney(Math.floor(b.shares * 100))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted">No live bets.</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <BalanceForm userId={u.id} />
                  <ResetPinForm userId={u.id} />
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>
      <aside className="card h-fit p-4">
        <h2 className="mb-3 font-semibold">Add a player</h2>
        <CreateUserForm />
      </aside>
    </div>
  )
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span className="text-sm">
      <span className="text-xs text-muted">{label} </span>
      <span className={`num ${strong ? 'font-semibold' : ''}`}>{value}</span>
    </span>
  )
}

// ------------------------------------------------------------------ edition

async function EditionTab({ editionId }: { editionId?: number }) {
  const [edition, competitors, last] = await Promise.all([
    editionId
      ? prisma.edition.findUnique({
          where: { id: editionId },
          include: { entries: true, _count: { select: { markets: true, results: true } } },
        })
      : null,
    prisma.competitor.findMany({ orderBy: { name: 'asc' } }),
    prisma.edition.findFirst({ orderBy: { number: 'desc' } }),
  ])
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      {edition ? (
        <section className="card space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-semibold">Iron Man {edition.number} field</h2>
            <EditionStatusForm editionId={edition.id} status={edition.status} />
          </div>
          <FieldForm
            editionId={edition.id}
            competitors={competitors}
            selected={edition.entries.map((e) => e.competitorId)}
            locked={edition._count.markets + edition._count.results > 0}
          />
        </section>
      ) : (
        <p className="card p-4 text-sm text-muted">Create the first edition →</p>
      )}
      <aside className="card h-fit p-4">
        <h2 className="mb-3 font-semibold">New edition</h2>
        <CreateEditionForm nextNumber={(last?.number ?? 9) + 1} />
      </aside>
    </div>
  )
}
