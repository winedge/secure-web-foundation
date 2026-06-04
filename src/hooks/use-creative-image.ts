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
  job_id?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
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

async function invoke(body: Record<string, unknown>): Promise<CreativeImageResult> {
  const { data, error } = await supabase.functions.invoke('ai-creative-image', { body });
  if (error) throw error;
  if (data?.error && data?.status !== 'processing' && data?.status !== 'pending') throw new Error(data.error);
  return data as CreativeImageResult;
}

async function pollJob(jobId: string, timeoutMs = 240_000): Promise<CreativeImageResult> {
  const start = Date.now();
  let delay = 2000;
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, delay));
    const res = await invoke({ job_id: jobId });
    if (res.status === 'completed') return res;
    if (res.status === 'failed') throw new Error(res.error || 'Image generation failed');
    delay = Math.min(delay + 1000, 5000);
  }
  throw new Error('Image generation timed out');
}

export function useGenerateCreativeImage() {
  return useMutation({
    mutationFn: async (req: CreativeImageRequest): Promise<CreativeImageResult> => {
      const initial = await invoke(req as unknown as Record<string, unknown>);
      if (initial.job_id && initial.status !== 'completed') {
        return pollJob(initial.job_id);
      }
      return initial;
    },
    onError: (err: any) => toast.error(err.message || 'Image generation failed'),
  });
}
