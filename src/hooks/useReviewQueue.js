import { useMemo } from 'react'
import { useFundContext } from '../context/FundContext'
import { useAllTrades } from './useTrades'

// Closed, not-yet-reviewed trades in the current scope, oldest exit first.
export function useReviewQueue() {
  const { inScope } = useFundContext()
  const { data: trades = [], isLoading } = useAllTrades()
  const queue = useMemo(
    () =>
      trades
        .filter((t) => t.status === 'closed' && !t.reviewed_at && inScope(t.fund_id))
        .sort((a, b) => new Date(a.exit_date) - new Date(b.exit_date)),
    [trades, inScope],
  )
  return { queue, isLoading }
}
