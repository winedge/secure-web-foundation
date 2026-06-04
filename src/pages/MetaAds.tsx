import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetaCampaignsList } from '@/components/meta-ads/MetaCampaignsList';
import { AdSetsTable } from '@/components/meta-ads/tables/AdSetsTable';
import { AdsTable } from '@/components/meta-ads/tables/AdsTable';
import { AudiencesTable } from '@/components/meta-ads/tables/AudiencesTable';
import { ReportsTable } from '@/components/meta-ads/tables/ReportsTable';
import { MetaAnalyticsPanel } from '@/components/meta-ads/MetaAnalyticsPanel';
import { BreakdownsPanel } from '@/components/meta-ads/BreakdownsPanel';
import { MetaAiPanel } from '@/components/meta-ads/MetaAiPanel';
import { AutopilotPanel } from '@/components/meta-ads/AutopilotPanel';
import { MetaPixelPanel } from '@/components/meta-ads/MetaPixelPanel';
import { MetaLeadFormsPanel } from '@/components/meta-ads/MetaLeadFormsPanel';
import { MetaSelfLearningPanel } from '@/components/meta-ads/MetaSelfLearningPanel';
import { MetaConnectionBanner } from '@/components/meta-ads/MetaConnectionBanner';
import { MetaAdAccountBar } from '@/components/meta-ads/MetaAdAccountBar';

import { UpgradeGate } from '@/components/subscription/UpgradeGate';
import { LayoutDashboard, Target, Megaphone, BarChart3, Bot, Zap, Activity, FileText, Brain, Users, FileBarChart } from 'lucide-react';

export default function MetaAds() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('campaigns');

  return (
    <DashboardLayout>
      <UpgradeGate
        feature="meta_ads"
        fallbackTitle="Unlock Meta Ads Manager"
        fallbackDescription="AI-powered campaign management, budget optimization, and real-time analytics - all synced with your Facebook Ads account."
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Meta Ads Manager</h1>
              <p className="text-muted-foreground">AI-powered campaign management for lead generation</p>
            </div>
            <MetaAdAccountBar />
          </div>

          <MetaConnectionBanner />


          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex flex-wrap w-full h-auto gap-1">
              <TabsTrigger value="campaigns" className="gap-1.5 text-xs sm:text-sm py-2">
                <LayoutDashboard className="h-4 w-4 hidden sm:block" />Campaigns
              </TabsTrigger>
              <TabsTrigger value="ad-sets" className="gap-1.5 text-xs sm:text-sm py-2">
                <Target className="h-4 w-4 hidden sm:block" />Ad Sets
              </TabsTrigger>
              <TabsTrigger value="ads" className="gap-1.5 text-xs sm:text-sm py-2">
                <Megaphone className="h-4 w-4 hidden sm:block" />Ads
              </TabsTrigger>
              <TabsTrigger value="audiences" className="gap-1.5 text-xs sm:text-sm py-2">
                <Users className="h-4 w-4 hidden sm:block" />Audiences
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-1.5 text-xs sm:text-sm py-2">
                <FileBarChart className="h-4 w-4 hidden sm:block" />Reports
              </TabsTrigger>
              <TabsTrigger value="pixel" className="gap-1.5 text-xs sm:text-sm py-2">
                <Activity className="h-4 w-4 hidden sm:block" />Pixel
              </TabsTrigger>
              <TabsTrigger value="lead-forms" className="gap-1.5 text-xs sm:text-sm py-2">
                <FileText className="h-4 w-4 hidden sm:block" />Lead Forms
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm py-2">
                <BarChart3 className="h-4 w-4 hidden sm:block" />Analytics
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-1.5 text-xs sm:text-sm py-2">
                <Bot className="h-4 w-4 hidden sm:block" />AI Brain
              </TabsTrigger>
              <TabsTrigger value="autopilot" className="gap-1.5 text-xs sm:text-sm py-2">
                <Zap className="h-4 w-4 hidden sm:block" />Autopilot
              </TabsTrigger>
              <TabsTrigger value="learning" className="gap-1.5 text-xs sm:text-sm py-2">
                <Brain className="h-4 w-4 hidden sm:block" />Self-Learn
              </TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns">
              <MetaCampaignsList
                onSelectCampaign={(id) => {
                  setSelectedCampaignId(id);
                  setActiveTab('ad-sets');
                }}
              />
            </TabsContent>

            <TabsContent value="ad-sets">
              <AdSetsTable
                initialCampaignId={selectedCampaignId}
                onSelectAdSet={(id) => {
                  setSelectedAdSetId(id);
                  setActiveTab('ads');
                }}
              />
            </TabsContent>

            <TabsContent value="ads">
              <AdsTable initialAdSetId={selectedAdSetId} initialCampaignId={selectedCampaignId} />
            </TabsContent>

            <TabsContent value="audiences">
              <AudiencesTable />
            </TabsContent>

            <TabsContent value="reports">
              <ReportsTable />
            </TabsContent>

            <TabsContent value="pixel"><MetaPixelPanel /></TabsContent>
            <TabsContent value="lead-forms"><MetaLeadFormsPanel /></TabsContent>
            <TabsContent value="analytics" className="space-y-4">
              <MetaAnalyticsPanel campaignId={selectedCampaignId} />
              <BreakdownsPanel />
            </TabsContent>

            <TabsContent value="ai">
              <MetaAiPanel
                campaignId={selectedCampaignId}
                onCampaignCreated={(id) => {
                  setSelectedCampaignId(id);
                  setActiveTab('campaigns');
                }}
              />
            </TabsContent>

            <TabsContent value="autopilot"><AutopilotPanel campaignId={selectedCampaignId} /></TabsContent>
            <TabsContent value="learning"><MetaSelfLearningPanel campaignId={selectedCampaignId} /></TabsContent>
          </Tabs>
        </div>
      </UpgradeGate>
    </DashboardLayout>
  );
}
