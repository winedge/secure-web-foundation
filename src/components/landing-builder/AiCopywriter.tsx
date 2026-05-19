import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sparkles, Loader2, ChevronDown, RotateCcw, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Section, SectionTheme } from '@/lib/landing-sections/types';

interface Props {
  section: Section;
  theme: SectionTheme;
  brandName?: string;
  brandDescription?: string;
  onChange: (nextProps: Record<string, any>) => void;
}

const COPY_KEYS = [
  'eyebrow', 'headline', 'heading', 'subheading', 'subheadline',
  'description', 'body', 'announcement', 'message', 'label',
  'ctaLabel', 'secondaryCta', 'secondaryCtaLabel',
];

/**
 * Per-section AI Copywriter.
 *
 * Detects which copy fields the section actually uses and exposes Generate
 * and Refine actions. Tone, length and goal controls let the writer match
 * brand voice. Includes one-step Undo so the user can compare versions.
 */
export function AiCopywriter({ section, theme, brandName, brandDescription, onChange }: Props) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState<'generate' | 'refine' | null>(null);
  const [tone, setTone] = useState('confident');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [goal, setGoal] = useState('Drive sign-ups');
  const [instruction, setInstruction] = useState('');
  const [previous, setPrevious] = useState<Record<string, any> | null>(null);

  const presentKeys = COPY_KEYS.filter((k) => k in (section.props || {}));
  const hasCtaObj = !!(section.props?.cta && typeof section.props.cta === 'object' && 'label' in section.props.cta);

  const editable = presentKeys.length > 0 || hasCtaObj;

  const run = async (action: 'generate' | 'refine') => {
    if (!editable) {
      toast.error('This section has no copy fields to rewrite');
      return;
    }
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke('landing-theme-ai', {
        body: {
          mode: 'copy',
          action,
          tone,
          length,
          goal,
          instruction: instruction.trim() || undefined,
          brand: {
            name: brandName,
            description: brandDescription,
            primary_color: theme.primary,
            accent_color: theme.accent,
          },
          section: { type: section.type, props: section.props },
        },
      });
      if (error) throw error;
      if (!data?.props) throw new Error('No copy returned');
      setPrevious(section.props);
      onChange(data.props);
      toast.success(action === 'refine' ? 'Copy refined' : 'New copy generated');
    } catch (e: any) {
      const msg = e?.message || 'Failed to generate copy';
      if (msg.includes('429')) toast.error('Rate limited | try again in a moment');
      else if (msg.includes('402')) toast.error('AI credits exhausted | add credits in Settings');
      else toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const undo = () => {
    if (!previous) return;
    onChange(previous);
    setPrevious(null);
    toast.message('Reverted to previous copy');
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border bg-gradient-to-br from-primary/[0.04] to-transparent">
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-3 py-2 text-left">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider">AI Copywriter</span>
            {editable && (
              <span className="text-[10px] text-muted-foreground">
                {presentKeys.length + (hasCtaObj ? 1 : 0)} field{(presentKeys.length + (hasCtaObj ? 1 : 0)) === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-3">
        {!editable ? (
          <p className="text-xs text-muted-foreground italic">
            This section type has no headline, description, or CTA fields to rewrite.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confident">Confident</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                    <SelectItem value="empathetic">Empathetic</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                    <SelectItem value="authoritative">Authoritative</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Length</Label>
                <Select value={length} onValueChange={(v: any) => setLength(v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Goal</Label>
              <Input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Book a free consultation"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Custom instruction (optional)</Label>
              <Input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. emphasize the 30-day guarantee"
                className="h-8 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => run('generate')}
                disabled={!!busy}
                className="h-8 text-xs flex-1 min-w-[110px]"
              >
                {busy === 'generate' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                Generate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => run('refine')}
                disabled={!!busy}
                className="h-8 text-xs flex-1 min-w-[110px]"
              >
                {busy === 'refine' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Refine
              </Button>
              {previous && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={undo}
                  disabled={!!busy}
                  className="h-8 text-xs"
                  title="Revert to previous copy"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Generate writes fresh copy from scratch. Refine improves what's already there. Edits apply only to fields this section actually uses.
            </p>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
