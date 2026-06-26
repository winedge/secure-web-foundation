/**
 * EcomOnboardingWizard - guided 3-step setup that turns a brand-new firm into
 * a working E-commerce Intelligence workspace:
 *   1) Pick a niche/category (free text + suggestions)
 *   2) Choose marketplaces to track
 *   3) Auto-create watchlist entries (1 category + 1 keyword per platform)
 *      and kick off an initial scrape so the dashboard isn't empty.
 *
 * Triggered automatically from EcomMarketOverview when the firm has no
 * watchlist rows yet, and dismissable per-firm via localStorage.
 */
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Sparkles, Check, Loader2, ShoppingBag, Target, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { EcomPlatform } from '@/hooks/use-ecom-watchlist';

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const NICHES = [
  'Skincare & Beauty', 'Fashion & Apparel', 'Home & Kitchen',
  'Mom & Baby', 'Electronics', 'Health & Wellness',
  'Pet Supplies', 'F&B / Snacks',
];

const PLATFORMS: { id: EcomPlatform; label: string; search: (q: string) => string; category: (q: string) => string }[] = [
  { id: 'shopee',      label: 'Shopee',       search: (q) => `https://shopee.vn/search?keyword=${encodeURIComponent(q)}`, category: (q) => `https://shopee.vn/search?keyword=${encodeURIComponent(q)}&page=0&sortBy=sales` },
  { id: 'lazada',      label: 'Lazada',       search: (q) => `https://www.lazada.vn/catalog/?q=${encodeURIComponent(q)}`, category: (q) => `https://www.lazada.vn/catalog/?q=${encodeURIComponent(q)}&sort=popularity` },
  { id: 'tiki',        label: 'Tiki',         search: (q) => `https://tiki.vn/search?q=${encodeURIComponent(q)}`,         category: (q) => `https://tiki.vn/search?q=${encodeURIComponent(q)}&sort=top_seller` },
  { id: 'tiktok_shop', label: 'TikTok Shop',  search: (q) => `https://shop.tiktok.com/search?keyword=${encodeURIComponent(q)}`, category: (q) => `https://shop.tiktok.com/search?keyword=${encodeURIComponent(q)}&sort=sales` },
];

export function EcomOnboardingWizard({ open, onOpenChange }: Props) {
  const firm = useFirm().data;
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [niche, setNiche] = useState('');
  const [platforms, setPlatforms] = useState<EcomPlatform[]>(['shopee', 'tiktok_shop']);
  const [busy, setBusy] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const trimmedNiche = niche.trim();
  const canNext1 = trimmedNiche.length >= 2;
  const canNext2 = platforms.length > 0;

  const togglePlatform = (p: EcomPlatform) =>
    setPlatforms((arr) => (arr.includes(p) ? arr.filter((x) => x !== p) : [...arr, p]));

  const previewRows = useMemo(() => {
    if (!trimmedNiche) return [];
    return platforms.flatMap((p) => {
      const plat = PLATFORMS.find((x) => x.id === p)!;
      return [
        { platform: p, entity_type: 'category', label: `${plat.label} | ${trimmedNiche} (top sellers)`, entity_url: plat.category(trimmedNiche) },
        { platform: p, entity_type: 'keyword',  label: `${plat.label} | "${trimmedNiche}"`,             entity_url: plat.search(trimmedNiche) },
      ];
    });
  }, [trimmedNiche, platforms]);

  const finish = async () => {
    if (!firm?.id) return;
    setBusy(true);
    try {
      const rows = previewRows.map((r) => ({ ...r, firm_id: firm.id, is_own: false }));
      const { data: inserted, error } = await supabase
        .from('ecom_watchlist' as any)
        .insert(rows)
        .select('id');
      if (error) throw error;
      const ids = (inserted as any[])?.map((r) => r.id) ?? [];
      setCreatedCount(ids.length);

      // Kick off initial scrapes in the background — don't block the UI.
      Promise.allSettled(
        ids.slice(0, 4).map((id) =>
          supabase.functions.invoke('ecom-scrape-listing', { body: { watchlist_id: id } })
        )
      ).then(() => {
        qc.invalidateQueries({ queryKey: ['ecom-watchlist'] });
        qc.invalidateQueries({ queryKey: ['ecom-snapshots'] });
        qc.invalidateQueries({ queryKey: ['ecom-price-history'] });
      });

      qc.invalidateQueries({ queryKey: ['ecom-watchlist'] });
      localStorage.setItem(`ecom-onboarded-${firm.id}`, '1');
      localStorage.setItem(`ecom-niche-${firm.id}`, trimmedNiche);
      toast({ title: `Watchlist ready`, description: `${ids.length} entries created. Initial scrape running in the background.` });
      setStep(4);
    } catch (e: any) {
      toast({ title: 'Could not finish setup', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const close = () => { onOpenChange(false); setTimeout(() => setStep(1), 300); };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Welcome | let's set up your first niche
          </DialogTitle>
          <DialogDescription>
            Three quick steps. We'll create your starter watchlist and pre-load the dashboard with live data.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          {[
            { n: 1, label: 'Niche',     icon: Target },
            { n: 2, label: 'Platforms', icon: ShoppingBag },
            { n: 3, label: 'Review',    icon: Rocket },
          ].map(({ n, label, icon: Icon }, i) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center border ${step >= n ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground'}`}>
                {step > n ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={step >= n ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
              {i < 2 && <div className={`flex-1 h-px ${step > n ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="niche">What's your niche or category?</Label>
              <Input id="niche" placeholder="e.g. anti-aging serum, baby formula, smart watches"
                value={niche} onChange={(e) => setNiche(e.target.value)} autoFocus />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Or pick a suggestion</p>
              <div className="flex flex-wrap gap-1.5">
                {NICHES.map((n) => (
                  <Badge key={n} variant={niche === n ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => setNiche(n)}>{n}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Which marketplaces should we track?</p>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => {
                const active = platforms.includes(p.id);
                return (
                  <Card key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`cursor-pointer p-4 flex items-center gap-3 transition ${active ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/40'}`}>
                    <Checkbox checked={active} onCheckedChange={() => togglePlatform(p.id)} />
                    <div>
                      <div className="font-medium">{p.label}</div>
                      <div className="text-xs text-muted-foreground">Top sellers + keyword feed</div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              We'll create <span className="font-medium text-foreground">{previewRows.length}</span> watchlist entries for
              <span className="font-medium text-foreground"> "{trimmedNiche}"</span> and start an initial scrape.
            </p>
            <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
              {previewRows.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Badge variant="outline" className="text-[10px] uppercase">{r.entity_type}</Badge>
                  <span className="flex-1 truncate">{r.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              You can add products, shops, or competitors anytime from the Marketplace Radar.
            </p>
          </div>
        )}

        {/* Step 4 - success */}
        {step === 4 && (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold">You're all set</h3>
            <p className="text-sm text-muted-foreground">
              {createdCount} watchlist entries created. Snapshots will appear on the dashboard as the scrape completes.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && step < 4 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={busy}>Back</Button>
          )}
          {step === 1 && (
            <>
              <Button variant="ghost" onClick={close}>Skip</Button>
              <Button onClick={() => setStep(2)} disabled={!canNext1}>Continue</Button>
            </>
          )}
          {step === 2 && (
            <Button onClick={() => setStep(3)} disabled={!canNext2}>Continue</Button>
          )}
          {step === 3 && (
            <Button onClick={finish} disabled={busy}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Setting up…</> : <><Rocket className="h-4 w-4 mr-2" />Create watchlist</>}
            </Button>
          )}
          {step === 4 && <Button onClick={close}>Go to dashboard</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
