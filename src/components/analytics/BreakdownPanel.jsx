import { useMemo } from 'react'
import { Card, EmptyState } from '../ui'
import { BarList } from './BarList'
import { byFreeTag, bySymbol, byStrategy, byWeekday, closedTradesOf } from '../../lib/analytics'

export function BreakdownPanel({ trades, currency }) {
  const data = useMemo(
    () => ({
      strategy: byStrategy(trades),
      symbol: bySymbol(trades).slice(0, 8),
      weekday: byWeekday(trades),
      tags: byFreeTag(trades).slice(0, 8),
    }),
    [trades],
  )

  if (closedTradesOf(trades).length === 0) {
    return <EmptyState title="No closed trades yet" description="Breakdowns by strategy, symbol, weekday and tag appear once you close trades." />
  }

  const sections = [
    { title: 'By strategy', rows: data.strategy, empty: 'No strategies tagged yet.' },
    { title: 'By symbol', rows: data.symbol, empty: 'No symbols yet.' },
    { title: 'By weekday (entry day)', rows: data.weekday.filter((d) => d.count > 0), empty: 'No trades yet.' },
    { title: 'By tag', rows: data.tags, empty: 'Add tags to your trades to compare setups.' },
  ]

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {sections.map((s) => (
        <Card key={s.title} className="p-5">
          <h2 className="font-display text-base mb-4">{s.title}</h2>
          <BarList rows={s.rows} currency={currency} empty={s.empty} />
        </Card>
      ))}
    </div>
  )
}
