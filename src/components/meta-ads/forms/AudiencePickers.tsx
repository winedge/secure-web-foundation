import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, X, MapPin, Sparkles, Users, Ban } from 'lucide-react';
import {
  useTargetingSearch, useGeoSearch, useCustomAudiences,
  formatAudienceSize, TargetingItem, GeoItem, CustomAudience,
} from '@/hooks/use-meta-targeting';
import { inputCls } from './wizard-ui';

/* ════════════════════════════════════════════════════════════════════
   Meta-style audience picker primitives.
   Mirrors Ads Manager interaction: type → live typeahead → click to pin.
   Pinned items render as removable chips above the input.
   ════════════════════════════════════════════════════════════════════ */

interface PickerWrapperProps {
  icon: React.ReactNode;
  placeholder: string;
  children: React.ReactNode;
  query: string;
  onQueryChange: (q: string) => void;
  loading?: boolean;
  source?: 'meta' | 'fallback';
  results?: React.ReactNode;
  inputRef?: React.RefObject<HTMLInputElement>;
}

function PickerShell({
  icon, placeholder, children, query, onQueryChange, loading, source, results, inputRef,
}: PickerWrapperProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <div
        className={[
          'rounded-md border bg-[#1E293B] transition-colors',
          open ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' : 'border-slate-700',
        ].join(' ')}
        onClick={() => {
          setOpen(true);
          inputRef?.current?.focus();
        }}
      >
        {children /* chips */}
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="text-slate-500">{icon}</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { onQueryChange(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="flex-1 min-w-[80px] bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
          />
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 left-0 right-0 rounded-md border border-slate-700 bg-[#0F172A] shadow-2xl overflow-hidden max-h-72 overflow-y-auto cmd-scroll">
          {results}
          {source === 'fallback' && (
            <div className="px-3 py-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center gap-1.5 bg-slate-900/40">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Showing curated catalog | Connect Meta in Settings for live Ads Manager data.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({
  label, sub, onRemove, tone = 'emerald',
}: { label: string; sub?: string; onRemove: () => void; tone?: 'emerald' | 'rose' | 'sky' }) {
  const toneCls = {
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    rose:    'bg-rose-500/15 text-rose-300 border-rose-500/30',
    sky:     'bg-sky-500/15 text-sky-300 border-sky-500/30',
  }[tone];
  return (
    <Badge
      variant="outline"
      className={`gap-1.5 ${toneCls} hover:${toneCls} text-[11px] font-medium`}
    >
      <span className="truncate max-w-[180px]">{label}</span>
      {sub && <span className="opacity-60 text-[9px]">{sub}</span>}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="hover:text-white"
        type="button"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

/* ───────── Detailed targeting (interests/behaviors/demographics) ───────── */
export function DetailedTargetingPicker({
  value, onChange,
}: {
  value: TargetingItem[];
  onChange: (v: TargetingItem[]) => void;
}) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isFetching } = useTargetingSearch(q, true);
  const selectedIds = useMemo(() => new Set(value.map((v) => v.id)), [value]);

  const add = (item: TargetingItem) => {
    if (selectedIds.has(item.id)) return;
    onChange([...value, item]);
    setQ('');
    inputRef.current?.focus();
  };
  const remove = (id: string) => onChange(value.filter((v) => v.id !== id));

  return (
    <PickerShell
      icon={<Search className="h-3.5 w-3.5" />}
      placeholder={value.length ? '' : 'Search interests, behaviors, demographics…'}
      query={q}
      onQueryChange={setQ}
      loading={isFetching}
      source={data?.source}
      inputRef={inputRef}
      results={
        <div className="py-1">
          {(data?.items || [])
            .filter((i) => !selectedIds.has(i.id))
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => add(item)}
                className="w-full flex items-start justify-between gap-3 px-3 py-2 hover:bg-slate-800/60 text-left transition-colors group"
              >
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {(item.path || []).join(' › ')} <span className="text-emerald-400/70 uppercase">{item.type}</span>
                  </div>
                </div>
                {item.audience_size ? (
                  <div className="text-[10px] text-slate-400 tabular-nums shrink-0 mt-0.5">
                    Size: {formatAudienceSize(item.audience_size)}
                  </div>
                ) : null}
              </button>
            ))}
          {!isFetching && (data?.items || []).length === 0 && (
            <div className="px-3 py-4 text-xs text-slate-500 text-center">
              No matches | try a different keyword
            </div>
          )}
        </div>
      }
    >
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pt-2">
          {value.map((v) => (
            <Chip
              key={v.id}
              label={v.name}
              sub={v.type.slice(0, 3).toUpperCase()}
              onRemove={() => remove(v.id)}
              tone="emerald"
            />
          ))}
        </div>
      )}
    </PickerShell>
  );
}

/* ───────── Geo locations (include) ───────── */
export function GeoLocationPicker({
  value, onChange, excludeMode = false,
}: {
  value: GeoItem[];
  onChange: (v: GeoItem[]) => void;
  excludeMode?: boolean;
}) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isFetching } = useGeoSearch(q, undefined, true);
  const selected = useMemo(() => new Set(value.map((v) => v.key)), [value]);

  const add = (item: GeoItem) => {
    if (selected.has(item.key)) return;
    onChange([...value, item]);
    setQ('');
    inputRef.current?.focus();
  };
  const remove = (key: string) => onChange(value.filter((v) => v.key !== key));

  return (
    <PickerShell
      icon={<MapPin className="h-3.5 w-3.5" />}
      placeholder={value.length ? '' : excludeMode
        ? 'Exclude cities, regions, ZIPs…'
        : 'Search cities, regions, countries, ZIPs…'}
      query={q}
      onQueryChange={setQ}
      loading={isFetching}
      source={data?.source}
      inputRef={inputRef}
      results={
        <div className="py-1">
          {(data?.items || [])
            .filter((i) => !selected.has(i.key))
            .map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => add(item)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-800/60 text-left transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-500 uppercase">
                      {item.type}{item.country_code ? ` | ${item.country_code}` : ''}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          {!isFetching && (data?.items || []).length === 0 && (
            <div className="px-3 py-4 text-xs text-slate-500 text-center">
              No locations matched
            </div>
          )}
        </div>
      }
    >
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pt-2">
          {value.map((v) => (
            <Chip
              key={v.key}
              label={v.name}
              sub={v.type.toUpperCase()}
              onRemove={() => remove(v.key)}
              tone={excludeMode ? 'rose' : 'sky'}
            />
          ))}
        </div>
      )}
    </PickerShell>
  );
}

