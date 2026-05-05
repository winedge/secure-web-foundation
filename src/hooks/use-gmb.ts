import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from 'sonner';

export interface GmbLocation {
  id: string;
  firm_id: string;
  name: string;
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  primary_category: string | null;
  hours: Record<string, unknown>;
  status: string;
  is_connected: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export function useGmbLocations() {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['gmb-locations', firm?.id],
    enabled: !!firm?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gmb_locations')
        .select('*')
        .eq('firm_id', firm!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as GmbLocation[];
    },
  });
}

export function useUpsertGmbLocation() {
  const qc = useQueryClient();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (payload: Partial<GmbLocation> & { name: string }) => {
      if (!firm?.id) throw new Error('No firm');
      const row = { ...payload, firm_id: firm.id, hours: (payload.hours ?? {}) as never };
      const { data, error } = await supabase
        .from('gmb_locations')
        .upsert([row as never])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gmb-locations'] });
      toast.success('Location saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteGmbLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gmb_locations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gmb-locations'] });
      toast.success('Location deleted');
    },
  });
}

export function useGmbReviews(locationId?: string) {
  return useQuery({
    queryKey: ['gmb-reviews', locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gmb_reviews')
        .select('*')
        .eq('location_id', locationId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGmbPosts(locationId?: string) {
  return useQuery({
    queryKey: ['gmb-posts', locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gmb_posts')
        .select('*')
        .eq('location_id', locationId!)
        .order('scheduled_for', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReplyToReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reply_text }: { id: string; reply_text: string }) => {
      const { data, error } = await supabase
        .from('gmb_reviews')
        .update({ reply_text, replied_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gmb-reviews'] });
      toast.success('Reply saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateGmbPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      location_id: string;
      post_type: string;
      summary: string;
      cta_url?: string | null;
      scheduled_for?: string | null;
    }) => {
      const row = {
        ...payload,
        status: payload.scheduled_for ? 'scheduled' : 'published',
      };
      const { data, error } = await supabase
        .from('gmb_posts')
        .insert([row as never])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gmb-posts'] });
      toast.success('Post created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteGmbPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gmb_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gmb-posts'] }),
  });
}

