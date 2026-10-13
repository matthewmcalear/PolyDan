import type { Standing } from '@/lib/standings'
import { formatOrdinal } from '@/lib/money'

interface Entry {
  id: number
  name: string
  standing: Standing
}

/** Who's still in, who's on Redemption Island, and the order people went out. */
export function FieldBoard({ field }: { field: Entry[] }) {
  const inGame = field.filter((c) => c.standing.status === 'IN')
  const island = field.filter((c) => c.standing.status === 'ISLAND')
  const out = field
    .filter((c) => c.standing.status === 'OUT')
    .sort((a, b) => a.standing.position! - b.standing.position!)

  return (
    <section className="card space-y-4 p-4">
      <div>
        <p className="eyebrow mb-2">Still standing · {inGame.length}</p>
        <div className="flex flex-wrap gap-1.5">
          {inGame.map((c) => (
            <span
              key={c.id}
              className={`rounded-full border px-2.5 py-1 text-sm ${
                c.standing.position === 1 ? 'border-gold bg-gold text-on-gold font-semibold' : 'border-line-strong'
              }`}
            >
              {c.standing.position === 1 ? `⚜ ${c.name}` : c.name}
            </span>
          ))}
          {!inGame.length && <span className="text-sm text-muted">Nobody yet</span>}
        </div>
      </div>
      {island.length > 0 && (
        <div>
          <p className="eyebrow mb-2">Redemption Island · {island.length}</p>
          <div className="flex flex-wrap gap-1.5">
            {island.map((c) => (
              <span key={c.id} className="rounded-full bg-island-soft px-2.5 py-1 text-sm text-island">
                🏝 {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {out.length > 0 && (
        <div>
          <p className="eyebrow mb-2">Out · {out.length}</p>
          <div className="flex flex-wrap gap-1.5">
            {out.map((c) => (
              <span key={c.id} className="rounded-full bg-surface-2 px-2.5 py-1 text-sm text-muted">
                <span className="num">{formatOrdinal(c.standing.position!)}</span> {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
