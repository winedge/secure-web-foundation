import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, FileText, Shield, ArrowRight, Loader2, MessageCircle, ClipboardList } from 'lucide-react';
import ConversationalIntake from '@/components/intake/ConversationalIntake';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSessionId, getDistinctId, trackEvent } from '@/lib/posthog';
import { SessionRecorder, ClientNetworkInfo } from '@/lib/session-recorder';
import { useSessionRecording } from '@/hooks/use-session-recording';
import { useBrandingBySlug, type CustomField } from '@/hooks/use-firm-branding';
import { SectionRenderer } from '@/components/landing-sections/SectionRenderer';
import type { Section, SectionTheme } from '@/lib/landing-sections/types';
import { LandingSeoHead } from '@/components/landing-builder/SeoSettingsPanel';
import { useGoogleFonts } from '@/hooks/useGoogleFonts';
import type { SeoConfig } from '@/lib/landing-seo';
import { buildAudienceContext, type AudienceContext } from '@/lib/landing-sections/visibility';

const tortTypes = [
  'Camp Lejeune', 'Roundup', 'Talcum Powder', 'AFFF', 'Paraquat',
  '3M Earplugs', 'Hernia Mesh', 'NEC Baby Formula', 'Tylenol', 'Zantac',
];

const statesList = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const ageBuckets = ['18-34', '35-44', '45-54', '55-64', '65+'];

const CONSENT_TEXT = {
  tcpa: 'I consent to receive calls and text messages regarding my inquiry, including via automated technology.',
  privacy: 'I have read and agree to the Privacy Policy and Terms of Service.',
  hipaa: 'I authorize the release of my medical records for the purpose of evaluating my potential claim.',
};

// Build dynamic zod schema based on visible fields
function buildSchema(visibleFields: string[], customFields: CustomField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  const alwaysRequired = ['first_name', 'last_name', 'email', 'phone', 'state', 'tort_type'];

  if (visibleFields.includes('first_name') || alwaysRequired.includes('first_name'))
    shape.first_name = z.string().min(1, 'Required').max(50);
  if (visibleFields.includes('last_name'))
    shape.last_name = z.string().min(1, 'Required').max(50);
  if (visibleFields.includes('email'))
    shape.email = z.string().email('Invalid email').max(255);
  if (visibleFields.includes('phone'))
    shape.phone = z.string().min(10, 'At least 10 digits').max(20);
  if (visibleFields.includes('address'))
    shape.address = z.string().max(200).optional();
  if (visibleFields.includes('city'))
    shape.city = z.string().min(1, 'Required').max(100);
  if (visibleFields.includes('state'))
    shape.state = z.string().min(2, 'Required');
  if (visibleFields.includes('zip_code'))
    shape.zip_code = z.string().min(5, 'At least 5 digits').max(10);
  if (visibleFields.includes('age_bucket'))
    shape.age_bucket = z.string().min(1, 'Required');
  if (visibleFields.includes('tort_type'))
    shape.tort_type = z.string().min(1, 'Required');
  if (visibleFields.includes('diagnosis_details'))
    shape.diagnosis_details = z.string().max(1000).optional();
  if (visibleFields.includes('exposure_details'))
    shape.exposure_details = z.string().max(1000).optional();

  // Custom fields
  customFields.forEach(f => {
    shape[f.id] = f.required
      ? z.string().min(1, `${f.label} is required`)
      : z.string().optional();
  });

  // Consents
  shape.consent_tcpa = z.boolean().refine(v => v === true, 'Required');
  shape.consent_privacy = z.boolean().refine(v => v === true, 'Required');
  shape.consent_hipaa = z.boolean().optional();

  return z.object(shape);
}

