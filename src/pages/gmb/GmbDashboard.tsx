import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Store, Plus, MapPin, Phone, Globe, Trash2 } from 'lucide-react';
import { useGmbLocations, useUpsertGmbLocation, useDeleteGmbLocation } from '@/hooks/use-gmb';
import { Link } from 'react-router-dom';
import { GoogleConsentDialog } from '@/components/gmb/GoogleConsentDialog';
import { toast } from 'sonner';

export default function GmbDashboard() {
  const { data: locations = [], isLoading } = useGmbLocations();
  const upsert = useUpsertGmbLocation();
  const del = useDeleteGmbLocation();
  const [open, setOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', address: '', city: '', region: '', postal_code: '',
    country: 'US', phone: '', website: '', primary_category: '',
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Store className="h-7 w-7 text-primary" /> Google My Business
            </h1>
            <p className="text-muted-foreground mt-1">
              Create, claim, and manage your Google Business Profiles | reviews, posts, hours, and photos in one place.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Location</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Business Location</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Business name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="col-span-2"><Label>Street address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>State / Region</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
                <div><Label>Postal code</Label><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
                <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
                <div className="col-span-2"><Label>Primary category</Label><Input placeholder="e.g. Dental Clinic" value={form.primary_category} onChange={(e) => setForm({ ...form, primary_category: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button onClick={async () => { await upsert.mutateAsync(form); setOpen(false); }} disabled={!form.name}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                  <div className="flex gap-2 pt-3">
                    <Button asChild size="sm" variant="outline"><Link to={`/gmb/reviews?loc=${loc.id}`}>Reviews</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link to={`/gmb/posts?loc=${loc.id}`}>Posts</Link></Button>
                    <Button size="sm" variant="ghost" onClick={() => del.mutate(loc.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
