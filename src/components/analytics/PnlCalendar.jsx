import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns'
import { Button, Card, Pill, formatCurrency } from '../ui'
import { dailyPnl } from '../../lib/analytics'

const WEEK = { weekStartsOn: 1 }
const HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

export function PnlCalendar({ trades, currency }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(null)
  const days = useMemo(() => dailyPnl(trades), [trades])

  const weeks = useMemo(() => {
    const all = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), WEEK), end: endOfWeek(endOfMonth(month), WEEK) })
    return chunk(all, 7)
  }, [month])

  const monthTotals = useMemo(() => {
    let pnl = 0
    let count = 0
    let green = 0
    let red = 0
    for (const [key, d] of Object.entries(days)) {
      if (!key.startsWith(format(month, 'yyyy-MM'))) continue
      pnl += d.pnl
      count += d.count
      if (d.pnl > 0) green += 1
      else if (d.pnl < 0) red += 1
    }
    return { pnl, count, green, red }
  }, [days, month])

  const maxAbs = Math.max(1, ...Object.values(days).map((d) => Math.abs(d.pnl)))
  const selectedDay = selected ? days[selected] : null

  function tint(pnl) {
    const pct = Math.round(Math.min(Math.abs(pnl) / maxAbs, 1) * 55) + 12
    return `color-mix(in srgb, ${pnl > 0 ? 'var(--accent)' : 'var(--red)'} ${pct}%, var(--surface-solid))`
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="font-display text-lg">{format(month, 'MMMM yyyy')}</h2>
            <p className="text-sm text-[var(--ink-muted)]">
              <span className={`font-semibold tabular ${monthTotals.pnl > 0 ? 'text-[var(--accent)]' : monthTotals.pnl < 0 ? 'text-[var(--red)]' : ''}`}>
                {formatCurrency(monthTotals.pnl, currency)}
              </span>{' '}
              · {monthTotals.count} trade{monthTotals.count === 1 ? '' : 's'} · {monthTotals.green} green / {monthTotals.red} red days
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="secondary" onClick={() => setMonth(startOfMonth(new Date()))}>
              Today
            </Button>
            <Button variant="secondary" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(3.5rem,0.9fr)] gap-1.5 text-center">
          {[...HEADERS, 'Week'].map((h) => (
            <div key={h} className="text-xs font-medium text-[var(--ink-faint)] pb-1">
              {h}
            </div>
          ))}
          {weeks.map((week) => {
            const weekPnl = week.reduce((s, d) => s + (isSameMonth(d, month) ? (days[format(d, 'yyyy-MM-dd')]?.pnl ?? 0) : 0), 0)
            const weekHas = week.some((d) => isSameMonth(d, month) && days[format(d, 'yyyy-MM-dd')])
            return [
              ...week.map((d) => {
                const key = format(d, 'yyyy-MM-dd')
                const day = days[key]
                const inMonth = isSameMonth(d, month)
                return (
                  <button
                    key={key}
                    disabled={!day}
                    onClick={() => setSelected(selected === key ? null : key)}
                    style={day && inMonth ? { background: tint(day.pnl) } : undefined}
                    className={`min-h-[64px] sm:min-h-[76px] rounded-xl p-1.5 flex flex-col items-start justify-between text-left transition-transform ${
                      inMonth ? (day ? 'raised hover:-translate-y-0.5' : 'bg-[var(--surface-2)]/60') : 'opacity-30'
                    } ${selected === key ? 'ring-2 ring-[var(--primary)]' : ''}`}
                  >
                    <span className={`text-xs ${isToday(d) ? 'font-bold text-[var(--primary)]' : 'text-[var(--ink-muted)]'}`}>{format(d, 'd')}</span>
                    {day && inMonth && (
                      <span className="w-full">
                        <span className="block tabular text-[.72rem] sm:text-xs font-semibold leading-tight truncate">
                          {formatCurrency(day.pnl, currency)}
                        </span>
                        <span className="block text-[.65rem] text-[var(--ink-muted)]">{day.count} trade{day.count === 1 ? '' : 's'}</span>
                      </span>
                    )}
                  </button>
                )
              }),
              <div
                key={`w-${format(week[0], 'yyyy-MM-dd')}`}
                className="min-h-[64px] sm:min-h-[76px] rounded-xl inset flex items-center justify-center px-1"
              >
                {weekHas && (
                  <span className={`tabular text-xs font-semibold ${weekPnl > 0 ? 'text-[var(--accent)]' : weekPnl < 0 ? 'text-[var(--red)]' : 'text-[var(--ink-muted)]'}`}>
                    {formatCurrency(weekPnl, currency)}
                  </span>
                )}
              </div>,
            ]
          })}
        </div>
      </Card>

      {selectedDay && (
        <Card className="p-5">
          <h3 className="font-display text-base mb-3">
            {format(new Date(`${selected}T00:00:00`), 'EEEE, d MMMM')} ·{' '}
            <span className={selectedDay.pnl >= 0 ? 'text-[var(--accent)]' : 'text-[var(--red)]'}>{formatCurrency(selectedDay.pnl, currency)}</span>
          </h3>
          <ul className="flex flex-col divide-y divide-[var(--border)]">
            {selectedDay.trades.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium">{t.symbol}</span>
                  <Pill tone={t.direction === 'long' ? 'accent' : 'amber'}>{t.direction}</Pill>
                  <span className="text-xs text-[var(--ink-faint)] truncate">{t.strategy?.name ?? 'No strategy'}</span>
                </div>
                <span className={`tabular font-medium ${t.pnl > 0 ? 'text-[var(--accent)]' : 'text-[var(--red)]'}`}>{formatCurrency(t.pnl, currency)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
