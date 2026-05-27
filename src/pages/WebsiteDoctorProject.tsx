import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';

const sevColor: Record<string, string> = {
  critical: 'destructive', high: 'destructive', medium: 'default', low: 'secondary', info: 'outline',
};

export default function WebsiteDoctorProject() {
  const { projectId } = useParams();
  const [project, setProject] = useState<any>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [patches, setPatches] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [connector, setConnector] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: a }, { data: f }, { data: pa }, { data: ev }, { data: act }, { data: c }] =
      await Promise.all([
        supabase.from('wd_projects').select('*').eq('id', projectId!).single(),
        supabase.from('wd_audits').select('*').eq('project_id', projectId!).order('created_at', { ascending: false }),
        supabase.from('wd_findings').select('*').eq('project_id', projectId!).order('severity'),
        supabase.from('wd_patches').select('*').eq('project_id', projectId!).order('created_at', { ascending: false }),
        supabase.from('wd_monitor_events').select('*').eq('project_id', projectId!).order('created_at', { ascending: false }).limit(50),
        supabase.from('wd_ai_activity').select('*').eq('project_id', projectId!).order('created_at', { ascending: false }).limit(50),
        supabase.from('wd_connectors').select('*').eq('project_id', projectId!).maybeSingle(),
      ]);
    setProject(p);
    setAudits(a ?? []);
    setFindings(f ?? []);
    setPatches(pa ?? []);
    setEvents(ev ?? []);
    setActivity(act ?? []);
    setConnector(c);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`wd-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wd_audits', filter: `project_id=eq.${projectId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wd_findings', filter: `project_id=eq.${projectId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wd_ai_activity', filter: `project_id=eq.${projectId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId]);

  const runAudit = async () => {
    setBusy(true);
    await supabase.functions.invoke('wd-external-audit', { body: { project_id: projectId } });
    setBusy(false);
    toast.success('Audit queued');
  };

  const genPatch = async (findingId: string) => {
    const { error } = await supabase.functions.invoke('wd-generate-patch', { body: { finding_id: findingId } });
    if (error) toast.error(error.message);
    else toast.success('Patch generated');
    load();
  };

  const toggleMonitor = async (v: boolean) => {
    await supabase.from('wd_projects').update({ monitoring_enabled: v }).eq('id', projectId!);
    load();
  };

  const issueToken = async (type: string) => {
    const { data, error } = await supabase.functions.invoke('wd-issue-connector-token', {
      body: { project_id: projectId, type },
    });
    if (error) return toast.error(error.message);
    setToken((data as any).token);
    load();
  };

  if (!project) return <DashboardLayout><div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <a href={project.url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:underline">{project.url}</a>
            <div className="text-xs mt-1 text-muted-foreground">
              ABA 512 / GDPR / EU AI Act compliant | All AI decisions are logged
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">{project.health_score ?? '|'}</div>
              <div className="text-xs text-muted-foreground">health score</div>
            </div>
            <Button onClick={runAudit} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RefreshCw className="h-4 w-4 mr-1" /> Re-scan</>}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="findings">
          <TabsList>
            <TabsTrigger value="findings">Findings ({findings.length})</TabsTrigger>
            <TabsTrigger value="patches">Patches ({patches.length})</TabsTrigger>
            <TabsTrigger value="audits">Audits</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="connector">Connector</TabsTrigger>
            <TabsTrigger value="activity">AI Activity</TabsTrigger>
            <TabsTrigger value="stack">Stack</TabsTrigger>
          </TabsList>

          <TabsContent value="findings" className="space-y-2">
            {findings.length === 0 && <Card className="p-6 text-center text-muted-foreground">No findings yet. Run an audit.</Card>}
            {findings.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={sevColor[f.severity] as any}>{f.severity}</Badge>
                      <Badge variant="outline">{f.category}</Badge>
                      <span className="font-medium">{f.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                    {f.suggested_fix?.text && (
                      <p className="text-sm mt-2"><span className="font-medium">Fix:</span> {f.suggested_fix.text}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => genPatch(f.id)}>
                    <Sparkles className="h-3 w-3 mr-1" /> Patch
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="patches" className="space-y-2">
            {patches.length === 0 && <Card className="p-6 text-center text-muted-foreground">No patches yet.</Card>}
            {patches.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{p.status}</Badge>
                  <Badge variant="outline">risk: {p.risk}</Badge>
                  {p.file_path && <code className="text-xs">{p.file_path}</code>}
                </div>
                <p className="text-sm mb-2">{p.explanation}</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">{p.diff}</pre>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="audits" className="space-y-2">
            {audits.map((a) => (
              <Card key={a.id} className="p-3 flex items-center justify-between text-sm">
                <div>
                  <Badge variant="outline">{a.kind}</Badge>{' '}
                  <Badge>{a.status}</Badge>{' '}
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <span>{a.summary?.health_score ?? '|'}</span>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-3">
            <Card className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">Continuous monitoring</div>
                <div className="text-xs text-muted-foreground">Uptime checks every 5 minutes</div>
              </div>
              <Switch checked={project.monitoring_enabled} onCheckedChange={toggleMonitor} />
            </Card>
            {events.map((e) => (
              <Card key={e.id} className="p-2 text-sm flex justify-between">
                <span><Badge variant={sevColor[e.severity] as any}>{e.kind}</Badge> {JSON.stringify(e.payload)}</span>
                <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="connector" className="space-y-3">
            <Card className="p-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                Install a connector to enable deep codebase analysis. Patches are suggest-only in this release.
              </div>
              {connector ? (
                <div className="flex items-center gap-2">
                  <Badge>{connector.type}</Badge>
                  <Badge variant={connector.status === 'verified' ? 'default' : 'outline'}>{connector.status}</Badge>
                  <code className="text-xs">{connector.public_id}</code>
                </div>
              ) : (
                <div className="flex gap-2">
                  {['wordpress', 'laravel', 'node', 'generic'].map((t) => (
                    <Button key={t} variant="outline" size="sm" onClick={() => issueToken(t)}>{t}</Button>
                  ))}
                </div>
              )}
              {token && connector && (
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded text-xs break-all">
                    <div className="font-medium mb-1">One-time token (shown once, save it now):</div>
                    <code>{token}</code>
                  </div>
                  {connector.type === 'generic' && (
                    <div className="p-3 bg-muted rounded text-xs">
                      <div className="font-medium mb-2">Paste before {'</body>'} on your site:</div>
                      <pre className="overflow-auto whitespace-pre-wrap">{`<script>(function(){var P="${connector.public_id}",T="${token}",U="https://sdtphgskqpelpbwhipls.supabase.co/functions/v1/wd-beacon",Q=[];function s(e){Q.push(e);if(Q.length>=5)f()}function f(){if(!Q.length)return;var b=JSON.stringify({public_id:P,token:T,events:Q.splice(0)});(navigator.sendBeacon&&navigator.sendBeacon(U,b))||fetch(U,{method:"POST",headers:{"Content-Type":"application/json"},body:b,keepalive:true})}addEventListener("error",function(e){s({kind:"js_error",severity:"high",payload:{msg:e.message,src:e.filename,ln:e.lineno}})});addEventListener("load",function(){s({kind:"page_view",payload:{url:location.href,t:performance.now()|0}})});addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")f()});setInterval(f,15000)})();</script>`}</pre>
                    </div>
                  )}
                </div>
              )}

            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-2">
            {activity.map((a) => (
              <Card key={a.id} className="p-2 text-sm">
                <Badge variant="outline">{a.agent}</Badge> {a.action}
                <span className="text-xs text-muted-foreground ml-2">{new Date(a.created_at).toLocaleString()}</span>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="stack">
            <Card className="p-4"><pre className="text-xs overflow-auto">{JSON.stringify(project.detected_stack, null, 2)}</pre></Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
