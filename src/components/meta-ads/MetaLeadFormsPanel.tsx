import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { Label } from '@/components/ui/label';
import {
  FileText, RefreshCw, Loader2, Download, CheckCircle, Users,
  Calendar, AlertTriangle, Bell, BellRing,
} from 'lucide-react';
import { toast } from 'sonner';
import { useVertical } from '@/hooks/use-vertical';
import { useFirm } from '@/hooks/use-firm';
import { CategorySelect } from '@/components/verticals/CategorySelect';

interface LeadForm {
  id: string;
  name: string;
  status: string;
  leads_count: number;
  expired_leads_count?: number;
  created_time: string;
  page_id: string;
  page_name: string;
  page_access_token: string;
}

export function MetaLeadFormsPanel() {
  const { user } = useAuth();
  const { term } = useVertical();
  const { data: firm } = useFirm();
  const categoryLabel = term('category_label', 'Category');
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingFormId, setFetchingFormId] = useState<string | null>(null);
  const [subscribingPageId, setSubscribingPageId] = useState<string | null>(null);
  const [tortType, setTortType] = useState('General');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [fetchResults, setFetchResults] = useState<Record<string, { total: number; ingested: number }>>({});

  const loadForms = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: { action: 'get_lead_forms', user_id: user.id, firm_id: firm?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setForms(data.forms || []);
      setHasLoaded(true);
      toast.success(`Found ${data.count || 0} lead form(s)`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load lead forms');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFormLeads = async (form: LeadForm) => {
    if (!user) return;
    setFetchingFormId(form.id);
    try {
      const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: {
          action: 'fetch_form_leads',
          user_id: user.id,
          firm_id: firm?.id,
          form_id: form.id,
          page_access_token: form.page_access_token,
          tort_type: tortType,
          category: tortType,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setFetchResults(prev => ({
        ...prev,
        [form.id]: { total: data.total_from_meta, ingested: data.ingested },
      }));
      toast.success(`Imported ${data.ingested} new leads (${data.already_existed} already existed)`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch leads');
    } finally {
      setFetchingFormId(null);
    }
  };

  const subscribeToUpdates = async (form: LeadForm) => {
    if (!user) return;
    setSubscribingPageId(form.page_id);
    try {
      const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: {
          action: 'subscribe_lead_updates',
          user_id: user.id,
          firm_id: firm?.id,
          page_id: form.page_id,
          page_access_token: form.page_access_token,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Subscribed to real-time lead form updates!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to subscribe');
    } finally {
      setSubscribingPageId(null);
    }
  };

  // Group forms by page
  const groupedByPage = forms.reduce<Record<string, LeadForm[]>>((acc, f) => {
    const key = `${f.page_name} (${f.page_id})`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Meta Lead Forms</h2>
          <p className="text-sm text-muted-foreground">
            Import leads from Meta lead form campaigns directly into your pipeline
          </p>
        </div>
        <Button onClick={loadForms} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {hasLoaded ? 'Refresh' : 'Load Forms'}
        </Button>
      </div>

      {/* Default Category Setting */}
      <Card>
        <CardContent className="pt-4 pb-4 flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <Label className="text-xs">Default {categoryLabel} for Imported Leads</Label>
            <CategorySelect
              value={tortType}
              onChange={setTortType}
              placeholder={`Select ${categoryLabel.toLowerCase()}`}
            />
          </div>
          <p className="text-xs text-muted-foreground pb-2">
            This {categoryLabel.toLowerCase()} will be assigned to all leads imported from Meta lead forms.
          </p>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {hasLoaded && forms.length === 0 && !isLoading && (
        <Card className="py-12">
          <CardContent className="text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Lead Forms Found</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Make sure your Facebook account is connected and you have lead generation campaigns
              with lead forms set up in Meta Ads Manager.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Forms grouped by page */}
      {Object.entries(groupedByPage).map(([pageName, pageForms]) => (
        <div key={pageName} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{pageName}</h3>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => subscribeToUpdates(pageForms[0])}
              disabled={subscribingPageId === pageForms[0].page_id}
            >
              {subscribingPageId === pageForms[0].page_id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BellRing className="h-3.5 w-3.5" />
              )}
              Subscribe to Real-time Updates
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {pageForms.map(form => {
              const result = fetchResults[form.id];
              return (
                <Card key={form.id} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">{form.name}</CardTitle>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{form.id}</p>
                      </div>
                      <Badge variant={form.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                        {form.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold">{form.leads_count || 0}</p>
                        <p className="text-xs text-muted-foreground">Total Leads</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{form.expired_leads_count || 0}</p>
                        <p className="text-xs text-muted-foreground">Expired</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                          <Calendar className="h-3 w-3" />
                          {new Date(form.created_time).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Created</p>
                      </div>
                    </div>

                    {result && (
                      <div className="p-2 rounded-lg bg-muted/50 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Found on Meta:</span>
                          <span className="font-medium">{result.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Newly Imported:</span>
                          <span className="font-medium text-emerald-600">{result.ingested}</span>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => fetchFormLeads(form)}
                      disabled={fetchingFormId === form.id}
                      className="w-full gap-2"
                      size="sm"
                    >
                      {fetchingFormId === form.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Import Leads to Platform
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* How It Works */}
      <Card className="border-dashed">
        <CardHeader><CardTitle className="text-sm">How Meta Lead Forms Integration Works</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">1</Badge>
            <p><strong>Load Forms</strong> - Click "Load Forms" to fetch all lead forms from your connected Facebook pages.</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">2</Badge>
            <p><strong>Import Leads</strong> - Click "Import Leads" on any form to pull submissions into your lead pipeline. Duplicates are automatically skipped.</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">3</Badge>
            <p><strong>Real-time Updates</strong> - Subscribe to a page to receive new lead form submissions automatically as they come in via webhook.</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">4</Badge>
            <p><strong>AI Processing</strong> - Imported leads are automatically scored by AI, deduplicated, and placed in your pipeline for review.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
