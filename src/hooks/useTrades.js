import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useTrades(fundId, filters = {}) {
  return useQuery({
    queryKey: ['trades', fundId, filters],
    enabled: !!fundId,
    queryFn: async () => {
      let query = supabase
        .from('trades')
        .select('*, strategy:strategies(id, name)')
        .eq('fund_id', fundId)
        .order('entry_date', { ascending: false })
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.strategyId) query = query.eq('strategy_id', filters.strategyId)
      if (filters.symbol) query = query.ilike('symbol', `%${filters.symbol}%`)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useAllTrades() {
  return useQuery({
    queryKey: ['trades', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*, fund:funds(id, name, currency), strategy:strategies(id, name)')
        .order('entry_date', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

function invalidateTradeQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['trades'] })
  queryClient.invalidateQueries({ queryKey: ['fund_summary'] })
  queryClient.invalidateQueries({ queryKey: ['account_balances'] })
  queryClient.invalidateQueries({ queryKey: ['ledger_entries'] })
}

export function useOpenTrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (trade) => {
      const { data, error } = await supabase.rpc('open_trade', {
        p_fund_id: trade.fundId,
        p_strategy_id: trade.strategyId || null,
        p_symbol: trade.symbol.toUpperCase(),
        p_direction: trade.direction,
        p_entry_price: trade.entryPrice,
        p_entry_quantity: trade.entryQuantity,
        p_entry_date: trade.entryDate,
        p_entry_fees: trade.entryFees || 0,
        p_stop_loss: trade.stopLoss || null,
        p_target_price: trade.targetPrice || null,
        p_notes: trade.notes || null,
        p_tags: trade.tags || [],
        p_rule_results: trade.ruleResults || [],
      })
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateTradeQueries(queryClient),
  })
}

export function useCloseTrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tradeId, exitPrice, exitDate, exitFees }) => {
      const { data, error } = await supabase.rpc('close_trade', {
        p_trade_id: tradeId,
        p_exit_price: exitPrice,
        p_exit_date: exitDate,
        p_exit_fees: exitFees || 0,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateTradeQueries(queryClient),
  })
}

export function useUpdateTrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...rest }) => {
      const { error } = await supabase.from('trades').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateTradeQueries(queryClient),
  })
}

export function useDeleteTrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('trades').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateTradeQueries(queryClient),
  })
}

export function useUploadScreenshot() {
  return useMutation({
    mutationFn: async (file) => {
      const path = `${crypto.randomUUID()}-${file.name}`
      const { error } = await supabase.storage.from('trade-screenshots').upload(path, file)
      if (error) throw error
      return path
    },
  })
}

export function useScreenshotUrl(path) {
  return useQuery({
    queryKey: ['screenshot-url', path],
    enabled: !!path,
    staleTime: 55 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('trade-screenshots').createSignedUrl(path, 3600)
      if (error) throw error
      return data.signedUrl
    },
  })
}
