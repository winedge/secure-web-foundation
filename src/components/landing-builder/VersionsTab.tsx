import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, History, Share2, Trash2, RotateCcw, Copy, ExternalLink, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  useLandingVersions,
  useCreateLandingVersion,
  useDeleteLandingVersion,
  useLandingPreviews,
  useCreateLandingPreview,
  useDeleteLandingPreview,
  type LandingSnapshot,
  type LandingVersion,
} from '@/hooks/use-landing-versions';

type Props = {
  snapshot: LandingSnapshot;
  onRestore: (snapshot: LandingSnapshot) => void;
};

export function VersionsTab({ snapshot, onRestore }: Props) {
  const versions = useLandingVersions();
  const previews = useLandingPreviews();
  const createVersion = useCreateLandingVersion();
  const deleteVersion = useDeleteLandingVersion();
  const createPreview = useCreateLandingPreview();
  const deletePreview = useDeleteLandingPreview();

  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [expiryDays, setExpiryDays] = useState('7');

  const handleSnapshot = async () => {
    await createVersion.mutateAsync({
      snapshot,
      label: label.trim() || `Snapshot ${new Date().toLocaleString()}`,
      note: note.trim() || undefined,
    });
    setLabel('');
    setNote('');
    toast.success('Version saved');
  };

  const handleShare = async (version: LandingVersion) => {
    const days = parseInt(expiryDays, 10) || 7;
    const preview = await createPreview.mutateAsync({ versionId: version.id, expiresInDays: days });
    const url = `${window.location.origin}/preview/landing/${preview.token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success('Preview link copied', {
      description: `Expires in ${days} day${days === 1 ? '' : 's'}`,
    });
  };

  const handleRestore = (v: LandingVersion) => {
    onRestore(v.snapshot);
    toast.info('Version loaded into editor', {
      description: 'Click "Save Changes" to publish it as the live page.',
    });
  };

  const previewsByVersion = new Map<string, ReturnType<typeof Array.prototype.filter>>();
  (previews.data ?? []).forEach((p) => {
    const list = (previewsByVersion.get(p.version_id) ?? []) as any[];
    list.push(p);
    previewsByVersion.set(p.version_id, list as any);
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Save className="h-5 w-5" />
            Snapshot current draft
          </CardTitle>
          <CardDescription>
            Save the page in its current state so you can review or roll back later. This does not publish anything live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Holiday hero v2"
              />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What did you change?"
              />
            </div>
          </div>
          <Button onClick={handleSnapshot} disabled={createVersion.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Save snapshot
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Version history
          </CardTitle>
          <CardDescription>
            Restore a version into the editor or share it as a private preview link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-3 pb-3 border-b">
            <div className="w-40">
              <Label className="text-xs">Share link expires in</Label>
              <Select value={expiryDays} onValueChange={setExpiryDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {versions.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!versions.isLoading && (versions.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No saved versions yet. Snapshot the current draft above to start tracking history.
            </p>
          )}
          {(versions.data ?? []).map((v) => {
            const vPreviews = (previewsByVersion.get(v.id) ?? []) as any[];
            return (
              <div key={v.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{v.label || 'Untitled snapshot'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(v.created_at).toLocaleString()}
                      {v.snapshot?.sections?.length != null && (
                        <> | {v.snapshot.sections.length} sections</>
                      )}
                    </div>
                    {v.note && <div className="text-sm mt-2">{v.note}</div>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleRestore(v)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restore
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleShare(v)} disabled={createPreview.isPending}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share preview
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Delete this version? This cannot be undone.')) {
                          deleteVersion.mutate(v.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {vPreviews.length > 0 && (
                  <div className="rounded-md bg-muted/40 p-3 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Share2 className="h-3 w-3" />
                      Active share links
                    </div>
                    {vPreviews.map((p: any) => {
                      const url = `${window.location.origin}/preview/landing/${p.token}`;
                      const expired = new Date(p.expires_at).getTime() < Date.now();
                      return (
                        <div key={p.id} className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs bg-background px-2 py-1 rounded border truncate max-w-[260px]">
                            {url}
                          </code>
                          <Badge variant={expired ? 'destructive' : 'secondary'} className="text-[10px]">
                            <Clock className="h-3 w-3 mr-1" />
                            {expired ? 'expired' : `expires ${new Date(p.expires_at).toLocaleDateString()}`}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{p.view_count} views</Badge>
                          <div className="ml-auto flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(url);
                                toast.success('Link copied');
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => window.open(url, '_blank')}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deletePreview.mutate(p.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
