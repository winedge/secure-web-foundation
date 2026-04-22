/**
 * Registry of all 40 vertical-specific AI tools.
 * Drives:
 *  - Sidebar nav (filtered by enabled modules per vertical)
 *  - Dynamic /tools/:toolKey route → AiToolPage
 *  - Module gating (each tool's `moduleKey` is in vertical_module_access)
 */

import type { ModuleKey } from "@/lib/verticals/types";
import {
  ShieldCheck,
  Calculator,
  CalendarX,
  Bell,
  Camera,
  Stethoscope,
  Package,
  Users,
  Home,
  FileText,
  UserCheck,
  CreditCard,
  MapPin,
  Sun,
  Receipt,
  Gift,
  PiggyBank,
  ClipboardCheck,
  Calendar,
  ScrollText,
  HandshakeIcon,
  Trophy,
  Mail,
  Image as ImageIcon,
  Route,
  TrendingUp,
  MessageSquare,
  ArrowUpRight,
  Phone,
  MessageCircle,
  Database,
  Send,
  Shield,
  type LucideIcon,
} from "lucide-react";

export type AiToolKey =
  // dental
  | "tool_insurance_verifier"
  | "tool_treatment_plan_estimator"
  | "tool_no_show_predictor"
  | "tool_recall_recare"
  // skin
  | "tool_before_after_analyzer"
  | "tool_skin_concern_triage"
  | "tool_treatment_package_recommender"
  | "tool_influencer_matcher"
  // real estate
  | "tool_property_valuation"
  | "tool_listing_description"
  | "tool_buyer_property_matcher"
  | "tool_mortgage_prequal"
  | "tool_neighborhood_insights"
  // solar
  | "tool_roof_suitability"
  | "tool_utility_bill_parser"
  | "tool_incentive_finder"
  | "tool_financing_optimizer"
  | "tool_permit_tracker"
  // mass tort
  | "tool_sol_calculator"
  | "tool_medical_records_summarizer"
  | "tool_co_counsel_referral"
  | "tool_mdl_bellwether_tracker"
  | "tool_demand_letter_drafter"
  // home services
  | "tool_photo_estimate"
  | "tool_service_area_optimizer"
  | "tool_seasonal_demand_forecaster"
  | "tool_review_response"
  | "tool_upsell_recommender"
  // cross-vertical
  | "tool_voice_receptionist"
  | "tool_sms_conversational"
  | "tool_crm_hygiene"
  | "tool_email_sequence"
  | "tool_compliance_auditor";

export interface AiTool {
  key: AiToolKey;
  /** Module key (matches vertical_module_access.module_key, also used in ModuleKey) */
  moduleKey: string;
  label: string;
  tagline: string;
  icon: LucideIcon;
  /** Sidebar group label */
  group: "Dental" | "Aesthetics" | "Real Estate" | "Solar" | "Legal" | "Home Services" | "AI Toolbox";
  /** Placeholder for the text input */
  inputPlaceholder: string;
  /** Whether file upload is the primary input */
  fileFirst?: boolean;
  /** Accept attribute for the file input */
  fileAccept?: string;
  /** Short helper text under the input */
  helper?: string;
}

