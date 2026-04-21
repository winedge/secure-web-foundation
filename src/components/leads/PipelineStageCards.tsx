import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { usePipelineStages, usePipelineStageCounts } from '@/hooks/use-pipeline-stages';

// Backward-compatible export for legacy callers
export type PipelineStage = string;

interface PipelineStageCardsProps {
  /** Optional override of stage counts. Falls back to live DB counts. */
  stageCounts?: Record<string, number>;
  activeStage: string;
  onStageChange: (stage: string) => void;
}

function getIcon(name: string | null | undefined) {
  if (!name) return Icons.Circle;
  const Icon = (Icons as any)[name];
  return Icon || Icons.Circle;
}

export function PipelineStageCards({ stageCounts, activeStage, onStageChange }: PipelineStageCardsProps) {
  const { stages, isLoading } = usePipelineStages();
  const { data: liveCounts } = usePipelineStageCounts();
  const counts = stageCounts ?? liveCounts ?? {};

  if (isLoading || stages.length === 0) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-5 pb-4 h-20" />
          </Card>
        ))}
      </div>
    );
  }

  const cols = stages.length <= 4 ? 'lg:grid-cols-4' : stages.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-6';

  return (
    <div className={cn('grid grid-cols-2 gap-4', cols)}>
      {stages.map((stage) => {
        const Icon = getIcon(stage.icon);
        const isActive = activeStage === stage.stage_key;
        return (
          <Card
            key={stage.id}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md',
              isActive && 'ring-2 ring-primary shadow-md'
            )}
            onClick={() => onStageChange(stage.stage_key)}
          >
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className={cn('h-5 w-5', stage.color || 'text-primary')} />
                <span className="text-2xl font-bold">{counts[stage.stage_key] || 0}</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{stage.label}</p>
              {stage.requires_payment && stage.default_fee > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">${stage.default_fee} fee</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Re-export the stages list for legacy components that still import PIPELINE_STAGES
export const PIPELINE_STAGES = [
  { key: 'new_lead', label: 'New Lead' },
  { key: 'call_verification', label: 'Call Verification' },
  { key: 'medical_records', label: 'Medical Records' },
  { key: 'retainer', label: 'Retainer' },
];
