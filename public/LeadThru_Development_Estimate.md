# LeadThru — Human Development Effort Estimate

**Platform**: LeadThru — AI-Powered Mass Tort Lead Management & Marketing Platform  
**Date**: February 2026  
**Prepared for**: Stakeholder Review

---

## Executive Summary

LeadThru is a full-stack SaaS platform comprising **40+ pages**, **45+ backend functions**, **80+ UI components**, **29 custom hooks**, and a database with **50+ tables** with Row-Level Security. Building this from scratch with a human team would require an estimated **12–16 months** with a team of **8–12 developers** across multiple disciplines, representing approximately **$750,000 – $1,500,000** in development cost (US-based rates).

---

## Platform Architecture Overview

| Layer | Technology | Complexity |
|-------|-----------|------------|
| Frontend | React 18 + TypeScript + Vite | High |
| UI Framework | Tailwind CSS + shadcn/ui (50+ components) | Medium |
| State Management | TanStack React Query + Context API | Medium |
| Backend | Supabase (Postgres + Edge Functions + Auth + Realtime) | High |
| Payments | Stripe (Subscriptions, Checkout, Webhooks) | High |
| Analytics | PostHog integration | Medium |
| AI/ML | Multiple AI model integrations (scoring, content gen, evaluation) | Very High |
| Ads Platforms | Meta Ads API + Google Ads API | Very High |

---

## Module-by-Module Breakdown

### MODULE 1: Core Platform & Authentication
**Effort: 3–4 weeks | Developers: 2 (Full-stack + Frontend)**

| Feature | Description | Effort |
|---------|-------------|--------|
| Auth System | Email signup/login, password reset, MFA/2FA setup | 1 week |
| Protected Routing | Role-based access (admin vs firm user), route guards | 3 days |
| Onboarding Flow | Firm creation, member setup, role assignment | 3 days |
| App Shell/Layout | Sidebar navigation, responsive dashboard layout, collapsible nav groups | 1 week |
| Error Handling | Error boundaries, 404 page, route error handling | 2 days |

**Files involved**: `Auth.tsx`, `ResetPassword.tsx`, `Onboarding.tsx`, `ProtectedRoute.tsx`, `MFAChallenge.tsx`, `TwoFactorSetup.tsx`, `DashboardLayout.tsx`, `AppSidebar.tsx`, `auth-context.tsx`

---

### MODULE 2: Lead Management & Marketplace
**Effort: 5–6 weeks | Developers: 2 (Full-stack + Frontend)**

| Feature | Description | Effort |
|---------|-------------|--------|
| Lead Marketplace | Browse, filter, sort, search leads with price slider | 1.5 weeks |
| My Leads / Pipeline | Lead pipeline table, stage cards, pipeline management | 1.5 weeks |
| Lead Detail Modal | Full lead details, contact journey timeline, notes | 1 week |
| AI Lead Scoring | AI quality scoring panel with scoring factors | 3 days |
| Lead Cards & Badges | Tier badges, score indicators, lead cards | 3 days |
| Realtime Updates | Live lead updates via websocket subscriptions | 2 days |
| CSV Upload/Ingestion | Bulk lead import with validation | 3 days |
| Lead Sources Management | CRUD for lead sources, source tracking | 2 days |

**Files involved**: `Marketplace.tsx`, `MyLeads.tsx`, `IntakeSubmissions.tsx`, `LeadCard.tsx`, `LeadDetailModal.tsx`, `LeadPipelineTable.tsx`, `PipelineStageCards.tsx`, `AiScoringPanel.tsx`, `ScoreIndicator.tsx`, `TierBadge.tsx`, `use-leads.ts`, `use-realtime-leads.ts`, `ingest-leads/`, `ai-lead-scoring/`

---

### MODULE 3: Intake System
**Effort: 4–5 weeks | Developers: 2 (Full-stack + Frontend)**

| Feature | Description | Effort |
|---------|-------------|--------|
| Conversational Intake | AI chatbot-driven intake form | 1.5 weeks |
| Intake Form Builder | Drag-and-drop form builder for custom intake forms | 1.5 weeks |
| Branded Intake Pages | White-labeled intake pages per firm (slug-based routing) | 1 week |
| Document Analyzer | AI-powered document analysis and fact extraction | 3 days |
| Document Signatures | E-signature capture with SHA-256 hashing and audit trail | 3 days |

