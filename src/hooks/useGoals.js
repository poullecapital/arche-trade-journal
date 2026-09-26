import { useMemo, useSyncExternalStore } from 'react'
import { goalStatus, readGoals, saveGoals, subscribeGoals } from '../lib/goals'
import { useAllTrades } from './useTrades'

export function useGoals() {
  const goals = useSyncExternalStore(subscribeGoals, readGoals)
  return [goals, saveGoals]
}

// Goal progress across every fund, recomputed as trades change.
export function useGoalStatus() {
  const [goals] = useGoals()
  const { data: trades = [] } = useAllTrades()
  return useMemo(() => goalStatus(trades, goals), [trades, goals])
}
