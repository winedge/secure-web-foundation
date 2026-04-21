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
  | 'benchmarks';

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
