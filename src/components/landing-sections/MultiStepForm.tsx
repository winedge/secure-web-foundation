import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { SectionTheme, MultiStepFormProps } from '@/lib/landing-sections/types';
import { buttonStyles, fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function MultiStepForm({ props, theme }: { props: MultiStepFormProps; theme: SectionTheme }) {
  const steps = props.steps ?? [];
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  if (!steps.length) return <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>Add at least one step in the inspector.</div>;

  const cur = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  const next = () => {
    const required = (cur.fields ?? []).filter(f => f.required && !values[f.id]);
    if (required.length) return;
    if (step < steps.length - 1) setStep(step + 1);
    else setDone(true);
  };

  return (
    <section id="lead-form" style={{ padding: sectionPadding(theme.spacing), background: theme.accent + '08', color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {(props.heading || props.description) && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(24px,2.8vw,34px)', fontWeight: 700, margin: 0 }}>{props.heading}</h2>}
            {props.description && <p style={{ fontSize: 16, opacity: 0.7, marginTop: 10 }}>{props.description}</p>}
          </div>
        )}
        <div style={{ padding: 28, borderRadius: radiusPx(theme.radius), background: theme.background, boxShadow: '0 8px 30px rgba(0,0,0,.06)' }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <CheckCircle2 size={56} style={{ color: theme.accent, margin: '0 auto 16px' }} />
              <div style={{ fontSize: 20, fontWeight: 700 }}>{props.successMessage || 'Thanks! We will be in touch.'}</div>
            </div>
          ) : (
            <>
              <div style={{ height: 4, background: theme.primary + '14', borderRadius: 2, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: theme.accent, transition: 'width .3s' }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 4 }}>
                Step {step + 1} of {steps.length}
              </div>
              <h3 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 22, fontWeight: 700, margin: '0 0 20px' }}>{cur.title}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(cur.fields ?? []).map(f => (
                  <div key={f.id}>
                    <label style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, display: 'block', marginBottom: 6 }}>
                      {f.label}{f.required && <span style={{ color: '#ef4444' }}> *</span>}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={values[f.id] ?? ''}
                        onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))}
                        style={{ width: '100%', padding: 10, border: `1px solid ${theme.primary}26`, borderRadius: 8, fontFamily: 'inherit', fontSize: 14 }}
                      />
                    ) : f.type === 'select' ? (
                      <select
                        value={values[f.id] ?? ''}
                        onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))}
                        style={{ width: '100%', padding: 10, border: `1px solid ${theme.primary}26`, borderRadius: 8, fontFamily: 'inherit', fontSize: 14 }}
                      >
                        <option value="">Select...</option>
                        {(f.options || '').split(',').map(o => o.trim()).filter(Boolean).map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type}
                        value={values[f.id] ?? ''}
                        onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))}
                        style={{ width: '100%', padding: 10, border: `1px solid ${theme.primary}26`, borderRadius: 8, fontFamily: 'inherit', fontSize: 14 }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setStep(s => Math.max(0, s - 1))}
                  disabled={step === 0}
                  style={{ ...buttonStyles(theme, 'secondary'), opacity: step === 0 ? 0.3 : 1 }}
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button type="button" onClick={next} style={buttonStyles(theme, 'primary')}>
                  {step === steps.length - 1 ? 'Submit' : 'Continue'} <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
