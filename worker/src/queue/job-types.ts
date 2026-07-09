export type Marketplace = 'tiktok_shop' | 'shopee' | 'lazada' | 'temu' | 'amazon' | 'ebay';

export interface ScrapeWatchlistJob {
  job_id: string;
  watchlist_id: string;
  firm_id: string;
  marketplace: Marketplace | string;
  url: string;
  entity_type: 'product' | 'shop' | 'category' | 'brand' | 'keyword';
  priority: 'high' | 'medium' | 'low';
}