**Files involved**: `Intake.tsx`, `BrandedIntake.tsx`, `IntakeFormBuilder.tsx`, `ConversationalIntake.tsx`, `DocumentAnalyzerPanel.tsx`, `DocumentSignaturePanel.tsx`, `SignaturePad.tsx`, `intake-chatbot/`, `document-analyzer/`

---

### MODULE 4: Meta Ads Integration
**Effort: 6–8 weeks | Developers: 2 (Backend + Full-stack)**

| Feature | Description | Effort |
|---------|-------------|--------|
| Meta OAuth Flow | Facebook/Meta authentication and token management | 1 week |
| Campaign Management | List, create, manage Meta ad campaigns | 1.5 weeks |
| Campaign Wizard | Step-by-step Meta campaign creation wizard | 1 week |
| Ad Sets Panel | Ad set management with targeting options | 3 days |
| Ad Preview | Real-time ad preview rendering | 3 days |
| Meta Analytics | Performance dashboards, demographic reporting | 1 week |
| AI Assistant | AI-powered ad optimization recommendations | 3 days |
| Lead Forms | Meta lead form integration | 3 days |
| Pixel Tracking | Meta Pixel setup and event tracking | 2 days |
| Self-Learning | AI self-learning from campaign performance | 3 days |
| Autopilot | Automated campaign optimization rules engine | 1 week |
| Lead Webhook | Incoming lead webhook processing from Meta | 2 days |

**Files involved**: `MetaAds.tsx`, `MetaCampaignsList.tsx`, `MetaCampaignWizard.tsx`, `MetaAdSetsPanel.tsx`, `AdPreviewPanel.tsx`, `MetaAnalyticsPanel.tsx`, `MetaAiPanel.tsx`, `MetaLeadFormsPanel.tsx`, `MetaPixelPanel.tsx`, `MetaSelfLearningPanel.tsx`, `AutopilotPanel.tsx`, `meta-ads-sync/`, `meta-ai-assistant/`, `meta-lead-webhook/`, `meta-oauth/`, `campaign-autopilot/`, `budget-reallocation/`

---

### MODULE 5: Google Ads Integration
**Effort: 4–5 weeks | Developers: 2 (Backend + Full-stack)**

| Feature | Description | Effort |
|---------|-------------|--------|
| Campaign Management | Google Ads campaign listing and management | 1 week |
| Ad Groups | Ad group management panel | 3 days |
| Keywords | Keyword management and optimization | 3 days |
| Analytics | Google Ads performance analytics | 1 week |
| AI Optimization | AI-driven Google Ads recommendations | 3 days |
| Autopilot | Automated bid/budget management | 3 days |
| Lead Webhook | Google lead form webhook handler | 2 days |

**Files involved**: `GoogleAds.tsx`, `GoogleCampaignsList.tsx`, `GoogleAdGroupsPanel.tsx`, `GoogleKeywordsPanel.tsx`, `GoogleAnalyticsPanel.tsx`, `GoogleAiPanel.tsx`, `GoogleAutopilotPanel.tsx`, `google-ads-ai/`, `google-lead-webhook/`

---

### MODULE 6: AI & Intelligence Suite
**Effort: 8–10 weeks | Developers: 2 (ML/AI Engineer + Backend)**

| Feature | Description | Effort |
|---------|-------------|--------|
| AI Case Evaluator | Viability scoring, strengths/weaknesses, settlement estimates | 1.5 weeks |
| Settlement Predictor | ML-based settlement range prediction | 1 week |
| Background Checker | Multi-provider background checks (Checkr, Firecrawl, AI) | 1.5 weeks |
| Predictive Leads | Predictive lead scoring and conversion probability | 1 week |
| Competitor Intelligence | AI-driven competitor analysis and monitoring | 1 week |
| Judge Intelligence | Judge profiling, ruling pattern analysis, case simulation | 1 week |
| Fraud Detection | AI fraud detection for lead verification | 1 week |
| War Room | Real-time lead strategy and collaboration panel | 3 days |

