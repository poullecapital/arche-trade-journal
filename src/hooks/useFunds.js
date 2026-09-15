import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useFunds() {
  return useQuery({
    queryKey: ['funds'],
    queryFn: async () => {
      const { data, error } = await supabase.from('funds').select('*').order('created_at')
      if (error) throw error
      return data
    },
  })
}

export function useFundSummaries() {
  return useQuery({
    queryKey: ['fund_summary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fund_summary').select('*')
      if (error) throw error
      return data
    },
  })
}

export function useFirmSummary() {
  return useQuery({
    queryKey: ['firm_summary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('firm_summary').select('*').maybeSingle()
      if (error) throw error
      return data ?? { firm_cash: 0, firm_capital: 0 }
    },
  })
}

export function useCreateFund() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, description, currency }) => {
      const { data, error } = await supabase
        .from('funds')
        .insert({ name, description, currency })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funds'] })
      queryClient.invalidateQueries({ queryKey: ['fund_summary'] })
      queryClient.invalidateQueries({ queryKey: ['firm_summary'] })
    },
  })
}

export function useUpdateFundStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { error } = await supabase.from('funds').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['funds'] }),
  })
}
