import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Loader2, Send, CheckCircle2, ShieldCheck, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { formatCurrency } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftFinalized?: (draft: any) => void;
}

type ChatMsg = { role: 'user' | 'assistant'; content: string };

const SEED_GREETING: ChatMsg = {
  role: 'assistant',
  content:
    "Hi | I'm your Meta Ads strategist. I'll ask a few focused questions and build a winning, Meta-compliant campaign with you, end-to-end. Let's start: **what's the single most important outcome you want from this campaign?** (e.g. qualified leads, calls, signups, sales)",
};

export function AiCampaignBuilderDialog({ open, onOpenChange, onDraftFinalized }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([SEED_GREETING]);
  const [draft, setDraft] = useState<any>({ ads: [] });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, sending]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const reset = () => {
    setMessages([SEED_GREETING]);
    setDraft({ ads: [] });
    setInput('');
    setFinalized(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-ai-campaign-builder', {
        body: { messages: next, draft },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages((m) => [...m, { role: 'assistant', content: data.assistant || '(no response)' }]);
      if (data.draft) setDraft(data.draft);
      if (data.finalized) {
        setFinalized(true);
        toast({ title: 'Draft ready', description: 'Campaign draft has been finalized for review.' });
      }
      if (Array.isArray(data.tool_events) && data.tool_events.some((e: any) => !e.ok)) {
        toast({
          title: 'AI tool rejected',
          description: data.tool_events.filter((e: any) => !e.ok).map((e: any) => e.note).join(' | '),
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({ title: 'AI error', description: e?.message || 'Failed to generate', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const useDraft = () => {
    onDraftFinalized?.(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            AI Campaign Builder
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Grounded in your firm data | no hallucinated benchmarks | Meta-compliant character limits enforced
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] overflow-hidden">
          {/* Chat */}
          <div className="flex flex-col border-r overflow-hidden">
            <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef as any}>
              <div className="space-y-4 max-w-2xl mx-auto">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`rounded-lg px-4 py-2.5 max-w-[85%] text-sm prose prose-sm dark:prose-invert ${
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-lg px-4 py-2.5 bg-muted text-sm flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking|
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="border-t p-3 flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Type your answer|"
                rows={2}
                disabled={sending}
                className="resize-none"
              />
              <div className="flex flex-col gap-1.5">
                <Button onClick={send} disabled={sending || !input.trim()} className="gap-1">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={reset} title="Reset conversation">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Draft preview */}
          <div className="overflow-hidden flex flex-col bg-muted/20">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold">Campaign Draft</h3>
              {finalized && (
                <Badge className="bg-emerald-500 text-white gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Ready
                </Badge>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                <DraftRow label="Name" value={draft.name} />
                <DraftRow label="Objective" value={draft.objective} />
                <DraftRow label="Daily Budget" value={draft.daily_budget ? formatCurrency(draft.daily_budget) : undefined} />
                <DraftRow label="Start | End" value={[draft.start_date, draft.end_date].filter(Boolean).join(' | ') || undefined} />

                {draft.audience && (
                  <Card>
                    <CardHeader className="py-2 px-3"><CardTitle className="text-xs">Audience</CardTitle></CardHeader>
                    <CardContent className="text-xs space-y-1 px-3 pb-3">
                      {draft.audience.locations?.length > 0 && <div><span className="text-muted-foreground">Locations:</span> {draft.audience.locations.join(', ')}</div>}
                      {(draft.audience.age_min || draft.audience.age_max) && <div><span className="text-muted-foreground">Age:</span> {draft.audience.age_min ?? '?'} | {draft.audience.age_max ?? '?'}</div>}
                      {draft.audience.genders?.length > 0 && <div><span className="text-muted-foreground">Gender:</span> {draft.audience.genders.join(', ')}</div>}
                      {draft.audience.interest_keywords?.length > 0 && <div><span className="text-muted-foreground">Interests:</span> {draft.audience.interest_keywords.join(', ')}</div>}
                    </CardContent>
                  </Card>
                )}

                {Array.isArray(draft.ads) && draft.ads.length > 0 && (
                  <>
                    <Separator />
                    <h4 className="text-xs font-semibold text-muted-foreground">Ads ({draft.ads.length})</h4>
                    {draft.ads.map((ad: any, i: number) => (
                      <Card key={i}>
                        <CardContent className="p-3 space-y-2">
                          {ad.image_url && (
                            <img src={ad.image_url} alt="ad creative" className="w-full rounded aspect-square object-cover" />
                          )}
                          <div className="text-xs font-medium">{ad.headline}</div>
                          <div className="text-xs text-muted-foreground line-clamp-3">{ad.primary_text}</div>
                          {ad.description && <div className="text-[10px] text-muted-foreground">{ad.description}</div>}
                          {ad.cta && <Badge variant="outline" className="text-[10px]">{ad.cta}</Badge>}
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}

                {!draft.name && !draft.objective && (!draft.ads || draft.ads.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Your campaign will appear here as you answer questions.
                  </p>
                )}
              </div>
            </ScrollArea>
            {finalized && (
              <div className="p-3 border-t">
                <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={useDraft}>
                  <CheckCircle2 className="h-4 w-4" />
                  Use this draft
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DraftRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
