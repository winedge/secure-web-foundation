import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { PostHogProvider, PostHogPageView } from "@/lib/posthog";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Intake from "./pages/Intake";
import BrandedIntake from "./pages/BrandedIntake";
import IntakeFormBuilder from "./pages/IntakeFormBuilder";
import Marketplace from "./pages/Marketplace";
import MyLeads from "./pages/MyLeads";
import Wallet from "./pages/Wallet";
import Campaigns from "./pages/Campaigns";
import MetaAds from "./pages/MetaAds";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFirms from "./pages/admin/AdminFirms";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminDataIngestion from "./pages/admin/AdminDataIngestion";
import AdminReporting from "./pages/admin/AdminReporting";
import AdminSessionLogs from "./pages/admin/AdminSessionLogs";
import AdminSettings from "./pages/admin/AdminSettings";
import SocialMediaCalendar from "./pages/SocialMediaCalendar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
              <Route path="/intake" element={<Intake />} />
              <Route path="/intake/:slug" element={<BrandedIntake />} />

              {/* Protected routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
              <Route path="/my-leads" element={<ProtectedRoute><MyLeads /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
              <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
              <Route path="/meta-ads" element={<ProtectedRoute><MetaAds /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/social-calendar" element={<ProtectedRoute><SocialMediaCalendar /></ProtectedRoute>} />
              <Route path="/intake-builder" element={<ProtectedRoute><IntakeFormBuilder /></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/firms" element={<ProtectedRoute requireAdmin><AdminFirms /></ProtectedRoute>} />
              <Route path="/admin/leads" element={<ProtectedRoute requireAdmin><AdminLeads /></ProtectedRoute>} />
              <Route path="/admin/audit-logs" element={<ProtectedRoute requireAdmin><AdminAuditLogs /></ProtectedRoute>} />
              <Route path="/admin/data-ingestion" element={<ProtectedRoute requireAdmin><AdminDataIngestion /></ProtectedRoute>} />
              <Route path="/admin/reporting" element={<ProtectedRoute requireAdmin><AdminReporting /></ProtectedRoute>} />
              <Route path="/admin/session-logs" element={<ProtectedRoute requireAdmin><AdminSessionLogs /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PostHogProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
