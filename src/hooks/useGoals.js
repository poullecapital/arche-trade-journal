import { useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { DEFAULT_GOALS, goalStatus, goalsFromRow, goalsToRow, takeLegacyGoals } from '../lib/goals'
import { useAllTrades } from './useTrades'

async function saveRules(goals) {
  const { error } = await supabase.from('trading_rules').upsert(goalsToRow(goals))
  if (error) throw error
}

// Goals and risk limits, shared across devices. Returns [goals, save].
export function useGoals() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['trading_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('trading_rules').select('*').maybeSingle()
      if (error) throw error
      if (data) return goalsFromRow(data)
      // First run since goals moved to the database: bring this browser's over.
      const legacy = takeLegacyGoals()
      if (legacy) await saveRules(legacy)
      return legacy ?? DEFAULT_GOALS
    },
    staleTime: 60_000,
  })
  const mutation = useMutation({
    mutationFn: saveRules,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trading_rules'] }),
  })
  const { mutate } = mutation
  const save = useCallback((goals) => mutate(goals), [mutate])
  return [data ?? DEFAULT_GOALS, save]
}

// Goal progress across every fund, recomputed as trades change.
export function useGoalStatus() {
  const [goals] = useGoals()
  const { data: trades = [] } = useAllTrades()
  return useMemo(() => goalStatus(trades, goals), [trades, goals])
}
