import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Loader2, Send, CheckCircle2, ShieldCheck, RotateCcw, ChevronLeft, Rocket, AlertTriangle, Zap, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { formatCurrency } from '@/lib/utils';
import { AdPreviewPanel } from './AdPreviewPanel';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished?: () => void;
}

type ChatMsg = { role: 'user' | 'assistant'; content: string };

const SEED_GREETING: ChatMsg = {
  role: 'assistant',
  content:
    "Hi | I'm your Meta Ads strategist. I'll ask a few focused questions and build a winning, Meta-compliant campaign with you, end-to-end. Let's start: **what's the single most important outcome you want from this campaign?** (e.g. qualified leads, calls, signups, sales)",
};

type Option = { id: string; name: string };

export function AiCampaignBuilderDialog({ open, onOpenChange, onPublished }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([SEED_GREETING]);
  const [draft, setDraft] = useState<any>({ ads: [] });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Review-step selections
  const [adAccounts, setAdAccounts] = useState<Option[]>([]);
  const [pixels, setPixels] = useState<Option[]>([]);
  const [leadForms, setLeadForms] = useState<Option[]>([]);
  const [pages, setPages] = useState<Option[]>([]);
  const [adAccountId, setAdAccountId] = useState<string>('');
  const [pixelId, setPixelId] = useState<string>('');
  const [leadFormId, setLeadFormId] = useState<string>('');
  const [pageId, setPageId] = useState<string>('');
  const [publishing, setPublishing] = useState(false);

  // Meta Advantage+ toggles (all default ON | Meta auto-optimizes audience, placements, creative)
  const [advAudience, setAdvAudience] = useState(true);
  const [advPlacements, setAdvPlacements] = useState(true);
  const [advCreative, setAdvCreative] = useState(true);

  // Meta Generative AI capability + opt-in
  const [metaGenAi, setMetaGenAi] = useState<{ text: boolean; image: boolean } | null>(null);
  const [useMetaGenAi, setUseMetaGenAi] = useState(false);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, sending]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  // Load firm-grounded options when the review step opens.
  useEffect(() => {
    if (!showReview) return;
    (async () => {
      const [accRes, pxRes, lfRes, pgRes] = await Promise.all([
        supabase.from('meta_ad_accounts').select('id,name').limit(50),
        supabase.from('meta_pixels').select('id,name').limit(50),
        supabase.from('meta_lead_forms').select('id,name').limit(50),
        supabase.from('meta_pages').select('id,name').limit(50),
      ]);
      setAdAccounts((accRes.data || []) as Option[]);
      setPixels((pxRes.data || []) as Option[]);
      setLeadForms((lfRes.data || []) as Option[]);
      setPages((pgRes.data || []) as Option[]);
      if (accRes.data?.[0] && !adAccountId) setAdAccountId((accRes.data[0] as Option).id);
      if (pgRes.data?.[0] && !pageId) setPageId((pgRes.data[0] as Option).id);
    })();
  }, [showReview]); // eslint-disable-line react-hooks/exhaustive-deps

  // Probe Meta Generative AI capability for the selected ad account.
  useEffect(() => {
    if (!showReview || !adAccountId) { setMetaGenAi(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('meta-genai-creative', {
          body: { action: 'probe', ad_account_id: adAccountId },
        });
        if (cancelled) return;
        const caps = data?.capabilities ?? { text: false, image: false };
        setMetaGenAi(caps);
        // Default the toggle ON when access is present.
        if (caps.image) setUseMetaGenAi(true);
      } catch {
        if (!cancelled) setMetaGenAi({ text: false, image: false });
      }
    })();
    return () => { cancelled = true; };
  }, [showReview, adAccountId]);

  const reset = () => {
    setMessages([SEED_GREETING]);
    setDraft({ ads: [] });
    setInput('');
    setFinalized(false);
    setShowReview(false);
    setAdAccountId('');
    setPixelId('');
    setLeadFormId('');
    setPageId('');
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
        body: {
          messages: next,
          draft,
          use_meta_genai: useMetaGenAi && !!metaGenAi?.image,
          ad_account_id: adAccountId || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages((m) => [...m, { role: 'assistant', content: data.assistant || '(no response)' }]);
      if (data.draft) setDraft(data.draft);
      if (data.finalized) {
        setFinalized(true);
        toast({ title: 'Draft ready', description: 'Review the summary and placement previews before publishing.' });
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

  const publish = async () => {
    if (!adAccountId) {
      toast({ title: 'Pick an ad account', description: 'An ad account is required to publish to Meta.', variant: 'destructive' });
      return;
    }
    setPublishing(true);
    try {
      const { data: saveData, error: saveErr } = await supabase.functions.invoke('save-ai-campaign', {
        body: {
          draft,
          ad_account_id: adAccountId,
          pixel_id: pixelId || undefined,
          lead_form_id: leadFormId || undefined,
          page_id: pageId || undefined,
          advantage_plus: {
            audience: advAudience,
            placements: advPlacements,
            creative: advCreative,
          },
        },
      });
      if (saveErr) throw saveErr;
      if (saveData?.error) throw new Error(saveData.error);
      const campaign_id = saveData?.campaign_id;
      if (!campaign_id) throw new Error('No campaign id returned');

      const { data: pubData, error: pubErr } = await supabase.functions.invoke('meta-publish-campaign', {
        body: { campaign_id, approve: true },
      });
      if (pubErr) throw pubErr;
      if (pubData?.error) throw new Error(pubData.error);

      toast({
        title: 'Campaign queued for publish',
        description: 'Your campaign and ads will be created on Meta in PAUSED state. Flip the on/off toggle when ready to go live.',
      });
      onPublished?.();
      onOpenChange(false);
      // Small delay before resetting so the close animation doesn't flicker mid-state.
      setTimeout(reset, 250);
    } catch (e: any) {
      toast({ title: 'Publish failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            {showReview ? 'Review & Publish to Meta' : 'AI Campaign Builder'}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Grounded in your firm data | no hallucinated benchmarks | nothing goes live until you approve
          </DialogDescription>
        </DialogHeader>

        {!showReview ? (
          <ChatPane
            messages={messages}
            sending={sending}
            input={input}
            setInput={setInput}
            send={send}
            reset={reset}
            scrollRef={scrollRef}
            inputRef={inputRef}
            draft={draft}
            finalized={finalized}
            onProceedReview={() => setShowReview(true)}
          />
        ) : (
          <ReviewPane
            draft={draft}
            adAccounts={adAccounts}
            pixels={pixels}
            leadForms={leadForms}
            pages={pages}
            adAccountId={adAccountId}
            setAdAccountId={setAdAccountId}
            pixelId={pixelId}
            setPixelId={setPixelId}
            leadFormId={leadFormId}
            setLeadFormId={setLeadFormId}
            pageId={pageId}
            setPageId={setPageId}
            publishing={publishing}
            advAudience={advAudience}
            setAdvAudience={setAdvAudience}
            advPlacements={advPlacements}
            setAdvPlacements={setAdvPlacements}
            advCreative={advCreative}
            setAdvCreative={setAdvCreative}
            metaGenAi={metaGenAi}
            useMetaGenAi={useMetaGenAi}
            setUseMetaGenAi={setUseMetaGenAi}
            onBack={() => setShowReview(false)}
            onPublish={publish}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ──────────────── Chat pane ────────────────
function ChatPane({
  messages, sending, input, setInput, send, reset, scrollRef, inputRef,
  draft, finalized, onProceedReview,
}: any) {
  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] overflow-hidden min-h-0">
      <div className="flex flex-col border-r overflow-hidden min-h-0">
        <ScrollArea className="flex-1 min-h-0 px-6 py-4" ref={scrollRef}>
          <div className="space-y-4 max-w-2xl mx-auto">
            {messages.map((m: ChatMsg, i: number) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`rounded-lg px-4 py-2.5 max-w-[85%] text-sm prose prose-sm dark:prose-invert ${
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
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
            onChange={(e: any) => setInput(e.target.value)}
            onKeyDown={(e: any) => {
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

      <div className="overflow-hidden flex flex-col bg-muted/20 min-h-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">Campaign Draft</h3>
          {finalized && (
            <Badge className="bg-emerald-500 text-white gap-1">
              <CheckCircle2 className="h-3 w-3" /> Ready
            </Badge>
          )}
        </div>
        <ScrollArea className="flex-1 min-h-0">
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
            <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={onProceedReview}>
              <CheckCircle2 className="h-4 w-4" />
              Continue to review & publish
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────── Review & publish pane ────────────────
function ReviewPane({
  draft, adAccounts, pixels, leadForms, pages,
  adAccountId, setAdAccountId, pixelId, setPixelId, leadFormId, setLeadFormId, pageId, setPageId,
  publishing,
  advAudience, setAdvAudience, advPlacements, setAdvPlacements, advCreative, setAdvCreative,
  metaGenAi, useMetaGenAi, setUseMetaGenAi,
  onBack, onPublish,
}: any) {
  const noAccounts = adAccounts.length === 0;
  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] overflow-hidden min-h-0">
      {/* Left | summary + selectors */}
      <div className="border-r flex flex-col min-h-0">
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            <Card>
              <CardHeader className="py-2 px-3"><CardTitle className="text-sm">Campaign</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1.5 px-3 pb-3">
                <KV k="Name" v={draft.name} />
                <KV k="Objective" v={draft.objective} />
                <KV k="Daily Budget" v={draft.daily_budget ? formatCurrency(draft.daily_budget) : '|'} />
                <KV k="Schedule" v={[draft.start_date, draft.end_date].filter(Boolean).join(' | ') || 'Starts immediately'} />
              </CardContent>
            </Card>

            {draft.audience && (
              <Card>
                <CardHeader className="py-2 px-3"><CardTitle className="text-sm">Audience</CardTitle></CardHeader>
                <CardContent className="text-xs space-y-1.5 px-3 pb-3">
                  {draft.audience.locations?.length > 0 && <KV k="Locations" v={draft.audience.locations.join(', ')} />}
                  <KV k="Age" v={`${draft.audience.age_min ?? 18} | ${draft.audience.age_max ?? 65}`} />
                  {draft.audience.genders?.length > 0 && <KV k="Gender" v={draft.audience.genders.join(', ')} />}
                  {draft.audience.interest_keywords?.length > 0 && (
                    <div>
                      <div className="text-muted-foreground mb-1">Interests</div>
                      <div className="flex flex-wrap gap-1">
                        {draft.audience.interest_keywords.map((k: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{k}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="py-2 px-3"><CardTitle className="text-sm">Meta Account</CardTitle></CardHeader>
              <CardContent className="space-y-3 px-3 pb-3">
                {noAccounts && (
                  <div className="text-xs text-amber-600 flex items-start gap-1.5 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    No Meta ad accounts found. Connect Meta from the Meta Ads page before publishing.
                  </div>
                )}
                <SelectField label="Ad Account *" value={adAccountId} onChange={setAdAccountId} options={adAccounts} placeholder="Select ad account" />
                <SelectField label="Facebook Page" value={pageId} onChange={setPageId} options={pages} placeholder="Select page" />
                <SelectField label="Pixel (optional)" value={pixelId} onChange={setPixelId} options={pixels} placeholder="None" allowClear />
                <SelectField label="Lead Form (optional)" value={leadFormId} onChange={setLeadFormId} options={leadForms} placeholder="None" allowClear />
              </CardContent>
            </Card>

            {/* Meta Advantage+ optimizations */}
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-emerald-500" />
                  Meta Advantage+ Optimizations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-3 pb-3">
                <ToggleRow
                  label="Advantage+ Audience"
                  hint="Meta may expand beyond your selected states / interests to find more conversions."
                  checked={advAudience}
                  onCheckedChange={setAdvAudience}
                />
                <ToggleRow
                  label="Advantage+ Placements"
                  hint="Auto-distribute across Feed, Reels, Stories, Search and Audience Network."
                  checked={advPlacements}
                  onCheckedChange={setAdvPlacements}
                />
                <ToggleRow
                  label="Advantage+ Creative"
                  hint="Meta auto-enhances brightness, cropping, music for Reels, and text variants per placement."
                  checked={advCreative}
                  onCheckedChange={setAdvCreative}
                />
              </CardContent>
            </Card>

            {/* Meta Generative AI source */}
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Wand2 className="h-3.5 w-3.5 text-emerald-500" />
                  Creative AI Source
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                {metaGenAi === null ? (
                  <div className="text-[11px] text-muted-foreground">Checking Meta Generative AI availability|</div>
                ) : metaGenAi.image ? (
                  <ToggleRow
                    label="Use Meta's Generative AI when available"
                    hint="Generate images directly via Meta's allowlisted endpoints; falls back to Lovable AI if anything fails."
                    checked={useMetaGenAi}
                    onCheckedChange={setUseMetaGenAi}
                  />
                ) : (
                  <div className="text-[11px] text-muted-foreground bg-muted/40 rounded p-2 leading-relaxed">
                    Your ad account isn't enrolled in Meta's Generative AI program. Creatives will be generated with <strong>Lovable AI</strong>.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="text-[11px] text-muted-foreground bg-muted/40 rounded p-2 leading-relaxed">
              On publish we create the campaign, ad set and ads on Meta in <strong>PAUSED</strong> state. Nothing spends until you flip the on/off toggle from the campaigns table.
            </div>
          </div>
        </ScrollArea>
        <div className="border-t p-3 flex gap-2">
          <Button variant="ghost" onClick={onBack} disabled={publishing} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Back to chat
          </Button>
          <Button
            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={publishing || noAccounts || !adAccountId}
            onClick={onPublish}
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Approve & Publish to Meta
          </Button>
        </div>
      </div>

      {/* Right | placement previews */}
      <ScrollArea className="min-h-0">
        <div className="p-4 space-y-4">
          <div className="text-xs text-muted-foreground">
            Preview how each ad will appear across Facebook Feed, Instagram Feed, Reels and Stories.
          </div>
          {Array.isArray(draft.ads) && draft.ads.length > 0 ? (
            draft.ads.map((ad: any, i: number) => (
              <Card key={i}>
                <CardHeader className="py-2 px-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm">Ad {i + 1}</CardTitle>
                  {ad.cta && <Badge variant="outline" className="text-[10px]">{ad.cta}</Badge>}
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <AdPreviewPanel
                    headline={ad.headline}
                    bodyText={ad.primary_text}
                    description={ad.description}
                    callToAction={ad.cta}
                    linkUrl={ad.link_url}
                    imageUrl={ad.image_url}
                    adFormat="single_image"
                    pageName={pages.find((p: Option) => p.id === pageId)?.name || draft.name || 'Your Page'}
                  />
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">No ads in this draft.</div>
          )}
        </div>
      </ScrollArea>
    </div>
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

function KV({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v || '|'}</span>
    </div>
  );
}

function SelectField({
  label, value, onChange, options, placeholder, allowClear,
}: { label: string; value: string; onChange: (v: string) => void; options: Option[]; placeholder: string; allowClear?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value || undefined} onValueChange={(v) => onChange(v === '__none__' ? '' : v)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowClear && <SelectItem value="__none__">None</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id} className="text-xs">{o.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
