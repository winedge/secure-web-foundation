import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { PostHogProvider, PostHogPageView } from "@/lib/posthog";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SubscriptionProvider } from "@/components/subscription/SubscriptionProvider";
import { VerticalProvider } from "@/lib/verticals/vertical-context";
import { ModuleGate } from "@/components/verticals/ModuleGate";
import { RouteErrorBoundary } from "@/components/error/RouteErrorBoundary";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { ZKUnlockDialog } from "@/components/auth/ZKUnlockDialog";
import { usePresence } from "@/hooks/use-presence";
import { useSmartAlertListener } from "@/hooks/use-smart-alert-listener";
import { Suspense, lazy } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Loader2 } from "lucide-react";

// Eager-loaded routes (landing, auth - needed immediately)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

type LazyImporter<T extends { default: React.ComponentType<any> }> = () => Promise<T>;

const isRecoverableLazyImportError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /importing a module script failed|failed to fetch dynamically imported module|loading chunk|chunkloaderror/i.test(message);
};

const lazyWithRetry = <T extends { default: React.ComponentType<any> }>(importer: LazyImporter<T>) =>
  lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      if (isRecoverableLazyImportError(error) && typeof window !== "undefined") {
        const reloadKey = "leadthru:lazy-import-reload";
        const lastReload = Number(window.sessionStorage.getItem(reloadKey) || 0);

        if (Date.now() - lastReload > 30_000) {
          window.sessionStorage.setItem(reloadKey, String(Date.now()));
          window.location.reload();
          return new Promise<T>(() => undefined);
        }
      }

      throw error;
    }
  });

