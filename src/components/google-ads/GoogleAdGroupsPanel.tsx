import { useGoogleAdGroups } from '@/hooks/use-google-campaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, MousePointerClick, Eye, Target } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Props {
  campaignId: string | null;
  onBack: () => void;
}

export function GoogleAdGroupsPanel({ campaignId, onBack }: Props) {
  const { data: adGroups } = useGoogleAdGroups(campaignId || undefined);

  if (!campaignId) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <Target className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Select a campaign first</p>
          <p className="text-sm text-muted-foreground">Choose a campaign from the Campaigns tab to view its ad groups.</p>
          <Button variant="outline" onClick={onBack} className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" />Back to Campaigns</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <h3 className="text-lg font-semibold">Ad Groups</h3>
        <Badge variant="outline">{adGroups?.length || 0} groups</Badge>
      </div>

      <div className="space-y-4">
        {adGroups?.map(group => (
          <Card key={group.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{group.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={group.status === 'active' ? 'default' : 'secondary'}>{group.status}</Badge>
                  <div className="flex items-center gap-1 text-xs"><Star className="h-3 w-3 text-yellow-500" />{group.quality_score}/10</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metrics */}
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="text-center p-2 rounded bg-muted/50">
                  <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="font-bold">{group.impressions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Impressions</p>
                </div>
                <div className="text-center p-2 rounded bg-muted/50">
                  <MousePointerClick className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="font-bold">{group.clicks.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Clicks</p>
                </div>
                <div className="text-center p-2 rounded bg-muted/50">
                  <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="font-bold text-primary">{group.conversions}</p>
                  <p className="text-xs text-muted-foreground">Conversions</p>
                </div>
                <div className="text-center p-2 rounded bg-muted/50">
                  <p className="font-bold">{formatCurrency(group.cpc)}</p>
                  <p className="text-xs text-muted-foreground">Avg CPC</p>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <p className="text-sm font-medium mb-2">Keywords ({group.keywords.length})</p>
                <div className="space-y-1">
                  {group.keywords.map(kw => (
                    <div key={kw.id} className="flex items-center justify-between text-xs p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{kw.match_type}</Badge>
                        <span className="font-mono">{kw.text}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>QS: {kw.quality_score}</span>
                        <span>CPC: {formatCurrency(kw.cpc)}</span>
                        <span className="text-primary font-medium">{kw.conversions} conv</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ads */}
              <div>
                <p className="text-sm font-medium mb-2">Ads ({group.ads.length})</p>
                {group.ads.map(ad => (
                  <div key={ad.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{ad.type.replace(/_/g, ' ')}</Badge>
                      <span className="text-xs text-muted-foreground">AI Score: {ad.ai_score}/100</span>
                    </div>
                    <div className="space-y-0.5">
                      {ad.headlines.map((h, i) => (
                        <p key={i} className="text-sm font-medium text-primary">{h}</p>
                      ))}
                      {ad.descriptions.map((d, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{d}</p>
                      ))}
                    </div>
                    <p className="text-xs text-green-600">{ad.display_url}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
