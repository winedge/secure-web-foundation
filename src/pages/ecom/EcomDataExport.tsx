/**
 * EcomDataExport - export all e-commerce intelligence data as CSV files
 * for the client's records, BI tooling, or audit purposes.
 */
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type DatasetKey =
  | 'watchlist'
  | 'snapshots'
  | 'price_history'
  | 'alerts'
  | 'mentions'
  | 'top_entities'
  | 'trend_signals'
  | 'creators'
  | 'recommendations'
  | 'briefs';

const DATASETS: Array<{ key: DatasetKey; table: string; label: string; desc: string }> = [
  { key: 'watchlist', table: 'ecom_watchlist', label: 'Watchlist', desc: 'All tracked products, shops, brands and keywords.' },
  { key: 'snapshots', table: 'ecom_snapshots', label: 'Daily snapshots', desc: 'Per-day KPIs (price, stock, units sold, rating).' },
  { key: 'price_history', table: 'ecom_price_history', label: 'Price history', desc: 'Granular price/promo/stock timeline.' },
  { key: 'alerts', table: 'ecom_alerts', label: 'Alerts', desc: 'Price drops, stockouts, review spikes, breakouts.' },
  { key: 'mentions', table: 'ecom_mentions', label: 'Mentions & reviews', desc: 'Listening + review feed with sentiment and topics.' },
  { key: 'top_entities', table: 'ecom_top_entities', label: 'Top rankings', desc: 'Leaderboards of brands/shops/products per category.' },
  { key: 'trend_signals', table: 'ecom_trend_signals', label: 'Trend signals', desc: 'Breakout candidates with velocity scores.' },
  { key: 'creators', table: 'ecom_creators', label: 'Creators', desc: 'TikTok Shop creators with engagement and GMV proxy.' },
  { key: 'recommendations', table: 'ecom_ai_recommendations', label: 'AI recommendations', desc: 'Every AI insight with evidence references.' },
  { key: 'briefs', table: 'ecom_briefs', label: 'Weekly briefs', desc: 'Generated executive summaries.' },
];

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = Array.from(
    rows.reduce<Set<string>>((s, r) => {
      Object.keys(r).forEach((k) => s.add(k));
      return s;
    }, new Set()),
  );
  const escape = (v: any): string => {
    if (v == null) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function EcomDataExport() {
  const firm = useFirm().data;
  const [busy, setBusy] = useState<DatasetKey | 'all' | null>(null);
  const [counts, setCounts] = useState<Partial<Record<DatasetKey, number>>>({});

  async function fetchTable(table: string): Promise<Record<string, any>[]> {
    if (!firm?.id) return [];
    const { data, error } = await supabase
      .from(table as any)
      .select('*')
      .eq('firm_id', firm.id)
      .order('created_at' as any, { ascending: false })
      .limit(50000);
    if (error) throw error;
    return (data as any[]) ?? [];
  }

  async function exportOne(d: typeof DATASETS[number]) {
    try {
      setBusy(d.key);
      const rows = await fetchTable(d.table);
      setCounts((c) => ({ ...c, [d.key]: rows.length }));
      if (rows.length === 0) { toast({ title: `${d.label}: no rows to export` }); return; }
      const stamp = format(new Date(), 'yyyy-MM-dd');
      downloadFile(`${d.table}-${stamp}.csv`, toCsv(rows));
      toast({ title: `Exported ${rows.length} rows`, description: d.label });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  }

  async function exportAll() {
    try {
      setBusy('all');
      const stamp = format(new Date(), 'yyyy-MM-dd');
      const nextCounts: Partial<Record<DatasetKey, number>> = {};
      for (const d of DATASETS) {
        const rows = await fetchTable(d.table);
        nextCounts[d.key] = rows.length;
        if (rows.length > 0) downloadFile(`${d.table}-${stamp}.csv`, toCsv(rows));
      }
      setCounts(nextCounts);
      toast({ title: 'Full export complete' });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-7 w-7 text-primary" />
              Data Export
            </h1>
            <p className="text-muted-foreground mt-1">
              Download every dataset your firm has captured | CSV format, ready for Excel, Looker, or BigQuery.
            </p>
          </div>
          <Button onClick={exportAll} disabled={busy !== null}>
            <Download className="h-4 w-4 mr-2" />
            {busy === 'all' ? 'Exporting...' : 'Export everything'}
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {DATASETS.map((d) => (
            <Card key={d.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span>{d.label}</span>
                  {counts[d.key] != null && (
                    <Badge variant="outline">{counts[d.key]!.toLocaleString()} rows</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{d.desc}</p>
                <Button size="sm" variant="outline" onClick={() => exportOne(d)} disabled={busy !== null}>
                  <Download className="h-4 w-4 mr-2" />
                  {busy === d.key ? 'Exporting...' : 'Download CSV'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
