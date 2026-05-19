/**
 * Generates SQL INSERT statements for the 12 starter landing-page templates,
 * 2 per industry vertical. Output is printed to stdout — pipe into psql or
 * paste into the supabase--insert tool.
 *
 *   bun run scripts/build-starter-templates.ts
 */

type SectionShape = { id: string; type: string; visible: boolean; props: Record<string, any> };

const SYSTEM_USER = '00000000-0000-0000-0000-000000000000';

const uid = () => crypto.randomUUID();

function sec(type: string, props: Record<string, any>): SectionShape {
  return { id: uid(), type, visible: true, props };
}

function snapshot(opts: {
  slug: string;
  firmName: string;
  primary: string;
  bg: string;
  accent: string;
  heading: string;
  description: string;
  sections: SectionShape[];
}) {
  return {
    slug: opts.slug,
    firm_display_name: opts.firmName,
    logo_url: null,
    primary_color: opts.primary,
    background_color: opts.bg,
    accent_color: opts.accent,
    heading_text: opts.heading,
    description_text: opts.description,
    visible_fields: ['full_name', 'email', 'phone'],
    custom_fields: [],
    theme_key: 'clean_slate',
    typography: {},
    layout_config: {},
    hero_config: {},
    sections: opts.sections,
    seo_config: {},
  };
}

// --- shared section builders ----------------------------------------------

const footer = (firm: string) => sec('footer', {
  firmName: firm, tagline: '', layout: 'simple',
  links: [
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
    { label: 'Contact', href: '#lead-form' },
  ],
  social: [],
  legal: `© ${new Date().getFullYear()} ${firm}. All rights reserved.`,
});

const form = (heading: string, description: string) =>
  sec('form', { heading, description, sticky: false });

const faq = (heading: string, items: { question: string; answer: string }[]) =>
  sec('faq', { heading, items });

const cta = (heading: string, sub: string, label = 'Get started') =>
  sec('cta', {
    heading, subheading: sub, style: 'bold',
    primaryCta: { label, href: '#lead-form' },
  });

const features = (heading: string, intro: string, items: { icon: string; title: string; description: string }[]) =>
  sec('features', { heading, intro, columns: 3, items });

const testimonials = (heading: string, items: { quote: string; author: string; role: string; rating?: number }[]) =>
  sec('testimonials', {
    heading, layout: 'grid',
    items: items.map(i => ({ ...i, rating: i.rating ?? 5 })),
  });

const steps = (heading: string, intro: string, items: { title: string; description: string }[]) =>
  sec('steps', { heading, intro, items });

const stats = (heading: string, items: { value: string; suffix: string; label: string }[]) =>
  sec('stats', { heading, items });

const gallery = (heading: string, urls: string[]) =>
  sec('gallery', { heading, layout: 'grid', images: urls.map(url => ({ url, caption: '' })) });

const hero = (opts: {
  eyebrow: string; headline: string; sub: string;
  primaryLabel?: string; secondaryLabel?: string; imageUrl?: string;
  layout?: 'centered' | 'split-form-right' | 'split-left';
}) => sec('hero', {
  eyebrow: opts.eyebrow,
  headline: opts.headline,
  subheadline: opts.sub,
  primaryCta: { label: opts.primaryLabel ?? 'Get started', href: '#lead-form' },
  secondaryCta: { label: opts.secondaryLabel ?? 'Learn more', href: '#' },
  layout: opts.layout ?? 'centered',
  align: 'center',
  imageUrl: opts.imageUrl ?? '',
  formCardTitle: 'Request a callback',
  formCardSubtitle: 'We respond within 1 business hour.',
  formCardStyle: 'card',
});

// --- 12 templates ---------------------------------------------------------

type Tpl = {
  name: string;
  description: string;
  category: string;
  tags: string[];
  vertical: string;
  snapshot: ReturnType<typeof snapshot>;
};

