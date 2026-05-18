import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SectionBackground } from '@/lib/landing-sections/types';

export interface DesignPreset {
  id: string;
  name: string;
  background: SectionBackground;
  created_at: string;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('design-presets', { body });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export function useDesignPresets() {
  const [presets, setPresets] = useState<DesignPreset[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { presets } = await invoke<{ presets: any[] }>({ action: 'list' });
      setPresets((presets ?? []).map((d) => ({ ...d, background: d.background as SectionBackground })));
    } catch (e) {
      console.error('Failed to load design presets', e);
      setPresets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (name: string, background: SectionBackground) => {
    const { preset } = await invoke<{ preset: DesignPreset }>({ action: 'create', name, background });
    setPresets((p) => [{ ...preset, background: preset.background as SectionBackground }, ...p]);
  }, []);

  const remove = useCallback(async (id: string) => {
    await invoke({ action: 'delete', id });
    setPresets((p) => p.filter((x) => x.id !== id));
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    await invoke({ action: 'update', id, name });
    setPresets((p) => p.map((x) => x.id === id ? { ...x, name } : x));
  }, []);

  return { presets, loading, save, remove, rename, refresh };
}
