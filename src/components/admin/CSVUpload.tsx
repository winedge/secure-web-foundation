import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ParsedLead {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state: string;
  zip_code?: string;
  tort_type: string;
  age_bucket?: string;
  diagnosis_details?: string;
  exposure_details?: string;
}

interface UploadResult {
  total: number;
  inserted: number;
  duplicates: number;
  errors: number;
}

const REQUIRED_COLUMNS = ['state', 'tort_type'];
const OPTIONAL_COLUMNS = [
  'first_name', 'last_name', 'email', 'phone', 
  'address', 'city', 'zip_code', 'age_bucket',
  'diagnosis_details', 'exposure_details'
];

const TORT_TYPES = ['Camp Lejeune', 'Roundup', 'Talcum Powder', 'AFFF', 'Paraquat', '3M Earplugs'];

export function CSVUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedLead[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deduplicate, setDeduplicate] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const rows = lines.slice(1).map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    });
    
    return { headers, rows };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setUploadResult(null);

    try {
      const text = await selectedFile.text();
      const { headers: csvHeaders, rows } = parseCSV(text);
      
      setHeaders(csvHeaders);
      
      // Auto-map columns
      const autoMapping: Record<string, string> = {};
      [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].forEach(col => {
        const matchingHeader = csvHeaders.find(h => 
          h === col || 
          h.replace(/_/g, '') === col.replace(/_/g, '') ||
          h.includes(col)
        );
        if (matchingHeader) {
          autoMapping[col] = matchingHeader;
        }
      });
      setColumnMapping(autoMapping);
      
      // Parse data with auto-mapping
      const parsed = rows.map(row => {
        const lead: Record<string, string> = {};
        csvHeaders.forEach((header, index) => {
          lead[header] = row[index] || '';
        });
        return lead;
      }).filter(row => Object.values(row).some(v => v));
      
      setParsedData(parsed as unknown as ParsedLead[]);
    } catch (err) {
      setError('Failed to parse CSV file');
      console.error(err);
    }
  };

  const getMappedData = (): ParsedLead[] => {
    return parsedData.map(row => {
      const mapped: Record<string, string> = {};
      Object.entries(columnMapping).forEach(([targetCol, sourceCol]) => {
        mapped[targetCol] = (row as unknown as Record<string, string>)[sourceCol] || '';
      });
      return mapped as unknown as ParsedLead;
    }).filter(row => row.state && row.tort_type);
  };

  const handleUpload = async () => {
    const mappedData = getMappedData();
    
    if (mappedData.length === 0) {
      setError('No valid leads to upload. Ensure state and tort_type are mapped.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const leads = mappedData.map(lead => ({
        ...lead,
        source_type: 'csv_upload' as const,
      }));

      // Upload in batches of 100
      const batchSize = 100;
      const batches = Math.ceil(leads.length / batchSize);
      let totalResult: UploadResult = { total: leads.length, inserted: 0, duplicates: 0, errors: 0 };

      for (let i = 0; i < batches; i++) {
        const batch = leads.slice(i * batchSize, (i + 1) * batchSize);
        
        const { data, error: uploadError } = await supabase.functions.invoke('ingest-leads', {
          body: { leads: batch, deduplicate },
        });

        if (uploadError) throw uploadError;

        if (data) {
          totalResult.inserted += data.inserted || 0;
          totalResult.duplicates += data.duplicates || 0;
          totalResult.errors += data.errors || 0;
        }

        setUploadProgress(Math.round(((i + 1) / batches) * 100));
      }

      setUploadResult(totalResult);
      toast.success(`Successfully uploaded ${totalResult.inserted} leads`);
      
      // Reset form
      setFile(null);
      setParsedData([]);
      setHeaders([]);
      setColumnMapping({});
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload leads. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state', 'zip_code', 'tort_type', 'age_bucket', 'diagnosis_details', 'exposure_details'];
    const sampleRow = ['John', 'Doe', 'john@example.com', '555-123-4567', '123 Main St', 'Houston', 'TX', '77001', 'Camp Lejeune', '45-54', 'Sample diagnosis', 'Sample exposure'];
    
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          CSV Lead Upload
        </CardTitle>
        <CardDescription>
          Import leads from CSV files. The system will automatically score and price each lead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="font-medium">Download Template</p>
            <p className="text-sm text-muted-foreground">
              Use our CSV template to ensure correct formatting
            </p>
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Template
          </Button>
        </div>

        {/* File Upload */}
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedData.length} rows detected
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setParsedData([]);
                  setHeaders([]);
                  setColumnMapping({});
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </label>
          )}
        </div>

        {/* Column Mapping */}
        {headers.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Column Mapping</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].map(col => (
                <div key={col} className="space-y-2">
                  <Label className={REQUIRED_COLUMNS.includes(col) ? 'font-medium' : ''}>
                    {col.replace(/_/g, ' ')}
                    {REQUIRED_COLUMNS.includes(col) && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    value={columnMapping[col] || ''}
                    onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [col]: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not mapped</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                Valid leads: {getMappedData().length} of {parsedData.length}
              </p>
            </div>
          </div>
        )}

        {/* Options */}
        {parsedData.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="deduplicate"
                checked={deduplicate}
                onCheckedChange={setDeduplicate}
              />
              <Label htmlFor="deduplicate">Skip duplicates (by email/phone)</Label>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-sm text-center text-muted-foreground">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        {/* Result */}
        {uploadResult && (
          <Alert className="bg-success/10 border-success/20">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertTitle>Upload Complete</AlertTitle>
            <AlertDescription>
              Inserted: {uploadResult.inserted} | Duplicates: {uploadResult.duplicates} | Errors: {uploadResult.errors}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Button */}
        {parsedData.length > 0 && (
          <Button
            onClick={handleUpload}
            disabled={isUploading || getMappedData().length === 0}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : `Upload ${getMappedData().length} Leads`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