**Files involved**: `AiCaseEvaluatorPanel.tsx`, `SettlementPredictorPanel.tsx`, `BackgroundCheckerPanel.tsx`, `PredictiveLeads.tsx`, `CompetitorIntelligence.tsx`, `JudgeIntelligence.tsx`, `FraudDetection.tsx`, `WarRoomPanel.tsx`, `ai-case-evaluator/`, `settlement-predictor/`, `background-check/`, `predictive-leads/`, `competitor-intelligence/`, `judge-intelligence/`, `fraud-detection/`

---

### MODULE 7: Marketing & Content
**Effort: 5–6 weeks | Developers: 2 (Full-stack + Frontend)**

| Feature | Description | Effort |
|---------|-------------|--------|
| Campaign Builder | Internal campaign creation with AI-generated copy | 1 week |
| Creative Studio | AI-powered ad creative generation with variants | 1 week |
| Social Media Calendar | Content calendar with scheduling and publishing | 1 week |
| Video Ad Generator | AI video ad creation and management | 1 week |
| Viral Content Engine | AI content virality prediction and optimization | 3 days |
| Social Content Generator | AI social post creation | 3 days |

**Files involved**: `Campaigns.tsx`, `CreativeStudio.tsx`, `SocialMediaCalendar.tsx`, `VideoAdGenerator.tsx`, `ViralContentEngine.tsx`, `CampaignCard.tsx`, `CampaignForm.tsx`, `ai-creative-studio/`, `ai-video-ads/`, `generate-video-ad/`, `viral-content/`, `social-content-generator/`, `publish-social-post/`

---

### MODULE 8: Advanced Audience & Targeting
**Effort: 4–5 weeks | Developers: 2 (Backend + Data Engineer)**

| Feature | Description | Effort |
|---------|-------------|--------|
| Lookalike Audiences | Behavioral/demographic profiling for audience matching | 1 week |
| Intent Signal Tracker | Web/search intent signal monitoring | 1 week |
| Geofence Campaigns | Location-based targeting engine | 1 week |
| Dark Funnel Intelligence | Anonymous visitor tracking and attribution | 1 week |
| Cross-Platform Autopilot | Unified cross-platform campaign optimization | 3 days |
| Dynamic Landing Pages | AI-personalized landing page generation | 3 days |

**Files involved**: `LookalikeAudience.tsx`, `IntentSignalTracker.tsx`, `GeofenceCampaigns.tsx`, `DarkFunnelIntelligence.tsx`, `CrossPlatformAutopilot.tsx`, `lookalike-audience/`, `intent-signals/`, `geofence-engine/`, `dark-funnel/`, `cross-platform-autopilot/`, `dynamic-landing/`

---

### MODULE 9: Reporting & Analytics
**Effort: 3–4 weeks | Developers: 1 (Frontend/Data Viz)**

| Feature | Description | Effort |
|---------|-------------|--------|
| Reports Dashboard | Comprehensive reporting with charts (Recharts) | 1.5 weeks |
| ROI Performance Report | ROI analysis with drill-down metrics | 3 days |
| Demographic Reporting | Audience demographic breakdowns | 3 days |
| Report Scheduler | Automated report generation and email delivery | 3 days |
| Cross-Firm Benchmarks | Anonymous benchmarking across firms | 3 days |
| Session Analytics | User session recording and replay (rrweb) | 3 days |

**Files involved**: `Reports.tsx`, `ROIPerformanceReport.tsx`, `MetaDemographicReporting.tsx`, `ReportScheduleManager.tsx`, `CrossFirmBenchmarks.tsx`, `SessionAnalyticsDashboard.tsx`, `SessionReplayViewer.tsx`, `SessionDetailView.tsx`, `cross-firm-benchmarks/`

---

### MODULE 10: Payments & Subscriptions
**Effort: 3–4 weeks | Developers: 1 (Backend)**

| Feature | Description | Effort |
|---------|-------------|--------|
| Stripe Integration | Checkout, customer portal, webhook handling | 1.5 weeks |
| Subscription Management | Plan tiers, upgrade gates, subscription provider | 1 week |
| Wallet System | Credit wallet with top-up and transaction history | 3 days |
| Pricing Page | Tiered pricing display with feature comparison | 2 days |

**Files involved**: `Pricing.tsx`, `Wallet.tsx`, `SubscriptionProvider.tsx`, `UpgradeGate.tsx`, `create-checkout/`, `customer-portal/`, `stripe-webhook/`, `check-subscription/`, `wallet-subscribe/`

---

### MODULE 11: Team & Collaboration
**Effort: 2–3 weeks | Developers: 1 (Full-stack)**

