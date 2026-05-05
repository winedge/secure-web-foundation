import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScanLine, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useStartSeoScan } from '@/hooks/use-seo-scans';

export default function SeoDeepScan() {
  const start = useStartSeoScan();
  const nav = useNavigate();
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState('5');

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" /> SEO Deep Scan | 2026
            </h1>
            <p className="text-muted-foreground mt-1">
              Multi-page technical + AEO audit: meta, schema, robots/sitemap/llms.txt, security headers, E-E-A-T, AI Overviews readiness.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/seo/thresholds"><SlidersHorizontal className="h-4 w-4 mr-1" /> Thresholds</Link>
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>New scan</CardTitle>
            <CardDescription>Enter the full URL including https://. Multi-page scans take 1-3 minutes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>URL</Label>
              <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div>
              <Label>Pages to crawl</Label>
              <Select value={maxPages} onValueChange={setMaxPages}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['1', '3', '5', '10', '15'].map((n) => <SelectItem key={n} value={n}>{n} page{n === '1' ? '' : 's'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!url || start.isPending}
              onClick={async () => {
                const r = await start.mutateAsync({ url, max_pages: Number(maxPages) });
                nav(`/seo/deep-scan/${r.scan_id}`);
              }}
            >
              {start.isPending ? 'Starting…' : 'Run Deep Scan'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
