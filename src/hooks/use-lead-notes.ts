import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from './use-firm';
import { toast } from 'sonner';

export interface Note {
  id: string;
  lead_id: string | null;
  contact_id: string | null;
  firm_id: string | null;
  user_id: string | null;
  title: string | null;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function useLeadNotes(leadId: string) {
  return useQuery({
    queryKey: ['lead-notes', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('lead_id', leadId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Note[];
    },
  });
}

export function useCreateNote() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      contactId, 
      title, 
      content 
    }: { 
      leadId?: string; 
      contactId?: string;
      title?: string; 
      content: string;
    }) => {
      if (!user || !firm) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notes')
        .insert({
          lead_id: leadId || null,
          contact_id: contactId || null,
          firm_id: firm.id,
          user_id: user.id,
          title: title || null,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-journey'] });
      toast.success('Note added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add note: ' + error.message);
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes'] });
      queryClient.invalidateQueries({ queryKey: ['lead-journey'] });
      toast.success('Note deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete note: ' + error.message);
    },
  });
}

export function useTogglePinNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('notes')
        .update({ is_pinned: !isPinned })
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes'] });
    },
  });
}
