import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarPlus, Plus, Trash2 } from 'lucide-react';
import { useGmbLocations, useGmbPosts, useCreateGmbPost, useDeleteGmbPost } from '@/hooks/use-gmb';

export default function GmbPosts() {
  const [params, setParams] = useSearchParams();
  const locId = params.get('loc') ?? undefined;
  const { data: locations = [] } = useGmbLocations();
  const activeId = locId ?? locations[0]?.id;
  const { data: posts = [], isLoading } = useGmbPosts(activeId);
  const active = locations.find((l) => l.id === activeId);
  const create = useCreateGmbPost();
  const del = useDeleteGmbPost();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ post_type: 'update', summary: '', cta_url: '', scheduled_for: '' });

  async function submit() {
    if (!activeId || !form.summary.trim()) return;
    await create.mutateAsync({
      location_id: activeId,
      post_type: form.post_type,
      summary: form.summary.trim(),
      cta_url: form.cta_url || null,
      scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
    });
    setForm({ post_type: 'update', summary: '', cta_url: '', scheduled_for: '' });
    setOpen(false);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <CalendarPlus className="h-7 w-7 text-primary" /> GMB Post Scheduler
            </h1>
            <p className="text-muted-foreground mt-1">
              {active ? `Posts for ${active.name}` : 'Select a location to view posts.'}
            </p>
          </div>
          <div className="flex gap-2">
            {locations.length > 0 && (
              <Select value={activeId} onValueChange={(v) => setParams({ loc: v })}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button disabled={!activeId}><Plus className="h-4 w-4 mr-2" /> New post</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create GMB Post</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.post_type} onValueChange={(v) => setForm({ ...form, post_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="offer">Offer</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Summary</Label>
                    <Textarea rows={4} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="What's new at your business?" />
                  </div>
                  <div>
                    <Label>Call-to-action URL (optional)</Label>
                    <Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="https://" />
                  </div>
                  <div>
                    <Label>Schedule for (optional)</Label>
                    <Input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={submit} disabled={!form.summary.trim() || create.isPending}>
                    {form.scheduled_for ? 'Schedule' : 'Publish'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {isLoading ? (
          <p className="text-muted-foreground">Loading posts…</p>
        ) : posts.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            No posts yet. Create your first update, offer, or event.
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {posts.map((p: any) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">{p.post_type}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{p.status}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>{p.summary}</p>
                  {p.cta_url && <a href={p.cta_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline truncate block">{p.cta_url}</a>}
                  {p.scheduled_for && <p className="text-xs text-muted-foreground">Scheduled: {new Date(p.scheduled_for).toLocaleString()}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
