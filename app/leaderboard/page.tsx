import { requireUser } from '@/lib/auth'
import { getLeaderboard } from '@/lib/queries'
import { formatMoney } from '@/lib/money'

export default async function LeaderboardPage() {
  const me = await requireUser()
  const rows = await getLeaderboard()

  return (
    <div className="space-y-4">
      <header>
        <p className="eyebrow">Leaderboard</p>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Sharpest money</h1>
        <p className="mt-1 text-sm text-muted">
          Profit = cash + open bets at today&apos;s prices − money put in.
        </p>
      </header>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="eyebrow text-left">
              <th className="px-4 py-2.5 font-normal">#</th>
              <th className="px-2 py-2.5 font-normal">Name</th>
              <th className="px-2 py-2.5 text-right font-normal">Put in</th>
              <th className="px-2 py-2.5 text-right font-normal">Worth</th>
              <th className="px-4 py-2.5 text-right font-normal">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={r.id} className={r.id === me.id ? 'bg-surface-2' : ''}>
                <td className="px-4 py-2.5 text-muted num">{i + 1}</td>
                <td className="px-2 py-2.5 font-medium">{r.name}</td>
                <td className="px-2 py-2.5 text-right text-muted num">{formatMoney(r.invested)}</td>
                <td className="px-2 py-2.5 text-right num">{formatMoney(r.netWorth)}</td>
                <td className={`px-4 py-2.5 text-right font-semibold num ${r.pnl > 0 ? 'text-yes' : r.pnl < 0 ? 'text-no' : ''}`}>
                  {formatMoney(r.pnl, { sign: true })}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Nobody has put money in yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
