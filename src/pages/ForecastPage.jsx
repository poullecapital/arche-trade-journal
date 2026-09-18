import { useMemo } from 'react'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFundContext } from '../context/FundContext'
import { useFundSummaries, useFirmSummary } from '../hooks/useFunds'
import { useAllTrades } from '../hooks/useTrades'
import { Card, EmptyState, PageHeader, Stat, formatCurrency, formatNumber } from '../components/ui'

function mean(values) {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0
}

function stddev(values) {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

const HORIZON_DAYS = 90
const MIN_TRADES_FOR_SIMULATION = 15
const SIMULATIONS = 500

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0
  const idx = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(p * sortedValues.length) - 1))
  return sortedValues[idx]
}

function runMonteCarlo(tradePnls, numTrades) {
  const n = tradePnls.length
  const paths = []
  const maxDrawdowns = []

  for (let s = 0; s < SIMULATIONS; s++) {
    let cumulative = 0
    let peak = 0
    let maxDD = 0
    const path = [0]
    for (let i = 0; i < numTrades; i++) {
      cumulative += tradePnls[Math.floor(Math.random() * n)]
      peak = Math.max(peak, cumulative)
      maxDD = Math.max(maxDD, peak - cumulative)
      path.push(cumulative)
    }
    paths.push(path)
    maxDrawdowns.push(maxDD)
  }

  const bands = []
  for (let step = 0; step <= numTrades; step++) {
    const atStep = paths.map((p) => p[step]).sort((a, b) => a - b)
    bands.push({ step, p10: percentile(atStep, 0.1), p50: percentile(atStep, 0.5), p90: percentile(atStep, 0.9) })
  }

  const finals = paths.map((p) => p[numTrades]).sort((a, b) => a - b)
  maxDrawdowns.sort((a, b) => a - b)

  return {
    bands,
    p10Final: percentile(finals, 0.1),
    p50Final: percentile(finals, 0.5),
    p90Final: percentile(finals, 0.9),
    medianDrawdown: percentile(maxDrawdowns, 0.5),
    tailDrawdown: percentile(maxDrawdowns, 0.9),
    probLoss: (finals.filter((v) => v < 0).length / finals.length) * 100,
  }
}

