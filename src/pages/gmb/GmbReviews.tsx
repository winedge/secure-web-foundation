import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { useGmbLocations, useGmbReviews } from '@/hooks/use-gmb';

export default function GmbReviews() {
  const [params] = useSearchParams();
  const locId = params.get('loc') ?? undefined;
  const { data: locations = [] } = useGmbLocations();
  const activeId = locId ?? locations[0]?.id;
  const { data: reviews = [], isLoading } = useGmbReviews(activeId);
  const active = locations.find((l) => l.id === activeId);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <header>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Star className="h-7 w-7 text-primary" /> Review Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            {active ? `Reviews for ${active.name}` : 'Select a location to view reviews.'}
          </p>
        </header>

        {isLoading ? (
          <p className="text-muted-foreground">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            No reviews yet. Once you connect Google, reviews will sync here automatically.
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((r: any) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{r.reviewer_name ?? 'Anonymous'}</CardTitle>
                    <Badge variant="secondary">{'★'.repeat(r.rating ?? 0)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>{r.text}</p>
                  {r.reply_text && (
                    <div className="rounded-md bg-muted p-3 text-xs">
                      <strong>Reply:</strong> {r.reply_text}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