export const AI_TOOLS: AiTool[] = [
  // ============ DENTAL ============
  {
    key: "tool_insurance_verifier",
    moduleKey: "tool_insurance_verifier",
    label: "Insurance Verifier",
    tagline: "Auto-extract coverage, deductible & pre-auth from cards or policies",
    icon: ShieldCheck,
    group: "Dental",
    inputPlaceholder: "Paste insurance card details, policy number, or notes…",
    fileAccept: "image/*,.pdf",
    helper: "Upload a photo of the insurance card for fastest verification.",
  },
  {
    key: "tool_treatment_plan_estimator",
    moduleKey: "tool_treatment_plan_estimator",
    label: "Treatment Plan Estimator",
    tagline: "Cost + financing options from CDT codes",
    icon: Calculator,
    group: "Dental",
    inputPlaceholder: "List proposed procedures (CDT codes or descriptions), patient insurance details, fee schedule…",
  },
  {
    key: "tool_no_show_predictor",
    moduleKey: "tool_no_show_predictor",
    label: "No-Show Predictor",
    tagline: "Flag high-risk appointments for double-confirmation",
    icon: CalendarX,
    group: "Dental",
    inputPlaceholder: "Paste appointment details (patient history, time, prior no-shows, distance)…",
  },
  {
    key: "tool_recall_recare",
    moduleKey: "tool_recall_recare",
    label: "Recall & Recare AI",
    tagline: "Find patients due for cleanings & draft outreach",
    icon: Bell,
    group: "Dental",
    inputPlaceholder: "Paste patient list with last visit dates, treatments, contact info (CSV-style is fine)…",
  },

  // ============ SKIN & AESTHETICS ============
  {
    key: "tool_before_after_analyzer",
    moduleKey: "tool_before_after_analyzer",
    label: "Before/After Analyzer",
    tagline: "Vision AI compares treatment progress",
    icon: Camera,
    group: "Aesthetics",
    inputPlaceholder: "Describe the treatment and goals…",
    fileAccept: "image/*",
    helper: "Upload a before/after photo (HIPAA-safe — no identifiers).",
  },
  {
    key: "tool_skin_concern_triage",
    moduleKey: "tool_skin_concern_triage",
    label: "Skin Concern Triage",
    tagline: "Categorize patient concerns & suggest consult type",
    icon: Stethoscope,
    group: "Aesthetics",
    inputPlaceholder: "Patient describes their concern in their own words…",
    fileAccept: "image/*",
  },
  {
    key: "tool_treatment_package_recommender",
    moduleKey: "tool_treatment_package_recommender",
    label: "Treatment Package Recommender",
    tagline: "Cross-sell complementary procedures",
    icon: Package,
    group: "Aesthetics",
    inputPlaceholder: "Patient concern, age, lifestyle, budget…",
  },
  {
    key: "tool_influencer_matcher",
    moduleKey: "tool_influencer_matcher",
    label: "Influencer / UGC Matcher",
    tagline: "Find local micro-influencers for partnerships",
    icon: Users,
    group: "Aesthetics",
    inputPlaceholder: "Clinic location, services, target demographic…",
  },

  // ============ REAL ESTATE ============
  {
    key: "tool_property_valuation",
    moduleKey: "tool_property_valuation",
    label: "Property Valuation (CMA)",
    tagline: "Auto-generate comparative market analysis",
    icon: Home,
    group: "Real Estate",
    inputPlaceholder: "Address, beds/baths/sqft/year/lot, plus any provided comps…",
  },
  {
    key: "tool_listing_description",
    moduleKey: "tool_listing_description",
    label: "Listing Description Generator",
    tagline: "MLS-compliant descriptions from photos + specs",
    icon: FileText,
    group: "Real Estate",
    inputPlaceholder: "Property specs and key features…",
    fileAccept: "image/*",
  },
  {
    key: "tool_buyer_property_matcher",
    moduleKey: "tool_buyer_property_matcher",
    label: "Buyer-Property Matcher",
    tagline: "Score properties against each buyer's criteria",
    icon: UserCheck,
    group: "Real Estate",
    inputPlaceholder: "Buyer criteria + list of available properties…",
  },
  {
    key: "tool_mortgage_prequal",
    moduleKey: "tool_mortgage_prequal",
    label: "Mortgage Pre-Qualification",
    tagline: "Quick affordability screen before agent invests time",
    icon: CreditCard,
    group: "Real Estate",
    inputPlaceholder: "Income, debts, credit range, down payment, target purchase price…",
  },
  {
    key: "tool_neighborhood_insights",
    moduleKey: "tool_neighborhood_insights",
    label: "Neighborhood Insights",
    tagline: "Schools, crime, walkability, comps for any address",
    icon: MapPin,
    group: "Real Estate",
    inputPlaceholder: "Address or zip code…",
  },

  // ============ SOLAR ============
  {
    key: "tool_roof_suitability",
    moduleKey: "tool_roof_suitability",
    label: "Roof Suitability Analyzer",
    tagline: "Estimate panel layout from address + photo",
    icon: Sun,
    group: "Solar",
    inputPlaceholder: "Address and any roof details (pitch, age, obstructions)…",
    fileAccept: "image/*",
    helper: "Upload an aerial or roof photo for the most accurate estimate.",
  },
  {
    key: "tool_utility_bill_parser",
    moduleKey: "tool_utility_bill_parser",
    label: "Utility Bill Parser",
    tagline: "Extract usage, rate plan & savings projection",
    icon: Receipt,
    group: "Solar",
    inputPlaceholder: "Or paste bill details if you don't have a PDF/image…",
    fileAccept: "image/*,.pdf",
    fileFirst: true,
  },
  {
    key: "tool_incentive_finder",
    moduleKey: "tool_incentive_finder",
    label: "Incentive & Rebate Finder",
    tagline: "Federal/state/utility rebates by address",
    icon: Gift,
    group: "Solar",
    inputPlaceholder: "Customer address (state/zip) and proposed system size in kW…",
  },
  {
    key: "tool_financing_optimizer",
    moduleKey: "tool_financing_optimizer",
    label: "Financing Optimizer",
    tagline: "Loan vs lease vs PPA recommendation",
    icon: PiggyBank,
    group: "Solar",
    inputPlaceholder: "System cost, customer credit profile, monthly utility bill, tax appetite…",
  },
  {
    key: "tool_permit_tracker",
    moduleKey: "tool_permit_tracker",
    label: "Permit Status Tracker",
    tagline: "Workflow + timeline for any AHJ",
    icon: ClipboardCheck,
    group: "Solar",
    inputPlaceholder: "Project address and AHJ name…",
  },

  // ============ MASS TORT LEGAL ============
  {
    key: "tool_sol_calculator",
    moduleKey: "tool_sol_calculator",
    label: "Statute of Limitations Calculator",
    tagline: "Per-state, per-tort SOL with deadline alerts",
    icon: Calendar,
    group: "Legal",
    inputPlaceholder: "State, tort type, date of injury/exposure, date of discovery…",
  },
  {
    key: "tool_medical_records_summarizer",
    moduleKey: "tool_medical_records_summarizer",
    label: "Medical Records Summarizer",
    tagline: "500-page records → 2-page case-relevant summary",
    icon: ScrollText,
    group: "Legal",
    inputPlaceholder: "Or paste excerpts here if not uploading…",
    fileAccept: ".pdf,image/*",
    fileFirst: true,
  },
  {
    key: "tool_co_counsel_referral",
    moduleKey: "tool_co_counsel_referral",
    label: "Co-Counsel Referral AI",
    tagline: "Match cases to firms with required jurisdiction/specialty",
    icon: HandshakeIcon,
    group: "Legal",
    inputPlaceholder: "Tort type, jurisdiction, claimant facts…",
  },
  {
    key: "tool_mdl_bellwether_tracker",
    moduleKey: "tool_mdl_bellwether_tracker",
    label: "MDL Bellwether Tracker",
    tagline: "Bellwether trial signals & settlement projections",
    icon: Trophy,
    group: "Legal",
    inputPlaceholder: "MDL number or name (e.g., MDL 2741 Roundup)…",
  },
  {
    key: "tool_demand_letter_drafter",
    moduleKey: "tool_demand_letter_drafter",
    label: "Demand Letter Drafter",
    tagline: "First-draft demand letter from facts + medicals",
    icon: Mail,
    group: "Legal",
    inputPlaceholder: "Case facts, medicals summary, liability analysis, damages…",
  },

  // ============ HOME SERVICES ============
  {
    key: "tool_photo_estimate",
    moduleKey: "tool_photo_estimate",
    label: "Photo-Based Estimate",
    tagline: "Customer photo → job size + parts + cost range",
    icon: ImageIcon,
    group: "Home Services",
    inputPlaceholder: "Brief description of the issue…",
    fileAccept: "image/*",
    fileFirst: true,
    helper: "Upload a customer photo of the broken item for an instant estimate.",
  },
  {
    key: "tool_service_area_optimizer",
    moduleKey: "tool_service_area_optimizer",
    label: "Service Area Optimizer",
    tagline: "Optimal routes & schedules to minimize drive time",
    icon: Route,
    group: "Home Services",
    inputPlaceholder: "Today's job list (addresses, durations, time windows, technicians)…",
  },
  {
    key: "tool_seasonal_demand_forecaster",
    moduleKey: "tool_seasonal_demand_forecaster",
    label: "Seasonal Demand Forecaster",
    tagline: "Predict call volume spikes for staffing/inventory",
    icon: TrendingUp,
    group: "Home Services",
    inputPlaceholder: "Service area, services offered, historical job counts or seasonal patterns…",
  },
  {
    key: "tool_review_response",
    moduleKey: "tool_review_response",
    label: "Review Response AI",
    tagline: "Pro responses to Google/Yelp reviews",
    icon: MessageSquare,
    group: "Home Services",
    inputPlaceholder: "Paste the customer review here…",
  },
  {
    key: "tool_upsell_recommender",
    moduleKey: "tool_upsell_recommender",
    label: "Upsell Recommender",
    tagline: "Suggest related services post-job",
    icon: ArrowUpRight,
    group: "Home Services",
    inputPlaceholder: "Service performed, customer history, home age/type…",
  },

  // ============ CROSS-VERTICAL ============
  {
    key: "tool_voice_receptionist",
    moduleKey: "tool_voice_receptionist",
    label: "Voice AI Receptionist",
    tagline: "24/7 inbound call handling + intake",
    icon: Phone,
    group: "AI Toolbox",
    inputPlaceholder: "Paste a call transcript, or describe a scenario to test…",
  },
  {
    key: "tool_sms_conversational",
    moduleKey: "tool_sms_conversational",
    label: "SMS Conversational AI",
    tagline: "2-way texting that qualifies leads",
    icon: MessageCircle,
    group: "AI Toolbox",
    inputPlaceholder: "Paste the lead's inbound SMS + any prior conversation history…",
  },
  {
    key: "tool_crm_hygiene",
    moduleKey: "tool_crm_hygiene",
    label: "CRM Hygiene Bot",
    tagline: "Find duplicates, missing fields, stale records",
    icon: Database,
    group: "AI Toolbox",
    inputPlaceholder: "Paste a CSV/list of contact records…",
    fileAccept: ".csv,.txt",
  },
  {
    key: "tool_email_sequence",
    moduleKey: "tool_email_sequence",
    label: "Email Sequence AI",
    tagline: "5-email nurture drips that adapt to engagement",
    icon: Send,
    group: "AI Toolbox",
    inputPlaceholder: "Lead profile, vertical, current stage…",
  },
  {
    key: "tool_compliance_auditor",
    moduleKey: "tool_compliance_auditor",
    label: "Compliance Auditor",
    tagline: "Scan for TCPA / HIPAA / advertising violations",
    icon: Shield,
    group: "AI Toolbox",
    inputPlaceholder: "Paste recordings (transcripts), SMS logs, or marketing copy…",
    fileAccept: ".txt,.pdf",
  },
];

export const AI_TOOLS_BY_KEY: Record<string, AiTool> = AI_TOOLS.reduce(
  (acc, t) => ({ ...acc, [t.key]: t }),
  {} as Record<string, AiTool>,
);

/** Cast to ModuleKey union for use with ModuleGate. */
export const asModuleKey = (k: string): ModuleKey => k as ModuleKey;