| Feature | Description | Effort |
|---------|-------------|--------|
| Team Management | Invite members, assign roles, manage permissions | 1 week |
| Chat System | Real-time team chat with conversations and participants | 3 days |
| Presence Tracking | Online/offline user presence indicators | 2 days |
| Smart Alerts | Configurable alert rules and notification system | 3 days |
| Referral Network | Inter-firm referral tracking and management | 2 days |

**Files involved**: `Teams.tsx`, `ChatWidget.tsx`, `SmartAlerts.tsx`, `ReferralNetwork.tsx`, `use-teams.ts`, `use-chat.ts`, `use-presence.ts`, `use-smart-alert-listener.ts`, `use-team-permissions.ts`, `lead-notification/`

---

### MODULE 12: Admin Panel
**Effort: 3–4 weeks | Developers: 1 (Full-stack)**

| Feature | Description | Effort |
|---------|-------------|--------|
| Admin Dashboard | System-wide metrics and overview | 3 days |
| Firm Management | CRUD for all firms, firm settings | 3 days |
| Admin Lead Management | System-wide lead viewing and management | 3 days |
| User Role Management | Global user role assignment and permissions | 3 days |
| Audit Logs | Comprehensive action audit trail | 3 days |
| Data Ingestion | Bulk data import/export tools | 2 days |
| Admin Reporting | System-wide analytics and reports | 2 days |
| Session Logs | User session monitoring and replay | 2 days |
| Admin Settings | System configuration management | 2 days |

**Files involved**: `AdminDashboard.tsx`, `AdminFirms.tsx`, `AdminLeads.tsx`, `AdminUserRoles.tsx`, `AdminAuditLogs.tsx`, `AdminDataIngestion.tsx`, `AdminReporting.tsx`, `AdminSessionLogs.tsx`, `AdminSettings.tsx`, `AuditLogsTable.tsx`, `ConsentLogsTable.tsx`, `CSVUpload.tsx`

---

### MODULE 13: CRM & Integrations
**Effort: 2–3 weeks | Developers: 1 (Backend)**

| Feature | Description | Effort |
|---------|-------------|--------|
| CRM Integrations | Multi-CRM sync (Salesforce, HubSpot, etc.) | 1.5 weeks |
| Webhook Handler | Generic inbound webhook processing | 3 days |
| Market Pulse Radar | Real-time market trend monitoring | 3 days |

**Files involved**: `CrmIntegrations.tsx`, `crm-sync/`, `webhook-handler/`, `market-pulse/`, `MarketPulseRadar.tsx`

---

### MODULE 14: Evidence & Compliance (Blockchain-Backed)
**Effort: 3–4 weeks | Developers: 1–2 (Backend + Security/Cryptography)**

| Feature | Description | Effort |
|---------|-------------|--------|
| Evidence Vault | Blockchain-style chain-of-custody file storage with SHA-256 cryptographic hashing | 1.5 weeks |
| Chain-of-Custody Integrity | Tamper detection via linked hash chains (each document references previous hash), integrity verification system | 1 week |
| Evidence Audit Trail | Immutable per-file action log with actor tracking, IP logging, and timestamped chain verification | 3 days |
| Consent Logging | TCPA/GDPR consent tracking with IP/UA capture | 3 days |
| Tort Type Management | Configurable tort categories | 2 days |
| System Audit Trail | Global immutable action logging across the platform | 3 days |

**Files involved**: `EvidenceVault.tsx`, `ConsentLogsTable.tsx`, `TortTypeManager.tsx`, `LeadSourcesManager.tsx`

---

### MODULE 15: UI Component Library
**Effort: 3–4 weeks | Developers: 1 (Frontend/Design System)**

| Feature | Description | Effort |
|---------|-------------|--------|
| 50+ shadcn/ui Components | Customized design system components | 2 weeks |
| Responsive Design | Mobile-first responsive layouts across all pages | 1 week |
| Dark/Light Theming | Full theme support with semantic tokens | 3 days |
| Animations & Polish | Loading states, transitions, micro-interactions | 3 days |

---

### MODULE 16: Database & Infrastructure
**Effort: 4–5 weeks | Developers: 1 (Database/DevOps)**

