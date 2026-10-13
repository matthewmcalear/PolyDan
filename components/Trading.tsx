'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { trade } from '@/app/actions'
import type { OutcomeView } from '@/lib/queries'
import { prices, sellProceeds, sharesForSpend } from '@/lib/lmsr'
import { formatMoney, formatMultiple, formatPct } from '@/lib/money'
import { Notice, SubmitButton } from './ui'

interface Holding {
  outcomeId: number
  shares: number
  costCents: number
}

// Outcome list + trade ticket share the selected outcome, so they live in one
// client component. Quotes are computed locally with the same LMSR maths the
// server uses; the server re-prices at execution.
export function Trading({
  outcomes,
  b,
  tradable,
  lockedReason,
  balanceCents,
  holdings,
  binary,
}: {
  outcomes: OutcomeView[]
  b: number
  tradable: boolean
  lockedReason: string | null
  balanceCents: number
  holdings: Holding[]
  binary: boolean
}) {
  const ranked = useMemo(
    () => (binary ? outcomes : [...outcomes].sort((x, y) => Number(x.dead) - Number(y.dead) || y.price - x.price)),
    [outcomes, binary],
  )
  const firstLive = ranked.find((o) => !o.dead)
  const [selected, setSelected] = useState<number | undefined>(firstLive?.id)
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [amount, setAmount] = useState('')
  const [state, action] = useActionState(trade, {})

  useEffect(() => {
    if (state.ok) setAmount('')
  }, [state])

  // If the selected outcome just died (a knockout came in), move off it.
  useEffect(() => {
    if (outcomes.find((o) => o.id === selected)?.dead) setSelected(firstLive?.id)
  }, [outcomes, selected, firstLive])

  const held = new Map(holdings.map((h) => [h.outcomeId, h]))
  const live = outcomes.filter((o) => !o.dead)
  const sel = outcomes.find((o) => o.id === selected)
  const i = live.findIndex((o) => o.id === selected)
  const n = Number(amount)

  const quote = useMemo(() => {
    if (!sel || i < 0 || !(n > 0)) return null
    const q = live.map((o) => o.q)
    if (side === 'BUY') {
      const shares = sharesForSpend(q, b, i, n)
      q[i] += shares
      return { shares, avg: n / shares, payout: shares, after: prices(q, b)[i] }
    }
    const shares = Math.min(n, held.get(sel.id)?.shares ?? 0)
    const proceeds = Math.floor(sellProceeds(q, b, i, shares) * 100) / 100
    q[i] -= shares
    return { shares, avg: shares ? proceeds / shares : 0, proceeds, after: prices(q, b)[i] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, i, n, side, b, outcomes])

  const myShares = sel ? (held.get(sel.id)?.shares ?? 0) : 0

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="card divide-y divide-line">
        {ranked.map((o) => {
          const h = held.get(o.id)
          const isSel = o.id === selected
          return (
            <button
              key={o.id}
              type="button"
              disabled={o.dead || !tradable}
              onClick={() => setSelected(o.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition first:rounded-t-xl last:rounded-b-xl ${
                isSel && tradable ? 'bg-surface-2' : 'hover:bg-surface-2/60'
              } disabled:cursor-default`}
            >
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${o.dead ? 'text-muted line-through' : ''}`}>{o.label}</p>
                {h && (
                  <p className="text-xs text-gold num">
                    You hold {h.shares.toFixed(2)} · worth {formatMoney(Math.floor(h.shares * o.price * 100))}
                  </p>
                )}
              </div>
              <span className={`font-display text-xl font-semibold num ${o.dead ? 'text-muted' : ''}`}>
                {formatPct(o.price)}
              </span>
              {tradable && !o.dead && (
                <span
                  className={`w-20 rounded-md py-1.5 text-center text-sm font-semibold num ${
                    isSel ? 'bg-gold text-on-gold' : 'bg-yes-soft text-yes'
                  }`}
                >
                  pays {formatMultiple(o.price)}
                </span>
              )}
            </button>
          )
        })}
      </section>

      <aside className="card h-fit p-4 lg:sticky lg:top-20">
        {!tradable ? (
          <p className="text-sm text-muted">{lockedReason}</p>
        ) : (
          <form action={action} className="space-y-3">
            <input type="hidden" name="outcomeId" value={selected ?? ''} />
            <input type="hidden" name="side" value={side} />
            <div className="grid grid-cols-2 rounded-lg bg-surface-2 p-1 text-sm font-semibold">
              {(['BUY', 'SELL'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSide(s)
                    setAmount('')
                  }}
                  className={`rounded-md py-1.5 ${side === s ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
                >
                  {s === 'BUY' ? 'Buy' : 'Sell'}
                </button>
              ))}
            </div>
            <p className="text-sm">
              <span className="text-muted">{side === 'BUY' ? 'Backing' : 'Selling'} </span>
              <span className="font-semibold">{sel?.label ?? '—'}</span>
              {sel && <span className="text-muted num"> · pays {formatMultiple(sel.price)}</span>}
            </p>
            <label className="block">
              <span className="text-xs font-medium text-muted">{side === 'BUY' ? 'Amount ($)' : 'Shares to sell'}</span>
              <input
                name="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder={side === 'BUY' ? '10' : myShares.toFixed(2)}
                className="field mt-1 text-lg font-semibold num"
              />
            </label>
            <div className="flex gap-1.5">
              {side === 'BUY'
                ? [5, 10, 25].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="btn btn-ghost flex-1 px-2 py-1 text-xs"
                      onClick={() => setAmount(String((Number(amount) || 0) + v))}
                    >
                      +{v}
                    </button>
                  ))
                : [0.25, 0.5, 1].map((f) => (
                    <button
                      key={f}
                      type="button"
                      disabled={!myShares}
                      className="btn btn-ghost flex-1 px-2 py-1 text-xs"
                      onClick={() => setAmount((Math.floor(myShares * f * 100) / 100).toString())}
                    >
                      {f === 1 ? 'All' : `${f * 100}%`}
                    </button>
                  ))}
              {side === 'BUY' && (
                <button
                  type="button"
                  className="btn btn-ghost flex-1 px-2 py-1 text-xs"
                  onClick={() => setAmount((Math.floor(balanceCents) / 100).toString())}
                >
                  Max
                </button>
              )}
            </div>

            {quote && (
              <dl className="space-y-1 rounded-lg bg-surface-2 p-3 text-sm">
                {side === 'BUY' ? (
                  <>
                    <p className="text-base">
                      <span className="num">{formatMoney(Math.round(n * 100))}</span> →{' '}
                      <span className="font-semibold text-yes num">
                        {formatMoney(Math.floor((quote.payout ?? 0) * 100))}
                      </span>{' '}
                      {sel?.competitorId && sel.isYes == null ? `if ${sel.label} wins` : "if you're right"}
                    </p>
                    <Row k="Your payout (locked in)" v={formatMultiple(quote.avg)} />
                    <Row k="Next bet pays" v={formatMultiple(quote.after)} />
                  </>
                ) : (
                  <>
                    <Row k="Selling at" v={`${formatPct(quote.avg)} a share`} />
                    <Row k="Odds after" v={formatPct(quote.after)} />
                    <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
                      <dt>You receive</dt>
                      <dd className="num">{formatMoney(Math.round((quote.proceeds ?? 0) * 100))}</dd>
                    </div>
                  </>
                )}
              </dl>
            )}

            <SubmitButton
              className={`btn w-full ${side === 'BUY' ? 'btn-gold' : 'btn-danger'}`}
              pendingText="Placing…"
              disabled={!sel || !(n > 0) || (side === 'SELL' && !myShares)}
            >
              {side === 'BUY' ? `Buy ${sel?.label ?? ''}` : `Sell ${sel?.label ?? ''}`}
            </SubmitButton>
            <p className="text-center text-xs text-muted num">Balance {formatMoney(balanceCents)}</p>
            <Notice state={state} />
          </form>
        )}
      </aside>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{k}</dt>
      <dd className="num">{v}</dd>
    </div>
  )
}
