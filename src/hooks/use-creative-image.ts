import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CreativeImageProvider =
  | 'openai'
  | 'openai-mini'
  | 'gemini-flash'
  | 'gemini-pro'
  | 'ideogram'
  | 'midjourney';

export interface CreativeImageRequest {
  prompt: string;
  provider?: CreativeImageProvider;
  preset?: 'lifestyle-hero' | 'product-shot' | 'typography-poster' | 'ugc-style' | 'minimalist-brand';
  aspect_ratio?: '1:1' | '9:16' | '16:9' | '4:5';
  firm_id?: string;
  variant_id?: string;
  brand_colors?: string[];
  on_image_text?: string;
  midjourney_style_refs?: string[];
}

export interface CreativeImageResult {
  provider: CreativeImageProvider;
  model_used?: string;
  preset?: string;
  aspect_ratio?: string;
  storage_path?: string;
  signed_url?: string;
  variant_id?: string | null;
  final_prompt?: string;
  export_only?: boolean;
  midjourney_prompt?: string;
  instructions?: string;
  requires_secret?: string;
  error?: string;
}

export const PROVIDER_LABELS: Record<CreativeImageProvider, string> = {
  'openai': 'ChatGPT Image (gpt-image-2)',
  'openai-mini': 'ChatGPT Image Mini',
  'gemini-flash': 'Nano Banana 2 (Draft)',
  'gemini-pro': 'Gemini 3 Pro Image (Premium)',
  'ideogram': 'Ideogram v3 (Typography)',
  'midjourney': 'Midjourney v7 (Prompt Export)',
};

export const PROVIDER_RECOMMENDATIONS: Record<string, CreativeImageProvider> = {
  'lifestyle-hero': 'openai',
  'product-shot': 'openai',
  'typography-poster': 'ideogram',
  'ugc-style': 'gemini-flash',
  'minimalist-brand': 'gemini-pro',
};

export function useGenerateCreativeImage() {
  return useMutation({
    mutationFn: async (req: CreativeImageRequest): Promise<CreativeImageResult> => {
      const { data, error } = await supabase.functions.invoke('ai-creative-image', { body: req });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as CreativeImageResult;
    },
    onError: (err: any) => toast.error(err.message || 'Image generation failed'),
  });
}
