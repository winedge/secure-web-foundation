import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CSVUpload } from '@/components/admin/CSVUpload';
import { 
  Upload, 
  Globe, 
  Phone, 
  Database,
  Webhook,
  Copy,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AdminDataIngestion() {
  const [copied, setCopied] = useState<string | null>(null);

  const { data: sources } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_sources')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['ingestion-stats'],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('source_id, created_at');
      
      if (error) throw error;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayCount = leads?.filter(l => new Date(l.created_at) >= today).length || 0;
      const thisWeek = new Date(today);
      thisWeek.setDate(thisWeek.getDate() - 7);
      const weekCount = leads?.filter(l => new Date(l.created_at) >= thisWeek).length || 0;
      
      return {
        total: leads?.length || 0,
        today: todayCount,
        thisWeek: weekCount,
      };
    },
  });

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-handler`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'csv_upload':
        return <Upload className="h-5 w-5" />;
      case 'google_ads':
      case 'meta_ads':
        return <Globe className="h-5 w-5" />;
      case 'dialer':
        return <Phone className="h-5 w-5" />;
      case 'crm':
        return <Database className="h-5 w-5" />;
      default:
        return <Database className="h-5 w-5" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Ingestion</h1>
          <p className="text-muted-foreground mt-1">
            Import leads from various sources and configure integrations
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-sm text-muted-foreground">Total Leads Ingested</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{stats?.today || 0}</div>
              <p className="text-sm text-muted-foreground">Ingested Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats?.thisWeek || 0}</div>
              <p className="text-sm text-muted-foreground">This Week</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="csv" className="space-y-6">
          <TabsList>
            <TabsTrigger value="csv">CSV Upload</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="sources">Lead Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="csv">
            <CSVUpload />
          </TabsContent>

          <TabsContent value="webhooks">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhook Configuration
                  </CardTitle>
                  <CardDescription>
                    Use these webhook endpoints to integrate with your dialer, CRM, or other systems
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium mb-2">Webhook URL</p>
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <code className="text-sm flex-1 truncate">{webhookUrl}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                        >
                          {copied === 'webhook' ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Call Dispositions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs overflow-auto p-2 bg-background rounded">
{`POST /webhook-handler
{
  "type": "call_disposition",
  "external_id": "lead-123",
  "outcome": "connected",
  "duration_seconds": 180,
  "notes": "Interested in case"
}`}
                          </pre>
                        </CardContent>
                      </Card>

                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Status Updates</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs overflow-auto p-2 bg-background rounded">
{`POST /webhook-handler
{
  "type": "status_update",
  "lead_id": "uuid",
  "new_status": "qualified",
  "previous_status": "contacted",
  "reason": "Met criteria"
}`}
                          </pre>
                        </CardContent>
                      </Card>

                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs overflow-auto p-2 bg-background rounded">
{`POST /webhook-handler
{
  "type": "note",
  "lead_id": "uuid",
  "title": "Follow-up call",
  "content": "Discussed case details"
}`}
                          </pre>
                        </CardContent>
                      </Card>

                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">CRM Sync</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs overflow-auto p-2 bg-background rounded">
{`POST /webhook-handler
{
  "type": "crm_sync",
  "action": "update",
  "entity_type": "lead",
  "external_id": "crm-123",
  "data": { ... }
}`}
                          </pre>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sources">
            <Card>
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
                <CardDescription>
                  Configure and monitor lead sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sources?.map((source) => (
                    <Card key={source.id} className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            {getSourceIcon(source.source_type)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{source.name}</p>
                            <p className="text-sm text-muted-foreground">{source.description}</p>
                            <Badge 
                              variant={source.is_active ? 'default' : 'secondary'}
                              className="mt-2"
                            >
                              {source.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
