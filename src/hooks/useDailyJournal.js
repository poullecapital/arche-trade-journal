import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// One journal entry per day, keyed by 'yyyy-MM-dd'. Null data means nothing
// has been written for that day yet.
export function useJournalEntry(date) {
  return useQuery({
    queryKey: ['daily_journal', date],
    queryFn: async () => {
      const { data, error } = await supabase.from('daily_journal').select('*').eq('journal_date', date).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useRecentJournal(limit = 30) {
  return useQuery({
    queryKey: ['daily_journal', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_journal')
        .select('*')
        .order('journal_date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data
    },
  })
}

// Writes only the given fields, creating the day's entry if needed.
export function useSaveJournalEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ date, ...fields }) => {
      const { error } = await supabase
        .from('daily_journal')
        .upsert({ journal_date: date, ...fields }, { onConflict: 'journal_date' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['daily_journal'] }),
  })
}
