import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useStickyNotes() {
  return useQuery({
    queryKey: ['sticky_notes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sticky_notes').select('*').order('created_at')
      if (error) throw error
      return data
    },
  })
}

export function useCreateStickyNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (note) => {
      const { data, error } = await supabase.from('sticky_notes').insert(note).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sticky_notes'] }),
  })
}

export function useUpdateStickyNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...rest }) => {
      const { error } = await supabase.from('sticky_notes').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sticky_notes'] }),
  })
}

export function useDeleteStickyNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('sticky_notes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sticky_notes'] }),
  })
}
