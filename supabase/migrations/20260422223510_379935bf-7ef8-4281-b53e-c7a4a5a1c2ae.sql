
-- Update get_vertical_config so firm-scoped pipeline stages OVERRIDE system stages by stage_key
CREATE OR REPLACE FUNCTION public.get_vertical_config(_firm_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _vertical_id uuid;
  _result jsonb;
BEGIN
  SELECT vertical_id INTO _vertical_id FROM public.firms WHERE id = _firm_id;

  IF _vertical_id IS NULL THEN
    SELECT id INTO _vertical_id FROM public.industry_verticals WHERE slug = 'mass_tort';
  END IF;

  SELECT jsonb_build_object(
    'vertical', to_jsonb(v),
    'stages', COALESCE((
      SELECT jsonb_agg(to_jsonb(s) ORDER BY s.stage_order)
      FROM (
        SELECT DISTINCT ON (stage_key) *
        FROM public.vertical_pipeline_stages
        WHERE vertical_id = _vertical_id
          AND (firm_id IS NULL OR firm_id = _firm_id)
          AND is_active = true
        ORDER BY stage_key, (firm_id IS NOT NULL) DESC
      ) s
    ), '[]'::jsonb),
    'intake_fields', COALESCE((
      SELECT jsonb_agg(to_jsonb(f) ORDER BY f.field_order)
      FROM public.vertical_intake_fields f
      WHERE f.vertical_id = _vertical_id
        AND (f.firm_id IS NULL OR f.firm_id = _firm_id)
        AND f.is_active = true
    ), '[]'::jsonb),
    'categories', COALESCE((
      SELECT jsonb_agg(to_jsonb(c))
      FROM public.vertical_lead_categories c
      WHERE c.vertical_id = _vertical_id
        AND (c.firm_id IS NULL OR c.firm_id = _firm_id)
        AND c.is_active = true
    ), '[]'::jsonb),
    'terminology', COALESCE((
      SELECT t.terminology
      FROM public.vertical_terminology t
      WHERE t.vertical_id = _vertical_id
        AND (t.firm_id = _firm_id OR t.firm_id IS NULL)
      ORDER BY (t.firm_id IS NOT NULL) DESC
      LIMIT 1
    ), '{}'::jsonb),
    'enabled_modules', COALESCE((
      SELECT jsonb_agg(m.module_key)
      FROM public.vertical_module_access m
      WHERE m.vertical_id = _vertical_id
        AND (m.firm_id IS NULL OR m.firm_id = _firm_id)
        AND m.is_enabled = true
    ), '[]'::jsonb)
  ) INTO _result
  FROM public.industry_verticals v
  WHERE v.id = _vertical_id;

  RETURN _result;
END;
$function$;

-- Helper: clone all system stages for a vertical into firm-owned editable copies.
-- Idempotent: skips stage_keys that already have a firm row.
CREATE OR REPLACE FUNCTION public.clone_vertical_stages_for_firm(_firm_id uuid, _vertical_id uuid)
RETURNS SETOF public.vertical_pipeline_stages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_firm_owner(auth.uid(), _firm_id) AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  INSERT INTO public.vertical_pipeline_stages
    (vertical_id, firm_id, stage_key, label, stage_order, default_fee, icon, color, requires_payment, is_active)
  SELECT s.vertical_id, _firm_id, s.stage_key, s.label, s.stage_order, s.default_fee, s.icon, s.color, s.requires_payment, s.is_active
  FROM public.vertical_pipeline_stages s
  WHERE s.vertical_id = _vertical_id
    AND s.firm_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.vertical_pipeline_stages s2
      WHERE s2.vertical_id = _vertical_id
        AND s2.firm_id = _firm_id
        AND s2.stage_key = s.stage_key
    )
  RETURNING *;
END;
$$;
