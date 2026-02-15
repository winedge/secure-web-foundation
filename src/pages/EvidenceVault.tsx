import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ShieldCheck, Upload, FileText, Lock, CheckCircle, AlertTriangle, Hash, Eye, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface VaultEntry {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  sha256_hash: string;
  previous_hash: string | null;
  chain_position: number;
  integrity_verified: boolean;
  tamper_detected: boolean;
  created_at: string;
  metadata: any;
}

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function EvidenceVault() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['evidence-vault', firm?.id],
    queryFn: async () => {
      if (!firm?.id) return [];
      const { data, error } = await supabase
        .from('evidence_vault')
        .select('*')
        .eq('firm_id', firm.id)
        .order('chain_position', { ascending: false });
      if (error) throw error;
      return data as VaultEntry[];
    },
    enabled: !!firm?.id,
  });

  const getLastHash = () => entries.length > 0 ? entries[0].sha256_hash : null;

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !firm?.id || !user?.id) return;
    
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Compute SHA-256 hash
        const hash = await computeSHA256(file);
        const previousHash = getLastHash();
        const chainPosition = entries.length + 1;
        
        // Combine with previous hash for chain integrity
        const chainHash = previousHash 
          ? await computeSHA256(new File([hash + previousHash], 'chain'))
          : hash;

        // Upload file to storage
        const path = `${firm.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('lead-documents')
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('lead-documents').getPublicUrl(path);

        // Store in vault
        const { error: insertError } = await supabase.from('evidence_vault').insert({
          firm_id: firm.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
          sha256_hash: hash,
          previous_hash: previousHash,
          chain_position: chainPosition,
          uploaded_by: user.id,
          metadata: {
            original_name: file.name,
            upload_timestamp: new Date().toISOString(),
            chain_hash: chainHash,
            user_agent: navigator.userAgent,
          },
        });
        if (insertError) throw insertError;

        // Log audit trail
        await supabase.from('evidence_audit_trail').insert({
          evidence_id: (await supabase.from('evidence_vault').select('id').eq('sha256_hash', hash).single()).data?.id || '',
          action: 'upload',
          actor_id: user.id,
          details: { file_name: file.name, file_size: file.size, hash },
        });
      }

      queryClient.invalidateQueries({ queryKey: ['evidence-vault'] });
      toast.success(`${files.length} file(s) secured in vault with cryptographic proof`);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }, [firm?.id, user?.id, entries]);

  const verifyIntegrity = async (entry: VaultEntry) => {
    setVerifyingId(entry.id);
    try {
      // Re-download and hash
      const response = await fetch(entry.file_url);
      const blob = await response.blob();
      const file = new File([blob], entry.file_name);
      const currentHash = await computeSHA256(file);

      const isValid = currentHash === entry.sha256_hash;
      
      await supabase.from('evidence_vault').update({
        integrity_verified: isValid,
        tamper_detected: !isValid,
        verified_at: new Date().toISOString(),
      }).eq('id', entry.id);

      await supabase.from('evidence_audit_trail').insert({
        evidence_id: entry.id,
        action: 'verify',
        actor_id: user?.id || '',
        details: { original_hash: entry.sha256_hash, current_hash: currentHash, is_valid: isValid },
      });

      queryClient.invalidateQueries({ queryKey: ['evidence-vault'] });
      
      if (isValid) {
        toast.success('✓ Integrity verified — no tampering detected');
      } else {
        toast.error('⚠ TAMPERING DETECTED — hash mismatch!');
      }
    } catch (err: any) {
      toast.error('Verification failed: ' + err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              Evidence Vault
            </h1>
            <p className="text-muted-foreground mt-1">Blockchain-grade cryptographic evidence storage with tamper-proof chain of custody.</p>
          </div>
          <div className="relative">
            <input type="file" multiple onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading} />
            <Button disabled={isUploading} size="lg" className="gap-2">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isUploading ? 'Securing...' : 'Upload to Vault'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 text-center">
            <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{entries.length}</p>
            <p className="text-xs text-muted-foreground">Documents Secured</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <Hash className="h-6 w-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{entries.filter(e => e.integrity_verified).length}</p>
            <p className="text-xs text-muted-foreground">Verified</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{entries.filter(e => e.tamper_detected).length}</p>
            <p className="text-xs text-muted-foreground">Tamper Alerts</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">
              {formatBytes(entries.reduce((s, e) => s + (e.file_size || 0), 0))}
            </p>
            <p className="text-xs text-muted-foreground">Total Stored</p>
          </CardContent></Card>
        </div>

        {/* Chain of Custody Table */}
        <Card>
          <CardHeader>
            <CardTitle>Chain of Custody</CardTitle>
            <CardDescription>Each document is cryptographically linked to the previous, forming an immutable evidence chain</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : entries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chain #</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>SHA-256 Hash</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">#{entry.chain_position}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm text-foreground">{entry.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono">
                          {entry.sha256_hash.slice(0, 16)}...
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatBytes(entry.file_size)}</TableCell>
                      <TableCell>
                        {entry.tamper_detected ? (
                          <Badge className="bg-destructive text-destructive-foreground gap-1"><AlertTriangle className="h-3 w-3" /> Tampered</Badge>
                        ) : entry.integrity_verified ? (
                          <Badge className="bg-accent text-accent-foreground gap-1"><CheckCircle className="h-3 w-3" /> Verified</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => verifyIntegrity(entry)}
                            disabled={verifyingId === entry.id}
                          >
                            {verifyingId === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <ShieldCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No evidence uploaded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
