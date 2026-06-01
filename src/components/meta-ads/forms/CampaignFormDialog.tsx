import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, ChevronDown, X, Zap } from 'lucide-react';
import {
  META_OBJECTIVES, META_SPECIAL_AD_CATEGORIES, META_BID_STRATEGIES, META_BUYING_TYPES,
  META_LIMITS, US_STATES,
} from './shared';
import {
  useCreateMetaCampaign, useUpdateMetaCampaign, MetaCampaign,
} from '@/hooks/use-meta-campaigns';
import { useVertical } from '@/hooks/use-vertical';
import {
  dialogContentCls, inputCls, FieldLabel, Section,
  WizardHeader, WizardFooter, WIZARD_STEPS,
} from './wizard-ui';


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCampaign?: MetaCampaign | null;
  /** Called with the new/updated row id on save. If provided, dialog won't auto-close. */
  onSaved?: (id: string) => void;
  /** Override the primary CTA label (e.g. "Save & continue to Ad Set"). */
  saveLabel?: string;
  /** When inside the wizard, render the integrated stepper in the dialog header. */
  wizardSteps?: { id: string; label: string }[];
  wizardActiveStep?: string;
}

type FormState = {
  name: string;
  buying_type: string;
  objective: string;
  special_ad_categories: string[];
  cbo: boolean;
  budget_type: 'daily' | 'lifetime';
  daily_budget: number;
  lifetime_budget: number;
  spend_cap: number;
  bid_strategy: string;
  tort_type: string;
  target_country: string;
  target_states: string[];
};

const INITIAL: FormState = {
  name: '',
  buying_type: 'AUCTION',
  objective: 'OUTCOME_LEADS',
  special_ad_categories: [],
  cbo: false,
  budget_type: 'daily',
  daily_budget: 50,
  lifetime_budget: 0,
  spend_cap: 0,
  bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  tort_type: '',
  target_country: 'WORLDWIDE',
  target_states: [],
};

const COUNTRY_OPTIONS: { value: string; label: string }[] = [
  { value: 'WORLDWIDE', label: 'Worldwide / Custom' },
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IE', label: 'Ireland' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'IN', label: 'India' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SG', label: 'Singapore' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'SE', label: 'Sweden' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'JP', label: 'Japan' },
  { value: 'EU', label: 'European Union' },
];

