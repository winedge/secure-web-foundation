import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, ArrowLeft, ShieldCheck, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getToolBySlug } from './tool-configs';

function ResultViewer({ data }: { data: any }) {
  if (!data) return null;

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('Copied JSON to clipboard');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">AI Analysis Result</CardTitle>
          <Button variant="outline" size="sm" onClick={copyJson}>
            <Copy className="h-4 w-4 mr-2" /> Copy JSON
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(data).map(([key, value]) => (
            <Section key={key} title={key} value={value} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, value }: { title: string; value: any }) {
  const label = title.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  if (value === null || value === undefined) return null;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return (
      <div className="border-l-2 border-primary/40 pl-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm">{String(value)}</div>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div>
        <div className="text-sm font-semibold mb-2">{label} <Badge variant="secondary">{value.length}</Badge></div>
        <div className="space-y-2">
          {value.slice(0, 30).map((item, i) => (
            <div key={i} className="rounded-md border bg-muted/30 p-2 text-sm">
              {typeof item === 'string' || typeof item === 'number' ? (
                <span>{String(item)}</span>
              ) : (
                <div className="grid gap-1">
                  {Object.entries(item || {}).map(([k, v]) => (
                    <div key={k} className="flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">{k.replace(/_/g, ' ')}:</span>
                      <span className="text-xs">
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {value.length > 30 && (
            <div className="text-xs text-muted-foreground">… {value.length - 30} more</div>
          )}
        </div>
      </div>
    );
  }

  // object
  return (
    <div>
      <div className="text-sm font-semibold mb-2">{label}</div>
      <div className="rounded-md border bg-muted/30 p-3 space-y-1">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            {typeof v === 'object' && v !== null ? (
              <details className="text-sm">
                <summary className="cursor-pointer text-xs text-muted-foreground">{k.replace(/_/g, ' ')}</summary>
                <pre className="text-xs mt-1 overflow-auto max-h-60">{JSON.stringify(v, null, 2)}</pre>
              </details>
            ) : (
              <div className="flex gap-2 text-sm">
                <span className="text-xs text-muted-foreground">{k.replace(/_/g, ' ')}:</span>
                <span className="text-xs">{String(v)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AiSeoToolPage() {
  const { slug = '' } = useParams();
  const tool = useMemo(() => getToolBySlug(slug), [slug]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!tool) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-12 text-center">
          <p className="text-muted-foreground">Unknown AI SEO tool.</p>
          <Link to="/seo"><Button variant="link">Back to SEO Suite</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  const Icon = tool.icon;

  async function run() {
    if (!tool) return;
    const missing = tool.fields.filter((f) => f.required && !form[f.key]?.trim());
    if (missing.length) {
      toast.error(`Please fill: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-seo-tool', {
        body: { tool: tool.key, input: form },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult((data as any).result);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link to="/seo" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to SEO Suite
          </Link>
        </div>
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Icon className="h-7 w-7 text-primary" /> {tool.title}
            </h1>
            <p className="text-muted-foreground mt-1">{tool.description}</p>
          </div>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> ABA 512 / GDPR / EU AI Act
          </Badge>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inputs</CardTitle>
            <CardDescription>AI-generated, real-time analysis powered by Lovable AI.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {tool.fields.map((f) => (
              <div key={f.key} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
                <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                {f.type === 'textarea' ? (
                  <Textarea
                    rows={4}
                    placeholder={f.placeholder}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                ) : (
                  <Input
                    type={f.type === 'url' ? 'url' : 'text'}
                    placeholder={f.placeholder}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                )}
                {f.helper && <p className="text-xs text-muted-foreground mt-1">{f.helper}</p>}
              </div>
            ))}
            <div className="md:col-span-2">
              <Button onClick={run} disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running AI analysis…</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Run Analysis</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <ResultViewer data={result} />
      </div>
    </DashboardLayout>
  );
}
