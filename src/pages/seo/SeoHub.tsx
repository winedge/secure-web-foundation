import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ScanLine, KeyRound, Link2, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSeoScans, useStartSeoScan } from '@/hooks/use-seo-scans';
import { AI_SEO_TOOLS } from './ai/tool-configs';

const TOOLS = [
  { name: 'Deep Scan', href: '/seo/deep-scan', icon: ScanLine, desc: 'Full site audit with score + issue list.' },
  { name: 'Keyword Research', href: '/seo/keywords', icon: KeyRound, desc: 'AI-powered keyword discovery and intent grouping.' },
  { name: 'Backlink Audit', href: '/seo/backlinks', icon: Link2, desc: 'Quality, toxicity, and opportunity analysis.' },
  { name: 'Local Citations', href: '/seo/citations', icon: ListChecks, desc: 'Check NAP consistency across directories.' },
];

export default function SeoHub() {
  const { data: scans = [] } = useSeoScans();
  const start = useStartSeoScan();
  const nav = useNavigate();
  const [url, setUrl] = useState('');

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <header>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Search className="h-7 w-7 text-primary" /> SEO Suite
          </h1>
          <p className="text-muted-foreground mt-1">
            Scan, optimize, and monitor your site | technical SEO, on-page issues, and ranking signals.
          </p>
        </header>

        <Card>
          <CardHeader><CardTitle>Quick Deep Scan</CardTitle><CardDescription>Enter a URL to run a full audit.</CardDescription></CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
            <Button
              disabled={!url || start.isPending}
              onClick={async () => {
                const r = await start.mutateAsync(url);
                nav(`/seo/deep-scan/${r.scan_id}`);
              }}
            >
              {start.isPending ? 'Starting…' : 'Run Scan'}
            </Button>
          </CardContent>
        </Card>

        <section>
          <h2 className="text-xl font-semibold mb-3">Tools</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <Link key={t.href} to={t.href}>
                <Card className="hover:border-primary/50 transition-colors h-full">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><t.icon className="h-5 w-5 text-primary" />{t.name}</CardTitle>
                    <CardDescription>{t.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">AI Search & GEO Tools</h2>
            <Badge variant="secondary">NEW</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Optimize for ChatGPT, Perplexity, Gemini, Claude, and Google AI Overviews | the next era of search.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AI_SEO_TOOLS.map((t) => (
              <Link key={t.slug} to={`/seo/ai/${t.slug}`}>
                <Card className="hover:border-primary/50 transition-colors h-full">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <t.icon className="h-5 w-5 text-primary" />{t.title}
                    </CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Recent Scans</h2>
          {scans.length === 0 ? (
            <p className="text-muted-foreground text-sm">No scans yet.</p>
          ) : (
            <div className="space-y-2">
              {scans.map((s) => (
                <Link key={s.id} to={`/seo/deep-scan/${s.id}`}>
                  <Card className="hover:bg-muted/40 transition">
                    <CardContent className="py-3 flex items-center justify-between flex-wrap gap-2">
                      <div className="font-mono text-sm truncate">{s.url}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant={s.status === 'completed' ? 'default' : s.status === 'failed' ? 'destructive' : 'secondary'}>{s.status}</Badge>
                        {s.overall_score !== null && <Badge variant="outline">Score {s.overall_score}</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
