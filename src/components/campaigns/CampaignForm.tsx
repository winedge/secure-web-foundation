import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Campaign, CreateCampaignInput } from '@/hooks/use-campaigns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const TORT_TYPES = [
  'Personal Injury',
  'Medical Malpractice',
  'Product Liability',
  'Workers Compensation',
  'Auto Accident',
  'Slip and Fall',
  'Wrongful Death',
  'Mass Tort',
  'Pharmaceutical',
  'Environmental',
];

const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  tort_type: z.string().min(1, 'Tort type is required'),
  target_states: z.array(z.string()).optional(),
  target_age_min: z.number().min(18).max(100).optional().nullable(),
  target_age_max: z.number().min(18).max(100).optional().nullable(),
  daily_budget: z.number().min(0).optional().nullable(),
  total_budget: z.number().min(0).optional().nullable(),
  status: z.string().optional(),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

interface CampaignFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: Campaign | null;
  onSubmit: (data: CreateCampaignInput) => void;
  isLoading?: boolean;
}

export function CampaignForm({ open, onOpenChange, campaign, onSubmit, isLoading }: CampaignFormProps) {
  const isEditing = !!campaign;

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: campaign?.name || '',
      tort_type: campaign?.tort_type || '',
      target_states: campaign?.target_states || [],
      target_age_min: campaign?.target_age_min || null,
      target_age_max: campaign?.target_age_max || null,
      daily_budget: campaign?.daily_budget || null,
      total_budget: campaign?.total_budget || null,
      status: campaign?.status || 'draft',
    },
  });

  const selectedStates = form.watch('target_states') || [];

  const handleStateToggle = (state: string) => {
    const current = selectedStates;
    const updated = current.includes(state)
      ? current.filter(s => s !== state)
      : [...current, state];
    form.setValue('target_states', updated);
  };

  const handleSubmit = (data: CampaignFormValues) => {
    onSubmit({
      name: data.name,
      tort_type: data.tort_type,
      target_states: data.target_states,
      target_age_min: data.target_age_min ?? undefined,
      target_age_max: data.target_age_max ?? undefined,
      daily_budget: data.daily_budget ?? undefined,
      total_budget: data.total_budget ?? undefined,
      status: data.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Campaign' : 'Create New Campaign'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update your campaign settings and targeting criteria.'
              : 'Set up a new campaign to acquire leads matching your criteria.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Basic Information
                </h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Campaign Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Q1 Auto Accident Campaign"
                      {...form.register('name')}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tort_type">Tort Type</Label>
                    <Select
                      value={form.watch('tort_type')}
                      onValueChange={(value) => form.setValue('tort_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tort type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TORT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.tort_type && (
                      <p className="text-sm text-destructive">{form.formState.errors.tort_type.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Targeting */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Targeting Criteria
                </h4>
                
                <div className="space-y-2">
                  <Label>Target States (leave empty for all states)</Label>
                  <div className="border rounded-lg p-3 max-h-32 overflow-y-auto">
                    <div className="grid grid-cols-5 gap-2">
                      {US_STATES.map((state) => (
                        <div key={state} className="flex items-center space-x-2">
                          <Checkbox
                            id={`state-${state}`}
                            checked={selectedStates.includes(state)}
                            onCheckedChange={() => handleStateToggle(state)}
                          />
                          <Label htmlFor={`state-${state}`} className="text-sm font-normal cursor-pointer">
                            {state}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  {selectedStates.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedStates.length} state(s) selected: {selectedStates.join(', ')}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_age_min">Minimum Age</Label>
                    <Input
                      id="target_age_min"
                      type="number"
                      min={18}
                      max={100}
                      placeholder="18"
                      {...form.register('target_age_min', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_age_max">Maximum Age</Label>
                    <Input
                      id="target_age_max"
                      type="number"
                      min={18}
                      max={100}
                      placeholder="100"
                      {...form.register('target_age_max', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Budget
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="daily_budget">Daily Budget ($)</Label>
                    <Input
                      id="daily_budget"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="No limit"
                      {...form.register('daily_budget', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total_budget">Total Budget ($)</Label>
                    <Input
                      id="total_budget"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="No limit"
                      {...form.register('total_budget', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              {isEditing && (
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Status
                  </h4>
                  <Select
                    value={form.watch('status') || 'draft'}
                    onValueChange={(value) => form.setValue('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* AI Creative Content (read-only display when editing) */}
              {isEditing && (campaign as any)?.ad_headline && (
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    AI Creative Content
                  </h4>
                  <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                    <div>
                      <Label className="text-xs text-muted-foreground">Headline</Label>
                      <p className="font-semibold text-foreground">{(campaign as any).ad_headline}</p>
                    </div>
                    {(campaign as any).ad_body && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Ad Body</Label>
                        <p className="text-sm text-foreground">{(campaign as any).ad_body}</p>
                      </div>
                    )}
                    {(campaign as any).ad_cta && (
                      <div>
                        <Label className="text-xs text-muted-foreground">CTA</Label>
                        <p className="text-sm font-medium text-primary">{(campaign as any).ad_cta}</p>
                      </div>
                    )}
                    {(campaign as any).emotional_angle && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Emotional Angle</Label>
                        <p className="text-sm text-foreground">{(campaign as any).emotional_angle}</p>
                      </div>
                    )}
                    {(campaign as any).target_hook && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Target Hook</Label>
                        <p className="text-sm text-foreground">{(campaign as any).target_hook}</p>
                      </div>
                    )}
                    {(campaign as any).ab_test_hypothesis && (
                      <div>
                        <Label className="text-xs text-muted-foreground">A/B Test Hypothesis</Label>
                        <p className="text-sm text-foreground italic">{(campaign as any).ab_test_hypothesis}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
