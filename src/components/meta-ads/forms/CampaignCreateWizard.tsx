import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Megaphone, Layers, Image as ImageIcon, Eye, ChevronRight } from 'lucide-react';
import { CampaignFormDialog } from './CampaignFormDialog';
import { AdSetFormDialog } from './AdSetFormDialog';
import { AdFormDialog } from './AdFormDialog';
import { AdPreviewPanel } from '../AdPreviewPanel';
import { useMetaCampaigns, useMetaAdSets, useMetaAds, usePublishMetaCampaign } from '@/hooks/use-meta-campaigns';
import { formatCurrency } from '@/lib/utils';

type Step = 'campaign' | 'adset' | 'ad' | 'review';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startStep?: Step;
  initialCampaignId?: string;
  initialAdSetId?: string;
}

const STEPS: { id: Step; label: string; icon: any }[] = [
  { id: 'campaign', label: 'Campaign', icon: Megaphone },
  { id: 'adset', label: 'Ad Set', icon: Layers },
  { id: 'ad', label: 'Ad', icon: ImageIcon },
  { id: 'review', label: 'Review', icon: Eye },
];

export function CampaignCreateWizard({
  open,
  onOpenChange,
  startStep = 'campaign',
  initialCampaignId,
  initialAdSetId,
}: Props) {
  const [step, setStep] = useState<Step>(startStep);
  const [campaignId, setCampaignId] = useState<string | undefined>(initialCampaignId);
  const [adSetId, setAdSetId] = useState<string | undefined>(initialAdSetId);
  const [adId, setAdId] = useState<string | undefined>(undefined);

  // Reset internal state whenever the wizard re-opens.
  useEffect(() => {
    if (open) {
      setStep(startStep);
      setCampaignId(initialCampaignId);
      setAdSetId(initialAdSetId);
      setAdId(undefined);
    }
  }, [open, startStep, initialCampaignId, initialAdSetId]);

  const close = () => onOpenChange(false);

  return (
    <>
      {/* Stepper header is rendered inside each child dialog via wrapping wizard chrome. */}
      <WizardStepperOverlay open={open} step={step} />

      <CampaignFormDialog
        open={open && step === 'campaign'}
        onOpenChange={(o) => { if (!o) close(); }}
        saveLabel="Save & continue to Ad Set"
        onSaved={(id) => { setCampaignId(id); setStep('adset'); }}
      />

      {campaignId && (
        <AdSetFormDialog
          open={open && step === 'adset'}
          onOpenChange={(o) => { if (!o) close(); }}
          campaignId={campaignId}
          saveLabel="Save & continue to Ad"
          onSaved={(id) => { setAdSetId(id); setStep('ad'); }}
        />
      )}

      {adSetId && (
        <AdFormDialog
          open={open && step === 'ad'}
          onOpenChange={(o) => { if (!o) close(); }}
          adSetId={adSetId}
          saveLabel="Save & preview"
          onSaved={(id) => { setAdId(id); setStep('review'); }}
        />
      )}

      <ReviewDialog
        open={open && step === 'review'}
        onOpenChange={(o) => { if (!o) close(); }}
        campaignId={campaignId}
        adSetId={adSetId}
        adId={adId}
        onEditCampaign={() => setStep('campaign')}
        onEditAdSet={() => setStep('adset')}
        onEditAd={() => setStep('ad')}
      />
    </>
  );
}

