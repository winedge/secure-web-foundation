import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Video, Film, Clock, Play, Download, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function VideoAdGenerator() {
  const [brief, setBrief] = useState('');
  const [tortType, setTortType] = useState('');
  const [duration, setDuration] = useState('30');
  const [format, setFormat] = useState('9:16');
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<any>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const generate = async () => {
    if (!brief) { toast.error('Enter a brief'); return; }
    setIsGenerating(true);
    setVideoUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-video-ads', {
        body: { brief, tort_type: tortType, duration: parseInt(duration), format },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setScript(data);
      toast.success('Video script generated');
    } catch (err: any) { toast.error(err.message); }
    finally { setIsGenerating(false); }
  };

  const generateVideo = async () => {
    if (!script) return;
    setIsGeneratingVideo(true);
    try {
      // Build a comprehensive prompt from the script
      const sceneDescriptions = script.script?.scenes
        ?.map((s: any) => `Scene ${s.scene_number}: ${s.visual_description}. Text: "${s.text_overlay}"`)
        .join('. ') || '';
      
      const videoPrompt = `Legal advertisement video: ${script.title}. ${script.emotional_arc}. ${sceneDescriptions}. Opening: ${script.script?.opening_hook}. CTA: ${script.script?.closing_cta}`;

      const aspectMap: Record<string, string> = { '9:16': '9:16', '16:9': '16:9', '1:1': '1:1' };

      const { data, error } = await supabase.functions.invoke('generate-video-ad', {
        body: {
          prompt: videoPrompt,
          aspect_ratio: aspectMap[format] || '9:16',
          duration_seconds: Math.min(parseInt(duration), 10),
          thumbnail_prompt: script.thumbnail_prompt,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.video_url) {
        setVideoUrl(data.video_url);
        toast.success('Video generated successfully!');
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setIsGeneratingVideo(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
              <Video className="h-5 w-5 text-white" />
            </div>
            AI Video Ad Generator
          </h1>
          <p className="text-muted-foreground mt-1">Generate professional video ads with AI — from script to final video.</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <Textarea placeholder="Describe your video ad... (e.g. 'Emotional testimonial-style ad for mesothelioma victims')" value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} />
            <div className="flex flex-wrap gap-4">
              <Input placeholder="Tort type" value={tortType} onChange={(e) => setTortType(e.target.value)} className="max-w-xs" />
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 sec</SelectItem>
                  <SelectItem value="30">30 sec</SelectItem>
                  <SelectItem value="60">60 sec</SelectItem>
                </SelectContent>
              </Select>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="9:16">9:16 (Reel)</SelectItem>
                  <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
                  <SelectItem value="1:1">1:1 (Feed)</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={generate} disabled={isGenerating} className="gap-2">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                {isGenerating ? 'Writing Script...' : 'Generate Script'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {script?.script && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-semibold text-foreground">{script.title}</h2>
              <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{script.duration_seconds}s</Badge>
              <Badge variant="secondary">{script.format}</Badge>
              {script.best_platform && <Badge className="bg-accent/10 text-accent">Best: {script.best_platform}</Badge>}
            </div>

            {/* Generate Video CTA */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Convert Script to Video
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      AI will generate a video based on your script's scenes, visuals, and emotional arc.
                    </p>
                  </div>
                  <Button
                    onClick={generateVideo}
                    disabled={isGeneratingVideo}
                    size="lg"
                    className="gap-2 whitespace-nowrap"
                  >
                    {isGeneratingVideo ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Generating Video...</>
                    ) : (
                      <><Play className="h-4 w-4" />Generate Video</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Video Player */}
            {videoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Play className="h-4 w-4" /> Generated Video
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <video
                    src={videoUrl}
                    controls
                    className="w-full max-w-2xl mx-auto rounded-lg border"
                    style={{ aspectRatio: format === '9:16' ? '9/16' : format === '1:1' ? '1/1' : '16/9', maxHeight: '500px' }}
                  />
                  <div className="flex gap-2 mt-4 justify-center">
                    <Button variant="outline" asChild>
                      <a href={videoUrl} download={`${script.title || 'video-ad'}.mp4`} target="_blank" rel="noopener">
                        <Download className="h-4 w-4 mr-2" />Download Video
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-foreground">Emotional Arc</p>
                <p className="text-sm text-muted-foreground">{script.emotional_arc}</p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Scene Breakdown</h3>
              {script.script.scenes?.map((scene: any, i: number) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-primary text-primary-foreground">Scene {scene.scene_number}</Badge>
                      <span className="text-xs text-muted-foreground">{scene.duration_seconds}s</span>
                      <Badge variant="outline" className="text-xs">{scene.transition}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div><p className="font-medium text-foreground text-xs">Visual</p><p className="text-muted-foreground">{scene.visual_description}</p></div>
                      <div><p className="font-medium text-foreground text-xs">Text Overlay</p><p className="text-muted-foreground">{scene.text_overlay}</p></div>
                      <div><p className="font-medium text-foreground text-xs">Voiceover</p><p className="text-muted-foreground italic">"{scene.voiceover}"</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Full Voiceover Script</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">{script.voiceover_full_text}</p>
              </CardContent>
            </Card>

            {script.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {script.hashtags.map((h: string, i: number) => <Badge key={i} variant="outline">#{h}</Badge>)}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
