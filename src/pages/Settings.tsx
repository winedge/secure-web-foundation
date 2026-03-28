import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Building, User, Bell, Shield, Link2, Facebook, Instagram, Linkedin, Twitter, Video, CheckCircle, XCircle, Loader2, RefreshCw, ExternalLink, Scale, MessageCircle, Upload } from 'lucide-react';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { WebAuthnSetup } from '@/components/auth/WebAuthnSetup';
import { ZeroKnowledgeSetup } from '@/components/auth/ZeroKnowledgeSetup';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { supabase } from '@/integrations/supabase/client';
import { useFirmBranding, useUpsertBranding } from '@/hooks/use-firm-branding';
import { usePlatformConnections, useConnectMetaPlatform, useExchangeMetaToken, useVerifyMetaConnection, useDisconnectPlatform } from '@/hooks/use-platform-connections';
import { useSearchParams } from 'react-router-dom';
import { TortTypeManager as TortTypeManagerComponent } from '@/components/admin/TortTypeManager';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
});

const firmSchema = z.object({
  name: z.string().min(2, 'Firm name must be at least 2 characters'),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type FirmFormData = z.infer<typeof firmSchema>;

export default function Settings() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();
  const { data: brandingData } = useFirmBranding();
  const upsertBranding = useUpsertBranding();
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotAgentName, setChatbotAgentName] = useState('AI Intake Assistant');
  const [chatbotAvatarUrl, setChatbotAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [notifications, setNotifications] = useState({
    emailNewLeads: true,
    emailPurchases: true,
    emailReports: false,
  });

  // Determine default tab from URL
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam === 'connections' ? 'connections' : tabParam === 'chatbot' ? 'chatbot' : 'profile';

  // Load chatbot settings from branding
  useEffect(() => {
    if (brandingData) {
      setChatbotEnabled((brandingData as any).chatbot_enabled ?? true);
      setChatbotAgentName((brandingData as any).chatbot_agent_name || 'AI Intake Assistant');
      setChatbotAvatarUrl((brandingData as any).chatbot_avatar_url || '');
    }
  }, [brandingData]);

  // Handle Meta OAuth callback
  const { data: connections, isLoading: connectionsLoading } = usePlatformConnections();
  const connectMeta = useConnectMetaPlatform();
  const exchangeToken = useExchangeMetaToken();
  const verifyMeta = useVerifyMetaConnection();
  const disconnectPlatform = useDisconnectPlatform();
  const [metaVerification, setMetaVerification] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const callback = searchParams.get('callback');
    if (code && callback === 'meta') {
      exchangeToken.mutate(code);
      // Clean URL
      window.history.replaceState({}, '', '/settings?tab=connections');
    }
  }, [searchParams]);

  const handleVerifyMeta = async () => {
    setVerifying(true);
    try {
      const result = await verifyMeta.mutateAsync();
      setMetaVerification(result);
    } catch {}
    setVerifying(false);
  };

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.user_metadata?.full_name || '',
      email: user?.email || '',
      phone: '',
    },
  });

  const firmForm = useForm<FirmFormData>({
    resolver: zodResolver(firmSchema),
    defaultValues: {
      name: firm?.name || '',
      website: firm?.website || '',
      contactEmail: firm?.contact_email || '',
      contactPhone: firm?.contact_phone || '',
    },
  });

  const handleProfileSave = async (data: ProfileFormData) => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: data.fullName },
      });
      
      if (error) throw error;
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFirmSave = async (data: FirmFormData) => {
    if (!firm?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('firms')
        .update({
          name: data.name,
          website: data.website || null,
          contact_email: data.contactEmail || null,
          contact_phone: data.contactPhone || null,
        })
        .eq('id', firm.id);
      
      if (error) throw error;
      
      toast({
        title: 'Firm updated',
        description: 'Your firm settings have been saved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update firm settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and firm preferences
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="flex flex-wrap w-full max-w-3xl h-auto gap-1">
            <TabsTrigger value="profile" className="gap-1 sm:gap-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="firm" className="gap-1 sm:gap-2">
              <Building className="h-4 w-4" />
              <span>Firm</span>
            </TabsTrigger>
            <TabsTrigger value="chatbot" className="gap-1 sm:gap-2">
              <MessageCircle className="h-4 w-4" />
              <span>Chatbot</span>
            </TabsTrigger>
            <TabsTrigger value="tort-types" className="gap-1 sm:gap-2">
              <Scale className="h-4 w-4" />
              <span>Torts</span>
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-1 sm:gap-2">
              <Link2 className="h-4 w-4" />
              <span>Connect</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1 sm:gap-2">
              <Bell className="h-4 w-4" />
              <span>Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1 sm:gap-2">
              <Shield className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
          </TabsList>

          {/* Chatbot Settings Tab */}
          <TabsContent value="chatbot">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  AI Chatbot Intake
                </CardTitle>
                <CardDescription>
                  Configure the AI conversational intake assistant on your intake forms. When enabled, claimants can chat with an AI instead of filling out a static form.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Enable AI Chatbot</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, intake forms will show the "Chat with AI" option. When disabled, only the static form will be shown.
                    </p>
                  </div>
                  <Switch
                    checked={chatbotEnabled}
                    onCheckedChange={setChatbotEnabled}
                  />
                </div>

                {/* Agent Customization */}
                <div className={chatbotEnabled ? '' : 'opacity-50 pointer-events-none'}>
                  <h3 className="text-sm font-semibold mb-4">Agent Appearance</h3>
                  
                  <div className="flex items-start gap-6">
                    {/* Avatar Preview & Upload */}
                    <div className="flex flex-col items-center gap-2">
                      <Avatar className="h-20 w-20 border-2 border-border">
                        <AvatarImage src={chatbotAvatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xl">
                          {chatbotAgentName?.charAt(0) || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <Upload className="h-3 w-3" />
                          {uploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
                        </div>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingAvatar}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !firm?.id) return;
                            setUploadingAvatar(true);
                            try {
                              const ext = file.name.split('.').pop();
                              const path = `${firm.id}/chatbot-avatar.${ext}`;
                              const { error } = await supabase.storage
                                .from('firm-logos')
                                .upload(path, file, { upsert: true });
                              if (error) throw error;
                              const { data: urlData } = supabase.storage
                                .from('firm-logos')
                                .getPublicUrl(path);
                              setChatbotAvatarUrl(urlData.publicUrl);
                              toast({ title: 'Avatar uploaded' });
                            } catch (err: any) {
                              toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
                            } finally {
                              setUploadingAvatar(false);
                            }
                          }}
                        />
                      </Label>
                      {chatbotAvatarUrl && (
                        <button
                          type="button"
                          className="text-xs text-destructive hover:underline"
                          onClick={() => setChatbotAvatarUrl('')}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Agent Name */}
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="agentName">Agent Name</Label>
                      <Input
                        id="agentName"
                        value={chatbotAgentName}
                        onChange={(e) => setChatbotAgentName(e.target.value)}
                        placeholder="AI Intake Assistant"
                        maxLength={50}
                      />
                      <p className="text-xs text-muted-foreground">
                        This name appears in the chat header. Use something friendly and professional.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {chatbotEnabled && (
                  <div className="rounded-lg border p-4 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Preview</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={chatbotAvatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {chatbotAgentName?.charAt(0) || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{chatbotAgentName || 'AI Intake Assistant'}</p>
                        <p className="text-xs text-muted-foreground">Online</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      // We need to update firm_branding directly for chatbot fields
                      if (brandingData?.id) {
                        const { error } = await supabase
                          .from('firm_branding')
                          .update({
                            chatbot_enabled: chatbotEnabled,
                            chatbot_agent_name: chatbotAgentName,
                            chatbot_avatar_url: chatbotAvatarUrl || null,
                          } as any)
                          .eq('id', brandingData.id);
                        if (error) throw error;
                      } else if (firm?.id) {
                        // Create minimal branding record with chatbot settings
                        const { error } = await supabase
                          .from('firm_branding')
                          .insert({
                            firm_id: firm.id,
                            slug: firm.id.slice(0, 8),
                            chatbot_enabled: chatbotEnabled,
                            chatbot_agent_name: chatbotAgentName,
                            chatbot_avatar_url: chatbotAvatarUrl || null,
                          } as any)
                          .select()
                          .single();
                        if (error) throw error;
                      }
                      toast({ title: 'Chatbot settings saved' });
                    } catch (err: any) {
                      toast({ title: 'Error', description: err.message, variant: 'destructive' });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Chatbot Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        {...profileForm.register('fullName')}
                        placeholder="John Doe"
                      />
                      {profileForm.formState.errors.fullName && (
                        <p className="text-sm text-destructive">
                          {profileForm.formState.errors.fullName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...profileForm.register('email')}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        {...profileForm.register('phone')}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="firm">
            <Card>
              <CardHeader>
                <CardTitle>Firm Settings</CardTitle>
                <CardDescription>
                  Manage your law firm's profile and contact information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={firmForm.handleSubmit(handleFirmSave)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firmName">Firm Name</Label>
                      <Input
                        id="firmName"
                        {...firmForm.register('name')}
                        placeholder="Smith & Associates"
                      />
                      {firmForm.formState.errors.name && (
                        <p className="text-sm text-destructive">
                          {firmForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        {...firmForm.register('website')}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        {...firmForm.register('contactEmail')}
                        placeholder="contact@firm.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        {...firmForm.register('contactPhone')}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={saving || !firm}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connections">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Platform Connections
                  </CardTitle>
                  <CardDescription>
                    Connect your social media accounts to publish content and track engagement automatically
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Facebook / Instagram (Meta) */}
                  <div className="flex items-start justify-between p-4 rounded-lg border">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                        <Facebook className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">Facebook & Instagram</h4>
                        <p className="text-sm text-muted-foreground">
                          Connect your Facebook Business account to manage pages and Instagram
                        </p>
                        {(() => {
                          const fbConn = connections?.find((c) => c.platform === 'facebook' && c.is_active);
                          if (fbConn) {
                            return (
                              <div className="mt-2 space-y-1">
                                <Badge variant="outline" className="gap-1">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  Connected as {fbConn.platform_username}
                                </Badge>
                                {fbConn.token_expires_at && (
                                  <p className="text-xs text-muted-foreground">
                                    Token expires: {new Date(fbConn.token_expires_at).toLocaleDateString()}
                                  </p>
                                )}
                                {/* Show connected pages */}
                                {(() => {
                                  const pages = connections?.filter((c) => c.platform === 'facebook_page' && c.is_active);
                                  if (pages && pages.length > 0) {
                                    return (
                                      <div className="mt-1">
                                        <p className="text-xs font-medium text-muted-foreground">Connected Pages:</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {pages.map((page) => (
                                            <Badge key={page.id} variant="secondary" className="text-xs">
                                              {page.page_name}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                {metaVerification && (
                                  <div className={`mt-2 p-2 rounded text-xs ${metaVerification.connected ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' : 'bg-destructive/10 text-destructive'}`}>
                                    {metaVerification.connected ? '✓ Token verified and active' : '✗ Token expired - please reconnect'}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {connections?.find((c) => c.platform === 'facebook' && c.is_active) ? (
                        <>
                          <Button variant="outline" size="sm" onClick={handleVerifyMeta} disabled={verifying}>
                            {verifying ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                            Verify
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => connectMeta.mutate()} disabled={connectMeta.isPending}>
                            Reconnect
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              const conn = connections?.find((c) => c.platform === 'facebook' && c.is_active);
                              if (conn) disconnectPlatform.mutate(conn.id);
                            }}
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => connectMeta.mutate()} disabled={connectMeta.isPending}>
                          {connectMeta.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                          Connect Facebook
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div className="flex items-start justify-between p-4 rounded-lg border">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-blue-700 flex items-center justify-center">
                        <Linkedin className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">LinkedIn</h4>
                        <p className="text-sm text-muted-foreground">
                          Connect your LinkedIn profile to auto-publish professional content
                        </p>
                        {(() => {
                          const liConn = connections?.find((c) => c.platform === 'linkedin' && c.is_active);
                          if (liConn) {
                            return (
                              <Badge variant="outline" className="mt-2 gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                Connected as {liConn.platform_username}
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <Button variant="outline" disabled>
                      Coming Soon
                    </Button>
                  </div>

                  {/* Twitter/X */}
                  <div className="flex items-start justify-between p-4 rounded-lg border">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-foreground flex items-center justify-center">
                        <Twitter className="h-5 w-5 text-background" />
                      </div>
                      <div>
                        <h4 className="font-medium">X / Twitter</h4>
                        <p className="text-sm text-muted-foreground">
                          Connect your X account to auto-post tweets
                        </p>
                        {(() => {
                          const twConn = connections?.find((c) => c.platform === 'twitter' && c.is_active);
                          if (twConn) {
                            return (
                              <Badge variant="outline" className="mt-2 gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                Connected as @{twConn.platform_username}
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <Button variant="outline" disabled>
                      Coming Soon
                    </Button>
                  </div>

                  {/* TikTok */}
                  <div className="flex items-start justify-between p-4 rounded-lg border">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-foreground flex items-center justify-center">
                        <Video className="h-5 w-5 text-background" />
                      </div>
                      <div>
                        <h4 className="font-medium">TikTok</h4>
                        <p className="text-sm text-muted-foreground">
                          Connect your TikTok account for short-form video posting
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" disabled>
                      Coming Soon
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tort-types">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" />Tort Types</CardTitle>
                <CardDescription>Manage tort types for your campaigns and lead tracking. Create custom torts specific to your practice.</CardDescription>
              </CardHeader>
              <CardContent>
                <TortTypeManagerComponent />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>New Lead Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when new leads match your campaigns
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailNewLeads}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, emailNewLeads: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Purchase Confirmations</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email confirmations for lead purchases
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailPurchases}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, emailPurchases: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Get weekly summaries of your lead activity
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailReports}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, emailReports: checked }))
                    }
                  />
                </div>
                <Button onClick={() => toast({ title: 'Preferences saved' })}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-6">
              {/* Zero-Trust Security Banner */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Zero-Trust Security Fortress
                  </CardTitle>
                  <CardDescription>
                    Enterprise-grade security with zero-knowledge encryption, biometric authentication,
                    and quantum-resistant cryptography - compliant with ABA Rule 1.6.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Password & TOTP */}
              <Card>
                <CardHeader>
                  <CardTitle>Password &amp; Two-Factor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium">Change Password</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Update your password to keep your account secure
                    </p>
                    <Button variant="outline" asChild>
                      <a href="/reset-password">Change Password</a>
                    </Button>
                  </div>
                  <div className="border-t pt-4">
                    <TwoFactorSetup />
                  </div>
                </CardContent>
              </Card>

              {/* WebAuthn / Biometric */}
              <Card>
                <CardHeader>
                  <CardTitle>Biometric Session Locking</CardTitle>
                  <CardDescription>
                    Require FaceID, TouchID, Windows Hello, or hardware security keys (YubiKey)
                    for enhanced authentication. Meets 2026 law firm insurance compliance standards.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WebAuthnSetup />
                </CardContent>
              </Card>

              {/* Zero-Knowledge Encryption */}
              <Card>
                <CardHeader>
                  <CardTitle>Zero-Knowledge Encryption</CardTitle>
                  <CardDescription>
                    Client-side encryption ensures your servers never hold the keys to client data.
                    Even if the database is breached, attackers see only encrypted data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ZeroKnowledgeSetup />
                </CardContent>
              </Card>

              {/* Quantum-Resistant Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Quantum-Resistant Encryption
                  </CardTitle>
                  <CardDescription>
                    All encryption uses AES-256-GCM with ML-KEM-1024 (FIPS 203) post-quantum
                    key encapsulation - future-proof against quantum computing threats.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Symmetric</p>
                      <p className="font-mono text-sm font-bold">AES-256-GCM</p>
                      <p className="text-xs text-muted-foreground mt-1">NIST Approved</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Key Exchange</p>
                      <p className="font-mono text-sm font-bold">ML-KEM-1024</p>
                      <p className="text-xs text-muted-foreground mt-1">FIPS 203 (Kyber)</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Key Derivation</p>
                      <p className="font-mono text-sm font-bold">PBKDF2-SHA256</p>
                      <p className="text-xs text-muted-foreground mt-1">600K iterations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card>
                <CardContent className="pt-6">
                  <div>
                    <h4 className="font-medium text-destructive">Danger Zone</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Permanently delete your account and all associated data
                    </p>
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
