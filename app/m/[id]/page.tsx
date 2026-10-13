import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getMarketDetail } from '@/lib/queries'
import { balanceCents } from '@/lib/markets'
import { prisma } from '@/lib/prisma'
import { formatMoney } from '@/lib/money'
import { PriceChart } from '@/components/PriceChart'
import { Trading } from '@/components/Trading'
import { StatusTag } from '@/components/MarketCard'
import { AutoRefresh } from '@/components/ui'

function ago(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export default async function MarketPage({ params }: PageProps<'/m/[id]'>) {
  const user = await requireUser()
  const id = Number((await params).id)
  const detail = Number.isInteger(id) ? await getMarketDetail(id, user.id) : null
  if (!detail) notFound()
  const { market, edition, series, myPositions, activity } = detail
  const balance = await balanceCents(prisma, user.id)
  const binary = market.outcomes.length === 2

  return (
    <div className="space-y-5">
      {market.tradable && <AutoRefresh seconds={8} />}
      <div>
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Iron Man {edition.number}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold uppercase tracking-wide sm:text-3xl">{market.question}</h1>
          <StatusTag market={market} />
        </div>
        <p className="mt-1 text-sm text-muted num">{formatMoney(market.volumeCents)} traded</p>
      </div>

      <section className="card p-4">
        <PriceChart series={series} binaryLabel={binary ? series[0]?.label : undefined} />
      </section>

      <Trading
        outcomes={market.outcomes}
        b={market.b}
        tradable={market.tradable}
        lockedReason={market.lockedReason}
        balanceCents={balance}
        holdings={myPositions}
        binary={binary}
      />

      <section>
        <h2 className="eyebrow mb-2">Activity</h2>
        {activity.length ? (
          <ul className="card divide-y divide-line text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center gap-2 px-4 py-2.5">
                <span className="font-medium">{a.user}</span>
                <span className={a.shares > 0 ? 'text-yes' : 'text-no'}>{a.shares > 0 ? 'bought' : 'sold'}</span>
                <span className="truncate">{a.outcome}</span>
                <span className="ml-auto text-muted num">{formatMoney(Math.abs(a.costCents))}</span>
                <span className="w-16 text-right text-xs text-muted">{ago(a.at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No bets yet — be the first.</p>
        )}
      </section>

      <details className="text-sm text-muted">
        <summary className="cursor-pointer">How this works</summary>
        <p className="mt-2 max-w-prose">
          Each share pays <strong>$1</strong> if its outcome happens and nothing if it doesn&apos;t, so the price is the
          family&apos;s current odds. Buying pushes the price up, selling pushes it down, and you can sell any time before
          the result is known. When someone is knocked out for good, their outcomes stop trading and the rest
          re-price. Winnings land in your balance when Matt settles at the end of the day.
        </p>
      </details>
    </div>
  )
}