export default function BrandedIntake() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaign');
  const { data: branding, isLoading: brandingLoading } = useBrandingBySlug(slug);
  // Load whatever Google Font pair the firm/AI selected so the public page
  // renders with the correct typography.
  useGoogleFonts((branding as any)?.typography?.heading, (branding as any)?.typography?.body);

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const chatbotEnabled = (branding as any)?.chatbot_enabled ?? true;
  const chatbotAgentName = (branding as any)?.chatbot_agent_name || 'AI Intake Assistant';
  const chatbotAvatarUrl = (branding as any)?.chatbot_avatar_url || '';
  const [intakeMode, setIntakeMode] = useState<'chat' | 'form'>(chatbotEnabled ? 'chat' : 'form');
  const recorderRef = useRef(new SessionRecorder());
  const clientInfoRef = useRef<ClientNetworkInfo | null>(null);
  const { startRecording, uploadRecording } = useSessionRecording();

  const visibleFields = Array.isArray(branding?.visible_fields)
    ? branding.visible_fields as string[]
    : ['first_name', 'last_name', 'email', 'phone', 'state', 'tort_type'];

  const customFields: CustomField[] = Array.isArray(branding?.custom_fields)
    ? branding.custom_fields as CustomField[]
    : [];

  const schema = buildSchema(visibleFields, customFields);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      consent_tcpa: false,
      consent_privacy: false,
      consent_hipaa: false,
    } as Record<string, any>,
  });

  useEffect(() => {
    startRecording();
    trackEvent('branded_intake_started', { slug, campaign_id: campaignId });
    supabase.functions.invoke('get-client-info').then(({ data }) => {
      if (data) clientInfoRef.current = data as ClientNetworkInfo;
    }).catch(() => {});
  }, [slug, campaignId]);

  // Audience context (device, UTM, referrer, visitor) for conditional section visibility.
  const [audience, setAudience] = useState<AudienceContext>(() => buildAudienceContext({ slug }));
  useEffect(() => {
    setAudience(buildAudienceContext({ slug }));
    const onResize = () => setAudience((a) => ({ ...a, device: window.innerWidth < 640 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop' }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [slug]);
  // Live form values feed the `form` visibility source.
  const liveFormValues = watch();
  const trackFocus = useCallback((fieldName: string) => {
    recorderRef.current.trackFieldFocus(fieldName, 'input');
  }, []);

  const trackBlur = useCallback((fieldName: string) => {
    recorderRef.current.trackFieldBlur(fieldName, 'input');
  }, []);

  const onSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const posthogSessionId = getSessionId();
      const posthogDistinctId = getDistinctId();
      const consentValidation = await recorderRef.current.buildConsentValidation(
        CONSENT_TEXT.tcpa, CONSENT_TEXT.privacy, data.consent_hipaa ? CONSENT_TEXT.hipaa : undefined
      );
      const sessionRecord = recorderRef.current.buildRecord(
        posthogSessionId, posthogDistinctId, consentValidation, clientInfoRef.current
      );

      const aiQualityScore = Math.floor(Math.random() * 40) + 60;
      const fraudRiskScore = Math.floor(Math.random() * 30);
      let tier: 'A' | 'B' | 'C' | 'D' = 'C';
      if (aiQualityScore >= 80) tier = 'A';
      else if (aiQualityScore >= 60) tier = 'B';
      else if (aiQualityScore >= 40) tier = 'C';
      else tier = 'D';
      const prices = { A: 2000, B: 1500, C: 1000, D: 500 };

      // Collect custom field data into metadata
      const customData: Record<string, string> = {};
      customFields.forEach(f => {
        if (data[f.id]) customData[f.id] = data[f.id];
      });

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          first_name: data.first_name || null,
          last_name: data.last_name || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state,
          zip_code: data.zip_code || null,
          age_bucket: data.age_bucket || null,
          tort_type: data.tort_type,
          diagnosis_details: data.diagnosis_details || null,
          exposure_details: data.exposure_details || null,
          consent_tcpa: data.consent_tcpa,
          consent_privacy: data.consent_privacy,
          consent_hipaa: data.consent_hipaa || false,
          ai_quality_score: aiQualityScore,
          fraud_risk_score: fraudRiskScore,
          tier,
          price: prices[tier],
          status: 'available',
          is_verified: false,
          is_exclusive: true,
          source: 'intake_form',
          campaign_id: campaignId || null,
          metadata: {
            ...sessionRecord,
            branded_intake: true,
            firm_slug: slug,
            firm_branding_id: branding?.id,
            custom_fields: customData,
          } as any,
        })
        .select('id')
        .single();

      if (leadError) throw leadError;

      trackEvent('branded_intake_submitted', {
        lead_id: lead.id,
        slug,
        tort_type: data.tort_type,
        tier,
      });

      const consentTypes = ['tcpa', 'privacy'];
      if (data.consent_hipaa) consentTypes.push('hipaa');
      for (const ct of consentTypes) {
        await supabase.from('consent_logs').insert({
          lead_id: lead.id,
          consent_type: ct,
          consented: true,
          ip_address: null,
          user_agent: navigator.userAgent,
        });
      }

      // Auto-assign this lead to the firm that owns the branded intake page
      // so it shows up immediately in their My Leads pipeline.
      if (branding?.firm_id) {
        const { error: assignErr } = await supabase.functions.invoke('intake-assign-lead', {
          body: { lead_id: lead.id, firm_id: branding.firm_id },
        });
        if (assignErr) console.error('intake-assign-lead failed:', assignErr);
      }

      // Upload session recording (non-blocking)
      uploadRecording(lead.id).catch(console.error);

      setSubmitted(true);
      toast.success('Your information has been submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting branded intake:', error);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Branding colors
  const primaryColor = branding?.primary_color || '#0f172a';
  const backgroundColor = branding?.background_color || '#ffffff';
  const accentColor = branding?.accent_color || '#10b981';
  const logoUrl = branding?.logo_url;
  const firmName = branding?.firm_display_name || 'Legal Services';
  const heading = branding?.heading_text || 'Submit Your Claim';
  const description = branding?.description_text || 'Fill out the form below to get started.';

  // Per-landing-page SEO head tags
  const seoConfig = (((branding as any)?.seo_config ?? {}) as SeoConfig);
  const pageUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : `/intake/${slug}`;
  const seoHead = branding ? (
    <LandingSeoHead
      seo={seoConfig}
      context={{ name: firmName, url: pageUrl, logo: logoUrl || undefined, description }}
    />
  ) : null;

  if (brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (!branding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <h2 className="text-xl font-bold mb-2">Form Not Found</h2>
            <p className="text-muted-foreground">
              This intake form URL is not valid. Please check the link and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((branding as any).is_published === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <h2 className="text-xl font-bold mb-2">Page not published</h2>
            <p className="text-muted-foreground">
              This landing page is currently in draft mode. Please check back soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
        <header className="px-6 py-4 border-b" style={{ backgroundColor: primaryColor }}>
          <div className="container mx-auto flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded" />
            ) : (
              <div className="h-10 w-10 rounded flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                <span className="text-white font-bold text-lg">{firmName.charAt(0)}</span>
              </div>
            )}
            <span className="text-white font-bold text-xl">{firmName}</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-8">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: `${accentColor}20` }}>
                <CheckCircle className="h-8 w-8" style={{ color: accentColor }} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
              <p className="text-muted-foreground mb-6">
                Your information has been submitted successfully. A qualified legal representative
                may contact you soon if you qualify for the case.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render field helper
  const renderField = (fieldId: string, label: string, type: 'input' | 'select' | 'textarea' = 'input', options?: string[]) => {
    if (!visibleFields.includes(fieldId)) return null;

    if (type === 'select' && options) {
      return (
        <div className="space-y-2" key={fieldId}>
          <label className="text-sm font-medium" style={{ color: primaryColor }}>{label} *</label>
          <Select
            value={watch(fieldId) || ''}
            onValueChange={(v) => setValue(fieldId, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors[fieldId] && <p className="text-sm text-destructive">{(errors[fieldId] as any)?.message}</p>}
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <div className="space-y-2" key={fieldId}>
          <label className="text-sm font-medium" style={{ color: primaryColor }}>{label}</label>
          <Textarea
            {...register(fieldId)}
            placeholder={`Enter ${label.toLowerCase()}...`}
            rows={3}
            onFocus={() => trackFocus(fieldId)}
            onBlur={() => trackBlur(fieldId)}
          />
          {errors[fieldId] && <p className="text-sm text-destructive">{(errors[fieldId] as any)?.message}</p>}
        </div>
      );
    }

    return (
      <div className="space-y-2" key={fieldId}>
        <label className="text-sm font-medium" style={{ color: primaryColor }}>{label}</label>
        <Input
          {...register(fieldId)}
          placeholder={label}
          onFocus={() => trackFocus(fieldId)}
          onBlur={() => trackBlur(fieldId)}
        />
        {errors[fieldId] && <p className="text-sm text-destructive">{(errors[fieldId] as any)?.message}</p>}
      </div>
    );
  };

  // Multi-section landing-page renderer | takes priority when sections are configured
  const sections = (Array.isArray((branding as any).sections) ? (branding as any).sections : []) as Section[];
  if (sections.length > 0) {
    const darkCfg = (branding as any)?.layout_config?.dark;
    const sectionTheme: SectionTheme = {
      primary: primaryColor,
      background: backgroundColor,
      accent: accentColor,
      headingFont: (branding as any)?.typography?.heading,
      bodyFont: (branding as any)?.typography?.body,
      radius: (branding as any)?.layout_config?.radius ?? 'lg',
      spacing: (branding as any)?.layout_config?.spacing ?? 'normal',
      buttonStyle: (branding as any)?.layout_config?.buttonStyle ?? 'solid',
      maxWidth: (branding as any)?.layout_config?.maxWidth ?? 'normal',
      logoUrl: logoUrl ?? undefined,
      logoUrlDark: darkCfg?.logoUrl ?? undefined,
      dark: darkCfg
        ? { primary: darkCfg.primaryColor, background: darkCfg.backgroundColor, accent: darkCfg.accentColor }
        : undefined,
    };
    const intakeContent = chatbotEnabled && intakeMode === 'chat' ? (
      <div>
        <div className="flex justify-center gap-2 mb-4">
          <Button variant="default" size="sm" onClick={() => setIntakeMode('chat')} className="gap-2"><MessageCircle className="h-4 w-4" /> Chat with AI</Button>
          <Button variant="outline" size="sm" onClick={() => setIntakeMode('form')} className="gap-2"><ClipboardList className="h-4 w-4" /> Fill form</Button>
        </div>
        <ConversationalIntake
          campaignId={campaignId}
          branding={{ firm_name: firmName, primary_color: primaryColor, accent_color: accentColor, logo_url: logoUrl || undefined }}
          agentName={chatbotAgentName}
          agentAvatarUrl={chatbotAvatarUrl}
          onComplete={() => setSubmitted(true)}
        />
      </div>
    ) : (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {chatbotEnabled && (
          <div className="flex justify-center gap-2 mb-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIntakeMode('chat')} className="gap-2"><MessageCircle className="h-4 w-4" /> Chat with AI</Button>
            <Button type="button" variant="default" size="sm" className="gap-2" style={{ backgroundColor: primaryColor }}><ClipboardList className="h-4 w-4" /> Fill form</Button>
          </div>
        )}
        {renderField('tort_type', 'Case Type', 'select', tortTypes)}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderField('first_name', 'First Name *')}
          {renderField('last_name', 'Last Name *')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderField('email', 'Email *')}
          {renderField('phone', 'Phone *')}
        </div>
        {renderField('state', 'State', 'select', statesList)}
        {renderField('diagnosis_details', 'Tell us about your situation', 'textarea')}
        <div className="flex items-start gap-2">
          <Checkbox id="consent_tcpa_s" checked={watch('consent_tcpa') || false} onCheckedChange={(c) => setValue('consent_tcpa', c as boolean)} />
          <label htmlFor="consent_tcpa_s" className="text-xs leading-relaxed">I agree to be contacted | {CONSENT_TEXT.tcpa}</label>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="consent_privacy_s" checked={watch('consent_privacy') || false} onCheckedChange={(c) => setValue('consent_privacy', c as boolean)} />
          <label htmlFor="consent_privacy_s" className="text-xs leading-relaxed">{CONSENT_TEXT.privacy}</label>
        </div>
        <Button type="submit" size="lg" className="w-full text-white" style={{ backgroundColor: accentColor }} disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : <>Submit <ArrowRight className="ml-2 h-4 w-4" /></>}
        </Button>
      </form>
    );

    return (
      <div style={{ background: backgroundColor }}>
        {seoHead}
        <SectionRenderer
          sections={sections}
          theme={sectionTheme}
          formSlot={intakeContent}
          visibilityContext={{ audience, form: liveFormValues }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor }}>
      {seoHead}
      {/* Branded Header */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: primaryColor }}>
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded" />
          ) : (
            <div className="h-10 w-10 rounded flex items-center justify-center" style={{ backgroundColor: accentColor }}>
              <span className="text-white font-bold text-lg">{firmName.charAt(0)}</span>
            </div>
          )}
          <span className="text-white font-bold text-xl">{firmName}</span>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3" style={{ color: primaryColor }}>
              {heading}
            </h1>
            <p className="text-base sm:text-lg" style={{ color: '#6b7280' }}>
              {description}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm" style={{ color: '#6b7280' }}>
              <Shield className="h-4 w-4" style={{ color: accentColor }} />
              <span>100% Confidential</span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: '#6b7280' }}>
              <FileText className="h-4 w-4" style={{ color: accentColor }} />
              <span>No Obligation</span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: '#6b7280' }}>
              <CheckCircle className="h-4 w-4" style={{ color: accentColor }} />
              <span>Free Evaluation</span>
            </div>
          </div>

          {/* Mode Toggle - only show if chatbot is enabled */}
          {chatbotEnabled && (
          <div className="flex justify-center gap-2 mb-8">
            <Button
              variant={intakeMode === 'chat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIntakeMode('chat')}
              className="gap-2"
              style={intakeMode === 'chat' ? { backgroundColor: primaryColor } : undefined}
            >
              <MessageCircle className="h-4 w-4" />
              Chat with AI
            </Button>
            <Button
              variant={intakeMode === 'form' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIntakeMode('form')}
              className="gap-2"
              style={intakeMode === 'form' ? { backgroundColor: primaryColor } : undefined}
            >
              <ClipboardList className="h-4 w-4" />
              Fill Out Form
            </Button>
          </div>
          )}

          {intakeMode === 'chat' && chatbotEnabled ? (
            <ConversationalIntake
              campaignId={campaignId}
              branding={{
                firm_name: firmName,
                primary_color: primaryColor,
                accent_color: accentColor,
                logo_url: logoUrl || undefined,
              }}
              agentName={chatbotAgentName}
              agentAvatarUrl={chatbotAvatarUrl}
              onComplete={() => setSubmitted(true)}
            />
          ) : (
          <Card>
            <CardHeader>
              <CardTitle style={{ color: primaryColor }}>Your Information</CardTitle>
              <CardDescription>All fields marked with * are required</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {renderField('tort_type', 'Case Type', 'select', tortTypes)}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderField('first_name', 'First Name *')}
                  {renderField('last_name', 'Last Name *')}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderField('email', 'Email *')}
                  {renderField('phone', 'Phone *')}
                </div>

                {renderField('age_bucket', 'Age Range', 'select', ageBuckets)}
                {renderField('address', 'Street Address')}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {renderField('city', 'City')}
                  {renderField('state', 'State', 'select', statesList)}
                  {renderField('zip_code', 'ZIP Code')}
                </div>

                {renderField('exposure_details', 'Exposure/Usage Details', 'textarea')}
                {renderField('diagnosis_details', 'Diagnosis/Injury Details', 'textarea')}

                {/* Custom fields */}
                {customFields.map(field => {
                  if (field.type === 'select' && field.options?.length) {
                    return (
                      <div className="space-y-2" key={field.id}>
                        <label className="text-sm font-medium" style={{ color: primaryColor }}>
                          {field.label} {field.required && '*'}
                        </label>
                        <Select value={watch(field.id) || ''} onValueChange={(v) => setValue(field.id, v)}>
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${field.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors[field.id] && <p className="text-sm text-destructive">{(errors[field.id] as any)?.message}</p>}
                      </div>
                    );
                  }
                  if (field.type === 'textarea') {
                    return (
                      <div className="space-y-2" key={field.id}>
                        <label className="text-sm font-medium" style={{ color: primaryColor }}>
                          {field.label} {field.required && '*'}
                        </label>
                        <Textarea {...register(field.id)} placeholder={field.label} rows={3} />
                        {errors[field.id] && <p className="text-sm text-destructive">{(errors[field.id] as any)?.message}</p>}
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2" key={field.id}>
                      <label className="text-sm font-medium" style={{ color: primaryColor }}>
                        {field.label} {field.required && '*'}
                      </label>
                      <Input {...register(field.id)} placeholder={field.label} />
                      {errors[field.id] && <p className="text-sm text-destructive">{(errors[field.id] as any)?.message}</p>}
                    </div>
                  );
                })}

                {/* Consent */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent_tcpa"
                      checked={watch('consent_tcpa') || false}
                      onCheckedChange={(checked) => setValue('consent_tcpa', checked as boolean)}
                    />
                    <label htmlFor="consent_tcpa" className="text-sm leading-relaxed">
                      <span className="font-medium">TCPA Consent *</span> - {CONSENT_TEXT.tcpa}
                    </label>
                  </div>
                  {errors.consent_tcpa && <p className="text-sm text-destructive ml-6">{(errors.consent_tcpa as any)?.message}</p>}

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent_privacy"
                      checked={watch('consent_privacy') || false}
                      onCheckedChange={(checked) => setValue('consent_privacy', checked as boolean)}
                    />
                    <label htmlFor="consent_privacy" className="text-sm leading-relaxed">
                      <span className="font-medium">Privacy Policy *</span> - {CONSENT_TEXT.privacy}
                    </label>
                  </div>
                  {errors.consent_privacy && <p className="text-sm text-destructive ml-6">{(errors.consent_privacy as any)?.message}</p>}

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent_hipaa"
                      checked={watch('consent_hipaa') || false}
                      onCheckedChange={(checked) => setValue('consent_hipaa', checked as boolean)}
                    />
                    <label htmlFor="consent_hipaa" className="text-sm leading-relaxed">
                      <span className="font-medium">HIPAA Authorization</span> (Optional) - {CONSENT_TEXT.hipaa}
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-white"
                  style={{ backgroundColor: accentColor }}
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

                <p className="text-xs text-center" style={{ color: '#9ca3af' }}>
                  By submitting this form, you understand that this is not legal advice and
                  does not create an attorney-client relationship.
                </p>
              </form>
            </CardContent>
          </Card>
          )}
        </div>
      </main>
    </div>
  );
}
