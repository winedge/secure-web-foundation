import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Props {
  fallback: ReactNode;
}

const KNOWN_HOSTS = ['lovable.app', 'lovableproject.com', 'localhost', '127.0.0.1'];

/**
 * If the visitor reached the site via a verified custom domain mapped to a firm,
 * render that firm's landing page. Otherwise render the provided fallback (the regular Index).
 */
export function CustomDomainRoot({ fallback }: Props) {
  const [resolvedSlug, setResolvedSlug] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    const isPlatform = KNOWN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
    if (isPlatform) {
      setResolvedSlug(null);
      return;
    }

    (async () => {
      try {
        const { data: domain } = await supabase
          .from('landing_page_domains')
          .select('firm_id')
          .eq('hostname', host)
          .eq('status', 'verified')
          .maybeSingle();

        if (!domain) {
          setResolvedSlug(null);
          return;
        }
        const { data: branding } = await supabase
          .from('firm_branding')
          .select('slug, is_published')
          .eq('firm_id', domain.firm_id)
          .maybeSingle();

        if (branding && (branding as any).is_published !== false && branding.slug) {
          setResolvedSlug(branding.slug);
        } else {
          setResolvedSlug(null);
        }
      } catch {
        setResolvedSlug(null);
      }
    })();
  }, []);

  if (resolvedSlug === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (resolvedSlug) {
    // Lazy import to avoid circular issues
    const LandingPage = require('@/pages/LandingPage').default;
    // Re-route to the rendered landing page using slug
    window.history.replaceState(null, '', `/lp/${resolvedSlug}${window.location.search}${window.location.hash}`);
    return <LandingPage />;
  }

  return <>{fallback}</>;
}
