import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Lock, Database, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from 'sonner';

export const DISCLOSURE_VERSION = '2026-05-05.v1';

export const GMB_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'openid',
  'email',
];

export const PROCESSING_PURPOSES = [
  'Sync your Google Business Profile listings, hours, and categories',
  'Read and reply to customer reviews on your behalf',
  'Publish posts, offers, and events to your locations',
  'Display performance insights (views, calls, direction requests)',
];

export const DATA_CATEGORIES = [
  'Business profile data (name, address, phone, hours, categories)',
  'Review content and reviewer display names (as provided by Google)',
  'Account email and Google account identifier',
  'OAuth access & refresh tokens (encrypted at rest, AES-256-GCM + ML-KEM-1024)',
];

export const DISCLOSURE_TEXT = `
LeadThru | Google Business Profile Connection | Data Processing Notice (${DISCLOSURE_VERSION})

By connecting your Google account, you authorise LeadThru to act as a data processor under
Article 28 GDPR for the limited purposes listed below. You remain the data controller for any
business-profile content and customer reviews retrieved from Google.

Purposes of processing:
${PROCESSING_PURPOSES.map((p) => `  | ${p}`).join('\n')}

Categories of data processed:
${DATA_CATEGORIES.map((d) => `  | ${d}`).join('\n')}

OAuth scopes requested:
${GMB_SCOPES.map((s) => `  | ${s}`).join('\n')}

Legal basis: Article 6(1)(a) GDPR | explicit consent.
Retention: OAuth tokens and synced data are retained for up to 365 days from your last activity,
or until you disconnect, whichever comes first. Audit and consent logs are retained for 6 years
to satisfy ABA 512 / GDPR accountability obligations.
Sub-processors: Google LLC (United States, Standard Contractual Clauses in force), Supabase Inc.
Your rights (GDPR Art. 15-22): access, rectification, erasure, restriction, portability, objection.
Disconnect at any time from Settings | Local Presence | Disconnect Google. Disconnection revokes
the OAuth grant with Google and deletes locally cached tokens within 24 hours.
You may withdraw this consent at any time without affecting the lawfulness of prior processing.
`.trim();

async function sha256Hex(input: string) {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsented: () => void;
}

export function GoogleConsentDialog({ open, onOpenChange, onConsented }: Props) {
  const { data: firm } = useFirm();
  const [agreeProcessing, setAgreeProcessing] = useState(false);
  const [agreeShare, setAgreeShare] = useState(false);
  const [agreeRetention, setAgreeRetention] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = agreeProcessing && agreeShare && agreeRetention && !!firm?.id && !submitting;

  const disclosureText = useMemo(() => DISCLOSURE_TEXT, []);

  async function handleConsent() {
    if (!firm?.id) return;
    setSubmitting(true);
    try {
      const hash = await sha256Hex(disclosureText);
      let ip: string | null = null;
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const json = await res.json();
        ip = json?.ip ?? null;
      } catch { /* non-blocking */ }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { error } = await supabase.from('gmb_oauth_consents').insert({
        firm_id: firm.id,
        user_id: user.id,
        disclosure_version: DISCLOSURE_VERSION,
        disclosure_sha256: hash,
        scopes: GMB_SCOPES,
        purposes: PROCESSING_PURPOSES,
        data_categories: DATA_CATEGORIES,
        retention_days: 365,
        ip_address: ip,
        user_agent: navigator.userAgent,
        consented: true,
      });
      if (error) throw error;
      toast.success('Consent recorded. Redirecting to Google…');
      onConsented();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Connect Google | Data Processing Consent
          </DialogTitle>
          <DialogDescription>
            Before we connect to your Google Business Profile, please review what data we will process,
            why, and for how long. This consent is logged for GDPR & ABA 512 accountability.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> ABA 512</Badge>
          <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> GDPR Art. 6(1)(a)</Badge>
          <Badge variant="outline" className="gap-1"><Database className="h-3 w-3" /> Encrypted at rest</Badge>
          <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> 365-day retention</Badge>
        </div>

        <ScrollArea className="h-56 rounded-md border bg-muted/30 p-3">
          <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{disclosureText}</pre>
        </ScrollArea>

        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <Checkbox checked={agreeProcessing} onCheckedChange={(v) => setAgreeProcessing(!!v)} />
            <span>I authorise LeadThru to process the data categories listed above for the stated purposes.</span>
          </label>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <Checkbox checked={agreeShare} onCheckedChange={(v) => setAgreeShare(!!v)} />
            <span>I acknowledge data is exchanged with Google LLC (US) under Standard Contractual Clauses.</span>
          </label>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <Checkbox checked={agreeRetention} onCheckedChange={(v) => setAgreeRetention(!!v)} />
            <span>I understand I can revoke consent and disconnect at any time, and that audit logs are kept for 6 years.</span>
          </label>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            You will be redirected to Google's consent screen next. Google may show additional permission
            prompts | granting them is required for sync to function.
          </span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConsent} disabled={!canSubmit}>
            {submitting ? 'Recording consent…' : 'Agree & Continue to Google'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
