import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UpgradeGate } from '@/components/subscription/UpgradeGate';
import { GoogleCampaignsList } from '@/components/google-ads/GoogleCampaignsList';
import { GoogleAdGroupsPanel } from '@/components/google-ads/GoogleAdGroupsPanel';
import { GoogleAnalyticsPanel } from '@/components/google-ads/GoogleAnalyticsPanel';
import { GoogleAiPanel } from '@/components/google-ads/GoogleAiPanel';
import { GoogleAutopilotPanel } from '@/components/google-ads/GoogleAutopilotPanel';
import { GoogleKeywordsPanel } from '@/components/google-ads/GoogleKeywordsPanel';
import { LayoutDashboard, Target, BarChart3, Bot, Zap, Search, KeyRound } from 'lucide-react';

export default function GoogleAds() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('campaigns');

  return (
    <DashboardLayout>
      <UpgradeGate
        feature="meta_ads"
        fallbackTitle="Unlock Google Ads Manager"
        fallbackDescription="AI-powered Search, Display & Performance Max campaign management with self-learning optimization."
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Google Ads Manager</h1>
            <p className="text-muted-foreground">
              AI-powered campaign management for Search, Display & Performance Max
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto">
              <TabsTrigger value="campaigns" className="gap-1.5 text-xs sm:text-sm py-2">
                <LayoutDashboard className="h-4 w-4 hidden sm:block" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="ad-groups" className="gap-1.5 text-xs sm:text-sm py-2">
                <Target className="h-4 w-4 hidden sm:block" />
                Ad Groups
              </TabsTrigger>
              <TabsTrigger value="keywords" className="gap-1.5 text-xs sm:text-sm py-2">
                <KeyRound className="h-4 w-4 hidden sm:block" />
                Keywords
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
              <GoogleCampaignsList
                onSelectCampaign={(id) => {
                  setSelectedCampaignId(id);
                  setActiveTab('ad-groups');
                }}
              />
            </TabsContent>
            <TabsContent value="ad-groups">
              <GoogleAdGroupsPanel
                campaignId={selectedCampaignId}
                onBack={() => setActiveTab('campaigns')}
              />
            </TabsContent>
            <TabsContent value="keywords">
              <GoogleKeywordsPanel campaignId={selectedCampaignId} />
            </TabsContent>
            <TabsContent value="analytics">
              <GoogleAnalyticsPanel />
            </TabsContent>
            <TabsContent value="ai">
              <GoogleAiPanel
                campaignId={selectedCampaignId}
                onCampaignCreated={(id) => {
                  setSelectedCampaignId(id);
                  setActiveTab('campaigns');
                }}
              />
            </TabsContent>
            <TabsContent value="autopilot">
              <GoogleAutopilotPanel campaignId={selectedCampaignId} />
            </TabsContent>
          </Tabs>
        </div>
      </UpgradeGate>
    </DashboardLayout>
  );
}
