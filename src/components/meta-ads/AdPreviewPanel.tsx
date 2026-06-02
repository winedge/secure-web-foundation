import { useMemo, useState, useRef, useEffect } from 'react';
import {
  Facebook, Instagram, ThumbsUp, MessageCircle, Share2, Heart, Bookmark, Send,
  MoreHorizontal, Volume2, VolumeX, Play, Music, ChevronLeft, ChevronRight, Globe,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export interface AdPreviewData {
  headline?: string | null;
  bodyText?: string | null;
  description?: string | null;
  callToAction?: string | null;
  linkUrl?: string | null;
  imageUrl?: string | null;
  videoSourceUrl?: string | null;
  videoThumbnailUrl?: string | null;
  adFormat?: string | null;
  carouselCards?: Array<{
    image_url?: string | null;
    video_source_url?: string | null;
    name?: string | null;
    description?: string | null;
    link?: string | null;
    call_to_action?: string | null;
  }> | null;
  pageName?: string | null;
  pagePictureUrl?: string | null;
  postMessage?: string | null;
  postCreatedTime?: string | null;
  permalinkUrl?: string | null;
  instagramPermalinkUrl?: string | null;
}

interface Props extends AdPreviewData {}

const ctaLabel = (cta?: string | null) => (cta || 'LEARN_MORE').replace(/_/g, ' ');

function domainOf(url?: string | null) {
  if (!url) return 'example.com';
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, ''); }
  catch { return 'example.com'; }
}

