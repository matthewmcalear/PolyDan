import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { getCurrentEdition, getEditionBoard } from '@/lib/queries'
import { FieldBoard } from '@/components/FieldBoard'
import { MarketCard, WinnerBoard } from '@/components/MarketCard'
import { AutoRefresh } from '@/components/ui'

const STATUS_TEXT = { SETUP: 'Coming up', LIVE: 'Live now', FINISHED: 'Finished' } as const

export default async function Home() {
  const user = await requireUser()
  const current = await getCurrentEdition()

  if (!current) {
    return (
      <div className="card mx-auto mt-10 max-w-md p-6 text-center">
        <h1 className="font-display text-2xl uppercase">No edition yet</h1>
        <p className="mt-2 text-sm text-muted">
          {user.isAdmin ? (
            <>
              Create one in <Link href="/admin?tab=setup" className="text-gold underline">Admin → Setup</Link>.
            </>
          ) : (
            'Markets open once Matt sets up the next Iron Man.'
          )}
        </p>
      </div>
    )
  }

  const { edition, field, standings, markets } = await getEditionBoard(current.id)
  const winner = markets.find((m) => m.kind === 'WINNER' && m.status !== 'VOID')
  const active = markets.filter((m) => m !== winner && (m.status === 'OPEN' || m.status === 'CLOSED'))
  const done = markets.filter((m) => m !== winner && (m.status === 'SETTLED' || m.status === 'VOID'))

  return (
    <div className="space-y-6">
      {edition.status === 'LIVE' && <AutoRefresh seconds={10} />}
      <header className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <div>
          <p className="eyebrow">
            {STATUS_TEXT[edition.status]}
            {edition.date && ` · ${edition.date.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}`}
          </p>
          <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Iron Man {edition.number}</h1>
        </div>
        {field.length > 0 && (
          <p className="pb-1 text-sm text-muted num">
            {standings.currentRound > 0 && `Round ${standings.currentRound} · `}
            {standings.alive.length} of {field.length} left
          </p>
        )}
      </header>

      {field.length > 0 && <FieldBoard field={field} />}

      {winner && <WinnerBoard market={winner} />}

      {active.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">More markets</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        </section>
      )}

      {!markets.length && (
        <p className="card p-6 text-center text-sm text-muted">No markets open yet — check back soon.</p>
      )}

      {done.length > 0 && (
        <details className="group">
          <summary className="eyebrow cursor-pointer list-none">
            <span className="group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span> Settled ({done.length})
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {done.map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
