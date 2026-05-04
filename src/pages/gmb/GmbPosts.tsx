import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarPlus } from 'lucide-react';
import { useGmbLocations, useGmbPosts } from '@/hooks/use-gmb';

export default function GmbPosts() {
  const [params] = useSearchParams();
  const locId = params.get('loc') ?? undefined;
  const { data: locations = [] } = useGmbLocations();
  const activeId = locId ?? locations[0]?.id;
  const { data: posts = [], isLoading } = useGmbPosts(activeId);
  const active = locations.find((l) => l.id === activeId);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <header>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarPlus className="h-7 w-7 text-primary" /> GMB Post Scheduler
          </h1>
          <p className="text-muted-foreground mt-1">
            {active ? `Scheduled posts for ${active.name}` : 'Select a location to view posts.'}
          </p>
        </header>
        {isLoading ? (
          <p className="text-muted-foreground">Loading posts…</p>
        ) : posts.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            No posts scheduled. Connect Google to publish offers, events, and updates.
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {posts.map((p: any) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">{p.post_type}</CardTitle>
                    <Badge variant="secondary">{p.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm">{p.summary}</CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
