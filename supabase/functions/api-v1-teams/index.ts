// Core Platform API v1 - Teams
//   GET    /teams
//   POST   /teams                     { name, description? }
//   GET    /teams/{id}
//   PATCH  /teams/{id}
//   DELETE /teams/{id}
//   GET    /teams/{id}/members
//   POST   /teams/{id}/members        { email, full_name?, permissions? }
//   DELETE /teams/{id}/members/{member_id}
import { V1_CORS_BASE, admin, authenticateRequest, json, withAudit } from '../_shared/api-v1.ts';

const CORS = V1_CORS_BASE;
async function readJson(req: Request) { try { return await req.json(); } catch { return {}; } }
function pathAfter(url: URL, mount: string): string[] {
  const parts = url.pathname.split('/').filter(Boolean);
  const i = parts.findIndex((p) => p === mount);
  return i === -1 ? parts : parts.slice(i + 1);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const ctx = await authenticateRequest(req);
  if (ctx instanceof Response) return ctx;
  if (!ctx.firmId) return json({ error: 'no_firm' }, { status: 403, cors: CORS });

  const url = new URL(req.url);
  const seg = pathAfter(url, 'api-v1-teams');
  // seg: ['teams'] | ['teams', id] | ['teams', id, 'members'] | ['teams', id, 'members', memberId]
  const teamId = seg[1] ?? '';
  const sub = seg[2] ?? '';
  const memberId = seg[3] ?? '';
  const apiPath = `/api/v1/teams/${seg.slice(1).join('/')}`;

  return withAudit(req, apiPath, async () => {
    const db = admin();

    // teams collection
    if (!teamId) {
      if (req.method === 'GET') {
        const { data, error } = await db.from('teams')
          .select('id, name, description, created_by, created_at, updated_at')
          .eq('firm_id', ctx.firmId).order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ teams: data ?? [] }, { cors: CORS });
      }
      if (req.method === 'POST') {
        const b = await readJson(req);
        if (!b?.name) return json({ error: 'name_required' }, { status: 400, cors: CORS });
        const { data, error } = await db.from('teams').insert({
          firm_id: ctx.firmId, name: b.name, description: b.description ?? null, created_by: ctx.userId,
        }).select('*').single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ team: data }, { status: 201, cors: CORS });
      }
    }

    // team by id
    if (teamId && !sub) {
      const { data: team } = await db.from('teams').select('*').eq('id', teamId).eq('firm_id', ctx.firmId).maybeSingle();
      if (!team) return json({ error: 'not_found' }, { status: 404, cors: CORS });
      if (req.method === 'GET') return json({ team }, { cors: CORS });
      if (req.method === 'PATCH') {
        const b = await readJson(req);
        const { data, error } = await db.from('teams').update({
          name: b.name ?? team.name, description: b.description ?? team.description,
          updated_at: new Date().toISOString(),
        }).eq('id', teamId).eq('firm_id', ctx.firmId).select('*').single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ team: data }, { cors: CORS });
      }
      if (req.method === 'DELETE') {
        const { error } = await db.from('teams').delete().eq('id', teamId).eq('firm_id', ctx.firmId);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ ok: true }, { cors: CORS });
      }
    }

    // members
    if (teamId && sub === 'members') {
      // firm-scope guard
      const { data: team } = await db.from('teams').select('id').eq('id', teamId).eq('firm_id', ctx.firmId).maybeSingle();
      if (!team) return json({ error: 'not_found' }, { status: 404, cors: CORS });

      if (!memberId && req.method === 'GET') {
        const { data, error } = await db.from('team_members')
          .select('id, user_id, email, full_name, permissions, accepted_at, created_at')
          .eq('team_id', teamId).order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ members: data ?? [] }, { cors: CORS });
      }
      if (!memberId && req.method === 'POST') {
        const b = await readJson(req);
        if (!b?.email) return json({ error: 'email_required' }, { status: 400, cors: CORS });
        const { data, error } = await db.from('team_members').insert({
          team_id: teamId, email: b.email, full_name: b.full_name ?? null,
          permissions: b.permissions ?? {}, invited_by: ctx.userId,
        }).select('*').single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ member: data }, { status: 201, cors: CORS });
      }
      if (memberId && req.method === 'DELETE') {
        const { error } = await db.from('team_members').delete().eq('id', memberId).eq('team_id', teamId);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ ok: true }, { cors: CORS });
      }
    }

    return json({ error: 'not_found' }, { status: 404, cors: CORS });
  }, { clientId: ctx.client.client_id, userId: ctx.userId });
});
