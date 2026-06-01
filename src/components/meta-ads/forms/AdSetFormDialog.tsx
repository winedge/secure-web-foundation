import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, X } from 'lucide-react';
import {
  META_CONVERSION_LOCATIONS, META_OPTIMIZATION_GOALS, META_BILLING_EVENTS,
  META_ATTRIBUTION_WINDOWS, META_PACING_TYPES, META_GENDERS,
  META_PLATFORMS, META_DEVICE_PLATFORMS, META_POSITIONS, META_LANGUAGES, META_LIMITS,
} from './shared';
import {
  useCreateMetaAdSet, useUpdateMetaAdSet, MetaAdSet,
} from '@/hooks/use-meta-campaigns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  editAdSet?: MetaAdSet | null;
  onSaved?: (id: string) => void;
  saveLabel?: string;
}

type FormState = {
  name: string;
  conversion_location: string;
  optimization_goal: string;
  billing_event: string;
  cost_per_result_goal: number;
  attribution_setting: string;
  budget_type: 'daily' | 'lifetime';
  daily_budget: number;
  lifetime_budget: number;
  start_time: string;
  end_time: string;
  pacing_type: string;
  // audience
  custom_audiences: string;
  excluded_audiences: string;
  locations: string;
  age_min: number;
  age_max: number;
  genders: number;
  languages: number[];
  interests: string;
  expand_targeting: boolean;
  // placements
  placement_type: 'automatic' | 'manual';
  device_platforms: string[];
  platforms: string[];
  positions: Record<string, string[]>;
};

const INITIAL: FormState = {
  name: '',
  conversion_location: 'WEBSITE',
  optimization_goal: 'LEAD_GENERATION',
  billing_event: 'IMPRESSIONS',
  cost_per_result_goal: 0,
  attribution_setting: '7d_click_1d_view',
  budget_type: 'daily',
  daily_budget: 25,
  lifetime_budget: 0,
  start_time: '',
  end_time: '',
  pacing_type: 'standard',
  custom_audiences: '',
  excluded_audiences: '',
  locations: '',
  age_min: 25,
  age_max: 65,
  genders: 0,
  languages: [6],
  interests: '',
  expand_targeting: true,
  placement_type: 'automatic',
  device_platforms: [...META_DEVICE_PLATFORMS],
  platforms: [...META_PLATFORMS],
  positions: {},
};

