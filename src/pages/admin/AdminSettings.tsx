import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useAdminSetting, useUpsertAdminSetting } from '@/hooks/use-admin-settings';
import { supabase } from '@/integrations/supabase/client';
import {
  Settings, Bot, Globe, Shield, CheckCircle, XCircle, Loader2, Eye, EyeOff,
} from 'lucide-react';

export default function AdminSettings() {
  const { toast } = useToast();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">Configure platform-wide integrations and AI</p>
        </div>

        <Tabs defaultValue="meta-api" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="meta-api" className="gap-2">
              <Globe className="h-4 w-4" />
              Meta API
            </TabsTrigger>
            <TabsTrigger value="ai-config" className="gap-2">
              <Bot className="h-4 w-4" />
              AI Config
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meta-api"><MetaApiConfig /></TabsContent>
          <TabsContent value="ai-config"><AiConfiguration /></TabsContent>
          <TabsContent value="security"><SecurityConfig /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function MetaApiConfig() {
  const { data: appIdSetting } = useAdminSetting('meta_app_id');
  const { data: appSecretSetting } = useAdminSetting('meta_app_secret');
  const upsert = useUpsertAdminSetting();
  const { toast } = useToast();

  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; error?: string } | null>(null);

  const isConfigured = !!appIdSetting?.value?.app_id && !!appSecretSetting?.value?.app_secret;

  const handleSave = async () => {
    if (!appId.trim() || !appSecret.trim()) {
      toast({ title: 'Error', description: 'Both App ID and App Secret are required', variant: 'destructive' });
      return;
    }

    await upsert.mutateAsync({
      key: 'meta_app_id',
      value: { app_id: appId.trim() },
      description: 'Meta (Facebook) App ID for OAuth and API access',
    });
    await upsert.mutateAsync({
      key: 'meta_app_secret',
      value: { app_secret: appSecret.trim() },
      description: 'Meta (Facebook) App Secret',
    });

    setAppId('');
    setAppSecret('');
    setVerificationResult(null);
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-oauth', {
        body: { action: 'verify_admin_credentials' },
      });
      if (error) throw error;
      setVerificationResult(data);
      toast({
        title: data.valid ? 'Credentials verified!' : 'Verification failed',
        description: data.valid ? 'Meta API connection is working.' : data.error,
        variant: data.valid ? 'default' : 'destructive',
      });
    } catch (e: any) {
      setVerificationResult({ valid: false, error: e.message });
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Meta API Configuration
          </CardTitle>
          <CardDescription>
            Configure Meta (Facebook/Instagram) API credentials for campaign management and social posting.
            Users will use these credentials to connect their Facebook Business accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
            {isConfigured ? (
              <>
                <CheckCircle className="h-5 w-5 text-accent" />
                <div>
                  <p className="font-medium">Meta API Configured</p>
                  <p className="text-sm text-muted-foreground">
                    App ID: {appIdSetting?.value?.app_id?.slice(0, 6)}***
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto">Active</Badge>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium">Not Configured</p>
                  <p className="text-sm text-muted-foreground">Enter your Meta App credentials below</p>
                </div>
              </>
            )}
          </div>

          {/* Credentials form */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meta-app-id">Meta App ID</Label>
              <Input
                id="meta-app-id"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder={isConfigured ? '••••••••' : 'Enter App ID'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-app-secret">Meta App Secret</Label>
              <div className="relative">
                <Input
                  id="meta-app-secret"
                  type={showSecret ? 'text' : 'password'}
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={isConfigured ? '••••••••' : 'Enter App Secret'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Credentials
            </Button>
            {isConfigured && (
              <Button variant="outline" onClick={handleVerify} disabled={verifying}>
                {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Verify Connection
              </Button>
            )}
          </div>

          {verificationResult && (
            <div className={`p-4 rounded-lg border ${verificationResult.valid ? 'bg-accent/10 border-accent' : 'bg-destructive/10 border-destructive'}`}>
              <p className="font-medium flex items-center gap-2">
                {verificationResult.valid ? (
                  <><CheckCircle className="h-4 w-4 text-accent" /> Connection Verified</>
                ) : (
                  <><XCircle className="h-4 w-4 text-destructive" /> Verification Failed</>
                )}
              </p>
              {verificationResult.error && (
                <p className="text-sm mt-1 text-muted-foreground">{verificationResult.error}</p>
              )}
            </div>
          )}

          {/* Setup guide */}
          <div className="border-t pt-6">
            <h4 className="font-medium mb-3">Setup Guide</h4>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Go to <strong>developers.facebook.com</strong> and create a new App</li>
              <li>Select <strong>"Business"</strong> as the app type</li>
              <li>Add <strong>Facebook Login</strong>, <strong>Marketing API</strong>, and <strong>Instagram Graph API</strong> products</li>
              <li>Copy the <strong>App ID</strong> and <strong>App Secret</strong> from App Settings → Basic</li>
              <li>Add your redirect URI: <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{window.location.origin}/settings?tab=connections&callback=meta</code></li>
              <li>Submit your app for review with required permissions</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AiConfiguration() {
  const { data: aiSetting } = useAdminSetting('ai_configuration');
  const upsert = useUpsertAdminSetting();

  const config = aiSetting?.value || {};
  const [model, setModel] = useState(config.model || 'google/gemini-3-flash-preview');
  const [creativity, setCreativity] = useState(config.creativity_level || 0.7);
  const [brandVoice, setBrandVoice] = useState(config.brand_voice || 'Professional and authoritative');
  const [guidelines, setGuidelines] = useState(config.content_guidelines || '');
  const [autoOptimize, setAutoOptimize] = useState(config.auto_optimize_budgets ?? true);
  const [optimizeInterval, setOptimizeInterval] = useState(config.optimize_interval_hours || 6);
  const [minConfidence, setMinConfidence] = useState(config.min_reallocation_confidence || 0.7);
  const [plagiarismThreshold, setPlagiarismThreshold] = useState(config.plagiarism_threshold || 30);

  const handleSave = () => {
    upsert.mutate({
      key: 'ai_configuration',
      value: {
        model,
        creativity_level: creativity,
        brand_voice: brandVoice,
        content_guidelines: guidelines,
        auto_optimize_budgets: autoOptimize,
        optimize_interval_hours: optimizeInterval,
        min_reallocation_confidence: minConfidence,
        plagiarism_threshold: plagiarismThreshold,
      },
      description: 'AI configuration for content generation and campaign optimization',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Model Configuration
          </CardTitle>
          <CardDescription>Configure the AI engine that powers content generation, campaign optimization, and ad management for all users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>AI Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash (Fast)</SelectItem>
                  <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (Balanced)</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (Best)</SelectItem>
                  <SelectItem value="openai/gpt-5-mini">GPT-5 Mini (Fast)</SelectItem>
                  <SelectItem value="openai/gpt-5">GPT-5 (Best)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Creativity Level: {(creativity * 100).toFixed(0)}%</Label>
              <Slider
                value={[creativity]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => setCreativity(v)}
              />
              <p className="text-xs text-muted-foreground">Lower = more factual, Higher = more creative</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Brand Voice</Label>
            <Input
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              placeholder="e.g., Professional and authoritative, yet empathetic"
            />
            <p className="text-xs text-muted-foreground">Describes the tone AI should use for all generated content</p>
          </div>

          <div className="space-y-2">
            <Label>Content Guidelines</Label>
            <Textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              placeholder="e.g., Always include a disclaimer. Never make guarantees about case outcomes. Use inclusive language..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget Optimization</CardTitle>
          <CardDescription>Configure how AI manages ad budgets automatically</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Optimize Budgets</Label>
              <p className="text-sm text-muted-foreground">AI automatically reallocates budgets between ad sets</p>
            </div>
            <Switch checked={autoOptimize} onCheckedChange={setAutoOptimize} />
          </div>

          {autoOptimize && (
            <div className="grid gap-6 sm:grid-cols-2 pl-4 border-l-2 border-accent/30">
              <div className="space-y-2">
                <Label>Optimization Interval (hours): {optimizeInterval}h</Label>
                <Slider
                  value={[optimizeInterval]}
                  min={1}
                  max={24}
                  step={1}
                  onValueChange={([v]) => setOptimizeInterval(v)}
                />
              </div>
              <div className="space-y-2">
                <Label>Min. Confidence Threshold: {(minConfidence * 100).toFixed(0)}%</Label>
                <Slider
                  value={[minConfidence]}
                  min={0.3}
                  max={1}
                  step={0.05}
                  onValueChange={([v]) => setMinConfidence(v)}
                />
                <p className="text-xs text-muted-foreground">AI won't reallocate unless confidence exceeds this</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Safety</CardTitle>
          <CardDescription>Plagiarism and compliance settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Plagiarism Threshold: {plagiarismThreshold}%</Label>
            <Slider
              value={[plagiarismThreshold]}
              min={10}
              max={80}
              step={5}
              onValueChange={([v]) => setPlagiarismThreshold(v)}
            />
            <p className="text-xs text-muted-foreground">Content above this score will be flagged for review</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={upsert.isPending} size="lg">
        {upsert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save AI Configuration
      </Button>
    </div>
  );
}

function SecurityConfig() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security & Compliance</CardTitle>
        <CardDescription>Data handling and privacy settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Encrypt Access Tokens</Label>
            <p className="text-sm text-muted-foreground">Encrypt OAuth tokens at rest (recommended)</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Auto-Revoke Expired Tokens</Label>
            <p className="text-sm text-muted-foreground">Automatically revoke tokens past expiration</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Audit All API Calls</Label>
            <p className="text-sm text-muted-foreground">Log all external API calls for compliance</p>
          </div>
          <Switch defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
}
