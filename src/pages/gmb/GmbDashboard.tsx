import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Store, Plus, MapPin, Phone, Globe, Trash2, Pencil, Star, CalendarPlus, Activity, MessageSquare, CheckCircle2, LayoutGrid } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const GMB_TABS = [
  { name: 'Locations', href: '/gmb', icon: LayoutGrid, end: true },
  { name: 'Reviews', href: '/gmb/reviews', icon: Star },
  { name: 'Posts', href: '/gmb/posts', icon: CalendarPlus },
  { name: 'Reply Templates', href: '/gmb/reply-templates', icon: MessageSquare },
  { name: 'Reply Approvals', href: '/gmb/reply-approvals', icon: CheckCircle2 },
  { name: 'Sync Status', href: '/gmb/sync', icon: Activity },
];

export function GmbSubNav() {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-border pb-2 overflow-x-auto">
      {GMB_TABS.map((t) => (
        <NavLink
          key={t.href}
          to={t.href}
          end={t.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )
          }
        >
          <t.icon className="h-4 w-4" />
          {t.name}
        </NavLink>
      ))}
    </nav>
  );
}
import { useGmbLocations, useUpsertGmbLocation, useDeleteGmbLocation, GmbLocation } from '@/hooks/use-gmb';
import { Link } from 'react-router-dom';
import { GoogleConsentDialog } from '@/components/gmb/GoogleConsentDialog';
import { NapPreviewDialog } from '@/components/gmb/NapPreviewDialog';
import { napSchema, NapPayload } from '@/lib/gmb/nap';
import { toast } from 'sonner';

const EMPTY: NapPayload = {
  name: '', address: '', city: '', region: '', postal_code: '',
  country: 'US', phone: '', website: '', primary_category: '',
};

export default function GmbDashboard() {
  const { data: locations = [], isLoading } = useGmbLocations();
  const upsert = useUpsertGmbLocation();
  const del = useDeleteGmbLocation();
  const [open, setOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editing, setEditing] = useState<GmbLocation | null>(null);
  const [form, setForm] = useState<NapPayload>(EMPTY);

  const startNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const startEdit = (loc: GmbLocation) => {
    setEditing(loc);
    setForm({
      name: loc.name ?? '', address: loc.address ?? '', city: loc.city ?? '',
      region: loc.region ?? '', postal_code: loc.postal_code ?? '',
      country: (loc.country ?? 'US').toUpperCase(), phone: loc.phone ?? '',
      website: loc.website ?? '', primary_category: loc.primary_category ?? '',
    });
    setOpen(true);
  };

  const openPreview = () => {
    const parsed = napSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setForm(parsed.data);
    setPreviewOpen(true);
  };

  const publish = async () => {
    const data = { ...form, name: form.name } as { name: string } & Partial<GmbLocation>;
    await upsert.mutateAsync(editing ? { ...data, id: editing.id } : data);
    setPreviewOpen(false);
    setOpen(false);
  };

  const before: Partial<NapPayload> = editing ? {
    name: editing.name ?? '', address: editing.address ?? '', city: editing.city ?? '',
    region: editing.region ?? '', postal_code: editing.postal_code ?? '',
    country: (editing.country ?? '').toUpperCase(), phone: editing.phone ?? '',
    website: editing.website ?? '', primary_category: editing.primary_category ?? '',
  } : {};

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <GmbSubNav />
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Store className="h-7 w-7 text-primary" /> Google My Business
            </h1>
            <p className="text-muted-foreground mt-1">
              Create, claim, and manage your Google Business Profiles | reviews, posts, hours, and photos in one place.
            </p>
          </div>
          <Button onClick={startNew}><Plus className="h-4 w-4 mr-2" /> Add Location</Button>
        </header>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm">
              <strong>Connect Google to sync live data.</strong> You'll review a GDPR data-processing notice before any redirect to Google.
            </div>
            <Button variant="outline" onClick={() => setConsentOpen(true)}>Connect Google</Button>
          </CardContent>
        </Card>

        <GoogleConsentDialog
          open={consentOpen}
          onOpenChange={setConsentOpen}
          onConsented={() => toast.info('Consent recorded. OAuth handoff will be enabled once Google credentials are configured.')}
        />

        {isLoading ? (
          <p className="text-muted-foreground">Loading locations…</p>
        ) : locations.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No locations yet. Add your first business location to get started.</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {locations.map((loc) => (
              <Card key={loc.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{loc.name}</CardTitle>
                      <CardDescription>{loc.primary_category || 'Uncategorized'}</CardDescription>
                    </div>
                    <Badge variant={loc.is_connected ? 'default' : 'secondary'}>
                      {loc.is_connected ? 'Connected' : loc.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {loc.address && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" /><span>{loc.address}, {loc.city}, {loc.region} {loc.postal_code}</span></div>}
                  {loc.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{loc.phone}</span></div>}
                  {loc.website && <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><span className="truncate">{loc.website}</span></div>}
                  <div className="flex gap-2 pt-3 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => startEdit(loc)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
                    <Button asChild size="sm" variant="outline"><Link to={`/gmb/reviews?loc=${loc.id}`}>Reviews</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link to={`/gmb/posts?loc=${loc.id}`}>Posts</Link></Button>
                    <Button size="sm" variant="ghost" onClick={() => del.mutate(loc.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? 'Edit Location' : 'New Business Location'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Business name</Label><Input value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="col-span-2"><Label>Street address</Label><Input value={form.address} maxLength={200} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>City</Label><Input value={form.city} maxLength={80} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State / Region</Label><Input value={form.region} maxLength={80} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
              <div><Label>Postal code</Label><Input value={form.postal_code} maxLength={20} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
              <div><Label>Country (2-letter)</Label><Input value={form.country} maxLength={2} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} maxLength={20} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Website</Label><Input value={form.website ?? ''} maxLength={255} placeholder="https://" onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
              <div className="col-span-2"><Label>Primary category</Label><Input placeholder="e.g. Dental Clinic" value={form.primary_category} maxLength={80} onChange={(e) => setForm({ ...form, primary_category: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={openPreview}>Validate &amp; Preview</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <NapPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          before={before}
          after={form}
          isPending={upsert.isPending}
          onConfirm={publish}
        />
      </div>
    </DashboardLayout>
  );
}
