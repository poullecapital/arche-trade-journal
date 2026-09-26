import { useMemo } from 'react'
import { Card, EmptyState, Stat, formatCurrency } from '../ui'
import { BarList } from './BarList'
import { byEmotion, byMistake, closedTradesOf, splitTags, tagLabel } from '../../lib/analytics'

const avg = (list) => (list.length ? list.reduce((s, t) => s + Number(t.pnl), 0) / list.length : null)

export function MistakesPanel({ trades, currency }) {
  const { mistakes, emotions, flagged, clean } = useMemo(() => {
    const closed = closedTradesOf(trades)
    const relabel = (rows, kind) => rows.map((r) => ({ ...r, key: tagLabel(kind, r.key) }))
    return {
      mistakes: relabel(byMistake(trades), 'mistake'),
      emotions: relabel(byEmotion(trades), 'emotion'),
      flagged: closed.filter((t) => splitTags(t.tags).mistakes.length > 0),
      clean: closed.filter((t) => splitTags(t.tags).mistakes.length === 0),
    }
  }, [trades])

  if (mistakes.length === 0 && emotions.length === 0) {
    return (
      <EmptyState
        title="No mistakes or emotions tagged yet"
        description="Open a trade in the Journal and tag what went wrong (FOMO, exited early…) or how you felt. This tab then shows what each habit costs you."
      />
    )
  }

  const flaggedTotal = flagged.reduce((s, t) => s + Number(t.pnl), 0)
  const flaggedAvg = avg(flagged)
  const cleanAvg = avg(clean)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Total cost of mistakes"
          value={formatCurrency(flaggedTotal, currency)}
          tone={flaggedTotal < 0 ? 'negative' : 'default'}
          sub={`${flagged.length} tagged trade${flagged.length === 1 ? '' : 's'}`}
        />
        <Stat
          label="Avg P&L · with mistake"
          value={flaggedAvg == null ? '—' : formatCurrency(flaggedAvg, currency)}
          tone={flaggedAvg > 0 ? 'positive' : flaggedAvg < 0 ? 'negative' : 'default'}
        />
        <Stat
          label="Avg P&L · clean trades"
          value={cleanAvg == null ? '—' : formatCurrency(cleanAvg, currency)}
          tone={cleanAvg > 0 ? 'positive' : cleanAvg < 0 ? 'negative' : 'default'}
          sub={`${clean.length} trade${clean.length === 1 ? '' : 's'}`}
        />
        <Stat
          label="Gap per trade"
          value={flaggedAvg != null && cleanAvg != null ? formatCurrency(cleanAvg - flaggedAvg, currency) : '—'}
          sub="what a mistake costs on average"
        />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-display text-base mb-4">P&amp;L by mistake</h2>
          <BarList rows={mistakes} currency={currency} empty="No mistakes tagged." />
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-base mb-4">P&amp;L by emotion at entry</h2>
          <BarList rows={emotions} currency={currency} empty="No emotions tagged." />
        </Card>
      </div>
    </div>
  )
}
