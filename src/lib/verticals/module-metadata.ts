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

const ALL_VERTICALS: VerticalSlug[] = [
  'mass_tort',
  'skin_clinic',
  'real_estate',
  'solar',
  'dental',
  'home_services',
];

export const MODULE_METADATA: Partial<Record<ModuleKey, ModuleMetadata>> = {
  // ============ Existing core modules ============
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

  // ============ AI Toolbox: DENTAL ============
  tool_insurance_verifier: {
    label: 'Insurance Verifier',
    tagline: 'Auto-extract coverage, deductible & pre-auth from cards or policies',
    reason:
      'The Insurance Verifier reads dental insurance cards and benefit summaries to extract coverage details, deductibles, maximums, and pre-authorisation requirements. It is built around dental CDT codes and PPO/HMO plan structures.',
    eligibleVerticals: ['dental'],
  },
  tool_treatment_plan_estimator: {
    label: 'Treatment Plan Estimator',
    tagline: 'Cost + financing options from CDT codes',
    reason:
      'Generates patient-facing cost estimates and financing options from a list of proposed CDT procedures. Specific to dental practice workflows.',
    eligibleVerticals: ['dental'],
  },
  tool_no_show_predictor: {
    label: 'No-Show Predictor',
    tagline: 'Flag high-risk appointments for double-confirmation',
    reason:
      'Predicts appointment no-show risk based on patient history, distance, prior cancellations, and time-of-day patterns. Tuned to the dental appointment book.',
    eligibleVerticals: ['dental'],
  },
  tool_recall_recare: {
    label: 'Recall & Recare AI',
    tagline: 'Find patients due for cleanings & draft outreach',
    reason:
      'Identifies patients overdue for hygiene visits and drafts personalised recall outreach. Built around the 6-month dental recare cadence.',
    eligibleVerticals: ['dental'],
  },

  // ============ AI Toolbox: SKIN / AESTHETICS ============
  tool_before_after_analyzer: {
    label: 'Before/After Analyzer',
    tagline: 'Vision AI compares treatment progress',
    reason:
      'Vision AI that compares before/after photos to quantify treatment progress on skin tone, texture, lines, and pigmentation. Designed for medspa, dermatology, and aesthetic clinic workflows.',
    eligibleVerticals: ['skin_clinic'],
  },
  tool_skin_concern_triage: {
    label: 'Skin Concern Triage',
    tagline: 'Categorize patient concerns & suggest consult type',
    reason:
      'Reads a patient-described concern (and optional photo) and categorises it to recommend the right consult type. Calibrated to aesthetic and dermatologic concerns.',
    eligibleVerticals: ['skin_clinic'],
  },
  tool_treatment_package_recommender: {
    label: 'Treatment Package Recommender',
    tagline: 'Cross-sell complementary procedures',
    reason:
      'Suggests complementary aesthetic procedures and packages to maximise outcome and clinic revenue per patient.',
    eligibleVerticals: ['skin_clinic'],
  },
  tool_influencer_matcher: {
    label: 'Influencer / UGC Matcher',
    tagline: 'Find local micro-influencers for partnerships',
    reason:
      'Identifies local micro-influencers and UGC creators relevant to aesthetic services. Built for clinic-led influencer marketing.',
    eligibleVerticals: ['skin_clinic'],
  },

  // ============ AI Toolbox: REAL ESTATE ============
  tool_property_valuation: {
    label: 'Property Valuation (CMA)',
    tagline: 'Auto-generate comparative market analysis',
    reason:
      'Builds a CMA-style valuation from property details and provided comparables. Calibrated to residential real estate transactions.',
    eligibleVerticals: ['real_estate'],
  },
  tool_listing_description: {
    label: 'Listing Description Generator',
    tagline: 'MLS-compliant descriptions from photos + specs',
    reason:
      'Generates MLS-compliant listing descriptions that highlight key property features and avoid Fair Housing pitfalls.',
    eligibleVerticals: ['real_estate'],
  },
  tool_buyer_property_matcher: {
    label: 'Buyer-Property Matcher',
    tagline: 'Score properties against each buyer’s criteria',
    reason:
      'Scores available listings against a buyer’s must-haves and nice-to-haves. Specific to real estate brokerage workflows.',
    eligibleVerticals: ['real_estate'],
  },
  tool_mortgage_prequal: {
    label: 'Mortgage Pre-Qualification',
    tagline: 'Quick affordability screen before agent invests time',
    reason:
      'Performs a quick conventional/FHA/VA affordability screen so agents prioritise mortgage-ready buyers.',
    eligibleVerticals: ['real_estate'],
  },
  tool_neighborhood_insights: {
    label: 'Neighborhood Insights',
    tagline: 'Schools, crime, walkability, comps for any address',
    reason:
      'Summarises schools, walkability, transit, and lifestyle attributes for any address. Built for buyer-side real estate consults.',
    eligibleVerticals: ['real_estate'],
  },

  // ============ AI Toolbox: SOLAR ============
  tool_roof_suitability: {
    label: 'Roof Suitability Analyzer',
    tagline: 'Estimate panel layout from address + photo',
    reason:
      'Analyses roof orientation, pitch, shading, and obstructions from an aerial or roof photo to estimate panel layout and production. Solar-installer workflow.',
    eligibleVerticals: ['solar'],
  },
  tool_utility_bill_parser: {
    label: 'Utility Bill Parser',
    tagline: 'Extract usage, rate plan & savings projection',
    reason:
      'Reads a utility bill PDF/image and extracts annual usage, rate schedule, and demand charges to project solar savings.',
    eligibleVerticals: ['solar'],
  },
  tool_incentive_finder: {
    label: 'Incentive & Rebate Finder',
    tagline: 'Federal/state/utility rebates by address',
    reason:
      'Finds applicable federal ITC, state, and utility-specific rebates for a proposed solar system based on customer address and system size.',
    eligibleVerticals: ['solar'],
  },
  tool_financing_optimizer: {
    label: 'Financing Optimizer',
    tagline: 'Loan vs lease vs PPA recommendation',
    reason:
      'Compares loan, lease, and PPA financing structures for a proposed solar install and recommends the best fit. Solar-finance specific.',
    eligibleVerticals: ['solar'],
  },
  tool_permit_tracker: {
    label: 'Permit Status Tracker',
    tagline: 'Workflow + timeline for any AHJ',
    reason:
      'Tracks the typical permitting workflow and timeline for the customer’s Authority Having Jurisdiction (AHJ). Built for solar installer operations.',
    eligibleVerticals: ['solar'],
  },

  // ============ AI Toolbox: MASS TORT LEGAL ============
  tool_sol_calculator: {
    label: 'Statute of Limitations Calculator',
    tagline: 'Per-state, per-tort SOL with deadline alerts',
    reason:
      'Calculates statute-of-limitations deadlines per state and per tort type, with discovery rule and tolling considerations. Strictly a legal-practice tool.',
    eligibleVerticals: ['mass_tort'],
    legalOnly: true,
  },
  tool_medical_records_summarizer: {
    label: 'Medical Records Summarizer',
    tagline: '500-page records → 2-page case-relevant summary',
    reason:
      'Summarises lengthy medical records into a case-relevant brief highlighting causation, damages, and treatment chronology. Designed for personal-injury and mass-tort intake.',
    eligibleVerticals: ['mass_tort'],
    legalOnly: true,
  },
  tool_co_counsel_referral: {
    label: 'Co-Counsel Referral AI',
    tagline: 'Match cases to firms with required jurisdiction/specialty',
    reason:
      'Matches a case to firms with the required jurisdiction admission and tort specialty for co-counsel or referral arrangements.',
    eligibleVerticals: ['mass_tort'],
    legalOnly: true,
  },
  tool_mdl_bellwether_tracker: {
    label: 'MDL Bellwether Tracker',
    tagline: 'Bellwether trial signals & settlement projections',
    reason:
      'Tracks bellwether trial signals across MDLs and projects settlement timing and value. Specific to multidistrict litigation practice.',
    eligibleVerticals: ['mass_tort'],
    legalOnly: true,
  },
  tool_demand_letter_drafter: {
    label: 'Demand Letter Drafter',
    tagline: 'First-draft demand letter from facts + medicals',
    reason:
      'Drafts a first-pass demand letter from case facts, liability analysis, and medical-damages summary. Calibrated for personal-injury and mass-tort claims.',
    eligibleVerticals: ['mass_tort'],
    legalOnly: true,
  },

  // ============ AI Toolbox: HOME SERVICES ============
  tool_photo_estimate: {
    label: 'Photo-Based Estimate',
    tagline: 'Customer photo → job size + parts + cost range',
    reason:
      'Reads a customer-provided photo of the issue (plumbing, HVAC, roofing, etc.) and returns an estimated job size, parts list, and cost range.',
    eligibleVerticals: ['home_services'],
  },
  tool_service_area_optimizer: {
    label: 'Service Area Optimizer',
    tagline: 'Optimal routes & schedules to minimize drive time',
    reason:
      'Optimises technician routes and schedules across the day to minimise drive time and maximise billable hours. Built for field-service operations.',
    eligibleVerticals: ['home_services'],
  },
  tool_seasonal_demand_forecaster: {
    label: 'Seasonal Demand Forecaster',
    tagline: 'Predict call volume spikes for staffing/inventory',
    reason:
      'Forecasts seasonal call-volume spikes (e.g., AC season, frozen pipes) to plan staffing and inventory. Tuned to home-services patterns.',
    eligibleVerticals: ['home_services'],
  },
  tool_review_response: {
    label: 'Review Response AI',
    tagline: 'Pro responses to Google/Yelp reviews',
    reason:
      'Drafts professional, brand-safe responses to Google and Yelp reviews. Useful for any local business with high review volume — currently scoped to home services.',
    eligibleVerticals: ['home_services'],
  },
  tool_upsell_recommender: {
    label: 'Upsell Recommender',
    tagline: 'Suggest related services post-job',
    reason:
      'Suggests related services to recommend after a completed job (e.g., water heater after plumbing repair). Built for home-services upsell motions.',
    eligibleVerticals: ['home_services'],
  },

  // ============ AI Toolbox: CROSS-VERTICAL ============
  tool_voice_receptionist: {
    label: 'Voice AI Receptionist',
    tagline: '24/7 inbound call handling + intake',
    reason:
      '24/7 inbound voice AI that answers calls, qualifies leads, and books appointments. Available across all verticals.',
    eligibleVerticals: ALL_VERTICALS,
  },
  tool_sms_conversational: {
    label: 'SMS Conversational AI',
    tagline: '2-way texting that qualifies leads',
    reason:
      'Two-way SMS AI that engages new leads, qualifies them, and books next steps. Available across all verticals.',
    eligibleVerticals: ALL_VERTICALS,
  },
  tool_crm_hygiene: {
    label: 'CRM Hygiene Bot',
    tagline: 'Find duplicates, missing fields, stale records',
    reason:
      'Scans CRM exports for duplicate, incomplete, and stale records and produces a clean-up plan. Available across all verticals.',
    eligibleVerticals: ALL_VERTICALS,
  },
  tool_email_sequence: {
    label: 'Email Sequence AI',
    tagline: '5-email nurture drips that adapt to engagement',
    reason:
      'Generates multi-step email nurture sequences that adapt to engagement signals. Available across all verticals.',
    eligibleVerticals: ALL_VERTICALS,
  },
  tool_compliance_auditor: {
    label: 'Compliance Auditor',
    tagline: 'Scan for TCPA / HIPAA / advertising violations',
    reason:
      'Scans recordings, SMS logs, and marketing copy for TCPA, HIPAA, and advertising-rule risk. Available across all verticals.',
    eligibleVerticals: ALL_VERTICALS,
  },
};

export function getModuleMetadata(key: ModuleKey): ModuleMetadata | undefined {
  return MODULE_METADATA[key];
}
