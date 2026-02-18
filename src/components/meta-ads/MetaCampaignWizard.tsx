import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { useCreateMetaCampaign, useCreateMetaAdSet, useCreateMetaAd } from '@/hooks/use-meta-campaigns';
import { useFirm } from '@/hooks/use-firm';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronRight, ChevronLeft, Target, Users, DollarSign, Eye, CheckCircle2,
  Zap, Globe, Smartphone, Monitor, Image, Play, Layers, X, Plus, Loader2, Sparkles
} from 'lucide-react';

// ─── Meta Ads Campaign Goals (mirrors Meta Ads Manager) ───
const CAMPAIGN_GOALS = [
  { id: 'OUTCOME_AWARENESS', label: 'Awareness', description: 'Reach people who are likely to remember your ad', icon: Eye, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { id: 'OUTCOME_TRAFFIC', label: 'Traffic', description: 'Send people to a destination on or off Facebook', icon: Globe, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { id: 'OUTCOME_ENGAGEMENT', label: 'Engagement', description: 'Get more interactions, video views, or post activity', icon: Zap, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  { id: 'OUTCOME_LEADS', label: 'Leads', description: 'Collect leads via forms, calls, or chats', icon: Users, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { id: 'OUTCOME_APP_PROMOTION', label: 'App Promotion', description: 'Get more installs and engagement for your app', icon: Smartphone, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  { id: 'OUTCOME_SALES', label: 'Sales', description: 'Find people likely to purchase your product or service', icon: DollarSign, color: 'bg-red-500/10 text-red-600 border-red-500/20' },
];

const PLACEMENTS = [
  { id: 'facebook_feed', label: 'Facebook Feed', platform: 'Facebook' },
  { id: 'facebook_stories', label: 'Facebook Stories', platform: 'Facebook' },
  { id: 'facebook_reels', label: 'Facebook Reels', platform: 'Facebook' },
  { id: 'facebook_right_column', label: 'Facebook Right Column', platform: 'Facebook' },
  { id: 'instagram_feed', label: 'Instagram Feed', platform: 'Instagram' },
  { id: 'instagram_stories', label: 'Instagram Stories', platform: 'Instagram' },
  { id: 'instagram_reels', label: 'Instagram Reels', platform: 'Instagram' },
  { id: 'instagram_explore', label: 'Instagram Explore', platform: 'Instagram' },
  { id: 'messenger_inbox', label: 'Messenger Inbox', platform: 'Messenger' },
  { id: 'audience_network_native', label: 'Audience Network', platform: 'Audience Network' },
];

const LEGAL_INTERESTS = [
  'Personal Injury', 'Mass Tort Litigation', 'Medical Malpractice', 'Drug Side Effects',
  'Mesothelioma', 'Asbestos', 'Roundup Herbicide', 'Camp Lejeune', 'AFFF Firefighting Foam',
  'Paraquat', 'NEC Baby Formula', 'Hip Replacement Recall', 'Car Accidents', 'Truck Accidents',
  'Workers Compensation', 'Social Security Disability', 'Veterans Benefits', 'Bankruptcy',
  'DUI Defense', 'Criminal Defense', 'Healthcare', 'Health Insurance', 'Disability Insurance',
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
];

const GENDERS = [
  { id: 'all', label: 'All' },
  { id: 'male', label: 'Men' },
  { id: 'female', label: 'Women' },
];

const EDUCATION_LEVELS = [
  'High School', 'Some College', "Associate's Degree", "Bachelor's Degree", "Master's Degree", 'Doctorate',
];

const INCOME_BRACKETS = [
  'Top 10%', 'Top 25%', 'Top 50%', 'Lower 50%',
];

const DEVICE_TYPES = ['Mobile', 'Desktop', 'Tablet'];

const OPTIMIZATION_EVENTS = [
  { value: 'LEAD', label: 'Leads' },
  { value: 'LANDING_PAGE_VIEW', label: 'Landing Page Views' },
  { value: 'LINK_CLICK', label: 'Link Clicks' },
  { value: 'IMPRESSIONS', label: 'Impressions' },
  { value: 'REACH', label: 'Reach' },
  { value: 'THRUPLAY', label: 'ThruPlay (Video)' },
];

const BID_STRATEGIES = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Lowest Cost (Recommended)' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Bid Cap' },
  { value: 'COST_CAP', label: 'Cost Per Result Goal' },
  { value: 'MINIMUM_ROAS', label: 'Minimum ROAS' },
];

const CTA_OPTIONS = [
  'LEARN_MORE', 'GET_QUOTE', 'CONTACT_US', 'SIGN_UP', 'SUBSCRIBE',
  'BOOK_TRAVEL', 'CALL_NOW', 'GET_DIRECTIONS', 'MESSAGE_PAGE',
];

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

interface WizardData {
  // Step 1: Campaign Goal
  goal: string;
  campaignName: string;
  tortType: string;
  
  // Step 2: Budget & Schedule
  budgetType: 'daily' | 'lifetime';
  dailyBudget: number;
  lifetimeBudget: number;
  bidStrategy: string;
  targetCostPerLead: number;
  startDate: string;
  endDate: string;
  
  // Step 3: Audience
  ageMin: number;
  ageMax: number;
  genders: string;
  locations: string[];
  interests: string[];
  behaviors: string[];
  educationLevels: string[];
  incomeBrackets: string[];
  languages: string[];
  deviceTypes: string[];
  customAudienceId: string;
  lookalikeEnabled: boolean;
  
  // Step 4: Placements
  placementMode: 'automatic' | 'manual';
  placements: string[];
  optimizationEvent: string;
  
  // Step 5: Ad Creative
  adName: string;
  headline: string;
  bodyText: string;
  description: string;
  callToAction: string;
  imageUrl: string;
  linkUrl: string;
  useAiCreative: boolean;
}

const defaultData: WizardData = {
  goal: '', campaignName: '', tortType: '',
  budgetType: 'daily', dailyBudget: 50, lifetimeBudget: 0,
  bidStrategy: 'LOWEST_COST_WITHOUT_CAP', targetCostPerLead: 0,
  startDate: '', endDate: '',
  ageMin: 25, ageMax: 65, genders: 'all',
  locations: [], interests: [], behaviors: [],
  educationLevels: [], incomeBrackets: [], languages: [], deviceTypes: [],
  customAudienceId: '', lookalikeEnabled: false,
  placementMode: 'automatic', placements: ['facebook_feed', 'instagram_feed'],
  optimizationEvent: 'LEAD',
  adName: '', headline: '', bodyText: '', description: '',
  callToAction: 'LEARN_MORE', imageUrl: '', linkUrl: '', useAiCreative: false,
};

const STEPS = ['Goal', 'Budget', 'Audience', 'Placements', 'Creative', 'Review'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (campaignId: string) => void;
  prefillData?: Partial<WizardData>;
}

export function MetaCampaignWizard({ open, onOpenChange, onCreated, prefillData }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({ ...defaultData, ...prefillData });
  const [isCreating, setIsCreating] = useState(false);
  const { data: firm } = useFirm();
  const { toast } = useToast();
  const createCampaign = useCreateMetaCampaign();
  const createAdSet = useCreateMetaAdSet();
  const createAd = useCreateMetaAd();

  const update = (partial: Partial<WizardData>) => setData(prev => ({ ...prev, ...partial }));

  const toggleArray = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const campaign = await new Promise<any>((resolve, reject) => {
        createCampaign.mutate({
          name: data.campaignName,
          tort_type: data.tortType,
          objective: data.goal,
          daily_budget: data.budgetType === 'daily' ? data.dailyBudget : 0,
          lifetime_budget: data.budgetType === 'lifetime' ? data.lifetimeBudget : 0,
          bid_strategy: data.bidStrategy,
          target_states: data.locations,
        }, { onSuccess: resolve, onError: reject });
      });

      const adSet = await new Promise<any>((resolve, reject) => {
        createAdSet.mutate({
          campaign_id: campaign.id,
          name: `${data.campaignName} - Audience`,
          age_min: data.ageMin,
          age_max: data.ageMax,
          genders: data.genders === 'all' ? [] : [data.genders],
          interests: data.interests.map(i => ({ name: i })),
          locations: data.locations.map(l => ({ name: l })),
          placements: data.placementMode === 'automatic'
            ? ['facebook_feed', 'instagram_feed', 'facebook_stories', 'instagram_stories']
            : data.placements,
          placement_type: data.placementMode,
          optimization_event: data.optimizationEvent,
          targeting: {
            education_levels: data.educationLevels,
            income_brackets: data.incomeBrackets,
            languages: data.languages,
            device_types: data.deviceTypes,
            behaviors: data.behaviors,
          },
        }, { onSuccess: resolve, onError: reject });
      });

      if (data.headline) {
        await new Promise<void>((resolve, reject) => {
          createAd.mutate({
            ad_set_id: adSet.id,
            name: data.adName || `${data.campaignName} - Ad`,
            headline: data.headline,
            body_text: data.bodyText,
            description: data.description,
            call_to_action: data.callToAction,
            link_url: data.linkUrl || undefined,
            image_url: data.imageUrl || undefined,
            ai_generated: data.useAiCreative,
          }, { onSuccess: () => resolve(), onError: reject });
        });
      }

      toast({ title: '🚀 Campaign created!', description: `"${data.campaignName}" is ready to launch.` });
      onCreated?.(campaign.id);
      onOpenChange(false);
      setStep(0);
      setData({ ...defaultData });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return !!data.goal && !!data.campaignName;
    if (step === 1) return data.dailyBudget > 0 || data.lifetimeBudget > 0;
    if (step === 4) return !!data.headline;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Create Meta Campaign
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    i === step ? 'bg-primary text-primary-foreground' :
                    i < step ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20' :
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < step && <CheckCircle2 className="h-3 w-3" />}
                  {s}
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* STEP 0: Campaign Goal */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">What's your campaign objective?</Label>
                <p className="text-sm text-muted-foreground mt-1">Your objective determines how your ads are optimized and who they're shown to.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CAMPAIGN_GOALS.map(goal => {
                  const Icon = goal.icon;
                  return (
                    <button
                      key={goal.id}
                      onClick={() => update({ goal: goal.id })}
                      className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                        data.goal === goal.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div className={`inline-flex p-2 rounded-lg mb-2 border ${goal.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="font-semibold text-sm">{goal.label}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{goal.description}</p>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <Label>Campaign Name *</Label>
                  <Input value={data.campaignName} onChange={e => update({ campaignName: e.target.value })} placeholder="e.g., Camp Lejeune - Florida Q1" className="mt-1" />
                </div>
                <div>
                  <Label>Tort / Case Type</Label>
                  <Input value={data.tortType} onChange={e => update({ tortType: e.target.value })} placeholder="e.g., Camp Lejeune, Roundup" className="mt-1" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Budget & Schedule */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="text-base font-semibold">Budget & Bid Strategy</Label>
                <p className="text-sm text-muted-foreground mt-1">Set how much you want to spend and how Meta should bid.</p>
              </div>

              <div className="flex gap-3">
                <Button variant={data.budgetType === 'daily' ? 'default' : 'outline'} size="sm" onClick={() => update({ budgetType: 'daily' })}>Daily Budget</Button>
                <Button variant={data.budgetType === 'lifetime' ? 'default' : 'outline'} size="sm" onClick={() => update({ budgetType: 'lifetime' })}>Lifetime Budget</Button>
              </div>

              {data.budgetType === 'daily' ? (
                <div>
                  <Label>Daily Budget ($)</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Input type="number" value={data.dailyBudget} onChange={e => update({ dailyBudget: Number(e.target.value) })} className="w-32" min={1} />
                    <div className="flex-1">
                      <Slider value={[data.dailyBudget]} onValueChange={([v]) => update({ dailyBudget: v })} min={5} max={1000} step={5} />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>$5</span><span>$1,000</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Lifetime Budget ($)</Label>
                  <Input type="number" value={data.lifetimeBudget} onChange={e => update({ lifetimeBudget: Number(e.target.value) })} className="w-40 mt-1" />
                </div>
              )}

              <div>
                <Label>Bid Strategy</Label>
                <Select value={data.bidStrategy} onValueChange={v => update({ bidStrategy: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BID_STRATEGIES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {(data.bidStrategy === 'COST_CAP' || data.bidStrategy === 'LOWEST_COST_WITH_BID_CAP') && (
                <div>
                  <Label>Target Cost Per Lead ($)</Label>
                  <Input type="number" value={data.targetCostPerLead} onChange={e => update({ targetCostPerLead: Number(e.target.value) })} className="w-40 mt-1" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={data.startDate} onChange={e => update({ startDate: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>End Date (optional)</Label>
                  <Input type="date" value={data.endDate} onChange={e => update({ endDate: e.target.value })} className="mt-1" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Audience */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className="text-base font-semibold">Define Your Audience</Label>
                <p className="text-sm text-muted-foreground mt-1">Be specific to reach the right people at the right cost.</p>
              </div>

              {/* Age */}
              <div>
                <Label>Age Range: {data.ageMin} – {data.ageMax}</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-12">Min {data.ageMin}</span>
                    <Slider value={[data.ageMin]} onValueChange={([v]) => update({ ageMin: Math.min(v, data.ageMax - 1) })} min={18} max={65} step={1} className="flex-1" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-12">Max {data.ageMax}</span>
                    <Slider value={[data.ageMax]} onValueChange={([v]) => update({ ageMax: Math.max(v, data.ageMin + 1) })} min={18} max={65} step={1} className="flex-1" />
                  </div>
                </div>
              </div>

              {/* Gender */}
              <div>
                <Label>Gender</Label>
                <div className="flex gap-2 mt-2">
                  {GENDERS.map(g => (
                    <Button key={g.id} variant={data.genders === g.id ? 'default' : 'outline'} size="sm" onClick={() => update({ genders: g.id })}>{g.label}</Button>
                  ))}
                </div>
              </div>

              {/* Locations */}
              <div>
                <Label>Target States</Label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {STATES.map(s => (
                    <button
                      key={s}
                      onClick={() => update({ locations: toggleArray(data.locations, s) })}
                      className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                        data.locations.includes(s) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'
                      }`}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div>
                <Label>Interests & Behaviors</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Target people who have shown interest in related topics</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {LEGAL_INTERESTS.map(i => (
                    <button
                      key={i}
                      onClick={() => update({ interests: toggleArray(data.interests, i) })}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        data.interests.includes(i) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'
                      }`}
                    >{i}</button>
                  ))}
                </div>
              </div>

              {/* Demographics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Education Level</Label>
                  <div className="space-y-1.5 mt-2">
                    {EDUCATION_LEVELS.map(edu => (
                      <label key={edu} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={data.educationLevels.includes(edu)}
                          onChange={() => update({ educationLevels: toggleArray(data.educationLevels, edu) })}
                          className="rounded border-border" />
                        <span className="text-sm">{edu}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Household Income</Label>
                  <div className="space-y-1.5 mt-2">
                    {INCOME_BRACKETS.map(inc => (
                      <label key={inc} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={data.incomeBrackets.includes(inc)}
                          onChange={() => update({ incomeBrackets: toggleArray(data.incomeBrackets, inc) })}
                          className="rounded border-border" />
                        <span className="text-sm">{inc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Languages */}
              <div>
                <Label>Languages</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => update({ languages: toggleArray(data.languages, l.code) })}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        data.languages.includes(l.code) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'
                      }`}
                    >{l.label}</button>
                  ))}
                </div>
              </div>

              {/* Lookalike */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">Lookalike Audience</p>
                  <p className="text-xs text-muted-foreground">Find people similar to your existing leads</p>
                </div>
                <Switch checked={data.lookalikeEnabled} onCheckedChange={v => update({ lookalikeEnabled: v })} />
              </div>
            </div>
          )}

          {/* STEP 3: Placements */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <Label className="text-base font-semibold">Ad Placements</Label>
                <p className="text-sm text-muted-foreground mt-1">Choose where your ads will appear.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => update({ placementMode: 'automatic' })}
                  className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${data.placementMode === 'automatic' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                >
                  <p className="font-semibold text-sm">Advantage+ Placements</p>
                  <p className="text-xs text-muted-foreground mt-1">Let Meta automatically find the best placements. Recommended for most advertisers.</p>
                </button>
                <button
                  onClick={() => update({ placementMode: 'manual' })}
                  className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${data.placementMode === 'manual' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                >
                  <p className="font-semibold text-sm">Manual Placements</p>
                  <p className="text-xs text-muted-foreground mt-1">Choose specific platforms and placements for full control.</p>
                </button>
              </div>

              {data.placementMode === 'manual' && (
                <div>
                  <Label>Select Placements</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PLACEMENTS.map(p => (
                      <label key={p.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${data.placements.includes(p.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                        <input type="checkbox" checked={data.placements.includes(p.id)}
                          onChange={() => update({ placements: toggleArray(data.placements, p.id) })}
                          className="rounded" />
                        <div>
                          <p className="text-xs font-medium">{p.label}</p>
                          <p className="text-[10px] text-muted-foreground">{p.platform}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Optimization Event</Label>
                <Select value={data.optimizationEvent} onValueChange={v => update({ optimizationEvent: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPTIMIZATION_EVENTS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Device targeting */}
              <div>
                <Label>Device Types</Label>
                <div className="flex gap-2 mt-2">
                  {DEVICE_TYPES.map(d => (
                    <button
                      key={d}
                      onClick={() => update({ deviceTypes: toggleArray(data.deviceTypes, d) })}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${data.deviceTypes.includes(d) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'}`}
                    >{d}</button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Leave empty to target all devices</p>
              </div>
            </div>
          )}

          {/* STEP 4: Ad Creative */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Ad Creative</Label>
                <p className="text-sm text-muted-foreground mt-1">Design your ad. This is what people will see.</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">AI-Generated Creative</p>
                    <p className="text-xs text-muted-foreground">Let AI write headlines and body text based on your campaign</p>
                  </div>
                </div>
                <Switch checked={data.useAiCreative} onCheckedChange={v => update({ useAiCreative: v })} />
              </div>

              <div>
                <Label>Ad Name</Label>
                <Input value={data.adName} onChange={e => update({ adName: e.target.value })} placeholder="e.g., Ad 1 - Emotional Angle" className="mt-1" />
              </div>

              <div>
                <Label>Headline * (max 40 chars)</Label>
                <Input value={data.headline} onChange={e => update({ headline: e.target.value })} placeholder="e.g., Were You Exposed at Camp Lejeune?" className="mt-1" maxLength={40} />
                <p className="text-xs text-muted-foreground mt-1 text-right">{data.headline.length}/40</p>
              </div>

              <div>
                <Label>Primary Text (max 125 chars)</Label>
                <Textarea value={data.bodyText} onChange={e => update({ bodyText: e.target.value })} placeholder="If you or a loved one lived or worked at Camp Lejeune..." rows={3} className="mt-1 resize-none" maxLength={125} />
                <p className="text-xs text-muted-foreground mt-1 text-right">{data.bodyText.length}/125</p>
              </div>

              <div>
                <Label>Description</Label>
                <Input value={data.description} onChange={e => update({ description: e.target.value })} placeholder="Free case evaluation. No upfront fees." className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Call to Action</Label>
                  <Select value={data.callToAction} onValueChange={v => update({ callToAction: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CTA_OPTIONS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Destination URL</Label>
                  <Input value={data.linkUrl} onChange={e => update({ linkUrl: e.target.value })} placeholder="https://yourfirm.com/case" className="mt-1" />
                </div>
              </div>

              <div>
                <Label>Image/Video URL</Label>
                <Input value={data.imageUrl} onChange={e => update({ imageUrl: e.target.value })} placeholder="https://... (optional)" className="mt-1" />
              </div>

              {/* Live preview card */}
              {data.headline && (
                <div>
                  <Label className="text-xs text-muted-foreground">PREVIEW</Label>
                  <div className="mt-2 rounded-xl border overflow-hidden max-w-xs">
                    <div className="bg-muted h-32 flex items-center justify-center text-muted-foreground text-sm">
                      {data.imageUrl ? <img src={data.imageUrl} alt="ad" className="w-full h-full object-cover" /> : <Image className="h-8 w-8 opacity-30" />}
                    </div>
                    <div className="p-3 bg-card">
                      <p className="text-[10px] text-muted-foreground">Sponsored</p>
                      <p className="font-semibold text-sm mt-0.5">{data.headline}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.bodyText}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs font-medium truncate">{data.linkUrl || 'yourfirm.com'}</p>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">{data.callToAction.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Review */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Review & Launch</Label>
                <p className="text-sm text-muted-foreground mt-1">Double-check your campaign settings before creating.</p>
              </div>

              <div className="space-y-3">
                <Card><CardContent className="p-4 space-y-2">
                  <p className="font-semibold text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Campaign</p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Name</span><span className="font-medium">{data.campaignName}</span>
                    <span className="text-muted-foreground">Goal</span><span><Badge variant="outline">{CAMPAIGN_GOALS.find(g => g.id === data.goal)?.label}</Badge></span>
                    <span className="text-muted-foreground">Tort Type</span><span>{data.tortType || '—'}</span>
                  </div>
                </CardContent></Card>

                <Card><CardContent className="p-4 space-y-2">
                  <p className="font-semibold text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-600" />Budget</p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Type</span><span className="font-medium capitalize">{data.budgetType}</span>
                    <span className="text-muted-foreground">Amount</span><span className="font-medium">${data.budgetType === 'daily' ? `${data.dailyBudget}/day` : data.lifetimeBudget + ' total'}</span>
                    <span className="text-muted-foreground">Bid Strategy</span><span>{BID_STRATEGIES.find(b => b.value === data.bidStrategy)?.label}</span>
                  </div>
                </CardContent></Card>

                <Card><CardContent className="p-4 space-y-2">
                  <p className="font-semibold text-sm flex items-center gap-2"><Users className="h-4 w-4 text-blue-600" />Audience</p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Age</span><span>{data.ageMin}–{data.ageMax}</span>
                    <span className="text-muted-foreground">Gender</span><span className="capitalize">{data.genders}</span>
                    <span className="text-muted-foreground">States</span><span>{data.locations.length > 0 ? data.locations.join(', ') : 'All'}</span>
                    <span className="text-muted-foreground">Interests</span><span>{data.interests.length} selected</span>
                    {data.lookalikeEnabled && <><span className="text-muted-foreground">Lookalike</span><span className="text-green-600">Enabled</span></>}
                  </div>
                </CardContent></Card>

                <Card><CardContent className="p-4 space-y-2">
                  <p className="font-semibold text-sm flex items-center gap-2"><Layers className="h-4 w-4 text-purple-600" />Placements & Ad</p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Placements</span><span className="capitalize">{data.placementMode === 'automatic' ? 'Advantage+ (Auto)' : `${data.placements.length} selected`}</span>
                    <span className="text-muted-foreground">Optimization</span><span>{data.optimizationEvent}</span>
                    <span className="text-muted-foreground">Headline</span><span className="truncate">{data.headline}</span>
                    <span className="text-muted-foreground">CTA</span><span>{data.callToAction.replace(/_/g, ' ')}</span>
                  </div>
                </CardContent></Card>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <Button variant="outline" onClick={() => step === 0 ? onOpenChange(false) : setStep(s => s - 1)}>
            {step === 0 ? 'Cancel' : <><ChevronLeft className="h-4 w-4 mr-1" />Back</>}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isCreating ? 'Creating...' : 'Create Campaign'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
