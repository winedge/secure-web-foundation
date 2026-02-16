import { useState, useEffect, useRef } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  const getPostsForDay = (day: Date) =>
    posts?.filter((p) => p.scheduled_at && isSameDay(parseISO(p.scheduled_at), day)) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Social Media Calendar</h1>
            <p className="text-muted-foreground text-sm">Plan, create, and auto-publish content across all platforms</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Wand2 className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">AI Generate Week</span>
              <span className="sm:hidden">AI</span>
            </Button>
            <Button size="sm" onClick={() => { setEditingPost(null); setCreateDialogOpen(true); }}>
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">New Post</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>

          {/* Edit / Create dialog */}
          <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) setEditingPost(null); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPost ? 'Edit Post' : 'Create Social Media Post'}</DialogTitle>
              </DialogHeader>
              <CreatePostForm
                initialDate={selectedDate}
                editPost={editingPost}
                onCreated={() => { setCreateDialogOpen(false); setEditingPost(null); }}
              />
            </DialogContent>
          </Dialog>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayPosts = getPostsForDay(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[100px] sm:min-h-[200px] rounded-lg border p-2 cursor-pointer transition-colors hover:bg-muted/30 ${
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
                        <PostCard key={post.id} post={post} compact onEdit={(p) => { setEditingPost(p); setCreateDialogOpen(true); }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            {/* Status filter */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {['all', 'draft', 'scheduled', 'published', 'failed'].map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                  className="capitalize text-xs"
                >
                  {s}
                </Button>
              ))}
            </div>
            <div className="space-y-3">
              {(() => {
                const filtered = statusFilter === 'all' ? posts : posts?.filter((p) => p.status === statusFilter);
                if (!filtered?.length) return (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">{statusFilter === 'all' ? 'No posts yet' : `No ${statusFilter} posts`}</p>
                      <p className="text-sm">Create your first post or let AI generate a content calendar.</p>
                    </CardContent>
                  </Card>
                );
                return filtered.map((post) => (
                  <PostCard key={post.id} post={post} onEdit={(p) => { setEditingPost(p); setCreateDialogOpen(true); }} />
                ));
              })()}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function PostCard({ post, compact, onEdit }: { post: SocialPost; compact?: boolean; onEdit?: (post: SocialPost) => void }) {
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

  const statusIcons: Record<string, React.ReactNode> = {
    draft: <Edit className="h-3 w-3" />,
    scheduled: <Clock className="h-3 w-3" />,
    publishing: <Loader2 className="h-3 w-3 animate-spin" />,
    published: <CheckCircle className="h-3 w-3" />,
    failed: <XCircle className="h-3 w-3" />,
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
      <div
        className="text-xs p-1.5 rounded bg-card border shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={(e) => { e.stopPropagation(); onEdit?.(post); }}
      >
        <div className="flex items-center gap-1 mb-0.5">
          {statusIcons[post.status]}
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
              <Badge className={`${statusColors[post.status] || ''} gap-1`}>
                {statusIcons[post.status]}
                {post.status}
              </Badge>
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
            <Button variant="outline" size="icon" onClick={() => onEdit?.(post)} title="Edit Post">
              <Edit className="h-4 w-4" />
            </Button>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm('Delete this post?')) deletePost.mutate(post.id);
              }}
              title="Delete Post"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreatePostForm({ initialDate, editPost, onCreated }: { initialDate?: Date | null; editPost?: SocialPost | null; onCreated: () => void }) {
  const createPost = useCreateSocialPost();
  const updatePost = useUpdateSocialPost();
  const contentAI = useSocialContentAI();
  const { toast } = useToast();

  const [content, setContent] = useState(editPost?.content || '');
  const [platforms, setPlatforms] = useState<string[]>(editPost?.platforms || ['facebook']);
  const [scheduledDate, setScheduledDate] = useState(
    editPost?.scheduled_at ? format(parseISO(editPost.scheduled_at), "yyyy-MM-dd'T'HH:mm") :
    initialDate ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [mediaUrls, setMediaUrls] = useState<string[]>(editPost?.media_urls || []);
  const [mediaType, setMediaType] = useState(editPost?.media_type || 'none');
  const [aiPrompt, setAiPrompt] = useState(editPost?.ai_prompt || '');
  const [generating, setGenerating] = useState(false);
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
  const [plagiarismResult, setPlagiarismResult] = useState<any>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image generation controls
  const [imageDescription, setImageDescription] = useState('');
  const [imageOverlayText, setImageOverlayText] = useState('');
  const [imageCta, setImageCta] = useState('');
  const [imageStyle, setImageStyle] = useState('modern-professional');
  const [imageAspect, setImageAspect] = useState('1:1');
  const [showImageOptions, setShowImageOptions] = useState(false);

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
    if (!content.trim() && !imageDescription.trim()) return;
    setGeneratingImage(true);
    try {
      const result = await contentAI.mutateAsync({
        action: 'generate_image',
        context: {
          content,
          platforms,
          image_description: imageDescription,
          overlay_text: imageOverlayText,
          cta_text: imageCta,
          style: imageStyle,
          aspect_ratio: imageAspect,
        },
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

    const payload = {
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
    };

    if (editPost) {
      await updatePost.mutateAsync({ id: editPost.id, ...payload });
    } else {
      await createPost.mutateAsync(payload);
    }
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

      {/* Media & AI Image Generator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Media</Label>
          <Button variant="ghost" size="sm" onClick={() => setShowImageOptions(!showImageOptions)} className="gap-1.5 text-xs">
            <Wand2 className="h-3 w-3" />{showImageOptions ? 'Hide' : 'Show'} AI Image Options
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />Upload
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
        </div>

        {/* AI Image Generation Panel */}
        {showImageOptions && (
          <div className="p-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 space-y-3">
            <p className="text-sm font-medium flex items-center gap-2"><Image className="h-4 w-4 text-primary" />AI Image Generator</p>
            <div className="space-y-2">
              <Label className="text-xs">Image Description</Label>
              <Textarea
                value={imageDescription}
                onChange={(e) => setImageDescription(e.target.value)}
                placeholder="Describe the image you want — e.g., 'A professional photo of a lawyer meeting clients in a modern office, warm lighting'"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Overlay Text (on image)</Label>
                <Input
                  value={imageOverlayText}
                  onChange={(e) => setImageOverlayText(e.target.value)}
                  placeholder="e.g., Were You Affected?"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CTA Button Text</Label>
                <Input
                  value={imageCta}
                  onChange={(e) => setImageCta(e.target.value)}
                  placeholder="e.g., Get a Free Consultation"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Visual Style</Label>
                <Select value={imageStyle} onValueChange={setImageStyle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern-professional">Modern Professional</SelectItem>
                    <SelectItem value="bold-attention-grabbing">Bold & Attention-Grabbing</SelectItem>
                    <SelectItem value="minimalist-clean">Minimalist & Clean</SelectItem>
                    <SelectItem value="warm-empathetic">Warm & Empathetic</SelectItem>
                    <SelectItem value="corporate-formal">Corporate Formal</SelectItem>
                    <SelectItem value="infographic">Infographic Style</SelectItem>
                    <SelectItem value="quote-card">Quote Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Aspect Ratio</Label>
                <Select value={imageAspect} onValueChange={setImageAspect}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">Square (1:1) — Instagram/Facebook</SelectItem>
                    <SelectItem value="16:9">Landscape (16:9) — Twitter/LinkedIn</SelectItem>
                    <SelectItem value="9:16">Portrait (9:16) — Stories/Reels</SelectItem>
                    <SelectItem value="4:5">Tall (4:5) — Instagram Feed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleGenerateImage}
              disabled={generatingImage || (!content.trim() && !imageDescription.trim())}
              className="w-full gap-2"
            >
              {generatingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Image with Text & CTA
            </Button>
          </div>
        )}

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
        <Button onClick={handleSubmit} disabled={createPost.isPending || updatePost.isPending} className="flex-1">
          {(createPost.isPending || updatePost.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          {editPost ? 'Update Post' : scheduledDate ? 'Schedule Post' : 'Save Draft'}
        </Button>
      </div>
    </div>
  );
}
