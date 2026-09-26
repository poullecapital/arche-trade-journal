import { format } from 'date-fns'
import { dailyPnl } from './analytics'

const STORAGE_KEY = 'arche-goals'
const EVENT = 'arche-goals-changed'

export const DEFAULT_GOALS = { monthlyTarget: '', maxDailyLoss: '', maxTradesPerDay: '' }

let cachedRaw = null
let cachedValue = DEFAULT_GOALS

export function readGoals() {
  let raw = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    // storage unavailable — fall back to defaults
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try {
      cachedValue = raw ? { ...DEFAULT_GOALS, ...JSON.parse(raw) } : DEFAULT_GOALS
    } catch {
      cachedValue = DEFAULT_GOALS
    }
  }
  return cachedValue
}

export function saveGoals(goals) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  } catch {
    // storage unavailable — goals just won't persist
  }
  window.dispatchEvent(new Event(EVENT))
}

export function subscribeGoals(callback) {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v))

export function hasGoals(goals) {
  return num(goals.monthlyTarget) != null || num(goals.maxDailyLoss) != null || num(goals.maxTradesPerDay) != null
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
