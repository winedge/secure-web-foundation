import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from './use-firm';
import { useToast } from '@/hooks/use-toast';

export interface Campaign {
  id: string;
  firm_id: string;
  name: string;
  tort_type: string;
  target_states: string[] | null;
  target_age_min: number | null;
  target_age_max: number | null;
  daily_budget: number | null;
  total_budget: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignInput {
  name: string;
  tort_type: string;
  target_states?: string[];
  target_age_min?: number;
  target_age_max?: number;
  daily_budget?: number;
  total_budget?: number;
  status?: string;
}

export interface UpdateCampaignInput extends Partial<CreateCampaignInput> {
  id: string;
}

export function useCampaigns() {
  const { user } = useAuth();
  const { data: firm } = useFirm();

  return useQuery({
    queryKey: ['campaigns', firm?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!user && !!firm?.id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: firm } = useFirm();

  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      if (!firm?.id) throw new Error('No firm found');

      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          firm_id: firm.id,
          name: input.name,
          tort_type: input.tort_type,
          target_states: input.target_states || [],
          target_age_min: input.target_age_min,
          target_age_max: input.target_age_max,
          daily_budget: input.daily_budget,
          total_budget: input.total_budget,
          status: input.status || 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaign created',
        description: 'Your campaign has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating campaign',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateCampaignInput) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaign updated',
        description: 'Your campaign has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating campaign',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaign deleted',
        description: 'Your campaign has been deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting campaign',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
