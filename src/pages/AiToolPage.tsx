/**
 * Shared dynamic page for all 40 AI tools. Mounted at /tools/:toolKey.
 * Looks up the tool in the registry, gates by module access, runs the
 * shared `ai-tool-runner` edge function, and shows result + history.
 */
import { useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGate } from "@/components/verticals/ModuleGate";
import { AI_TOOLS_BY_KEY, asModuleKey } from "@/lib/ai-tools/registry";
import { useFirm } from "@/hooks/use-firm";
import { useVertical } from "@/hooks/use-vertical";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Upload, History, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const BUCKET = "lead-documents";

export default function AiToolPage() {
  const { toolKey } = useParams<{ toolKey: string }>();
  const tool = toolKey ? AI_TOOLS_BY_KEY[toolKey] : undefined;

  if (!tool) return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <ModuleGate moduleKey={asModuleKey(tool.moduleKey)} label={tool.label}>
        <AiToolRunner toolKey={tool.key} />
      </ModuleGate>
    </DashboardLayout>
  );
}

function AiToolRunner({ toolKey }: { toolKey: string }) {
  const tool = AI_TOOLS_BY_KEY[toolKey];
  const { data: firm } = useFirm();
  const { vertical } = useVertical();
  const qc = useQueryClient();

  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const Icon = tool.icon;

  // History — last 10 runs of this tool for this firm
  const { data: history } = useQuery({
    queryKey: ["ai-tool-history", tool.key, firm?.id],
    queryFn: async () => {
      if (!firm?.id) return [];
      const { data, error } = await supabase
        .from("ai_tool_results" as any)
        .select("id, input_text, input_file_name, output_text, status, created_at")
        .eq("firm_id", firm.id)
        .eq("tool_key", tool.key)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!firm?.id,
  });

  async function uploadFile(f: File): Promise<{ url: string; name: string } | null> {
    if (!firm?.id) return null;
    const ext = f.name.split(".").pop() || "bin";
    const path = `ai-tools/${firm.id}/${tool.key}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, {
      upsert: false,
      contentType: f.type || undefined,
    });
    if (error) throw error;
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60); // 1h
    if (!data?.signedUrl) throw new Error("Failed to create signed URL");
    return { url: data.signedUrl, name: f.name };
  }

  async function handleRun() {
    if (!text.trim() && !file) {
      toast.error("Provide some text or upload a file.");
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      let fileMeta: { url: string; name: string } | null = null;
      if (file) {
        toast.info("Uploading file…");
        fileMeta = await uploadFile(file);
      }

      const { data, error } = await supabase.functions.invoke("ai-tool-runner", {
        body: {
          tool_key: tool.key,
          text_input: text,
          file_url: fileMeta?.url ?? null,
          file_name: fileMeta?.name ?? null,
          vertical_slug: vertical?.slug ?? null,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setResult((data as any).output ?? "");
      toast.success("Done!");
      qc.invalidateQueries({ queryKey: ["ai-tool-history", tool.key, firm?.id] });
    } catch (e: any) {
      const msg = e?.message || "Something went wrong";
      toast.error(msg);
      setResult(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  function copyResult() {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">{tool.label}</h1>
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" /> AI
            </Badge>
            {vertical?.name && (
              <Badge variant="secondary" className="text-xs">{vertical.name}</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">{tool.tagline}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Input</CardTitle>
              {tool.helper && <CardDescription>{tool.helper}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
              {tool.fileAccept && (
                <div className="space-y-2">
                  <Label htmlFor="file">
                    {tool.fileFirst ? "Upload file (recommended)" : "Attach file (optional)"}
                  </Label>
                  {file ? (
                    <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Input
                      id="file"
                      type="file"
                      accept={tool.fileAccept}
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="prompt">Details</Label>
                <Textarea
                  id="prompt"
                  rows={8}
                  placeholder={tool.inputPlaceholder}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleRun} disabled={submitting} className="flex-1">
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running…</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Run AI</>
                  )}
                </Button>
                {(text || file) && !submitting && (
                  <Button
                    variant="outline"
                    onClick={() => { setText(""); setFile(null); setResult(null); }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          {result !== null && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Result</CardTitle>
                  <CardDescription>Saved to your tool history</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={copyResult}>
                  {copied ? <><Check className="h-4 w-4 mr-1" /> Copied</> : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
                </Button>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{result}</pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* History sidebar */}
        <div>
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" /> Recent runs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2 p-4">
                  {!history?.length && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      No runs yet. Your tool history will appear here.
                    </p>
                  )}
                  {history?.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => setResult(h.output_text)}
                      className="w-full text-left p-3 rounded-md border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={h.status === "completed" ? "secondary" : "destructive"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {h.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {h.input_text || h.input_file_name || "(no input)"}
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center pt-2">
        AI output may contain mistakes. Always verify before acting on it.
        {" "}
        <Link to="/settings" className="underline">Manage AI tools</Link>
      </div>
    </div>
  );
}