export function AdSetFormDialog({ open, onOpenChange, campaignId, editAdSet }: Props) {
  const create = useCreateMetaAdSet();
  const update = useUpdateMetaAdSet();
  const [form, setForm] = useState<FormState>(INITIAL);

  useEffect(() => {
    if (!open) return;
    if (editAdSet) {
      setForm({
        ...INITIAL,
        name: editAdSet.name,
        optimization_goal: editAdSet.optimization_event || 'LEAD_GENERATION',
        daily_budget: editAdSet.daily_budget || 25,
        age_min: editAdSet.age_min ?? 25,
        age_max: editAdSet.age_max ?? 65,
        placement_type: (editAdSet.placement_type as any) || 'automatic',
        interests: (editAdSet.interests || []).map((i: any) => typeof i === 'string' ? i : i.name).join(', '),
        locations: (editAdSet.locations || []).map((l: any) => typeof l === 'string' ? l : l.name).join(', '),
      });
    } else {
      setForm(INITIAL);
    }
  }, [open, editAdSet]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const errors: string[] = [];
  if (!form.name.trim()) errors.push('Ad set name is required.');
  if (form.name.length > META_LIMITS.adset_name) errors.push(`Name must be ≤ ${META_LIMITS.adset_name} chars.`);
  if (form.budget_type === 'daily' && form.daily_budget < 1) errors.push('Daily budget must be ≥ $1.');
  if (form.budget_type === 'lifetime' && (!form.end_time || form.lifetime_budget < 100)) {
    errors.push('Lifetime budgets need an end date and a budget ≥ $100.');
  }
  if (form.age_max < form.age_min) errors.push('Age max must be ≥ age min.');
  if (form.placement_type === 'manual' && form.platforms.length === 0) errors.push('Pick at least one platform.');
  const canSave = errors.length === 0 && !create.isPending && !update.isPending;

  const handleSave = () => {
    const targeting: any = {
      geo_locations: { custom_locations: form.locations.split(',').map((s) => ({ name: s.trim() })).filter((l) => l.name) },
      age_min: form.age_min,
      age_max: form.age_max,
      genders: form.genders === 0 ? [1, 2] : [form.genders],
      locales: form.languages,
      flexible_spec: form.interests.trim()
        ? [{ interests: form.interests.split(',').map((s) => ({ name: s.trim() })).filter((i) => i.name) }]
        : undefined,
      targeting_automation: { advantage_audience: form.expand_targeting ? 1 : 0 },
      publisher_platforms: form.placement_type === 'manual' ? form.platforms : undefined,
      device_platforms: form.placement_type === 'manual' ? form.device_platforms : undefined,
      ...Object.fromEntries(
        form.placement_type === 'manual'
          ? Object.entries(form.positions).map(([k, v]) => [`${k}_positions`, v])
          : []
      ),
    };

    const payload: any = {
      campaign_id: campaignId,
      name: form.name.trim(),
      optimization_event: form.optimization_goal,
      daily_budget: form.budget_type === 'daily' ? form.daily_budget : 0,
      lifetime_budget: form.budget_type === 'lifetime' ? form.lifetime_budget : 0,
      placement_type: form.placement_type,
      age_min: form.age_min,
      age_max: form.age_max,
      genders: form.genders === 0 ? ['all'] : form.genders === 1 ? ['male'] : ['female'],
      interests: form.interests.split(',').map((s) => s.trim()).filter(Boolean),
      locations: form.locations.split(',').map((s) => ({ name: s.trim() })).filter((l) => l.name),
      targeting,
      attribution_setting: form.attribution_setting,
      billing_event: form.billing_event,
      pacing_type: [form.pacing_type],
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      bid_amount: form.cost_per_result_goal > 0 ? Math.round(form.cost_per_result_goal * 100) : null,
    };

    if (editAdSet) {
      update.mutate({ id: editAdSet.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editAdSet ? 'Edit Ad Set' : 'New Ad Set'}</DialogTitle>
          <DialogDescription>
            Configure audience, placements and delivery the way Meta Ads Manager expects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="as-name">Ad Set Name <span className="text-destructive">*</span></Label>
            <Input id="as-name" value={form.name} maxLength={META_LIMITS.adset_name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. FL 45-65 | Lead form | Mobile feed"
            />
            <p className="text-xs text-muted-foreground mt-1">{form.name.length}/{META_LIMITS.adset_name}</p>
          </div>

          <Tabs defaultValue="conversion">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="conversion">Conversion</TabsTrigger>
              <TabsTrigger value="budget">Budget &amp; Schedule</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="placements">Placements</TabsTrigger>
            </TabsList>

            {/* ── Conversion ── */}
            <TabsContent value="conversion" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Conversion location</Label>
                  <Select value={form.conversion_location} onValueChange={(v) => set('conversion_location', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {META_CONVERSION_LOCATIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Performance goal</Label>
                  <Select value={form.optimization_goal} onValueChange={(v) => set('optimization_goal', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {META_OPTIMIZATION_GOALS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Billing event</Label>
                  <Select value={form.billing_event} onValueChange={(v) => set('billing_event', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {META_BILLING_EVENTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Attribution setting</Label>
                  <Select value={form.attribution_setting} onValueChange={(v) => set('attribution_setting', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {META_ATTRIBUTION_WINDOWS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Cost per result goal ($, optional)</Label>
                <Input type="number" min={0} step={0.5} value={form.cost_per_result_goal}
                  onChange={(e) => set('cost_per_result_goal', Number(e.target.value) || 0)}
                  placeholder="Only used when bid strategy is Cost cap or Bid cap"
                />
              </div>
            </TabsContent>

            {/* ── Budget & schedule ── */}
            <TabsContent value="budget" className="space-y-4 pt-4">
              <div>
                <Label>Budget type</Label>
                <RadioGroup value={form.budget_type} onValueChange={(v: 'daily' | 'lifetime') => set('budget_type', v)} className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2"><RadioGroupItem value="daily" /><span className="text-sm">Daily</span></label>
                  <label className="flex items-center gap-2"><RadioGroupItem value="lifetime" /><span className="text-sm">Lifetime</span></label>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Daily Budget ($)</Label>
                  <Input type="number" min={1} disabled={form.budget_type !== 'daily'}
                    value={form.daily_budget} onChange={(e) => set('daily_budget', Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Lifetime Budget ($)</Label>
                  <Input type="number" min={100} disabled={form.budget_type !== 'lifetime'}
                    value={form.lifetime_budget} onChange={(e) => set('lifetime_budget', Number(e.target.value) || 0)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start</Label>
                  <Input type="datetime-local" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
                </div>
                <div>
                  <Label>End {form.budget_type === 'lifetime' && <span className="text-destructive">*</span>}</Label>
                  <Input type="datetime-local" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Spend pacing</Label>
                <RadioGroup value={form.pacing_type} onValueChange={(v) => set('pacing_type', v)} className="flex gap-4 mt-2">
                  {META_PACING_TYPES.map((p) => (
                    <label key={p.value} className="flex items-center gap-2"><RadioGroupItem value={p.value} /><span className="text-sm">{p.label}</span></label>
                  ))}
                </RadioGroup>
              </div>
            </TabsContent>

            {/* ── Audience ── */}
            <TabsContent value="audience" className="space-y-4 pt-4">
              <div>
                <Label>Custom Audiences (comma-separated IDs/names)</Label>
                <Input value={form.custom_audiences} onChange={(e) => set('custom_audiences', e.target.value)} placeholder="Site visitors, Lead form openers…" />
              </div>
              <div>
                <Label>Excluded audiences</Label>
                <Input value={form.excluded_audiences} onChange={(e) => set('excluded_audiences', e.target.value)} placeholder="Existing customers…" />
              </div>
              <div>
                <Label>Locations (cities, regions, ZIPs)</Label>
                <Input value={form.locations} onChange={(e) => set('locations', e.target.value)} placeholder="Miami, Houston, 90210…" />
              </div>

              <div>
                <Label>Age range: {form.age_min} – {form.age_max}</Label>
                <div className="flex gap-3 mt-2">
                  <div className="flex-1">
                    <Slider min={13} max={65} step={1} value={[form.age_min]} onValueChange={([v]) => set('age_min', v)} />
                  </div>
                  <div className="flex-1">
                    <Slider min={13} max={65} step={1} value={[form.age_max]} onValueChange={([v]) => set('age_max', v)} />
                  </div>
                </div>
              </div>

              <div>
                <Label>Gender</Label>
                <RadioGroup value={String(form.genders)} onValueChange={(v) => set('genders', Number(v))} className="flex gap-4 mt-2">
                  {META_GENDERS.map((g) => (
                    <label key={g.value} className="flex items-center gap-2"><RadioGroupItem value={String(g.value)} /><span className="text-sm">{g.label}</span></label>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label>Languages</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {META_LANGUAGES.map((l) => {
                    const active = form.languages.includes(l.value);
                    return (
                      <Badge key={l.value} variant={active ? 'default' : 'outline'} className="cursor-pointer"
                        onClick={() => set('languages', active ? form.languages.filter((x) => x !== l.value) : [...form.languages, l.value])}>
                        {l.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Detailed targeting (interests, behaviors, demographics)</Label>
                <Input value={form.interests} onChange={(e) => set('interests', e.target.value)} placeholder="Personal injury, Legal services, Social Security…" />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="font-medium">Advantage detailed targeting</Label>
                  <p className="text-xs text-muted-foreground">Let Meta expand interests if it improves results.</p>
                </div>
                <Switch checked={form.expand_targeting} onCheckedChange={(v) => set('expand_targeting', v)} />
              </div>
            </TabsContent>

            {/* ── Placements ── */}
            <TabsContent value="placements" className="space-y-4 pt-4">
              <RadioGroup value={form.placement_type} onValueChange={(v: 'automatic' | 'manual') => set('placement_type', v)} className="space-y-2">
                <label className="flex items-start gap-2 rounded-lg border p-3 cursor-pointer">
                  <RadioGroupItem value="automatic" className="mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">Advantage+ placements (recommended)</div>
                    <div className="text-xs text-muted-foreground">Meta shows ads where they're most likely to perform.</div>
                  </div>
                </label>
                <label className="flex items-start gap-2 rounded-lg border p-3 cursor-pointer">
                  <RadioGroupItem value="manual" className="mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">Manual placements</div>
                    <div className="text-xs text-muted-foreground">Choose specific platforms and positions.</div>
                  </div>
                </label>
              </RadioGroup>

              {form.placement_type === 'manual' && (
                <div className="space-y-4 rounded-lg border p-3">
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Devices</Label>
                    <div className="flex gap-3 mt-1">
                      {META_DEVICE_PLATFORMS.map((d) => (
                        <label key={d} className="flex items-center gap-2 capitalize text-sm">
                          <Checkbox
                            checked={form.device_platforms.includes(d)}
                            onCheckedChange={(v) => set('device_platforms', v ? [...form.device_platforms, d] : form.device_platforms.filter((x) => x !== d))}
                          />{d}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Platforms &amp; positions</Label>
                    <div className="space-y-3 mt-1">
                      {META_PLATFORMS.map((p) => {
                        const enabled = form.platforms.includes(p);
                        return (
                          <div key={p} className="rounded border p-2">
                            <label className="flex items-center gap-2 font-medium capitalize text-sm">
                              <Checkbox checked={enabled} onCheckedChange={(v) =>
                                set('platforms', v ? [...form.platforms, p] : form.platforms.filter((x) => x !== p))
                              } />
                              {p.replace('_', ' ')}
                            </label>
                            {enabled && (
                              <div className="grid grid-cols-2 gap-1.5 mt-2 pl-6">
                                {META_POSITIONS[p].map((pos) => {
                                  const arr = form.positions[p] || [];
                                  const checked = arr.includes(pos.value);
                                  return (
                                    <label key={pos.value} className="flex items-center gap-2 text-xs">
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(v) => set('positions', {
                                          ...form.positions,
                                          [p]: v ? [...arr, pos.value] : arr.filter((x) => x !== pos.value),
                                        })}
                                      />
                                      {pos.label}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 text-xs space-y-0.5">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={!canSave} className="flex-1">
              {editAdSet ? 'Update Ad Set' : 'Create Ad Set'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
