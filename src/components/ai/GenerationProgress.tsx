import { CheckCircle2, Loader2, XCircle, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { FrameProgress } from '@/hooks/use-frame-stream';

interface Props {
  totalScenes: number;
  generatedCount: number;
  failedCount: number;
  progress: FrameProgress[];
  isStreaming: boolean;
  finalStatus: 'idle' | 'completed' | 'failed';
  modelUsed?: string;
}

const STATUS_META: Record<FrameProgress['status'], { label: string; Icon: typeof Circle; tone: string }> = {
  pending: { label: 'Queued', Icon: Circle, tone: 'text-muted-foreground' },
  generating: { label: 'Generating', Icon: Loader2, tone: 'text-primary' },
  completed: { label: 'Ready', Icon: CheckCircle2, tone: 'text-emerald-500' },
  failed: { label: 'Failed', Icon: XCircle, tone: 'text-destructive' },
};

export function GenerationProgress({
  totalScenes,
  generatedCount,
  failedCount,
  progress,
  isStreaming,
  finalStatus,
  modelUsed,
}: Props) {
  if (totalScenes === 0) return null;
  const settled = generatedCount + failedCount;
  const percent = Math.round((settled / totalScenes) * 100);
  const headline = isStreaming
    ? `Generating frames | ${settled}/${totalScenes}`
    : finalStatus === 'completed'
    ? `All ${generatedCount} frames ready`
    : finalStatus === 'failed'
    ? `Generation finished with ${failedCount} error${failedCount === 1 ? '' : 's'}`
    : `${settled}/${totalScenes} frames`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            {isStreaming && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {headline}
          </CardTitle>
          <div className="flex items-center gap-2">
            {modelUsed && <Badge variant="outline" className="text-xs">{modelUsed}</Badge>}
            <Badge variant="secondary" className="text-xs">{percent}%</Badge>
          </div>
        </div>
        <Progress value={percent} className="mt-2 h-2" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {progress.map((p) => {
            const meta = STATUS_META[p.status];
            const Icon = meta.Icon;
            return (
              <div
                key={p.scene_number}
                className="rounded-md border bg-card/40 p-2 flex flex-col items-center gap-1"
              >
                <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                  <span>Scene {p.scene_number}</span>
                </div>
                <div className={`flex items-center gap-1 text-xs ${meta.tone}`}>
                  <Icon className={`h-3.5 w-3.5 ${p.status === 'generating' ? 'animate-spin' : ''}`} />
                  <span>{meta.label}</span>
                </div>
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt={`Scene ${p.scene_number} preview`}
                    className="mt-1 h-16 w-full object-cover rounded border"
                  />
                )}
                {p.error && (
                  <p className="text-[10px] text-destructive line-clamp-2 text-center">{p.error}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
