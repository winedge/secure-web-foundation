import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CurrentTheme {
  primary_color: string;
  background_color: string;
  accent_color: string;
  heading_text: string;
  description_text: string;
  typography?: any;
  layout_config?: any;
  hero_config?: any;
}

interface Props {
  current: CurrentTheme;
  onApply: (updates: Partial<CurrentTheme>) => void;
}

const PRESET_PROMPTS = [
  'Make it feel more premium and luxurious',
  'Make the colors more vibrant and energetic',
  'Use darker, more serious tones',
  'Make it more friendly and approachable',
  'Add more rounded corners and softer feel',
  'Make it look more like a SaaS product',
];

export function AiThemeTweaker({ current, onApply }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastExplanation, setLastExplanation] = useState<string | null>(null);

  const handleSubmit = async (instruction: string) => {
    if (!instruction.trim()) return;
    setLoading(true);
    setLastExplanation(null);
    try {
      const { data, error } = await supabase.functions.invoke('landing-theme-ai', {
        body: { instruction, current },
      });
      if (error) throw error;
      const updated = data?.updated ?? {};
      const { explanation, ...rest } = updated;
      if (Object.keys(rest).length === 0) {
        toast.error('AI did not suggest any changes. Try a more specific instruction.');
        return;
      }
      onApply(rest);
      setLastExplanation(explanation || 'Theme updated.');
      toast.success('AI applied changes! Click Save to persist.');
      setPrompt('');
    } catch (err: any) {
      toast.error('AI tweak failed: ' + (err.message ?? 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Theme Assistant
        </CardTitle>
        <CardDescription>
          Describe how you want your landing page to look and AI will adjust the theme for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Make it look like a modern dental clinic with calming blues and rounded buttons"
          rows={3}
          disabled={loading}
        />
        <div className="flex flex-wrap gap-2">
          {PRESET_PROMPTS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant="outline"
              onClick={() => handleSubmit(p)}
              disabled={loading}
              className="text-xs"
            >
              {p}
            </Button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => handleSubmit(prompt)} disabled={loading || !prompt.trim()}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Apply AI Changes
          </Button>
        </div>
        {lastExplanation && (
          <div className="text-sm bg-muted/50 border rounded-md p-3">
            <span className="font-medium text-primary">AI:</span> {lastExplanation}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
