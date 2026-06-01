import * as React from 'react';
import { Circle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─────────── Shared visual tokens for the campaign wizard dialogs. ─────────── */

export const dialogContentCls =
  'max-w-4xl p-0 gap-0 overflow-hidden border-slate-800 bg-[#0F172A] text-white sm:rounded-xl max-h-[95vh] flex flex-col';

export const wideDialogContentCls =
  'max-w-5xl p-0 gap-0 overflow-hidden border-slate-800 bg-[#0F172A] text-white sm:rounded-xl max-h-[95vh] flex flex-col';

export const inputCls =
  'w-full bg-[#1E293B] border-slate-700 text-white placeholder:text-slate-500 rounded-md px-3 py-1.5 h-9 text-sm focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:ring-offset-0';

export const surfaceCardCls =
  'bg-slate-900/40 border border-slate-800/60 rounded-lg p-3';

export interface WizardStep {
  id: string;
  label: string;
}

interface WizardHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  draft?: boolean;
  steps?: WizardStep[];
  activeStep?: string;
  onStepClick?: (id: string) => void;
}

export function WizardHeader({
  title, subtitle, draft, steps, activeStep, onStepClick,
}: WizardHeaderProps) {
  return (
    <header className="px-6 py-4 border-b border-slate-800/60 shrink-0">
      <div className="flex justify-between items-center mb-3 gap-4">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-white truncate">{title}</h2>
          {draft && <span className="text-xs text-slate-500 font-normal">(draft)</span>}
        </div>

        {steps && (
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800">
            {steps.map((s) => {
              const active = s.id === activeStep;
              const clickable = !!onStepClick && !active;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onStepClick!(s.id)}
                  className={[
                    'px-3 py-1 font-semibold text-[10px] rounded-md uppercase tracking-wider transition-colors',
                    active
                      ? 'bg-emerald-500 text-[#0F172A] cursor-default'
                      : clickable
                        ? 'text-slate-500 hover:text-white'
                        : 'text-slate-600',
                  ].join(' ')}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>
        )}
      </div>
      {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
    </header>
  );
}

interface WizardFooterProps {
  primaryLabel: React.ReactNode;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onSecondary?: () => void;
  secondaryLabel?: React.ReactNode;
  statusLabel?: React.ReactNode;
  statusTone?: 'amber' | 'emerald' | 'slate';
}

export function WizardFooter({
  primaryLabel, onPrimary, primaryDisabled, primaryLoading,
  onSecondary, secondaryLabel = 'Cancel',
  statusLabel = 'Unsaved draft', statusTone = 'amber',
}: WizardFooterProps) {
  const toneCls = {
    amber: 'fill-amber-500 text-amber-500',
    emerald: 'fill-emerald-500 text-emerald-500',
    slate: 'fill-slate-500 text-slate-500',
  }[statusTone];

  return (
    <footer className="px-6 py-3 bg-slate-900/60 backdrop-blur-md border-t border-slate-800 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <Circle className={`w-2 h-2 ${toneCls}`} />
        <span className="text-[10px] font-medium text-slate-500">{statusLabel}</span>
      </div>
      <div className="flex gap-2">
        {onSecondary && (
          <button
            onClick={onSecondary}
            className="px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-white transition-colors rounded-md"
          >
            {secondaryLabel}
          </button>
        )}
        <Button
          onClick={onPrimary}
          disabled={primaryDisabled || primaryLoading}
          className="px-6 py-1.5 h-auto bg-emerald-500 hover:bg-emerald-400 text-[#0F172A] text-[11px] font-bold rounded-md transition-all flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-emerald-500"
        >
          {primaryLoading ? 'Saving…' : primaryLabel}
          {!primaryLoading && <ChevronRight className="w-3 h-3" />}
        </Button>
      </div>
    </footer>
  );
}

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-tighter block">
      {children}{required && <span className="text-emerald-500 ml-0.5">*</span>}
    </label>
  );
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-[10px] font-bold tracking-widest text-emerald-500/80 uppercase">{title}</h3>
        <span className="h-px flex-1 bg-slate-800/60" />
        {action}
      </div>
      {children}
    </section>
  );
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'campaign', label: 'Campaign' },
  { id: 'adset', label: 'Ad Set' },
  { id: 'ad', label: 'Ad' },
  { id: 'review', label: 'Review' },
];