/* ───────── Custom audience picker (include or exclude) ───────── */
export function CustomAudiencePicker({
  value, onChange, excludeMode = false,
}: {
  value: CustomAudience[];
  onChange: (v: CustomAudience[]) => void;
  excludeMode?: boolean;
}) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isFetching } = useCustomAudiences();
  const selected = useMemo(() => new Set(value.map((v) => v.id)), [value]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const items = data?.items || [];
    if (!needle) return items;
    return items.filter((i) => i.name.toLowerCase().includes(needle));
  }, [q, data]);

  const add = (item: CustomAudience) => {
    if (selected.has(item.id)) return;
    onChange([...value, item]);
    setQ('');
    inputRef.current?.focus();
  };
  const remove = (id: string) => onChange(value.filter((v) => v.id !== id));

  return (
    <PickerShell
      icon={excludeMode ? <Ban className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
      placeholder={value.length ? '' : excludeMode
        ? 'Search audiences to exclude…'
        : 'Search saved audiences…'}
      query={q}
      onQueryChange={setQ}
      loading={isFetching}
      source={data?.source}
      inputRef={inputRef}
      results={
        <div className="py-1">
          {filtered.filter((i) => !selected.has(i.id)).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => add(item)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-800/60 text-left transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm text-white truncate">{item.name}</div>
                <div className="text-[10px] text-slate-500">
                  {item.subtype || 'CUSTOM'}
                  {item.size ? ` | ~${formatAudienceSize(item.size)} people` : ''}
                </div>
              </div>
            </button>
          ))}
          {!isFetching && filtered.length === 0 && (
            <div className="px-3 py-4 text-xs text-slate-500 text-center">
              {data?.source === 'fallback'
                ? 'No saved audiences found | Connect Meta to load yours.'
                : 'No saved audiences match this search.'}
            </div>
          )}
        </div>
      }
    >
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pt-2">
          {value.map((v) => (
            <Chip
              key={v.id}
              label={v.name}
              sub={v.size ? formatAudienceSize(v.size) : v.subtype}
              onRemove={() => remove(v.id)}
              tone={excludeMode ? 'rose' : 'emerald'}
            />
          ))}
        </div>
      )}
    </PickerShell>
  );
}
