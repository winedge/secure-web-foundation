import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from './use-firm';
import { useToast } from './use-toast';

export interface TortType {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  is_system: boolean;
  firm_id: string | null;
  created_at: string;
}

export function useTortTypes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tort-types'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tort_types')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as TortType[];
    },
    enabled: !!user,
  });
}

export function useAllTortTypes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tort-types-all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tort_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as TortType[];
    },
    enabled: !!user,
  });
}

export function useCreateTortType() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: firm } = useFirm();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string; category?: string }) => {
      const { data, error } = await (supabase as any)
        .from('tort_types')
        .insert({
          ...input,
          firm_id: firm?.id || null,
          is_system: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TortType;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tort-types'] });
      qc.invalidateQueries({ queryKey: ['tort-types-all'] });
      toast({ title: 'Tort type created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateTortType() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; description?: string; category?: string; is_active?: boolean }) => {
      const { data, error } = await (supabase as any)
        .from('tort_types')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as TortType;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tort-types'] });
      qc.invalidateQueries({ queryKey: ['tort-types-all'] });
      toast({ title: 'Tort type updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}
