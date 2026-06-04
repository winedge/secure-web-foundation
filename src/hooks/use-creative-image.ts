import { useMutation } from '@tanstack/react-query';
import { useRef, useState, useCallback } from 'react';
import { createParser } from 'eventsource-parser';
import { flushSync } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CreativeImageProvider =
  | 'openai'
  | 'openai-mini'
  | 'gemini-flash'
  | 'gemini-pro'
  | 'ideogram'
  | 'midjourney';

export type CreativeImageQuality = 'draft' | 'standard' | 'high';

export interface CreativeImageRequest {
  prompt: string;
  provider?: CreativeImageProvider;
  preset?: 'ad-poster' | 'lifestyle-hero' | 'product-shot' | 'typography-poster' | 'ugc-style' | 'minimalist-brand';
  aspect_ratio?: '1:1' | '9:16' | '16:9' | '4:5';
  firm_id?: string;
  variant_id?: string;
  brand_colors?: string[];
  on_image_text?: string;
  midjourney_style_refs?: string[];
  quality?: CreativeImageQuality;
  subheadline?: string;
  cta?: string;
  features?: string[];
}

export interface CreativeImageResult {
  provider: CreativeImageProvider;
  model_used?: string;
  preset?: string;
  aspect_ratio?: string;
  quality?: CreativeImageQuality;
  signed_url?: string; // data URL for streamed images
  variant_id?: string | null;
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
  'ad-poster': 'openai',
  'lifestyle-hero': 'gemini-pro',
  'product-shot': 'openai',
  'typography-poster': 'openai',
  'ugc-style': 'gemini-flash',
  'minimalist-brand': 'gemini-pro',
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function invokeJson(body: Record<string, unknown>): Promise<CreativeImageResult> {
  const { data, error } = await supabase.functions.invoke('ai-creative-image', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as CreativeImageResult;
}

export interface StreamingState {
  previewDataUrl: string | null;
  isFinal: boolean;
  isStreaming: boolean;
}

export function useGenerateCreativeImage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setPreview(null);
    setIsFinal(false);
    setIsStreaming(false);
  }, []);

  const mutation = useMutation({
    mutationFn: async (req: CreativeImageRequest): Promise<CreativeImageResult> => {
      reset();
      // Non-streaming providers (Midjourney/Ideogram) take the JSON path.
      if (req.provider === 'midjourney' || req.provider === 'ideogram') {
        return invokeJson(req as unknown as Record<string, unknown>);
      }

      setIsStreaming(true);
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-creative-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${session?.access_token ?? ANON_KEY}`,
        },
        body: JSON.stringify(req),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        setIsStreaming(false);
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Image generation failed: ${res.status}`);
      }

      let finalDataUrl = '';
      let sawCompleted = false;
      const parser = createParser({
        onEvent(evt) {
          if (evt.event !== 'image_generation.partial_image' && evt.event !== 'image_generation.completed') return;
          let payload: any;
          try { payload = JSON.parse(evt.data); } catch { return; }
          if (!payload?.b64_json) return;
          const dataUrl = `data:image/png;base64,${payload.b64_json}`;
          const final = evt.event === 'image_generation.completed';
          flushSync(() => {
            setPreview(dataUrl);
            if (final) {
              setIsFinal(true);
              finalDataUrl = dataUrl;
              sawCompleted = true;
            }
          });
        },
      });

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          parser.feed(value);
        }
      } finally {
        reader.cancel().catch(() => {});
        setIsStreaming(false);
      }

      if (!sawCompleted) throw new Error('Image stream ended without a completed event');

      return {
        provider: req.provider ?? 'openai',
        preset: req.preset,
        aspect_ratio: req.aspect_ratio,
        quality: req.quality,
        signed_url: finalDataUrl,
        variant_id: req.variant_id ?? null,
      };
    },
    onError: (err: any) => {
      setIsStreaming(false);
      toast.error(err.message || 'Image generation failed');
    },
  });

  return Object.assign(mutation, {
    previewDataUrl: preview,
    isFinal,
    isStreaming,
    reset,
  });
}
