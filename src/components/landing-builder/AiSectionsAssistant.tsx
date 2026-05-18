import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Section } from '@/lib/landing-sections/types';

interface Props {
  sections: Section[];
  onReplace: (next: Section[]) => void;
}

const SUGGESTIONS = [
  'Add a 3-step "How it works" section after the hero',
  'Rewrite the testimonials in a more confident tone',
  'Make the hero headline shorter and punchier',
  'Add an FAQ section answering common pricing questions',
];

export function AiSectionsAssistant({ sections, onReplace }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('landing-theme-ai', {
        body: { mode: 'sections', prompt, sections },
      });
      if (error) throw error;
      if (data?.sections && Array.isArray(data.sections)) {
        onReplace(data.sections);
        toast.success('Sections updated by AI');
        setPrompt('');
      } else {
        toast.error('AI did not return valid sections');
      }
    } catch (err: any) {
      toast.error('AI request failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI section assistant
        </CardTitle>
        <CardDescription>Describe a change in plain English | AI will rewrite or reorganize sections for you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={3}
          placeholder="e.g. add a pricing table with 3 tiers, then a strong CTA"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <Button key={s} type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPrompt(s)}>
              {s}
            </Button>
          ))}
        </div>
        <Button onClick={submit} disabled={loading || !prompt.trim()} className="w-full">
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Working...</> : <><Sparkles className="h-4 w-4 mr-2" /> Apply with AI</>}
        </Button>
      </CardContent>
    </Card>
  );
}
