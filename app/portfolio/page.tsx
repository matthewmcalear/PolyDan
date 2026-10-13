import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { getPortfolio } from '@/lib/queries'
import { formatMoney, formatPct } from '@/lib/money'
import { logout } from '../actions'

const KIND_TEXT = {
  DEPOSIT: 'Credited',
  WITHDRAWAL: 'Cashed out',
  BUY: 'Bet',
  SELL: 'Sold',
  PAYOUT: 'Payout',
  REFUND: 'Refund',
} as const

export default async function PortfolioPage() {
  const user = await requireUser()
  const { balance, positions, ledger } = await getPortfolio(user.id)
  const openValue = positions.reduce((s, p) => s + p.valueCents, 0)

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide">{user.name}</h1>
        </div>
        <form action={logout}>
          <button className="text-sm text-muted hover:text-ink">Log out</button>
        </form>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['Cash', balance],
          ['In play', openValue],
          ['Total', balance + openValue],
        ].map(([k, v]) => (
          <div key={k} className="card p-3 sm:p-4">
            <p className="eyebrow">{k}</p>
            <p className="mt-1 font-display text-xl font-semibold sm:text-2xl num">{formatMoney(v as number)}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="eyebrow mb-2">Open positions</h2>
        {positions.length ? (
          <ul className="card divide-y divide-line">
            {positions.map((p) => {
              const pnl = p.valueCents - p.costCents
              return (
                <li key={p.outcomeId}>
                  <Link href={`/m/${p.market.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-muted">{p.market.question}</p>
                      <p className="font-medium">
                        {p.label}{' '}
                        <span className="text-sm font-normal text-muted num">
                          · {p.shares.toFixed(2)} sh @ {formatPct(p.price)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold num">{formatMoney(p.valueCents)}</p>
                      <p className={`text-xs num ${pnl >= 0 ? 'text-yes' : 'text-no'}`}>{formatMoney(pnl, { sign: true })}</p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="card p-4 text-sm text-muted">
            No open bets. <Link href="/" className="text-gold underline">Browse markets</Link>.
          </p>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-2">History</h2>
        {ledger.length ? (
          <ul className="card divide-y divide-line text-sm">
            {ledger.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-20 shrink-0 text-xs text-muted">
                  {l.createdAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{KIND_TEXT[l.kind]}</span>
                  {l.note && <span className="text-muted"> · {l.note}</span>}
                </span>
                <span className={`font-semibold num ${l.amountCents >= 0 ? 'text-yes' : ''}`}>
                  {formatMoney(l.amountCents, { sign: true })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-4 text-sm text-muted">Nothing yet. Pay Matt and he&apos;ll credit your account.</p>
        )}
      </section>
    </div>
  )
}
