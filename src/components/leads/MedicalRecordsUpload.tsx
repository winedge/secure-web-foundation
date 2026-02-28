import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Download, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MedicalRecordsUploadProps {
  leadId: string;
}

export function MedicalRecordsUpload({ leadId }: MedicalRecordsUploadProps) {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['lead-medical-records', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_analyses')
        .select('*')
        .eq('lead_id', leadId)
        .eq('document_type', 'medical_record')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from('document_analyses').delete().eq('id', docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-medical-records', leadId] });
      toast.success('Document deleted');
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !firm || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.type !== 'application/pdf') {
          toast.error(`${file.name} is not a PDF file`);
          continue;
        }
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 20MB limit`);
          continue;
        }

        const filePath = `${firm.id}/${leadId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('lead-documents')
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('lead-documents')
          .getPublicUrl(filePath);

        await supabase.from('document_analyses').insert({
          lead_id: leadId,
          firm_id: firm.id,
          file_name: file.name,
          file_url: urlData.publicUrl || filePath,
          document_type: 'medical_record',
          status: 'uploaded',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['lead-medical-records', leadId] });
      toast.success('Medical records uploaded');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Medical Records</h4>
        <Button variant="outline" size="sm" className="gap-2" disabled={uploading} asChild>
          <label className="cursor-pointer">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploading...' : 'Upload PDF'}
            <input type="file" accept=".pdf" multiple className="hidden" onChange={handleUpload} />
          </label>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-muted-foreground">Loading...</div>
      ) : documents?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mb-2 opacity-50" />
            <p>No medical records uploaded yet</p>
            <p className="text-sm mt-1">Upload PDF files to attach to this lead</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents?.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(doc.file_url, '_blank')}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(doc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
