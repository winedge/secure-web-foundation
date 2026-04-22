-- Remove Background Check from non-legal verticals where it doesn't apply
UPDATE public.vertical_module_access vma
SET is_enabled = false
FROM public.industry_verticals v
WHERE vma.vertical_id = v.id
  AND vma.firm_id IS NULL
  AND vma.module_key = 'background_check'
  AND v.slug IN ('dental', 'skin_clinic');