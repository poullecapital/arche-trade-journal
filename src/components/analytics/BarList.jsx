import { formatCurrency } from '../ui'

// Diverging bar list: bars grow right (profit, green) or left (loss, red) of a
// centre line, scaled to the largest absolute value in the list.
export function BarList({ rows, currency = 'INR', empty = 'Nothing to show yet.' }) {
  if (rows.length === 0) return <p className="text-sm text-[var(--ink-faint)]">{empty}</p>
  const max = Math.max(...rows.map((r) => Math.abs(r.pnl)), 1)

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const width = (Math.abs(r.pnl) / max) * 50
        const positive = r.pnl >= 0
        return (
          <li key={r.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium truncate">{r.key}</span>
              <span className={`tabular font-semibold shrink-0 ${positive ? 'text-[var(--accent)]' : 'text-[var(--red)]'}`}>
                {formatCurrency(r.pnl, currency)}
              </span>
            </div>
            <div className="inset relative h-2.5 rounded-full overflow-hidden">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--border)]" />
              <div
                className="absolute top-0 bottom-0 rounded-full"
                style={{
                  width: `${width}%`,
                  left: positive ? '50%' : `${50 - width}%`,
                  background: positive
                    ? 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 70%, white), var(--accent))'
                    : 'linear-gradient(180deg, color-mix(in srgb, var(--red) 70%, white), var(--red))',
                }}
              />
            </div>
            <div className="text-xs text-[var(--ink-faint)]">
              {r.count} trade{r.count === 1 ? '' : 's'} · {Math.round(r.winRate)}% win · avg {formatCurrency(r.avgPnl, currency)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
