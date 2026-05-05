import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Reply } from 'lucide-react';
import { useGmbLocations, useGmbReviews, useReplyToReview } from '@/hooks/use-gmb';

export default function GmbReviews() {
  const [params, setParams] = useSearchParams();
  const locId = params.get('loc') ?? undefined;
  const { data: locations = [] } = useGmbLocations();
  const activeId = locId ?? locations[0]?.id;
  const { data: reviews = [], isLoading } = useGmbReviews(activeId);
  const active = locations.find((l) => l.id === activeId);
  const reply = useReplyToReview();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Star className="h-7 w-7 text-primary" /> Review Manager
            </h1>
            <p className="text-muted-foreground mt-1">
              {active ? `Reviews for ${active.name}` : 'Select a location to view reviews.'}
            </p>
          </div>
          {locations.length > 0 && (
            <Select value={activeId} onValueChange={(v) => setParams({ loc: v })}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
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
                <CardContent className="text-sm space-y-3">
                  <p>{r.text}</p>
                  {r.reply_text ? (
                    <div className="rounded-md bg-muted p-3 text-xs">
                      <strong>Your reply:</strong> {r.reply_text}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        rows={2}
                        placeholder="Write a professional reply…"
                        value={drafts[r.id] ?? ''}
                        onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })}
                      />
                      <Button
                        size="sm"
                        disabled={!drafts[r.id]?.trim() || reply.isPending}
                        onClick={() => reply.mutate({ id: r.id, reply_text: drafts[r.id].trim() })}
                      >
                        <Reply className="h-4 w-4 mr-2" /> Send reply
                      </Button>
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
