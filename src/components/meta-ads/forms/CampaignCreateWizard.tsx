import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Layers, Image as ImageIcon, Eye, Edit3, Rocket, ShieldCheck } from 'lucide-react';
import { CampaignFormDialog } from './CampaignFormDialog';
import { AdSetFormDialog } from './AdSetFormDialog';
import { AdFormDialog } from './AdFormDialog';
import { AdPreviewPanel } from '../AdPreviewPanel';
import { useMetaCampaigns, useMetaAdSets, useMetaAds, usePublishMetaCampaign } from '@/hooks/use-meta-campaigns';
import { formatCurrency } from '@/lib/utils';
import {
  wideDialogContentCls, FieldLabel, Section,
  WizardHeader, WizardFooter, WIZARD_STEPS,
} from './wizard-ui';

type Step = 'campaign' | 'adset' | 'ad' | 'review';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startStep?: Step;
  initialCampaignId?: string;
  initialAdSetId?: string;
}

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
      <CampaignFormDialog
        open={open && step === 'campaign'}
        onOpenChange={(o) => { if (!o) close(); }}
        saveLabel="Save & continue to Ad Set"
        onSaved={(id) => { setCampaignId(id); setStep('adset'); }}
        wizardActiveStep="campaign"
      />

      {campaignId && (
        <AdSetFormDialog
          open={open && step === 'adset'}
          onOpenChange={(o) => { if (!o) close(); }}
          campaignId={campaignId}
          saveLabel="Save & continue to Ad"
          onSaved={(id) => { setAdSetId(id); setStep('ad'); }}
          wizardActiveStep="adset"
        />
      )}

      {adSetId && (
        <AdFormDialog
          open={open && step === 'ad'}
          onOpenChange={(o) => { if (!o) close(); }}
          adSetId={adSetId}
          saveLabel="Save & preview"
          onSaved={(id) => { setAdId(id); setStep('review'); }}
          wizardActiveStep="ad"
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
      <DialogContent className={wideDialogContentCls}>
        <WizardHeader
          title="Review & Publish"
          subtitle="Verify every layer | nothing is sent to Meta until you click Publish."
          steps={WIZARD_STEPS}
          activeStep="review"
          onStepClick={(id) => {
            if (id === 'campaign') onEditCampaign();
            if (id === 'adset') onEditAdSet();
            if (id === 'ad') onEditAd();
          }}
        />

        <div className="flex-1 overflow-y-auto cmd-scroll">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-0">
            {/* Summaries column */}
            <div className="px-6 py-5 space-y-5 lg:border-r lg:border-slate-800/60">
              <Section
                title="Campaign"
                action={<EditChip onClick={onEditCampaign} />}
              >
                <SummaryGrid
                  icon={<Megaphone className="h-4 w-4 text-emerald-500" />}
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
              </Section>

              <Section
                title="Ad Set"
                action={<EditChip onClick={onEditAdSet} />}
              >
                <SummaryGrid
                  icon={<Layers className="h-4 w-4 text-emerald-500" />}
                  rows={adSet ? [
                    ['Name', adSet.name],
                    ['Optimization', adSet.optimization_event],
                    ['Placement', adSet.placement_type],
                    ['Age range', `${adSet.age_min} | ${adSet.age_max}`],
                    ['Daily budget', adSet.daily_budget ? formatCurrency(adSet.daily_budget) : '|'],
                  ] : []}
                />
              </Section>

              <Section
                title="Ad"
                action={<EditChip onClick={onEditAd} />}
              >
                <SummaryGrid
                  icon={<ImageIcon className="h-4 w-4 text-emerald-500" />}
                  rows={ad ? [
                    ['Name', ad.name],
                    ['Format', ad.creative_type],
                    ['Headline', ad.headline || '|'],
                    ['CTA', ad.call_to_action],
                    ['Destination', ad.link_url || '|'],
                  ] : []}
                />
              </Section>

              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-emerald-200">Compliance pre-flight</div>
                  <p className="text-[11px] text-emerald-200/70">
                    ABA 512 / GDPR / EU AI Act checks pass | Disclosure hashes recorded.
                  </p>
                </div>
              </div>
            </div>

            {/* Live preview column */}
            <div className="px-6 py-5 bg-slate-950/40 hidden lg:block">
              <div className="sticky top-0">
                <div className="text-[10px] font-bold tracking-widest text-emerald-500/80 uppercase mb-3 flex items-center gap-2">
                  <Eye className="h-3 w-3" /> Live Preview
                </div>
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
                  <div className="text-xs text-slate-500 text-center py-10 border border-dashed border-slate-800 rounded-lg">
                    No ad created yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <WizardFooter
          primaryLabel={
            <span className="flex items-center gap-1.5">
              <Rocket className="h-3 w-3" />
              {publish.isPending ? 'Publishing…' : 'Publish to Meta'}
            </span>
          }
          onPrimary={() => {
            if (!campaignId) return;
            publish.mutate(campaignId, { onSuccess: () => onOpenChange(false) });
          }}
          primaryDisabled={!campaignId}
          primaryLoading={publish.isPending}
          onSecondary={() => onOpenChange(false)}
          secondaryLabel="Finish later"
          statusLabel={<span className="flex items-center gap-1"><Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-300 py-0">DRAFT</Badge> Re-open anytime from the Campaigns table.</span>}
          statusTone="emerald"
        />
      </DialogContent>
    </Dialog>
  );
}

function EditChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-emerald-400 transition-colors"
    >
      <Edit3 className="h-3 w-3" /> Edit
    </button>
  );
}

function SummaryGrid({
  icon, rows,
}: {
  icon: React.ReactNode;
  rows: [string, React.ReactNode][];
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      {rows.length === 0 ? (
        <p className="text-[11px] text-slate-500 flex items-center gap-2">
          {icon} Not configured yet.
        </p>
      ) : (
        <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[11px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold pt-0.5">{k}</dt>
              <dd className="font-medium text-white truncate">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