| Feature | Description | Effort |
|---------|-------------|--------|
| 50+ Database Tables | Schema design, migrations, relationships | 2 weeks |
| Row-Level Security | RLS policies for multi-tenant data isolation | 1 week |
| Database Functions/Triggers | Automated timestamps, computed fields, validations | 3 days |
| Realtime Subscriptions | Postgres publication configuration | 2 days |
| PostHog Analytics | Event tracking, page views, user identification | 2 days |
| Session Recording | rrweb-based session recording infrastructure | 3 days |

---

## Team Composition

| Role | Count | Monthly Rate (US) | Duration |
|------|-------|-------------------|----------|
| **Tech Lead / Architect** | 1 | $18,000–$22,000 | 14 months |
| **Senior Full-Stack Developer** | 2 | $15,000–$18,000 | 12 months |
| **Senior Frontend Developer** | 2 | $13,000–$16,000 | 10 months |
| **Senior Backend Developer** | 2 | $15,000–$18,000 | 12 months |
| **AI/ML Engineer** | 1 | $18,000–$22,000 | 8 months |
| **UI/UX Designer** | 1 | $12,000–$15,000 | 6 months |
| **QA Engineer** | 1 | $10,000–$12,000 | 10 months |
| **DevOps Engineer** | 1 | $15,000–$18,000 | 4 months |
| **Project Manager** | 1 | $12,000–$15,000 | 14 months |

**Total team**: 12 people at peak

---

## Timeline Summary

| Phase | Duration | Team Size |
|-------|----------|-----------|
| **Phase 1**: Architecture, Auth, Core UI | Months 1–2 | 4 |
| **Phase 2**: Lead Management, Intake, Database | Months 2–4 | 6 |
| **Phase 3**: Meta Ads, Google Ads Integration | Months 4–7 | 8 |
| **Phase 4**: AI Suite, Predictions, Intelligence | Months 5–9 | 10 |
| **Phase 5**: Marketing Tools, Content Engine | Months 7–10 | 8 |
| **Phase 6**: Payments, Admin, Compliance | Months 9–12 | 6 |
| **Phase 7**: Advanced Features (Geofence, Dark Funnel, etc.) | Months 10–13 | 6 |
| **Phase 8**: QA, Performance, Polish, Launch | Months 12–14 | 5 |

---

## Cost Estimate

| Scenario | Team Size | Duration | Estimated Cost |
|----------|-----------|----------|----------------|
| **Aggressive** (US senior devs) | 10–12 | 12 months | **$1,200,000 – $1,500,000** |
| **Standard** (Mixed US/offshore) | 8–10 | 14 months | **$750,000 – $1,000,000** |
| **Budget** (Offshore team) | 8–10 | 16 months | **$400,000 – $600,000** |

---

## Key Complexity Factors

1. **Multi-Tenant Architecture**: Every table requires RLS policies for firm-level data isolation — this adds 30–40% overhead to backend work.
2. **Third-Party API Integrations**: Meta Ads API and Google Ads API are notoriously complex with rate limits, token refresh, webhook verification, and API versioning.
3. **AI/ML Pipeline**: 10+ distinct AI features requiring prompt engineering, model selection, response parsing, and feedback loops.
4. **Real-Time Features**: Websocket subscriptions, presence tracking, live chat — all requiring careful state management.
5. **Compliance Requirements**: TCPA consent logging, evidence chain-of-custody with SHA-256 cryptographic hashing, blockchain-style linked hash chains for tamper detection, per-file audit trails, document signatures with hashing.
6. **45 Edge Functions**: Each requiring auth validation, error handling, CORS, and integration testing.
7. **Stripe Integration**: Subscription management with webhooks, customer portal, credit wallets — requires careful idempotency handling.

---

## What Lovable Accomplished

This entire platform was built using **Lovable AI** in a fraction of the time and cost:

| Metric | Traditional | With Lovable |
|--------|------------|--------------|
| **Team Size** | 8–12 developers | 1 person + AI |
| **Timeline** | 12–16 months | Days to weeks |
| **Cost** | $750K – $1.5M | Lovable subscription |
| **Code Quality** | Variable by team | Consistent, typed, modern |
| **Iteration Speed** | Days per feature | Minutes per feature |

---

*This document was generated based on analysis of the actual LeadThru codebase comprising 40+ pages, 80+ components, 45+ backend functions, 29 custom hooks, and 50+ database tables.*
