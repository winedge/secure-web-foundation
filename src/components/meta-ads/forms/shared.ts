// Meta Ads Manager constants, enums and helpers.
// Source: Meta Marketing API docs (v21.0) — Campaigns, Ad Sets, Ads.

export const META_OBJECTIVES = [
  { value: 'OUTCOME_LEADS', label: 'Leads', help: 'Generate leads via lead forms, calls or messages.' },
  { value: 'OUTCOME_SALES', label: 'Sales', help: 'Drive purchases on your site, app, in store or Messenger.' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic', help: 'Send people to a destination (site, app, Messenger).' },
  { value: 'OUTCOME_AWARENESS', label: 'Awareness', help: 'Reach the most people likely to remember your ad.' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement', help: 'Get more messages, video views, post engagement.' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App promotion', help: 'Drive installs or actions in your mobile app.' },
] as const;

export const META_SPECIAL_AD_CATEGORIES = [
  { value: 'CREDIT', label: 'Credit' },
  { value: 'EMPLOYMENT', label: 'Employment' },
  { value: 'HOUSING', label: 'Housing' },
  { value: 'ISSUES_ELECTIONS_POLITICS', label: 'Social issues, elections or politics' },
  { value: 'ONLINE_GAMBLING_AND_GAMING', label: 'Online gambling & gaming' },
  { value: 'FINANCIAL_PRODUCTS_SERVICES', label: 'Financial products & services' },
] as const;

export const META_BID_STRATEGIES = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Highest volume', help: 'Get the most results for your budget (default).' },
  { value: 'COST_CAP', label: 'Cost per result goal', help: 'Average cost per result stays around your target.' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Bid cap', help: 'Maximum bid in each auction.' },
  { value: 'LOWEST_COST_WITH_MIN_ROAS', label: 'ROAS goal', help: 'Minimum return on ad spend.' },
] as const;

export const META_BUYING_TYPES = [
  { value: 'AUCTION', label: 'Auction' },
  { value: 'RESERVED', label: 'Reach & frequency (reserved)' },
] as const;

// ───────── Ad Set ─────────
export const META_CONVERSION_LOCATIONS = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'APP', label: 'App' },
  { value: 'MESSENGER', label: 'Messenger' },
  { value: 'INSTAGRAM_DIRECT', label: 'Instagram Direct' },
  { value: 'PHONE_CALL', label: 'Calls' },
  { value: 'ON_AD', label: 'On your ads (Instant form)' },
] as const;

export const META_OPTIMIZATION_GOALS = [
  { value: 'LEAD_GENERATION', label: 'Leads' },
  { value: 'OFFSITE_CONVERSIONS', label: 'Conversions' },
  { value: 'LANDING_PAGE_VIEWS', label: 'Landing page views' },
  { value: 'LINK_CLICKS', label: 'Link clicks' },
  { value: 'REACH', label: 'Reach' },
  { value: 'IMPRESSIONS', label: 'Impressions' },
  { value: 'THRUPLAY', label: 'ThruPlay (video)' },
  { value: 'POST_ENGAGEMENT', label: 'Post engagement' },
  { value: 'VALUE', label: 'Value' },
] as const;

export const META_BILLING_EVENTS = [
  { value: 'IMPRESSIONS', label: 'Impressions' },
  { value: 'LINK_CLICKS', label: 'Link clicks' },
  { value: 'THRUPLAY', label: 'ThruPlay' },
  { value: 'APP_INSTALLS', label: 'App installs' },
] as const;

export const META_ATTRIBUTION_WINDOWS = [
  { value: '1d_click', label: '1-day click' },
  { value: '7d_click', label: '7-day click' },
  { value: '7d_click_1d_view', label: '7-day click + 1-day view' },
] as const;

export const META_PACING_TYPES = [
  { value: 'standard', label: 'Standard (recommended)' },
  { value: 'no_pacing', label: 'Accelerated' },
] as const;

