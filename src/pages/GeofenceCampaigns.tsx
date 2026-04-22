import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Navigation, Clock, Shield, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MetaCampaignWizard } from '@/components/meta-ads/MetaCampaignWizard';
import { useMetaPixel } from '@/hooks/use-meta-pixel';
import { useFirm } from '@/hooks/use-firm';
import { CategorySelect } from '@/components/verticals/CategorySelect';

export default function GeofenceCampaigns() {
  const { data: firm } = useFirm();
  const [tortType, setTortType] = useState('');
  const [radius, setRadius] = useState('500');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [metaWizardOpen, setMetaWizardOpen] = useState(false);
  const [selectedFence, setSelectedFence] = useState<any>(null);
  const pixel = useMetaPixel();

  const generate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('geofence-engine', {
        body: { firm_id: firm?.id, tort_type: tortType, category: tortType, radius_meters: parseInt(radius), locations: ['courthouses', 'hospitals', 'chiropractors', 'competitor offices'] },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      pixel.geofenceDesigned({ zone_count: (data.geofences || []).length, tort_type: tortType });
      toast.success(`Designed ${(data.geofences || []).length} geofence zones`);
    } catch (err: any) { toast.error(err.message); }
    finally { setIsGenerating(false); }
  };

  const handleLaunchToMeta = (fence: any) => {
    setSelectedFence(fence);
    setMetaWizardOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              Geofence Campaign Engine
            </h1>
            <p className="text-muted-foreground mt-1">Location-based ad targeting around courthouses, hospitals, and competitor offices.</p>
          </div>
          <div className="flex gap-2">
            <CategorySelect value={tortType} onChange={setTortType} className="max-w-xs" />
            <Input placeholder="Radius (m)" value={radius} onChange={(e) => setRadius(e.target.value)} className="w-24" type="number" />
            <Button onClick={generate} disabled={isGenerating} className="gap-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              {isGenerating ? 'Designing...' : 'Design Geofences'}
            </Button>
          </div>
        </div>

        {result?.campaign_strategy && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-foreground">{result.campaign_strategy.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{result.campaign_strategy.objective}</p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>Reach: {result.campaign_strategy.total_estimated_reach?.toLocaleString()}</span>
                <span>Daily Impressions: {result.campaign_strategy.estimated_daily_impressions?.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {result?.geofences?.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.geofences.map((fence: any, i: number) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground flex items-center gap-1"><MapPin className="h-4 w-4 text-accent" />{fence.location_name}</p>
                      <Badge variant="outline" className="mt-1 capitalize">{fence.location_type?.replace(/_/g, ' ')}</Badge>
                    </div>
                    <Badge variant="secondary">{fence.radius_meters}m</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{fence.why_target}</p>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Best: {fence.best_times?.join(', ')}</div>
                  <p className="text-xs text-muted-foreground">Est. daily traffic: {fence.estimated_daily_traffic}</p>
                  {fence.ad_creative && (
                    <div className="bg-muted/50 rounded-lg p-2 space-y-1">
                      <p className="text-xs font-bold text-foreground">{fence.ad_creative.headline}</p>
                      <p className="text-xs text-muted-foreground">{fence.ad_creative.body}</p>
                      <Badge className="bg-accent text-accent-foreground text-xs">{fence.ad_creative.cta}</Badge>
                    </div>
                  )}
                  <div className="mt-2 pt-2 border-t border-border">
                    <Button size="sm" variant="outline" className="w-full gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950" onClick={() => handleLaunchToMeta(fence)}>
                      <Rocket className="h-3 w-3" /> Launch as Meta Campaign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {result?.compliance_notes?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Compliance Notes</CardTitle></CardHeader>
            <CardContent>
              {result.compliance_notes.map((note: string, i: number) => (
                <p key={i} className="text-xs text-muted-foreground mb-1">• {note}</p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <MetaCampaignWizard
        open={metaWizardOpen}
        onOpenChange={setMetaWizardOpen}
        prefillData={selectedFence ? {
          campaignName: `Geofence - ${selectedFence.location_name || 'Campaign'}`,
          tortType: tortType,
          goal: 'OUTCOME_LEADS',
        } : {}}
        onCreated={() => setMetaWizardOpen(false)}
      />
    </DashboardLayout>
  );
}
