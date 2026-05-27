import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Stethoscope, Plus, ExternalLink, AlertTriangle, Activity, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HealthScoreRing } from '@/components/website-doctor/HealthScoreRing';

interface Project {
  id: string;
  url: string;
  name: string;
  health_score: number | null;
  monitoring_enabled: boolean;
  detected_stack: any;
  created_at: string;
}

export default function WebsiteDoctorProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [findingCounts, setFindingCounts] = useState<Record<string, { critical: number; high: number; total: number }>>({});
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('wd_projects')
      .select('*')
      .order('created_at', { ascending: false });
    const list = (data as any) ?? [];
    setProjects(list);
    if (list.length) {
      const { data: f } = await supabase
        .from('wd_findings')
        .select('project_id, severity')
        .in('project_id', list.map((p: Project) => p.id));
      const counts: Record<string, { critical: number; high: number; total: number }> = {};
      (f ?? []).forEach((row: any) => {
        const c = counts[row.project_id] ??= { critical: 0, high: 0, total: 0 };
        c.total++;
        if (row.severity === 'critical') c.critical++;
        if (row.severity === 'high') c.high++;
      });
      setFindingCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createProject = async () => {
    if (!url.trim()) return;
    setCreating(true);
    try {
      let normalized = url.trim();
      if (!/^https?:\/\//.test(normalized)) normalized = `https://${normalized}`;
      const domain = new URL(normalized).hostname;

      const { data: userData } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from('firm_members')
        .select('firm_id')
        .eq('user_id', userData.user!.id)
        .maybeSingle();
      if (!member) throw new Error('No firm linked to your account.');

      const { data: project, error } = await supabase
        .from('wd_projects')
        .insert({
          firm_id: (member as any).firm_id,
          url: normalized,
          normalized_domain: domain,
          name: domain,
          created_by: userData.user!.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Fire-and-forget detect + audit
      supabase.functions.invoke('wd-detect-stack', { body: { url: normalized, project_id: project.id } });
      supabase.functions.invoke('wd-external-audit', { body: { project_id: project.id } });

      toast.success('Scan started | audit running in background');
      setUrl('');
      await load();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Stethoscope className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Website Doctor</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered website audit, optimization & autonomous repair | ABA 512 / GDPR / EU AI Act
            </p>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://your-website.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createProject()}
            />
            <Button onClick={createProject} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Scan</>}
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : projects.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No websites yet. Add a URL above to run your first AI audit.
          </Card>
        ) : (
          <div className="grid gap-3">
            {projects.map((p) => (
              <Link to={`/website-doctor/${p.id}`} key={p.id}>
                <Card className="p-4 hover:border-primary transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {p.name}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground">{p.url}</div>
                      {p.detected_stack?.cms || p.detected_stack?.framework ? (
                        <div className="flex gap-1 mt-2">
                          {p.detected_stack.cms && <Badge variant="secondary">{p.detected_stack.cms}</Badge>}
                          {p.detected_stack.framework && <Badge variant="secondary">{p.detected_stack.framework}</Badge>}
                          {p.detected_stack.hosting && <Badge variant="outline">{p.detected_stack.hosting}</Badge>}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary">{p.health_score ?? '|'}</div>
                      <div className="text-xs text-muted-foreground">health</div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
