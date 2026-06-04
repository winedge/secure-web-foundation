import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from './use-firm';
import { toast } from 'sonner';

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
  cta: string;
}

export interface BrandFont {
  family: string;
  weight: string;
}

export interface BrandFonts {
  heading: BrandFont;
  body: BrandFont;
}

export interface TrustBadge {
  label: string;
  icon?: string;
}

export interface BrandContact {
  phone?: string;
  website?: string;
  address?: string;
  email?: string;
}

export interface BrandKit {
  firm_id: string;
  logo_url: string | null;
  dark_logo_url: string | null;
  wordmark_url: string | null;
  colors: BrandColors;
  fonts: BrandFonts;
  tone_of_voice: string | null;
  guidelines_md: string | null;
  trust_badges: TrustBadge[];
  contact: BrandContact;
  product_images: string[];
  disclaimer: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_BRAND_KIT: Omit<BrandKit, 'firm_id' | 'created_at' | 'updated_at'> = {
  logo_url: null,
  dark_logo_url: null,
  wordmark_url: null,
  colors: {
    primary: '#0F172A',
    secondary: '#1E293B',
    accent: '#10B981',
    bg: '#FFFFFF',
    text: '#0F172A',
    cta: '#10B981',
  },
  fonts: {
    heading: { family: 'Inter', weight: '700' },
    body: { family: 'Inter', weight: '400' },
  },
  tone_of_voice: null,
  guidelines_md: null,
  trust_badges: [],
  contact: {},
  product_images: [],
  disclaimer: null,
};

export function useBrandKit() {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['brand-kit', firm?.id],
    queryFn: async (): Promise<BrandKit | null> => {
      if (!firm?.id) return null;
      const { data, error } = await supabase
        .from('firm_brand_kit' as any)
        .select('*')
        .eq('firm_id', firm.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as BrandKit) || null;
    },
    enabled: !!firm?.id,
  });
}

export function useUpsertBrandKit() {
  const qc = useQueryClient();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (input: Partial<BrandKit>) => {
      if (!firm?.id) throw new Error('No firm');
      const payload = { firm_id: firm.id, ...input };
      const { data, error } = await supabase
        .from('firm_brand_kit' as any)
        .upsert(payload as any, { onConflict: 'firm_id' })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as BrandKit;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brand-kit'] });
      toast.success('Brand kit saved');
    },
    onError: (e: any) => toast.error(e.message || 'Save failed'),
  });
}

export function useUploadBrandAsset() {
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind: 'logo' | 'dark_logo' | 'wordmark' | 'product' }) => {
      if (!firm?.id) throw new Error('No firm');
      const ext = file.name.split('.').pop() || 'png';
      const path = `${firm.id}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('firm-logos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('firm-logos').getPublicUrl(path);
      return data.publicUrl;
    },
    onError: (e: any) => toast.error('Upload failed: ' + e.message),
  });
}
