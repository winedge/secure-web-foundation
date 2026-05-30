import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";
import { requireUser, requireFirmMember, getUserFirmId } from "../_shared/firm-auth.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    // Require auth on every action — never trust client-supplied user_id/firm_id.
    const authUser = await requireUser(req);
    const body = await req.json();
    const { action, code, redirect_uri } = body;
    let { firm_id } = body;
    // Always derive user_id from the verified JWT.
    const user_id = authUser.id;
    // Verify firm membership if firm_id was provided; otherwise resolve it.
    if (firm_id) {
      await requireFirmMember(supabase, user_id, firm_id);
    } else {
      firm_id = await getUserFirmId(supabase, user_id);
    }

    const { data: metaSettings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["meta_app_id", "meta_app_secret"]);

    const settingsMap: Record<string, any> = {};
    metaSettings?.forEach((s: any) => (settingsMap[s.key] = s.value));

    const META_APP_ID = settingsMap.meta_app_id?.app_id;
    const META_APP_SECRET = settingsMap.meta_app_secret?.app_secret;

    if (action === "get_login_url") {
      if (!META_APP_ID) return errorResponse("Meta App ID not configured by admin");

      const scopes = [
        "pages_manage_ads", "pages_manage_posts", "pages_read_engagement",
        "pages_read_user_content", "ads_management", "ads_read",
        "business_management", "instagram_basic", "instagram_content_publish",
        "instagram_manage_insights", "public_profile",
      ].join(",");

      const loginUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${scopes}&response_type=code&state=${user_id}`;

      return jsonResponse({ login_url: loginUrl });
    }

    if (action === "exchange_token") {
      if (!META_APP_ID || !META_APP_SECRET) return errorResponse("Meta API credentials not configured");

      const tokenResp = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&redirect_uri=${encodeURIComponent(redirect_uri)}&code=${code}`
      );
      const tokenData = await tokenResp.json();
      if (tokenData.error) return errorResponse(tokenData.error.message);

      const longTokenResp = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
      );
      const longTokenData = await longTokenResp.json();

      const userResp = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${longTokenData.access_token}`);
      const userData = await userResp.json();

      const pagesResp = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category&access_token=${longTokenData.access_token}`);
      const pagesData = await pagesResp.json();

      const permsResp = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${longTokenData.access_token}`);
      const permsData = await permsResp.json();
      const grantedPerms = permsData.data?.filter((p: any) => p.status === "granted").map((p: any) => p.permission) || [];

      await supabase.from("platform_connections").upsert(
        {
          user_id, firm_id, platform: "facebook",
          platform_user_id: userData.id, platform_username: userData.name,
          access_token: longTokenData.access_token,
          token_expires_at: new Date(Date.now() + (longTokenData.expires_in || 5184000) * 1000).toISOString(),
          permissions: grantedPerms, is_active: true,
          metadata: { pages: pagesData.data || [] },
        },
        { onConflict: "user_id,platform" }
      ).select().single();

      if (pagesData.data) {
        for (const page of pagesData.data) {
          await supabase.from("platform_connections").upsert(
            {
              user_id, firm_id, platform: "facebook_page",
              platform_user_id: page.id, platform_username: page.name,
              page_id: page.id, page_name: page.name,
              page_access_token: page.access_token, access_token: longTokenData.access_token,
              is_active: true, metadata: { category: page.category },
            },
            { onConflict: "user_id,platform" }
          );
        }
      }

      return jsonResponse({
        success: true, user: userData,
        pages: pagesData.data || [], permissions: grantedPerms,
      });
    }

    if (action === "verify_connection") {
      const { data: conn } = await supabase
        .from("platform_connections").select("*")
        .eq("user_id", user_id).eq("platform", "facebook").eq("is_active", true).single();

      if (!conn) return jsonResponse({ connected: false });

      const verifyResp = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${conn.access_token}`);
      const verifyData = await verifyResp.json();
      const isValid = !verifyData.error;

      if (!isValid) {
        await supabase.from("platform_connections").update({ is_active: false }).eq("id", conn.id);
      }

      return jsonResponse({
        connected: isValid, user: isValid ? verifyData : null,
        token_expires_at: conn.token_expires_at, permissions: conn.permissions,
      });
    }

    if (action === "verify_admin_credentials") {
      if (!META_APP_ID || !META_APP_SECRET) return jsonResponse({ valid: false, error: "Credentials not configured" });

      const appTokenResp = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&grant_type=client_credentials`
      );
      const appTokenData = await appTokenResp.json();

      return jsonResponse({ valid: !appTokenData.error, error: appTokenData.error?.message });
    }

    return errorResponse("Unknown action");
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("meta-oauth error:", e);
    return jsonResponse({ error: "Request failed" }, 500);
  }
});
