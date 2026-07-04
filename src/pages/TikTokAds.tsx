import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { TikTokConnectionBanner } from '@/components/tiktok-ads/TikTokConnectionBanner';
import { TikTokAdAccountBar } from '@/components/tiktok-ads/TikTokAdAccountBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music2 } from 'lucide-react';

export default function TikTokAds() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="TikTok Ads"
          subtitle="Plan, launch, and optimize TikTok campaigns with the same AI workspace as Meta and Google."
          actions={<TikTokAdAccountBar />}
        />

        <TikTokConnectionBanner />

        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="adgroups">Ad Groups</TabsTrigger>
            <TabsTrigger value="ads">Ads</TabsTrigger>
            <TabsTrigger value="audiences">Audiences</TabsTrigger>
            <TabsTrigger value="creatives">Creatives</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music2 className="h-4 w-4" /> Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Connect your TikTok Business account to start planning and launching campaigns. Once
                connected, the AI can create the full campaign structure from a single business goal.
              </CardContent>
            </Card>
          </TabsContent>

          {['adgroups', 'ads', 'audiences', 'creatives', 'insights', 'rules'].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Available once a TikTok ad account is connected and synced.
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
