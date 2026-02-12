import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from './use-firm';
import { useAuth } from '@/lib/auth-context';
import { useToast } from './use-toast';

export interface SocialPost {
  id: string;
  firm_id: string;
  user_id: string;
  title: string | null;
  content: string;
  media_urls: string[];
  media_type: string;
  platforms: string[];
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  ai_generated: boolean;
  plagiarism_score: number;
  plagiarism_checked: boolean;
  ai_prompt: string | null;
  hashtags: string[];
  platform_post_ids: Record<string, string>;
  engagement_metrics: Record<string, any>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useSocialPosts(status?: string) {
  const { user } = useAuth();
  const { data: firm } = useFirm();

  return useQuery({
    queryKey: ['social-posts', firm?.id, status],
    queryFn: async () => {
      let query = (supabase as any)
        .from('social_posts')
        .select('*')
        .order('scheduled_at', { ascending: true, nullsFirst: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return data as SocialPost[];
    },
    enabled: !!user && !!firm?.id,
  });
}

export function useCreateSocialPost() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: firm } = useFirm();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<SocialPost>) => {
      if (!firm?.id || !user?.id) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any)
        .from('social_posts')
        .insert({ firm_id: firm.id, user_id: user.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as SocialPost;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-posts'] });
      toast({ title: 'Post created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateSocialPost() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<SocialPost> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('social_posts')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SocialPost;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-posts'] });
      toast({ title: 'Post updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteSocialPost() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('social_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-posts'] });
      toast({ title: 'Post deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useSocialContentAI() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ action, context }: { action: string; context: any }) => {
      const { data, error } = await supabase.functions.invoke('social-content-generator', {
        body: { action, context },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.result;
    },
    onError: (e: any) => toast({ title: 'AI Error', description: e.message, variant: 'destructive' }),
  });
}