/* ─────────── Stepper overlay (purely visual; pinned to top) ─────────── */
function WizardStepperOverlay({ open, step }: { open: boolean; step: Step }) {
  if (!open) return null;
  const activeIdx = STEPS.findIndex((s) => s.id === step);
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
      <div className="flex items-center gap-1.5 rounded-full border bg-background/90 backdrop-blur px-3 py-1.5 shadow-md">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div key={s.id} className="flex items-center gap-1.5">
              <div
                className={[
                  'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                  active ? 'bg-primary text-primary-foreground' : '',
                  done ? 'text-emerald-600' : '',
                  !active && !done ? 'text-muted-foreground' : '',
                ].join(' ')}
              >
                {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Review / Preview step ─────────── */
function ReviewDialog({
  open, onOpenChange, campaignId, adSetId, adId,
  onEditCampaign, onEditAdSet, onEditAd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  onEditCampaign: () => void;
  onEditAdSet: () => void;
  onEditAd: () => void;
}) {
  const { data: campaigns } = useMetaCampaigns();
  const { data: adSets } = useMetaAdSets();
  const { data: ads } = useMetaAds();
  const publish = usePublishMetaCampaign();

  const campaign = useMemo(() => campaigns?.find((c) => c.id === campaignId), [campaigns, campaignId]);
  const adSet = useMemo(() => adSets?.find((a) => a.id === adSetId), [adSets, adSetId]);
  const ad = useMemo(() => ads?.find((a) => a.id === adId), [ads, adId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review &amp; Publish</DialogTitle>
          <DialogDescription>
            Everything below is saved as a draft. Nothing is sent to Meta until you click <strong>Publish to Meta</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
          {/* Left: summaries */}
          <div className="space-y-4">
            <SummaryCard
              title="Campaign"
              icon={<Megaphone className="h-4 w-4" />}
              onEdit={onEditCampaign}
              rows={campaign ? [
                ['Name', campaign.name],
                ['Objective', campaign.objective],
                ['Bid strategy', campaign.bid_strategy],
                ['Daily budget', campaign.daily_budget ? formatCurrency(campaign.daily_budget) : '|'],
                ['Lifetime budget', campaign.lifetime_budget ? formatCurrency(campaign.lifetime_budget) : '|'],
                ['Country', (campaign as any).target_country || '|'],
                ['Locations', (campaign.target_states || []).join(', ') || '|'],
                ['Status', campaign.status],
              ] : []}
            />

            <SummaryCard
              title="Ad Set"
              icon={<Layers className="h-4 w-4" />}
              onEdit={onEditAdSet}
              rows={adSet ? [
                ['Name', adSet.name],
                ['Optimization', adSet.optimization_event],
                ['Placement', adSet.placement_type],
                ['Age range', `${adSet.age_min} – ${adSet.age_max}`],
                ['Daily budget', adSet.daily_budget ? formatCurrency(adSet.daily_budget) : '|'],
              ] : []}
            />

            <SummaryCard
              title="Ad"
              icon={<ImageIcon className="h-4 w-4" />}
              onEdit={onEditAd}
              rows={ad ? [
                ['Name', ad.name],
                ['Format', ad.creative_type],
                ['Headline', ad.headline || '|'],
                ['CTA', ad.call_to_action],
                ['Destination', ad.link_url || '|'],
              ] : []}
            />
          </div>

          {/* Right: live preview */}
          <div className="lg:border-l lg:pl-6">
            {ad ? (
              <AdPreviewPanel
                headline={ad.headline || ''}
                bodyText={ad.body_text || ''}
                description={ad.description || ''}
                callToAction={ad.call_to_action || 'LEARN_MORE'}
                linkUrl={ad.link_url || ''}
                imageUrl={ad.image_url || undefined}
              />
            ) : (
              <div className="text-sm text-muted-foreground">No ad created yet.</div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-row gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Draft</Badge>
            <span className="text-xs text-muted-foreground">You can re-open this from the Campaigns table.</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Finish later</Button>
            <Button
              disabled={!campaignId || publish.isPending}
              onClick={() => {
                if (!campaignId) return;
                publish.mutate(campaignId, { onSuccess: () => onOpenChange(false) });
              }}
            >
              {publish.isPending ? 'Publishing…' : 'Publish to Meta'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({
  title, icon, rows, onEdit,
}: {
  title: string;
  icon: React.ReactNode;
  rows: [string, React.ReactNode][];
  onEdit: () => void;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</div>
        <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Not configured yet.</p>
      ) : (
        <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium truncate">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
