import { useState, useEffect, useRef } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSocialPosts, useCreateSocialPost, useUpdateSocialPost, useDeleteSocialPost, useSocialContentAI, SocialPost } from '@/hooks/use-social-posts';
import { usePlatformConnections, useConnectMetaPlatform } from '@/hooks/use-platform-connections';
import { supabase } from '@/integrations/supabase/client';
import {
  Calendar, Plus, Bot, Image, Video, Upload, Clock, CheckCircle, XCircle,
  Trash2, Edit, Send, Sparkles, ChevronLeft, ChevronRight, Loader2,
  Facebook, Instagram, Linkedin, Twitter, AlertTriangle, FileText, Wand2, BarChart3,
} from 'lucide-react';

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-500' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-pink-500' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
  { id: 'twitter', label: 'X / Twitter', icon: Twitter, color: 'bg-foreground' },
  { id: 'tiktok', label: 'TikTok', icon: Video, color: 'bg-foreground' },
];

export default function SocialMediaCalendar() {
  const { data: posts, isLoading } = useSocialPosts();
  const createPost = useCreateSocialPost();
  const updatePost = useUpdateSocialPost();
  const deletePost = useDeleteSocialPost();
  const contentAI = useSocialContentAI();
  const { toast } = useToast();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  const getPostsForDay = (day: Date) =>
    posts?.filter((p) => p.scheduled_at && isSameDay(parseISO(p.scheduled_at), day)) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Social Media Calendar</h1>
            <p className="text-muted-foreground">Plan, create, and auto-publish content across all platforms</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
              <Wand2 className="mr-2 h-4 w-4" />
              AI Generate Week
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />New Post</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Social Media Post</DialogTitle>
                </DialogHeader>
                <CreatePostForm
                  initialDate={selectedDate}
                  onCreated={() => setCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="calendar">
          <TabsList>
            <TabsTrigger value="calendar"><Calendar className="mr-2 h-4 w-4" />Calendar</TabsTrigger>
            <TabsTrigger value="list"><FileText className="mr-2 h-4 w-4" />List View</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4">
            {/* Week navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="font-semibold">
                {format(weekDays[0], 'MMM d')} — {format(weekDays[6], 'MMM d, yyyy')}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayPosts = getPostsForDay(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[200px] rounded-lg border p-2 cursor-pointer transition-colors hover:bg-muted/30 ${
                      isToday ? 'border-accent bg-accent/5' : ''
                    }`}
                    onClick={() => {
                      setSelectedDate(day);
                      setCreateDialogOpen(true);
                    }}
                  >
                    <p className={`text-sm font-medium mb-2 ${isToday ? 'text-accent' : 'text-muted-foreground'}`}>
                      {format(day, 'EEE d')}
                    </p>
                    <div className="space-y-1">
                      {dayPosts.map((post) => (
                        <PostCard key={post.id} post={post} compact />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <div className="space-y-3">
              {posts?.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No posts yet</p>
                    <p className="text-sm">Create your first post or let AI generate a content calendar.</p>
                  </CardContent>
                </Card>
              )}
              {posts?.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function PostCard({ post, compact }: { post: SocialPost; compact?: boolean }) {
  const deletePost = useDeleteSocialPost();
  const updatePost = useUpdateSocialPost();
  const { toast } = useToast();
  const [publishing, setPublishing] = useState(false);
  const [fetchingMetrics, setFetchingMetrics] = useState(false);

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    publishing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    published: 'bg-accent/20 text-accent',
    failed: 'bg-destructive/20 text-destructive',
  };

  const handlePublishNow = async () => {
    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('publish-social-post', {
        body: { action: 'publish_now', post_id: post.id },
      });
      if (error) throw error;
      if (data?.errors?.length > 0) {
        toast({ title: 'Partially published', description: data.errors.join('; '), variant: 'destructive' });
      } else {
        toast({ title: 'Post published!' });
      }
    } catch (e: any) {
      toast({ title: 'Publish failed', description: e.message, variant: 'destructive' });
    }
    setPublishing(false);
  };

  const handleFetchMetrics = async () => {
    setFetchingMetrics(true);
    try {
      const { error } = await supabase.functions.invoke('publish-social-post', {
        body: { action: 'fetch_engagement' },
      });
      if (error) throw error;
      toast({ title: 'Metrics updated!' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setFetchingMetrics(false);
  };

  const engagement = post.engagement_metrics as Record<string, any> | null;
  const totalLikes = engagement ? Object.values(engagement).reduce((sum: number, m: any) => sum + (m.likes || 0), 0) : 0;
  const totalComments = engagement ? Object.values(engagement).reduce((sum: number, m: any) => sum + (m.comments || 0), 0) : 0;
  const totalShares = engagement ? Object.values(engagement).reduce((sum: number, m: any) => sum + (m.shares || 0), 0) : 0;

  if (compact) {
    return (
      <div className="text-xs p-1.5 rounded bg-card border shadow-sm">
        <div className="flex gap-1 mb-0.5">
          {post.platforms?.map((p) => {
            const platform = PLATFORMS.find((pl) => pl.id === p);
            if (!platform) return null;
            const Icon = platform.icon;
            return <Icon key={p} className="h-3 w-3" />;
          })}
        </div>
        <p className="line-clamp-2">{post.content?.slice(0, 60)}</p>
        {post.scheduled_at && (
          <p className="text-muted-foreground mt-0.5">{format(parseISO(post.scheduled_at), 'h:mm a')}</p>
        )}
        {post.status === 'published' && engagement && (
          <p className="text-muted-foreground mt-0.5">❤ {totalLikes} 💬 {totalComments}</p>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={statusColors[post.status] || ''}>{post.status}</Badge>
              {post.ai_generated && <Badge variant="outline"><Sparkles className="h-3 w-3 mr-1" />AI</Badge>}
              {post.plagiarism_checked && (
                <Badge variant={post.plagiarism_score > 30 ? 'destructive' : 'outline'}>
                  {post.plagiarism_score > 30 ? <AlertTriangle className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                  {post.plagiarism_score}% plagiarism
                </Badge>
              )}
            </div>
            <p className="text-sm mb-2">{post.content}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <div className="flex gap-1">
                {post.platforms?.map((p) => {
                  const platform = PLATFORMS.find((pl) => pl.id === p);
                  if (!platform) return null;
                  const Icon = platform.icon;
                  return (
                    <span key={p} className="flex items-center gap-1">
                      <Icon className="h-3 w-3" />{platform.label}
                    </span>
                  );
                })}
              </div>
              {post.scheduled_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(post.scheduled_at), 'MMM d, h:mm a')}
                </span>
              )}
            </div>

            {/* Engagement Metrics */}
            {post.status === 'published' && engagement && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-1 mb-2">
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Engagement</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold">{totalLikes}</p>
                    <p className="text-xs text-muted-foreground">Likes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{totalComments}</p>
                    <p className="text-xs text-muted-foreground">Comments</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{totalShares}</p>
                    <p className="text-xs text-muted-foreground">Shares</p>
                  </div>
                </div>
                {/* Per-platform breakdown */}
                <div className="mt-2 space-y-1">
                  {Object.entries(engagement).map(([platform, metrics]: [string, any]) => {
                    const plat = PLATFORMS.find((p) => p.id === platform);
                    if (!plat) return null;
                    const Icon = plat.icon;
                    return (
                      <div key={platform} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        <span>{plat.label}:</span>
                        <span>❤ {metrics.likes || 0}</span>
                        <span>💬 {metrics.comments || 0}</span>
                        {metrics.shares !== undefined && <span>🔄 {metrics.shares}</span>}
                        {metrics.impressions !== undefined && <span>👁 {metrics.impressions}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {post.error_message && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <XCircle className="h-3 w-3" />{post.error_message}
              </p>
            )}
          </div>
          {post.media_urls?.length > 0 && (
            <img src={post.media_urls[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
          )}
          <div className="flex flex-col gap-1">
            {(post.status === 'draft' || post.status === 'scheduled') && (
              <Button variant="outline" size="icon" onClick={handlePublishNow} disabled={publishing} title="Publish Now">
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            )}
            {post.status === 'published' && (
              <Button variant="outline" size="icon" onClick={handleFetchMetrics} disabled={fetchingMetrics} title="Refresh Metrics">
                {fetchingMetrics ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => deletePost.mutate(post.id)}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreatePostForm({ initialDate, onCreated }: { initialDate?: Date | null; onCreated: () => void }) {
  const createPost = useCreateSocialPost();
  const contentAI = useSocialContentAI();
  const { toast } = useToast();

  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['facebook']);
  const [scheduledDate, setScheduledDate] = useState(initialDate ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : '');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState('none');
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
  const [plagiarismResult, setPlagiarismResult] = useState<any>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePlatform = (id: string) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const result = await contentAI.mutateAsync({
        action: 'generate_post',
        context: { prompt: aiPrompt, platforms, tort_type: 'general mass tort' },
      });
      if (result.content) setContent(result.content);
      toast({ title: 'Content generated!' });
    } catch (e) {
      // handled by hook
    }
    setGenerating(false);
  };

  const handlePlagiarismCheck = async () => {
    if (!content.trim()) return;
    setCheckingPlagiarism(true);
    try {
      const result = await contentAI.mutateAsync({
        action: 'check_plagiarism',
        context: { content },
      });
      setPlagiarismResult(result);
    } catch (e) {
      // handled by hook
    }
    setCheckingPlagiarism(false);
  };

  const handleGenerateImage = async () => {
    if (!content.trim()) return;
    setGeneratingImage(true);
    try {
      const result = await contentAI.mutateAsync({
        action: 'generate_image',
        context: { content, platforms },
      });
      if (result.generated_image_url) {
        setMediaUrls([result.generated_image_url]);
        setMediaType('image');
        toast({ title: 'Image generated!' });
      }
    } catch (e) {
      // handled by hook
    }
    setGeneratingImage(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop();
    const path = `uploads/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from('social-media').upload(path, file);
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return;
    }

    const { data: publicUrl } = supabase.storage.from('social-media').getPublicUrl(path);
    setMediaUrls([publicUrl.publicUrl]);
    setMediaType(file.type.startsWith('video') ? 'video' : 'image');
    toast({ title: 'File uploaded!' });
  };

  const handleSubmit = async () => {
    if (!content.trim() || platforms.length === 0) {
      toast({ title: 'Error', description: 'Content and at least one platform required', variant: 'destructive' });
      return;
    }

    await createPost.mutateAsync({
      content,
      platforms,
      scheduled_at: scheduledDate || null,
      media_urls: mediaUrls,
      media_type: mediaType,
      status: scheduledDate ? 'scheduled' : 'draft',
      ai_generated: generating || !!aiPrompt,
      plagiarism_score: plagiarismResult?.plagiarism_score || 0,
      plagiarism_checked: !!plagiarismResult,
      ai_prompt: aiPrompt || null,
    });
    onCreated();
  };

  return (
    <div className="space-y-5">
      {/* AI Content Generation */}
      <div className="space-y-2 p-4 rounded-lg border border-dashed border-accent/50 bg-accent/5">
        <Label className="flex items-center gap-2"><Bot className="h-4 w-4 text-accent" />AI Content Generator</Label>
        <div className="flex gap-2">
          <Input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g., Post about PFAS water contamination awareness..."
          />
          <Button onClick={handleAIGenerate} disabled={generating} variant="outline">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Platforms */}
      <div className="space-y-2">
        <Label>Platforms</Label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(({ id, label, icon: Icon, color }) => (
            <Button
              key={id}
              variant={platforms.includes(id) ? 'default' : 'outline'}
              size="sm"
              onClick={() => togglePlatform(id)}
              className="gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label>Content</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your post content..."
          rows={5}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{content.length} characters</span>
          <Button variant="ghost" size="sm" onClick={handlePlagiarismCheck} disabled={checkingPlagiarism || !content}>
            {checkingPlagiarism ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
            Check Plagiarism
          </Button>
        </div>
      </div>

      {/* Plagiarism result */}
      {plagiarismResult && (
        <div className={`p-3 rounded-lg border text-sm ${
          plagiarismResult.is_safe_to_post ? 'bg-accent/10 border-accent' : 'bg-destructive/10 border-destructive'
        }`}>
          <p className="font-medium flex items-center gap-2">
            {plagiarismResult.is_safe_to_post
              ? <><CheckCircle className="h-4 w-4 text-accent" />Original Content ({plagiarismResult.plagiarism_score}% similarity)</>
              : <><AlertTriangle className="h-4 w-4 text-destructive" />Plagiarism Detected ({plagiarismResult.plagiarism_score}%)</>
            }
          </p>
          {plagiarismResult.issues?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {plagiarismResult.issues.map((issue: any, i: number) => (
                <li key={i} className="text-xs text-muted-foreground">• {issue.concern}: {issue.suggestion}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Media */}
      <div className="space-y-2">
        <Label>Media</Label>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />Upload
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerateImage} disabled={generatingImage || !content}>
            {generatingImage ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Image className="mr-1.5 h-3.5 w-3.5" />}
            AI Generate Image
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
        </div>
        {mediaUrls.length > 0 && (
          <div className="flex gap-2 mt-2">
            {mediaUrls.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="" className="w-20 h-20 rounded-lg object-cover border" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5"
                  onClick={() => { setMediaUrls([]); setMediaType('none'); }}
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="space-y-2">
        <Label>Schedule</Label>
        <Input
          type="datetime-local"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={handleSubmit} disabled={createPost.isPending} className="flex-1">
          {createPost.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          {scheduledDate ? 'Schedule Post' : 'Save Draft'}
        </Button>
      </div>
    </div>
  );
}