/* ──────────────────────────────────────────────────────────────────── */
/*  Dense, command-hub style dialog                                     */
/* ──────────────────────────────────────────────────────────────────── */
export function CampaignFormDialog({
  open, onOpenChange, editCampaign, onSaved, saveLabel,
  wizardSteps, wizardActiveStep,
}: Props) {
  const create = useCreateMetaCampaign();
  const update = useUpdateMetaCampaign();
  const { categories, term } = useVertical();
  const categoryLabel = term('category_label', 'Category');

  const [form, setForm] = useState<FormState>(INITIAL);

  useEffect(() => {
    if (!open) return;
    if (editCampaign) {
      setForm({
        name: editCampaign.name,
        buying_type: 'AUCTION',
        objective: editCampaign.objective || 'OUTCOME_LEADS',
        special_ad_categories: editCampaign.special_ad_categories || [],
        cbo: !!editCampaign.daily_budget && !!editCampaign.lifetime_budget ? false : !!editCampaign.daily_budget,
        budget_type: editCampaign.lifetime_budget ? 'lifetime' : 'daily',
        daily_budget: editCampaign.daily_budget || 0,
        lifetime_budget: editCampaign.lifetime_budget || 0,
        spend_cap: 0,
        bid_strategy: editCampaign.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
        tort_type: editCampaign.tort_type || '',
        target_country: (editCampaign as any).target_country || 'WORLDWIDE',
        target_states: editCampaign.target_states || [],
      });
    } else {
      setForm(INITIAL);
    }
  }, [open, editCampaign]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const hasSpecialCat = form.special_ad_categories.length > 0;

  const errors: string[] = [];
  if (!form.name.trim()) errors.push('Campaign name is required.');
  if (form.name.length > META_LIMITS.campaign_name) errors.push(`Name must be ≤ ${META_LIMITS.campaign_name} chars.`);
  if (form.budget_type === 'daily' && form.daily_budget < 1) errors.push('Daily budget must be ≥ $1.');
  if (form.budget_type === 'lifetime' && form.lifetime_budget < 100) errors.push('Lifetime budget must be ≥ $100.');
  if (form.spend_cap > 0 && form.budget_type === 'daily' && form.spend_cap < form.daily_budget * 7) {
    errors.push('Spend cap should be ≥ 7× daily budget.');
  }
  const canSave = errors.length === 0 && !create.isPending && !update.isPending;

  const handleSave = () => {
    const payload: any = {
      name: form.name.trim(),
      objective: form.objective,
      bid_strategy: form.bid_strategy,
      daily_budget: form.budget_type === 'daily' ? form.daily_budget : 0,
      lifetime_budget: form.budget_type === 'lifetime' ? form.lifetime_budget : 0,
      tort_type: form.tort_type || null,
      target_country: form.target_country,
      target_states: form.target_states,
      special_ad_categories: form.special_ad_categories,
    };
    const done = (d: any) => { if (onSaved) onSaved(d.id); else onOpenChange(false); };
    if (editCampaign) {
      update.mutate({ id: editCampaign.id, ...payload }, { onSuccess: done });
    } else {
      create.mutate({ ...payload, status: 'draft' }, { onSuccess: done });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogContentCls}>
        <WizardHeader
          title={editCampaign ? 'Edit Campaign' : 'New Meta Campaign'}
          draft={!editCampaign}
          subtitle="Configure campaign settings | Nothing is sent to Meta until you click Review & Publish."
          steps={wizardSteps ?? (wizardActiveStep ? WIZARD_STEPS : undefined)}
          activeStep={wizardActiveStep}
        />



        {/* ─────────── Scrollable Body ─────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7 cmd-scroll">
          {/* Campaign Setup */}
          <Section title="Campaign Setup">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-8 space-y-1.5">
                <div className="flex justify-between items-center">
                  <FieldLabel required>Campaign Name</FieldLabel>
                  <span className="text-[10px] text-slate-600 tabular-nums">
                    {form.name.length} / {META_LIMITS.campaign_name}
                  </span>
                </div>
                <Input
                  value={form.name}
                  maxLength={META_LIMITS.campaign_name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Q1 Roundup | National | Leads"
                  className={inputCls}
                />
              </div>
              <div className="col-span-12 md:col-span-4 space-y-1.5">
                <FieldLabel>Special Ad Category</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={[inputCls, 'flex items-center justify-between text-left'].join(' ')}>
                      <span className="truncate">
                        {form.special_ad_categories.length === 0
                          ? 'None | Declare none'
                          : `${form.special_ad_categories.length} selected`}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-2" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[380px] p-2">
                    <div className="space-y-1">
                      {META_SPECIAL_AD_CATEGORIES.map((c) => {
                        const checked = form.special_ad_categories.includes(c.value);
                        return (
                          <label key={c.value} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const next = v
                                  ? [...form.special_ad_categories, c.value]
                                  : form.special_ad_categories.filter((x) => x !== c.value);
                                set('special_ad_categories', next);
                              }}
                            />
                            <span className="text-sm">{c.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {hasSpecialCat && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {form.special_ad_categories.map((c) => (
                    <Badge key={c} variant="secondary" className="gap-1 bg-slate-800 text-slate-200 hover:bg-slate-700">
                      {c}
                      <X className="h-3 w-3 cursor-pointer" onClick={() =>
                        set('special_ad_categories', form.special_ad_categories.filter((x) => x !== c))
                      } />
                    </Badge>
                  ))}
                </div>
                <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-200 [&>svg]:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-amber-100 text-xs font-bold">Targeting restrictions apply</AlertTitle>
                  <AlertDescription className="text-[11px] text-amber-200/80">
                    Age, gender, ZIP and detailed targeting options are limited for this category, per Meta policy.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel>Buying Type</FieldLabel>
                <Select value={form.buying_type} onValueChange={(v) => set('buying_type', v)}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {META_BUYING_TYPES.map((b) => (
                      <SelectItem key={b.value} value={b.value} disabled={b.value === 'RESERVED'}>
                        {b.label}{b.value === 'RESERVED' ? ' | Contact Meta rep' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Objective (ODAX)</FieldLabel>
                <Select value={form.objective} onValueChange={(v) => set('objective', v)}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {META_OBJECTIVES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-500">
                  {META_OBJECTIVES.find((o) => o.value === form.objective)?.help}
                </p>
              </div>
            </div>
          </Section>

          {/* Budget & Bidding */}
          <Section title="Budget & Bidding">
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 bg-emerald-500/10 rounded-md shrink-0">
                  <Zap className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white">Campaign Budget Optimization (CBO)</h4>
                  <p className="text-[10px] text-slate-500">Real-time distribution across ad sets.</p>
                </div>
              </div>
              <Switch checked={form.cbo} onCheckedChange={(v) => set('cbo', v)} />
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-4 space-y-1.5">
                <FieldLabel>Budget Type</FieldLabel>
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
                  type="number" min={1} step={1}
                  disabled={form.budget_type !== 'daily'}
                  value={form.daily_budget}
                  onChange={(e) => set('daily_budget', Number(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
              <div className="col-span-6 md:col-span-4 space-y-1.5">
                <FieldLabel>Lifetime Budget ($)</FieldLabel>
                <Input
                  type="number" min={100} step={10}
                  disabled={form.budget_type !== 'lifetime'}
                  value={form.lifetime_budget}
                  onChange={(e) => set('lifetime_budget', Number(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel>Spend cap ($)</FieldLabel>
                <Input
                  type="number" min={0}
                  value={form.spend_cap}
                  onChange={(e) => set('spend_cap', Number(e.target.value) || 0)}
                  placeholder="Optional | 0 = no cap"
                  className={inputCls}
                />
                <p className="text-[10px] text-slate-500">Hard ceiling for total spend across the campaign.</p>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Bid Strategy</FieldLabel>
                <Select value={form.bid_strategy} onValueChange={(v) => set('bid_strategy', v)}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {META_BID_STRATEGIES.map((b) => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-500">
                  {META_BID_STRATEGIES.find((b) => b.value === form.bid_strategy)?.help}
                </p>
              </div>
            </div>
          </Section>

          {/* Routing & Geo */}
          <Section title="Routing & Geo Targeting">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-4 space-y-1.5">
                <FieldLabel>{categoryLabel}</FieldLabel>
                {categories.length > 0 ? (
                  <Select value={form.tort_type} onValueChange={(v) => set('tort_type', v)}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder={`Select ${categoryLabel.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.tort_type}
                    onChange={(e) => set('tort_type', e.target.value)}
                    placeholder={`e.g., ${categoryLabel}`}
                    className={inputCls}
                  />
                )}
              </div>
              <div className="col-span-12 md:col-span-4 space-y-1.5">
                <FieldLabel>Primary country / region</FieldLabel>
                <Select value={form.target_country} onValueChange={(v) => set('target_country', v)}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-12 md:col-span-4 space-y-1.5">
                <FieldLabel>Target locations</FieldLabel>
                <LocationChipsInput
                  country={form.target_country}
                  value={form.target_states}
                  onChange={(v) => set('target_states', v)}
                />
                <p className="text-[10px] text-slate-500">
                  {form.target_country === 'US'
                    ? 'US state codes (e.g. FL, TX, CA).'
                    : 'Regions, states, provinces, or cities.'}
                </p>
              </div>
            </div>
          </Section>

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

        {/* ─────────── Sticky Footer ─────────── */}
        <footer className="px-6 py-3 bg-slate-900/60 backdrop-blur-md border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Circle className="w-2 h-2 fill-amber-500 text-amber-500" />
            <span className="text-[10px] font-medium text-slate-500">Unsaved draft</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-white transition-colors rounded-md"
            >
              {editCampaign ? 'Cancel' : 'Discard'}
            </button>
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="px-6 py-1.5 h-auto bg-emerald-500 hover:bg-emerald-400 text-[#0F172A] text-[11px] font-bold rounded-md transition-all flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-emerald-500"
            >
              {saveLabel ?? (editCampaign ? 'Update Campaign' : 'Save Draft')}
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────── helpers / sub-components ─────────── */
const inputCls =
  'w-full bg-[#1E293B] border-slate-700 text-white placeholder:text-slate-500 rounded-md px-3 py-1.5 h-9 text-sm focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:ring-offset-0';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-tighter block">
      {children}{required && <span className="text-emerald-500 ml-0.5">*</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-[10px] font-bold tracking-widest text-emerald-500/80 uppercase">{title}</h3>
        <span className="h-px flex-1 bg-slate-800/60" />
      </div>
      {children}
    </section>
  );
}

// ───── Reusable: generic location chip input ─────
function LocationChipsInput({
  country, value, onChange,
}: { country: string; value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');
  const isUS = country === 'US';
  const add = (raw: string) => {
    let v = raw.trim();
    if (!v) return;
    if (isUS) {
      v = v.toUpperCase();
      if (!US_STATES.includes(v)) return;
    }
    if (value.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...value, v]);
    setInput('');
  };
  return (
    <div className="rounded-md border border-slate-700 bg-[#1E293B] p-1.5 flex flex-wrap gap-1.5 min-h-[36px]">
      {value.map((s) => (
        <Badge key={s} variant="secondary" className="gap-1 bg-slate-800 text-slate-200 hover:bg-slate-700">
          {s}
          <X className="h-3 w-3 cursor-pointer" onClick={() => onChange(value.filter((x) => x !== s))} />
        </Badge>
      ))}
      <input
        list={isUS ? 'us-states-list' : undefined}
        className="flex-1 min-w-[80px] bg-transparent outline-none text-sm text-white placeholder:text-slate-500 px-1"
        value={input}
        placeholder={value.length ? '' : isUS ? 'FL, TX, CA…' : 'London, Bavaria, Mumbai…'}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); }
          else if (e.key === 'Backspace' && !input && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => add(input)}
      />
      {isUS && (
        <datalist id="us-states-list">
          {US_STATES.map((s) => <option key={s} value={s} />)}
        </datalist>
      )}
    </div>
  );
}
