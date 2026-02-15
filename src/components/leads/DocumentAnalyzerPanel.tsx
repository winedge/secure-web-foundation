import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2, X, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocumentAnalyzerPanelProps {
  leadId: string;
}

export function DocumentAnalyzerPanel({ leadId }: DocumentAnalyzerPanelProps) {
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['document-analyses', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_analyses')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke('document-analyzer', {
        body: { document_id: documentId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-analyses', leadId] });
      toast.success('Document analyzed successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Analysis failed'),
  });

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    if (!firm?.id) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${firm.id}/${leadId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('lead-documents')
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('lead-documents')
          .getPublicUrl(path);

        const docType = file.name.toLowerCase().includes('medical') ? 'medical_record'
          : file.name.toLowerCase().includes('police') ? 'police_report'
          : file.name.toLowerCase().includes('intake') ? 'intake_form'
          : 'other';

        const { data: doc, error: insertError } = await supabase
          .from('document_analyses')
          .insert({
            lead_id: leadId,
            firm_id: firm.id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            document_type: docType,
            status: 'pending',
          })
          .select()
          .single();
        if (insertError) throw insertError;

        // Auto-trigger analysis
        analyzeMutation.mutate(doc.id);
      }
      queryClient.invalidateQueries({ queryKey: ['document-analyses', leadId] });
      toast.success('Document(s) uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [firm?.id, leadId, queryClient, analyzeMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const severityColor = (s: string) => s === 'critical' ? 'text-destructive' : s === 'warning' ? 'text-warning' : 'text-info';

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) handleFileUpload(files);
          };
          input.click();
        }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading & analyzing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop medical records, police reports, or intake docs here</p>
            <p className="text-xs text-muted-foreground">PDF, Word, or images • AI will extract key facts automatically</p>
          </div>
        )}
      </div>

      {/* Analyzed Documents */}
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : documents && documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((doc: any) => (
            <Card key={doc.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {doc.file_name}
                  </CardTitle>
                  <Badge variant={doc.status === 'analyzed' ? 'default' : 'secondary'}>
                    {doc.status === 'analyzed' ? 'Analyzed' : doc.status === 'pending' ? 'Processing...' : doc.status}
                  </Badge>
                </div>
              </CardHeader>
              {doc.status === 'analyzed' && (
                <CardContent className="space-y-3 pt-0">
                  {/* Summary */}
                  {doc.ai_summary && (
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{doc.ai_summary}</p>
                  )}

                  {/* Extracted Facts */}
                  {doc.extracted_facts && (doc.extracted_facts as any[]).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Key Facts</p>
                      <div className="space-y-1.5">
                        {(doc.extracted_facts as any[]).slice(0, 5).map((fact: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-accent shrink-0" />
                            <div>
                              <span className="font-medium text-foreground">{fact.category}:</span>{' '}
                              <span className="text-muted-foreground">{fact.fact}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Statute Risks */}
                  {doc.statute_risks && (doc.statute_risks as any[]).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Statute of Limitations Risks</p>
                      <div className="space-y-1.5">
                        {(doc.statute_risks as any[]).map((risk: any, i: number) => (
                          <div key={i} className={cn('flex items-start gap-2 text-sm p-2 rounded-lg', risk.severity === 'critical' ? 'bg-destructive/10' : 'bg-warning/10')}>
                            <AlertTriangle className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', severityColor(risk.severity))} />
                            <div>
                              <span className="font-medium">{risk.risk_type}:</span>{' '}
                              <span className="text-muted-foreground">{risk.description}</span>
                              {risk.deadline && <span className="text-xs ml-1 font-mono">({risk.deadline})</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto-populated Fields */}
                  {doc.auto_populated_fields && Object.keys(doc.auto_populated_fields as object).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Auto-Populated Fields</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(doc.auto_populated_fields as Record<string, string>).filter(([, v]) => v).map(([k, v]) => (
                          <div key={k} className="bg-accent/10 p-2 rounded text-xs">
                            <span className="font-medium capitalize">{k.replace(/_/g, ' ')}:</span>{' '}
                            <span className="text-muted-foreground">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
              {doc.status === 'pending' && (
                <CardContent className="pt-0">
                  <Button size="sm" variant="outline" onClick={() => analyzeMutation.mutate(doc.id)} disabled={analyzeMutation.isPending}>
                    <Brain className="h-4 w-4 mr-1" />
                    {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze Now'}
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No documents uploaded yet</p>
        </div>
      )}
    </div>
  );
}
