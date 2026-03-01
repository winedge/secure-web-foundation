-- Allow public (anonymous) read access to published landing pages
CREATE POLICY "Public can view published landing pages"
  ON public.dynamic_landing_pages
  FOR SELECT
  USING (is_published = true);

-- Allow anonymous users to update visit/conversion counters
CREATE POLICY "Public can update landing page counters"
  ON public.dynamic_landing_pages
  FOR UPDATE
  USING (is_published = true)
  WITH CHECK (is_published = true);