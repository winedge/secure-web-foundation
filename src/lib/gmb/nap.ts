import { z } from 'zod';

export const napSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  address: z.string().trim().min(5, 'Street address required').max(200),
  city: z.string().trim().min(2, 'City required').max(80),
  region: z.string().trim().min(2, 'State / Region required').max(80),
  postal_code: z.string().trim().min(3, 'Postal code required').max(20),
  country: z.string().trim().length(2, 'Use 2-letter country code (e.g. US)').toUpperCase(),
  phone: z.string().trim().min(7, 'Phone too short').max(20)
    .regex(/^[+]?[\d\s().-]{7,20}$/, 'Invalid phone format'),
  website: z.string().trim().url('Must be a valid URL (https://...)').max(255).optional().or(z.literal('')),
  primary_category: z.string().trim().min(2, 'Category required').max(80),
});

export type NapPayload = z.infer<typeof napSchema>;

export interface NapIssue {
  field: string;
  level: 'error' | 'warning';
  message: string;
}

const PO_BOX_RE = /\b(p\.?\s*o\.?\s*box|post\s*office\s*box)\b/i;
const ALL_CAPS_RE = /^[^a-z]*$/;

/**
 * Cross-field NAP consistency checks beyond zod schema.
 * Catches Google Business Profile rejection patterns (PO boxes, ALL CAPS,
 * promotional name suffixes, mismatched country codes).
 */
export function lintNap(payload: NapPayload): NapIssue[] {
  const issues: NapIssue[] = [];

  if (PO_BOX_RE.test(payload.address)) {
    issues.push({ field: 'address', level: 'error', message: 'Google rejects PO Box addresses for storefront listings.' });
  }
  if (ALL_CAPS_RE.test(payload.name) && payload.name.length > 4) {
    issues.push({ field: 'name', level: 'warning', message: 'ALL CAPS business names violate Google guidelines.' });
  }
  if (/(best|top|#1|cheap|free|24\/7|llc inc|corp llc)/i.test(payload.name)) {
    issues.push({ field: 'name', level: 'warning', message: 'Promotional keywords in the name may trigger Google review.' });
  }
  if (payload.country === 'US' && !/^[+]?1?[\s-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(payload.phone)) {
    issues.push({ field: 'phone', level: 'warning', message: 'US phone should match (XXX) XXX-XXXX.' });
  }
  if (payload.country === 'US' && !/^\d{5}(-\d{4})?$/.test(payload.postal_code)) {
    issues.push({ field: 'postal_code', level: 'warning', message: 'US postal code should be 5 digits or ZIP+4.' });
  }
  if (payload.website && !/^https:\/\//i.test(payload.website)) {
    issues.push({ field: 'website', level: 'warning', message: 'Use HTTPS for the website URL.' });
  }
  if (payload.name.trim().length < 3) {
    issues.push({ field: 'name', level: 'error', message: 'Name too short to be recognized.' });
  }
  return issues;
}

export interface FieldDiff {
  field: string;
  label: string;
  before: string;
  after: string;
}

const FIELD_LABELS: Record<keyof NapPayload, string> = {
  name: 'Business name',
  address: 'Street address',
  city: 'City',
  region: 'State / Region',
  postal_code: 'Postal code',
  country: 'Country',
  phone: 'Phone',
  website: 'Website',
  primary_category: 'Primary category',
};

export function diffNap(before: Partial<NapPayload>, after: NapPayload): FieldDiff[] {
  const out: FieldDiff[] = [];
  (Object.keys(FIELD_LABELS) as Array<keyof NapPayload>).forEach((k) => {
    const b = (before[k] ?? '').toString().trim();
    const a = (after[k] ?? '').toString().trim();
    if (b !== a) out.push({ field: k, label: FIELD_LABELS[k], before: b || '(empty)', after: a || '(empty)' });
  });
  return out;
}
