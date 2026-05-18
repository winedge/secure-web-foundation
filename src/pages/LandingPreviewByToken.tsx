import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle, Eye } from 'lucide-react';
import { usePreviewByToken } from '@/hooks/use-landing-versions';
import BrandedIntake from './BrandedIntake';

/**
 * Public preview route: /preview/landing/:token
 *
 * Resolves a shareable token to a saved version snapshot, primes the React Query
 * cache so BrandedIntake reads the snapshot instead of the live published page,
 * then renders the standard BrandedIntake under the snapshot's slug.
 */
export default function LandingPreviewByToken() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = usePreviewByToken(token);
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!data?.version?.snapshot) return;
    const snap = data.version.snapshot as any;
    // Mirror the FirmBranding shape so useBrandingBySlug consumers work unchanged.
    qc.setQueryData(['firm-branding-public', snap.slug], {
      id: 'preview',
      firm_id: data.firm_id,
      slug: snap.slug,
      firm_display_name: snap.firm_display_name,
      logo_url: snap.logo_url,
      primary_color: snap.primary_color,
      background_color: snap.background_color,
      accent_color: snap.accent_color,
      heading_text: snap.heading_text,
      description_text: snap.description_text,
      visible_fields: snap.visible_fields,
      custom_fields: snap.custom_fields,
      theme_key: snap.theme_key,
      typography: snap.typography,
      layout_config: snap.layout_config,
      hero_config: snap.hero_config,
      sections: snap.sections,
      seo_config: snap.seo_config,
    });
    // Replace the URL param shape so BrandedIntake's useParams sees the snapshot slug.
    window.history.replaceState({}, '', `/intake/${snap.slug}?_preview=${token}`);
    setReady(true);
  }, [data, qc, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
          <h1 className="text-xl font-semibold">Preview unavailable</h1>
          <p className="text-sm text-muted-foreground">
            This preview link is invalid or has expired. Ask the page owner to generate a fresh link.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) return null;

  return (
    <>
      <div className="fixed top-0 inset-x-0 z-[60] bg-amber-500 text-amber-950 text-xs font-medium px-4 py-1.5 flex items-center justify-center gap-2 shadow">
        <Eye className="h-3.5 w-3.5" />
        Preview mode | unpublished snapshot from {new Date(data.version.created_at).toLocaleString()}
      </div>
      <div className="pt-7">
        <BrandedIntake />
      </div>
    </>
  );
}
