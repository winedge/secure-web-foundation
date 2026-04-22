/**
 * Industry Vertical Type Definitions
 * Shared TypeScript types for the multi-vertical system.
 */

export type VerticalSlug =
  | 'mass_tort'
  | 'skin_clinic'
  | 'real_estate'
  | 'solar'
  | 'dental'
  | 'home_services'
  | 'custom';

export type ModuleKey =
  | 'lead_scoring'
  | 'case_evaluator'
  | 'document_analyzer'
  | 'intake_chatbot'
  | 'background_check'
  | 'settlement_predictor'
  | 'judge_intelligence'
  | 'predictive_leads'
  | 'creative_studio'
  | 'viral_content'
  | 'video_ads'
  | 'social_calendar'
  | 'competitor_intel'
  | 'market_pulse'
  | 'intent_signals'
  | 'dark_funnel'
  | 'lookalike'
  | 'geofence'
  | 'fraud_detection'
  | 'meta_ads'
  | 'google_ads'
  | 'cross_platform_autopilot'
  | 'evidence_vault'
  | 'benchmarks'
  // ===== AI Toolbox: Dental =====
  | 'tool_insurance_verifier'
  | 'tool_treatment_plan_estimator'
  | 'tool_no_show_predictor'
  | 'tool_recall_recare'
  // ===== AI Toolbox: Skin / Aesthetics =====
  | 'tool_before_after_analyzer'
  | 'tool_skin_concern_triage'
  | 'tool_treatment_package_recommender'
  | 'tool_influencer_matcher'
  // ===== AI Toolbox: Real Estate =====
  | 'tool_property_valuation'
  | 'tool_listing_description'
  | 'tool_buyer_property_matcher'
  | 'tool_mortgage_prequal'
  | 'tool_neighborhood_insights'
  // ===== AI Toolbox: Solar =====
  | 'tool_roof_suitability'
  | 'tool_utility_bill_parser'
  | 'tool_incentive_finder'
  | 'tool_financing_optimizer'
  | 'tool_permit_tracker'
  // ===== AI Toolbox: Mass Tort Legal =====
  | 'tool_sol_calculator'
  | 'tool_medical_records_summarizer'
  | 'tool_co_counsel_referral'
  | 'tool_mdl_bellwether_tracker'
  | 'tool_demand_letter_drafter'
  // ===== AI Toolbox: Home Services =====
  | 'tool_photo_estimate'
  | 'tool_service_area_optimizer'
  | 'tool_seasonal_demand_forecaster'
  | 'tool_review_response'
  | 'tool_upsell_recommender'
  // ===== AI Toolbox: Cross-vertical =====
  | 'tool_voice_receptionist'
  | 'tool_sms_conversational'
  | 'tool_crm_hygiene'
  | 'tool_email_sequence'
  | 'tool_compliance_auditor';

export interface IndustryVertical {
  id: string;
  slug: VerticalSlug;
  name: string;
  description: string | null;
  icon: string | null;
  is_system: boolean;
  is_active: boolean;
}

export interface PipelineStage {
  id: string;
  vertical_id: string;
  firm_id: string | null;
  stage_key: string;
  label: string;
  stage_order: number;
  default_fee: number;
  icon: string | null;
  color: string | null;
  requires_payment: boolean;
  is_active: boolean;
}

export interface IntakeField {
  id: string;
  vertical_id: string;
  firm_id: string | null;
  field_key: string;
  label: string;
  field_type: 'text' | 'select' | 'number' | 'date' | 'textarea' | 'email' | 'phone';
  options: Array<{ value: string; label: string }> | string[];
  required: boolean;
  field_order: number;
  placeholder: string | null;
  validation_regex: string | null;
  is_active: boolean;
}

export interface LeadCategory {
  id: string;
  vertical_id: string;
  firm_id: string | null;
  key: string;
  label: string;
  description: string | null;
  is_active: boolean;
}

export interface VerticalTerminology {
  lead_singular?: string;
  lead_plural?: string;
  category_label?: string;
  category_plural?: string;
  evaluator_title?: string;
  evaluator_subject?: string;
  marketplace_title?: string;
  pipeline_title?: string;
  client_singular?: string;
  client_plural?: string;
  [key: string]: string | undefined;
}

export interface VerticalConfig {
  vertical: IndustryVertical;
  stages: PipelineStage[];
  intake_fields: IntakeField[];
  categories: LeadCategory[];
  terminology: VerticalTerminology;
  enabled_modules: ModuleKey[];
}
