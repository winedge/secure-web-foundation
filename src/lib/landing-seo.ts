/**
 * Per-landing-page SEO configuration shape (stored in firm_branding.seo_config).
 */
export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string;
  canonical_url?: string;
  robots?: 'index,follow' | 'noindex,nofollow' | 'index,nofollow' | 'noindex,follow';
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_image_alt?: string;
  twitter_card?: 'summary' | 'summary_large_image';
  twitter_site?: string; // @handle
  favicon_url?: string;
  /** Structured-data type. 'auto' uses Organization. */
  schema_type?: 'auto' | 'Organization' | 'LocalBusiness' | 'ProfessionalService' | 'LegalService' | 'MedicalBusiness' | 'Product' | 'Service';
  schema_phone?: string;
  schema_address?: string;
  schema_city?: string;
  schema_region?: string;
  schema_postal?: string;
  schema_country?: string;
  schema_price_range?: string; // e.g. "$$"
}

export const DEFAULT_SEO: SeoConfig = {
  robots: 'index,follow',
  twitter_card: 'summary_large_image',
  schema_type: 'Organization',
};

/** Build a Schema.org JSON-LD object from the seo config + branding context. */
export function buildJsonLd(seo: SeoConfig, ctx: { name: string; url: string; logo?: string; description?: string }) {
  const type = seo.schema_type && seo.schema_type !== 'auto' ? seo.schema_type : 'Organization';
  const base: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': type,
    name: ctx.name,
    url: ctx.url,
  };
  if (ctx.logo) base.logo = ctx.logo;
  if (ctx.description || seo.description) base.description = ctx.description || seo.description;
  if (seo.schema_phone) base.telephone = seo.schema_phone;
  if (seo.schema_price_range) base.priceRange = seo.schema_price_range;
  const addr: Record<string, string> = {};
  if (seo.schema_address) addr.streetAddress = seo.schema_address;
  if (seo.schema_city) addr.addressLocality = seo.schema_city;
  if (seo.schema_region) addr.addressRegion = seo.schema_region;
  if (seo.schema_postal) addr.postalCode = seo.schema_postal;
  if (seo.schema_country) addr.addressCountry = seo.schema_country;
  if (Object.keys(addr).length > 0) {
    base.address = { '@type': 'PostalAddress', ...addr };
  }
  return base;
}
