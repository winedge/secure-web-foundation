/**
 * Meta Pixel (Facebook Pixel) - Stage-wise Integration
 *
 * Tracks user journey events across all ad tools:
 * Stage 1 - PageView        → landing on any page
 * Stage 2 - ViewContent     → viewing a lead/campaign detail
 * Stage 3 - Lead            → submitting an intake form
 * Stage 4 - CompleteRegistration → firm signup
 * Stage 5 - Purchase        → purchasing a lead from marketplace
 * Stage 6 - InitiateCheckout → starting checkout/subscription
 * Custom  - LaunchCampaign  → launching a Meta campaign
 * Custom  - AudienceBuilt   → lookalike audience generated
 * Custom  - CreativeGenerated → AI creative studio variant made
 */

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

// Initialize the pixel with an ID (called once in App.tsx or main.tsx)
export function initMetaPixel(pixelId: string) {
  if (typeof window === 'undefined') return;
  if (window.fbq) return; // already initialized

  // Standard Meta Pixel base code
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    'script',
    'https://connect.facebook.net/en_US/fbevents.js'
  );

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

function track(event: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', event, params);
}

function trackCustom(event: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('trackCustom', event, params);
}

// ─── Stage-wise pixel events ───────────────────────────────────────────────

/** Stage 1: Track page view (call on route change) */
export function pixelPageView() {
  track('PageView');
}

/** Stage 2: User viewed a lead / campaign detail */
export function pixelViewContent(params: { content_name: string; content_category?: string; value?: number; currency?: string }) {
  track('ViewContent', { ...params, currency: params.currency || 'USD' });
}

/** Stage 3: Intake / lead form submitted */
export function pixelLead(params?: { content_name?: string; content_category?: string; value?: number }) {
  track('Lead', { currency: 'USD', ...params });
}

/** Stage 4: Firm completed registration */
export function pixelCompleteRegistration(params?: { content_name?: string; value?: number }) {
  track('CompleteRegistration', { currency: 'USD', ...params });
}

/** Stage 5: Lead purchased from marketplace */
export function pixelPurchase(params: { value: number; content_name?: string; content_ids?: string[] }) {
  track('Purchase', { currency: 'USD', ...params });
}

/** Stage 6: Checkout / subscription initiated */
export function pixelInitiateCheckout(params?: { value?: number; num_items?: number }) {
  track('InitiateCheckout', { currency: 'USD', ...params });
}

// ─── Custom events for ad tools ──────────────────────────────────────────────

/** Ad tool: Meta campaign launched */
export function pixelLaunchCampaign(params: { campaign_name: string; objective: string; budget: number }) {
  trackCustom('LaunchCampaign', { currency: 'USD', ...params });
}

/** Ad tool: Lookalike audience generated */
export function pixelAudienceBuilt(params: { tort_type: string; segment_count: number }) {
  trackCustom('AudienceBuilt', params);
}

/** Ad tool: AI creative studio variant created */
export function pixelCreativeGenerated(params: { variant_count: number; tort_type?: string }) {
  trackCustom('CreativeGenerated', params);
}

/** Ad tool: Geofence campaign designed */
export function pixelGeofenceDesigned(params: { zone_count: number; tort_type?: string }) {
  trackCustom('GeofenceDesigned', params);
}

/** Ad tool: Cross-platform budget optimized */
export function pixelCrossPlatformOptimized(params: { total_budget: number; tort_type?: string }) {
  trackCustom('CrossPlatformOptimized', { currency: 'USD', ...params });
}

// ─── Hook for components ─────────────────────────────────────────────────────

export function useMetaPixel() {
  return {
    pageView: pixelPageView,
    viewContent: pixelViewContent,
    lead: pixelLead,
    completeRegistration: pixelCompleteRegistration,
    purchase: pixelPurchase,
    initiateCheckout: pixelInitiateCheckout,
    launchCampaign: pixelLaunchCampaign,
    audienceBuilt: pixelAudienceBuilt,
    creativeGenerated: pixelCreativeGenerated,
    geofenceDesigned: pixelGeofenceDesigned,
    crossPlatformOptimized: pixelCrossPlatformOptimized,
  };
}
