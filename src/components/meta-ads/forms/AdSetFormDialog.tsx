import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Layers, Target, Wand2, MapPin } from 'lucide-react';
import {
  META_CONVERSION_LOCATIONS, META_OPTIMIZATION_GOALS, META_BILLING_EVENTS,
  META_ATTRIBUTION_WINDOWS, META_PACING_TYPES, META_GENDERS,
  META_PLATFORMS, META_DEVICE_PLATFORMS, META_POSITIONS, META_LANGUAGES, META_LIMITS,
} from './shared';
import {
  useCreateMetaAdSet, useUpdateMetaAdSet, MetaAdSet,
} from '@/hooks/use-meta-campaigns';
import {
  dialogContentCls, inputCls, FieldLabel, Section,
  WizardHeader, WizardFooter, WIZARD_STEPS,
} from './wizard-ui';
import {
  DetailedTargetingPicker, GeoLocationPicker, CustomAudiencePicker,
} from './AudiencePickers';
import type { TargetingItem, GeoItem, CustomAudience } from '@/hooks/use-meta-targeting';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  editAdSet?: MetaAdSet | null;
  onSaved?: (id: string) => void;
  saveLabel?: string;
  wizardActiveStep?: string;
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
  custom_audiences: CustomAudience[];
  excluded_audiences: CustomAudience[];
  included_geos: GeoItem[];
  excluded_geos: GeoItem[];
  age_min: number;
  age_max: number;
  genders: number;
  languages: number[];
  interests: TargetingItem[];
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
  custom_audiences: [],
  excluded_audiences: [],
  included_geos: [],
  excluded_geos: [],
  age_min: 25,
  age_max: 65,
  genders: 0,
  languages: [6],
  interests: [],
  expand_targeting: true,
  placement_type: 'automatic',
  device_platforms: [...META_DEVICE_PLATFORMS],
  platforms: [...META_PLATFORMS],
  positions: {},
};

