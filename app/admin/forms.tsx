'use client'

import { useMemo, useState } from 'react'
import { headToHeadProbability, topNProbability, winnerProbabilities } from '@/lib/history'
import { DEFAULT_LIQUIDITY, normaliseOdds, type MarketKindName } from '@/lib/marketDefaults'
import { formatMoney, formatMultiple } from '@/lib/money'
import { ActionForm, SubmitButton } from '@/components/ui'
import {
  addMarket,
  adjustBalance,
  createEdition,
  createUser,
  recordResults,
  resetPin,
  resolveCustom,
  setEditionStatus,
  setField,
  setMarketStatus,
  settleAll,
  settleOne,
  undoLastResult,
  voidOne,
} from './actions'

interface Named {
  id: number
  name: string
}

// ---------------------------------------------------------------- results

const CHOICES = {
  IN: [
    ['', 'Still in'],
    ['TO_ISLAND', '🏝 Island'],
    ['OUT', 'Out'],
  ],
  ISLAND: [
    ['', 'On island'],
    ['RETURN', 'Returns'],
    ['OUT', 'Out'],
  ],
} as const

export function ResultsForm({
  editionId,
  nextRound,
  currentRound,
  competitors,
}: {
  editionId: number
  nextRound: number
  currentRound: number
  competitors: (Named & { status: 'IN' | 'ISLAND' | 'OUT' })[]
}) {
  const [picks, setPicks] = useState<Record<number, string>>({})
  const chosen = Object.values(picks).filter(Boolean).length
  return (
    <ActionForm action={recordResults} className="space-y-4" resetOnSuccess>
      <input type="hidden" name="editionId" value={editionId} />
      <label className="flex items-center gap-2 text-sm">
        Round
        <input
          name="round"
          type="number"
          min={1}
          defaultValue={nextRound}
          key={nextRound}
          className="field w-20 py-1 num"
        />
        {currentRound > 0 && <span className="text-xs text-muted">(use {currentRound} to add to the last round)</span>}
      </label>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {competitors.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-1.5">
            <span className={`text-sm ${c.status === 'ISLAND' ? 'text-island' : ''}`}>
              {c.status === 'ISLAND' && '🏝 '}
              {c.name}
            </span>
            <span className="flex gap-0.5">
              {CHOICES[c.status as 'IN' | 'ISLAND'].map(([v, label]) => {
                const on = (picks[c.id] ?? '') === v
                return (
                  <label
                    key={v}
                    className={`cursor-pointer rounded px-2 py-1 text-xs font-medium ${
                      on ? (v === 'OUT' ? 'bg-no text-white' : v ? 'bg-island text-white' : 'bg-surface-2') : 'text-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`r_${c.id}`}
                      value={v}
                      checked={on}
                      onChange={() => setPicks((p) => ({ ...p, [c.id]: v }))}
                      className="sr-only"
                    />
                    {label}
                  </label>
                )
              })}
            </span>
          </li>
        ))}
      </ul>
      <SubmitButton disabled={!chosen} pendingText="Saving…">
        Record {chosen || ''} result{chosen === 1 ? '' : 's'}
      </SubmitButton>
    </ActionForm>
  )
}

export function UndoForm({ editionId }: { editionId: number }) {
  return (
    <ActionForm action={undoLastResult} confirm="Undo the most recent result?">
      <input type="hidden" name="editionId" value={editionId} />
      <SubmitButton className="text-xs text-no hover:underline" pendingText="…">
        Undo last
      </SubmitButton>
    </ActionForm>
  )
}

// ---------------------------------------------------------------- markets

export function NewMarketForm({
  editionId,
  competitors,
  hasWinner,
}: {
  editionId: number
  competitors: Named[]
  hasWinner: boolean
}) {
  const [kind, setKind] = useState<MarketKindName>(hasWinner ? 'H2H' : 'WINNER')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [who, setWho] = useState('')
  const [n, setN] = useState('5')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState('Yes\nNo')
  const [liquidity, setLiquidity] = useState('')
  const nameOf = (id: string) => competitors.find((c) => String(c.id) === id)?.name

  // Outcomes in the same order the server creates them, with history-based odds.
  const suggested = useMemo((): { label: string; p: number }[] => {
    if (kind === 'WINNER') {
      const p = winnerProbabilities(competitors.map((c) => c.name))
      return competitors.map((c, i) => ({ label: c.name, p: p[i] }))
    }
    if (kind === 'H2H') {
      const [an, bn] = [nameOf(a), nameOf(b)]
      if (!an || !bn || a === b) return []
      const p = headToHeadProbability(an, bn)
      return [
        { label: an, p },
        { label: bn, p: 1 - p },
      ]
    }
    if (kind === 'TOP_N') {
      const name = nameOf(who)
      const top = Number(n)
      if (!name || !(top >= 1 && top < competitors.length)) return []
      const p = topNProbability(name, top, competitors.length)
      return [
        { label: 'Yes', p },
        { label: 'No', p: 1 - p },
      ]
    }
    const opts = options.split('\n').map((o) => o.trim()).filter(Boolean)
    return opts.length >= 2 ? opts.map((label) => ({ label, p: 1 / opts.length })) : []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, a, b, who, n, options, competitors])

  // Edits are kept only while the outcome list stays the same.
  const signature = `${kind}|${suggested.map((o) => o.label).join('|')}|${n}`
  const [edits, setEdits] = useState<{ sig: string; values: string[] }>({ sig: '', values: [] })
  const values =
    edits.sig === signature ? edits.values : suggested.map((o) => (Math.round(o.p * 1000) / 10).toString())
  const edited = edits.sig === signature
  const setValue = (i: number, v: string) => {
    const next = values.slice()
    next[i] = v.replace(/[^0-9.]/g, '')
    setEdits({ sig: signature, values: next })
  }
  const weights = values.map(Number)
  const total = weights.reduce((s, w) => s + (Number.isFinite(w) ? w : 0), 0)
  const probs = normaliseOdds(weights)
  const liq = Number(liquidity) || DEFAULT_LIQUIDITY[kind]
  const worstCase = probs ? liq * Math.log(1 / Math.min(...probs)) : null

  const pick = (value: string, set: (v: string) => void, label: string) => (
    <label className="block text-sm">
      {label}
      <select value={value} onChange={(e) => set(e.target.value)} required className="field mt-1">
        <option value="" disabled>
          Pick…
        </option>
        {competitors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <ActionForm
      action={addMarket}
      className="space-y-3"
      onSuccess={() => {
        setA('')
        setB('')
        setWho('')
        setQuestion('')
        setEdits({ sig: '', values: [] })
      }}
    >
      <input type="hidden" name="editionId" value={editionId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="a" value={a} />
      <input type="hidden" name="b" value={b} />
      <input type="hidden" name="competitorId" value={who} />
      <input type="hidden" name="n" value={n} />
      <input type="hidden" name="question" value={question} />
      <input type="hidden" name="options" value={options} />
      <input type="hidden" name="liquidity" value={liquidity} />
      <input
        type="hidden"
        name="odds"
        value={edited ? JSON.stringify(Object.fromEntries(suggested.map((o, i) => [o.label, weights[i]]))) : ''}
      />

      <div className="grid grid-cols-2 gap-1 text-sm">
        {(
          [
            ['WINNER', 'Winner'],
            ['H2H', 'Head to head'],
            ['TOP_N', 'Top N'],
            ['CUSTOM', 'Custom'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-md border px-2 py-1.5 ${
              kind === k ? 'border-gold bg-surface-2 font-semibold' : 'border-line text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {kind === 'WINNER' && hasWinner && <p className="text-sm text-no">There’s already a winner market.</p>}
      {kind === 'H2H' && (
        <>
          {pick(a, setA, 'Who lasts longer…')}
          {pick(b, setB, '…versus')}
        </>
      )}
      {kind === 'TOP_N' && (
        <>
          {pick(who, setWho, 'Competitor')}
          <label className="block text-sm">
            Finishes in the top
            <input value={n} onChange={(e) => setN(e.target.value)} type="number" min={1} className="field mt-1 num" />
          </label>
        </>
      )}
      {kind === 'CUSTOM' && (
        <>
          <label className="block text-sm">
            Question
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              placeholder="Will anyone podium off Redemption Island?"
              className="field mt-1"
            />
          </label>
          <label className="block text-sm">
            Options (one per line)
            <textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={3} className="field mt-1" />
          </label>
        </>
      )}

      {suggested.length > 0 && (
        <div className="rounded-lg border border-line">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="eyebrow">Opening odds</span>
            {edited ? (
              <button
                type="button"
                className="text-xs text-gold hover:underline"
                onClick={() => setEdits({ sig: '', values: [] })}
              >
                Reset to {kind === 'CUSTOM' ? 'even' : 'history'}
              </button>
            ) : (
              <span className="text-xs text-muted">{kind === 'CUSTOM' ? 'even split' : 'from history'}</span>
            )}
          </div>
          <ul className="max-h-72 divide-y divide-line overflow-y-auto text-sm">
            {suggested.map((o, i) => (
              <li key={o.label} className="flex items-center gap-2 px-3 py-1">
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                <input
                  aria-label={`${o.label} opening %`}
                  value={values[i] ?? ''}
                  onChange={(e) => setValue(i, e.target.value)}
                  inputMode="decimal"
                  className="field w-16 px-2 py-0.5 text-right num"
                />
                <span className="w-4 text-muted">%</span>
                <span className="w-16 text-right text-xs text-muted num">
                  pays {probs ? formatMultiple(probs[i]) : '—'}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-0.5 border-t border-line px-3 py-2 text-xs text-muted num">
            <p>
              Total {edited ? Math.round(total * 10) / 10 : 100}%
              {edited && probs && Math.abs(total - 100) > 0.05 && ' — will be scaled to 100%'}
              {!probs && <span className="text-no"> — every outcome needs at least 0.5%</span>}
            </p>
            {worstCase != null && <p>House worst case ≈ {formatMoney(Math.round(worstCase * 100))}</p>}
          </div>
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Liquidity</summary>
        <label className="mt-2 block">
          <input
            value={liquidity}
            onChange={(e) => setLiquidity(e.target.value)}
            type="number"
            min={5}
            max={1000}
            placeholder={`${DEFAULT_LIQUIDITY[kind]} (default)`}
            className="field num"
          />
        </label>
        <p className="mt-1 text-xs text-muted">
          Higher = odds move less per bet, but a bigger house worst case if a long shot comes in.
        </p>
      </details>
      <SubmitButton pendingText="Opening…" disabled={!suggested.length || !probs}>
        Open market
      </SubmitButton>
    </ActionForm>
  )
}

export function MarketActions({
  market,
}: {
  market: { id: number; kind: string; status: string; resolved: boolean; outcomes: { id: number; label: string }[] }
}) {
  if (market.status === 'SETTLED' || market.status === 'VOID') return null
  const id = <input type="hidden" name="marketId" value={market.id} />
  return (
    <div className="flex flex-wrap items-start gap-2">
      {market.resolved && (
        <ActionForm action={settleOne}>
          {id}
          <SubmitButton className="btn btn-gold px-3 py-1 text-xs" pendingText="Paying…">
            Settle & pay out
          </SubmitButton>
        </ActionForm>
      )}
      {!market.resolved && (
        <ActionForm action={setMarketStatus}>
          {id}
          <input type="hidden" name="status" value={market.status === 'OPEN' ? 'CLOSED' : 'OPEN'} />
          <SubmitButton className="btn btn-ghost px-3 py-1 text-xs" pendingText="…">
            {market.status === 'OPEN' ? 'Pause trading' : 'Reopen'}
          </SubmitButton>
        </ActionForm>
      )}
      {market.kind === 'CUSTOM' && (
        <ActionForm action={resolveCustom} className="flex items-center gap-1">
          {id}
          <select name="outcomeId" className="field w-auto py-1 text-xs" defaultValue="">
            <option value="">No result</option>
            {market.outcomes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} wins
              </option>
            ))}
          </select>
          <SubmitButton className="btn btn-ghost px-3 py-1 text-xs" pendingText="…">
            Set result
          </SubmitButton>
        </ActionForm>
      )}
      <ActionForm action={voidOne} confirm="Void this market and refund everyone's stakes?">
        {id}
        <SubmitButton className="btn btn-danger px-3 py-1 text-xs" pendingText="…">
          Void
        </SubmitButton>
      </ActionForm>
    </div>
  )
}

export function SettleAllForm({ editionId, disabled }: { editionId: number; disabled: boolean }) {
  return (
    <ActionForm action={settleAll} confirm="Pay out every market that has a result?" className="flex items-center gap-3">
      <input type="hidden" name="editionId" value={editionId} />
      <SubmitButton pendingText="Paying out…" disabled={disabled}>
        Settle all decided
      </SubmitButton>
    </ActionForm>
  )
}

// ---------------------------------------------------------------- players

export function CreateUserForm() {
  return (
    <ActionForm action={createUser} className="space-y-3" resetOnSuccess>
      <label className="block text-sm">
        Name
        <input name="name" required className="field mt-1" />
      </label>
      <label className="block text-sm">
        PIN (4–8 digits)
        <input name="pin" required inputMode="numeric" pattern="\d{4,8}" className="field mt-1 num" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isAdmin" /> Admin
      </label>
      <SubmitButton>Add player</SubmitButton>
    </ActionForm>
  )
}

export function BalanceForm({ userId }: { userId: number }) {
  return (
    <ActionForm action={adjustBalance} className="flex flex-wrap items-center gap-1.5" resetOnSuccess>
      <input type="hidden" name="userId" value={userId} />
      <input name="amount" inputMode="decimal" placeholder="$" required className="field w-20 py-1 text-sm num" />
      <input name="note" placeholder="Note (e-Transfer…)" className="field w-36 py-1 text-sm" />
      <select name="kind" className="field w-auto py-1 text-sm" defaultValue="DEPOSIT">
        <option value="DEPOSIT">Credit</option>
        <option value="WITHDRAWAL">Cash out</option>
      </select>
      <SubmitButton className="btn btn-ghost px-3 py-1 text-xs" pendingText="…">
        Apply
      </SubmitButton>
    </ActionForm>
  )
}

export function ResetPinForm({ userId }: { userId: number }) {
  return (
    <ActionForm action={resetPin} className="flex items-center gap-1.5" resetOnSuccess>
      <input type="hidden" name="userId" value={userId} />
      <input name="pin" placeholder="New PIN" inputMode="numeric" required className="field w-24 py-1 text-sm num" />
      <SubmitButton className="btn btn-ghost px-3 py-1 text-xs" pendingText="…">
        Reset
      </SubmitButton>
    </ActionForm>
  )
}

// ---------------------------------------------------------------- edition

export function CreateEditionForm({ nextNumber }: { nextNumber: number }) {
  return (
    <ActionForm action={createEdition} className="space-y-3">
      <label className="block text-sm">
        Edition #
        <input name="number" type="number" defaultValue={nextNumber} className="field mt-1 num" />
      </label>
      <label className="block text-sm">
        Date
        <input name="date" type="date" className="field mt-1" />
      </label>
      <SubmitButton>Create edition</SubmitButton>
    </ActionForm>
  )
}

export function EditionStatusForm({ editionId, status }: { editionId: number; status: string }) {
  return (
    <ActionForm action={setEditionStatus} className="flex items-center gap-1.5">
      <input type="hidden" name="editionId" value={editionId} />
      <select name="status" defaultValue={status} className="field w-auto py-1 text-sm">
        <option value="SETUP">Coming up</option>
        <option value="LIVE">Live</option>
        <option value="FINISHED">Finished</option>
      </select>
      <SubmitButton className="btn btn-ghost px-3 py-1 text-xs" pendingText="…">
        Set
      </SubmitButton>
    </ActionForm>
  )
}

export function FieldForm({
  editionId,
  competitors,
  selected,
  locked,
}: {
  editionId: number
  competitors: Named[]
  selected: number[]
  locked: boolean
}) {
  const [picked, setPicked] = useState(new Set(selected))
  return (
    <ActionForm action={setField} className="space-y-3">
      <input type="hidden" name="editionId" value={editionId} />
      {locked && <p className="text-sm text-muted">The field is locked because markets or results exist.</p>}
      <p className="text-sm text-muted num">{picked.size} selected</p>
      <fieldset disabled={locked} className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {competitors.map((c) => (
          <label
            key={c.id}
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-sm ${
              picked.has(c.id) ? 'border-gold bg-surface-2' : 'border-line'
            }`}
          >
            <input
              type="checkbox"
              name="competitorId"
              value={c.id}
              checked={picked.has(c.id)}
              onChange={(e) => {
                const next = new Set(picked)
                if (e.target.checked) next.add(c.id)
                else next.delete(c.id)
                setPicked(next)
              }}
            />
            {c.name}
          </label>
        ))}
      </fieldset>
      {!locked && (
        <>
          <label className="block text-sm">
            New competitors (comma or one per line)
            <textarea name="newNames" rows={2} className="field mt-1" />
          </label>
          <SubmitButton>Save field</SubmitButton>
        </>
      )}
    </ActionForm>
  )
}