export const META_GENDERS = [
  { value: 0, label: 'All' },
  { value: 1, label: 'Men' },
  { value: 2, label: 'Women' },
] as const;

export const META_PLATFORMS = ['facebook', 'instagram', 'audience_network', 'messenger'] as const;
export const META_DEVICE_PLATFORMS = ['mobile', 'desktop'] as const;

export const META_POSITIONS: Record<string, { value: string; label: string }[]> = {
  facebook: [
    { value: 'feed', label: 'Facebook Feed' },
    { value: 'right_hand_column', label: 'Right column' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'video_feeds', label: 'Video feeds' },
    { value: 'story', label: 'Stories' },
    { value: 'search', label: 'Search results' },
    { value: 'instream_video', label: 'In-stream video' },
    { value: 'facebook_reels', label: 'Facebook Reels' },
  ],
  instagram: [
    { value: 'stream', label: 'Instagram Feed' },
    { value: 'story', label: 'Instagram Stories' },
    { value: 'explore', label: 'Explore' },
    { value: 'reels', label: 'Instagram Reels' },
    { value: 'shop', label: 'Instagram Shop' },
  ],
  audience_network: [
    { value: 'classic', label: 'Native, banner & interstitial' },
    { value: 'rewarded_video', label: 'Rewarded videos' },
  ],
  messenger: [
    { value: 'messenger_home', label: 'Inbox' },
    { value: 'story', label: 'Stories' },
    { value: 'sponsored_messages', label: 'Sponsored messages' },
  ],
};

// ───────── Ad ─────────
export const META_AD_FORMATS = [
  { value: 'single_image', label: 'Single image or video' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'collection', label: 'Collection' },
] as const;

export const META_CREATIVE_SOURCES = [
  { value: 'manual', label: 'Manual upload' },
  { value: 'existing_post', label: 'Use existing post' },
] as const;

export const META_CTA_BUTTONS = [
  'LEARN_MORE', 'SIGN_UP', 'CONTACT_US', 'GET_QUOTE', 'APPLY_NOW',
  'BOOK_TRAVEL', 'GET_OFFER', 'DOWNLOAD', 'SUBSCRIBE', 'SHOP_NOW',
  'SEND_MESSAGE', 'CALL_NOW', 'WHATSAPP_MESSAGE', 'GET_DIRECTIONS',
  'GET_SHOWTIMES', 'LISTEN_NOW', 'WATCH_MORE', 'DONATE_NOW', 'ORDER_NOW',
  'INSTALL_APP', 'USE_APP', 'PLAY_GAME', 'NO_BUTTON',
] as const;

export const ctaLabel = (cta: string) =>
  cta.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Char limits (recommended | hard) per Meta docs.
export const META_LIMITS = {
  campaign_name: 400,
  adset_name: 400,
  ad_name: 400,
  primary_text: { recommended: 125, hard: 2200 },
  headline: { recommended: 27, hard: 40 },
  description: { recommended: 27, hard: 30 },
  link_caption: 30,
};

export function buildUrlWithUtm(
  base: string,
  utm: { source?: string; medium?: string; campaign?: string; term?: string; content?: string }
): string {
  if (!base) return '';
  try {
    const url = new URL(base);
    if (utm.source) url.searchParams.set('utm_source', utm.source);
    if (utm.medium) url.searchParams.set('utm_medium', utm.medium);
    if (utm.campaign) url.searchParams.set('utm_campaign', utm.campaign);
    if (utm.term) url.searchParams.set('utm_term', utm.term);
    if (utm.content) url.searchParams.set('utm_content', utm.content);
    return url.toString();
  } catch {
    return base;
  }
}

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

export const META_LANGUAGES = [
  { value: 6, label: 'English (All)' },
  { value: 24, label: 'English (US)' },
  { value: 23, label: 'Spanish' },
  { value: 26, label: 'French' },
  { value: 27, label: 'German' },
  { value: 28, label: 'Italian' },
  { value: 16, label: 'Portuguese (Brazil)' },
];
