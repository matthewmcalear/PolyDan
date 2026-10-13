// Money is stored as integer cents everywhere; these helpers are the only
// place that converts to and from display values.

export function formatMoney(cents: number, opts: { sign?: boolean } = {}): string {
  const sign = cents < 0 ? '−' : opts.sign && cents > 0 ? '+' : ''
  const abs = Math.abs(cents) / 100
  const digits = Number.isInteger(abs) ? 0 : 2
  return `${sign}$${abs.toLocaleString('en-CA', { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`
}

export function formatPct(p: number): string {
  if (p > 0 && p < 0.01) return '<1%'
  if (p < 1 && p > 0.99) return '>99%'
  return `${Math.round(p * 100)}%`
}

/** Price shown as "cents per share", Polymarket-style: 0.37 → 37¢ */
export function formatPrice(p: number): string {
  const c = p * 100
  return c < 1 && c > 0 ? '<1¢' : `${c.toFixed(c < 10 ? 1 : 0)}¢`
}

/** What $1 returns if this outcome wins, at this price: 0.14 → "7.1×". */
export function formatMultiple(p: number): string {
  if (!(p > 0)) return '—'
  const m = 1 / p
  if (m >= 10) return `${Math.round(m)}×`
  return `${m.toFixed(1).replace(/\.0$/, '')}×`
}

export function parseDollarsToCents(input: string): number | null {
  const n = Number(String(input).replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

export function formatOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
