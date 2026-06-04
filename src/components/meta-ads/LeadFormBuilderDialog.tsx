import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, FileText } from 'lucide-react';
import { useCreateLeadForm, LeadFormQuestion } from '@/hooks/use-meta-extras';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pages: Array<{ meta_page_id: string; name: string; page_access_token: string }>;
}

const QUESTION_TYPES = [
  { value: 'FULL_NAME', label: 'Full name' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'STREET_ADDRESS', label: 'Street address' },
  { value: 'CITY', label: 'City' },
  { value: 'STATE', label: 'State' },
  { value: 'ZIP', label: 'ZIP code' },
  { value: 'COUNTRY', label: 'Country' },
  { value: 'DATE_OF_BIRTH', label: 'Date of birth' },
  { value: 'CUSTOM', label: 'Custom short answer' },
  { value: 'CUSTOM_MULTIPLE_CHOICE', label: 'Custom multiple choice' },
];

export function LeadFormBuilderDialog({ open, onOpenChange, pages }: Props) {
  const create = useCreateLeadForm();
  const [pageId, setPageId] = useState('');
  const [name, setName] = useState('');
  const [formType, setFormType] = useState<'MORE_VOLUME' | 'HIGHER_INTENT' | 'RICH_CREATIVE'>('MORE_VOLUME');
  const [introTitle, setIntroTitle] = useState('');
  const [introContent, setIntroContent] = useState('');
  const [privacyUrl, setPrivacyUrl] = useState('');
  const [followUpUrl, setFollowUpUrl] = useState('');
  const [tyTitle, setTyTitle] = useState('Thanks!');
  const [tyBody, setTyBody] = useState("We'll be in touch shortly.");
  const [tyButtonText, setTyButtonText] = useState('View website');
  const [questions, setQuestions] = useState<LeadFormQuestion[]>([
    { type: 'FULL_NAME' }, { type: 'EMAIL' }, { type: 'PHONE' },
  ]);
  const [customQ, setCustomQ] = useState('');
  const [customQOptions, setCustomQOptions] = useState('');

  const selectedPage = pages.find((p) => p.meta_page_id === pageId);

  const addQuestion = (type: string) => {
    if (type === 'CUSTOM' || type === 'CUSTOM_MULTIPLE_CHOICE') {
      if (!customQ.trim()) return;
      const q: LeadFormQuestion = { type, label: customQ, key: customQ.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40) };
      if (type === 'CUSTOM_MULTIPLE_CHOICE') {
        q.options = customQOptions.split(',').map((s) => s.trim()).filter(Boolean).map((v) => ({ value: v, key: v.toLowerCase().replace(/\s+/g, '_') }));
        if (!q.options.length) return;
      }
      setQuestions([...questions, q]);
      setCustomQ(''); setCustomQOptions('');
    } else {
      if (questions.some((q) => q.type === type)) return;
      setQuestions([...questions, { type }]);
    }
  };

  const removeQuestion = (i: number) => setQuestions(questions.filter((_, x) => x !== i));

  const canSubmit = pageId && name && privacyUrl && questions.length > 0 && !create.isPending;

  const handleSubmit = () => {
    if (!selectedPage) return;
    create.mutate({
      meta_page_id: selectedPage.meta_page_id,
      page_access_token: selectedPage.page_access_token,
      name, form_type: formType,
      questions,
      privacy_policy_url: privacyUrl,
      follow_up_action_url: followUpUrl || undefined,
      intro: introTitle ? { title: introTitle, content: introContent || '' } : undefined,
      thank_you_screen: {
        title: tyTitle, body: tyBody, button_text: tyButtonText,
        button_type: followUpUrl ? 'VIEW_WEBSITE' : 'NONE',
        website_url: followUpUrl || undefined,
      },
    }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Create Instant Form</DialogTitle>
          <DialogDescription>Build a Meta Lead Ad form. It will be created live on Facebook and synced into your pipeline.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Facebook Page</Label>
              <Select value={pageId} onValueChange={setPageId}>
                <SelectTrigger><SelectValue placeholder={pages.length ? 'Select page' : 'No pages connected'} /></SelectTrigger>
                <SelectContent>
                  {pages.map((p) => <SelectItem key={p.meta_page_id} value={p.meta_page_id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Form type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MORE_VOLUME">More volume (fastest)</SelectItem>
                  <SelectItem value="HIGHER_INTENT">Higher intent (review step)</SelectItem>
                  <SelectItem value="RICH_CREATIVE">Rich creative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div><Label>Form name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Roundup intake | FL" /></div>

          <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Intro screen (optional)</div>
            <Input value={introTitle} onChange={(e) => setIntroTitle(e.target.value)} placeholder="Intro headline" />
            <Textarea rows={2} value={introContent} onChange={(e) => setIntroContent(e.target.value)} placeholder="Intro body | What the user will get" />
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Questions</div>
            <div className="space-y-1">
              {questions.map((q, i) => (
                <div key={i} className="flex items-center justify-between rounded border bg-background px-2 py-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-[10px]">{q.type}</Badge>
                    <span>{q.label || QUESTION_TYPES.find((t) => t.value === q.type)?.label || q.type}</span>
                    {q.options?.length ? <span className="text-xs text-muted-foreground">| {q.options.length} options</span> : null}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeQuestion(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Select onValueChange={addQuestion}>
                <SelectTrigger><SelectValue placeholder="Add standard question" /></SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.filter((t) => !t.value.startsWith('CUSTOM')).map((t) => (
                    <SelectItem key={t.value} value={t.value} disabled={questions.some((q) => q.type === t.value)}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded border border-dashed p-2">
              <Label className="text-xs">Custom question</Label>
              <Input value={customQ} onChange={(e) => setCustomQ(e.target.value)} placeholder="Question text" />
              <Input value={customQOptions} onChange={(e) => setCustomQOptions(e.target.value)} placeholder="Multiple choice options (comma separated, optional)" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => addQuestion('CUSTOM')} disabled={!customQ}>
                  <Plus className="h-3 w-3 mr-1" /> Add short answer
                </Button>
                <Button size="sm" variant="outline" onClick={() => addQuestion('CUSTOM_MULTIPLE_CHOICE')} disabled={!customQ || !customQOptions}>
                  <Plus className="h-3 w-3 mr-1" /> Add multiple choice
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Privacy policy URL *</Label><Input value={privacyUrl} onChange={(e) => setPrivacyUrl(e.target.value)} placeholder="https://yourfirm.com/privacy" /></div>
            <div><Label>Thank-you website (optional)</Label><Input value={followUpUrl} onChange={(e) => setFollowUpUrl(e.target.value)} placeholder="https://yourfirm.com/thanks" /></div>
          </div>

          <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thank-you screen</div>
            <Input value={tyTitle} onChange={(e) => setTyTitle(e.target.value)} placeholder="Title" />
            <Textarea rows={2} value={tyBody} onChange={(e) => setTyBody(e.target.value)} placeholder="Body" />
            <Input value={tyButtonText} onChange={(e) => setTyButtonText(e.target.value)} placeholder="Button text" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create on Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
