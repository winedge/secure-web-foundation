INSERT INTO public.api_clients (client_id, client_secret_hash, name, firm_id, allowed_scopes, allowed_origins, allowed_redirect_uris, is_active)
VALUES (
  'mt_dash_3908442da3a14300',
  'e7a7253de108eb281b4280cdcc271e8fd6c2e67a87f1dba0f27a149a4fbb3e28',
  'Mass Tort Dashboard (external project)',
  NULL,
  ARRAY['mt:cases','mt:documents','mt:notifications','mt:saved_views','mt:audit','mt:quotas','mt:me'],
  ARRAY[]::text[],
  ARRAY[]::text[],
  true
);