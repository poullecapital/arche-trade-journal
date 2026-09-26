import { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { format } from 'date-fns'
import { Button, Card, Input, Pill, formatCurrency, formatNumber } from '../ui'
import { BarList } from './BarList'
import { byMistake, byStrategy, closedTradesOf, computeStats, splitTags, tagLabel } from '../../lib/analytics'
import { useGoals } from '../../hooks/useGoals'

export function MonthlyReport({ trades, currency, scope }) {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [goals] = useGoals()

  const monthTrades = useMemo(
    () => closedTradesOf(trades).filter((t) => format(new Date(t.exit_date), 'yyyy-MM') === month),
    [trades, month],
  )
  const stats = useMemo(() => computeStats(monthTrades), [monthTrades])
  const strategies = useMemo(() => byStrategy(monthTrades), [monthTrades])
  const mistakes = useMemo(() => byMistake(monthTrades).map((r) => ({ ...r, key: tagLabel('mistake', r.key) })), [monthTrades])

  const title = format(new Date(`${month}-01T00:00:00`), 'MMMM yyyy')
  const target = goals.monthlyTarget === '' ? null : Number(goals.monthlyTarget)
  const money = (v) => (v == null ? '—' : formatCurrency(v, currency))
  const tone = (v) => (v > 0 ? 'text-[var(--accent)]' : v < 0 ? 'text-[var(--red)]' : '')

  const kpis = [
    ['Net P&L', money(stats.netPnl), tone(stats.netPnl)],
    ['Trades', stats.count, ''],
    ['Win rate', stats.winRate == null ? '—' : `${formatNumber(stats.winRate, 0)}%`, ''],
    ['Profit factor', stats.profitFactor == null ? '—' : stats.profitFactor === Infinity ? '∞' : formatNumber(stats.profitFactor, 2), ''],
    ['Best trade', money(stats.best), tone(stats.best)],
    ['Worst trade', money(stats.worst), tone(stats.worst)],
    ['Max drawdown', stats.maxDrawdown ? `-${formatCurrency(stats.maxDrawdown, currency)}` : money(0), stats.maxDrawdown ? 'text-[var(--red)]' : ''],
    ['Avg R', stats.avgR == null ? '—' : `${formatNumber(stats.avgR, 2)}R`, ''],
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex items-end justify-between flex-wrap gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--ink-muted)]">
          Month
          <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="!w-auto" />
        </label>
        <Button onClick={() => window.print()} disabled={monthTrades.length === 0}>
          <Printer size={15} /> Print / Save as PDF
        </Button>
      </div>

      <Card className="p-6 print-card">
        <div className="flex items-start justify-between flex-wrap gap-2 mb-5">
          <div>
            <div className="text-xs font-medium text-[var(--ink-faint)]">Arche · Monthly report</div>
            <h2 className="font-display text-2xl">{title}</h2>
            <div className="text-sm text-[var(--ink-muted)]">{scope}</div>
          </div>
          {target != null && (
            <div className="text-sm text-right">
              <div className="text-[var(--ink-faint)] text-xs font-medium">Monthly target</div>
              <div className="tabular font-semibold">
                {money(stats.netPnl)} of {formatCurrency(target, currency)} ({target ? Math.round((stats.netPnl / target) * 100) : 0}%)
              </div>
            </div>
          )}
        </div>

        {monthTrades.length === 0 ? (
          <p className="text-sm text-[var(--ink-faint)]">No trades were closed in {title}.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {kpis.map(([label, value, cls]) => (
                <div key={label}>
                  <div className="text-xs text-[var(--ink-muted)]">{label}</div>
                  <div className={`tabular text-xl font-semibold ${cls}`}>{value}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-display text-sm mb-3">By strategy</h3>
                <BarList rows={strategies} currency={currency} />
              </div>
              <div>
                <h3 className="font-display text-sm mb-3">Mistakes this month</h3>
                <BarList rows={mistakes} currency={currency} empty="No mistakes tagged — clean month." />
              </div>
            </div>

            <h3 className="font-display text-sm mb-2">Trades</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--ink-faint)] font-medium border-b border-[var(--border)]">
                    <th className="py-2 pr-3">Closed</th>
                    <th className="py-2 pr-3">Symbol</th>
                    <th className="py-2 pr-3">Dir</th>
                    <th className="py-2 pr-3">Strategy</th>
                    <th className="py-2 pr-3">Tags</th>
                    <th className="py-2 pr-3 text-right">R</th>
                    <th className="py-2 text-right">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {monthTrades.map((t) => (
                    <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{format(new Date(t.exit_date), 'dd MMM')}</td>
                      <td className="py-2 pr-3 font-medium">{t.symbol}</td>
                      <td className="py-2 pr-3">
                        <Pill tone={t.direction === 'long' ? 'accent' : 'amber'}>{t.direction}</Pill>
                      </td>
                      <td className="py-2 pr-3 text-[var(--ink-muted)]">{t.strategy?.name ?? '—'}</td>
                      <td className="py-2 pr-3 text-xs text-[var(--ink-muted)]">
                        {splitTags(t.tags).mistakes.map((m) => tagLabel('mistake', m)).join(', ') || '—'}
                      </td>
                      <td className="py-2 pr-3 text-right tabular">{t.r_multiple != null ? formatNumber(t.r_multiple, 2) : '—'}</td>
                      <td className={`py-2 text-right tabular font-medium ${tone(Number(t.pnl))}`}>{formatCurrency(t.pnl, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
