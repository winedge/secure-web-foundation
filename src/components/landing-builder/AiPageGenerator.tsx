import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2, Sparkles, ArrowLeft, Check, RefreshCcw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Section, SectionTheme } from '@/lib/landing-sections/types';
import { SectionRenderer } from '@/components/landing-sections/SectionRenderer';

const FALLBACK_THEME: SectionTheme = {
  primary: '210 90% 50%',
  background: '0 0% 100%',
  accent: '160 70% 45%',
  radius: 'lg',
  spacing: 'normal',
  buttonStyle: 'solid',
  maxWidth: 'normal',
};

interface Props {
  hasExisting: boolean;
  theme?: SectionTheme;
  onGenerated: (sections: Section[]) => void;
  variant?: 'default' | 'compact';
}

const EXAMPLES = [
  'Boutique dental clinic in Mumbai offering invisible aligners and same-day crowns. Book a free consult.',
  'B2B SaaS for warehouse inventory tracking | reduces shrinkage by 30%. Target ops directors at mid-market retailers.',
  'Personal injury law firm in Houston that has recovered $50M for car-accident clients. Free case review.',
];

type Step = 'form' | 'preview';

export function AiPageGenerator({ hasExisting, theme, onGenerated, variant = 'default' }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('confident, friendly');
  const [businessType, setBusinessType] = useState('service');
  const [product, setProduct] = useState('');
  const [benefits, setBenefits] = useState(''); // one per line
  const [offer, setOffer] = useState('');
  const [cta, setCta] = useState('');

  const [step, setStep] = useState<Step>('form');
  const [draft, setDraft] = useState<Section[] | null>(null);
  const [summary, setSummary] = useState<string>('');

  const reset = () => {
    setStep('form');
    setDraft(null);
    setSummary('');
  };

  const closeAndReset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      reset();
      setLoading(false);
    }
  };

  const generate = async () => {
    if (prompt.trim().length < 10) {
      toast.error('Describe your business in a bit more detail (10+ chars).');
      return;
    }
    setLoading(true);
    try {
      const benefitsArr = benefits.split('\n').map((b) => b.trim()).filter(Boolean).slice(0, 8);
      const { data, error } = await supabase.functions.invoke('landing-theme-ai', {
        body: {
          mode: 'generate',
          prompt, audience, tone, businessType, theme,
          product: product.trim() || undefined,
          benefits: benefitsArr.length ? benefitsArr : undefined,
          offer: offer.trim() || undefined,
          cta: cta.trim() || undefined,
        },
      });
      if (error) throw error;
      const sections = data?.sections;
      if (!Array.isArray(sections) || sections.length === 0) {
        toast.error('AI did not return a valid page. Try a different prompt.');
        return;
      }
      setDraft(sections);
      setSummary(typeof data?.summary === 'string' ? data.summary : '');
      setStep('preview');
    } catch (err: any) {
      toast.error('AI generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const confirmReplace = () => {
    if (!draft) return;
    onGenerated(draft);
    toast.success(`Applied ${draft.length} AI-generated sections`);
    closeAndReset(false);
  };

  return (
    <Dialog open={open} onOpenChange={closeAndReset}>
      <DialogTrigger asChild>
        {variant === 'compact' ? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Wand2 className="h-3.5 w-3.5" /> AI page
          </Button>
        ) : (
          <Button className="gap-2">
            <Wand2 className="h-4 w-4" /> Generate page with AI
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={(step === 'preview' ? 'max-w-6xl' : 'max-w-2xl') + ' max-h-[90vh] overflow-y-auto'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === 'form' ? 'AI page generator' : 'Preview AI-generated page'}
          </DialogTitle>
          <DialogDescription>
            {step === 'form'
              ? 'Describe your business in plain English. AI will draft a complete landing page | sections, copy, motion, and backgrounds.'
              : 'Review the draft below. Nothing is applied to your live layout until you confirm.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Business brief</Label>
              <Textarea
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What you sell, who it's for, the main benefit, and what visitors should do next."
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="text-[11px] px-2 py-1 rounded-md border bg-muted/40 hover:bg-muted text-muted-foreground text-left"
                  >
                    {ex.slice(0, 60)}…
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Audience</Label>
                <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. ops directors" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['confident, friendly','playful, bold','authoritative, expert','warm, empathetic','luxury, minimal','urgent, direct'].map((t) =>
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Business type</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['service','saas','ecommerce','agency','legal','medical','real-estate','education','nonprofit','local'].map((t) =>
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border bg-muted/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Structured details <span className="text-[10px] font-normal normal-case">(optional, dramatically improves accuracy)</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Product or service</Label>
                  <Input
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    maxLength={140}
                    placeholder="e.g. Invisible aligners"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Primary CTA label</Label>
                  <Input
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    maxLength={40}
                    placeholder="e.g. Book free consult"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Offer / incentive</Label>
                <Input
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  maxLength={160}
                  placeholder="e.g. Free first scan + $500 off | 30-day guarantee"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Key benefits <span className="text-muted-foreground font-normal">(one per line, up to 8)</span></Label>
                <Textarea
                  rows={4}
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  maxLength={1000}
                  placeholder={'Invisible | no metal brackets\nSame-day fitting in under 60 minutes\nDoctor-supervised at every step'}
                />
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && draft && (
          <div className="grid gap-3" style={{ gridTemplateColumns: '220px minmax(0, 1fr)' }}>
            {/* Section list summary */}
            <div className="space-y-2">
              {hasExisting && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  Confirming will replace your current layout. Use Undo (⌘Z) to roll back.
                </div>
              )}
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {draft.length} sections
              </div>
              {summary && <p className="text-[11px] text-muted-foreground leading-snug">{summary}</p>}
              <ScrollArea className="h-[420px] pr-2">
                <ol className="space-y-1">
                  {draft.map((s, i) => (
                    <li key={s.id} className="flex items-center gap-2 text-xs p-1.5 rounded border bg-card">
                      <span className="text-muted-foreground tabular-nums w-5">{i + 1}.</span>
                      <span className="capitalize flex-1 truncate">{s.type.replace('_', ' ')}</span>
                      {s.animation && s.animation.entrance !== 'none' && (
                        <Badge variant="secondary" className="text-[9px] py-0 px-1">motion</Badge>
                      )}
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            </div>

            {/* Live preview */}
            <div className="border rounded-md overflow-hidden bg-background">
              <ScrollArea className="h-[520px]">
                <SectionRenderer
                  sections={draft}
                  theme={theme ?? FALLBACK_THEME}
                  formSlot={
                    <div className="text-center text-xs text-muted-foreground p-4 italic">
                      (Intake form appears here on the live page)
                    </div>
                  }
                />
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'form' ? (
            <>
              <Button variant="ghost" onClick={() => closeAndReset(false)} disabled={loading}>Cancel</Button>
              <Button onClick={generate} disabled={loading} className="gap-2">
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Drafting your page…</>
                  : <><Wand2 className="h-4 w-4" /> Generate preview</>}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={reset} disabled={loading} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to brief
              </Button>
              <Button variant="outline" onClick={generate} disabled={loading} className="gap-2">
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Regenerating…</>
                  : <><RefreshCcw className="h-4 w-4" /> Regenerate</>}
              </Button>
              <Button onClick={confirmReplace} disabled={loading} className="gap-2">
                <Check className="h-4 w-4" /> {hasExisting ? 'Replace my layout' : 'Use this page'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
