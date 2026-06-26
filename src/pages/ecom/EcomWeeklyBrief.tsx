/**
 * EcomWeeklyBrief - executive-style weekly brief generated from real evidence
 * (snapshots, alerts, mentions, trends, price history) of the past 7 days.
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Sparkles, TrendingUp, AlertTriangle, Target, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useEcomWeeklyBrief, type EcomBrief } from '@/hooks/use-ecom-phase6';
import { format } from 'date-fns';

const PRIORITY_COLOR: Record<string, string> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
};

export default function EcomWeeklyBrief() {
  const { list, generate } = useEcomWeeklyBrief();
  const latest: EcomBrief | undefined = list.data?.[0];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              Weekly Brief
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-generated executive summary of the past 7 days | grounded in real evidence from your watchlist data.
            </p>
          </div>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            <Sparkles className="h-4 w-4 mr-2" />
            {generate.isPending ? 'Generating...' : 'Generate new brief'}
          </Button>
        </div>

        {!latest && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No briefs yet. Generate your first weekly brief once you have at least a week of scraped data.
            </CardContent>
          </Card>
        )}

        {latest && <BriefCard brief={latest} primary />}

        {(list.data?.length ?? 0) > 1 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Previous briefs</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {list.data!.slice(1).map((b) => (
                <div key={b.id} className="border rounded-md px-3 py-2 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{b.summary?.headline ?? 'Weekly brief'}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(b.period_start), 'MMM d')} - {format(new Date(b.period_end), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(b.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function BriefCard({ brief, primary }: { brief: EcomBrief; primary?: boolean }) {
  const s = brief.summary ?? {};
  return (
    <Card className={primary ? 'border-primary/40 shadow-md' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-xl">{s.headline || 'Weekly Brief'}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(brief.period_start), 'MMM d')} - {format(new Date(brief.period_end), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {s.tldr && (
          <div className="bg-muted/40 border-l-4 border-primary p-3 rounded">
            <div className="text-xs font-semibold text-muted-foreground mb-1">TL;DR</div>
            <p className="text-sm">{s.tldr}</p>
          </div>
        )}

        {s.metrics && (
          <div className="grid sm:grid-cols-3 gap-3">
            {Object.entries(s.metrics).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="border rounded-md p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.replace(/_/g, ' ')}</div>
                <div className="text-sm font-medium mt-1">{v}</div>
              </div>
            ))}
          </div>
        )}

        <Section title="Wins" icon={CheckCircle2} color="text-emerald-500" items={s.wins} />
        <Section title="Risks" icon={AlertTriangle} color="text-rose-500" items={s.risks} />
        <Section title="Movers" icon={TrendingUp} color="text-blue-500" items={(s.movers ?? []).map((m) => ({
          title: m.name, detail: m.change, evidence_ids: m.evidence_ids,
        }))} />

        {(s.actions?.length ?? 0) > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Recommended actions</span>
            </div>
            <div className="space-y-2">
              {s.actions!.map((a, i) => (
                <div key={i} className="border rounded-md p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                      {a.title}
                    </div>
                    <Badge variant={PRIORITY_COLOR[a.priority] as any}>{a.priority}</Badge>
                  </div>
                  {a.detail && <p className="text-xs text-muted-foreground mt-1">{a.detail}</p>}
                  <div className="text-[10px] text-muted-foreground mt-2">
                    Evidence: {a.evidence_ids.length} row{a.evidence_ids.length === 1 ? '' : 's'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  title, icon: Icon, color, items,
}: {
  title: string; icon: any; color: string;
  items?: Array<{ title: string; detail?: string; evidence_ids: string[] }>;
}) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="border rounded-md p-3">
            <div className="font-medium text-sm">{it.title}</div>
            {it.detail && <p className="text-xs text-muted-foreground mt-1">{it.detail}</p>}
            <div className="text-[10px] text-muted-foreground mt-2">
              Evidence: {it.evidence_ids.length} row{it.evidence_ids.length === 1 ? '' : 's'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
