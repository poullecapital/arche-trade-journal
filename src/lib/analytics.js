import { format } from 'date-fns'
import { instrumentName } from './instruments'

// Mistake / emotion tags share the trades.tags column, told apart by prefix.
export const MISTAKES = [
  { id: 'fomo', label: 'FOMO' },
  { id: 'revenge', label: 'Revenge trade' },
  { id: 'early-exit', label: 'Exited early' },
  { id: 'late-exit', label: 'Exited late' },
  { id: 'oversized', label: 'Oversized' },
  { id: 'no-stop', label: 'No stop-loss' },
  { id: 'broke-rules', label: 'Broke rules' },
  { id: 'overtraded', label: 'Overtraded' },
]

export const EMOTIONS = [
  { id: 'calm', label: 'Calm' },
  { id: 'confident', label: 'Confident' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'greedy', label: 'Greedy' },
  { id: 'fearful', label: 'Fearful' },
  { id: 'bored', label: 'Bored' },
]

export const tagKey = (kind, id) => `${kind}:${id}`

export function splitTags(tags = []) {
  const out = { mistakes: [], emotions: [], free: [] }
  for (const t of tags) {
    if (t.startsWith('mistake:')) out.mistakes.push(t.slice(8))
    else if (t.startsWith('emotion:')) out.emotions.push(t.slice(8))
    else out.free.push(t)
  }
  return out
}

export function tagLabel(kind, id) {
  const list = kind === 'mistake' ? MISTAKES : EMOTIONS
  return list.find((x) => x.id === id)?.label ?? id
}

export function isClosed(t) {
  return t.status === 'closed' && t.pnl != null && t.exit_date
}

export function closedTradesOf(trades) {
  return trades.filter(isClosed).sort((a, b) => new Date(a.exit_date) - new Date(b.exit_date))
}

const sum = (list, fn) => list.reduce((s, x) => s + fn(x), 0)

// Stats over closed trades, oldest exit first.
export function computeStats(trades) {
  const closed = closedTradesOf(trades)
  const pnls = closed.map((t) => Number(t.pnl))
  const wins = pnls.filter((p) => p > 0)
  const losses = pnls.filter((p) => p < 0)

  const grossProfit = sum(wins, (p) => p)
  const grossLoss = Math.abs(sum(losses, (p) => p))
  const netPnl = grossProfit - grossLoss
  const avgWin = wins.length ? grossProfit / wins.length : null
  const avgLoss = losses.length ? grossLoss / losses.length : null

  let equity = 0
  let peak = 0
  let maxDrawdown = 0
  let winStreak = 0
  let lossStreak = 0
  let maxWinStreak = 0
  let maxLossStreak = 0
  for (const p of pnls) {
    equity += p
    peak = Math.max(peak, equity)
    maxDrawdown = Math.max(maxDrawdown, peak - equity)
    if (p > 0) {
      winStreak += 1
      lossStreak = 0
    } else if (p < 0) {
      lossStreak += 1
      winStreak = 0
    } else {
      winStreak = 0
      lossStreak = 0
    }
    maxWinStreak = Math.max(maxWinStreak, winStreak)
    maxLossStreak = Math.max(maxLossStreak, lossStreak)
  }

  const rs = closed.map((t) => t.r_multiple).filter((r) => r != null).map(Number)
  const holdDays = closed.map((t) => (new Date(t.exit_date) - new Date(t.entry_date)) / 86400000)

  return {
    count: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : null,
    netPnl,
    grossProfit,
    grossLoss,
    avgWin,
    avgLoss,
    payoff: avgWin != null && avgLoss ? avgWin / avgLoss : null,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null,
    expectancy: closed.length ? netPnl / closed.length : null,
    best: pnls.length ? Math.max(...pnls) : null,
    worst: pnls.length ? Math.min(...pnls) : null,
    maxDrawdown,
    maxWinStreak,
    maxLossStreak,
    avgR: rs.length ? sum(rs, (r) => r) / rs.length : null,
    avgHoldDays: holdDays.length ? sum(holdDays, (d) => d) / holdDays.length : null,
  }
}

// Group closed trades by one or several keys; returns rows sorted by P&L desc.
export function groupTrades(trades, keysOf) {
  const map = new Map()
  for (const t of closedTradesOf(trades)) {
    const keys = [].concat(keysOf(t)).filter(Boolean)
    for (const key of keys) {
      const g = map.get(key) ?? { key, count: 0, wins: 0, pnl: 0 }
      g.count += 1
      g.pnl += Number(t.pnl)
      if (Number(t.pnl) > 0) g.wins += 1
      map.set(key, g)
    }
  }
  return [...map.values()]
    .map((g) => ({ ...g, winRate: (g.wins / g.count) * 100, avgPnl: g.pnl / g.count }))
    .sort((a, b) => b.pnl - a.pnl)
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const byStrategy = (trades) => groupTrades(trades, (t) => t.strategy?.name ?? 'No strategy')
export const bySymbol = (trades) => groupTrades(trades, (t) => t.symbol)
export const byInstrument = (trades) => groupTrades(trades, (t) => instrumentName(t.instrument_type))
export const byFreeTag = (trades) => groupTrades(trades, (t) => splitTags(t.tags).free)
export const byMistake = (trades) => groupTrades(trades, (t) => splitTags(t.tags).mistakes)
export const byEmotion = (trades) => groupTrades(trades, (t) => splitTags(t.tags).emotions)

// Weekday of entry, in Mon..Sun order, keeping empty days so the chart is stable.
export function byWeekday(trades) {
  const rows = groupTrades(trades, (t) => WEEKDAYS[new Date(t.entry_date).getDay()])
  const lookup = Object.fromEntries(rows.map((r) => [r.key, r]))
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
    (d) => lookup[d] ?? { key: d, count: 0, wins: 0, pnl: 0, winRate: 0, avgPnl: 0 },
  )
}

// { 'yyyy-MM-dd': { pnl, count, trades } } by exit date.
export function dailyPnl(trades) {
  const map = {}
  for (const t of closedTradesOf(trades)) {
    const key = format(new Date(t.exit_date), 'yyyy-MM-dd')
    const day = (map[key] ??= { pnl: 0, count: 0, trades: [] })
    day.pnl += Number(t.pnl)
    day.count += 1
    day.trades.push(t)
  }
  return map
}

export function equityCurve(trades) {
  let cumulative = 0
  return closedTradesOf(trades).map((t) => {
    cumulative += Number(t.pnl)
    return { date: format(new Date(t.exit_date), 'dd MMM'), pnl: Math.round(cumulative) }
  })
}
