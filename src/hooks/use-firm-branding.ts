import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from './use-firm';
import { toast } from 'sonner';

export interface FirmBranding {
  id: string;
  firm_id: string;
  slug: string;
  logo_url: string | null;
  firm_display_name: string | null;
  primary_color: string;
  background_color: string;
  accent_color: string;
  heading_text: string;
  description_text: string;
  custom_fields: CustomField[];
  visible_fields: string[];
  theme_key?: string | null;
  typography?: Record<string, any>;
  layout_config?: Record<string, any>;
  hero_config?: Record<string, any>;
  trust_signals?: any[];
  testimonials?: any[];
  seo_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  required: boolean;
  options?: string[]; // for select type
}

export interface UpsertBrandingInput {
  slug: string;
  logo_url?: string | null;
  firm_display_name?: string | null;
  primary_color?: string;
  background_color?: string;
  accent_color?: string;
  heading_text?: string;
  description_text?: string;
  custom_fields?: CustomField[];
  visible_fields?: string[];
  theme_key?: string | null;
  typography?: Record<string, any>;
  layout_config?: Record<string, any>;
  hero_config?: Record<string, any>;
  trust_signals?: any[];
  testimonials?: any[];
  seo_config?: Record<string, any>;
}

export function useFirmBranding() {
  const { data: firm } = useFirm();

  return useQuery({
    queryKey: ['firm-branding', firm?.id],
    queryFn: async () => {
      if (!firm?.id) return null;

      const { data, error } = await supabase
        .from('firm_branding')
        .select('*')
        .eq('firm_id', firm.id)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as FirmBranding | null;
    },
    enabled: !!firm?.id,
  });
}

export function useBrandingBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['firm-branding-public', slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from('firm_branding')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as FirmBranding | null;
    },
    enabled: !!slug,
  });
}

export function useUpsertBranding() {
  const queryClient = useQueryClient();
  const { data: firm } = useFirm();

  return useMutation({
    mutationFn: async (input: UpsertBrandingInput) => {
      if (!firm?.id) throw new Error('No firm found');

      // Check if branding exists
      const { data: existing } = await supabase
        .from('firm_branding')
        .select('id')
        .eq('firm_id', firm.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('firm_branding')
          .update({
            ...input,
            custom_fields: JSON.stringify(input.custom_fields ?? []),
            visible_fields: JSON.stringify(input.visible_fields ?? []),
          } as any)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as FirmBranding;
      } else {
        const { data, error } = await supabase
          .from('firm_branding')
          .insert({
            firm_id: firm.id,
            ...input,
            custom_fields: JSON.stringify(input.custom_fields ?? []),
            visible_fields: JSON.stringify(input.visible_fields ?? []),
          } as any)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as FirmBranding;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firm-branding'] });
      toast.success('Landing page saved!');
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });
}

export function useUploadLogo() {
  const { data: firm } = useFirm();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!firm?.id) throw new Error('No firm found');

      const ext = file.name.split('.').pop();
      const path = `${firm.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('firm-logos')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('firm-logos')
        .getPublicUrl(path);

      return urlData.publicUrl;
    },
    onError: (error) => {
      toast.error('Failed to upload logo: ' + error.message);
    },
  });
}
