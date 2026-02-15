import { Facebook, Instagram, ThumbsUp, MessageCircle, Share2, Heart, Bookmark, Send } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdPreviewProps {
  headline: string;
  bodyText: string;
  description: string;
  callToAction: string;
  linkUrl: string;
  imageUrl?: string;
}

export function AdPreviewPanel({ headline, bodyText, description, callToAction, linkUrl, imageUrl }: AdPreviewProps) {
  const ctaLabel = (callToAction || 'LEARN_MORE').replace(/_/g, ' ');
  const domain = linkUrl ? (() => { try { return new URL(linkUrl).hostname; } catch { return 'example.com'; } })() : 'example.com';

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live Preview</p>
      <Tabs defaultValue="facebook" className="w-full">
        <TabsList className="h-8">
          <TabsTrigger value="facebook" className="text-xs gap-1 px-2 h-7"><Facebook className="h-3 w-3" />Facebook</TabsTrigger>
          <TabsTrigger value="instagram" className="text-xs gap-1 px-2 h-7"><Instagram className="h-3 w-3" />Instagram</TabsTrigger>
        </TabsList>

        <TabsContent value="facebook" className="mt-2">
          <div className="rounded-lg border bg-card overflow-hidden text-sm">
            {/* Header */}
            <div className="p-3 flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                <Facebook className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-xs">Your Business</p>
                <p className="text-[10px] text-muted-foreground">Sponsored · 🌐</p>
              </div>
            </div>
            {/* Body */}
            <div className="px-3 pb-2">
              <p className="text-xs text-foreground">{bodyText || 'Your ad body text will appear here...'}</p>
            </div>
            {/* Image */}
            <div className="aspect-video bg-muted flex items-center justify-center border-y">
              {imageUrl ? (
                <img src={imageUrl} alt="Ad" className="w-full h-full object-cover" />
              ) : (
                <div className="text-muted-foreground text-xs">Ad Image / Video</div>
              )}
            </div>
            {/* Link section */}
            <div className="px-3 py-2 bg-muted/40 border-b flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase">{domain}</p>
                <p className="text-xs font-semibold truncate">{headline || 'Your headline here'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{description || 'Description text'}</p>
              </div>
              <button className="shrink-0 ml-2 px-3 py-1.5 rounded bg-muted text-xs font-semibold border hover:bg-muted/80">
                {ctaLabel}
              </button>
            </div>
            {/* Actions */}
            <div className="px-3 py-2 flex items-center justify-around text-muted-foreground">
              <span className="flex items-center gap-1 text-xs"><ThumbsUp className="h-3.5 w-3.5" />Like</span>
              <span className="flex items-center gap-1 text-xs"><MessageCircle className="h-3.5 w-3.5" />Comment</span>
              <span className="flex items-center gap-1 text-xs"><Share2 className="h-3.5 w-3.5" />Share</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="instagram" className="mt-2">
          <div className="rounded-lg border bg-card overflow-hidden text-sm">
            {/* Header */}
            <div className="p-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 p-0.5">
                <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                  <Instagram className="h-3 w-3" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-xs">your_business</p>
                <p className="text-[10px] text-muted-foreground">Sponsored</p>
              </div>
            </div>
            {/* Image */}
            <div className="aspect-square bg-muted flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="Ad" className="w-full h-full object-cover" />
              ) : (
                <div className="text-muted-foreground text-xs">Ad Image / Video</div>
              )}
            </div>
            {/* CTA bar */}
            <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/30">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{headline || 'Your headline here'}</p>
              </div>
              <button className="shrink-0 ml-2 px-3 py-1 rounded text-[11px] font-semibold bg-primary text-primary-foreground">
                {ctaLabel}
              </button>
            </div>
            {/* Actions */}
            <div className="px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-4 text-foreground">
                <Heart className="h-5 w-5" />
                <MessageCircle className="h-5 w-5" />
                <Send className="h-5 w-5" />
              </div>
              <Bookmark className="h-5 w-5" />
            </div>
            {/* Caption */}
            <div className="px-3 pb-3">
              <p className="text-xs"><span className="font-semibold">your_business</span> {bodyText || 'Your caption text...'}</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
