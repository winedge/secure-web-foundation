import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { Scale, Upload, FileText, CheckCircle, XCircle, Lightbulb, MapPin, Clock, BookOpen, AlertTriangle, Search, Loader2, Sparkles, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import mammoth from 'mammoth';
import { useVertical } from '@/hooks/use-vertical';

interface DocumentEvaluation {
  case_summary: string;
  tort_type: string;
  jurisdiction: string;
  viability_score: number;
  settlement_estimate_low: number;
  settlement_estimate_high: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  jurisdiction_notes: string;
  statute_of_limitations: string;
  similar_cases_summary: string;
  key_evidence: string[];
  missing_information: string[];
}

export default function AiCaseEvaluatorPage() {
  const { term } = useVertical();
  const evaluatorTitle = term('evaluator_title', 'AI Case Evaluator');
  const evaluatorSubject = term('evaluator_subject', 'case');
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<DocumentEvaluation | null>(null);

  const handleFileDrop = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/pdf',
    ];
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(selectedFile.type) && !['docx', 'txt', 'pdf'].includes(ext || '')) {
      toast.error('Please upload a .docx, .txt, or .pdf file');
      return;
    }

    setFile(selectedFile);
    setEvaluation(null);
    setIsExtracting(true);

    try {
      let extracted = '';
      if (ext === 'docx' || selectedFile.type.includes('wordprocessingml')) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extracted = result.value;
      } else if (ext === 'txt' || selectedFile.type === 'text/plain') {
        extracted = await selectedFile.text();
      } else if (ext === 'pdf') {
        toast.info('PDF text extraction is limited. For best results, use .docx or .txt files.');
        extracted = await selectedFile.text();
      }

      if (!extracted.trim()) {
        toast.error('Could not extract text from the file. Please try a .docx or .txt file.');
        setFile(null);
      } else {
        setTextContent(extracted);
        toast.success(`Extracted ${extracted.length.toLocaleString()} characters from ${selectedFile.name}`);
      }
    } catch (err) {
      console.error('Extraction error:', err);
      toast.error('Failed to read the file. Please try a different format.');
      setFile(null);
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const handleEvaluate = async () => {
    if (!textContent.trim()) {
      toast.error('Please upload a document or paste text first');
      return;
    }

    setIsEvaluating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to use AI Case Evaluator');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-document-case-evaluator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            document_text: textContent,
            file_name: file?.name || 'pasted-text',
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Evaluation failed' }));
        toast.error(err.error || 'AI evaluation failed');
        return;
      }

      const data: DocumentEvaluation = await response.json();
      setEvaluation(data);
      toast.success('Case evaluation complete');
    } catch (err) {
      console.error('Evaluation error:', err);
      toast.error('Failed to evaluate document');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setTextContent('');
    setEvaluation(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" />
              {evaluatorTitle}
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload a {evaluatorSubject} document to get AI-powered viability analysis, value estimates, and expert insights
            </p>
          </div>
          <Badge variant="outline" className="gap-1 text-xs border-accent text-accent">
            <Shield className="h-3 w-3" /> ABA 512 | GDPR | EU AI Act
          </Badge>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" /> Upload Case Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!file ? (
              <label className="flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="font-medium">Click to upload a case document</p>
                  <p className="text-sm text-muted-foreground mt-1">Supports .docx, .txt files</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".docx,.txt,.pdf"
                  onChange={handleFileDrop}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB | {textContent.length.toLocaleString()} characters extracted
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleClear}>Change File</Button>
              </div>
            )}

            {isExtracting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting text from document...
              </div>
            )}

            {/* Or paste text directly */}
            {!file && (
              <>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex-1 border-t" />
                  <span>or paste case details</span>
                  <div className="flex-1 border-t" />
                </div>
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste case information, medical records summary, incident details, etc..."
                  className="min-h-[150px]"
                />
              </>
            )}

            {/* Evaluate Button */}
            <div className="flex gap-3">
              <Button
                onClick={handleEvaluate}
                disabled={isEvaluating || !textContent.trim()}
                className="gap-2"
                size="lg"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Evaluating Case...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Evaluate Case
                  </>
                )}
              </Button>
              {textContent && (
                <Button variant="outline" onClick={handleClear}>Clear</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Results */}
        {evaluation && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Case Summary */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <h5 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                  <Scale className="h-4 w-4 text-primary" /> Case Summary
                </h5>
                <p className="text-sm">{evaluation.case_summary}</p>
                <div className="flex gap-2 mt-3">
                  <Badge>{evaluation.tort_type}</Badge>
                  <Badge variant="outline">{evaluation.jurisdiction}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Viability Score */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Case Viability</span>
                  <span className="text-2xl font-bold">{evaluation.viability_score}%</span>
                </div>
                <Progress value={evaluation.viability_score} className="h-3" />
              </CardContent>
            </Card>

            {/* Settlement Estimates */}
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="pt-4">
                <h5 className="text-sm font-semibold mb-2">Settlement Estimate Range</h5>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">Low</span>
                    <p className="text-lg font-bold">{formatCurrency(evaluation.settlement_estimate_low)}</p>
                  </div>
                  <span className="text-muted-foreground">—</span>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">High</span>
                    <p className="text-lg font-bold">{formatCurrency(evaluation.settlement_estimate_high)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Evidence */}
            {evaluation.key_evidence?.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <h5 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                    <Search className="h-3.5 w-3.5 text-primary" /> Key Evidence Identified
                  </h5>
                  <ul className="space-y-1.5">
                    {evaluation.key_evidence.map((e, i) => (
                      <li key={i} className="text-sm flex items-start gap-1.5">
                        <span className="text-primary mt-1">•</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <h5 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                    <CheckCircle className="h-3.5 w-3.5 text-accent" /> Strengths
                  </h5>
                  <ul className="space-y-1.5">
                    {evaluation.strengths?.map((s, i) => (
                      <li key={i} className="text-sm flex items-start gap-1.5">
                        <span className="text-accent mt-1">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <h5 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                    <XCircle className="h-3.5 w-3.5 text-destructive" /> Weaknesses
                  </h5>
                  <ul className="space-y-1.5">
                    {evaluation.weaknesses?.map((w, i) => (
                      <li key={i} className="text-sm flex items-start gap-1.5">
                        <span className="text-destructive mt-1">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Missing Information */}
            {evaluation.missing_information?.length > 0 && (
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="pt-4">
                  <h5 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Missing Information
                  </h5>
                  <ul className="space-y-1.5">
                    {evaluation.missing_information.map((m, i) => (
                      <li key={i} className="text-sm flex items-start gap-1.5">
                        <span className="text-warning mt-1">•</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card>
              <CardContent className="pt-4">
                <h5 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                  <Lightbulb className="h-3.5 w-3.5 text-warning" /> Recommendations
                </h5>
                <ul className="space-y-1.5">
                  {evaluation.recommendations?.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 mt-0.5 shrink-0">{i + 1}</Badge>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Legal Details */}
            <div className="space-y-3">
              {evaluation.jurisdiction_notes && (
                <Card>
                  <CardContent className="pt-3 pb-3">
                    <h5 className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                      <MapPin className="h-3 w-3" /> Jurisdiction Notes
                    </h5>
                    <p className="text-sm text-muted-foreground">{evaluation.jurisdiction_notes}</p>
                  </CardContent>
                </Card>
              )}
              {evaluation.statute_of_limitations && (
                <Card>
                  <CardContent className="pt-3 pb-3">
                    <h5 className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                      <Clock className="h-3 w-3" /> Statute of Limitations
                    </h5>
                    <p className="text-sm text-muted-foreground">{evaluation.statute_of_limitations}</p>
                  </CardContent>
                </Card>
              )}
              {evaluation.similar_cases_summary && (
                <Card>
                  <CardContent className="pt-3 pb-3">
                    <h5 className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                      <BookOpen className="h-3 w-3" /> Similar Cases
                    </h5>
                    <p className="text-sm text-muted-foreground">{evaluation.similar_cases_summary}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
