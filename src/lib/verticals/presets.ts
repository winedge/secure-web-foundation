/**
 * Vertical Presets - Client-side fallback / display data
 * Used for onboarding selector UI and as fallback when config fetch fails.
 * Source of truth lives in the database (industry_verticals + related tables).
 */

import type { ModuleKey, VerticalSlug } from './types';

export interface VerticalPreset {
  slug: VerticalSlug;
  name: string;
  description: string;
  icon: string;
  highlights: string[];
  exampleStages: string[];
  exampleCategories: string[];
  enabledModules: ModuleKey[];
}

export const VERTICAL_PRESETS: VerticalPreset[] = [
  {
    slug: 'mass_tort',
    name: 'Mass Tort Legal',
    description: 'Personal injury, mass tort, and class action law firms',
    icon: 'Scale',
    highlights: ['Settlement predictor', 'Judge intelligence', 'Evidence vault', 'HIPAA + TCPA compliant'],
    exampleStages: ['New Lead', 'Call Verification', 'Medical Records', 'Retainer Signed'],
    exampleCategories: ['Camp Lejeune', 'Roundup', 'AFFF', 'Talcum Powder'],
    enabledModules: [
      'lead_scoring','case_evaluator','document_analyzer','intake_chatbot','background_check',
      'settlement_predictor','judge_intelligence','predictive_leads','creative_studio',
      'viral_content','video_ads','social_calendar','competitor_intel','market_pulse',
      'intent_signals','dark_funnel','lookalike','geofence','fraud_detection',
      'meta_ads','google_ads','cross_platform_autopilot','evidence_vault','benchmarks','website_doctor',
    ],
  },
  {
    slug: 'skin_clinic',
    name: 'Skin & Aesthetics Clinic',
    description: 'Dermatology, cosmetic, and medspa practices',
    icon: 'Sparkles',
    highlights: ['Patient inquiry routing', 'Treatment plan AI', 'HIPAA compliant intake', 'Social ads'],
    exampleStages: ['New Inquiry', 'Consultation', 'Treatment Plan', 'Booked'],
    exampleCategories: ['Botox', 'Fillers', 'Laser', 'Acne Treatment'],
    enabledModules: [
      'lead_scoring','case_evaluator','document_analyzer','intake_chatbot','background_check',
      'creative_studio','viral_content','video_ads','social_calendar','competitor_intel',
      'lookalike','meta_ads','google_ads','cross_platform_autopilot','benchmarks','fraud_detection','website_doctor',
      'gmb_manager','seo_suite','tool_seo_deep_scan','tool_keyword_research','tool_backlink_audit','tool_local_citations','tool_review_manager','tool_gmb_post_scheduler',
    ],
  },
  {
    slug: 'real_estate',
    name: 'Real Estate',
    description: 'Residential and commercial real estate brokerages',
    icon: 'Home',
    highlights: ['Buyer/seller scoring', 'Market pulse', 'Lookalike audiences', 'Listing ad creative'],
    exampleStages: ['New Lead', 'Qualified', 'Showing', 'Offer', 'Closed'],
    exampleCategories: ['Buy', 'Sell', 'Rent', 'Commercial'],
    enabledModules: [
      'lead_scoring','case_evaluator','document_analyzer','intake_chatbot','background_check',
      'predictive_leads','creative_studio','viral_content','video_ads','social_calendar',
      'competitor_intel','market_pulse','intent_signals','dark_funnel','lookalike',
      'geofence','fraud_detection','meta_ads','google_ads','cross_platform_autopilot','benchmarks','website_doctor',
      'gmb_manager','seo_suite','tool_seo_deep_scan','tool_keyword_research','tool_backlink_audit','tool_local_citations','tool_review_manager','tool_gmb_post_scheduler',
    ],
  },
  {
    slug: 'solar',
    name: 'Solar & Energy',
    description: 'Solar installation, battery storage, and renewable energy',
    icon: 'Sun',
    highlights: ['Site qualification AI', 'Geofence campaigns', 'Quote generation', 'Cross-platform autopilot'],
    exampleStages: ['New Lead', 'Site Survey', 'Quote', 'Contract'],
    exampleCategories: ['Residential', 'Commercial', 'Battery', 'EV Charger'],
    enabledModules: [
      'lead_scoring','case_evaluator','document_analyzer','intake_chatbot',
      'creative_studio','viral_content','video_ads','social_calendar','competitor_intel',
      'intent_signals','geofence','fraud_detection','meta_ads','google_ads',
      'cross_platform_autopilot','benchmarks','website_doctor',
      'gmb_manager','seo_suite','tool_seo_deep_scan','tool_keyword_research','tool_backlink_audit','tool_local_citations','tool_review_manager','tool_gmb_post_scheduler',
    ],
  },
  {
    slug: 'dental',
    name: 'Dental Practice',
    description: 'General, cosmetic, and orthodontic dental practices',
    icon: 'Smile',
    highlights: ['Patient AI intake', 'Insurance qualification', 'Treatment plan AI', 'Social campaigns'],
    exampleStages: ['New Inquiry', 'Consultation', 'Quote', 'Booked'],
    exampleCategories: ['Implants', 'Orthodontics', 'Cosmetic', 'General'],
    enabledModules: [
      'lead_scoring','case_evaluator','document_analyzer','intake_chatbot','background_check',
      'creative_studio','viral_content','video_ads','social_calendar','competitor_intel',
      'lookalike','meta_ads','google_ads','cross_platform_autopilot','benchmarks','fraud_detection','website_doctor',
      'gmb_manager','seo_suite','tool_seo_deep_scan','tool_keyword_research','tool_backlink_audit','tool_local_citations','tool_review_manager','tool_gmb_post_scheduler',
    ],
  },
  {
    slug: 'home_services',
    name: 'Home Services',
    description: 'HVAC, plumbing, roofing, landscaping, and home improvement',
    icon: 'Wrench',
    highlights: ['Job qualification AI', 'Geofence by service area', 'Estimate generation', 'Lead scoring'],
    exampleStages: ['New Lead', 'Estimate', 'Scheduled', 'Completed'],
    exampleCategories: ['HVAC', 'Plumbing', 'Roofing', 'Landscaping'],
    enabledModules: [
      'lead_scoring','case_evaluator','document_analyzer','intake_chatbot',
      'creative_studio','viral_content','video_ads','social_calendar','competitor_intel',
      'intent_signals','geofence','fraud_detection','meta_ads','google_ads',
      'cross_platform_autopilot','benchmarks','website_doctor',
      'gmb_manager','seo_suite','tool_seo_deep_scan','tool_keyword_research','tool_backlink_audit','tool_local_citations','tool_review_manager','tool_gmb_post_scheduler',
    ],
  },
];

