import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { PostHogProvider, PostHogPageView } from "@/lib/posthog";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SubscriptionProvider } from "@/components/subscription/SubscriptionProvider";
import { RouteErrorBoundary } from "@/components/error/RouteErrorBoundary";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

// Eager-loaded routes (landing, auth — needed immediately)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Lazy-loaded routes
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Intake = lazy(() => import("./pages/Intake"));
const BrandedIntake = lazy(() => import("./pages/BrandedIntake"));
const IntakeFormBuilder = lazy(() => import("./pages/IntakeFormBuilder"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const MyLeads = lazy(() => import("./pages/MyLeads"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const MetaAds = lazy(() => import("./pages/MetaAds"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Pricing = lazy(() => import("./pages/Pricing"));
const SocialMediaCalendar = lazy(() => import("./pages/SocialMediaCalendar"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminFirms = lazy(() => import("./pages/admin/AdminFirms"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AdminAuditLogs"));
const AdminDataIngestion = lazy(() => import("./pages/admin/AdminDataIngestion"));
const AdminReporting = lazy(() => import("./pages/admin/AdminReporting"));
const AdminSessionLogs = lazy(() => import("./pages/admin/AdminSessionLogs"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminUserRoles = lazy(() => import("./pages/admin/AdminUserRoles"));

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <PostHogProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <PostHogPageView />
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/intake" element={<LazyRoute><Intake /></LazyRoute>} />
                <Route path="/intake/:slug" element={<LazyRoute><BrandedIntake /></LazyRoute>} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<ProtectedRoute><LazyRoute><Dashboard /></LazyRoute></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute><LazyRoute><Onboarding /></LazyRoute></ProtectedRoute>} />
                <Route path="/marketplace" element={<ProtectedRoute><LazyRoute><Marketplace /></LazyRoute></ProtectedRoute>} />
                <Route path="/my-leads" element={<ProtectedRoute><LazyRoute><MyLeads /></LazyRoute></ProtectedRoute>} />
                <Route path="/wallet" element={<ProtectedRoute><LazyRoute><Wallet /></LazyRoute></ProtectedRoute>} />
                <Route path="/campaigns" element={<ProtectedRoute><LazyRoute><Campaigns /></LazyRoute></ProtectedRoute>} />
                <Route path="/meta-ads" element={<ProtectedRoute><LazyRoute><MetaAds /></LazyRoute></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><LazyRoute><Reports /></LazyRoute></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><LazyRoute><Settings /></LazyRoute></ProtectedRoute>} />
                <Route path="/social-calendar" element={<ProtectedRoute><LazyRoute><SocialMediaCalendar /></LazyRoute></ProtectedRoute>} />
                <Route path="/intake-builder" element={<ProtectedRoute><LazyRoute><IntakeFormBuilder /></LazyRoute></ProtectedRoute>} />
                <Route path="/pricing" element={<ProtectedRoute><LazyRoute><Pricing /></LazyRoute></ProtectedRoute>} />

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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </PostHogProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
