import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, Upload, Sparkles } from 'lucide-react';
import { useCreateCustomAudience, useCreateLookalike, useUploadAudienceUsers } from '@/hooks/use-meta-extras';
import type { AudienceRow } from '@/hooks/use-meta-tables';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingAudiences?: AudienceRow[];
}

export function AudienceCreateDialog({ open, onOpenChange, existingAudiences = [] }: Props) {
  const [tab, setTab] = useState<'custom' | 'lookalike' | 'upload'>('custom');
  // Custom audience
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subtype, setSubtype] = useState('CUSTOM');
  const [retention, setRetention] = useState(180);
  // Lookalike
  const [laName, setLaName] = useState('');
  const [originId, setOriginId] = useState('');
  const [country, setCountry] = useState('US');
  const [ratio, setRatio] = useState(0.01);
  // Upload
  const [uploadAudienceId, setUploadAudienceId] = useState('');
  const [emails, setEmails] = useState('');
  const [phones, setPhones] = useState('');

  const createCustom = useCreateCustomAudience();
  const createLA = useCreateLookalike();
  const upload = useUploadAudienceUsers();

  const close = () => { onOpenChange(false); reset(); };
  const reset = () => {
    setName(''); setDescription(''); setSubtype('CUSTOM'); setRetention(180);
    setLaName(''); setOriginId(''); setCountry('US'); setRatio(0.01);
    setUploadAudienceId(''); setEmails(''); setPhones('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Create Audience</DialogTitle>
          <DialogDescription>Sync directly with Meta Ads | Custom, Lookalike, or upload hashed contacts.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="custom">Custom</TabsTrigger>
            <TabsTrigger value="lookalike">Lookalike</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="custom" className="space-y-3 pt-3">
            <div><Label>Audience name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Past 30d site visitors" /></div>
            <div><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source</Label>
                <Select value={subtype} onValueChange={setSubtype}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOM">Customer list</SelectItem>
                    <SelectItem value="WEBSITE">Website</SelectItem>
                    <SelectItem value="APP">App activity</SelectItem>
                    <SelectItem value="ENGAGEMENT">Engagement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Retention (days)</Label><Input type="number" value={retention} min={1} max={540} onChange={(e) => setRetention(Number(e.target.value) || 180)} /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button
                onClick={() => createCustom.mutate({ name, description, subtype, retention_days: retention }, { onSuccess: close })}
                disabled={!name || createCustom.isPending}
              >
                {createCustom.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="lookalike" className="space-y-3 pt-3">
            <div><Label>Lookalike name</Label><Input value={laName} onChange={(e) => setLaName(e.target.value)} placeholder="e.g. US LAL 1% | Past purchasers" /></div>
            <div>
              <Label>Seed audience</Label>
              <Select value={originId} onValueChange={setOriginId}>
                <SelectTrigger><SelectValue placeholder="Pick a source audience" /></SelectTrigger>
                <SelectContent>
                  {existingAudiences.filter(a => a.meta_audience_id && a.subtype !== 'LOOKALIKE').map((a) => (
                    <SelectItem key={a.id} value={a.meta_audience_id!}>{a.name || a.meta_audience_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['US','CA','GB','AU','DE','FR','ES','IT','NL','BR','MX','IN'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Similarity ratio</Label>
                <Select value={String(ratio)} onValueChange={(v) => setRatio(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0.01, 0.02, 0.03, 0.05, 0.1].map(r => <SelectItem key={r} value={String(r)}>{Math.round(r * 100)}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button
                onClick={() => createLA.mutate({ name: laName, origin_audience_id: originId, country, ratio }, { onSuccess: close })}
                disabled={!laName || !originId || createLA.isPending}
              >
                {createLA.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Create Lookalike
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="upload" className="space-y-3 pt-3">
            <div>
              <Label>Target audience</Label>
              <Select value={uploadAudienceId} onValueChange={setUploadAudienceId}>
                <SelectTrigger><SelectValue placeholder="Pick a custom audience" /></SelectTrigger>
                <SelectContent>
                  {existingAudiences.filter(a => a.meta_audience_id && a.subtype === 'CUSTOM').map((a) => (
                    <SelectItem key={a.id} value={a.meta_audience_id!}>{a.name || a.meta_audience_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Emails (one per line)</Label><Textarea rows={3} value={emails} onChange={(e) => setEmails(e.target.value)} /></div>
            <div><Label>Phones (one per line, E.164)</Label><Textarea rows={3} value={phones} onChange={(e) => setPhones(e.target.value)} /></div>
            <p className="text-[11px] text-muted-foreground">Hashed client-side before sending to Meta (SHA-256, normalized).</p>
            <DialogFooter>
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button
                onClick={() => upload.mutate({
                  meta_audience_id: uploadAudienceId,
                  emails: emails.split('\n').map(s => s.trim()).filter(Boolean),
                  phones: phones.split('\n').map(s => s.trim()).filter(Boolean),
                }, { onSuccess: close })}
                disabled={!uploadAudienceId || (!emails && !phones) || upload.isPending}
              >
                {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
