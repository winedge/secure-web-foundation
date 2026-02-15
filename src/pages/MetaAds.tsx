import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetaCampaignsList } from '@/components/meta-ads/MetaCampaignsList';
import { MetaAdSetsPanel } from '@/components/meta-ads/MetaAdSetsPanel';
import { MetaAdsPanel } from '@/components/meta-ads/MetaAdsPanel';
import { MetaAnalyticsPanel } from '@/components/meta-ads/MetaAnalyticsPanel';
import { MetaAiPanel } from '@/components/meta-ads/MetaAiPanel';
import { AutopilotPanel } from '@/components/meta-ads/AutopilotPanel';
import { UpgradeGate } from '@/components/subscription/UpgradeGate';
import { LayoutDashboard, Target, Megaphone, BarChart3, Bot, Zap } from 'lucide-react';

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
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Meta Ads Manager</h1>
            <p className="text-muted-foreground">
              AI-powered campaign management for lead generation
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto">
              <TabsTrigger value="campaigns" className="gap-1.5 text-xs sm:text-sm py-2">
                <LayoutDashboard className="h-4 w-4 hidden sm:block" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="ad-sets" className="gap-1.5 text-xs sm:text-sm py-2">
                <Target className="h-4 w-4 hidden sm:block" />
                Ad Sets
              </TabsTrigger>
              <TabsTrigger value="ads" className="gap-1.5 text-xs sm:text-sm py-2">
                <Megaphone className="h-4 w-4 hidden sm:block" />
                Ads
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm py-2">
                <BarChart3 className="h-4 w-4 hidden sm:block" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-1.5 text-xs sm:text-sm py-2">
                <Bot className="h-4 w-4 hidden sm:block" />
                AI Brain
              </TabsTrigger>
              <TabsTrigger value="autopilot" className="gap-1.5 text-xs sm:text-sm py-2">
                <Zap className="h-4 w-4 hidden sm:block" />
                Autopilot
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
              <MetaAdSetsPanel
                campaignId={selectedCampaignId}
                onSelectAdSet={(id) => {
                  setSelectedAdSetId(id);
                  setActiveTab('ads');
                }}
                onBack={() => setActiveTab('campaigns')}
              />
            </TabsContent>

            <TabsContent value="ads">
              <MetaAdsPanel
                adSetId={selectedAdSetId}
                onBack={() => setActiveTab('ad-sets')}
              />
            </TabsContent>

            <TabsContent value="analytics">
              <MetaAnalyticsPanel campaignId={selectedCampaignId} />
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

            <TabsContent value="autopilot">
              <AutopilotPanel campaignId={selectedCampaignId} />
            </TabsContent>
          </Tabs>
        </div>
      </UpgradeGate>
    </DashboardLayout>
  );
}
