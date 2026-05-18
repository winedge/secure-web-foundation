import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wand2, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Section, SectionTheme } from '@/lib/landing-sections/types';

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

export function AiPageGenerator({ hasExisting, theme, onGenerated, variant = 'default' }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('confident, friendly');
  const [businessType, setBusinessType] = useState('service');

  const submit = async () => {
    if (prompt.trim().length < 10) {
      toast.error('Describe your business in a bit more detail (10+ chars).');
      return;
    }
    if (hasExisting && !confirm('This will replace your current sections. Continue?')) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('landing-theme-ai', {
        body: { mode: 'generate', prompt, audience, tone, businessType, theme },
      });
      if (error) throw error;
      const sections = data?.sections;
      if (!Array.isArray(sections) || sections.length === 0) {
        toast.error('AI did not return a valid page. Try a different prompt.');
        return;
      }
      onGenerated(sections);
      toast.success(`Generated ${sections.length} sections${data?.summary ? ` | ${data.summary}` : ''}`);
      setOpen(false);
      setPrompt('');
    } catch (err: any) {
      toast.error('AI generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI page generator
          </DialogTitle>
          <DialogDescription>
            Describe your business in plain English. AI will write a complete landing page | sections,
            copy, motion, and backgrounds | matched to your theme.
          </DialogDescription>
        </DialogHeader>

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

          {hasExisting && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Heads up | this replaces your current sections. Use Undo (⌘Z) afterwards if you change your mind.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Drafting your page…</> : <><Wand2 className="h-4 w-4" /> Generate</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
