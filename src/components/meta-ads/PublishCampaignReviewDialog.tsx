import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Shield, Sparkles, AlertTriangle, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  MetaCampaign,
  usePublishMetaCampaign,
  useReachEstimate,
} from '@/hooks/use-meta-campaigns';

interface Props {
  campaign: MetaCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishCampaignReviewDialog({ campaign, open, onOpenChange }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [adSets, setAdSets] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reach, setReach] = useState<any>(null);

  const publish = usePublishMetaCampaign();
  const reachEstimate = useReachEstimate();

  useEffect(() => {
    if (!open || !campaign) return;
    setStep(1);
    setAcknowledged(false);
    setConfirmName('');
    setReach(null);
    setLoading(true);
    (async () => {
      const { data: sets } = await (supabase as any)
        .from('meta_ad_sets').select('*').eq('campaign_id', campaign.id);
      setAdSets(sets || []);
      if (sets?.length) {
        const { data: a } = await (supabase as any)
          .from('meta_ads').select('*').in('ad_set_id', sets.map((s: any) => s.id));
        setAds(a || []);
      } else {
        setAds([]);
      }
      setLoading(false);
      // Fire & forget reach estimate
      reachEstimate.mutateAsync(campaign.id).then((d) => setReach(d?.estimate)).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign?.id]);

  if (!campaign) return null;

  const totalAds = ads.length;
  const canPublish =
    step === 2 && acknowledged && confirmName.trim() === campaign.name.trim() && !publish.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Review {campaign.created_by_ai ? 'AI draft' : 'draft'} | Step {step} of 2
          </DialogTitle>
          <DialogDescription>
            Nothing has been sent to Meta yet. Review every detail before going live.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {step === 1 ? (
            <div className="space-y-4 py-2">
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <>
                  <section className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">Campaign</h3>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <dt className="text-muted-foreground">Name</dt><dd>{campaign.name}</dd>
                      <dt className="text-muted-foreground">Objective</dt><dd>{campaign.objective.replace(/_/g, ' ')}</dd>
                      <dt className="text-muted-foreground">Bid strategy</dt><dd>{campaign.bid_strategy.replace(/_/g, ' ')}</dd>
                      <dt className="text-muted-foreground">Daily budget</dt><dd className="font-semibold">{formatCurrency(campaign.daily_budget)}</dd>
                      <dt className="text-muted-foreground">Target states</dt><dd>{campaign.target_states?.join(', ') || 'All'}</dd>
                    </dl>
                  </section>

                  <section className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">Ad sets ({adSets.length})</h3>
                    {adSets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No ad sets yet | publishing will fail.</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {adSets.map((s) => (
                          <li key={s.id} className="rounded border p-2">
                            <div className="font-medium">{s.name}</div>
                            <div className="text-muted-foreground text-xs">
                              Age {s.age_min}-{s.age_max} | Budget {formatCurrency(s.daily_budget || 0)}/day | {s.interests?.length || 0} interests
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">Ads ({totalAds})</h3>
                    {totalAds === 0 ? (
                      <p className="text-sm text-muted-foreground">No ads yet | publishing will fail.</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {ads.map((a) => (
                          <li key={a.id} className="rounded border p-2">
                            <div className="font-medium">{a.headline || a.name}</div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{a.body_text}</p>
                            <Badge variant="outline" className="mt-1 text-[10px]">CTA: {a.call_to_action}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {reach && (
                    <section className="rounded-lg border p-4">
                      <h3 className="font-semibold mb-2">Estimated daily reach</h3>
                      <p className="text-sm">
                        {reach.users ? `~${Number(reach.users).toLocaleString()} people/day` : '|'}
                      </p>
                    </section>
                  )}

                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> ABA 512 / GDPR / EU AI Act
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-4">
                <div className="flex gap-2 items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    Once you publish, Meta will start delivering ads and charging up to
                    <strong> {formatCurrency(campaign.daily_budget)}/day </strong>
                    to your ad account. You can pause anytime, but spend already incurred is non-refundable.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox id="ack" checked={acknowledged} onCheckedChange={(v) => setAcknowledged(!!v)} />
                <Label htmlFor="ack" className="text-sm leading-snug">
                  I understand this campaign will start spending up to {formatCurrency(campaign.daily_budget)}/day on Meta.
                </Label>
              </div>

              <div>
                <Label htmlFor="confirm">Type the campaign name to confirm</Label>
                <Input
                  id="confirm"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={campaign.name}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </ScrollArea>

        <Separator />
        <div className="flex justify-between items-center pt-2">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={loading || adSets.length === 0 || totalAds === 0}
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() =>
                  publish.mutate(campaign.id, {
                    onSuccess: () => onOpenChange(false),
                  })
                }
                disabled={!canPublish}
                className="bg-green-600 hover:bg-green-700"
              >
                {publish.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : null}
                Publish to Meta
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
