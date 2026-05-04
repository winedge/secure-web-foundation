import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanLine } from 'lucide-react';
import { useStartSeoScan } from '@/hooks/use-seo-scans';

export default function SeoDeepScan() {
  const start = useStartSeoScan();
  const nav = useNavigate();
  const [url, setUrl] = useState('');

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <header>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ScanLine className="h-7 w-7 text-primary" /> SEO Deep Scan
          </h1>
          <p className="text-muted-foreground mt-1">
            Full technical and on-page audit | meta tags, headings, images, mobile, accessibility, and more.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>New scan</CardTitle>
            <CardDescription>Enter the full URL including https://. Scans typically take 30-60 seconds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
            <Button
              className="w-full"
              disabled={!url || start.isPending}
              onClick={async () => {
                const r = await start.mutateAsync(url);
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
