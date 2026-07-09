/**
 * ScrapeHealthCard - shows recent scrape job health, product counts, price
 * changes, and the latest AI insight summary for a given watchlist.
 * Drop into EcomMarketOverview (or anywhere with a watchlist id).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useScrapeJobs } from '@/hooks/use-scrape-jobs';
import { useScrapeInsights } from '@/hooks/use-scrape-insights';

interface Props { watchlistId: string }

export function ScrapeHealthCard({ watchlistId }: Props) {
  const { data: jobs = [], isLoading } = useScrapeJobs(watchlistId, 10);
  const { data: insights = [] } = useScrapeInsights(watchlistId);

  const latest = jobs[0];
  const succeeded = jobs.filter((j) => j.status === 'succeeded').length;
  const health = jobs.length === 0
    ? 'unknown'
    : succeeded / jobs.length >= 0.8 ? 'healthy'
    : succeeded / jobs.length >= 0.4 ? 'degraded'
    : 'failing';

  const healthColor = {
    healthy: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    degraded: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    failing: 'bg-red-500/10 text-red-600 border-red-500/30',
    unknown: 'bg-muted text-muted-foreground',
  }[health];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Activity className="h-4 w-4" /> Scraper Health</span>
          <Badge variant="outline" className={healthColor}>{health}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading|</p>
        ) : !latest ? (
          <p className="text-sm text-muted-foreground">No scrape jobs yet. The scheduler will pick this up on the next tick.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Found" value={latest.products_found ?? '|'} />
              <Metric icon={<TrendingUp className="h-4 w-4" />} label="New" value={latest.products_new ?? 0} />
              <Metric icon={<AlertTriangle className="h-4 w-4" />} label="Removed" value={latest.products_removed ?? 0} />
              <Metric icon={<TrendingUp className="h-4 w-4" />} label="Price changes" value={latest.price_changes_count ?? 0} />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {latest.finished_at
                ? <>Last scan {formatDistanceToNow(new Date(latest.finished_at), { addSuffix: true })}</>
                : <>Job {latest.status}|</>}
              {latest.duration_ms ? <span>| {(latest.duration_ms / 1000).toFixed(1)}s</span> : null}
              {latest.error_class ? <Badge variant="destructive" className="text-[10px]">{latest.error_class}</Badge> : null}
            </div>

            {insights[0]?.summary ? (
              <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">AI insight</div>
                {insights[0].summary}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border/60 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}
