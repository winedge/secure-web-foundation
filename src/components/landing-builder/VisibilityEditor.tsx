import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Eye, Plus, Trash2 } from 'lucide-react';
import type { Section, VisibilityConfig, VisibilityRule } from '@/lib/landing-sections/types';
import { AUDIENCE_KEY_OPTIONS, OPERATOR_OPTIONS } from '@/lib/landing-sections/visibility';
import type { CustomField } from '@/hooks/use-firm-branding';

interface Props {
  section: Section;
  onChange: (visibility: VisibilityConfig | undefined) => void;
  /** Built-in + custom form field names available for `form` rules. */
  formFieldKeys: { value: string; label: string }[];
}

const VALUE_LESS = new Set(['is_empty', 'is_not_empty', 'truthy', 'falsy']);

const DEFAULT_RULE: VisibilityRule = {
  source: 'audience',
  key: 'device',
  operator: 'equals',
  value: 'mobile',
};

export function VisibilityEditor({ section, onChange, formFieldKeys }: Props) {
  const cfg = section.visibility;
  const [open, setOpen] = useState<boolean>(!!cfg?.rules?.length);
  const rules = cfg?.rules ?? [];
  const mode = cfg?.mode ?? 'all';

  const setMode = (m: 'all' | 'any') => onChange({ mode: m, rules });
  const setRule = (i: number, patch: Partial<VisibilityRule>) => {
    const next = rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange({ mode, rules: next });
  };
  const addRule = () => {
    onChange({ mode, rules: [...rules, { ...DEFAULT_RULE }] });
    setOpen(true);
  };
  const removeRule = (i: number) => {
    const next = rules.filter((_, idx) => idx !== i);
    onChange(next.length ? { mode, rules: next } : undefined);
  };
  const clearAll = () => onChange(undefined);

  return (
    <div className="rounded-md border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Visibility rules
          </span>
          {rules.length > 0 && (
            <Badge variant="secondary" className="h-5 text-[10px]">
              {rules.length} · {mode === 'all' ? 'AND' : 'OR'}
            </Badge>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="p-3 pt-0 space-y-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Section is always visible unless rules are added. Rules can check the
            visitor's device or UTM/query params, or the live values typed in the
            intake form.
          </p>

          {rules.length > 1 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium">Match</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as 'all' | 'any')}>
                <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rules</SelectItem>
                  <SelectItem value="any">Any rule</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            {rules.map((rule, i) => (
              <RuleRow
                key={i}
                rule={rule}
                formFieldKeys={formFieldKeys}
                onChange={(patch) => setRule(i, patch)}
                onRemove={() => removeRule(i)}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addRule} className="h-8 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add rule
            </Button>
            {rules.length > 0 && (
              <Button size="sm" variant="ghost" onClick={clearAll} className="h-8 text-xs text-muted-foreground">
                Clear all
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RuleRow({
  rule,
  formFieldKeys,
  onChange,
  onRemove,
}: {
  rule: VisibilityRule;
  formFieldKeys: { value: string; label: string }[];
  onChange: (patch: Partial<VisibilityRule>) => void;
  onRemove: () => void;
}) {
  const isAudience = rule.source === 'audience';
  const isQueryParam = isAudience && rule.key.startsWith('query:');
  const valueless = VALUE_LESS.has(rule.operator);

  const audienceOptions = [...AUDIENCE_KEY_OPTIONS, { value: '__query__', label: 'Custom query param…' }];

  return (
    <div className="rounded-md border bg-card p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          When
        </span>
        <Button size="sm" variant="ghost" onClick={onRemove} className="h-6 w-6 p-0 text-destructive">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Source</Label>
          <Select
            value={rule.source}
            onValueChange={(v) => {
              const next: Partial<VisibilityRule> = { source: v as 'audience' | 'form' };
              next.key = v === 'audience' ? 'device' : (formFieldKeys[0]?.value ?? 'full_name');
              onChange(next);
            }}
          >
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="audience">Audience</SelectItem>
              <SelectItem value="form">Form response</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Field</Label>
          {isAudience ? (
            <Select
              value={isQueryParam ? '__query__' : rule.key}
              onValueChange={(v) => {
                if (v === '__query__') onChange({ key: 'query:' });
                else onChange({ key: v });
              }}
            >
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {audienceOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={rule.key} onValueChange={(v) => onChange({ key: v })}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Choose field" /></SelectTrigger>
              <SelectContent>
                {formFieldKeys.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isQueryParam && (
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Param name</Label>
          <Input
            className="h-8"
            placeholder="e.g. campaign"
            value={rule.key.slice(6)}
            onChange={(e) => onChange({ key: `query:${e.target.value}` })}
          />
        </div>
      )}

      <div className={valueless ? '' : 'grid grid-cols-2 gap-2'}>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Operator</Label>
          <Select value={rule.operator} onValueChange={(v) => onChange({ operator: v as VisibilityRule['operator'] })}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {OPERATOR_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!valueless && (
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Value</Label>
            <Input
              className="h-8"
              placeholder={hintFor(rule)}
              value={rule.value ?? ''}
              onChange={(e) => onChange({ value: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function hintFor(rule: VisibilityRule): string {
  if (rule.source === 'audience') {
    if (rule.key === 'device') return 'mobile, tablet, or desktop';
    if (rule.key === 'visitor') return 'new or returning';
    return 'value to match';
  }
  return 'value to match';
}

/** Helper to derive the field-key options from intake config. */
export function intakeFormKeys(visible: string[], custom: CustomField[]): { value: string; label: string }[] {
  const builtIn = visible.map((k) => ({ value: k, label: k.replace(/_/g, ' ') }));
  const customOpts = (custom ?? []).map((c) => ({ value: c.name, label: c.label || c.name }));
  return [...builtIn, ...customOpts];
}
