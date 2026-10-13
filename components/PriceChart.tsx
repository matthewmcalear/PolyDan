'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChartSeries } from '@/lib/queries'

// Step-line chart of each outcome's price over time (prices only change on
// trades and results). ≤4 series, fixed slot order, direct labels at the
// line ends + a legend, crosshair tooltip listing every series.

const SLOTS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)']
const H = 220
const PAD = { top: 12, right: 96, bottom: 26, left: 36 }

function fmtTime(t: number, spanMs: number) {
  const d = new Date(t)
  return spanMs < 36 * 3600e3
    ? d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export function PriceChart({ series, binaryLabel }: { series: ChartSeries[]; binaryLabel?: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [measured, setW] = useState<number | null>(null)
  const w = measured ?? 0
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const times = series[0]?.points.map((p) => p.t) ?? []
  const t0 = times[0] ?? 0
  const t1 = Math.max(times.at(-1) ?? 1, t0 + 60_000)
  const innerW = w - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * innerW
  const y = (p: number) => PAD.top + (1 - p) * innerH

  const paths = useMemo(
    () =>
      series.map((s) =>
        s.points
          .map((pt, i) => {
            const X = x(pt.t).toFixed(1)
            const Y = y(pt.p).toFixed(1)
            if (i === 0) return `M${X},${Y}`
            return `H${X}V${Y}` // step: hold the old price until the trade
          })
          .join(''),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, w],
  )

  // Direct labels at the right edge, nudged apart so they never collide.
  const labels = useMemo(() => {
    const ends = series
      .map((s, i) => ({ i, label: binaryLabel ?? s.label, p: s.points.at(-1)?.p ?? 0, y: y(s.points.at(-1)?.p ?? 0) }))
      .sort((a, b) => a.y - b.y)
    for (let k = 1; k < ends.length; k++) ends[k].y = Math.max(ends[k].y, ends[k - 1].y + 15)
    return ends
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, w, binaryLabel])

  if (!series.length) return null

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const t = t0 + ((e.clientX - rect.left) / rect.width) * (t1 - t0)
    let idx = 0
    for (let i = 0; i < times.length; i++) if (times[i] <= t) idx = i
    setHover(idx)
  }

  const hv = hover != null ? hover : null
  const hx = hv != null ? x(times[hv]) : 0

  return (
    <div ref={wrap} className="relative w-full select-none" style={{ minHeight: H }}>
      {measured != null && (
        <>
          {series.length > 1 && (
            <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
              {series.map((s, i) => (
                <li key={s.outcomeId} className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 rounded" style={{ background: SLOTS[i] }} />
                  {s.label}
                </li>
              ))}
            </ul>
          )}
          <svg width={w} height={H} role="img" aria-label="Price history chart">
            {[0, 0.25, 0.5, 0.75, 1].map((g) => (
              <g key={g}>
                <line x1={PAD.left} x2={PAD.left + innerW} y1={y(g)} y2={y(g)} stroke="var(--grid)" strokeWidth={1} />
                <text x={PAD.left - 6} y={y(g) + 4} textAnchor="end" fontSize={11} fill="var(--muted)" className="num">
                  {Math.round(g * 100)}%
                </text>
              </g>
            ))}
            <text x={PAD.left} y={H - 6} fontSize={11} fill="var(--muted)">
              {fmtTime(t0, t1 - t0)}
            </text>
            <text x={PAD.left + innerW} y={H - 6} fontSize={11} fill="var(--muted)" textAnchor="end">
              Now
            </text>
            {paths.map((d, i) => (
              <path
                key={series[i].outcomeId}
                d={d}
                fill="none"
                stroke={SLOTS[i]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {series.map((s, i) => (
              <circle
                key={s.outcomeId}
                cx={x(s.points.at(-1)!.t)}
                cy={y(s.points.at(-1)!.p)}
                r={4}
                fill={SLOTS[i]}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            ))}
            {labels.map((l) => (
              <text key={l.i} x={PAD.left + innerW + 10} y={l.y + 4} fontSize={12} fill="var(--ink)">
                <tspan fontWeight={600} className="num">
                  {Math.round(l.p * 100)}%
                </tspan>
                <tspan fill="var(--ink-2)"> {l.label.length > 9 ? `${l.label.slice(0, 8)}…` : l.label}</tspan>
              </text>
            ))}
            {hv != null && (
              <line x1={hx} x2={hx} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--line-strong)" strokeWidth={1} />
            )}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
          {hv != null && (
            <div
              className="pointer-events-none absolute top-8 z-10 min-w-36 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg"
              style={{ left: Math.min(Math.max(hx - 70, 0), w - 160) }}
            >
              <p className="mb-1 text-muted">{new Date(times[hv]).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
              {series.map((s, i) => (
                <p key={s.outcomeId} className="flex items-center gap-2">
                  <span className="inline-block h-0.5 w-3 rounded" style={{ background: SLOTS[i] }} />
                  <span className="font-semibold num">{Math.round(s.points[hv].p * 100)}%</span>
                  <span className="text-ink-2">{binaryLabel ?? s.label}</span>
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
