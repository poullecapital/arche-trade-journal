import { useMemo, useState } from 'react'
import { eachDayOfInterval, format, startOfWeek, subWeeks } from 'date-fns'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Bars3D } from '../components/Bars3D'
import { GoalsCard } from '../components/GoalsCard'
import { useFundSummaries } from '../hooks/useFunds'
import { useAllTrades } from '../hooks/useTrades'
import { useFundContext } from '../context/FundContext'
import { Card, EmptyState, PageHeader, Pill, Stat, Tabs, formatCurrency } from '../components/ui'

const HEATMAP_WEEKS = 18
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
]

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
  const [tab, setTab] = useState('overview')

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
        description="Create your first fund in Ledger to start seeing the firm's numbers here."
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Overview" subtitle={`${funds.length} fund${funds.length > 1 ? 's' : ''} · ${closedTrades.length} closed trades`} />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Total NAV" value={formatCurrency(totalNav)} sub={`${funds.length} fund${funds.length > 1 ? 's' : ''}`} />
            <Stat
              label="Realized P&L"
              value={formatCurrency(totalRealized)}
              tone={totalRealized > 0 ? 'positive' : totalRealized < 0 ? 'negative' : 'default'}
            />
            <Stat label="Win rate" value={winRate != null ? `${winRate}%` : '—'} sub={`${wins} of ${closedTrades.length} trades won`} />
            <Stat label="Open positions" value={openCount} sub="across all funds" />
          </div>

          <GoalsCard />

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="p-5 lg:col-span-2">
              <h2 className="font-display text-base mb-4">Cumulative P&amp;L</h2>
              {equityCurve.length < 2 ? (
                <p className="text-sm text-[var(--ink-faint)]">Close a couple of trades to see the equity curve build here.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => formatCurrency(v)}
                        width={70}
                      />
                      <Tooltip
                        contentStyle={{ background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                        formatter={(v) => formatCurrency(v)}
                      />
                      <Area type="monotone" dataKey="pnl" stroke="var(--primary)" strokeWidth={2} fill="url(#pnlFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-base mb-3">Recent trades</h2>
              {trades.length === 0 ? (
                <p className="text-sm text-[var(--ink-faint)]">No trades logged yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-[var(--border)]">
                  {trades.slice(0, 6).map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{t.symbol}</div>
                        <div className="text-xs text-[var(--ink-faint)]">
                          {t.fund?.name} · {format(new Date(t.entry_date), 'dd MMM yy')}
                        </div>
                      </div>
                      <div
                        className={`tabular font-medium shrink-0 ${
                          t.pnl > 0 ? 'text-[var(--accent)]' : t.pnl < 0 ? 'text-[var(--red)]' : 'text-[var(--ink-muted)]'
                        }`}
                      >
                        {t.pnl != null ? formatCurrency(t.pnl, t.fund?.currency) : 'Open'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="p-5">
              <h2 className="font-display text-base">NAV by fund</h2>
              <Bars3D
                items={summaries.map((s) => ({ label: s.name, value: Number(s.cash_balance) + Number(s.holdings_value) }))}
                format={(v) => formatCurrency(v)}
              />
            </Card>
            <div className="lg:col-span-2 flex flex-col gap-4">
              {summaries.map((s) => (
              <Card tilt key={s.fund_id} className="p-5 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--ink-muted)]">{s.name}</span>
                  <Pill tone={s.status === 'active' ? 'accent' : 'default'}>{s.status}</Pill>
                </div>
                <div className="tabular text-2xl font-semibold">
                  {formatCurrency(Number(s.cash_balance) + Number(s.holdings_value), s.currency)}
                </div>
                <div className="text-xs text-[var(--ink-faint)]">Realized {formatCurrency(s.realized_pnl, s.currency)}</div>
              </Card>
            ))}
            </div>
          </div>
        </>
      )}

      {tab === 'activity' && (
        <Card className="p-5">
          <h2 className="font-display text-base mb-1">Daily P&amp;L activity</h2>
          <p className="text-sm text-[var(--ink-muted)] mb-4">Last {HEATMAP_WEEKS} weeks, by trade close date, across every fund.</p>
          {closedTrades.length === 0 ? (
            <p className="text-sm text-[var(--ink-faint)]">Nothing to show yet — close a trade to light up the grid.</p>
          ) : (
            <div className="overflow-x-auto">
              <PnlHeatmap closedTrades={closedTrades} />
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