// Lazy-loaded routes
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));
const Intake = lazyWithRetry(() => import("./pages/Intake"));
const BrandedIntake = lazyWithRetry(() => import("./pages/BrandedIntake"));
const IntakeFormBuilder = lazyWithRetry(() => import("./pages/IntakeFormBuilder"));
const LandingPreviewByToken = lazyWithRetry(() => import("./pages/LandingPreviewByToken"));
const Marketplace = lazyWithRetry(() => import("./pages/Marketplace"));
const MyLeads = lazyWithRetry(() => import("./pages/MyLeads"));
const IntakeSubmissions = lazyWithRetry(() => import("./pages/IntakeSubmissions"));
const Wallet = lazyWithRetry(() => import("./pages/Wallet"));
const Campaigns = lazyWithRetry(() => import("./pages/Campaigns"));
const MetaAds = lazyWithRetry(() => import("./pages/MetaAds"));
const Reports = lazyWithRetry(() => import("./pages/Reports"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing"));
const SocialMediaCalendar = lazyWithRetry(() => import("./pages/SocialMediaCalendar"));
const Teams = lazyWithRetry(() => import("./pages/Teams"));
const CompetitorIntelligence = lazyWithRetry(() => import("./pages/CompetitorIntelligence"));
const SmartAlerts = lazyWithRetry(() => import("./pages/SmartAlerts"));
const ReferralNetwork = lazyWithRetry(() => import("./pages/ReferralNetwork"));
const MarketPulseRadar = lazyWithRetry(() => import("./pages/MarketPulseRadar"));
const JudgeIntelligence = lazyWithRetry(() => import("./pages/JudgeIntelligence"));
const EvidenceVault = lazyWithRetry(() => import("./pages/EvidenceVault"));
const PredictiveLeads = lazyWithRetry(() => import("./pages/PredictiveLeads"));
const CrossFirmBenchmarks = lazyWithRetry(() => import("./pages/CrossFirmBenchmarks"));
const CreativeStudio = lazyWithRetry(() => import("./pages/CreativeStudio"));
const ViralContentEngine = lazyWithRetry(() => import("./pages/ViralContentEngine"));
const VideoAdGenerator = lazyWithRetry(() => import("./pages/VideoAdGenerator"));
const GoogleAds = lazyWithRetry(() => import("./pages/GoogleAds"));

const LookalikeAudience = lazyWithRetry(() => import("./pages/LookalikeAudience"));
const IntentSignalTracker = lazyWithRetry(() => import("./pages/IntentSignalTracker"));
const GeofenceCampaigns = lazyWithRetry(() => import("./pages/GeofenceCampaigns"));
const DarkFunnelIntelligence = lazyWithRetry(() => import("./pages/DarkFunnelIntelligence"));
const CrossPlatformAutopilot = lazyWithRetry(() => import("./pages/CrossPlatformAutopilot"));
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"));
const AdminFirms = lazyWithRetry(() => import("./pages/admin/AdminFirms"));
const AdminLeads = lazyWithRetry(() => import("./pages/admin/AdminLeads"));
const AdminAuditLogs = lazyWithRetry(() => import("./pages/admin/AdminAuditLogs"));
const AdminDataIngestion = lazyWithRetry(() => import("./pages/admin/AdminDataIngestion"));
const AdminReporting = lazyWithRetry(() => import("./pages/admin/AdminReporting"));
const AdminSessionLogs = lazyWithRetry(() => import("./pages/admin/AdminSessionLogs"));
const AdminSettings = lazyWithRetry(() => import("./pages/admin/AdminSettings"));
const AdminUserRoles = lazyWithRetry(() => import("./pages/admin/AdminUserRoles"));
const AdminVerticalHealth = lazyWithRetry(() => import("./pages/admin/AdminVerticalHealth"));
const FraudDetection = lazyWithRetry(() => import("./pages/FraudDetection"));
const CrmIntegrations = lazyWithRetry(() => import("./pages/CrmIntegrations"));
const LandingPage = lazyWithRetry(() => import("./pages/LandingPage"));
const VerifyChain = lazyWithRetry(() => import("./pages/VerifyChain"));
const AiCaseEvaluator = lazyWithRetry(() => import("./pages/AiCaseEvaluator"));
const AiToolPage = lazyWithRetry(() => import("./pages/AiToolPage"));
const GmbDashboard = lazyWithRetry(() => import("./pages/gmb/GmbDashboard"));
const GmbReviews = lazyWithRetry(() => import("./pages/gmb/GmbReviews"));
const GmbPosts = lazyWithRetry(() => import("./pages/gmb/GmbPosts"));
const GmbSyncStatus = lazyWithRetry(() => import("./pages/gmb/GmbSyncStatus"));
const GmbReplyTemplates = lazyWithRetry(() => import("./pages/gmb/GmbReplyTemplates"));
const GmbReplyApprovals = lazyWithRetry(() => import("./pages/gmb/GmbReplyApprovals"));
const SeoHub = lazyWithRetry(() => import("./pages/seo/SeoHub"));
const SeoDeepScan = lazyWithRetry(() => import("./pages/seo/SeoDeepScan"));
const SeoDeepScanReport = lazyWithRetry(() => import("./pages/seo/SeoDeepScanReport"));
const SeoThresholdsSettings = lazyWithRetry(() => import("./pages/seo/SeoThresholdsSettings"));
const SeoKeywords = lazyWithRetry(() => import("./pages/seo/SeoTools").then(m => ({ default: m.SeoKeywords })));
const SeoBacklinks = lazyWithRetry(() => import("./pages/seo/SeoTools").then(m => ({ default: m.SeoBacklinks })));
const SeoCitations = lazyWithRetry(() => import("./pages/seo/SeoTools").then(m => ({ default: m.SeoCitations })));
const AiSeoToolPage = lazyWithRetry(() => import("./pages/seo/ai/AiSeoToolPage"));
const CompetitorAdLibrary = lazyWithRetry(() => import("./pages/seo/ai/CompetitorAdLibrary"));
const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}

function PresenceTracker() {
  usePresence();
  return null;
}

function SmartAlertTracker() {
  useSmartAlertListener();
  return null;
}

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <VerticalProvider>
        <PostHogProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <PostHogPageView />
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/index" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/intake" element={<LazyRoute><Intake /></LazyRoute>} />
                <Route path="/intake/:slug" element={<LazyRoute><BrandedIntake /></LazyRoute>} />
                <Route path="/preview/landing/:token" element={<LazyRoute><LandingPreviewByToken /></LazyRoute>} />
                <Route path="/lp/:slug" element={<LazyRoute><LandingPage /></LazyRoute>} />
                <Route path="/verify" element={<LazyRoute><VerifyChain /></LazyRoute>} />
                <Route path="/verify/:leadId" element={<LazyRoute><VerifyChain /></LazyRoute>} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<ProtectedRoute><LazyRoute><Dashboard /></LazyRoute></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute><LazyRoute><Onboarding /></LazyRoute></ProtectedRoute>} />
                <Route path="/marketplace" element={<ProtectedRoute><LazyRoute><Marketplace /></LazyRoute></ProtectedRoute>} />
                <Route path="/my-leads" element={<ProtectedRoute><LazyRoute><MyLeads /></LazyRoute></ProtectedRoute>} />
                <Route path="/intake-submissions" element={<ProtectedRoute><LazyRoute><IntakeSubmissions /></LazyRoute></ProtectedRoute>} />
                <Route path="/wallet" element={<ProtectedRoute><LazyRoute><Wallet /></LazyRoute></ProtectedRoute>} />
                <Route path="/campaigns" element={<ProtectedRoute><LazyRoute><Campaigns /></LazyRoute></ProtectedRoute>} />
                <Route path="/meta-ads" element={<ProtectedRoute><LazyRoute><MetaAds /></LazyRoute></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><LazyRoute><Reports /></LazyRoute></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><LazyRoute><Settings /></LazyRoute></ProtectedRoute>} />
                <Route path="/social-calendar" element={<ProtectedRoute><LazyRoute><SocialMediaCalendar /></LazyRoute></ProtectedRoute>} />
                <Route path="/intake-builder" element={<ProtectedRoute><LazyRoute><IntakeFormBuilder /></LazyRoute></ProtectedRoute>} />
                <Route path="/teams" element={<ProtectedRoute><LazyRoute><Teams /></LazyRoute></ProtectedRoute>} />
                <Route path="/competitor-intelligence" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="competitor_intel" label="Competitor Intelligence"><CompetitorIntelligence /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/pricing" element={<ProtectedRoute><LazyRoute><Pricing /></LazyRoute></ProtectedRoute>} />
                <Route path="/smart-alerts" element={<ProtectedRoute><LazyRoute><SmartAlerts /></LazyRoute></ProtectedRoute>} />
                <Route path="/referral-network" element={<ProtectedRoute><LazyRoute><ReferralNetwork /></LazyRoute></ProtectedRoute>} />
                <Route path="/market-pulse" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="market_pulse" label="Market Pulse"><MarketPulseRadar /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/judge-intelligence" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="judge_intelligence" label="Judge Intelligence"><JudgeIntelligence /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/evidence-vault" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="evidence_vault" label="Evidence Vault"><EvidenceVault /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/predictive-leads" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="predictive_leads" label="Predictive Leads"><PredictiveLeads /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/benchmarks" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="benchmarks" label="Cross-Firm Benchmarks"><CrossFirmBenchmarks /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/creative-studio" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="creative_studio" label="Creative Studio"><CreativeStudio /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/viral-content" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="viral_content" label="Viral Content Engine"><ViralContentEngine /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/video-ads" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="video_ads" label="Video Ad Generator"><VideoAdGenerator /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/google-ads" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="google_ads" label="Google Ads"><GoogleAds /></ModuleGate></LazyRoute></ProtectedRoute>} />

                <Route path="/lookalike-audience" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="lookalike" label="Lookalike Audience"><LookalikeAudience /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/intent-signals" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="intent_signals" label="Intent Signals"><IntentSignalTracker /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/geofence-campaigns" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="geofence" label="Geofence Campaigns"><GeofenceCampaigns /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/dark-funnel" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="dark_funnel" label="Dark Funnel Intelligence"><DarkFunnelIntelligence /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/cross-platform-autopilot" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="cross_platform_autopilot" label="Cross-Platform Autopilot"><CrossPlatformAutopilot /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/fraud-detection" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="fraud_detection" label="Fraud Detection"><FraudDetection /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/crm-integrations" element={<ProtectedRoute><LazyRoute><CrmIntegrations /></LazyRoute></ProtectedRoute>} />
                <Route path="/ai-case-evaluator" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="case_evaluator" label="AI Lead Evaluator"><AiCaseEvaluator /></ModuleGate></LazyRoute></ProtectedRoute>} />

                {/* Dynamic AI tool route - all 40 vertical-specific tools */}
                <Route path="/tools/:toolKey" element={<ProtectedRoute><LazyRoute><AiToolPage /></LazyRoute></ProtectedRoute>} />

                {/* Local Presence: SEO + GMB (non-mass-tort verticals) */}
                <Route path="/gmb" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="gmb_manager" label="Google My Business"><GmbDashboard /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/gmb/reviews" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="tool_review_manager" label="Review Manager"><GmbReviews /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/gmb/posts" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="tool_gmb_post_scheduler" label="GMB Post Scheduler"><GmbPosts /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/gmb/sync" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="gmb_manager" label="GMB Sync Status"><GmbSyncStatus /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/gmb/reply-templates" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="tool_review_manager" label="Reply Templates"><GmbReplyTemplates /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/gmb/reply-approvals" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="tool_review_manager" label="Reply Approvals"><GmbReplyApprovals /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/seo" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="seo_suite" label="SEO Suite"><SeoHub /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/seo/deep-scan" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="tool_seo_deep_scan" label="SEO Deep Scan"><SeoDeepScan /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/seo/deep-scan/:reportId" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="tool_seo_deep_scan" label="SEO Deep Scan"><SeoDeepScanReport /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/seo/thresholds" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="tool_seo_deep_scan" label="SEO Deep Scan"><SeoThresholdsSettings /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/seo/keywords" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="tool_keyword_research" label="Keyword Research"><SeoKeywords /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/seo/backlinks" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="tool_backlink_audit" label="Backlink Audit"><SeoBacklinks /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/seo/citations" element={<ProtectedRoute><LazyRoute><ModuleGate moduleKey="tool_local_citations" label="Local Citations"><SeoCitations /></ModuleGate></LazyRoute></ProtectedRoute>} />
                <Route path="/seo/ai/competitor-ad-library" element={<ProtectedRoute><LazyRoute><CompetitorAdLibrary /></LazyRoute></ProtectedRoute>} />
                <Route path="/seo/ai/:slug" element={<ProtectedRoute><LazyRoute><AiSeoToolPage /></LazyRoute></ProtectedRoute>} />

                {/* Admin routes */}
                <Route path="/admin" element={<ProtectedRoute requireAdmin><LazyRoute><AdminDashboard /></LazyRoute></ProtectedRoute>} />
                <Route path="/admin/firms" element={<ProtectedRoute requireAdmin><LazyRoute><AdminFirms /></LazyRoute></ProtectedRoute>} />
                <Route path="/admin/leads" element={<ProtectedRoute requireAdmin><LazyRoute><AdminLeads /></LazyRoute></ProtectedRoute>} />
                <Route path="/admin/audit-logs" element={<ProtectedRoute requireAdmin><LazyRoute><AdminAuditLogs /></LazyRoute></ProtectedRoute>} />
                <Route path="/admin/data-ingestion" element={<ProtectedRoute requireAdmin><LazyRoute><AdminDataIngestion /></LazyRoute></ProtectedRoute>} />
                <Route path="/admin/reporting" element={<ProtectedRoute requireAdmin><LazyRoute><AdminReporting /></LazyRoute></ProtectedRoute>} />
                <Route path="/admin/session-logs" element={<ProtectedRoute requireAdmin><LazyRoute><AdminSessionLogs /></LazyRoute></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><LazyRoute><AdminSettings /></LazyRoute></ProtectedRoute>} />
                <Route path="/admin/user-roles" element={<ProtectedRoute requireAdmin><LazyRoute><AdminUserRoles /></LazyRoute></ProtectedRoute>} />
                <Route path="/admin/vertical-health" element={<ProtectedRoute requireAdmin><LazyRoute><AdminVerticalHealth /></LazyRoute></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <PresenceTracker />
              <SmartAlertTracker />
              <ChatWidget />
              <ZKUnlockDialog />
            </BrowserRouter>
          </TooltipProvider>
        </PostHogProvider>
        </VerticalProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
