import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from './use-firm';
import { toast } from 'sonner';

export function useGenerateLandingPage() {
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, tortType, campaignName, targetStates }: {
      campaignId: string;
      tortType: string;
      campaignName: string;
      targetStates?: string[];
    }) => {
      if (!firm) throw new Error('No firm');

      // Generate landing page content via AI
      const { data: pageContent, error: aiError } = await supabase.functions.invoke('dynamic-landing', {
        body: {
          tort_type: tortType,
          firm_name: firm.name,
          cta: 'Get Free Case Review',
          target_audience: targetStates?.length
            ? `Adults in ${targetStates.join(', ')} affected by ${tortType}`
            : `Adults affected by ${tortType}`,
        },
      });

      if (aiError) throw aiError;

      // Create slug from campaign name
      const slug = `${campaignName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;

      // Save to dynamic_landing_pages
      const { data: page, error: insertError } = await supabase
        .from('dynamic_landing_pages')
        .insert({
          firm_id: firm.id,
          campaign_id: campaignId,
          slug,
          page_title: pageContent?.page_title || `${tortType} - Free Case Review`,
          headline: pageContent?.hero?.headline || `Were You Affected by ${tortType}?`,
          subheadline: pageContent?.hero?.subheadline || 'Find out if you qualify for compensation.',
          cta_text: pageContent?.hero?.cta_text || 'Get Free Case Review',
          sections: pageContent?.sections || [],
          personalization_rules: pageContent?.personalization_rules || {},
          is_published: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return { page, slug };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      const url = `/lp/${result.slug}`;
      toast.success(`Landing page created! URL: ${url}`, { duration: 8000 });
    },
    onError: (error) => {
      toast.error('Failed to generate landing page: ' + error.message);
    },
  });
}
