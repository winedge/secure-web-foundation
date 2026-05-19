import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LandingSnapshot } from '@/hooks/use-landing-versions';
import { toast } from 'sonner';
import { useVertical } from '@/hooks/use-vertical';

export interface LandingTemplate {
  id: string;
  user_id: string;
  firm_id: string | null;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  thumbnail_url: string | null;
  is_public: boolean;
  is_starter: boolean;
  vertical_slug: string | null;
  snapshot: LandingSnapshot;
  created_at: string;
  updated_at: string;
}

export interface SaveTemplateInput {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  thumbnail_url?: string | null;
  is_public?: boolean;
  snapshot: LandingSnapshot;
  firm_id?: string | null;
}

export function useLandingTemplates() {
  const { vertical } = useVertical();
  const verticalSlug = vertical?.slug ?? null;

  return useQuery({
    queryKey: ['landing-templates', verticalSlug],
    queryFn: async (): Promise<LandingTemplate[]> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;

      const { data, error } = await supabase
        .from('landing_page_templates')
        .select('*')
        .order('is_starter', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;

      // Filter starters to the firm's vertical (show all if firm has no vertical yet).
      return ((data ?? []) as unknown as LandingTemplate[]).filter((t) => {
        if (t.is_starter) {
          if (!verticalSlug) return true;
          return !t.vertical_slug || t.vertical_slug === verticalSlug;
        }
        return t.is_public || (uid && t.user_id === uid);
      });
    },
  });
}

export function useSaveLandingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveTemplateInput) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('landing_page_templates')
        .insert({
          user_id: auth.user.id,
          firm_id: input.firm_id ?? null,
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? 'general',
          tags: input.tags ?? [],
          thumbnail_url: input.thumbnail_url ?? null,
          is_public: input.is_public ?? false,
          snapshot: input.snapshot as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['landing-templates'] });
      toast.success('Template saved');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to save template'),
  });
}

export function useDeleteLandingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('landing_page_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['landing-templates'] });
      toast.success('Template deleted');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to delete'),
  });
}

export function useUpdateLandingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<LandingTemplate, 'name' | 'description' | 'category' | 'tags' | 'is_public' | 'thumbnail_url'>> }) => {
      const { error } = await supabase.from('landing_page_templates').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['landing-templates'] });
      toast.success('Template updated');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to update'),
  });
}
