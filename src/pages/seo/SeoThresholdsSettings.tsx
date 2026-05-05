import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SlidersHorizontal } from 'lucide-react';
import { DEFAULT_THRESHOLDS, useSaveSeoThresholds, useSeoThresholds } from '@/hooks/use-seo-thresholds';

export default function SeoThresholdsSettings() {
  const { data, isLoading } = useSeoThresholds();
  const save = useSaveSeoThresholds();
  const [form, setForm] = useState(DEFAULT_THRESHOLDS);

  useEffect(() => {
    if (data) {
      setForm({
        title_min: data.title_min,
        title_max: data.title_max,
        description_min: data.description_min,
        description_max: data.description_max,
        word_count_min: data.word_count_min,
        h1_max: data.h1_max,
      });
    }
  }, [data]);

  const num = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: Math.max(0, parseInt(e.target.value || '0', 10)) });

  const fields: Array<{ key: keyof typeof form; label: string; hint: string }> = [
    { key: 'title_min', label: 'Title min length', hint: 'Characters' },
    { key: 'title_max', label: 'Title max length', hint: 'Characters' },
    { key: 'description_min', label: 'Meta description min', hint: 'Characters' },
    { key: 'description_max', label: 'Meta description max', hint: 'Characters' },
    { key: 'word_count_min', label: 'Min word count', hint: 'Words per page' },
    { key: 'h1_max', label: 'Max H1 tags', hint: 'Per page' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <header>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="h-7 w-7 text-primary" /> SEO Thresholds
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure the rules the deep scan uses to flag issues on your site.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Scan thresholds</CardTitle>
            <CardDescription>Applied to every new SEO deep scan for your firm.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    type="number"
                    min={0}
                    value={form[f.key]}
                    onChange={num(f.key)}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">{f.hint}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save thresholds'}
              </Button>
              <Button variant="outline" onClick={() => setForm(DEFAULT_THRESHOLDS)} disabled={save.isPending}>
                Reset to defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
