import { format } from 'date-fns'
import { dailyPnl } from './analytics'

// Goals and risk limits as form values: numbers are strings, '' means off.
export const DEFAULT_GOALS = { monthlyTarget: '', maxDailyLoss: '', maxTradesPerDay: '', maxRiskPct: '', requireStop: false }

const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v))
const str = (v) => (v == null ? '' : String(v))

// trading_rules row <-> form values.
export function goalsFromRow(row) {
  if (!row) return DEFAULT_GOALS
  return {
    monthlyTarget: str(row.monthly_target),
    maxDailyLoss: str(row.max_daily_loss),
    maxTradesPerDay: str(row.max_trades_per_day),
    maxRiskPct: str(row.max_risk_pct),
    requireStop: !!row.require_stop,
  }
}

export function goalsToRow(goals) {
  return {
    id: true,
    monthly_target: num(goals.monthlyTarget),
    max_daily_loss: num(goals.maxDailyLoss),
    max_trades_per_day: num(goals.maxTradesPerDay),
    max_risk_pct: num(goals.maxRiskPct),
    require_stop: !!goals.requireStop,
  }
}

// Goals used to live in this browser's storage; read them once so they can be
// moved into the database, then forget them.
const LEGACY_KEY = 'arche-goals'
export function takeLegacyGoals() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    localStorage.removeItem(LEGACY_KEY)
    return { ...DEFAULT_GOALS, ...JSON.parse(raw) }
  } catch {
    return null
  }
}

export function hasGoals(goals) {
  return (
    num(goals.monthlyTarget) != null ||
    num(goals.maxDailyLoss) != null ||
    num(goals.maxTradesPerDay) != null ||
    num(goals.maxRiskPct) != null ||
    goals.requireStop
  )
}

// Progress against the goals for `now`, across the given trades.
export function goalStatus(trades, goals, now = new Date()) {
  const monthKey = format(now, 'yyyy-MM')
  const todayKey = format(now, 'yyyy-MM-dd')
  const days = dailyPnl(trades)

  let monthPnl = 0
  for (const [key, day] of Object.entries(days)) {
    if (key.startsWith(monthKey)) monthPnl += day.pnl
  }
  const todayPnl = days[todayKey]?.pnl ?? 0
  const tradesToday = trades.filter((t) => format(new Date(t.entry_date), 'yyyy-MM-dd') === todayKey).length

  const target = num(goals.monthlyTarget)
  const maxLoss = num(goals.maxDailyLoss)
  const maxTrades = num(goals.maxTradesPerDay)

  const breaches = []
  if (maxLoss != null && todayPnl <= -maxLoss) {
    breaches.push('Daily loss limit reached — your rule says stop trading for today.')
  }
  if (maxTrades != null && tradesToday >= maxTrades) {
    breaches.push(
      tradesToday > maxTrades
        ? `You have logged ${tradesToday} trades today, over your limit of ${maxTrades}.`
        : `You have reached your limit of ${maxTrades} trades today.`,
    )
  }

  return { monthPnl, todayPnl, tradesToday, target, maxLoss, maxTrades, breaches }
}

// Money lost if the trade hits its stop, or null without a usable stop.
export function riskToStop({ direction, entryPrice, stopLoss, quantity }) {
  if (stopLoss == null || !(entryPrice > 0) || !(quantity > 0)) return null
  const perUnit = direction === 'short' ? stopLoss - entryPrice : entryPrice - stopLoss
  return Math.max(perUnit, 0) * quantity
}

// Warnings for a trade about to be logged, checked against the risk rules.
// `nav` is the fund's current value (cash + holdings), when known.
export function tradeRiskWarnings(trade, goals, nav) {
  const warnings = []
  const hasStop = trade.stopLoss != null
  if (goals.requireStop && !hasStop) warnings.push('Your rules require a stop-loss on every trade.')
  if (hasStop && trade.entryPrice > 0) {
    const wrongSide = trade.direction === 'short' ? trade.stopLoss <= trade.entryPrice : trade.stopLoss >= trade.entryPrice
    if (wrongSide) warnings.push(`The stop is on the wrong side of the entry for a ${trade.direction} trade.`)
  }
  const maxRisk = num(goals.maxRiskPct)
  const risk = riskToStop(trade)
  if (maxRisk != null && risk != null && nav > 0 && (risk / nav) * 100 > maxRisk) {
    warnings.push(`This risks ${((risk / nav) * 100).toFixed(2)}% of the fund, over your ${maxRisk}% per-trade limit.`)
  }
  return warnings
}
