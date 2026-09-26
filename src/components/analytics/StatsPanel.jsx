import { useMemo } from 'react'
import { Bar, BarChart, Area, AreaChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import { Card, EmptyState, Stat, formatCurrency, formatNumber } from '../ui'
import { closedTradesOf, computeStats, equityCurve } from '../../lib/analytics'

const tooltipStyle = { background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }
const tick = { fill: 'var(--ink-faint)', fontSize: 11 }

const signTone = (v) => (v > 0 ? 'positive' : v < 0 ? 'negative' : 'default')
const dash = '—'

export function StatsPanel({ trades, currency }) {
  const stats = useMemo(() => computeStats(trades), [trades])
  const curve = useMemo(() => equityCurve(trades), [trades])
  const monthly = useMemo(() => {
    const byMonth = {}
    for (const t of closedTradesOf(trades)) {
      const key = format(new Date(t.exit_date), 'yyyy-MM')
      byMonth[key] = (byMonth[key] || 0) + Number(t.pnl)
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, pnl]) => ({ month: format(new Date(`${key}-01T00:00:00`), 'MMM yy'), pnl: Math.round(pnl) }))
  }, [trades])

  if (stats.count === 0) {
    return <EmptyState title="No closed trades yet" description="Close a few trades and your performance stats will appear here." />
  }

  const money = (v) => (v == null ? dash : formatCurrency(v, currency))
  const pf = stats.profitFactor
  const pfLabel = pf == null ? dash : pf === Infinity ? '∞' : formatNumber(pf, 2)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Net P&L" value={money(stats.netPnl)} tone={signTone(stats.netPnl)} sub={`${stats.count} closed trades`} />
        <Stat label="Win rate" value={`${formatNumber(stats.winRate, 0)}%`} sub={`${stats.wins} win${stats.wins === 1 ? "" : "s"} · ${stats.losses} loss${stats.losses === 1 ? "" : "es"}`} />
        <Stat
          label="Profit factor"
          value={pfLabel}
          tone={pf != null && pf >= 1 ? 'positive' : pf != null ? 'negative' : 'default'}
          sub="gross profit ÷ gross loss"
        />
        <Stat label="Expectancy" value={money(stats.expectancy)} tone={signTone(stats.expectancy)} sub="average P&L per trade" />
        <Stat label="Average win" value={money(stats.avgWin)} tone="positive" />
        <Stat label="Average loss" value={stats.avgLoss == null ? dash : `-${formatCurrency(stats.avgLoss, currency)}`} tone="negative" />
        <Stat label="Payoff ratio" value={stats.payoff == null ? dash : formatNumber(stats.payoff, 2)} sub="avg win ÷ avg loss" />
        <Stat label="Max drawdown" value={stats.maxDrawdown ? `-${formatCurrency(stats.maxDrawdown, currency)}` : money(0)} tone={stats.maxDrawdown ? 'negative' : 'default'} sub="peak to trough" />
        <Stat label="Best trade" value={money(stats.best)} tone={signTone(stats.best)} />
        <Stat label="Worst trade" value={money(stats.worst)} tone={signTone(stats.worst)} />
        <Stat label="Streaks" value={`${stats.maxWinStreak} W · ${stats.maxLossStreak} L`} sub="longest run" />
        <Stat
          label="Avg R-multiple"
          value={stats.avgR == null ? dash : `${formatNumber(stats.avgR, 2)}R`}
          sub={stats.avgHoldDays != null ? `avg hold ${formatNumber(stats.avgHoldDays, 1)} days` : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display text-base mb-4">Equity curve</h2>
          {curve.length < 2 ? (
            <p className="text-sm text-[var(--ink-faint)]">Close at least two trades to see the curve.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="anaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={tick} axisLine={false} tickLine={false} />
                  <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, currency)} width={72} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v, currency)} />
                  <Area type="monotone" dataKey="pnl" stroke="var(--primary)" strokeWidth={2} fill="url(#anaFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-base mb-4">Monthly P&amp;L</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={tick} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v, currency)} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                  {monthly.map((m) => (
                    <Cell key={m.month} fill={m.pnl >= 0 ? 'var(--accent)' : 'var(--red)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
