import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useLedgerEntries(fundId) {
  return useQuery({
    queryKey: ['ledger_entries', fundId],
    enabled: !!fundId,
    queryFn: async () => {
      // ledger_lines carries the account -> fund link; join through it.
      const { data, error } = await supabase
        .from('ledger_lines')
        .select('id, debit, credit, account:accounts!inner(id, name, type, subtype, fund_id), entry:ledger_entries(id, entry_date, description, source_type, created_at)')
        .eq('account.fund_id', fundId)
        .limit(500)
      if (error) throw error
      return [...data].sort((a, b) => new Date(b.entry?.created_at) - new Date(a.entry?.created_at)).slice(0, 200)
    },
  })
}

export function useAccountBalances(fundId) {
  return useQuery({
    queryKey: ['account_balances', fundId],
    enabled: !!fundId,
    queryFn: async () => {
      const { data, error } = await supabase.from('account_balances').select('*').eq('fund_id', fundId)
      if (error) throw error
      return data
    },
  })
}

export function useAllAccountBalances() {
  return useQuery({
    queryKey: ['account_balances', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('account_balances').select('*')
      if (error) throw error
      return data
    },
  })
}

export function useFundFlows(fundId) {
  return useQuery({
    queryKey: ['fund_flows', fundId],
    enabled: !!fundId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fund_flows')
        .select('*')
        .eq('fund_id', fundId)
        .order('flow_date', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useRecordFundFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ fundId, type, source, amount, flowDate, counterparty, notes }) => {
      const { data, error } = await supabase.rpc('record_fund_flow', {
        p_fund_id: fundId,
        p_type: type,
        p_source: source,
        p_amount: amount,
        p_flow_date: flowDate,
        p_counterparty: counterparty || null,
        p_notes: notes || null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund_flows'] })
      queryClient.invalidateQueries({ queryKey: ['fund_summary'] })
      queryClient.invalidateQueries({ queryKey: ['firm_summary'] })
      queryClient.invalidateQueries({ queryKey: ['ledger_entries'] })
    },
  })
}

export function useDeleteFundFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('fund_flows').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund_flows'] })
      queryClient.invalidateQueries({ queryKey: ['fund_summary'] })
      queryClient.invalidateQueries({ queryKey: ['firm_summary'] })
      queryClient.invalidateQueries({ queryKey: ['ledger_entries'] })
    },
  })
}
