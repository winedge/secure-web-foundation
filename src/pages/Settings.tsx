import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Building, User, Bell, Shield, Link2, Facebook, Instagram, Linkedin, Twitter, Video, CheckCircle, XCircle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
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
import { usePlatformConnections, useConnectMetaPlatform, useExchangeMetaToken, useVerifyMetaConnection, useDisconnectPlatform } from '@/hooks/use-platform-connections';
import { useSearchParams } from 'react-router-dom';

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
  const [notifications, setNotifications] = useState({
    emailNewLeads: true,
    emailPurchases: true,
    emailReports: false,
  });

  // Determine default tab from URL
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam === 'connections' ? 'connections' : 'profile';

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
          <TabsList className="grid w-full max-w-xl grid-cols-3 sm:grid-cols-5">
            <TabsTrigger value="profile" className="gap-1 sm:gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
              <span className="sm:hidden">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="firm" className="gap-1 sm:gap-2">
              <Building className="h-4 w-4" />
              <span>Firm</span>
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
                                    {metaVerification.connected ? '✓ Token verified and active' : '✗ Token expired — please reconnect'}
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
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Change Password</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Update your password to keep your account secure
                    </p>
                    <Button variant="outline">Change Password</Button>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Add an extra layer of security to your account
                    </p>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-destructive">Danger Zone</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Permanently delete your account and all associated data
                    </p>
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
