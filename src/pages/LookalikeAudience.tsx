import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2, Users, Target, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from 'sonner';

export default function LookalikeAudience() {
  const { data: firm } = useFirm();
  const [tortType, setTortType] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [result, setResult] = useState<any>(null);

  const build = async () => {
    if (!firm?.id) return;
    setIsBuilding(true);
    try {
      const { data, error } = await supabase.functions.invoke('lookalike-audience', {
        body: { firm_id: firm.id, tort_type: tortType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success(`Built ${(data.audience_profiles || []).length} audience segments`);
    } catch (err: any) { toast.error(err.message); }
    finally { setIsBuilding(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              Lookalike Audience AI
            </h1>
            <p className="text-muted-foreground mt-1">Build hyper-targeted audiences from your best-converting leads. Auto-sync to ad platforms.</p>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Tort type filter..." value={tortType} onChange={(e) => setTortType(e.target.value)} className="max-w-xs" />
            <Button onClick={build} disabled={isBuilding} className="gap-2">
              {isBuilding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              {isBuilding ? 'Building...' : 'Build Audiences'}
            </Button>
          </div>
        </div>

        {result?.audience_profiles?.map((profile: any, i: number) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{profile.name}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{profile.estimated_reach?.toLocaleString()} reach</Badge>
                  <Badge className="bg-accent/10 text-accent">Match: {(profile.match_quality * 100).toFixed(0)}%</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{profile.description}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Demographics</p>
                  {Object.entries(profile.demographics || {}).map(([k, v]) => (
                    <p key={k} className="text-xs text-muted-foreground"><span className="capitalize">{k.replace(/_/g, ' ')}:</span> {String(v)}</p>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Psychographics</p>
                  {profile.psychographics?.pain_points?.map((p: string, j: number) => (
                    <Badge key={j} variant="secondary" className="text-xs mr-1 mb-1">{p}</Badge>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Behavioral Signals</p>
                  {profile.behavioral_signals?.search_patterns?.map((s: string, j: number) => (
                    <p key={j} className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="h-2 w-2 text-accent" />{s}</p>
                  ))}
                </div>
              </div>
              {profile.targeting_instructions && (
                <div className="mt-3 bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-foreground">Platform Targeting</p>
                  <p className="text-xs text-muted-foreground">Meta: {profile.targeting_instructions.meta}</p>
                  <p className="text-xs text-muted-foreground">Google: {profile.targeting_instructions.google}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
