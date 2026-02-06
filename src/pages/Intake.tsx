import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, FileText, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSessionId, getDistinctId, trackEvent } from '@/lib/posthog';
const tortTypes = [
  'Camp Lejeune',
  'Roundup',
  'Talcum Powder',
  'AFFF',
  'Paraquat',
  '3M Earplugs',
  'Hernia Mesh',
  'NEC Baby Formula',
  'Tylenol',
  'Zantac',
];

const states = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const ageBuckets = ['18-34', '35-44', '45-54', '55-64', '65+'];

const intakeSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50),
  last_name: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
  address: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(2, 'State is required'),
  zip_code: z.string().min(5, 'ZIP code must be at least 5 digits').max(10),
  age_bucket: z.string().min(1, 'Age range is required'),
  tort_type: z.string().min(1, 'Please select a case type'),
  diagnosis_details: z.string().max(1000).optional(),
  exposure_details: z.string().max(1000).optional(),
  consent_tcpa: z.boolean().refine(val => val === true, 'TCPA consent is required'),
  consent_privacy: z.boolean().refine(val => val === true, 'Privacy policy consent is required'),
  consent_hipaa: z.boolean().optional(),
});

type IntakeFormData = z.infer<typeof intakeSchema>;

export default function Intake() {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaign');
  const preselectedTort = searchParams.get('tort') || '';
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track session timing
  const sessionStartRef = useRef<Date>(new Date());
  const pagesVisitedRef = useRef<string[]>([window.location.pathname]);

  // Track form start time
  useEffect(() => {
    sessionStartRef.current = new Date();
    trackEvent('intake_form_started', {
      campaign_id: campaignId,
      preselected_tort: preselectedTort,
      referrer: document.referrer,
    });
    
    // Track pages visited (for multi-page journeys)
    const handleBeforeUnload = () => {
      const timeSpent = Math.round((new Date().getTime() - sessionStartRef.current.getTime()) / 1000);
      trackEvent('intake_form_abandoned', {
        time_spent_seconds: timeSpent,
        pages_visited: pagesVisitedRef.current,
      });
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [campaignId, preselectedTort]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IntakeFormData>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      tort_type: preselectedTort,
      consent_tcpa: false,
      consent_privacy: false,
      consent_hipaa: false,
    },
  });

  const onSubmit = async (data: IntakeFormData) => {
    setIsSubmitting(true);
    try {
      // Calculate time spent on form
      const timeSpentSeconds = Math.round((new Date().getTime() - sessionStartRef.current.getTime()) / 1000);
      
      // Get PostHog session data
      const posthogSessionId = getSessionId();
      const posthogDistinctId = getDistinctId();
      
      // Generate AI quality score (simplified - in production this would be ML-based)
      const aiQualityScore = Math.floor(Math.random() * 40) + 60; // 60-100
      const fraudRiskScore = Math.floor(Math.random() * 30); // 0-30
      
      // Determine tier based on quality score
      let tier: 'A' | 'B' | 'C' | 'D' = 'C';
      if (aiQualityScore >= 80) tier = 'A';
      else if (aiQualityScore >= 60) tier = 'B';
      else if (aiQualityScore >= 40) tier = 'C';
      else tier = 'D';

      // Calculate price based on tier
      const prices = { A: 2000, B: 1500, C: 1000, D: 500 };
      const price = prices[tier];

      // Build metadata with session tracking info
      const metadata = {
        posthog_session_id: posthogSessionId,
        posthog_distinct_id: posthogDistinctId,
        time_spent_seconds: timeSpentSeconds,
        pages_visited: pagesVisitedRef.current,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        session_start: sessionStartRef.current.toISOString(),
        submission_time: new Date().toISOString(),
      };

      // Insert lead with session metadata
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          address: data.address || null,
          city: data.city,
          state: data.state,
          zip_code: data.zip_code,
          age_bucket: data.age_bucket,
          tort_type: data.tort_type,
          diagnosis_details: data.diagnosis_details || null,
          exposure_details: data.exposure_details || null,
          consent_tcpa: data.consent_tcpa,
          consent_privacy: data.consent_privacy,
          consent_hipaa: data.consent_hipaa || false,
          ai_quality_score: aiQualityScore,
          fraud_risk_score: fraudRiskScore,
          tier,
          price,
          status: 'available',
          is_verified: false,
          is_exclusive: true,
          source: 'intake_form',
          campaign_id: campaignId || null,
          metadata,
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Track successful submission in PostHog
      trackEvent('intake_form_submitted', {
        lead_id: lead.id,
        tort_type: data.tort_type,
        time_spent_seconds: timeSpentSeconds,
        tier,
        quality_score: aiQualityScore,
      });

      // Log consent
      const consentTypes = ['tcpa', 'privacy'];
      if (data.consent_hipaa) consentTypes.push('hipaa');

      for (const consentType of consentTypes) {
        await supabase.from('consent_logs').insert({
          lead_id: lead.id,
          consent_type: consentType,
          consented: true,
          ip_address: null, // Would get from server in production
          user_agent: navigator.userAgent,
        });
      }

      setSubmitted(true);
      toast.success('Your information has been submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting intake:', error);
      trackEvent('intake_form_error', { error: error.message });
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen gradient-bg flex flex-col">
        <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-accent">
              <span className="text-lg sm:text-xl font-bold text-accent-foreground">L</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white">LeadsThru</span>
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
              <p className="text-muted-foreground mb-6">
                Your information has been submitted successfully. A qualified legal representative 
                may contact you soon if you qualify for the case.
              </p>
              <p className="text-sm text-muted-foreground">
                Reference ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg sm:text-xl font-bold text-primary-foreground">L</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold">LeadsThru</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              Free Case Evaluation
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Find out if you qualify for compensation. Fill out this confidential form 
              and a legal professional may contact you.
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>100% Confidential</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 text-primary" />
              <span>No Obligation</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Free Evaluation</span>
            </div>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <CardDescription>
                All fields marked with * are required
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Case Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Case Type *</label>
                  <Select 
                    value={watch('tort_type')} 
                    onValueChange={(v) => setValue('tort_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your case type" />
                    </SelectTrigger>
                    <SelectContent>
                      {tortTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tort_type && (
                    <p className="text-sm text-destructive">{errors.tort_type.message}</p>
                  )}
                </div>

                {/* Personal Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="first_name" className="text-sm font-medium">First Name *</label>
                    <Input
                      id="first_name"
                      placeholder="John"
                      {...register('first_name')}
                    />
                    {errors.first_name && (
                      <p className="text-sm text-destructive">{errors.first_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="last_name" className="text-sm font-medium">Last Name *</label>
                    <Input
                      id="last_name"
                      placeholder="Doe"
                      {...register('last_name')}
                    />
                    {errors.last_name && (
                      <p className="text-sm text-destructive">{errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email *</label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">Phone *</label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      {...register('phone')}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                {/* Age */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Age Range *</label>
                  <Select 
                    value={watch('age_bucket')} 
                    onValueChange={(v) => setValue('age_bucket', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your age range" />
                    </SelectTrigger>
                    <SelectContent>
                      {ageBuckets.map((bucket) => (
                        <SelectItem key={bucket} value={bucket}>{bucket}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.age_bucket && (
                    <p className="text-sm text-destructive">{errors.age_bucket.message}</p>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium">Street Address</label>
                  <Input
                    id="address"
                    placeholder="123 Main St"
                    {...register('address')}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-2 sm:col-span-2">
                    <label htmlFor="city" className="text-sm font-medium">City *</label>
                    <Input
                      id="city"
                      placeholder="New York"
                      {...register('city')}
                    />
                    {errors.city && (
                      <p className="text-sm text-destructive">{errors.city.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State *</label>
                    <Select 
                      value={watch('state')} 
                      onValueChange={(v) => setValue('state', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.state && (
                      <p className="text-sm text-destructive">{errors.state.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="zip_code" className="text-sm font-medium">ZIP *</label>
                    <Input
                      id="zip_code"
                      placeholder="10001"
                      {...register('zip_code')}
                    />
                    {errors.zip_code && (
                      <p className="text-sm text-destructive">{errors.zip_code.message}</p>
                    )}
                  </div>
                </div>

                {/* Case Details */}
                <div className="space-y-2">
                  <label htmlFor="exposure_details" className="text-sm font-medium">
                    Exposure/Usage Details
                  </label>
                  <Textarea
                    id="exposure_details"
                    placeholder="Describe your exposure to the product or situation..."
                    rows={3}
                    {...register('exposure_details')}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="diagnosis_details" className="text-sm font-medium">
                    Diagnosis/Injury Details
                  </label>
                  <Textarea
                    id="diagnosis_details"
                    placeholder="Describe any diagnosis or injuries you have experienced..."
                    rows={3}
                    {...register('diagnosis_details')}
                  />
                </div>

                {/* Consent */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent_tcpa"
                      checked={watch('consent_tcpa')}
                      onCheckedChange={(checked) => setValue('consent_tcpa', checked as boolean)}
                    />
                    <label htmlFor="consent_tcpa" className="text-sm leading-relaxed">
                      <span className="font-medium">TCPA Consent *</span> - I consent to receive calls and text messages 
                      regarding my inquiry, including via automated technology. Message and data rates may apply.
                    </label>
                  </div>
                  {errors.consent_tcpa && (
                    <p className="text-sm text-destructive ml-6">{errors.consent_tcpa.message}</p>
                  )}

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent_privacy"
                      checked={watch('consent_privacy')}
                      onCheckedChange={(checked) => setValue('consent_privacy', checked as boolean)}
                    />
                    <label htmlFor="consent_privacy" className="text-sm leading-relaxed">
                      <span className="font-medium">Privacy Policy *</span> - I have read and agree to the 
                      Privacy Policy and Terms of Service.
                    </label>
                  </div>
                  {errors.consent_privacy && (
                    <p className="text-sm text-destructive ml-6">{errors.consent_privacy.message}</p>
                  )}

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent_hipaa"
                      checked={watch('consent_hipaa')}
                      onCheckedChange={(checked) => setValue('consent_hipaa', checked as boolean)}
                    />
                    <label htmlFor="consent_hipaa" className="text-sm leading-relaxed">
                      <span className="font-medium">HIPAA Authorization</span> (Optional) - I authorize the release 
                      of my medical records for the purpose of evaluating my potential claim.
                    </label>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Free Evaluation
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By submitting this form, you understand that this is not legal advice and 
                  does not create an attorney-client relationship. A legal professional may 
                  contact you to discuss your potential case.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
