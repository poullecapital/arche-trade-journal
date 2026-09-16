import { useMemo } from 'react'
import { eachDayOfInterval, format, startOfWeek, subWeeks } from 'date-fns'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFundSummaries } from '../hooks/useFunds'
import { useAllTrades } from '../hooks/useTrades'
import { useFundContext } from '../context/FundContext'
import { Card, EmptyState, PageHeader, Pill, Stat, formatCurrency } from '../components/ui'

const HEATMAP_WEEKS = 18

function colorForPnl(pnl, maxAbs) {
  if (!pnl) return 'var(--surface-2)'
  const pct = Math.round(Math.min(Math.abs(pnl) / maxAbs, 1) * 85) + 10
  const base = pnl > 0 ? 'var(--accent)' : 'var(--red)'
  return `color-mix(in srgb, ${base} ${pct}%, var(--surface-2))`
}

function PnlHeatmap({ closedTrades }) {
  const { days, maxAbs } = useMemo(() => {
    const end = new Date()
    const start = startOfWeek(subWeeks(end, HEATMAP_WEEKS - 1))
    const byDate = {}
    for (const t of closedTrades) {
      const key = format(new Date(t.exit_date), 'yyyy-MM-dd')
      byDate[key] = (byDate[key] || 0) + Number(t.pnl || 0)
    }
    const days = eachDayOfInterval({ start, end }).map((date) => {
      const key = format(date, 'yyyy-MM-dd')
      return { date, key, pnl: key in byDate ? byDate[key] : null }
    })
    const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.pnl || 0)))
    return { days, maxAbs }
  }, [closedTrades])

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-[3px] w-fit" style={{ gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column' }}>
        {days.map((d) => (
          <div
            key={d.key}
            title={`${format(d.date, 'dd MMM yyyy')} · ${d.pnl != null ? formatCurrency(d.pnl) : 'no closed trades'}`}
            className="w-3 h-3 rounded-sm"
            style={{ background: colorForPnl(d.pnl, maxAbs) }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-[var(--ink-faint)]">
        <span>Loss</span>
        <div className="w-3 h-3 rounded-sm" style={{ background: colorForPnl(-maxAbs, maxAbs) }} />
        <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--surface-2)' }} />
        <div className="w-3 h-3 rounded-sm" style={{ background: colorForPnl(maxAbs, maxAbs) }} />
        <span>Gain</span>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { funds } = useFundContext()
  const { data: summaries = [] } = useFundSummaries()
  const { data: trades = [] } = useAllTrades()

  const closedTrades = useMemo(
    () => trades.filter((t) => t.status === 'closed').sort((a, b) => new Date(a.exit_date) - new Date(b.exit_date)),
    [trades],
  )

  const equityCurve = useMemo(() => {
    let cumulative = 0
    return closedTrades.map((t) => {
      cumulative += Number(t.pnl || 0)
      return { date: format(new Date(t.exit_date), 'dd MMM'), pnl: Math.round(cumulative) }
    })
  }, [closedTrades])

  const wins = closedTrades.filter((t) => Number(t.pnl) > 0).length
  const winRate = closedTrades.length ? Math.round((wins / closedTrades.length) * 100) : null
  const totalNav = summaries.reduce((s, f) => s + Number(f.cash_balance) + Number(f.holdings_value), 0)
  const totalRealized = summaries.reduce((s, f) => s + Number(f.realized_pnl), 0)
  const openCount = trades.filter((t) => t.status === 'open').length

  if (funds.length === 0) {
    return (
      <EmptyState
        title="Welcome to Arche"
        description="Create your first fund in Funds & Ledger to start seeing the firm's numbers here."
      />
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Growth Intelligence" title="Dashboard" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total NAV" value={formatCurrency(totalNav)} sub={`${funds.length} fund${funds.length > 1 ? 's' : ''}`} />
        <Stat
          label="Realized P&L"
          value={formatCurrency(totalRealized)}
          tone={totalRealized > 0 ? 'positive' : totalRealized < 0 ? 'negative' : 'default'}
        />
        <Stat label="Win rate" value={winRate != null ? `${winRate}%` : '—'} sub={`${closedTrades.length} closed trades`} />
        <Stat label="Open positions" value={openCount} sub={`across ${funds.length} fund${funds.length > 1 ? 's' : ''}`} />
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold mb-4">Cumulative realized P&L</h2>
        {equityCurve.length < 2 ? (
          <p className="text-sm text-[var(--ink-faint)]">Close a couple of trades to see the equity curve build here.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis
                  tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v)}
                  width={70}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => formatCurrency(v)}
                />
                <Area type="monotone" dataKey="pnl" stroke="var(--accent)" strokeWidth={2} fill="url(#pnlFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold mb-1">Daily P&amp;L activity</h2>
        <p className="text-sm text-[var(--ink-muted)] mb-4">Last {HEATMAP_WEEKS} weeks, by trade close date, across every fund.</p>
        {closedTrades.length === 0 ? (
          <p className="text-sm text-[var(--ink-faint)]">Nothing to show yet — close a trade to light up the grid.</p>
        ) : (
          <div className="overflow-x-auto">
            <PnlHeatmap closedTrades={closedTrades} />
          </div>
        )}
      </Card>

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Funds</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaries.map((s) => (
            <Card key={s.fund_id} className="p-4 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.name}</span>
                <Pill tone={s.status === 'active' ? 'accent' : 'default'}>{s.status}</Pill>
              </div>
              <div className="tabular text-lg font-semibold">
                {formatCurrency(Number(s.cash_balance) + Number(s.holdings_value), s.currency)}
              </div>
              <div className="text-xs text-[var(--ink-faint)] font-mono">
                Realized {formatCurrency(s.realized_pnl, s.currency)}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Recent trades</h2>
        {trades.length === 0 ? (
          <p className="text-sm text-[var(--ink-faint)]">No trades logged yet.</p>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--ink-faint)] font-mono uppercase border-b border-[var(--border)]">
                  <th className="px-4 py-2 font-normal">Symbol</th>
                  <th className="px-4 py-2 font-normal">Fund</th>
                  <th className="px-4 py-2 font-normal">Date</th>
                  <th className="px-4 py-2 font-normal text-right">P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 8).map((t) => (
                  <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-2 font-medium">{t.symbol}</td>
                    <td className="px-4 py-2 text-[var(--ink-muted)]">{t.fund?.name}</td>
                    <td className="px-4 py-2 font-mono text-xs">{format(new Date(t.entry_date), 'dd MMM yy')}</td>
                    <td
                      className={`px-4 py-2 text-right tabular font-medium ${
                        t.pnl > 0 ? 'text-[var(--accent)]' : t.pnl < 0 ? 'text-[var(--red)]' : ''
                      }`}
                    >
                      {t.pnl != null ? formatCurrency(t.pnl, t.fund?.currency) : 'open'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  )
}