export function AdSetFormDialog({
  open, onOpenChange, campaignId, editAdSet, onSaved, saveLabel, wizardActiveStep,
}: Props) {
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
        interests: (editAdSet.interests || []).map((i: any, idx: number) =>
          typeof i === 'string'
            ? { id: `legacy-${idx}-${i}`, name: i, type: 'interests' }
            : { id: i.id || `legacy-${idx}`, name: i.name, type: i.type || 'interests', path: i.path, audience_size: i.audience_size }
        ),
        included_geos: (editAdSet.locations || []).map((l: any, idx: number) =>
          typeof l === 'string'
            ? { key: `legacy-${idx}-${l}`, name: l, type: 'city' }
            : { key: l.key || `legacy-${idx}`, name: l.name, type: l.type || 'city', country_code: l.country_code, region: l.region }
        ),
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
      geo_locations: {
        cities: form.included_geos.filter((g) => g.type === 'city').map((g) => ({ key: g.key, name: g.name, country_code: g.country_code })),
        regions: form.included_geos.filter((g) => g.type === 'region').map((g) => ({ key: g.key, name: g.name, country_code: g.country_code })),
        countries: form.included_geos.filter((g) => g.type === 'country').map((g) => g.country_code).filter(Boolean),
        zips: form.included_geos.filter((g) => g.type === 'zip').map((g) => ({ key: g.key, name: g.name })),
      },
      excluded_geo_locations: form.excluded_geos.length ? {
        cities: form.excluded_geos.filter((g) => g.type === 'city').map((g) => ({ key: g.key, name: g.name })),
        regions: form.excluded_geos.filter((g) => g.type === 'region').map((g) => ({ key: g.key, name: g.name })),
        countries: form.excluded_geos.filter((g) => g.type === 'country').map((g) => g.country_code).filter(Boolean),
      } : undefined,
      custom_audiences: form.custom_audiences.map((a) => ({ id: a.id, name: a.name })),
      excluded_custom_audiences: form.excluded_audiences.length
        ? form.excluded_audiences.map((a) => ({ id: a.id, name: a.name }))
        : undefined,
      age_min: form.age_min,
      age_max: form.age_max,
      genders: form.genders === 0 ? [1, 2] : [form.genders],
      locales: form.languages,
      flexible_spec: form.interests.length
        ? [{
            interests: form.interests.filter((i) => i.type === 'interests').map((i) => ({ id: i.id, name: i.name })),
            behaviors: form.interests.filter((i) => i.type === 'behaviors').map((i) => ({ id: i.id, name: i.name })),
            demographics: form.interests.filter((i) => i.type === 'demographics').map((i) => ({ id: i.id, name: i.name })),
          }]
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
      interests: form.interests.map((i) => ({ id: i.id, name: i.name, type: i.type })),
      locations: form.included_geos.map((g) => ({ key: g.key, name: g.name, type: g.type, country_code: g.country_code })),
      targeting,
      attribution_setting: form.attribution_setting,
      billing_event: form.billing_event,
      pacing_type: [form.pacing_type],
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      bid_amount: form.cost_per_result_goal > 0 ? Math.round(form.cost_per_result_goal * 100) : null,
    };

    const done = (d: any) => { if (onSaved) onSaved(d.id); else onOpenChange(false); };
    if (editAdSet) {
      update.mutate({ id: editAdSet.id, ...payload }, { onSuccess: done });
    } else {
      create.mutate(payload, { onSuccess: done });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogContentCls}>
        <WizardHeader
          title={editAdSet ? 'Edit Ad Set' : 'New Ad Set'}
          draft={!editAdSet}
          subtitle="Audience, placements and delivery | matches Meta Ads Manager."
          steps={wizardActiveStep ? WIZARD_STEPS : undefined}
          activeStep={wizardActiveStep}
        />

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 cmd-scroll">
          {/* Name */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <FieldLabel required>Ad Set Name</FieldLabel>
              <span className="text-[10px] text-slate-600 tabular-nums">
                {form.name.length} / {META_LIMITS.adset_name}
              </span>
            </div>
            <Input
              value={form.name}
              maxLength={META_LIMITS.adset_name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. FL 45-65 | Lead form | Mobile feed"
              className={inputCls}
            />
          </div>

          <Tabs defaultValue="audience" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full bg-slate-900/60 border border-slate-800 p-1 h-auto">
              {[
                ['conversion', 'Conversion'],
                ['budget', 'Budget & Schedule'],
                ['audience', 'Audience'],
                ['placements', 'Placements'],
              ].map(([v, l]) => (
                <TabsTrigger
                  key={v}
                  value={v}
                  className="text-[11px] uppercase tracking-wider font-semibold data-[state=active]:bg-emerald-500 data-[state=active]:text-[#0F172A] text-slate-400"
                >
                  {l}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Conversion ── */}
            <TabsContent value="conversion" className="space-y-5 mt-4">
              <Section title="Conversion">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel>Conversion location</FieldLabel>
                    <Select value={form.conversion_location} onValueChange={(v) => set('conversion_location', v)}>
                      <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {META_CONVERSION_LOCATIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Performance goal</FieldLabel>
                    <Select value={form.optimization_goal} onValueChange={(v) => set('optimization_goal', v)}>
                      <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {META_OPTIMIZATION_GOALS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel>Billing event</FieldLabel>
                    <Select value={form.billing_event} onValueChange={(v) => set('billing_event', v)}>
                      <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {META_BILLING_EVENTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Attribution setting</FieldLabel>
                    <Select value={form.attribution_setting} onValueChange={(v) => set('attribution_setting', v)}>
                      <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {META_ATTRIBUTION_WINDOWS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>Cost per result goal ($, optional)</FieldLabel>
                  <Input
                    type="number" min={0} step={0.5} value={form.cost_per_result_goal}
                    onChange={(e) => set('cost_per_result_goal', Number(e.target.value) || 0)}
                    placeholder="Only used with Cost cap or Bid cap"
                    className={inputCls}
                  />
                </div>
              </Section>
            </TabsContent>

            {/* ── Budget & Schedule ── */}
            <TabsContent value="budget" className="space-y-5 mt-4">
              <Section title="Budget">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-4 space-y-1.5">
                    <FieldLabel>Budget type</FieldLabel>
                    <RadioGroup
                      value={form.budget_type}
                      onValueChange={(v: 'daily' | 'lifetime') => set('budget_type', v)}
                      className="flex gap-4 h-[34px] items-center"
                    >
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-200">
                        <RadioGroupItem value="daily" className="border-emerald-500 text-emerald-500" /> Daily
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400">
                        <RadioGroupItem value="lifetime" className="border-slate-600" /> Lifetime
                      </label>
                    </RadioGroup>
                  </div>
                  <div className="col-span-6 md:col-span-4 space-y-1.5">
                    <FieldLabel>Daily Budget ($)</FieldLabel>
                    <Input
                      type="number" min={1} disabled={form.budget_type !== 'daily'}
                      value={form.daily_budget} onChange={(e) => set('daily_budget', Number(e.target.value) || 0)}
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-4 space-y-1.5">
                    <FieldLabel>Lifetime Budget ($)</FieldLabel>
                    <Input
                      type="number" min={100} disabled={form.budget_type !== 'lifetime'}
                      value={form.lifetime_budget} onChange={(e) => set('lifetime_budget', Number(e.target.value) || 0)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </Section>

              <Section title="Schedule">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel>Start</FieldLabel>
                    <Input type="datetime-local" value={form.start_time}
                      onChange={(e) => set('start_time', e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel required={form.budget_type === 'lifetime'}>End</FieldLabel>
                    <Input type="datetime-local" value={form.end_time}
                      onChange={(e) => set('end_time', e.target.value)} className={inputCls} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>Spend pacing</FieldLabel>
                  <RadioGroup value={form.pacing_type} onValueChange={(v) => set('pacing_type', v)} className="flex gap-4 mt-1">
                    {META_PACING_TYPES.map((p) => (
                      <label key={p.value} className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-200">
                        <RadioGroupItem value={p.value} className="border-emerald-500" /> {p.label}
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </Section>
            </TabsContent>

            {/* ── Audience ── */}
            <TabsContent value="audience" className="space-y-5 mt-4">
              <Section title="Custom Audiences">
                <div className="space-y-1.5">
                  <FieldLabel>Include</FieldLabel>
                  <CustomAudiencePicker
                    value={form.custom_audiences}
                    onChange={(v) => set('custom_audiences', v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Exclude</FieldLabel>
                  <CustomAudiencePicker
                    value={form.excluded_audiences}
                    onChange={(v) => set('excluded_audiences', v)}
                    excludeMode
                  />
                </div>
              </Section>

              <Section title="Locations">
                <div className="space-y-1.5">
                  <FieldLabel>Include locations</FieldLabel>
                  <GeoLocationPicker
                    value={form.included_geos}
                    onChange={(v) => set('included_geos', v)}
                  />
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Cities, regions, countries, ZIPs | sourced from Meta's geo catalog
                  </p>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Exclude locations</FieldLabel>
                  <GeoLocationPicker
                    value={form.excluded_geos}
                    onChange={(v) => set('excluded_geos', v)}
                    excludeMode
                  />
                </div>
              </Section>

              <Section title="Demographics">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <FieldLabel>Age range</FieldLabel>
                    <span className="text-xs text-emerald-400 tabular-nums">{form.age_min} | {form.age_max}</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Slider
                        min={13}
                        max={65}
                        step={1}
                        value={[form.age_min]}
                        onValueChange={([v]) => set('age_min', v)}
                        className="[&_[data-orientation=horizontal]]:bg-emerald-500/30 [&_[role=slider]]:border-emerald-500 [&_[role=slider]]:bg-emerald-500 [&>span>span]:bg-emerald-500"
                      />
                    </div>
                    <div className="flex-1">
                      <Slider
                        min={13}
                        max={65}
                        step={1}
                        value={[form.age_max]}
                        onValueChange={([v]) => set('age_max', v)}
                        className="[&_[data-orientation=horizontal]]:bg-emerald-500/30 [&_[role=slider]]:border-emerald-500 [&_[role=slider]]:bg-emerald-500 [&>span>span]:bg-emerald-500"
                      />
                    </div>
                  </div>
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel>Gender</FieldLabel>
                    <RadioGroup
                      value={String(form.genders)}
                      onValueChange={(v) => set('genders', Number(v))}
                      className="flex gap-4 mt-1"
                    >
                      {META_GENDERS.map((g) => (
                        <label key={g.value} className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-200">
                          <RadioGroupItem value={String(g.value)} className="border-emerald-500" /> {g.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Languages</FieldLabel>
                    <div className="flex flex-wrap gap-1">
                      {META_LANGUAGES.map((l) => {
                        const active = form.languages.includes(l.value);
                        return (
                          <Badge
                            key={l.value}
                            variant="outline"
                            className={`cursor-pointer transition-colors text-[10px] ${active
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                              : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}
                            onClick={() =>
                              set('languages', active ? form.languages.filter((x) => x !== l.value) : [...form.languages, l.value])
                            }
                          >
                            {l.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Detailed Targeting">
                <div className="space-y-1.5">
                  <FieldLabel>Interests, behaviors, demographics</FieldLabel>
                  <DetailedTargetingPicker
                    value={form.interests}
                    onChange={(v) => set('interests', v)}
                  />
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Target className="h-3 w-3" /> Search and pin entries from Meta's Detailed Targeting catalog
                  </p>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 bg-emerald-500/10 rounded-md shrink-0">
                      <Wand2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white">Advantage detailed targeting</h4>
                      <p className="text-[10px] text-slate-500">Let Meta expand interests if it improves results.</p>
                    </div>
                  </div>
                  <Switch checked={form.expand_targeting} onCheckedChange={(v) => set('expand_targeting', v)} />
                </div>
              </Section>
            </TabsContent>

            {/* ── Placements ── */}
            <TabsContent value="placements" className="space-y-5 mt-4">
              <Section title="Placement Mode">
                <RadioGroup
                  value={form.placement_type}
                  onValueChange={(v: 'automatic' | 'manual') => set('placement_type', v)}
                  className="space-y-2"
                >
                  <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 cursor-pointer hover:border-slate-700 transition-colors">
                    <RadioGroupItem value="automatic" className="mt-0.5 border-emerald-500" />
                    <div>
                      <div className="font-bold text-sm text-white">Advantage+ placements (recommended)</div>
                      <div className="text-[11px] text-slate-400">Meta shows ads where they're most likely to perform.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 cursor-pointer hover:border-slate-700 transition-colors">
                    <RadioGroupItem value="manual" className="mt-0.5 border-emerald-500" />
                    <div>
                      <div className="font-bold text-sm text-white">Manual placements</div>
                      <div className="text-[11px] text-slate-400">Choose specific platforms and positions.</div>
                    </div>
                  </label>
                </RadioGroup>

                {form.placement_type === 'manual' && (
                  <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4 mt-3">
                    <div className="space-y-2">
                      <FieldLabel>Devices</FieldLabel>
                      <div className="flex gap-4">
                        {META_DEVICE_PLATFORMS.map((d) => (
                          <label key={d} className="flex items-center gap-2 capitalize text-xs text-slate-200">
                            <Checkbox
                              checked={form.device_platforms.includes(d)}
                              onCheckedChange={(v) => set('device_platforms', v
                                ? [...form.device_platforms, d]
                                : form.device_platforms.filter((x) => x !== d))}
                            />{d}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>Platforms & positions</FieldLabel>
                      <div className="space-y-2">
                        {META_PLATFORMS.map((p) => {
                          const enabled = form.platforms.includes(p);
                          return (
                            <div key={p} className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
                              <label className="flex items-center gap-2 font-bold capitalize text-xs text-white">
                                <Checkbox checked={enabled} onCheckedChange={(v) =>
                                  set('platforms', v ? [...form.platforms, p] : form.platforms.filter((x) => x !== p))
                                } />
                                <Layers className="h-3 w-3 text-emerald-500" />
                                {p.replace('_', ' ')}
                              </label>
                              {enabled && (
                                <div className="grid grid-cols-2 gap-1.5 mt-2 pl-6">
                                  {META_POSITIONS[p].map((pos) => {
                                    const arr = form.positions[p] || [];
                                    const checked = arr.includes(pos.value);
                                    return (
                                      <label key={pos.value} className="flex items-center gap-2 text-[11px] text-slate-300">
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
              </Section>
            </TabsContent>
          </Tabs>

          {errors.length > 0 && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/40 text-red-200 [&>svg]:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 text-xs space-y-0.5">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <WizardFooter
          primaryLabel={saveLabel ?? (editAdSet ? 'Update Ad Set' : 'Create Ad Set')}
          onPrimary={handleSave}
          primaryDisabled={!canSave}
          primaryLoading={create.isPending || update.isPending}
          onSecondary={() => onOpenChange(false)}
          secondaryLabel={editAdSet ? 'Cancel' : 'Discard'}
          statusLabel={editAdSet ? 'Editing ad set' : 'Unsaved draft'}
        />
      </DialogContent>
    </Dialog>
  );
}
