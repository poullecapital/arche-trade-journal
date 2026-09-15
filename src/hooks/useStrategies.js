import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useStrategies(fundId) {
  return useQuery({
    queryKey: ['strategies', fundId],
    queryFn: async () => {
      let query = supabase.from('strategies').select('*').order('created_at', { ascending: false })
      if (fundId) query = query.or(`fund_id.eq.${fundId},fund_id.is.null`)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useUpsertStrategy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (strategy) => {
      const { id, ...rest } = strategy
      const query = id
        ? supabase.from('strategies').update(rest).eq('id', id).select().single()
        : supabase.from('strategies').insert(rest).select().single()
      const { data, error } = await query
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strategies'] }),
  })
}

export function useDeleteStrategy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('strategies').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strategies'] }),
  })
}
