import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Users, PhoneCall, FileText, Scale } from 'lucide-react';

export type PipelineStage = 'new_lead' | 'call_verification' | 'medical_records' | 'retainer';

interface StageConfig {
  key: PipelineStage;
  label: string;
  icon: React.ElementType;
  color: string;
}

export const PIPELINE_STAGES: StageConfig[] = [
  { key: 'new_lead', label: 'Leads', icon: Users, color: 'text-primary' },
  { key: 'call_verification', label: 'Call Verification', icon: PhoneCall, color: 'text-warning' },
  { key: 'medical_records', label: 'Medical Records', icon: FileText, color: 'text-accent-foreground' },
  { key: 'retainer', label: 'Retainer', icon: Scale, color: 'text-success' },
];

interface PipelineStageCardsProps {
  stageCounts: Record<PipelineStage, number>;
  activeStage: PipelineStage;
  onStageChange: (stage: PipelineStage) => void;
}

export function PipelineStageCards({ stageCounts, activeStage, onStageChange }: PipelineStageCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {PIPELINE_STAGES.map((stage) => {
        const Icon = stage.icon;
        const isActive = activeStage === stage.key;
        return (
          <Card
            key={stage.key}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md',
              isActive && 'ring-2 ring-primary shadow-md'
            )}
            onClick={() => onStageChange(stage.key)}
          >
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className={cn('h-5 w-5', stage.color)} />
                <span className="text-2xl font-bold">{stageCounts[stage.key] || 0}</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{stage.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
