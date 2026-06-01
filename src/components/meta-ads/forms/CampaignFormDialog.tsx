import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, ChevronDown, X } from 'lucide-react';
import {
  META_OBJECTIVES, META_SPECIAL_AD_CATEGORIES, META_BID_STRATEGIES, META_BUYING_TYPES,
  META_LIMITS, US_STATES,
} from './shared';
import {
  useCreateMetaCampaign, useUpdateMetaCampaign, MetaCampaign,
} from '@/hooks/use-meta-campaigns';
import { useVertical } from '@/hooks/use-vertical';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCampaign?: MetaCampaign | null;
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
  target_states: [],
};

export function CampaignFormDialog({ open, onOpenChange, editCampaign }: Props) {
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
      target_states: form.target_states,
      special_ad_categories: form.special_ad_categories,
    };
    if (editCampaign) {
      update.mutate({ id: editCampaign.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate({ ...payload, status: 'draft' }, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editCampaign ? 'Edit Campaign' : 'New Meta Campaign (draft)'}</DialogTitle>
          <DialogDescription>
            Configure your campaign the way Meta Ads Manager expects it. Nothing is sent to Meta until you click
            <strong> Review &amp; Publish</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ─── Section A | Campaign setup ─── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Campaign setup</h3>

            <div>
              <Label htmlFor="c-name">
                Campaign Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="c-name"
                value={form.name}
                maxLength={META_LIMITS.campaign_name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Q1 Roundup | National | Leads"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.name.length}/{META_LIMITS.campaign_name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Buying type</Label>
                <Select value={form.buying_type} onValueChange={(v) => set('buying_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {META_BUYING_TYPES.map((b) => (
                      <SelectItem key={b.value} value={b.value} disabled={b.value === 'RESERVED'}>
                        {b.label}{b.value === 'RESERVED' ? ' | Contact Meta rep' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Objective (ODAX)</Label>
                <Select value={form.objective} onValueChange={(v) => set('objective', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {META_OBJECTIVES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {META_OBJECTIVES.find((o) => o.value === form.objective)?.help}
                </p>
              </div>
            </div>

            {/* Special ad category */}
            <div>
              <Label>Special Ad Category</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {form.special_ad_categories.length === 0
                      ? 'None | Declare none'
                      : `${form.special_ad_categories.length} selected`}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
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
              {form.special_ad_categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.special_ad_categories.map((c) => (
                    <Badge key={c} variant="secondary" className="gap-1">
                      {c}
                      <X className="h-3 w-3 cursor-pointer" onClick={() =>
                        set('special_ad_categories', form.special_ad_categories.filter((x) => x !== c))
                      } />
                    </Badge>
                  ))}
                </div>
              )}
              {hasSpecialCat && (
                <Alert className="mt-2 border-yellow-500/40 bg-yellow-500/5">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle>Targeting restrictions apply</AlertTitle>
                  <AlertDescription className="text-xs">
                    Age, gender, ZIP and detailed targeting options are limited for this category, per Meta policy.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </section>

          <Separator />

          {/* ─── Section B | Budget & bidding ─── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Budget &amp; bidding</h3>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="cbo" className="font-medium">Campaign Budget Optimization (CBO)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Meta distributes the budget across ad sets in real time.</p>
              </div>
              <Switch id="cbo" checked={form.cbo} onCheckedChange={(v) => set('cbo', v)} />
            </div>

            <div>
              <Label>Budget type</Label>
              <RadioGroup
                value={form.budget_type}
                onValueChange={(v: 'daily' | 'lifetime') => set('budget_type', v)}
                className="flex gap-4 mt-2"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="daily" /> <span className="text-sm">Daily</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="lifetime" /> <span className="text-sm">Lifetime</span>
                </label>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Daily Budget ($)</Label>
                <Input
                  type="number" min={1} step={1}
                  disabled={form.budget_type !== 'daily'}
                  value={form.daily_budget}
                  onChange={(e) => set('daily_budget', Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Lifetime Budget ($)</Label>
                <Input
                  type="number" min={100} step={10}
                  disabled={form.budget_type !== 'lifetime'}
                  value={form.lifetime_budget}
                  onChange={(e) => set('lifetime_budget', Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <Label>Spend cap ($, optional)</Label>
              <Input
                type="number" min={0}
                value={form.spend_cap}
                onChange={(e) => set('spend_cap', Number(e.target.value) || 0)}
                placeholder="0 = no cap"
              />
              <p className="text-xs text-muted-foreground mt-1">Hard ceiling for total spend across the campaign.</p>
            </div>

            <div>
              <Label>Bid strategy</Label>
              <Select value={form.bid_strategy} onValueChange={(v) => set('bid_strategy', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {META_BID_STRATEGIES.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {META_BID_STRATEGIES.find((b) => b.value === form.bid_strategy)?.help}
              </p>
            </div>
          </section>

          <Separator />

          {/* ─── Section C | LeadThru routing ─── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              LeadThru routing
            </h3>

            <div>
              <Label>{categoryLabel}</Label>
              {categories.length > 0 ? (
                <Select value={form.tort_type} onValueChange={(v) => set('tort_type', v)}>
                  <SelectTrigger><SelectValue placeholder={`Select ${categoryLabel.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.tort_type} onChange={(e) => set('tort_type', e.target.value)} placeholder={`e.g., ${categoryLabel}`} />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Used by the LeadThru matching engine. Not sent to Meta.
              </p>
            </div>

            <div>
              <Label>Target States</Label>
              <StatesChipsInput
                value={form.target_states}
                onChange={(v) => set('target_states', v)}
              />
              <p className="text-xs text-muted-foreground mt-1">Defaults pushed down to ad set geo targeting.</p>
            </div>
          </section>

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
              {editCampaign ? 'Update Campaign' : 'Save Draft'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ───── Small reusable: chip input for US states ─────
function StatesChipsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = (raw: string) => {
    const v = raw.trim().toUpperCase();
    if (!v) return;
    if (!US_STATES.includes(v)) return;
    if (value.includes(v)) return;
    onChange([...value, v]);
    setInput('');
  };
  return (
    <div className="rounded-md border p-2 flex flex-wrap gap-1.5 min-h-[42px]">
      {value.map((s) => (
        <Badge key={s} variant="secondary" className="gap-1">
          {s}
          <X className="h-3 w-3 cursor-pointer" onClick={() => onChange(value.filter((x) => x !== s))} />
        </Badge>
      ))}
      <input
        list="us-states-list"
        className="flex-1 min-w-[80px] bg-transparent outline-none text-sm"
        value={input}
        placeholder={value.length ? '' : 'FL, TX, CA…'}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); add(input); }
          else if (e.key === 'Backspace' && !input && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => add(input)}
      />
      <datalist id="us-states-list">
        {US_STATES.map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}
