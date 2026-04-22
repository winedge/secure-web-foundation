/**
 * Module Metadata - per-module display info used by ModuleGate empty states.
 *
 * Lists which verticals a module is intended for and why, so non-eligible
 * users see a clear explanation instead of generic copy.
 *
 * Source of truth for *enablement* is the vertical preset (`presets.ts`)
 * + the per-firm `vertical_module_access` table. This file only adds
 * marketing/explanation copy.
 */

import type { ModuleKey, VerticalSlug } from './types';

export interface ModuleMetadata {
  /** Friendly display name */
  label: string;
  /** Short one-liner for headers */
  tagline: string;
  /** Longer explanation shown in the gated empty state */
  reason: string;
  /** Verticals this module is designed for (slugs) */
  eligibleVerticals: VerticalSlug[];
  /** True for tools that are exclusively legal-domain (mass tort) */
  legalOnly?: boolean;
}

export const MODULE_METADATA: Partial<Record<ModuleKey, ModuleMetadata>> = {
  judge_intelligence: {
    label: 'Judge Intelligence',
    tagline: 'Predict judge tendencies for litigation strategy',
    reason:
      'Judge Intelligence analyses court records, prior rulings, and case outcomes to advise on litigation strategy. It is purpose-built for law firms handling mass tort, personal injury, and class action matters and has no equivalent application in non-legal verticals.',
    eligibleVerticals: ['mass_tort'],
    legalOnly: true,
  },
  settlement_predictor: {
    label: 'Settlement Predictor',
    tagline: 'AI-driven settlement value ranges',
    reason:
      'The Settlement Predictor models likely settlement ranges using historical verdicts, jurisdiction data, and case-specific facts. It only applies to legal claims work and is not relevant to clinics, real estate, solar, dental, or home-services workflows.',
    eligibleVerticals: ['mass_tort'],
    legalOnly: true,
  },
  evidence_vault: {
    label: 'Evidence Vault',
    tagline: 'Tamper-proof chain-of-custody for case evidence',
    reason:
      'The Evidence Vault provides cryptographic chain-of-custody, blockchain audit trails, and admissibility-grade storage required for legal proceedings. It is reserved for the Mass Tort Legal vertical.',
    eligibleVerticals: ['mass_tort'],
    legalOnly: true,
  },
  market_pulse: {
    label: 'Market Pulse Radar',
    tagline: 'Track tort wave timing and emerging litigation',
    reason:
      'Market Pulse tracks emerging mass tort waves, MDL filings, and litigation announcements. It is most useful for law firms; other verticals should rely on the Competitor Intelligence and Intent Signals tools instead.',
    eligibleVerticals: ['mass_tort', 'real_estate'],
  },
  dark_funnel: {
    label: 'Dark Funnel Intelligence',
    tagline: 'Identify anonymous high-intent visitors',
    reason:
      'Dark Funnel Intelligence enables high-volume web visitor identification, primarily used by mass tort firms and real estate brokerages with long sales cycles.',
    eligibleVerticals: ['mass_tort', 'real_estate'],
  },
  predictive_leads: {
    label: 'Predictive Leads',
    tagline: 'Forecast which leads will convert',
    reason:
      'Predictive Leads uses long-cycle conversion modelling that requires the data shape produced by mass tort, real estate, and similar verticals.',
    eligibleVerticals: ['mass_tort', 'real_estate'],
  },
};

export function getModuleMetadata(key: ModuleKey): ModuleMetadata | undefined {
  return MODULE_METADATA[key];
}
