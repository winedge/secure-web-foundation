import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2, ArrowRight, ArrowLeft, Globe, Mail, Phone, Briefcase,
  CreditCard, Facebook, Megaphone, Check, Crown, Loader2, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useCreateFirm, useFirm } from '@/hooks/use-firm';
import { useAuth } from '@/lib/auth-context';
import { useSubscription, SUBSCRIPTION_TIERS } from '@/hooks/use-subscription';
import { useConnectMetaPlatform, usePlatformConnections } from '@/hooks/use-platform-connections';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VerticalSelector } from '@/components/onboarding/VerticalSelector';
import type { VerticalPreset } from '@/lib/verticals/presets';

const STEPS = [
  { label: 'Choose Industry', icon: Layers },
  { label: 'Set Up Firm', icon: Building2 },
  { label: 'Choose Plan', icon: CreditCard },
  { label: 'Connect Facebook', icon: Facebook },
  { label: 'First Campaign', icon: Megaphone },
];

const firmSchema = z.object({
  name: z.string().min(2, 'Firm name must be at least 2 characters'),
  website: z.string().url().optional().or(z.literal('')),
  practice_type: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
});

type FirmFormData = z.infer<typeof firmSchema>;

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createFirm = useCreateFirm();
  const { data: firm } = useFirm();
  const { tier, loading: subLoading } = useSubscription();
  const connectMeta = useConnectMetaPlatform();
  const { data: connections } = usePlatformConnections();
  const [step, setStep] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [selectedVertical, setSelectedVertical] = useState<VerticalPreset | null>(null);
  const [assigningVertical, setAssigningVertical] = useState(false);

  const metaConnected = connections?.some(
    (c) => c.platform === 'facebook' && c.is_active
  );

  // Resume from last saved step
  useEffect(() => {
    if (firm && step === 0) setStep(2);
    if (tier && step <= 2) setStep(3);
    if (metaConnected && step <= 3) setStep(4);
  }, [firm, tier, metaConnected]);

  const progress = ((step + 1) / STEPS.length) * 100;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FirmFormData>({
    resolver: zodResolver(firmSchema),
    defaultValues: {
      name: '',
      website: '',
      practice_type: '',
      contact_email: '',
      contact_phone: '',
    },
  });

  const handleVerticalContinue = async (preset: VerticalPreset) => {
    setSelectedVertical(preset);
    if (user) {
      try {
        await supabase.from('profiles').update({ onboarding_step: 1 } as any).eq('id', user.id);
      } catch (e) {
        // non-blocking
      }
    }
    setStep(1);
  };

  const onFirmSubmit = async (data: FirmFormData) => {
    const created = await createFirm.mutateAsync({
      name: data.name,
      website: data.website || undefined,
      practice_type: data.practice_type || selectedVertical?.name || undefined,
      contact_email: data.contact_email || undefined,
      contact_phone: data.contact_phone || undefined,
    });

    // Assign vertical_id to the newly created firm
    if (selectedVertical && created?.id) {
      setAssigningVertical(true);
      try {
        const { data: vRow } = await supabase
          .from('industry_verticals')
          .select('id')
          .eq('slug', selectedVertical.slug)
          .maybeSingle();
        if (vRow?.id) {
          await supabase.from('firms').update({ vertical_id: vRow.id } as any).eq('id', created.id);
        }
      } catch (e) {
        // non-blocking — firm still works without vertical assignment
      } finally {
        setAssigningVertical(false);
      }
    }

    if (user) {
      await supabase.from('profiles').update({ onboarding_step: 2 } as any).eq('id', user.id);
    }
    setStep(2);
  };

  const handleSubscribe = async (priceId: string, tierKey: string) => {
    setCheckoutLoading(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.info('Complete checkout in the new tab, then come back here.');
      }
    } catch (err: any) {
      toast.error('Failed to start checkout: ' + err.message);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleSkipPlan = () => {
    setStep(3);
  };

  const handleConnectFacebook = () => {
    connectMeta.mutate();
  };

  const handleFinish = async () => {
    if (user) {
      await supabase.from('profiles').update({ onboarding_completed: true, onboarding_step: 5 } as any).eq('id', user.id);
    }
    toast.success('Onboarding complete! Welcome to LeadsThru.');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-accent">
            <span className="text-lg sm:text-xl font-bold text-accent-foreground">L</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-white">LeadsThru</span>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isComplete = i < step;
            const isCurrent = i === step;
            return (
              <div key={s.label} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                    isComplete
                      ? 'bg-accent text-accent-foreground'
                      : isCurrent
                      ? 'bg-white/20 text-white ring-2 ring-accent'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {isComplete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span
                  className={`text-xs hidden sm:block ${
                    isCurrent ? 'text-white font-medium' : 'text-white/50'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        <Progress value={progress} className="h-1.5 mb-6 bg-white/10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-6 pb-12">
        <div className="w-full max-w-lg">
          {/* Step 0: Choose Industry Vertical */}
          {step === 0 && (
            <VerticalSelector
              selectedSlug={selectedVertical?.slug ?? null}
              onSelect={setSelectedVertical}
              onContinue={handleVerticalContinue}
              isPending={false}
            />
          )}

          {/* Step 1: Firm Setup */}
          {step === 1 && (
            <Card className="border-0 shadow-2xl animate-fade-in">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-2xl">Set Up Your {selectedVertical ? selectedVertical.name.split(' ')[0] : ''} Business</CardTitle>
                <CardDescription>
                  {selectedVertical
                    ? `Tell us about your ${selectedVertical.name.toLowerCase()} business`
                    : 'Tell us about your business to get started'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onFirmSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Firm Name <span className="text-destructive">*</span>
                    </label>
                    <Input id="name" placeholder="Smith & Associates" className="h-11" {...register('name')} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" /> Website
                    </label>
                    <Input id="website" placeholder="https://yourfirm.com" className="h-11" {...register('website')} />
                    {errors.website && <p className="text-sm text-destructive">{errors.website.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="practice_type" className="text-sm font-medium flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" /> Practice Type
                    </label>
                    <Input id="practice_type" placeholder="Mass Tort, Personal Injury" className="h-11" {...register('practice_type')} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="contact_email" className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" /> Email
                      </label>
                      <Input id="contact_email" type="email" placeholder="contact@firm.com" className="h-11" {...register('contact_email')} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="contact_phone" className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" /> Phone
                      </label>
                      <Input id="contact_phone" placeholder="(555) 123-4567" className="h-11" {...register('contact_phone')} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" className="flex-1" onClick={() => setStep(0)} disabled={createFirm.isPending}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="flex-1 h-12 text-base" disabled={createFirm.isPending || assigningVertical}>
                      {createFirm.isPending || assigningVertical ? 'Creating...' : 'Continue'}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Choose Plan */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <Card className="border-0 shadow-2xl">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">Choose Your Plan</CardTitle>
                  <CardDescription>Select a subscription to unlock features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic */}
                  <div className={`p-4 rounded-xl border-2 transition-all ${tier === 'basic' ? 'border-accent bg-accent/5' : 'border-border'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">Basic</h3>
                      <span className="text-xl font-bold">${SUBSCRIPTION_TIERS.basic.price}<span className="text-sm text-muted-foreground font-normal">/mo</span></span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                      {SUBSCRIPTION_TIERS.basic.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-accent" /> {f}
                        </li>
                      ))}
                    </ul>
                    {tier === 'basic' ? (
                      <Badge variant="secondary">Current Plan</Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={checkoutLoading !== null}
                        onClick={() => handleSubscribe(SUBSCRIPTION_TIERS.basic.price_id, 'basic')}
                      >
                        {checkoutLoading === 'basic' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Get Basic
                      </Button>
                    )}
                  </div>

                  {/* Premium */}
                  <div className={`p-4 rounded-xl border-2 transition-all ${tier === 'premium' ? 'border-accent bg-accent/5' : 'border-accent/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Crown className="h-5 w-5 text-accent" /> Premium
                      </h3>
                      <span className="text-xl font-bold">${SUBSCRIPTION_TIERS.premium.price}<span className="text-sm text-muted-foreground font-normal">/mo</span></span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                      {SUBSCRIPTION_TIERS.premium.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-accent" /> {f}
                        </li>
                      ))}
                    </ul>
                    {tier === 'premium' ? (
                      <Badge variant="secondary">Current Plan</Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                        disabled={checkoutLoading !== null}
                        onClick={() => handleSubscribe(SUBSCRIPTION_TIERS.premium.price_id, 'premium')}
                      >
                        {checkoutLoading === 'premium' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Get Premium
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="ghost" className="text-white/70 hover:text-white" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button variant="ghost" className="text-white/70 hover:text-white ml-auto" onClick={handleSkipPlan}>
                  Skip for now <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                {tier && (
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => setStep(3)}>
                    Continue <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Connect Facebook */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <Card className="border-0 shadow-2xl">
                <CardHeader className="text-center">
                  <div className="mx-auto w-14 h-14 rounded-xl bg-info/10 flex items-center justify-center mb-4">
                    <Facebook className="h-7 w-7 text-info" />
                  </div>
                  <CardTitle className="text-2xl">Connect Facebook</CardTitle>
                  <CardDescription>
                    Link your Facebook Ads account to run campaigns directly from LeadsThru
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {metaConnected ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20">
                      <Check className="h-6 w-6 text-accent" />
                      <div>
                        <p className="font-medium text-accent">Facebook Connected</p>
                        <p className="text-sm text-muted-foreground">Your account is linked</p>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleConnectFacebook}
                      disabled={connectMeta.isPending}
                    >
                      {connectMeta.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <Facebook className="h-5 w-5 mr-2" />
                      )}
                      Connect Facebook Account
                    </Button>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="ghost" className="text-white/70 hover:text-white" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  variant="ghost"
                  className="text-white/70 hover:text-white ml-auto"
                  onClick={() => setStep(4)}
                >
                  {metaConnected ? 'Continue' : 'Skip for now'} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: First Campaign */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <Card className="border-0 shadow-2xl">
                <CardHeader className="text-center">
                  <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Megaphone className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">You're All Set! 🎉</CardTitle>
                  <CardDescription>
                    Your account is ready. Start by creating your first campaign or exploring the lead marketplace.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full h-12 text-base" onClick={() => { handleFinish(); navigate('/campaigns'); }}>
                    <Megaphone className="h-5 w-5 mr-2" />
                    Create First Campaign
                  </Button>
                  <Button variant="outline" className="w-full h-12 text-base" onClick={() => { handleFinish(); navigate('/marketplace'); }}>
                    Browse Lead Marketplace
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleFinish}>
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>

              <Button variant="ghost" className="text-white/70 hover:text-white" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-white/60 text-xs pb-6">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
}
