import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useHoldings(fundId) {
  return useQuery({
    queryKey: ['holdings', fundId],
    enabled: !!fundId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .eq('fund_id', fundId)
        .order('symbol')
      if (error) throw error
      return data
    },
  })
}

export function useUpsertHolding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (holding) => {
      const { id, ...rest } = holding
      const query = id
        ? supabase.from('portfolio_holdings').update(rest).eq('id', id).select().single()
        : supabase.from('portfolio_holdings').insert(rest).select().single()
      const { data, error } = await query
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holdings'] }),
  })
}

export function useUpdateHoldingPrice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, symbol, price }) => {
      const { error: updateError } = await supabase
        .from('portfolio_holdings')
        .update({ last_price: price, last_price_at: new Date().toISOString() })
        .eq('id', id)
      if (updateError) throw updateError
      const { error: historyError } = await supabase.from('price_history').insert({ symbol, price })
      if (historyError) throw historyError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      queryClient.invalidateQueries({ queryKey: ['price_history'] })
    },
  })
}

export function useDeleteHolding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('portfolio_holdings').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holdings'] }),
  })
}