export function ForecastPage() {
  const { funds } = useFundContext()
  const { data: summaries = [] } = useFundSummaries()
  const { data: firm } = useFirmSummary()
  const { data: trades = [] } = useAllTrades()

  const closedTrades = useMemo(
    () => trades.filter((t) => t.status === 'closed' && t.exit_date).sort((a, b) => new Date(a.exit_date) - new Date(b.exit_date)),
    [trades],
  )

  const currentValue = summaries.reduce((s, f) => s + Number(f.cash_balance) + Number(f.holdings_value), 0) + Number(firm?.firm_cash || 0)
  const investedCapital = summaries.reduce((s, f) => s + Number(f.capital), 0) + Number(firm?.firm_capital || 0)
  const totalReturnPct = investedCapital > 0 ? ((currentValue - investedCapital) / investedCapital) * 100 : null

  const earliestDate = useMemo(() => {
    const dates = funds.map((f) => new Date(f.created_at)).filter((d) => !Number.isNaN(d.getTime()))
    return dates.length ? new Date(Math.min(...dates)) : null
  }, [funds])

  const years = earliestDate ? Math.max(differenceInCalendarDays(new Date(), earliestDate) / 365.25, 1 / 365.25) : null
  const cagr = investedCapital > 0 && years ? ((currentValue / investedCapital) ** (1 / years) - 1) * 100 : null

  const chartData = useMemo(() => {
    if (closedTrades.length < 3) return []

    let cumulative = 0
    const history = closedTrades.map((t) => {
      cumulative += Number(t.pnl || 0)
      return { date: new Date(t.exit_date), label: format(new Date(t.exit_date), 'dd MMM'), actual: Math.round(cumulative) }
    })

    const tradePnls = closedTrades.map((t) => Number(t.pnl || 0))
    const meanPnl = mean(tradePnls)
    const stdPnl = stddev(tradePnls)

    const firstDate = closedTrades[0].exit_date
    const lastDate = closedTrades[closedTrades.length - 1].exit_date
    const daySpan = Math.max(differenceInCalendarDays(new Date(lastDate), new Date(firstDate)), 1)
    const tradesPerDay = closedTrades.length / daySpan

    const lastActual = history[history.length - 1].actual
    const lastDateObj = history[history.length - 1].date

    const projections = [30, 60, HORIZON_DAYS].map((offset) => {
      const expectedTrades = tradesPerDay * offset
      return {
        date: addDays(lastDateObj, offset),
        label: format(addDays(lastDateObj, offset), 'dd MMM'),
        base: Math.round(lastActual + expectedTrades * meanPnl),
        best: Math.round(lastActual + expectedTrades * (meanPnl + stdPnl)),
        worst: Math.round(lastActual + expectedTrades * (meanPnl - stdPnl)),
      }
    })

    const bridge = { ...history[history.length - 1], base: lastActual, best: lastActual, worst: lastActual }
    return [...history.slice(0, -1), bridge, ...projections]
  }, [closedTrades])

  const monteCarlo = useMemo(() => {
    if (closedTrades.length < MIN_TRADES_FOR_SIMULATION) return null

    const tradePnls = closedTrades.map((t) => Number(t.pnl || 0))
    const firstDate = closedTrades[0].exit_date
    const lastDate = closedTrades[closedTrades.length - 1].exit_date
    const daySpan = Math.max(differenceInCalendarDays(new Date(lastDate), new Date(firstDate)), 1)
    const tradesPerDay = closedTrades.length / daySpan
    const numTrades = Math.min(150, Math.max(20, Math.round(tradesPerDay * HORIZON_DAYS)))

    let lastActual = 0
    for (const t of closedTrades) lastActual += Number(t.pnl || 0)

    const sim = runMonteCarlo(tradePnls, numTrades)
    const chart = sim.bands
      .filter((_, i) => i % Math.max(1, Math.floor(numTrades / 40)) === 0 || i === sim.bands.length - 1)
      .map((b) => ({
        label: `+${b.step}`,
        p10: Math.round(lastActual + b.p10),
        p50: Math.round(lastActual + b.p50),
        p90: Math.round(lastActual + b.p90),
      }))

    return {
      numTrades,
      chart,
      p10Final: Math.round(lastActual + sim.p10Final),
      p50Final: Math.round(lastActual + sim.p50Final),
      p90Final: Math.round(lastActual + sim.p90Final),
      medianDrawdown: Math.round(sim.medianDrawdown),
      tailDrawdown: Math.round(sim.tailDrawdown),
      probLoss: sim.probLoss,
    }
  }, [closedTrades])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Growth Intelligence" title="Forecast" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Current value" value={formatCurrency(currentValue)} />
        <Stat label="Invested capital" value={formatCurrency(investedCapital)} />
        <Stat
          label="Total return"
          value={totalReturnPct != null ? `${totalReturnPct >= 0 ? '+' : ''}${formatNumber(totalReturnPct, 1)}%` : '—'}
          tone={totalReturnPct > 0 ? 'positive' : totalReturnPct < 0 ? 'negative' : 'default'}
        />
        <Stat label="CAGR" value={cagr != null ? `${cagr >= 0 ? '+' : ''}${formatNumber(cagr, 1)}%` : '—'} sub={years ? `over ${formatNumber(years, 1)}y` : undefined} />
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold mb-1">90-day trend projection</h2>
        <p className="text-sm text-[var(--ink-muted)] mb-4">
          Base/best/worst extrapolate your historical trade frequency and P&amp;L distribution forward — a transparent trendline, not a simulation.
        </p>
        {chartData.length === 0 ? (
          <p className="text-sm text-[var(--ink-faint)]">Close at least 3 trades across your funds to see a projection here.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
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
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="var(--ink)" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="best" name="Best case" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
                <Line type="monotone" dataKey="base" name="Base case" stroke="var(--amber)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
                <Line type="monotone" dataKey="worst" name="Worst case" stroke="var(--red)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold mb-1">Monte Carlo simulation</h2>
        <p className="text-sm text-[var(--ink-muted)] mb-4">
          {SIMULATIONS} simulated futures, each resampling from your actual closed-trade P&amp;L distribution — probabilistic
          growth and drawdown risk, not a trendline.
        </p>
        {!monteCarlo ? (
          <p className="text-sm text-[var(--ink-faint)]">
            Needs at least {MIN_TRADES_FOR_SIMULATION} closed trades to be meaningful — you have {closedTrades.length} so far.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <Stat label="Median outcome" value={formatCurrency(monteCarlo.p50Final)} sub={`over next ~${monteCarlo.numTrades} trades`} />
              <Stat label="10th–90th percentile" value={`${formatCurrency(monteCarlo.p10Final)} to ${formatCurrency(monteCarlo.p90Final)}`} />
              <Stat label="Median drawdown" value={formatCurrency(monteCarlo.medianDrawdown)} />
              <Stat label="Chance of a loss" value={`${formatNumber(monteCarlo.probLoss, 0)}%`} tone={monteCarlo.probLoss > 40 ? 'negative' : 'default'} />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monteCarlo.chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                    label={{ value: 'trades from now', position: 'insideBottom', offset: -2, fill: 'var(--ink-faint)', fontSize: 11 }}
                  />
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
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="p90" name="90th percentile" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="p50" name="Median" stroke="var(--amber)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p10" name="10th percentile" stroke="var(--red)" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-[var(--ink-faint)] mt-3">
              Tail risk: in the worst 10% of simulated paths, drawdown reaches {formatCurrency(monteCarlo.tailDrawdown)} or more.
            </p>
          </>
        )}
      </Card>

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Fund comparison</h2>
        {summaries.length === 0 ? (
          <EmptyState title="No funds yet" description="Create a fund in Funds & Ledger to compare performance here." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--ink-faint)] font-mono uppercase border-b border-[var(--border)]">
                  <th className="px-4 py-2 font-normal">Fund</th>
                  <th className="px-4 py-2 font-normal text-right">NAV</th>
                  <th className="px-4 py-2 font-normal text-right">Capital</th>
                  <th className="px-4 py-2 font-normal text-right">Realized P&amp;L</th>
                  <th className="px-4 py-2 font-normal text-right">Idle cash %</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => {
                  const nav = Number(s.cash_balance) + Number(s.holdings_value)
                  const idlePct = nav > 0 ? (Number(s.cash_balance) / nav) * 100 : 0
                  return (
                    <tr key={s.fund_id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-2 font-medium">{s.name}</td>
                      <td className="px-4 py-2 text-right tabular">{formatCurrency(nav, s.currency)}</td>
                      <td className="px-4 py-2 text-right tabular">{formatCurrency(s.capital, s.currency)}</td>
                      <td
                        className={`px-4 py-2 text-right tabular font-medium ${
                          s.realized_pnl > 0 ? 'text-[var(--accent)]' : s.realized_pnl < 0 ? 'text-[var(--red)]' : ''
                        }`}
                      >
                        {formatCurrency(s.realized_pnl, s.currency)}
                      </td>
                      <td className="px-4 py-2 text-right tabular">{formatNumber(idlePct, 0)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  )
}
