import { GmbSubNav } from './GmbDashboard';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Send, CheckCircle2, XCircle, Star, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { useReplyTemplates, useReviewReplies, useGenerateAiReply, useSaveReviewReply, useApproveReply, useSendReply } from '@/hooks/use-gmb-replies';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Review { id: string; firm_id: string; location_id: string; rating: number | null; text: string | null; reviewer_name: string | null; replied_at: string | null; reply_text: string | null; created_at: string; }

export default function GmbReplyApprovals() {
  const { data: firm } = useFirm();
  const { data: templates = [] } = useReplyTemplates();
  const { data: replies = [] } = useReviewReplies();
  const generate = useGenerateAiReply();
  const saveReply = useSaveReviewReply();
  const approve = useApproveReply();
  const send = useSendReply();

  const [drafts, setDrafts] = useState<Record<string, { body: string; templateId: string; tone: string }>>({});

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['gmb-reviews-all', firm?.id],
    enabled: !!firm?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('gmb_reviews').select('*').eq('firm_id', firm!.id).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

  const replyByReview = useMemo(() => {
    const m = new Map<string, typeof replies[number]>();
    for (const r of replies) if (!m.has(r.review_id)) m.set(r.review_id, r);
    return m;
  }, [replies]);

  const pendingReplies = replies.filter(r => r.status === 'pending_approval');

  const generateFor = async (review: Review) => {
    const d = drafts[review.id] ?? { body: '', templateId: '', tone: 'professional' };
    const res = await generate.mutateAsync({
      review_id: review.id,
      template_id: d.templateId || undefined,
      tone: d.tone,
    });
    setDrafts({ ...drafts, [review.id]: { ...d, body: res.body } });
  };

  const submitForApproval = async (review: Review) => {
    const d = drafts[review.id];
    if (!d?.body?.trim()) { toast.error('Draft is empty'); return; }
    if (d.body.length > 4000) { toast.error('Reply too long'); return; }
    await saveReply.mutateAsync({
      review_id: review.id,
      body: d.body.trim(),
      status: 'pending_approval',
      template_id: d.templateId || null,
      ai_generated: true,
      ai_model: 'google/gemini-2.5-flash',
    });
    toast.success('Submitted for approval');
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto mb-4"><GmbSubNav /></div>
      <div className="space-y-6 max-w-6xl mx-auto">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" /> Review Reply Workflow
            </h1>
            <p className="text-muted-foreground mt-1">Generate AI replies, submit for approval, and publish to Google.</p>
          </div>
          <Button asChild variant="outline"><Link to="/gmb/reply-templates">Manage templates</Link></Button>
        </header>

        <Tabs defaultValue="generate">
          <TabsList>
            <TabsTrigger value="generate">Generate ({reviews.filter(r => !r.replied_at).length})</TabsTrigger>
            <TabsTrigger value="pending">Pending approval ({pendingReplies.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4 mt-4">
            {isLoading ? <Skeleton className="h-40 w-full" /> :
              reviews.filter(r => !r.replied_at && !replyByReview.get(r.id)).length === 0 ?
              <Card><CardContent className="p-8 text-center text-muted-foreground">All reviews handled. Nice work.</CardContent></Card> :
              reviews.filter(r => !r.replied_at && !replyByReview.get(r.id)).map(review => {
                const d = drafts[review.id] ?? { body: '', templateId: '', tone: 'professional' };
                const eligibleTemplates = templates.filter(t => t.is_active && (!t.rating_filter || t.rating_filter === review.rating));
                return (
                  <Card key={review.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <CardTitle className="text-base flex items-center gap-2">
                          {review.reviewer_name ?? 'Anonymous'}
                          {review.rating && <span className="flex items-center gap-0.5 text-amber-500">{Array.from({ length: review.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}</span>}
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-foreground/80 mt-1">{review.text ?? '(no text)'}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Template</Label>
                          <Select value={d.templateId} onValueChange={(v) => setDrafts({ ...drafts, [review.id]: { ...d, templateId: v } })}>
                            <SelectTrigger><SelectValue placeholder="No template" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value=" ">No template</SelectItem>
                              {eligibleTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Tone</Label>
                          <Select value={d.tone} onValueChange={(v) => setDrafts({ ...drafts, [review.id]: { ...d, tone: v } })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['professional','friendly','apologetic','grateful','concise'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Textarea rows={4} maxLength={4000} value={d.body} onChange={(e) => setDrafts({ ...drafts, [review.id]: { ...d, body: e.target.value } })} placeholder="Generate or write a reply..." />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => generateFor(review)} disabled={generate.isPending}>
                          <Sparkles className="h-4 w-4 mr-2" />{d.body ? 'Regenerate' : 'Generate with AI'}
                        </Button>
                        <Button onClick={() => submitForApproval(review)} disabled={!d.body.trim() || saveReply.isPending}>Submit for approval</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            }
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingReplies.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Nothing awaiting approval.</CardContent></Card>
            ) : pendingReplies.map(reply => {
              const review = reviews.find(r => r.id === reply.review_id);
              return (
                <Card key={reply.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        {review?.reviewer_name ?? 'Review'}
                        {reply.ai_generated && <Badge variant="secondary">AI</Badge>}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">{new Date(reply.created_at).toLocaleString()}</span>
                    </div>
                    {review?.text && <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">"{review.text}"</p>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{reply.body}</div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => approve.mutate({ id: reply.id, approve: false, reason: 'Rejected by reviewer' })}>
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                      </Button>
                      <Button onClick={() => approve.mutate({ id: reply.id, approve: true })}>
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4 mt-4">
            {replies.filter(r => r.status === 'approved').length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No approved replies waiting to be sent.</CardContent></Card>
            ) : replies.filter(r => r.status === 'approved').map(reply => (
              <Card key={reply.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Approved
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{reply.body}</div>
                  <div className="flex justify-end">
                    <Button onClick={() => send.mutate({ id: reply.id, review_id: reply.review_id, body: reply.body })} disabled={send.isPending}>
                      <Send className="h-4 w-4 mr-2" /> Send to Google
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4 mt-4">
            {replies.filter(r => r.status === 'sent').length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No sent replies yet.</CardContent></Card>
            ) : replies.filter(r => r.status === 'sent').map(reply => (
              <Card key={reply.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" /> Sent {reply.sent_at && <span className="text-xs text-muted-foreground ml-1">{new Date(reply.sent_at).toLocaleString()}</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{reply.body}</div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
