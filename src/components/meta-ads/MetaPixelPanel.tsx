import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Activity, CheckCircle, XCircle, RefreshCw, Loader2, Wifi, WifiOff,
  Clock, Zap, Eye, MousePointer, ShoppingCart, UserPlus, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { initMetaPixel } from '@/hooks/use-meta-pixel';

interface PixelInfo {
  id: string;
  name: string;
  is_active: boolean;
  last_fired_time?: string;
  creation_time?: string;
}

interface PixelEvent {
  event: string;
  count: number;
}

export function MetaPixelPanel() {
  const { user } = useAuth();
  const [pixels, setPixels] = useState<PixelInfo[]>([]);
  const [selectedPixel, setSelectedPixel] = useState<PixelInfo | null>(null);
  const [events, setEvents] = useState<PixelEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [manualPixelId, setManualPixelId] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadPixels = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: { action: 'verify_pixel', user_id: user.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPixels(data.pixels || []);
      setHasLoaded(true);
      toast.success(`Found ${data.count || 0} pixel(s)`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load pixels');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPixel = async (pixelId: string) => {
    if (!user) return;
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: { action: 'verify_pixel', user_id: user.id, pixel_id: pixelId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSelectedPixel(data.pixel);
      setEvents(data.recent_events || []);
      toast.success(`Pixel status: ${data.status}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify pixel');
    } finally {
      setIsVerifying(false);
    }
  };

  const activatePixelLocally = () => {
    const pixelId = selectedPixel?.id || manualPixelId;
    if (!pixelId) return toast.error('Enter a Pixel ID first');
    initMetaPixel(pixelId);
    toast.success(`Pixel ${pixelId} activated on this page`);
  };

  const stageEvents = [
    { name: 'PageView', icon: <Globe className="h-4 w-4" />, desc: 'Tracks every page load', stage: 1 },
    { name: 'ViewContent', icon: <Eye className="h-4 w-4" />, desc: 'Lead/campaign detail views', stage: 2 },
    { name: 'Lead', icon: <UserPlus className="h-4 w-4" />, desc: 'Intake form submissions', stage: 3 },
    { name: 'CompleteRegistration', icon: <CheckCircle className="h-4 w-4" />, desc: 'Firm signup completed', stage: 4 },
    { name: 'Purchase', icon: <ShoppingCart className="h-4 w-4" />, desc: 'Lead purchased from marketplace', stage: 5 },
    { name: 'InitiateCheckout', icon: <MousePointer className="h-4 w-4" />, desc: 'Subscription checkout started', stage: 6 },
  ];

  const customEvents = [
    { name: 'LaunchCampaign', desc: 'Meta campaign launched' },
    { name: 'AudienceBuilt', desc: 'Lookalike audience generated' },
    { name: 'CreativeGenerated', desc: 'AI creative variant created' },
    { name: 'GeofenceDesigned', desc: 'Geofence campaign designed' },
    { name: 'CrossPlatformOptimized', desc: 'Cross-platform budget optimized' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Meta Pixel Integration</h2>
          <p className="text-sm text-muted-foreground">Verify pixel status, view events, and manage tracking</p>
        </div>
        <Button onClick={loadPixels} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {hasLoaded ? 'Refresh' : 'Load Pixels'}
        </Button>
      </div>

      {/* Pixel List */}
      {hasLoaded && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pixels.map(p => (
            <Card
              key={p.id}
              className={cn('cursor-pointer hover:shadow-md transition-shadow', selectedPixel?.id === p.id && 'ring-2 ring-primary')}
              onClick={() => verifyPixel(p.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                  {p.is_active ? (
                    <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950">
                      <Wifi className="h-3 w-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-destructive">
                      <WifiOff className="h-3 w-3" /> Inactive
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground font-mono">{p.id}</p>
                {p.last_fired_time && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Last fired: {new Date(Number(p.last_fired_time) * 1000).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {pixels.length === 0 && (
            <Card className="col-span-full py-8">
              <CardContent className="text-center">
                <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">No pixels found</p>
                <p className="text-sm text-muted-foreground">Connect your Facebook account or enter a Pixel ID manually below.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Manual Pixel ID */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Manual Pixel Setup</CardTitle></CardHeader>
        <CardContent className="flex gap-3 items-end">
          <div className="flex-1">
            <Label className="text-xs">Meta Pixel ID</Label>
            <Input
              placeholder="Enter your Pixel ID (e.g. 123456789)"
              value={manualPixelId}
              onChange={e => setManualPixelId(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => manualPixelId && verifyPixel(manualPixelId)} disabled={isVerifying || !manualPixelId}>
            {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
          </Button>
          <Button onClick={activatePixelLocally} disabled={!manualPixelId && !selectedPixel}>
            <Zap className="h-4 w-4 mr-1" /> Activate
          </Button>
        </CardContent>
      </Card>

      {/* Selected Pixel Details */}
      {selectedPixel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Pixel Details: {selectedPixel.name}</CardTitle>
              <Badge className={selectedPixel.is_active ? 'bg-emerald-500' : 'bg-destructive'}>
                {selectedPixel.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">ID</span><p className="font-mono">{selectedPixel.id}</p></div>
              <div><span className="text-muted-foreground">Last Fired</span><p>{selectedPixel.last_fired_time ? new Date(Number(selectedPixel.last_fired_time) * 1000).toLocaleString() : 'Never'}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Stage-wise Event Tracking Map */}
      <div>
        <h3 className="font-semibold mb-3">Stage-wise Pixel Event Tracking</h3>
        <p className="text-sm text-muted-foreground mb-4">Events automatically tracked across your platform at each stage of the user journey.</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {stageEvents.map(ev => (
            <Card key={ev.name} className="border">
              <CardContent className="pt-4 pb-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">{ev.icon}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{ev.name}</span>
                    <Badge variant="secondary" className="text-xs">Stage {ev.stage}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{ev.desc}</p>
                </div>
                <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto flex-shrink-0 mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Events */}
      <div>
        <h3 className="font-semibold mb-3">Custom Ad Tool Events</h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {customEvents.map(ev => (
            <Card key={ev.name} className="border">
              <CardContent className="pt-3 pb-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">{ev.name}</span>
                  <p className="text-xs text-muted-foreground">{ev.desc}</p>
                </div>
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
