import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Globe, Plus, Trash2, RefreshCw, Copy, CheckCircle2, AlertTriangle, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
  useLandingDomains, useAddLandingDomain, useDeleteLandingDomain,
  useVerifyLandingDomain, useUpdateLandingDomain, type LandingDomain,
} from '@/hooks/use-landing-domains';

interface Props {
  isPublished: boolean;
  onPublishedChange: (v: boolean) => void;
  slug: string;
}

const LOVABLE_TARGET_A = '185.158.133.1';

export function DomainsPanel({ isPublished, onPublishedChange, slug }: Props) {
  const { data: domains = [], isLoading } = useLandingDomains();
  const addDomain = useAddLandingDomain();
  const deleteDomain = useDeleteLandingDomain();
  const verifyDomain = useVerifyLandingDomain();
  const updateDomain = useUpdateLandingDomain();

  const [hostname, setHostname] = useState('');

  const handleAdd = () => {
    if (!hostname.trim()) return;
    addDomain.mutate(hostname, { onSuccess: () => setHostname('') });
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-6">
      {/* Publish toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" /> Publish landing page
          </CardTitle>
          <CardDescription>
            When published, your landing page is accessible to visitors at <code className="bg-muted px-1 rounded">/lp/{slug || 'your-slug'}</code> and on any verified custom domain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="font-medium">{isPublished ? 'Live' : 'Draft (not publicly accessible)'}</div>
              <div className="text-sm text-muted-foreground">
                {isPublished
                  ? 'Visitors and search engines can access your page.'
                  : 'Only you can preview the page until you publish.'}
              </div>
            </div>
            <Switch checked={isPublished} onCheckedChange={onPublishedChange} />
          </div>
        </CardContent>
      </Card>

      {/* Add domain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Custom domains</CardTitle>
          <CardDescription>
            Serve your landing page from your own domain (e.g. <code>get.acme.com</code>). Add the DNS records shown below at your registrar, then click Verify.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="lp.example.com"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={addDomain.isPending}>
              {addDomain.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : domains.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No custom domains yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {domains.map((d) => (
                <DomainRow
                  key={d.id}
                  domain={d}
                  onVerify={() => verifyDomain.mutate(d.id)}
                  onDelete={() => deleteDomain.mutate(d.id)}
                  onSetPrimary={() => updateDomain.mutate({ id: d.id, patch: { is_primary: true } })}
                  onCopy={copy}
                  verifying={verifyDomain.isPending}
                />
              ))}
            </div>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>How DNS routing works</AlertTitle>
            <AlertDescription className="text-xs space-y-1 mt-1">
              <p>1. Add an <strong>A record</strong> for your hostname pointing to <code>{LOVABLE_TARGET_A}</code> (or a CNAME to <code>{typeof window !== 'undefined' ? window.location.hostname : 'your-app-host'}</code>).</p>
              <p>2. Add a <strong>TXT record</strong> at <code>_landing-verify.&lt;your-domain&gt;</code> with the token shown for each domain below.</p>
              <p>3. Click <strong>Verify</strong>. DNS can take a few minutes to a few hours to propagate.</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

function DomainRow({
  domain, onVerify, onDelete, onSetPrimary, onCopy, verifying,
}: {
  domain: LandingDomain;
  onVerify: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
  onCopy: (text: string, label: string) => void;
  verifying: boolean;
}) {
  const statusBadge =
    domain.status === 'verified' ? (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</Badge>
    ) : domain.status === 'failed' ? (
      <Badge variant="destructive">Failed</Badge>
    ) : (
      <Badge variant="outline">Pending</Badge>
    );

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-medium">{domain.hostname}</span>
            {statusBadge}
            {domain.is_primary && <Badge variant="secondary"><Star className="h-3 w-3 mr-1" /> Primary</Badge>}
          </div>
          {domain.notes && <div className="text-xs text-muted-foreground mt-1">{domain.notes}</div>}
          {domain.verified_at && (
            <div className="text-xs text-muted-foreground mt-1">Verified {new Date(domain.verified_at).toLocaleString()}</div>
          )}
        </div>
        <div className="flex gap-2">
          {domain.status === 'verified' && !domain.is_primary && (
            <Button size="sm" variant="outline" onClick={onSetPrimary}>
              <Star className="h-4 w-4 mr-1" /> Make primary
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onVerify} disabled={verifying}>
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Verify
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-muted p-2">
          <div className="font-medium mb-1">A record</div>
          <div className="flex items-center justify-between gap-2">
            <code className="truncate">{domain.hostname} → {LOVABLE_TARGET_A}</code>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onCopy(LOVABLE_TARGET_A, 'IP')}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="rounded bg-muted p-2">
          <div className="font-medium mb-1">TXT verification</div>
          <div className="flex items-center justify-between gap-2">
            <code className="truncate">_landing-verify.{domain.hostname} → {domain.verification_token}</code>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onCopy(domain.verification_token, 'Token')}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
