import { useState } from 'react';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Plus, Trash2, Pencil } from 'lucide-react';
import { useReplyTemplates, useUpsertReplyTemplate, useDeleteReplyTemplate, ReplyTemplate } from '@/hooks/use-gmb-replies';
import { toast } from 'sonner';

const TONES = ['professional', 'friendly', 'apologetic', 'grateful', 'concise'];

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  body: z.string().trim().min(10).max(2000),
  tone: z.string(),
  rating_filter: z.number().int().min(1).max(5).nullable(),
  is_active: z.boolean(),
});

export default function GmbReplyTemplates() {
  const { data: templates = [], isLoading } = useReplyTemplates();
  const upsert = useUpsertReplyTemplate();
  const del = useDeleteReplyTemplate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReplyTemplate | null>(null);
  const [form, setForm] = useState({ name: '', body: '', tone: 'professional', rating_filter: null as number | null, is_active: true });

  const startNew = () => { setEditing(null); setForm({ name: '', body: '', tone: 'professional', rating_filter: null, is_active: true }); setOpen(true); };
  const startEdit = (t: ReplyTemplate) => { setEditing(t); setForm({ name: t.name, body: t.body, tone: t.tone, rating_filter: t.rating_filter, is_active: t.is_active }); setOpen(true); };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    const payload = { ...parsed.data, ...(editing ? { id: editing.id } : {}) };
    await upsert.mutateAsync(payload);
    setOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-primary" /> Reply Templates
            </h1>
            <p className="text-muted-foreground mt-1">Reusable templates for AI-generated review replies. Filter by rating and tone.</p>
          </div>
          <Button onClick={startNew}><Plus className="h-4 w-4 mr-2" /> New template</Button>
        </header>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : templates.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No templates yet. Create one to power AI-generated replies.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map(t => (
              <Card key={t.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge variant="outline" className="capitalize">{t.tone}</Badge>
                    {t.rating_filter && <Badge variant="secondary">{t.rating_filter}★ only</Badge>}
                    {!t.is_active && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-4">{t.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? 'Edit template' : 'New template'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 5-star thank you" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tone</Label>
                  <Select value={form.tone} onValueChange={(v) => setForm({ ...form, tone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TONES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rating filter</Label>
                  <Select value={form.rating_filter?.toString() ?? 'any'} onValueChange={(v) => setForm({ ...form, rating_filter: v === 'any' ? null : Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any rating</SelectItem>
                      {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n} star</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Body</Label>
                <Textarea rows={6} maxLength={2000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Hi {name}, thank you so much for your feedback..." />
                <p className="text-xs text-muted-foreground mt-1">AI will personalize and adapt this template per review.</p>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div><Label>Active</Label><p className="text-xs text-muted-foreground">Inactive templates won't appear when generating replies.</p></div>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={upsert.isPending}>Save template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
