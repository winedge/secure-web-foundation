import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2, Cpu, ArrowRight, DollarSign, TrendingUp, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MetaCampaignWizard } from '@/components/meta-ads/MetaCampaignWizard';
import { useMetaPixel } from '@/hooks/use-meta-pixel';
import { useFirm } from '@/hooks/use-firm';
import { CategorySelect } from '@/components/verticals/CategorySelect';

const PLATFORMS = ['meta', 'google', 'tiktok', 'linkedin', 'youtube'] as const;
const PLATFORM_COLORS: Record<string, string> = {
  meta: 'bg-blue-500', google: 'bg-red-500', tiktok: 'bg-gray-800',
  linkedin: 'bg-blue-700', youtube: 'bg-red-600',
};

export default function CrossPlatformAutopilot() {
  const { data: firm } = useFirm();
  const [budget, setBudget] = useState('5000');
  const [tortType, setTortType] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [metaWizardOpen, setMetaWizardOpen] = useState(false);
  const pixel = useMetaPixel();

  const optimize = async () => {
    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('cross-platform-autopilot', {
        body: { firm_id: firm?.id, total_budget: parseFloat(budget), tort_type: tortType, category: tortType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      pixel.crossPlatformOptimized({ total_budget: parseFloat(budget), tort_type: tortType });
      toast.success('Cross-platform optimization complete');
    } catch (err: any) { toast.error(err.message); }
    finally { setIsOptimizing(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                <Cpu className="h-5 w-5 text-white" />
              </div>
              Cross-Platform Autopilot
            </h1>
            <p className="text-muted-foreground mt-1">One AI brain managing Meta, Google, TikTok, LinkedIn, and YouTube simultaneously.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Monthly budget" value={budget} onChange={(e) => setBudget(e.target.value)} className="pl-8 w-40" type="number" />
            </div>
            <CategorySelect value={tortType} onChange={setTortType} className="max-w-xs" />
            <Button onClick={optimize} disabled={isOptimizing} className="gap-2">
              {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
              {isOptimizing ? 'Optimizing...' : 'Optimize Allocation'}
            </Button>
          </div>
        </div>

        {result?.optimized_allocation && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Total Expected Leads</p>
                <p className="text-4xl font-bold text-accent">{result.total_expected_leads}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Blended CPL</p>
                <p className="text-4xl font-bold text-foreground">${result.blended_cpl?.toFixed(2)}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-4xl font-bold text-foreground">{((result.optimization_confidence || 0) * 100).toFixed(0)}%</p>
              </CardContent></Card>
            </div>

            {/* Platform Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {PLATFORMS.map(platform => {
                const alloc = result.optimized_allocation[platform];
                if (!alloc) return null;
                return (
                  <Card key={platform} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${PLATFORM_COLORS[platform]}`} />
                        <span className="font-semibold text-foreground capitalize">{platform}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">${alloc.budget_amount?.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{(alloc.budget_pct * 100).toFixed(0)}% of total</p>
                      </div>
                      <Progress value={alloc.budget_pct * 100} className="h-2" />
                      <div className="text-xs space-y-1">
                        <p className="text-muted-foreground">CPL: ${alloc.expected_cpl?.toFixed(2)}</p>
                        <p className="text-muted-foreground">Leads: {alloc.expected_leads}</p>
                      </div>
                      <p className="text-xs text-muted-foreground italic">{alloc.reasoning}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Shifts */}
            {result.shift_recommendations?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Budget Shift Recommendations</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {result.shift_recommendations.map((shift: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                      <Badge variant="outline" className="capitalize">{shift.from}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Badge className="bg-accent text-accent-foreground capitalize">{shift.to}</Badge>
                      <span className="text-sm font-semibold text-foreground">${shift.amount}</span>
                      <span className="text-xs text-muted-foreground flex-1">{shift.reason}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {result.platform_synergies?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Platform Synergies</CardTitle></CardHeader>
                <CardContent>
                  {result.platform_synergies.map((s: string, i: number) => (
                    <p key={i} className="text-sm text-muted-foreground mb-1">• {s}</p>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-foreground">Risk Assessment</p>
                <p className="text-sm text-muted-foreground">{result.risk_assessment}</p>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Launch Meta Campaign</p>
                  <p className="text-sm text-muted-foreground">Push the Meta allocation directly into the Meta Ads wizard</p>
                </div>
                <Button className="gap-2" onClick={() => setMetaWizardOpen(true)}>
                  <Rocket className="h-4 w-4" /> Launch to Meta
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <MetaCampaignWizard
        open={metaWizardOpen}
        onOpenChange={setMetaWizardOpen}
        prefillData={{
          campaignName: `Cross-Platform Meta - ${tortType || 'Campaign'}`,
          tortType: tortType,
          goal: 'OUTCOME_LEADS',
          dailyBudget: result?.optimized_allocation?.meta?.budget_amount
            ? Math.round(result.optimized_allocation.meta.budget_amount / 30)
            : 50,
        }}
        onCreated={() => setMetaWizardOpen(false)}
      />
    </DashboardLayout>
  );
}
