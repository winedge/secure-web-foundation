import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Save, Download, Upload, Trash2, Search, Loader2, LayoutTemplate, Globe, Lock, Copy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  useLandingTemplates,
  useSaveLandingTemplate,
  useDeleteLandingTemplate,
  type LandingTemplate,
} from '@/hooks/use-landing-templates';
import type { LandingSnapshot } from '@/hooks/use-landing-versions';

const CATEGORIES = ['general', 'legal', 'medical', 'saas', 'agency', 'ecommerce', 'event', 'portfolio', 'other'];

interface Props {
  snapshot: LandingSnapshot;
  onApply: (snapshot: LandingSnapshot) => void;
}

export function TemplatesTab({ snapshot, onApply }: Props) {
  const { data: templates = [], isLoading } = useLandingTemplates();
  const saveTemplate = useSaveLandingTemplate();
  const deleteTemplate = useDeleteLandingTemplate();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine' | 'public'>('all');
  const [saveOpen, setSaveOpen] = useState(false);

  // Save form
  const [tName, setTName] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tCategory, setTCategory] = useState('general');
  const [tTags, setTTags] = useState('');
  const [tPublic, setTPublic] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (scopeFilter === 'public' && !t.is_public) return false;
      if (scopeFilter === 'mine' && t.is_public && t.user_id !== t.user_id /* placeholder */) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [templates, search, categoryFilter, scopeFilter]);

  const handleSave = () => {
    if (!tName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    saveTemplate.mutate(
      {
        name: tName.trim(),
        description: tDesc.trim() || undefined,
        category: tCategory,
        tags: tTags.split(',').map((s) => s.trim()).filter(Boolean),
        is_public: tPublic,
        snapshot,
      },
      {
        onSuccess: () => {
          setSaveOpen(false);
          setTName('');
          setTDesc('');
          setTCategory('general');
          setTTags('');
          setTPublic(false);
        },
      }
    );
  };

  const handleApply = (t: LandingTemplate) => {
    onApply(t.snapshot);
    toast.success(`Applied "${t.name}"`);
  };

  const handleExport = (t?: LandingTemplate) => {
    const payload = t
      ? { name: t.name, description: t.description, category: t.category, tags: t.tags, snapshot: t.snapshot }
      : { name: 'Current landing page', category: 'general', tags: [], snapshot };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(t?.name ?? 'landing-template').replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const snap = parsed.snapshot ?? parsed;
      if (!snap || typeof snap !== 'object' || !Array.isArray(snap.sections)) {
        throw new Error('Invalid template file');
      }
      saveTemplate.mutate({
        name: parsed.name ?? file.name.replace(/\.json$/, ''),
        description: parsed.description ?? 'Imported template',
        category: parsed.category ?? 'general',
        tags: parsed.tags ?? [],
        is_public: false,
        snapshot: snap,
      });
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to import template');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" /> Templates Gallery
            </CardTitle>
            <CardDescription>
              Save your current page as a reusable template, browse your library, or import/export JSON files.
            </CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = '';
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Import
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport()}>
              <Download className="h-4 w-4 mr-2" /> Export current
            </Button>
            <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Save className="h-4 w-4 mr-2" /> Save as template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save as template</DialogTitle>
                  <DialogDescription>
                    Snapshot the current page (sections, theme, branding, SEO) for reuse later.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label>Name *</Label>
                    <Input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="e.g. Personal Injury Landing" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={tDesc} onChange={(e) => setTDesc(e.target.value)} rows={2} placeholder="What is this template for?" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Category</Label>
                      <Select value={tCategory} onValueChange={setTCategory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tags (comma separated)</Label>
                      <Input value={tTags} onChange={(e) => setTTags(e.target.value)} placeholder="hero, lead-gen" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded border p-3">
                    <div>
                      <div className="text-sm font-medium">Share publicly</div>
                      <div className="text-xs text-muted-foreground">Allow other users to discover this template.</div>
                    </div>
                    <Switch checked={tPublic} onCheckedChange={setTPublic} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saveTemplate.isPending}>
                    {saveTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as any)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="mine">My templates</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 mx-auto animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <LayoutTemplate className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No templates yet</p>
              <p className="text-sm">Save the current page as a template, or import a JSON file.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onApply={() => handleApply(t)}
                  onExport={() => handleExport(t)}
                  onDelete={() => deleteTemplate.mutate(t.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TemplateCard({
  template, onApply, onExport, onDelete,
}: {
  template: LandingTemplate;
  onApply: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const sectionCount = Array.isArray(template.snapshot?.sections) ? template.snapshot.sections.length : 0;
  const sectionTypes = (template.snapshot?.sections ?? []).map((s: any) => s.type).slice(0, 4);

  return (
    <Card className="overflow-hidden hover:border-primary/40 transition-colors">
      <div
        className="h-32 border-b flex items-center justify-center text-xs text-muted-foreground"
        style={{
          background: template.thumbnail_url
            ? `url(${template.thumbnail_url}) center/cover`
            : `linear-gradient(135deg, ${template.snapshot?.primary_color ?? '#0f172a'}, ${template.snapshot?.accent_color ?? '#10b981'})`,
          color: '#fff',
        }}
      >
        {!template.thumbnail_url && (
          <div className="font-semibold text-center px-3 truncate">{template.snapshot?.heading_text ?? template.name}</div>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{template.name}</div>
            {template.description && (
              <div className="text-xs text-muted-foreground line-clamp-2">{template.description}</div>
            )}
          </div>
          {template.is_starter ? (
            <Badge className="shrink-0 bg-emerald-600 hover:bg-emerald-600 text-white">
              <Sparkles className="h-3 w-3 mr-1" /> Starter
            </Badge>
          ) : template.is_public ? (
            <Badge variant="secondary" className="shrink-0"><Globe className="h-3 w-3 mr-1" /> Public</Badge>
          ) : (
            <Badge variant="outline" className="shrink-0"><Lock className="h-3 w-3 mr-1" /> Private</Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">{template.category}</Badge>
          <Badge variant="outline" className="text-xs">{sectionCount} sections</Badge>
          {sectionTypes.map((t: string, i: number) => (
            <Badge key={i} variant="outline" className="text-xs opacity-70">{t}</Badge>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1" onClick={onApply}>
            <Copy className="h-4 w-4 mr-1" /> Apply
          </Button>
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="h-4 w-4" />
          </Button>
          {template.is_starter ? (
            <Button
              size="sm"
              variant="outline"
              disabled
              title="Built-in starter template | cannot be deleted"
            >
              <Trash2 className="h-4 w-4 opacity-40" />
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this template?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{template.name}" will be permanently removed. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
