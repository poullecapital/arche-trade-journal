import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// A null fundId means every fund.
export function useWatchlist(fundId) {
  return useQuery({
    queryKey: ['watchlist', fundId ?? 'every-fund'],
    queryFn: async () => {
      let query = supabase
        .from('watchlist_items')
        .select('*, fund:funds(id, name)')
        .order('created_at', { ascending: false })
      if (fundId) query = query.eq('fund_id', fundId)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useUpsertWatchlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (item) => {
      const { id, ...rest } = item
      const query = id
        ? supabase.from('watchlist_items').update(rest).eq('id', id).select().single()
        : supabase.from('watchlist_items').insert(rest).select().single()
      const { data, error } = await query
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })
}

export function useDeleteWatchlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('watchlist_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })
}