function Avatar({ name, src, gradient }: { name?: string | null; src?: string | null; gradient?: boolean }) {
  if (src) return <img src={src} alt={name || 'Page'} className="h-9 w-9 rounded-full object-cover" />;
  return (
    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground ${gradient ? 'bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500' : 'bg-primary'}`}>
      {(name || 'P').slice(0, 1).toUpperCase()}
    </div>
  );
}

function VideoPlayer({
  src, poster, aspect = 'video', controls = true, autoPlay = true,
}: { src?: string | null; poster?: string | null; aspect?: 'video' | 'square' | 'vertical'; controls?: boolean; autoPlay?: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
  const aspectClass = aspect === 'vertical' ? 'aspect-[9/16]' : aspect === 'square' ? 'aspect-square' : 'aspect-video';

  useEffect(() => { setFailed(false); }, [src]);

  if (!src || failed) {
    return (
      <div className={`${aspectClass} bg-muted flex items-center justify-center overflow-hidden relative`}>
        {poster ? (
          <img src={poster} alt="thumbnail" className="w-full h-full object-cover" />
        ) : (
          <div className="text-muted-foreground text-xs">Media unavailable</div>
        )}
        {poster && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-6 w-6 text-black ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${aspectClass} bg-black overflow-hidden`}>
      <video
        ref={ref}
        src={src}
        poster={poster || undefined}
        className="w-full h-full object-cover"
        autoPlay={autoPlay}
        loop
        playsInline
        muted={muted}
        controls={controls && !muted ? true : false}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        onClick={() => setMuted(m => !m)}
        className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-black/80"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ── Facebook Feed (post/image/video/link ad) ──
function FeedFacebook(p: Props) {
  const isVideo = p.adFormat === 'video' || !!p.videoSourceUrl;
  const isPost = !!p.postMessage && !p.headline;
  return (
    <div className="rounded-lg border bg-card overflow-hidden text-sm">
      <div className="p-3 flex items-start gap-2">
        <Avatar name={p.pageName || 'Your Business'} src={p.pagePictureUrl} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs truncate">{p.pageName || 'Your Business'}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">Sponsored · <Globe className="h-2.5 w-2.5" /></p>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="px-3 pb-2 whitespace-pre-wrap">
        <p className="text-xs text-foreground">{p.bodyText || p.postMessage || 'Your ad body text will appear here...'}</p>
      </div>
      {isVideo ? (
        <VideoPlayer src={p.videoSourceUrl} poster={p.videoThumbnailUrl || p.imageUrl} aspect="video" />
      ) : (
        <div className="aspect-video bg-muted flex items-center justify-center border-y">
          {p.imageUrl ? <img src={p.imageUrl} alt="Ad" className="w-full h-full object-cover" /> : <div className="text-muted-foreground text-xs">Ad Image</div>}
        </div>
      )}
      {!isPost && (p.headline || p.description || p.linkUrl) && (
        <div className="px-3 py-2 bg-muted/40 border-b flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase truncate">{domainOf(p.linkUrl)}</p>
            <p className="text-xs font-semibold truncate">{p.headline || 'Your headline here'}</p>
            {p.description && <p className="text-[10px] text-muted-foreground truncate">{p.description}</p>}
          </div>
          <button className="shrink-0 px-3 py-1.5 rounded bg-muted text-xs font-semibold border hover:bg-muted/80">{ctaLabel(p.callToAction)}</button>
        </div>
      )}
      <div className="px-3 py-2 flex items-center justify-around text-muted-foreground">
        <span className="flex items-center gap-1 text-xs"><ThumbsUp className="h-3.5 w-3.5" />Like</span>
        <span className="flex items-center gap-1 text-xs"><MessageCircle className="h-3.5 w-3.5" />Comment</span>
        <span className="flex items-center gap-1 text-xs"><Share2 className="h-3.5 w-3.5" />Share</span>
      </div>
    </div>
  );
}

// ── Instagram Feed (image/video/carousel) ──
function FeedInstagram(p: Props) {
  const isVideo = (p.adFormat === 'video' || p.adFormat === 'reel') && !!p.videoSourceUrl;
  const cards = p.carouselCards || [];
  const [idx, setIdx] = useState(0);
  const isCarousel = p.adFormat === 'carousel' && cards.length > 0;
  const current = isCarousel ? cards[idx] : null;

  return (
    <div className="rounded-lg border bg-card overflow-hidden text-sm">
      <div className="p-3 flex items-center gap-2">
        <Avatar name={p.pageName} gradient />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs truncate">{(p.pageName || 'your_business').toLowerCase().replace(/\s+/g, '_')}</p>
          <p className="text-[10px] text-muted-foreground">Sponsored</p>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="relative">
        {isCarousel ? (
          current?.video_source_url
            ? <VideoPlayer src={current.video_source_url} poster={current.image_url} aspect="square" />
            : <div className="aspect-square bg-muted">{current?.image_url ? <img src={current.image_url} alt="" className="w-full h-full object-cover" /> : null}</div>
        ) : isVideo ? (
          <VideoPlayer src={p.videoSourceUrl} poster={p.videoThumbnailUrl || p.imageUrl} aspect="square" />
        ) : (
          <div className="aspect-square bg-muted flex items-center justify-center">
            {p.imageUrl ? <img src={p.imageUrl} alt="Ad" className="w-full h-full object-cover" /> : <div className="text-muted-foreground text-xs">Ad Image</div>}
          </div>
        )}
        {isCarousel && cards.length > 1 && (
          <>
            {idx > 0 && (
              <button onClick={() => setIdx(i => i - 1)} className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 flex items-center justify-center">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {idx < cards.length - 1 && (
              <button onClick={() => setIdx(i => i + 1)} className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 flex items-center justify-center">
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <div className="absolute top-2 right-2 text-[10px] bg-black/60 text-white rounded-full px-2 py-0.5">{idx + 1}/{cards.length}</div>
          </>
        )}
      </div>
      {(p.headline || (isCarousel && current?.name)) && (
        <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/30 gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">{isCarousel ? (current?.name || p.headline) : (p.headline || 'Your headline here')}</p>
            {(isCarousel ? current?.description : p.description) && (
              <p className="text-[10px] text-muted-foreground truncate">{isCarousel ? current?.description : p.description}</p>
            )}
          </div>
          <button className="shrink-0 px-3 py-1 rounded text-[11px] font-semibold bg-primary text-primary-foreground">
            {ctaLabel(isCarousel ? current?.call_to_action || p.callToAction : p.callToAction)}
          </button>
        </div>
      )}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4 text-foreground">
          <Heart className="h-5 w-5" />
          <MessageCircle className="h-5 w-5" />
          <Send className="h-5 w-5" />
        </div>
        <Bookmark className="h-5 w-5" />
      </div>
      <div className="px-3 pb-3">
        <p className="text-xs whitespace-pre-wrap"><span className="font-semibold">{(p.pageName || 'your_business').toLowerCase().replace(/\s+/g, '_')}</span> {p.bodyText || ''}</p>
      </div>
    </div>
  );
}

// ── Instagram / Facebook Reel ──
function ReelPreview(p: Props) {
  return (
    <div className="mx-auto max-w-[280px] rounded-2xl overflow-hidden bg-black relative shadow-xl">
      <VideoPlayer src={p.videoSourceUrl} poster={p.videoThumbnailUrl || p.imageUrl} aspect="vertical" />
      {/* Top label */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-white text-xs">
        <span className="font-semibold drop-shadow">Reels</span>
        <MoreHorizontal className="h-4 w-4" />
      </div>
      {/* Right action rail */}
      <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4 text-white">
        <div className="flex flex-col items-center"><Heart className="h-6 w-6 drop-shadow" /><span className="text-[10px]">12K</span></div>
        <div className="flex flex-col items-center"><MessageCircle className="h-6 w-6 drop-shadow" /><span className="text-[10px]">340</span></div>
        <div className="flex flex-col items-center"><Send className="h-6 w-6 drop-shadow" /><span className="text-[10px]">Share</span></div>
        <div className="flex flex-col items-center"><MoreHorizontal className="h-6 w-6 drop-shadow" /></div>
      </div>
      {/* Bottom caption + CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
        <div className="flex items-center gap-2 mb-1.5">
          <Avatar name={p.pageName} gradient />
          <span className="text-xs font-semibold drop-shadow">{(p.pageName || 'your_business').toLowerCase().replace(/\s+/g, '_')}</span>
          <span className="text-[10px] border border-white/70 rounded px-1.5 py-0.5">Sponsored</span>
        </div>
        <p className="text-xs line-clamp-2 mb-2 drop-shadow">{p.bodyText || p.headline || 'Your reel caption…'}</p>
        <button className="w-full bg-white/95 text-black rounded-md py-1.5 text-xs font-semibold flex items-center justify-center gap-1">
          {ctaLabel(p.callToAction)}
        </button>
        <div className="mt-1.5 flex items-center gap-1 text-[10px] opacity-90"><Music className="h-3 w-3" /> Original audio</div>
      </div>
    </div>
  );
}

// ── Instagram Story ──
function StoryPreview(p: Props) {
  const isVideo = !!p.videoSourceUrl;
  return (
    <div className="mx-auto max-w-[280px] rounded-2xl overflow-hidden bg-black relative shadow-xl">
      {isVideo
        ? <VideoPlayer src={p.videoSourceUrl} poster={p.videoThumbnailUrl || p.imageUrl} aspect="vertical" />
        : <div className="aspect-[9/16] bg-muted">{p.imageUrl ? <img src={p.imageUrl} alt="Story" className="w-full h-full object-cover" /> : null}</div>}
      <div className="absolute top-2 left-2 right-2 flex gap-1">
        <div className="flex-1 h-0.5 bg-white/80 rounded-full" />
        <div className="flex-1 h-0.5 bg-white/30 rounded-full" />
      </div>
      <div className="absolute top-5 left-2 right-2 flex items-center gap-2 text-white text-xs">
        <Avatar name={p.pageName} gradient />
        <span className="font-semibold drop-shadow">{(p.pageName || 'your_business').toLowerCase().replace(/\s+/g, '_')}</span>
        <span className="text-[10px] opacity-80">Sponsored</span>
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <button className="w-full bg-white/95 text-black rounded-full py-2 text-xs font-semibold">{ctaLabel(p.callToAction)}</button>
      </div>
    </div>
  );
}

// ── Right column (FB sidebar) ──
function RightColumnPreview(p: Props) {
  return (
    <div className="rounded border bg-card max-w-[260px] overflow-hidden">
      <div className="aspect-[1.91/1] bg-muted">
        {p.imageUrl ? <img src={p.imageUrl} alt="Ad" className="w-full h-full object-cover" /> : null}
      </div>
      <div className="p-2">
        <p className="text-xs font-semibold truncate">{p.headline || 'Your headline'}</p>
        <p className="text-[10px] text-muted-foreground truncate">{domainOf(p.linkUrl)}</p>
      </div>
    </div>
  );
}

export function AdPreviewPanel(props: Props) {
  const fmt = (props.adFormat || '').toLowerCase();
  const hasVideo = !!props.videoSourceUrl;

  const placements = useMemo(() => {
    const list: { value: string; label: string; icon: any }[] = [];
    if (fmt === 'reel' || (hasVideo && fmt !== 'image')) list.push({ value: 'reel', label: 'Reels', icon: Instagram });
    list.push({ value: 'fb-feed', label: 'Facebook Feed', icon: Facebook });
    list.push({ value: 'ig-feed', label: 'Instagram Feed', icon: Instagram });
    list.push({ value: 'story', label: 'Stories', icon: Instagram });
    list.push({ value: 'right-col', label: 'Right Column', icon: Facebook });
    return list;
  }, [fmt, hasVideo]);

  const defaultTab = placements[0]?.value || 'fb-feed';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live Preview</p>
        <span className="text-[10px] text-muted-foreground capitalize">{fmt || 'image'} ad</span>
      </div>
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="h-8 flex-wrap">
          {placements.map(pl => (
            <TabsTrigger key={pl.value} value={pl.value} className="text-xs gap-1 px-2 h-7">
              <pl.icon className="h-3 w-3" />{pl.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="fb-feed" className="mt-2"><FeedFacebook {...props} /></TabsContent>
        <TabsContent value="ig-feed" className="mt-2"><FeedInstagram {...props} /></TabsContent>
        <TabsContent value="reel" className="mt-2"><ReelPreview {...props} /></TabsContent>
        <TabsContent value="story" className="mt-2"><StoryPreview {...props} /></TabsContent>
        <TabsContent value="right-col" className="mt-2"><RightColumnPreview {...props} /></TabsContent>
      </Tabs>
    </div>
  );
}
