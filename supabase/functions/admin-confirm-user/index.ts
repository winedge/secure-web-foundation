import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

Deno.serve(async (req) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const { email } = await req.json();
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: list, error: le } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (le) return new Response(JSON.stringify({ error: le.message }), { status: 500, headers: cors });
  const u = list.users.find((x) => x.email?.toLowerCase() === String(email).toLowerCase());
  if (!u) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: cors });
  const { data, error } = await admin.auth.admin.updateUserById(u.id, { email_confirm: true });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  return new Response(JSON.stringify({ id: data.user.id, email: data.user.email, confirmed_at: data.user.email_confirmed_at }), { headers: { ...cors, 'content-type': 'application/json' } });
});
