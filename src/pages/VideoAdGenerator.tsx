import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Video, Film, Clock, Sparkles, ImageIcon, Check, Save, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { useFirm } from '@/hooks/use-firm';
import { CategorySelect, validateCategoryValue } from '@/components/verticals/CategorySelect';
import { QualityControls, DEFAULT_QUALITY, type QualityControlsValue } from '@/components/ai/QualityControls';
import { ComplianceNotice, type ComplianceSummary } from '@/components/ai/ComplianceNotice';
import { GenerationProgress } from '@/components/ai/GenerationProgress';
import { useFrameStream } from '@/hooks/use-frame-stream';
import { cn } from '@/lib/utils';

interface SceneFrame {
  scene_number: number;
  image_url: string | null;
  error?: string;
}

export default function VideoAdGenerator() {
  const { data: firm } = useFirm();
  const [brief, setBrief] = useState('');
  const [tortType, setTortType] = useState('');
  const [duration, setDuration] = useState('30');
  const [variationCount, setVariationCount] = useState('3');
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const [frames, setFrames] = useState<SceneFrame[]>([]);
  const [categoryError, setCategoryError] = useState<string | undefined>();
  const [categoryValid, setCategoryValid] = useState(true);
  const [quality, setQuality] = useState<QualityControlsValue>({ ...DEFAULT_QUALITY, aspect_ratio: '9:16' });
  const [scriptCompliance, setScriptCompliance] = useState<ComplianceSummary | null>(null);
  const [framesCompliance, setFramesCompliance] = useState<ComplianceSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const frameStream = useFrameStream();
  const isGeneratingFrames = frameStream.isStreaming;

  const script = variants[selectedVariantIdx] ?? null;

  const generate = async () => {
    if (!brief) { toast.error('Enter a brief'); return; }
    const categoryValidation = validateCategoryValue(tortType);
    setCategoryError(categoryValidation ?? undefined);
    if (categoryValidation) { toast.error(categoryValidation); return; }
    setIsGenerating(true);
    setFrames([]);
    setVariants([]);
    setSelectedVariantIdx(0);
    setScriptCompliance(null);
    setFramesCompliance(null);
    frameStream.reset();
    try {
      const reqVariations = parseInt(variationCount, 10) || 1;
      const { data, error } = await supabase.functions.invoke('ai-video-ads', {
        body: { firm_id: firm?.id, brief, category: tortType, duration: parseInt(duration), format: quality.aspect_ratio, quality, variations: reqVariations },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.compliance) setScriptCompliance(data.compliance);

      // Backend returns either { variants: [...] } when count > 1, or a flat single script
      const list: any[] = Array.isArray(data?.variants) ? data.variants : [data];
      const usable = list.filter((v) => v?.script);
      if (usable.length === 0) throw new Error('No usable scripts returned');
      setVariants(usable);
      setSelectedVariantIdx(0);

      if (usable.length > 1) {
        toast.success(`${usable.length} script variations generated | pick the one you like best`);
      } else {
        toast.success('Video script generated');
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setIsGenerating(false); }
  };

  const onSelectVariant = (idx: number) => {
    if (idx === selectedVariantIdx) return;
    setSelectedVariantIdx(idx);
    // Reset frames since they belong to the previously-selected script
    setFrames([]);
    frameStream.reset();
    setFramesCompliance(null);
  };

  const generateFrames = async () => {
    if (!script?.script?.scenes) return;
    setFramesCompliance(null);
    setFrames([]);
    try {
      const collected = await frameStream.start({
        scenes: script.script.scenes,
        title: script.title,
        format: quality.aspect_ratio,
        firm_id: firm?.id,
        quality,
      });
      setFrames(collected);
      const ok = collected.filter((f) => f.image_url).length;
      toast.success(`${ok}/${collected.length} scene frames generated! Press play to watch with voiceover.`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const saveToHistory = async () => {
    if (!script || !firm?.id) return;
    setIsSaving(true);
    try {
      const validFrames = frames.filter((f) => f.image_url);
      const { error } = await supabase.from('video_ad_projects').insert([{
        firm_id: firm.id,
        title: script.title || 'Untitled Video Ad',
        brief,
        tort_type: tortType || null,
        format: quality.aspect_ratio,
        duration_seconds: script.duration_seconds || parseInt(duration),
        script: JSON.stringify(script.script ?? {}),
        voiceover_text: script.voiceover_full_text || null,
        thumbnail_url: validFrames[0]?.image_url || null,
        status: 'saved',
        ai_metadata: {
          best_platform: script.best_platform,
          emotional_arc: script.emotional_arc,
          hashtags: script.hashtags,
          hook: script.script?.opening_hook,
          cta: script.script?.closing_cta,
          frames: validFrames,
          quality,
          variant_index: script.variant_index ?? selectedVariantIdx,
          variant_count: variants.length,
        },
      }]);
      if (error) throw error;
      toast.success('Saved to ad history');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const validFrames = frames.filter(f => f.image_url);

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
          <p className="text-muted-foreground mt-1">Generate professional video ads with AI - script, visuals, and voiceover.</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <Textarea placeholder="Describe your video ad... (e.g. 'Emotional testimonial-style ad for mesothelioma victims')" value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} />
            <div className="flex flex-wrap gap-4 items-end">
              <div className="max-w-xs flex-1"><CategorySelect value={tortType} onChange={(v) => { setTortType(v); if (categoryError) setCategoryError(undefined); }} error={categoryError} required onValidityChange={setCategoryValid} /></div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Duration</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 sec</SelectItem>
                    <SelectItem value="30">30 sec</SelectItem>
                    <SelectItem value="60">60 sec</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Variations
                </label>
                <Select value={variationCount} onValueChange={setVariationCount}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 option</SelectItem>
                    <SelectItem value="3">3 options</SelectItem>
                    <SelectItem value="5">5 options</SelectItem>
                    <SelectItem value="7">7 options</SelectItem>
                    <SelectItem value="10">10 options</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generate} disabled={isGenerating || !categoryValid} className="gap-2">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                {isGenerating ? `Writing ${variationCount} Script${variationCount === '1' ? '' : 's'}...` : `Generate ${variationCount === '1' ? 'Script' : `${variationCount} Variations`}`}
              </Button>
            </div>
            <QualityControls value={quality} onChange={setQuality} />
          </CardContent>
        </Card>

        {scriptCompliance && <ComplianceNotice compliance={scriptCompliance} />}
        {framesCompliance && <ComplianceNotice compliance={framesCompliance} />}

        {variants.length > 1 && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Pick your favorite ({variants.length} variations)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {variants.map((v, idx) => {
                  const selected = idx === selectedVariantIdx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectVariant(idx)}
                      className={cn(
                        'text-left rounded-lg border p-4 transition-all hover:border-primary/60 hover:bg-muted/40',
                        selected ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={selected ? 'default' : 'outline'}>Option {idx + 1}</Badge>
                        {selected && (
                          <span className="text-xs text-primary flex items-center gap-1">
                            <Check className="h-3 w-3" /> Selected
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground line-clamp-2">{v.title}</p>
                      {v.script?.opening_hook && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-3 italic">"{v.script.opening_hook}"</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {v.best_platform && <Badge variant="secondary" className="text-xs">{v.best_platform}</Badge>}
                        {v.script?.scenes && <Badge variant="outline" className="text-xs">{v.script.scenes.length} scenes</Badge>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {script?.script && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-semibold text-foreground">{script.title}</h2>
              <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{script.duration_seconds}s</Badge>
              <Badge variant="secondary">{script.format}</Badge>
              <Badge variant="outline">{quality.resolution} | {quality.tier}</Badge>
              {script.best_platform && <Badge className="bg-accent/10 text-accent">Best: {script.best_platform}</Badge>}
              <div className="ml-auto">
                <Button onClick={saveToHistory} disabled={isSaving} variant="outline" size="sm" className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save to History
                </Button>
              </div>
            </div>

            {validFrames.length === 0 && frameStream.totalScenes === 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Generate Video with Voiceover
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        AI generates cinematic frames for each scene at {quality.resolution} ({quality.tier} tier). Then play as a video with synchronized voiceover narration.
                      </p>
                    </div>
                    <Button onClick={generateFrames} disabled={isGeneratingFrames} size="lg" className="gap-2 whitespace-nowrap">
                      {isGeneratingFrames ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Generating {script.script.scenes.length} Frames...</>
                      ) : (
                        <><ImageIcon className="h-4 w-4" />Generate Video</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {frameStream.totalScenes > 0 && (
              <GenerationProgress
                totalScenes={frameStream.totalScenes}
                generatedCount={frameStream.generatedCount}
                failedCount={frameStream.failedCount}
                progress={frameStream.progress}
                isStreaming={frameStream.isStreaming}
                finalStatus={frameStream.finalStatus}
                modelUsed={frameStream.modelUsed}
              />
            )}

            {validFrames.length > 0 && (
              <VideoPlayer
                scenes={script.script.scenes}
                frames={frames}
                title={script.title}
                format={quality.aspect_ratio}
                openingHook={script.script.opening_hook}
                closingCta={script.script.closing_cta}
                voiceoverFullText={script.voiceover_full_text}
              />
            )}

            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-foreground">Emotional Arc</p>
                <p className="text-sm text-muted-foreground">{script.emotional_arc}</p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Scene Breakdown</h3>
              {script.script.scenes?.map((scene: any, i: number) => {
                const matchingFrame = frames.find(f => f.scene_number === scene.scene_number);
                return (
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
                      {matchingFrame?.image_url && (
                        <img src={matchingFrame.image_url} alt={`Scene ${scene.scene_number}`} className="mt-3 rounded-md border max-h-40 object-cover" />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
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
