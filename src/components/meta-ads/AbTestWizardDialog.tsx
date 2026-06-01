import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFirm } from '@/hooks/use-firm';
import { useAuth } from '@/lib/auth-context';
import { Loader2, FlaskConical } from 'lucide-react';
import { MetaCampaign } from '@/hooks/use-meta-campaigns';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  candidates: MetaCampaign[];
  preselected: string[];
}

export function AbTestWizardDialog({ open, onOpenChange, candidates, preselected }: Props) {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [variable, setVariable] = useState('creative');
  const [a, setA] = useState(preselected[0] || '');
  const [b, setB] = useState(preselected[1] || '');
  const [start, setStart] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [end, setEnd] = useState(new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const eligible = candidates.filter((c) => c.meta_campaign_id);

  const submit = async () => {
    if (!a || !b || a === b) return toast({ title: 'Pick two different published campaigns', variant: 'destructive' });
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: {
          action: 'create_ab_test',
          user_id: user?.id,
          firm_id: firm?.id,
          name: name || `A/B test ${new Date().toLocaleDateString()}`,
          variable,
          cell_a_campaign_id: a,
          cell_b_campaign_id: b,
          start_date: start,
          end_date: end,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'A/B test created on Meta', description: `Study ID ${data.meta_study_id}` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Failed to create A/B test', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5" /> A/B test</DialogTitle>
          <DialogDescription>
            Pushes a real split test to Meta via the Experiments API. Both campaigns must already be published.
          </DialogDescription>
        </DialogHeader>
        {eligible.length < 2 ? (
          <p className="text-sm text-muted-foreground py-6">
            You need at least 2 campaigns already published to Meta to start an A/B test.
          </p>
        ) : (
          <div className="space-y-3">
            <div><Label>Test name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Creative test - May" /></div>
            <div>
              <Label>Variable to test</Label>
              <Select value={variable} onValueChange={setVariable}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="audience">Audience</SelectItem>
                  <SelectItem value="placement">Placement</SelectItem>
                  <SelectItem value="delivery_optimization">Delivery optimization</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Cell A</Label>
                <Select value={a} onValueChange={setA}>
                  <SelectTrigger><SelectValue placeholder="Pick campaign" /></SelectTrigger>
                  <SelectContent>
                    {eligible.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cell B</Label>
                <Select value={b} onValueChange={setB}>
                  <SelectTrigger><SelectValue placeholder="Pick campaign" /></SelectTrigger>
                  <SelectContent>
                    {eligible.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Start</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div><Label>End</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
            <Button onClick={submit} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Launch A/B test
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