/** Default fallback terminology when DB fetch fails */
export const DEFAULT_TERMINOLOGY = {
  lead_singular: 'Lead',
  lead_plural: 'Leads',
  category_label: 'Category',
  category_plural: 'Categories',
  evaluator_title: 'AI Lead Evaluator',
  evaluator_subject: 'lead',
  marketplace_title: 'Lead Marketplace',
  pipeline_title: 'Lead Pipeline',
  client_singular: 'Client',
  client_plural: 'Clients',
};

/** Default mass-tort fallback config used when DB unavailable */
export const FALLBACK_VERTICAL_CONFIG = {
  vertical: {
    id: '',
    slug: 'mass_tort' as VerticalSlug,
    name: 'Mass Tort Legal',
    description: '',
    icon: 'Scale',
    is_system: true,
    is_active: true,
  },
  stages: [
    { id: '1', vertical_id: '', firm_id: null, stage_key: 'new_lead', label: 'New Lead', stage_order: 1, default_fee: 0, icon: 'Users', color: 'text-primary', requires_payment: false, is_active: true },
    { id: '2', vertical_id: '', firm_id: null, stage_key: 'call_verification', label: 'Call Verification', stage_order: 2, default_fee: 50, icon: 'PhoneCall', color: 'text-warning', requires_payment: true, is_active: true },
    { id: '3', vertical_id: '', firm_id: null, stage_key: 'medical_records', label: 'Medical Records', stage_order: 3, default_fee: 200, icon: 'FileText', color: 'text-accent-foreground', requires_payment: true, is_active: true },
    { id: '4', vertical_id: '', firm_id: null, stage_key: 'retainer', label: 'Retainer Signed', stage_order: 4, default_fee: 0, icon: 'Scale', color: 'text-success', requires_payment: false, is_active: true },
  ],
  intake_fields: [],
  categories: [],
  terminology: {
    lead_singular: 'Lead', lead_plural: 'Leads',
    category_label: 'Tort Type', category_plural: 'Tort Types',
    evaluator_title: 'AI Case Evaluator', evaluator_subject: 'case',
    marketplace_title: 'Mass Tort Marketplace', pipeline_title: 'Case Pipeline',
    client_singular: 'Claimant', client_plural: 'Claimants',
  },
  enabled_modules: [
    'lead_scoring','case_evaluator','document_analyzer','intake_chatbot','background_check',
    'settlement_predictor','judge_intelligence','predictive_leads','creative_studio',
    'viral_content','video_ads','social_calendar','competitor_intel','market_pulse',
    'intent_signals','dark_funnel','lookalike','geofence','fraud_detection',
    'meta_ads','google_ads','cross_platform_autopilot','evidence_vault','benchmarks','website_doctor',
  ] as ModuleKey[],
};
