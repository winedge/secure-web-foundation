import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';

export type LandingSnapshot = {
  slug: string;
  firm_display_name: string | null;
  logo_url: string | null;
  primary_color: string;
  background_color: string;
  accent_color: string;
  heading_text: string;
  description_text: string;
  visible_fields: string[];
  custom_fields: any[];
  theme_key: string | null;
  typography: Record<string, any>;
  layout_config: Record<string, any>;
  hero_config: Record<string, any>;
  sections: any[];
  seo_config: Record<string, any>;
};

export type LandingVersion = {
  id: string;
  firm_id: string;
  label: string | null;
  note: string | null;
  created_by: string | null;
  snapshot: LandingSnapshot;
  created_at: string;
};

export type LandingPreview = {
  id: string;
  firm_id: string;
  version_id: string;
  token: string;
  expires_at: string;
  view_count: number;
  created_at: string;
};

function randomToken(len = 28) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, len);
}

export function useLandingVersions() {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['landing-versions', firm?.id],
    queryFn: async () => {
      if (!firm?.id) return [];
      const { data, error } = await supabase
        .from('landing_page_versions')
        .select('*')
        .eq('firm_id', firm.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LandingVersion[];
    },
    enabled: !!firm?.id,
  });
}

export function useCreateLandingVersion() {
  const qc = useQueryClient();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (input: { snapshot: LandingSnapshot; label?: string; note?: string }) => {
      if (!firm?.id) throw new Error('No firm');
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('landing_page_versions')
        .insert({
          firm_id: firm.id,
          snapshot: input.snapshot as any,
          label: input.label ?? null,
          note: input.note ?? null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LandingVersion;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landing-versions'] }),
  });
}

export function useDeleteLandingVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('landing_page_versions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['landing-versions'] });
      qc.invalidateQueries({ queryKey: ['landing-previews'] });
    },
  });
}

export function useLandingPreviews() {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['landing-previews', firm?.id],
    queryFn: async () => {
      if (!firm?.id) return [];
      const { data, error } = await supabase
        .from('landing_page_previews')
        .select('*')
        .eq('firm_id', firm.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LandingPreview[];
    },
    enabled: !!firm?.id,
  });
}

export function useCreateLandingPreview() {
  const qc = useQueryClient();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (input: { versionId: string; expiresInDays?: number }) => {
      if (!firm?.id) throw new Error('No firm');
      const { data: { user } } = await supabase.auth.getUser();
      const days = input.expiresInDays ?? 7;
      const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('landing_page_previews')
        .insert({
          firm_id: firm.id,
          version_id: input.versionId,
          token: randomToken(),
          expires_at: expires,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LandingPreview;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landing-previews'] }),
  });
}

export function useDeleteLandingPreview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('landing_page_previews').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landing-previews'] }),
  });
}

/** Public: resolve a preview token → snapshot (anon-readable while not expired). */
export function usePreviewByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['landing-preview-token', token],
    queryFn: async () => {
      if (!token) return null;
      const { data: preview, error } = await supabase
        .from('landing_page_previews')
        .select('*, version:landing_page_versions(*)')
        .eq('token', token)
        .maybeSingle();
      if (error) throw error;
      if (!preview) return null;
      // Best-effort view count bump (RLS may block anon update; ignore failure).
      supabase
        .from('landing_page_previews')
        .update({ view_count: (preview as any).view_count + 1 })
        .eq('id', (preview as any).id)
        .then(() => {}, () => {});
      return preview as any;
    },
    enabled: !!token,
    staleTime: 60_000,
  });
}
