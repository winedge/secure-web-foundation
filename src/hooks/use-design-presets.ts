import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SectionBackground } from '@/lib/landing-sections/types';

export interface DesignPreset {
  id: string;
  name: string;
  background: SectionBackground;
  created_at: string;
}

export function useDesignPresets() {
  const [presets, setPresets] = useState<DesignPreset[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('landing_design_presets')
      .select('id, name, background, created_at')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setPresets(data.map((d: any) => ({ ...d, background: d.background as SectionBackground })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (name: string, background: SectionBackground) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Not signed in');
    const { error } = await supabase.from('landing_design_presets').insert({
      user_id: auth.user.id,
      name,
      background: background as any,
    });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('landing_design_presets').delete().eq('id', id);
    if (error) throw error;
    setPresets((p) => p.filter((x) => x.id !== id));
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('landing_design_presets').update({ name }).eq('id', id);
    if (error) throw error;
    setPresets((p) => p.map((x) => x.id === id ? { ...x, name } : x));
  }, []);

  return { presets, loading, save, remove, rename, refresh };
}
