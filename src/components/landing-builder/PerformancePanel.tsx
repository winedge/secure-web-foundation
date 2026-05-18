import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Activity, AlertTriangle, Gauge, ImageIcon, Layers, Sparkles, Zap, Info, MousePointerClick, Move, Timer, Wand2 } from 'lucide-react';
import type { Section } from '@/lib/landing-sections/types';
import { analyzeSections, autoFixSections, PERF_BUDGETS, type AutoFixSummary } from '@/lib/landing-builder/performance';
import { useFpsMonitor } from '@/hooks/use-fps-monitor';
import { useWebVitals, formatVital, ratingTone, ratingLabel, type WebVitals, type WebVitalValue } from '@/hooks/use-web-vitals';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  sections: Section[];
  onJumpTo?: (sectionId: string) => void;
  onChange?: (next: Section[]) => void;
}

export function PerformancePanel({ sections, onJumpTo, onChange }: Props) {
  const [liveFps, setLiveFps] = useState(true);
  const fps = useFpsMonitor(liveFps);
  const vitals = useWebVitals(true);
  const analysis = useMemo(() => analyzeSections(sections), [sections]);
  const preview = useMemo(() => autoFixSections(sections).summary, [sections]);
  const canAutoFix = !!onChange && (
    preview.removedParallax + preview.reducedBlur + preview.disabledRepeat +
    preview.downgradedEntrance + preview.downgradedBackground + preview.mutedVideos
  ) > 0;

  const runAutoFix = () => {
    if (!onChange) return;
    const { sections: next, summary } = autoFixSections(sections);
    onChange(next);
    const parts: string[] = [];
    if (summary.removedParallax) parts.push(`parallax off (${summary.removedParallax})`);
    if (summary.reducedBlur) parts.push(`blur/mesh reduced (${summary.reducedBlur})`);
    if (summary.disabledRepeat) parts.push(`repeat off (${summary.disabledRepeat})`);
    if (summary.downgradedEntrance) parts.push(`entrance softened (${summary.downgradedEntrance})`);
    if (summary.downgradedBackground) parts.push(`backgrounds simplified (${summary.downgradedBackground})`);
    if (summary.mutedVideos) parts.push(`extra videos muted (${summary.mutedVideos})`);
    toast.success(`Auto-fixed ${summary.changedSections} section${summary.changedSections === 1 ? '' : 's'}`, {
      description: parts.length ? parts.join(' | ') : 'No changes needed.',
    });
  };


  const grade =
    analysis.totalScore < 30 ? { label: 'Excellent', tone: 'bg-emerald-500' } :
    analysis.totalScore < 55 ? { label: 'Good', tone: 'bg-primary' } :
    analysis.totalScore < 75 ? { label: 'Needs care', tone: 'bg-amber-500' } :
                               { label: 'Heavy', tone: 'bg-destructive' };

  const fpsTone =
    fps.fps >= 55 ? 'text-emerald-500' :
    fps.fps >= 40 ? 'text-amber-500' : 'text-destructive';

  return (
    <div className="space-y-4">
      {/* Auto-fix bar */}
      {onChange && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-start gap-2 text-xs">
            <Wand2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Auto-fix performance</div>
              <div className="text-muted-foreground">
                {canAutoFix
                  ? 'Disables parallax/repeat, caps blur, and softens entrances on sections over budget.'
                  : 'Nothing to fix | all sections are within the motion & rendering budget.'}
              </div>
            </div>
          </div>
          <Button size="sm" onClick={runAutoFix} disabled={!canAutoFix} className="shrink-0">
            <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Auto-fix
          </Button>
        </div>
      )}

      {/* Top: live FPS + total score */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Activity className="h-3.5 w-3.5 text-primary" /> Live FPS
            </div>
            <div className="flex items-center gap-1.5">
              <Switch id="live-fps" checked={liveFps} onCheckedChange={setLiveFps} />
              <Label htmlFor="live-fps" className="text-[10px] text-muted-foreground">Sampling</Label>
            </div>
          </div>
          <div className={cn('text-3xl font-bold tabular-nums', fpsTone)}>{liveFps ? fps.fps : '—'}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Min {fps.minFps} | dropped {fps.droppedFrames} | long tasks {fps.longTasks}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            <Gauge className="h-3.5 w-3.5 text-primary" /> Cost score
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold">{analysis.totalScore}</div>
            <Badge className={cn('text-white', grade.tone)}>{grade.label}</Badge>
          </div>
          <Progress value={analysis.totalScore} className="mt-2 h-2" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            <ImageIcon className="h-3.5 w-3.5 text-primary" /> Page payload
          </div>
          <div className="text-3xl font-bold tabular-nums">
            {(analysis.estimatedBytes / 1024).toFixed(1)}<span className="text-base text-muted-foreground"> KB</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Budget {(PERF_BUDGETS.bytes / 1024).toFixed(0)} KB | excludes uploaded media
          </div>
        </Card>
      </div>

      {/* Core Web Vitals */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Core Web Vitals (live preview)
          </div>
          <span className="text-[10px] text-muted-foreground">Updates as you interact</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <VitalTile k="LCP" label="Largest Contentful Paint" icon={<ImageIcon className="h-3.5 w-3.5" />} v={vitals.LCP} />
          <VitalTile k="CLS" label="Cumulative Layout Shift" icon={<Move className="h-3.5 w-3.5" />} v={vitals.CLS} />
          <VitalTile k="INP" label="Interaction to Next Paint" icon={<MousePointerClick className="h-3.5 w-3.5" />} v={vitals.INP} />
          <VitalTile k="FCP" label="First Contentful Paint" icon={<Sparkles className="h-3.5 w-3.5" />} v={vitals.FCP} />
          <VitalTile k="TTFB" label="Time to First Byte" icon={<Timer className="h-3.5 w-3.5" />} v={vitals.TTFB} />
        </div>
      </Card>

      {/* Budgets */}
      <Card className="p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Motion & rendering budget
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BudgetBar icon={<Sparkles className="h-3.5 w-3.5" />} label="Animated sections" value={analysis.motionLoad} budget={PERF_BUDGETS.motionLoad} />
          <BudgetBar icon={<Layers className="h-3.5 w-3.5" />} label="Mesh / glass backgrounds" value={analysis.heavyBackgrounds} budget={PERF_BUDGETS.heavyBackgrounds} />
          <BudgetBar icon={<Zap className="h-3.5 w-3.5" />} label="Parallax sections" value={analysis.parallaxCount} budget={PERF_BUDGETS.parallaxCount} />
          <BudgetBar icon={<Activity className="h-3.5 w-3.5" />} label="Auto-playing videos" value={analysis.videoCount} budget={PERF_BUDGETS.videoCount} />
        </div>
      </Card>

      {/* Issues */}
      <Card className="p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Findings
        </div>
        <div className="space-y-2">
          {analysis.issues.map((issue, i) => {
            const Icon = issue.level === 'critical' ? AlertTriangle : issue.level === 'warning' ? AlertTriangle : Info;
            const tone =
              issue.level === 'critical' ? 'text-destructive border-destructive/30 bg-destructive/5' :
              issue.level === 'warning' ? 'text-amber-600 border-amber-500/30 bg-amber-500/5' :
                                          'text-muted-foreground border-border bg-muted/30';
            return (
              <div key={i} className={cn('flex items-start gap-2 rounded-md border p-2 text-xs', tone)}>
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="flex-1">{issue.message}</div>
                {issue.sectionId && onJumpTo && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => onJumpTo(issue.sectionId!)}>
                    Open
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Per-section scores */}
      <Card className="p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Per-section cost
        </div>
        <div className="space-y-1.5">
          {analysis.sectionScores.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No visible sections to analyze.</p>
          )}
          {analysis.sectionScores.map((s) => {
            const tone =
              s.score >= 60 ? 'bg-destructive' :
              s.score >= 40 ? 'bg-amber-500' :
              s.score >= 20 ? 'bg-primary' : 'bg-emerald-500';
            return (
              <button
                key={s.id}
                onClick={() => onJumpTo?.(s.id)}
                className="w-full flex items-center gap-3 text-xs px-2 py-1.5 rounded hover:bg-muted/50 text-left"
              >
                <div className="w-28 truncate capitalize">{s.type.replace('_', ' ')}</div>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={cn('h-full transition-all', tone)} style={{ width: `${s.score}%` }} />
                </div>
                <div className="w-10 text-right tabular-nums text-muted-foreground">{s.score}</div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function BudgetBar({ icon, label, value, budget }: { icon: React.ReactNode; label: string; value: number; budget: number }) {
  const pct = Math.min(100, (value / Math.max(1, budget)) * 100);
  const over = value > budget;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="flex items-center gap-1 text-muted-foreground">{icon} {label}</span>
        <span className={cn('tabular-nums font-medium', over && 'text-destructive')}>
          {value} / {budget}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full transition-all', over ? 'bg-destructive' : 'bg-primary')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function VitalTile({ k, label, icon, v }: { k: keyof WebVitals; label: string; icon: React.ReactNode; v: WebVitalValue }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
        <span className="flex items-center gap-1">{icon} {k}</span>
        <span className={cn('font-medium', ratingTone(v.rating))}>{ratingLabel(v.rating)}</span>
      </div>
      <div className={cn('text-xl font-bold tabular-nums', ratingTone(v.rating))}>{formatVital(k, v)}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{label}</div>
    </div>
  );
}