const TEMPLATES: Tpl[] = [
  // ── DENTAL ──
  {
    name: 'Family Dental Practice',
    description: 'Friendly hero, services grid, patient reviews and an appointment request form.',
    category: 'medical', tags: ['dental', 'appointment', 'family'], vertical: 'dental',
    snapshot: snapshot({
      slug: 'family-dental',
      firmName: 'Bright Smile Family Dental',
      primary: '#0ea5e9', bg: '#f8fafc', accent: '#10b981',
      heading: 'Gentle, modern dentistry for your whole family',
      description: 'New-patient exams, cleanings, fillings and more | with same-week appointments.',
      sections: [
        hero({
          eyebrow: 'Accepting new patients',
          headline: 'Gentle, modern dentistry for your whole family',
          sub: 'Same-week appointments, transparent pricing, and a team that treats you like family.',
          primaryLabel: 'Book your visit',
          secondaryLabel: 'Our services',
          layout: 'split-form-right',
        }),
        features('Care we provide', 'Comprehensive dental services under one roof.', [
          { icon: 'Sparkles', title: 'Cleanings & exams', description: 'Routine preventive care to keep smiles healthy.' },
          { icon: 'Smile', title: 'Cosmetic dentistry', description: 'Veneers, whitening and bonding for a confident smile.' },
          { icon: 'Shield', title: 'Family-friendly', description: 'Kid-friendly rooms and gentle care for every age.' },
        ]),
        testimonials('What patients say', [
          { quote: 'Best dentist experience I have ever had. Truly painless.', author: 'Megan R.', role: 'Patient since 2022' },
          { quote: 'They make my kids actually look forward to their checkups.', author: 'David K.', role: 'Parent of two' },
          { quote: 'Modern office, kind staff, fair prices. Highly recommend.', author: 'Lina S.', role: 'Patient since 2021' },
        ]),
        faq('Common questions', [
          { question: 'Do you accept my insurance?', answer: 'We accept most major dental plans. Call us with your provider name.' },
          { question: 'How soon can I be seen?', answer: 'New patients can usually be scheduled within the same week.' },
          { question: 'Do you offer financing?', answer: 'Yes, we offer 0% financing on treatment plans over $500.' },
        ]),
        form('Request an appointment', 'Tell us a bit about you and we will confirm a time within one business hour.'),
        footer('Bright Smile Family Dental'),
      ],
    }),
  },
  {
    name: 'Cosmetic Smile Clinic',
    description: 'Premium cosmetic-dentistry layout with before/after gallery and consultation CTA.',
    category: 'medical', tags: ['dental', 'cosmetic', 'veneers'], vertical: 'dental',
    snapshot: snapshot({
      slug: 'cosmetic-smile',
      firmName: 'Aura Cosmetic Dentistry',
      primary: '#0f172a', bg: '#ffffff', accent: '#d4af37',
      heading: 'The smile you have always wanted',
      description: 'Award-winning veneers, whitening and full smile makeovers.',
      sections: [
        hero({
          eyebrow: 'Premium cosmetic dentistry',
          headline: 'The smile you have always wanted',
          sub: 'Hand-crafted veneers and full smile makeovers by award-winning cosmetic dentists.',
          primaryLabel: 'Book a consultation',
          secondaryLabel: 'See the results',
        }),
        stats('Trusted results', [
          { value: '2', suffix: 'K+', label: 'Smiles transformed' },
          { value: '15', suffix: '+', label: 'Years of experience' },
          { value: '4.9', suffix: '/5', label: 'Patient rating' },
          { value: '0', suffix: '%', label: 'Financing available' },
        ]),
        features('Signature treatments', 'Premium results, gentle technique.', [
          { icon: 'Sparkles', title: 'Porcelain veneers', description: 'Hand-layered, natural-looking veneers built for longevity.' },
          { icon: 'Sun', title: 'Professional whitening', description: 'Up to 8 shades brighter in a single visit.' },
          { icon: 'Crown', title: 'Smile makeovers', description: 'Comprehensive plans that combine multiple treatments.' },
        ]),
        gallery('Before & after gallery', [
          'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=800',
          'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800',
          'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800',
          'https://images.unsplash.com/photo-1612277795421-9bc7706a4a34?w=800',
        ]),
        testimonials('Real patient stories', [
          { quote: 'My veneers look completely natural. People keep asking what I changed.', author: 'Olivia M.', role: 'Veneers patient' },
          { quote: 'The team made the entire process feel calm and luxurious.', author: 'Anika P.', role: 'Smile makeover' },
          { quote: 'Worth every dollar. I cannot stop smiling.', author: 'Hiro T.', role: 'Whitening patient' },
        ]),
        cta('Ready to see what your smile could look like?', 'Book a complimentary cosmetic consultation today.', 'Book consultation'),
        form('Request a consultation', 'Share a quick note about what you would like to change and our team will reach out.'),
        footer('Aura Cosmetic Dentistry'),
      ],
    }),
  },

  // ── SKIN & AESTHETICS ──
  {
    name: 'Medspa Treatments',
    description: 'Modern medspa hero, treatment cards, before/after gallery and booking form.',
    category: 'medical', tags: ['medspa', 'aesthetics', 'botox'], vertical: 'skin_clinic',
    snapshot: snapshot({
      slug: 'medspa',
      firmName: 'Lumière Medspa',
      primary: '#be185d', bg: '#fdf2f8', accent: '#f472b6',
      heading: 'Glow that lasts | beauty backed by science',
      description: 'Botox, fillers, laser and medical-grade facials in a calm, luxurious setting.',
      sections: [
        hero({
          eyebrow: 'Doctor-led medspa',
          headline: 'Glow that lasts | beauty backed by science',
          sub: 'Botox, fillers, laser and medical-grade facials in a calm, luxurious setting.',
          primaryLabel: 'Book a treatment',
          secondaryLabel: 'Browse services',
          layout: 'split-form-right',
        }),
        features('Popular treatments', 'Tailored plans for every skin type.', [
          { icon: 'Sparkles', title: 'Neurotoxins & filler', description: 'Subtle, natural-looking results from board-certified injectors.' },
          { icon: 'Zap', title: 'Laser & IPL', description: 'Pigmentation, acne scars, hair removal and skin resurfacing.' },
          { icon: 'Droplet', title: 'Medical facials', description: 'Hydrafacial, chemical peels and microneedling.' },
        ]),
        steps('What to expect', 'From consultation to glow.', [
          { title: 'Free consult', description: 'A 20-minute virtual or in-person consult to understand your goals.' },
          { title: 'Custom plan', description: 'We design a treatment plan with clear pricing | no surprises.' },
          { title: 'Visible results', description: 'Most clients see results from their first session.' },
        ]),
        testimonials('Loved by clients', [
          { quote: 'My skin has never looked better. The team is incredible.', author: 'Sophia L.', role: 'Hydrafacial' },
          { quote: 'Very natural results | exactly what I wanted.', author: 'Maya P.', role: 'Injector patient' },
          { quote: 'Modern, clean, calm. Feels like a five-star spa.', author: 'Riya B.', role: 'Laser patient' },
        ]),
        form('Book your treatment', 'Tell us what you are interested in and we will reach out to confirm.'),
        footer('Lumière Medspa'),
      ],
    }),
  },
  {
    name: 'Dermatology Consult',
    description: 'Clinical dermatology landing focused on medical consults, acne, eczema and skin checks.',
    category: 'medical', tags: ['dermatology', 'skin', 'consult'], vertical: 'skin_clinic',
    snapshot: snapshot({
      slug: 'derm-consult',
      firmName: 'Northbridge Dermatology',
      primary: '#0f766e', bg: '#f0fdfa', accent: '#14b8a6',
      heading: 'Expert dermatology care, when you need it',
      description: 'Board-certified dermatologists for acne, eczema, full-body skin checks and more.',
      sections: [
        hero({
          eyebrow: 'Board-certified dermatologists',
          headline: 'Expert dermatology care, when you need it',
          sub: 'Same-week appointments for acne, eczema, full-body skin checks and cosmetic concerns.',
          primaryLabel: 'Book an appointment',
          secondaryLabel: 'Our conditions',
        }),
        features('Conditions we treat', '', [
          { icon: 'CircleAlert', title: 'Acne & rosacea', description: 'Personalised plans with prescription-grade products.' },
          { icon: 'Sun', title: 'Skin cancer screening', description: 'Full-body checks with dermoscopy and biopsy when needed.' },
          { icon: 'Leaf', title: 'Eczema & psoriasis', description: 'Modern therapies including biologics and phototherapy.' },
        ]),
        steps('How a visit works', '', [
          { title: 'Book online', description: 'Pick a time that works | in-person or virtual.' },
          { title: 'See the doctor', description: 'A focused 20-minute appointment with your dermatologist.' },
          { title: 'Follow-up plan', description: 'Prescriptions sent to your pharmacy, follow-up scheduled.' },
        ]),
        faq('Common questions', [
          { question: 'Do you accept insurance?', answer: 'We accept most major plans. Call us with your insurer.' },
          { question: 'Do you offer telehealth?', answer: 'Yes, many follow-ups can be done by video.' },
          { question: 'Are walk-ins available?', answer: 'We prioritise scheduled visits but can sometimes fit urgent cases.' },
        ]),
        form('Request an appointment', 'Tell us what is going on and we will help you find the right visit.'),
        footer('Northbridge Dermatology'),
      ],
    }),
  },

  // ── MASS TORT LEGAL ──
  {
    name: 'Mass Tort Case Eval',
    description: 'High-converting mass tort intake page with eligibility checker and trust signals.',
    category: 'legal', tags: ['mass tort', 'eligibility', 'intake'], vertical: 'mass_tort',
    snapshot: snapshot({
      slug: 'mass-tort-eval',
      firmName: 'National Justice Partners',
      primary: '#0f172a', bg: '#ffffff', accent: '#dc2626',
      heading: 'You may be entitled to significant compensation',
      description: 'Free, confidential case review by our nationwide mass-tort legal network.',
      sections: [
        hero({
          eyebrow: 'Free case review',
          headline: 'You may be entitled to significant compensation',
          sub: 'If you or a loved one were harmed, our nationwide network of attorneys can help. No fees unless we win.',
          primaryLabel: 'Check your eligibility',
          secondaryLabel: 'Learn more',
          layout: 'split-form-right',
        }),
        stats('Why families trust us', [
          { value: '500', suffix: 'M+', label: 'Recovered for clients' },
          { value: '20', suffix: 'K+', label: 'Cases evaluated' },
          { value: '50', suffix: '', label: 'States covered' },
          { value: '24', suffix: '/7', label: 'Free hotline' },
        ]),
        steps('How it works', 'Three simple steps to find out if you qualify.', [
          { title: 'Tell us your story', description: 'A short, confidential form | takes under 2 minutes.' },
          { title: 'Free case review', description: 'A licensed attorney reviews your situation at no cost.' },
          { title: 'No win, no fee', description: 'If you qualify and we accept your case, you pay nothing unless we win.' },
        ]),
        testimonials('What clients say', [
          { quote: 'They handled everything | I just had to focus on healing.', author: 'Sarah M.', role: 'Recovered $1.2M' },
          { quote: 'Compassionate, professional, and they really fought for us.', author: 'James R.', role: 'Family of victim' },
          { quote: 'I had no idea I had a case. So glad I made the call.', author: 'Maria G.', role: 'Settled case' },
        ]),
        faq('Frequently asked', [
          { question: 'Is the case review really free?', answer: 'Yes, 100% free and confidential. There is no obligation.' },
          { question: 'What does "no win, no fee" mean?', answer: 'You pay no attorney fees unless we recover compensation for you.' },
          { question: 'How long does a case take?', answer: 'Most cases resolve in 12 | 24 months, but it depends on the specifics.' },
        ]),
        form('Start your free case review', 'Confidential, no obligation. A licensed attorney will reach out within 24 hours.'),
        footer('National Justice Partners'),
      ],
    }),
  },
  {
    name: 'Personal Injury Intake',
    description: 'Local personal-injury firm landing with practice areas, results bar and quick intake form.',
    category: 'legal', tags: ['personal injury', 'auto accident', 'attorney'], vertical: 'mass_tort',
    snapshot: snapshot({
      slug: 'personal-injury',
      firmName: 'Hartwell Injury Lawyers',
      primary: '#1e3a8a', bg: '#f8fafc', accent: '#facc15',
      heading: 'Injured? We fight to get you every dollar you deserve.',
      description: 'Over $250M recovered for accident victims across the region.',
      sections: [
        hero({
          eyebrow: 'Local injury attorneys',
          headline: 'Injured? We fight to get you every dollar you deserve.',
          sub: 'Over $250M recovered for accident victims across the region. Free consult, available 24/7.',
          primaryLabel: 'Get my free consult',
          secondaryLabel: 'Practice areas',
        }),
        features('Practice areas', '', [
          { icon: 'Car', title: 'Auto accidents', description: 'Car, truck and rideshare collision claims.' },
          { icon: 'HardHat', title: 'Workplace injury', description: 'Workers compensation and third-party claims.' },
          { icon: 'Heart', title: 'Wrongful death', description: 'Compassionate representation for grieving families.' },
        ]),
        stats('Our record', [
          { value: '250', suffix: 'M+', label: 'Recovered' },
          { value: '3', suffix: 'K+', label: 'Clients helped' },
          { value: '40', suffix: '+', label: 'Years experience' },
          { value: '0', suffix: '$', label: 'Upfront cost' },
        ]),
        testimonials('Client outcomes', [
          { quote: 'They got me 5x what the insurance first offered.', author: 'Marcus T.', role: 'Auto accident' },
          { quote: 'Treated me like family from day one.', author: 'Elena V.', role: 'Slip and fall' },
          { quote: 'Honest, hard-working and won my case.', author: 'Devon B.', role: 'Workplace injury' },
        ]),
        form('Get a free case review', 'Tell us briefly what happened. An attorney will call you back within one hour.'),
        footer('Hartwell Injury Lawyers'),
      ],
    }),
  },

  // ── REAL ESTATE ──
  {
    name: 'Luxury Listings',
    description: 'Editorial real-estate landing for luxury agents with featured listings and agent bio.',
    category: 'general', tags: ['real estate', 'luxury', 'listings'], vertical: 'real_estate',
    snapshot: snapshot({
      slug: 'luxury-listings',
      firmName: 'Marchetti Luxury Realty',
      primary: '#0f172a', bg: '#fefce8', accent: '#a16207',
      heading: 'Extraordinary homes, exceptional service',
      description: 'Curated luxury listings and a discreet, full-service buying experience.',
      sections: [
        hero({
          eyebrow: 'Luxury real estate, redefined',
          headline: 'Extraordinary homes, exceptional service',
          sub: 'A curated portfolio of luxury homes and a discreet, full-service buying experience.',
          primaryLabel: 'Browse listings',
          secondaryLabel: 'Meet your agent',
        }),
        gallery('Featured listings', [
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
          'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
          'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
          'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
        ]),
        features('Why work with us', '', [
          { icon: 'Award', title: 'Top 1% nationally', description: 'Recognised among the top luxury agents in the country.' },
          { icon: 'Eye', title: 'Off-market access', description: 'Discreet listings you will not find anywhere else.' },
          { icon: 'Globe', title: 'Global network', description: 'Buyers and partners across 40+ countries.' },
        ]),
        testimonials('Recent clients', [
          { quote: 'Sold our home for 12% above asking in under two weeks.', author: 'The Whitfields', role: 'Seller' },
          { quote: 'They found the home of our dreams before it ever hit the market.', author: 'Priya & Ravi', role: 'Buyer' },
          { quote: 'Professional, discreet and a joy to work with.', author: 'Lorenzo M.', role: 'Investor' },
        ]),
        form('Schedule a private consultation', 'Share what you are looking for and we will reach out within one business day.'),
        footer('Marchetti Luxury Realty'),
      ],
    }),
  },
  {
    name: 'First-Time Buyer Funnel',
    description: 'Warm, educational landing for first-time home buyers with quick pre-qualification.',
    category: 'general', tags: ['real estate', 'first time buyer', 'mortgage'], vertical: 'real_estate',
    snapshot: snapshot({
      slug: 'first-time-buyer',
      firmName: 'Hometown Realty Group',
      primary: '#0d9488', bg: '#f0fdfa', accent: '#f59e0b',
      heading: 'Buying your first home? We make it simple.',
      description: 'Free buyer guide, friendly agents and a step-by-step path from renting to keys.',
      sections: [
        hero({
          eyebrow: 'For first-time buyers',
          headline: 'Buying your first home? We make it simple.',
          sub: 'Free buyer guide, friendly agents and a step-by-step path from renting to keys in hand.',
          primaryLabel: 'Get the free guide',
          secondaryLabel: 'See how it works',
          layout: 'split-form-right',
        }),
        steps('From rent to keys, in 4 steps', '', [
          { title: 'Free consult', description: 'A 20-minute call to understand your goals and budget.' },
          { title: 'Get pre-approved', description: 'We connect you with trusted local lenders.' },
          { title: 'Tour homes', description: 'Curated showings of homes that match your wishlist.' },
          { title: 'Close & move in', description: 'We negotiate, inspect and close on your behalf.' },
        ]),
        features('Why first-time buyers love us', '', [
          { icon: 'BookOpen', title: 'Free education', description: 'Plain-English guides to mortgages, closing costs and more.' },
          { icon: 'DollarSign', title: 'Down-payment programs', description: 'We help you find grants and assistance you qualify for.' },
          { icon: 'Users', title: 'Friendly agents', description: 'No pressure, no jargon, no surprises.' },
        ]),
        faq('Common questions', [
          { question: 'How much do I need for a down payment?', answer: 'Some programs allow as little as 3% | we will help you find the right option.' },
          { question: 'What credit score do I need?', answer: 'Many buyers qualify with scores as low as 580. We can help you improve yours if needed.' },
          { question: 'How long does the whole process take?', answer: 'Most first-time buyers close within 60 | 90 days from pre-approval.' },
        ]),
        form('Get your free buyer guide', 'Tell us where you would like to buy and we will send your guide plus a free consult invite.'),
        footer('Hometown Realty Group'),
      ],
    }),
  },

  // ── HOME SERVICES ──
  {
    name: 'HVAC Quote Funnel',
    description: 'Fast HVAC lead page with service areas, financing badge and 60-second quote form.',
    category: 'general', tags: ['hvac', 'home services', 'quote'], vertical: 'home_services',
    snapshot: snapshot({
      slug: 'hvac-quote',
      firmName: 'ClearAir Heating & Cooling',
      primary: '#1d4ed8', bg: '#eff6ff', accent: '#f97316',
      heading: 'Fast, honest HVAC service | quote in 60 seconds',
      description: 'AC repair, furnace install, maintenance plans and 24/7 emergency service.',
      sections: [
        hero({
          eyebrow: '24/7 emergency service',
          headline: 'Fast, honest HVAC service | quote in 60 seconds',
          sub: 'AC repair, furnace install, tune-ups and financing | with same-day appointments available.',
          primaryLabel: 'Get my free quote',
          secondaryLabel: 'Call now',
          layout: 'split-form-right',
        }),
        features('Services', '', [
          { icon: 'Snowflake', title: 'AC repair & install', description: 'Cool and efficient systems built to last.' },
          { icon: 'Flame', title: 'Furnace & heating', description: 'Repair, replace and maintain | any brand, any age.' },
          { icon: 'Wrench', title: 'Maintenance plans', description: 'Twice-yearly tune-ups starting at $14/month.' },
        ]),
        stats('Why neighbours choose us', [
          { value: '4.9', suffix: '★', label: 'Google rating' },
          { value: '20', suffix: '+', label: 'Years in business' },
          { value: '24', suffix: '/7', label: 'Emergency response' },
          { value: '0', suffix: '%', label: 'Financing available' },
        ]),
        testimonials('What customers say', [
          { quote: 'Showed up on time, fixed it right, fair price.', author: 'Jenna B.', role: 'AC repair' },
          { quote: 'Replaced our furnace in a single day | very clean work.', author: 'Tom D.', role: 'Furnace install' },
          { quote: 'Saved us thousands compared to the first quote we got.', author: 'Pat S.', role: 'New system' },
        ]),
        form('Get your free quote', 'Tell us what is going on and we will text you a quote within 30 minutes.'),
        footer('ClearAir Heating & Cooling'),
      ],
    }),
  },
  {
    name: 'Roofing Inspection',
    description: 'Storm-damage / roofing inspection landing with trust badges and inspection-booking form.',
    category: 'general', tags: ['roofing', 'inspection', 'home services'], vertical: 'home_services',
    snapshot: snapshot({
      slug: 'roofing-inspection',
      firmName: 'Summit Roofing Co.',
      primary: '#7c2d12', bg: '#fff7ed', accent: '#dc2626',
      heading: 'Free roof inspection | done by certified pros',
      description: 'Storm damage, leaks, full replacements. Insurance specialists who fight for you.',
      sections: [
        hero({
          eyebrow: 'Insurance claim specialists',
          headline: 'Free roof inspection | done by certified pros',
          sub: 'We document every issue, work directly with your insurer, and stand behind every job with a 25-year warranty.',
          primaryLabel: 'Book a free inspection',
          secondaryLabel: 'See our work',
        }),
        steps('How a free inspection works', '', [
          { title: 'Schedule', description: 'Pick a 1-hour window that works for you.' },
          { title: 'Full report', description: 'Photos, drone footage and a clear written summary.' },
          { title: 'Repair or claim', description: 'We help file an insurance claim or quote a repair | your choice.' },
        ]),
        features('Why homeowners trust us', '', [
          { icon: 'ShieldCheck', title: '25-year warranty', description: 'Materials and workmanship covered.' },
          { icon: 'Award', title: 'GAF Master Elite', description: 'Among the top 3% of roofing contractors nationwide.' },
          { icon: 'FileCheck', title: 'Insurance experts', description: 'We handle the paperwork so you do not have to.' },
        ]),
        testimonials('Recent jobs', [
          { quote: 'Got our full roof covered by insurance | they handled everything.', author: 'Brian L.', role: 'Storm damage' },
          { quote: 'Cleanest, most professional crew we have ever hired.', author: 'Dana C.', role: 'Full replacement' },
          { quote: 'Inspection took 45 minutes and the report was incredibly detailed.', author: 'Aman J.', role: 'Inspection' },
        ]),
        form('Book your free inspection', 'Pick a day and we will confirm a 1-hour window by text.'),
        footer('Summit Roofing Co.'),
      ],
    }),
  },

  // ── SOLAR & ENERGY ──
  {
    name: 'Residential Solar Quote',
    description: 'Homeowner-friendly solar landing with savings calculator angle and quick quote form.',
    category: 'general', tags: ['solar', 'residential', 'savings'], vertical: 'solar',
    snapshot: snapshot({
      slug: 'residential-solar',
      firmName: 'SunPath Residential Solar',
      primary: '#ca8a04', bg: '#fefce8', accent: '#0ea5e9',
      heading: 'Cut your power bill by up to 90% | with solar',
      description: 'Custom-designed rooftop solar with $0-down financing and a 25-year production guarantee.',
      sections: [
        hero({
          eyebrow: '$0 down. 25-year warranty.',
          headline: 'Cut your power bill by up to 90% | with solar',
          sub: 'Get a custom solar design and savings estimate for your home in under 60 seconds.',
          primaryLabel: 'Get my free quote',
          secondaryLabel: 'How it works',
          layout: 'split-form-right',
        }),
        stats('Why go solar with us', [
          { value: '90', suffix: '%', label: 'Bill reduction' },
          { value: '25', suffix: ' yr', label: 'Warranty' },
          { value: '0', suffix: '$', label: 'Down payment' },
          { value: '10', suffix: 'K+', label: 'Homes powered' },
        ]),
        steps('From quote to power on', '', [
          { title: 'Free design', description: 'A custom solar layout for your roof | sent within 24 hours.' },
          { title: 'Choose financing', description: 'Cash, loan or lease | we explain every option clearly.' },
          { title: 'Install in a day', description: 'Most installs are completed in a single day.' },
          { title: 'Lower bills', description: 'Start saving from your very first billing cycle.' },
        ]),
        testimonials('Homeowner stories', [
          { quote: 'Our bill went from $280 a month to under $20.', author: 'Carla T.', role: 'San Diego, CA' },
          { quote: 'The install team was professional and fast | done in one day.', author: 'Dev R.', role: 'Austin, TX' },
          { quote: 'Best decision we have made for our home.', author: 'Steph K.', role: 'Phoenix, AZ' },
        ]),
        faq('Common questions', [
          { question: 'How much will I save?', answer: 'Most homeowners save 70 | 90% on their electric bill, depending on roof and usage.' },
          { question: 'Are there incentives?', answer: 'Yes | the federal tax credit covers 30% of the cost, and many states add more.' },
          { question: 'What if my roof is older?', answer: 'We can replace your roof and install solar together | often financed into one payment.' },
        ]),
        form('Get your free solar quote', 'Just an address and a recent electric bill | we handle the rest.'),
        footer('SunPath Residential Solar'),
      ],
    }),
  },
  {
    name: 'Commercial Solar Lead',
    description: 'B2B commercial-solar landing with ROI angle, case study, and project enquiry form.',
    category: 'general', tags: ['solar', 'commercial', 'b2b'], vertical: 'solar',
    snapshot: snapshot({
      slug: 'commercial-solar',
      firmName: 'Apex Commercial Solar',
      primary: '#0f172a', bg: '#f8fafc', accent: '#22c55e',
      heading: 'Predictable energy costs for your business',
      description: 'Custom commercial solar with PPA, lease and ownership options. ROI in under 5 years.',
      sections: [
        hero({
          eyebrow: 'Commercial & industrial solar',
          headline: 'Predictable energy costs for your business',
          sub: 'Custom commercial PV with PPA, lease and ownership financing | typical ROI in under 5 years.',
          primaryLabel: 'Request a proposal',
          secondaryLabel: 'See case studies',
        }),
        stats('Track record', [
          { value: '500', suffix: ' MW', label: 'Installed' },
          { value: '4.2', suffix: ' yr', label: 'Avg payback' },
          { value: '300', suffix: '+', label: 'Commercial sites' },
          { value: '25', suffix: ' yr', label: 'Performance guarantee' },
        ]),
        features('What we deliver', '', [
          { icon: 'Building2', title: 'Rooftop & ground-mount', description: 'Engineered for warehouses, factories and offices.' },
          { icon: 'BarChart3', title: 'Bankable proposals', description: 'Lender-ready financials with conservative assumptions.' },
          { icon: 'PlugZap', title: 'Battery & EV-ready', description: 'Add storage and EV charging in one integrated design.' },
        ]),
        steps('Our process', '', [
          { title: 'Discovery', description: '30-minute call to review your sites and energy data.' },
          { title: 'Engineered proposal', description: 'Custom design, financing options and ROI in 7 days.' },
          { title: 'Build & commission', description: 'Turn-key delivery with single-point accountability.' },
          { title: 'Monitor & maintain', description: '25-year monitoring, O&M and performance guarantee.' },
        ]),
        testimonials('Customers', [
          { quote: 'They delivered exactly what was promised | on schedule, on budget.', author: 'COO, MidwestCo', role: '1.2 MW installation' },
          { quote: 'Cut our energy spend by 38% in year one.', author: 'CFO, Atlas Foods', role: 'PPA agreement' },
          { quote: 'Easiest capital project we have ever run.', author: 'Facilities Director, Bluepoint', role: 'Rooftop solar' },
        ]),
        form('Request a commercial proposal', 'Share your site details and we will return a custom proposal within 7 business days.'),
        footer('Apex Commercial Solar'),
      ],
    }),
  },
];

// --- emit SQL --------------------------------------------------------------

function sqlEscape(s: string) {
  return s.replace(/'/g, "''");
}

const rows = TEMPLATES.map((t) => {
  const snapJson = sqlEscape(JSON.stringify(t.snapshot));
  const tagsArr = `ARRAY[${t.tags.map(x => `'${sqlEscape(x)}'`).join(',')}]::text[]`;
  return `(
    '${SYSTEM_USER}'::uuid, NULL, '${sqlEscape(t.name)}', '${sqlEscape(t.description)}',
    '${sqlEscape(t.category)}', ${tagsArr}, NULL, true, true, '${t.vertical}',
    '${snapJson}'::jsonb
  )`;
}).join(',\n');

const sql = `-- Seed: 12 starter landing-page templates (2 per vertical)
INSERT INTO public.landing_page_templates
  (user_id, firm_id, name, description, category, tags, thumbnail_url, is_public, is_starter, vertical_slug, snapshot)
VALUES
${rows};
`;

console.log(sql);
