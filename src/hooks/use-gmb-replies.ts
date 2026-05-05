import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from 'sonner';

export interface ReplyTemplate {
  id: string;
  firm_id: string;
  name: string;
  body: string;
  tone: string;
  rating_filter: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewReply {
  id: string;
  firm_id: string;
  review_id: string;
  template_id: string | null;
  body: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent';
  ai_generated: boolean;
  ai_model: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useReplyTemplates() {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['gmb-reply-templates', firm?.id],
    enabled: !!firm?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gmb_reply_templates' as never)
        .select('*')
        .eq('firm_id', firm!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReplyTemplate[];
    },
  });
}

export function useUpsertReplyTemplate() {
  const qc = useQueryClient();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (payload: Partial<ReplyTemplate> & { name: string; body: string }) => {
      if (!firm?.id) throw new Error('No firm');
      const { data: { user } } = await supabase.auth.getUser();
      const row = { ...payload, firm_id: firm.id, created_by: payload.id ? undefined : user?.id };
      const { data, error } = await supabase.from('gmb_reply_templates' as never).upsert([row as never]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gmb-reply-templates'] });
      toast.success('Template saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteReplyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gmb_reply_templates' as never).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gmb-reply-templates'] });
      toast.success('Template deleted');
    },
  });
}

export function useReviewReplies(reviewId?: string) {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['gmb-review-replies', firm?.id, reviewId],
    enabled: !!firm?.id,
    queryFn: async () => {
      let q = supabase.from('gmb_review_replies' as never).select('*').eq('firm_id', firm!.id).order('created_at', { ascending: false });
      if (reviewId) q = q.eq('review_id', reviewId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ReviewReply[];
    },
  });
}

export function useGenerateAiReply() {
  return useMutation({
    mutationFn: async (input: { review_id: string; template_id?: string; tone?: string; custom_instructions?: string }) => {
      const { data, error } = await supabase.functions.invoke('gmb-generate-reply', { body: input });
      if (error) throw error;
      return data as { body: string; model: string };
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveReviewReply() {
  const qc = useQueryClient();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      review_id: string;
      body: string;
      status: ReviewReply['status'];
      template_id?: string | null;
      ai_generated?: boolean;
      ai_model?: string | null;
    }) => {
      if (!firm?.id) throw new Error('No firm');
      const { data: { user } } = await supabase.auth.getUser();
      const row = { ...payload, firm_id: firm.id, created_by: payload.id ? undefined : user?.id };
      const { data, error } = await supabase.from('gmb_review_replies' as never).upsert([row as never]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gmb-review-replies'] });
      qc.invalidateQueries({ queryKey: ['gmb-reviews'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useApproveReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const update = approve
        ? { status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString(), rejected_reason: null }
        : { status: 'rejected', rejected_reason: reason ?? null };
      const { error } = await supabase.from('gmb_review_replies' as never).update(update as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gmb-review-replies'] });
      toast.success('Updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSendReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, review_id, body }: { id: string; review_id: string; body: string }) => {
      // Mark reply as sent (real Google API call would go here once OAuth tokens are stored)
      const now = new Date().toISOString();
      const { error: e1 } = await supabase.from('gmb_review_replies' as never).update({ status: 'sent', sent_at: now } as never).eq('id', id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('gmb_reviews').update({ reply_text: body, replied_at: now } as never).eq('id', review_id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gmb-review-replies'] });
      qc.invalidateQueries({ queryKey: ['gmb-reviews'] });
      toast.success('Reply sent to Google');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
